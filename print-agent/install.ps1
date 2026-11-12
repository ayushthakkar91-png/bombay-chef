<#
  Installs the Bombay Bicycle Chef kitchen print agent as a Windows service.

  Run ON the till PC, in PowerShell started with "Run as administrator".
  AnyDesk is fine for this.

      powershell -ExecutionPolicy Bypass -File install.ps1

  It compiles the agent with the C# compiler built into Windows (nothing to
  download), saves the settings and the staff login, registers the service to
  start at boot and restart itself if it ever stops, then prints a test ticket.

  Run it again at any time to change a setting or update the agent — it will
  stop the service, rebuild and start it again.
#>

param(
  [string]$BaseUrl  = "https://www.bombay-bicycle-chef.com",
  [string]$Location = "balham",
  [string]$Printer  = "",
  [int]   $Copies   = 1,
  [int]   $GapSeconds = 3,
  [switch]$OpenDrawerOnCash,
  [string]$Email,
  [switch]$SkipCredentials
)

$ErrorActionPreference = "Stop"

$ServiceName = "BBCPrintAgent"
$DisplayName = "Bombay Bicycle Chef print agent"
$InstallDir  = Join-Path $env:ProgramFiles "Bombay Bicycle Chef\PrintAgent"
$DataDir     = Join-Path $env:ProgramData "BombayBicycleChef\PrintAgent"
$Exe         = Join-Path $InstallDir "bbc-print-agent.exe"
$Source      = Join-Path $PSScriptRoot "BbcPrintAgent.cs"

function Say($text, $colour = "Gray") { Write-Host $text -ForegroundColor $colour }

Say ""
Say "Bombay Bicycle Chef - kitchen print agent" "Cyan"
Say "-----------------------------------------"

# --- administrator ---------------------------------------------------------
# Registering a service and writing to Program Files both need it, and failing
# halfway through leaves a confusing mess.

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal $identity).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Say "This has to run as administrator." "Red"
  Say "Close this window, right-click PowerShell, choose 'Run as administrator', and run it again."
  exit 1
}

if (-not (Test-Path $Source)) {
  Say "Cannot find BbcPrintAgent.cs next to this script." "Red"
  exit 1
}

# --- compile ---------------------------------------------------------------
# csc.exe ships with the .NET Framework, which is part of Windows. No SDK, no
# installer, nothing to keep up to date on a machine that just has to work.

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) {
  Say "The C# compiler that comes with Windows is missing (.NET Framework 4)." "Red"
  Say "Install .NET Framework 4.8 from Microsoft and run this again."
  exit 1
}

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  Say "Stopping the running agent..."
  try { Stop-Service -Name $ServiceName -Force -ErrorAction Stop } catch {}
  Start-Sleep -Seconds 2
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

Say "Compiling..."
$refs = @("/r:System.Web.Extensions.dll", "/r:System.ServiceProcess.dll", "/r:System.Security.dll")
& $csc /nologo /optimize+ /target:exe "/out:$Exe" $refs $Source
if ($LASTEXITCODE -ne 0) {
  Say "The agent did not compile. Nothing was changed." "Red"
  exit 1
}
Say "Built $Exe" "Green"

# --- settings --------------------------------------------------------------

$config = [ordered]@{
  baseUrl          = $BaseUrl.TrimEnd("/")
  location         = $Location
  printer          = $Printer
  copies           = $Copies
  gapSeconds       = $GapSeconds
  pollSeconds      = 5
  openDrawerOnCash = [bool]$OpenDrawerOnCash
}
$configPath = Join-Path $DataDir "config.json"
$config | ConvertTo-Json | Out-File -FilePath $configPath -Encoding utf8
Say "Settings saved to $configPath" "Green"

# --- the staff login -------------------------------------------------------
# Encrypted with DPAPI at machine scope: the file is useless on any other PC,
# and the service account can read it without anybody being logged in. It does
# NOT hide the password from an administrator of this machine, which is why
# this should be a branch staff account and nothing with more rights.

$credentialsPath = Join-Path $DataDir "credentials.dat"
if (-not $SkipCredentials) {
  if (-not $Email) { $Email = Read-Host "Staff email the agent should sign in as" }
  $secure = Read-Host "Password for $Email" -AsSecureString
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

  Add-Type -AssemblyName System.Security
  $bytes = [Text.Encoding]::UTF8.GetBytes("$Email`n$plain")
  $sealed = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, "LocalMachine")
  [IO.File]::WriteAllBytes($credentialsPath, $sealed)

  # Don't leave the password sitting in memory any longer than necessary.
  $plain = $null
  [GC]::Collect()
  Say "Login saved, encrypted to this computer." "Green"
} elseif (-not (Test-Path $credentialsPath)) {
  Say "No login is saved and -SkipCredentials was given; the agent will not be able to sign in." "Yellow"
}

# --- the printer -----------------------------------------------------------

$default = Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1
if ($Printer) {
  Say "Printing to: $Printer"
} elseif (-not $default) {
  Say "No default printer is set. Set the receipt printer as default, or re-run with -Printer 'NAME'." "Yellow"
} elseif ($default.Name -match "PDF|XPS|OneNote|Fax|AnyDesk|Send To") {
  Say ("The default printer is '{0}', which does not print on paper." -f $default.Name) "Yellow"
  Say "Set the receipt printer as default, or re-run with -Printer 'NAME'." "Yellow"
} else {
  Say ("Printing to the default printer: {0}" -f $default.Name) "Green"
}

# --- the service -----------------------------------------------------------

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  Say "Removing the old service registration..."
  & sc.exe delete $ServiceName | Out-Null
  Start-Sleep -Seconds 2
}

Say "Registering the service..."
New-Service -Name $ServiceName -BinaryPathName "`"$Exe`"" -DisplayName $DisplayName `
            -StartupType Automatic `
            -Description "Prints kitchen tickets for online orders. Starts with Windows." | Out-Null

# Restart after 5s, then 10s, then every 30s, and forget the count each day.
# A till that reboots at 3am must come back printing without anyone noticing.
& sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null
& sc.exe failureflag $ServiceName 1 | Out-Null

Start-Service -Name $ServiceName
Start-Sleep -Seconds 3
$state = (Get-Service -Name $ServiceName).Status
if ($state -eq "Running") { Say "Service running." "Green" } else { Say "Service state: $state" "Yellow" }

# --- prove it works --------------------------------------------------------

Say ""
Say "Sending a test ticket..."
& $Exe --test-print
Say ""

$today = Join-Path $DataDir ("logs\agent-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
if (Test-Path $today) {
  Say "Last few log lines:" "Cyan"
  Get-Content $today -Tail 8 | ForEach-Object { Say "  $_" }
}

Say ""
Say "Done." "Cyan"
Say "  Log:      $today"
Say "  Settings: $configPath"
Say "  Preview a ticket without paper:  & '$Exe' --preview"
Say "  Watch it work:                   Stop-Service $ServiceName; & '$Exe' --console"
Say ""
