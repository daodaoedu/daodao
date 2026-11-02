# Codex hooks on Windows

The generated `.codex/hooks.json` uses Python 3.10+ and PowerShell to preserve
blocking exit codes. `run-windows.py` translates Codex `apply_patch` events into
per-file proposals for the existing guards and returns JSON for the Stop event.
On x64 Windows, install Python as `python.exe` on PATH, Git for Windows, and jq. The adapter binds
shell calls to `python3` to that same Python interpreter; no python3.exe alias is
needed. Node and each project's formatter must be installed for formatting.

## Git Bash fails before the hook starts

Some Windows MXC environments reject stock MSYS initialization with
`NtCreateDirectoryObject(...): 0xC0000022`. This is a runtime compatibility issue,
not hook trust. See [Microsoft's issue](https://github.com/microsoft/mxc/issues/1061).

An optional private-runtime installer is included:

```powershell
python --version
git --version
./plugin/scripts/setup-windows-hooks.ps1
```

It copies the installed Git `usr/bin` to a sibling `daodao-hook-runtime` folder,
downloads and checks the SHA-256 of the
[third-party MSYS v0.2.0 patch](https://github.com/xoviat/cygwin/releases/tag/v0.2.0)
and [jq 1.8.2](https://github.com/jqlang/jq/releases/tag/jq-1.8.2), and enables ASLR
on the private executable copies because MXC's per-process relocation breaks
MSYS fork otherwise. The patch is not an official Git for Windows release.
Review that dependency before running the installer. It changes no system Git
files, global permissions, security policy, or Codex settings, and refuses to
overwrite an existing runtime. Download failure leaves an incomplete directory;
choose a new `-RuntimeRoot` when retrying.

`-GitRoot` selects a Git installation the script cannot locate automatically.
For another runtime location, pass `-RuntimeRoot` and set the process environment
variable `DAODAO_HOOK_BASH` to `<runtime>/usr/bin/bash.exe` before starting Codex.
Without an override, the adapter prefers the sibling private runtime when it
exists, then falls back to stock Git Bash. jq can be on PATH, in that private
runtime, or in `$CODEX_HOME/tools/daodao-hooks` (default `~/.codex`).

After installing, start Codex in this repository and use `/hooks` to review and
trust the six definitions. Changed definitions need review again. A successful
command-line invocation alone does not prove event dispatch: verify a real Codex
session rejects a dummy `.env` edit, a new focused test, and a PR attempt while
`task.md` is implementing, and actually formats a disposable project file.

For local diagnostics only, `DAODAO_HOOK_AUDIT_DIR` records hook inputs and results
in that directory. Those inputs can contain file contents or command arguments;
leave this variable unset for normal use and do not publish raw captures without
reviewing them.
