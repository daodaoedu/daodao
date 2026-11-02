# Install a private compatibility runtime for MSYS initialization in MXC.
# Sources and expected hashes are pinned; the system Git installation is read-only.
param(
    [string]$RuntimeRoot = '',
    [string]$GitRoot = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $RuntimeRoot) {
    $RuntimeRoot = Join-Path (Split-Path $repoRoot -Parent) 'daodao-hook-runtime'
}
$RuntimeRoot = [IO.Path]::GetFullPath($RuntimeRoot)
if (-not $GitRoot) {
    $GitRoot = Split-Path (Split-Path (Get-Command git.exe).Source -Parent) -Parent
}
$GitRoot = [IO.Path]::GetFullPath($GitRoot)
if (-not (Test-Path -LiteralPath (Join-Path $GitRoot 'usr\bin\bash.exe'))) {
    throw 'Git for Windows was not located. Pass -GitRoot with its installation directory.'
}
if ($RuntimeRoot.StartsWith($GitRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $RuntimeRoot.Equals($GitRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'RuntimeRoot must be separate from the system Git installation.'
}
if (Test-Path -LiteralPath $RuntimeRoot) {
    throw 'RuntimeRoot already exists. Use a new directory; this installer never overwrites an existing runtime.'
}
$python = (Get-Command python.exe).Source
& $python -X utf8 -c 'import sys; assert sys.version_info >= (3, 10), "Python 3.10+ is required"'
if ($LASTEXITCODE -ne 0) { throw 'Python version check failed.' }
$runtimeBin = Join-Path $RuntimeRoot 'usr\bin'
New-Item -ItemType Directory -Path $runtimeBin,(Join-Path $RuntimeRoot 'tmp') -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $GitRoot 'usr\bin') -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $runtimeBin $_.Name)
}

function Save-VerifiedDownload([string]$Uri, [string]$ExpectedHash, [string]$Destination) {
    $download = $Destination + '.download'
    Invoke-WebRequest -Uri $Uri -OutFile $download
    $actual = (Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $ExpectedHash) { throw "Checksum mismatch for $Uri; runtime remains incomplete." }
    Copy-Item -LiteralPath $download -Destination $Destination -Force
}

$runtimeUri = 'https://github.com/xoviat/cygwin/releases/download/v0.2.0/msys-2.0.dll'
$runtimeHash = '49eb228c919c92528f77815ed33d0266a9e60af83aa2db7d93bb3234d31e71a1'
Save-VerifiedDownload $runtimeUri $runtimeHash (Join-Path $runtimeBin 'msys-2.0.dll')
$jqUri = 'https://github.com/jqlang/jq/releases/download/jq-1.8.2/jq-win64.exe'
$jqHash = 'a6fc67fedaf9128a3309a1e2ebb8b986aeccf70122ee46d2cb4849e423f0c627'
Save-VerifiedDownload $jqUri $jqHash (Join-Path $runtimeBin 'jq.exe')
& $python -X utf8 (Join-Path $PSScriptRoot 'windows-peflags.py') $runtimeBin
if ($LASTEXITCODE -ne 0) { throw 'Private image preparation failed.' }
$provenance = @{ runtime_uri=$runtimeUri; runtime_sha256=$runtimeHash; jq_uri=$jqUri;
    jq_sha256=$jqHash; source_git=$GitRoot; scope='private Dao Dao hook runtime' }
[IO.File]::WriteAllText((Join-Path $RuntimeRoot 'PROVENANCE.json'),
    ($provenance | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
Write-Output "Installed: $runtimeBin"
Write-Output 'For a custom location, set DAODAO_HOOK_BASH to the full path of its bash.exe before starting Codex.'
Write-Output 'Start Codex in the checkout and review/trust the six definitions with /hooks.'
