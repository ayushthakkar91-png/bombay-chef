<#
  Updates the kitchen print agent to the latest version, without anybody
  zipping or copying files.

  Run on the till in PowerShell started with "Run as administrator":

      powershell -ExecutionPolicy Bypass -File update.ps1

  It downloads the current agent and installer straight from the project, then
  runs the normal install — which keeps the settings and the saved login that
  are already on this machine. Nothing is asked for and nothing is lost.

  It refuses to install a download that does not compile, and restarts the old
  version instead, so a bad update cannot leave a kitchen with no printer.
#>

param(
  [string]$Branch = "main",
  # Passed through to install.ps1 — only needed to CHANGE something, since the
  # installer keeps whatever is already set.
  [Parameter(ValueFromRemainingArguments = $true)]
  $InstallArgs
)

$ErrorActionPreference = "Stop"

$Repo = "ayushthakkar91-png/bombay-chef"
$Base = "https://raw.githubusercontent.com/$Repo/$Branch/print-agent"
$Files = @("BbcPrintAgent.cs", "install.ps1")

function Say($text, $colour = "Gray") { Write-Host $text -ForegroundColor $colour }

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not (New-Object Security.Principal.WindowsPrincipal $identity).IsInRole(
      [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Say "This has to run as administrator." "Red"
  exit 1
}

# GitHub will not talk to a client offering TLS 1.0, which is what this version
# of Windows reaches for first.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$staging = Join-Path $env:TEMP ("bbc-print-agent-" + [Guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force -Path $staging | Out-Null

Say ""
Say "Fetching the latest print agent..." "Cyan"
try {
  foreach ($file in $Files) {
    Invoke-WebRequest -Uri "$Base/$file" -OutFile (Join-Path $staging $file) -UseBasicParsing
    Say "  $file"
  }
} catch {
  Say "Could not download the update: $($_.Exception.Message)" "Red"
  Say "The printer is untouched and still running the version it had." "Yellow"
  Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
  exit 1
}

# Compile the download before trusting it. install.ps1 stops the service before
# it builds, so a file that does not compile would otherwise leave the kitchen
# with nothing printing until somebody noticed.
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }

Say "Checking it builds..."
& $csc /nologo /target:exe "/out:$staging\check.exe" `
       /r:System.Web.Extensions.dll /r:System.ServiceProcess.dll /r:System.Security.dll `
       (Join-Path $staging "BbcPrintAgent.cs") | Out-Null
if ($LASTEXITCODE -ne 0) {
  Say "The downloaded agent does not compile. Nothing was changed." "Red"
  Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
  exit 1
}
Remove-Item (Join-Path $staging "check.exe") -ErrorAction SilentlyContinue

Say "Installing..." "Cyan"
Push-Location $staging
try {
  if ($InstallArgs) {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $staging "install.ps1") -SkipCredentials @InstallArgs
  } else {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $staging "install.ps1") -SkipCredentials
  }
} finally {
  Pop-Location
  Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
}

Say ""
Say "Up to date." "Green"
