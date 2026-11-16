<#
  AllBarka: prepare a fresh Antigravity workspace on Windows.
  Run AFTER cloning (see docs/ANTIGRAVITY_SETUP.md):
    powershell -ExecutionPolicy Bypass -File D:\AllBarka\AllBarka-34\scripts\windows\setup-antigravity-workspace.ps1
  What it does: checks Git/Node/npm, copies your .env files from the old project folder (never prints them),
  installs packages, runs a type check, and prints the next steps. It never deletes or changes the old folder.
#>
param(
  [string]$OldFolder = ''
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
function Say($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "`nSTOP: $text" -ForegroundColor Red; exit 1 }

Say "1/6 Checking tools"
$git = Get-Command git -ErrorAction SilentlyContinue
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $git) { Fail "Git is not installed. Run: winget install --id Git.Git -e   then open a new terminal and run this script again." }
if (-not $node) { Fail "Node.js is not installed. Run: winget install --id OpenJS.NodeJS.LTS -e   then open a new terminal and run this script again." }
$nodeVersion = (node -v).TrimStart('v')
$major = [int]($nodeVersion.Split('.')[0]); $minor = [int]($nodeVersion.Split('.')[1])
if ($major -lt 22 -or ($major -eq 22 -and $minor -lt 12) -or $major -ge 25) { Fail "Node $nodeVersion found; this project needs Node 22.12 to 24. Run: winget install --id OpenJS.NodeJS.LTS -e" }
$npmVersion = (npm -v)
Write-Host "git: $((git --version)) | node: $nodeVersion | npm: $npmVersion"
if (-not $npmVersion.StartsWith('11.')) {
  Write-Host "npm 11 is expected; updating npm..." -ForegroundColor Yellow
  npm install -g npm@11 | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host "Could not update npm (may need an Administrator terminal once: npm install -g npm@11). Continuing." -ForegroundColor Yellow }
}

Say "2/6 Repository settings"
$branch = (git branch --show-current)
Write-Host "Folder: $repo"
Write-Host "Branch: $branch"
git config core.autocrlf false
git config fetch.prune true
if (-not (git config --global user.email)) { Write-Host "Tip: set your Git identity once: git config --global user.name ""Taha""  and  git config --global user.email ""you@example.com""" -ForegroundColor Yellow }

Say "3/6 Copying .env files from the old project folder"
$envNow = Get-ChildItem -Path $repo -Force -File -Filter '.env*' | Where-Object { $_.Name -notlike '*.example' }
if ($envNow) {
  Write-Host "Already present here: $($envNow.Name -join ', ') (left as they are)."
} else {
  if (-not $OldFolder) {
    Write-Host "Looking for the old AllBarka folder on E: and F: (two levels deep)..."
    $found = @()
    foreach ($drive in @('E:\', 'F:\', 'D:\')) {
      if (-not (Test-Path $drive)) { continue }
      $dirs = @(Get-ChildItem -Path $drive -Directory -ErrorAction SilentlyContinue)
      $dirs += @($dirs | ForEach-Object { Get-ChildItem -Path $_.FullName -Directory -ErrorAction SilentlyContinue })
      foreach ($d in $dirs) {
        if ($d.FullName -eq $repo) { continue }
        $cfg = Join-Path $d.FullName '.git\config'
        $hasEnv = Get-ChildItem -Path $d.FullName -Force -File -Filter '.env*' -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '*.example' }
        if ((Test-Path $cfg) -and (Select-String -Path $cfg -Pattern 'AllBarka-34' -Quiet) -and $hasEnv) { $found += $d.FullName }
      }
    }
    if ($found.Count -eq 0) {
      Write-Host "No old folder with .env found. Copy your .env file into $repo by hand (do not paste it anywhere else)." -ForegroundColor Yellow
    } else {
      for ($i = 0; $i -lt $found.Count; $i++) { Write-Host "  [$($i + 1)] $($found[$i])" }
      $pick = Read-Host "Which folder has the working .env? Type the number (or press Enter to skip)"
      if ($pick -match '^\d+$' -and [int]$pick -ge 1 -and [int]$pick -le $found.Count) { $OldFolder = $found[[int]$pick - 1] }
    }
  }
  if ($OldFolder) {
    $files = Get-ChildItem -Path $OldFolder -Force -File -Filter '.env*' | Where-Object { $_.Name -notlike '*.example' }
    foreach ($f in $files) { Copy-Item -Path $f.FullName -Destination (Join-Path $repo $f.Name) }
    Write-Host "Copied: $($files.Name -join ', ') (contents not shown). The old folder is unchanged."
  }
}
$ignored = (git check-ignore .env 2>$null)
if (-not $ignored -and (Test-Path (Join-Path $repo '.env'))) { Fail ".env is not ignored by git here. Do not commit; tell Claude." }

Say "4/6 Installing packages (npm ci, a few minutes)"
npm ci
if ($LASTEXITCODE -ne 0) { Fail "npm ci failed. Copy the last 20 lines of the output to Claude." }

Say "5/6 Type check"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Fail "Type check failed. Copy the output to Claude." }
Write-Host "Type check passed." -ForegroundColor Green

Say "6/6 Done. Next steps"
Write-Host "1. Antigravity: File > Open Folder > $repo"
Write-Host "2. Agent panel > ... > Customizations: check 4 rules, 8 skills, 7 workflows, 2 MCP servers (firebase, context7)."
Write-Host "3. Settings: keep 'Agent Non-Workspace File Access' OFF; set terminal commands to ask before running."
Write-Host "4. New conversation:  /start live Firestore census"
Write-Host "Keep the old folder until this one works for a week; then you can archive it."
