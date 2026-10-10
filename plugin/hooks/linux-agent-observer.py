"""Independent Linux inotify observer; dynamic directory races fail closed.

No polling or Git diff inference. A directory introduced during capture makes
coverage partial because writes before its watch was attached cannot be proven.
"""
import ctypes
import errno
import os
from pathlib import Path
import select
import struct
import threading
import time
from types import SimpleNamespace

IN_MODIFY = 0x00000002
IN_ATTRIB = 0x00000004
IN_CLOSE_WRITE = 0x00000008
IN_MOVED_FROM = 0x00000040
IN_MOVED_TO = 0x00000080
IN_CREATE = 0x00000100
IN_DELETE = 0x00000200
IN_DELETE_SELF = 0x00000400
IN_MOVE_SELF = 0x00000800
IN_UNMOUNT = 0x00002000
IN_Q_OVERFLOW = 0x00004000
IN_IGNORED = 0x00008000
IN_ONLYDIR = 0x01000000
IN_DONT_FOLLOW = 0x02000000
IN_ISDIR = 0x40000000
MASK = (IN_MODIFY | IN_ATTRIB | IN_CLOSE_WRITE | IN_MOVED_FROM | IN_MOVED_TO |
        IN_CREATE | IN_DELETE | IN_DELETE_SELF | IN_MOVE_SELF | IN_UNMOUNT | IN_ONLYDIR | IN_DONT_FOLLOW)
HEADER = struct.Struct('iIII')
LOCAL_FILESYSTEMS = {'ext2', 'ext3', 'ext4', 'xfs', 'btrfs', 'overlay', 'tmpfs', 'ramfs',
                     'zfs', 'jfs', 'reiserfs', 'f2fs', 'bcachefs'}


def require_local_filesystem(repo):
    # mnt_id resolves stacked mounts using the actual opened directory rather
    # than guessing from a longest-prefix tie in mountinfo.
    directory_fd = os.open(repo, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC)
    try:
        fields = Path(f'/proc/self/fdinfo/{directory_fd}').read_text().splitlines()
        mount_ids = [line.split(':', 1)[1].strip() for line in fields if line.startswith('mnt_id:')]
        if len(mount_ids) != 1:
            raise ValueError('cannot identify directory filesystem mount')
        actual_mount_id = mount_ids[0]
        actual_filesystems = []
        for line in Path('/proc/self/mountinfo').read_text().splitlines():
            before, after = line.split(' - ', 1)
            mount_fields = before.split()
            encoded = mount_fields[4]
            for escaped, decoded in [('\\040', ' '), ('\\011', '\t'), ('\\012', '\n'), ('\\134', '\\')]:
                encoded = encoded.replace(escaped, decoded)
            mount = Path(encoded)
            filesystem = after.split()[0]
            if mount.is_relative_to(repo) and filesystem not in LOCAL_FILESYSTEMS:
                raise ValueError(f'inotify cannot cover nested mount filesystem {filesystem}')
            if mount_fields[0] == actual_mount_id:
                actual_filesystems.append(filesystem)
        if len(actual_filesystems) != 1 or actual_filesystems[0] not in LOCAL_FILESYSTEMS:
            filesystem = actual_filesystems[0] if len(actual_filesystems) == 1 else 'unknown'
            raise ValueError(f'inotify requires supported local filesystem; found {filesystem}')
    finally:
        os.close(directory_fd)



