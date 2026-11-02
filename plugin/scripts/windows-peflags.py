#!/usr/bin/env python3
"""Enable ASLR on private Git images so fork keeps stable per-file addresses.

MXC force-relocates images without DYNAMICBASE per process, which breaks MSYS
fork. Only the supplied private directory is changed; images without relocation
tables are rejected instead of setting a flag they cannot honor.
"""
from pathlib import Path
import struct
import sys


def enable_aslr(path):
    data = bytearray(path.read_bytes())
    if data[:2] != b'MZ':
        raise ValueError(f'Not a PE image: {path}')
    pe = struct.unpack_from('<I', data, 0x3C)[0]
    if data[pe:pe + 4] != b'PE\0\0':
        raise ValueError(f'Invalid PE signature: {path}')
    coff = pe + 4
    optional = coff + 20
    if struct.unpack_from('<H', data, optional)[0] != 0x20B:
        raise ValueError(f'Expected a 64-bit PE image: {path}')
    flag_offset = optional + 70
    flags = struct.unpack_from('<H', data, flag_offset)[0]
    if flags & 0x40:
        return False
    characteristics = struct.unpack_from('<H', data, coff + 18)[0]
    relocation_rva = struct.unpack_from('<I', data, optional + 0x70 + 5 * 8)[0]
    if characteristics & 1 or not relocation_rva:
        raise ValueError(f'Cannot enable ASLR without relocations: {path}')
    struct.pack_into('<H', data, flag_offset, flags | 0x40)
    path.write_bytes(data)
    return True


def main():
    if len(sys.argv) != 2:
        raise ValueError('Pass the private runtime usr/bin directory')
    directory = Path(sys.argv[1]).resolve()
    changed = 0
    for path in directory.iterdir():
        if path.suffix.lower() in ('.exe', '.dll'):
            changed += enable_aslr(path)
    print(f'Enabled DYNAMICBASE on {changed} private images.')


if __name__ == '__main__':
    main()