class LinuxObserver(threading.Thread):
    def __init__(self, handler, repo, failures):
        super().__init__(name='independent-inotify-observer', daemon=True)
        self.handler = handler
        self.repo = Path(repo).resolve()
        self.failures = failures
        self.backend = 'inotify'
        self.emitters = (self,)
        self.halt = threading.Event()
        self.watches = {}
        self.files = set()
        self.moves = {}
        self.expected_removals = set()
        self.fd = -1
        self.libc = ctypes.CDLL(None, use_errno=True)
        self.libc.inotify_init1.argtypes = [ctypes.c_int]
        self.libc.inotify_init1.restype = ctypes.c_int
        self.libc.inotify_add_watch.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_uint32]
        self.libc.inotify_add_watch.restype = ctypes.c_int
        self.libc.inotify_rm_watch.argtypes = [ctypes.c_int, ctypes.c_int]
        self.libc.inotify_rm_watch.restype = ctypes.c_int

    def _fail(self, message):
        self.failures.append(message)

    def _excluded(self, path):
        return '.git' in path.relative_to(self.repo).parts

    def _watch_tree(self, root):
        # This scans names only to register watches; it never manufactures writes.
        def raise_walk_error(exc):
            raise exc
        for directory, dirs, names in os.walk(root, followlinks=False, onerror=raise_walk_error):
            path = Path(directory)
            require_local_filesystem(path)
            dirs[:] = [name for name in dirs if name != '.git' and not (path / name).is_symlink()]
            wd = self.libc.inotify_add_watch(self.fd, os.fsencode(path), MASK)
            if wd < 0:
                raise OSError(ctypes.get_errno(), 'inotify watch registration failed', str(path))
            self.watches[wd] = path
            self.files.update(path / name for name in names if name != '.git')

    def _attach_dynamic_tree(self, path):
        try:
            self._watch_tree(path)
        except OSError as exc:
            if exc.errno not in (errno.ENOENT, errno.ENOTDIR):
                raise
            self._fail('dynamic directory vanished before recursive watch attachment; coverage is partial')

    def start(self):
        require_local_filesystem(self.repo)
        self.fd = self.libc.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC)
        if self.fd < 0:
            raise OSError(ctypes.get_errno(), 'inotify initialization failed')
        try:
            self._watch_tree(self.repo)
            super().start()
        except BaseException:
            os.close(self.fd)
            self.fd = -1
            raise

    def stop(self):
        self.halt.set()

    def _emit(self, action, source, destination=None):
        self.handler.on_any_event(SimpleNamespace(event_type=action, src_path=str(source),
                                                  dest_path=str(destination or ''), is_directory=False))
        if action == 'deleted':
            self.files.discard(source)
        elif action == 'moved':
            self.files.discard(source)
            self.files.add(destination)
        else:
            self.files.add(source)

    def _directory_gone(self, path):
        for name in tuple(self.files):
            if name.is_relative_to(path):
                self._emit('deleted', name)
        self.expected_removals.update(wd for wd, name in self.watches.items() if name.is_relative_to(path))

    def _move(self, source, destination, directory):
        if not directory:
            self._emit('moved', source, destination)
            return
        # No reliable recursive ordering or atomic recursive subscription exists.
        self._fail('directory moved during capture; recursive write coverage cannot be proven')
        for wd, name in tuple(self.watches.items()):
            if name.is_relative_to(source):
                self.watches[wd] = destination / name.relative_to(source)
        for name in tuple(self.files):
            if name.is_relative_to(source):
                self._emit('moved', name, destination / name.relative_to(source))

    def _expire_moves(self, force=False):
        now = time.monotonic()
        for cookie, (path, directory, timestamp) in tuple(self.moves.items()):
            if force or now - timestamp >= 0.2:
                del self.moves[cookie]
                if directory:
                    self._fail('directory moved out during capture; recursive coverage is partial')
                    self._directory_gone(path)
                    # Watches follow moved inodes outside the repo: remove them.
                    for wd, name in tuple(self.watches.items()):
                        if name.is_relative_to(path):
                            self.libc.inotify_rm_watch(self.fd, wd)
                else:
                    self._emit('deleted', path)

    def _event(self, wd, mask, cookie, name):
        if mask & IN_Q_OVERFLOW:
            self._fail('inotify event queue overflow; events were lost')
            return
        parent = self.watches.get(wd)
        if mask & IN_IGNORED:
            if wd not in self.expected_removals:
                self._fail('inotify watch unexpectedly removed')
            self.expected_removals.discard(wd)
            self.watches.pop(wd, None)
            return
        if parent is None:
            self._fail('inotify event for unknown watch')
            return
        path = parent / name if name else parent
        if self._excluded(path):
            return
        directory = bool(mask & IN_ISDIR)
        if mask & IN_UNMOUNT:
            self._fail('inotify filesystem unmounted')
        if mask & IN_DELETE_SELF:
            self.expected_removals.add(wd)
            if path == self.repo:
                self._fail('monitored repository deleted')
        if mask & IN_MOVE_SELF:
            self._fail('watched directory moved; recursive path coverage is partial')
        if mask & IN_MOVED_FROM:
            self.moves[cookie] = (path, directory, time.monotonic())
        elif mask & IN_MOVED_TO:
            previous = self.moves.pop(cookie, None)
            if previous:
                self._move(previous[0], path, directory)
            elif directory:
                self._fail('directory moved in during capture; initial writes may be unobserved')
                self._attach_dynamic_tree(path)
            else:
                self._emit('created', path)
        elif directory:
            if mask & IN_CREATE:
                self._fail('directory created during capture; initial writes may be unobserved')
                self._attach_dynamic_tree(path)
            elif mask & IN_DELETE:
                self._directory_gone(path)
        elif name:
            if mask & IN_DELETE:
                self._emit('deleted', path)
            elif mask & IN_CREATE:
                self._emit('created', path)
            elif mask & (IN_MODIFY | IN_ATTRIB | IN_CLOSE_WRITE):
                self._emit('modified', path)

    def _consume(self, raw):
        offset = 0
        while offset < len(raw):
            if len(raw) - offset < HEADER.size:
                raise ValueError('truncated inotify event header')
            wd, mask, cookie, size = HEADER.unpack_from(raw, offset)
            offset += HEADER.size
            if size > len(raw) - offset:
                raise ValueError('truncated inotify event name')
            name = os.fsdecode(raw[offset:offset + size].split(b'\0', 1)[0])
            offset += size
            self._event(wd, mask, cookie, name)

    def run(self):
        try:
            while True:
                readable = select.select([self.fd], [], [], 0 if self.halt.is_set() else 0.05)[0]
                if readable:
                    self._consume(os.read(self.fd, 262144))
                elif self.halt.is_set():
                    break
                self._expire_moves()
            self._expire_moves(force=True)
        except BaseException as exc:
            self._fail(f'inotify observer failed: {exc}')
        finally:
            os.close(self.fd)
            self.fd = -1
