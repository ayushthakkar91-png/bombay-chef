<#
  Removes the kitchen print agent.

  Run as administrator. Settings, the saved login and the logs are left in
  place unless -Purge is given, so reinstalling picks up where this left off.
#>

param([switch]$Purge)

$ErrorActionPreference = "Stop"

$ServiceName = "BBCPrintAgent"
$InstallDir  = Join-Path $env:ProgramFiles "Bombay Bicycle Chef\PrintAgent"
$DataDir     = Join-Path $env:ProgramData "BombayBicycleChef\PrintAgent"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not (New-Object Security.Principal.WindowsPrincipal $identity).IsInRole(
      [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "This has to run as administrator." -ForegroundColor Red
  exit 1
}

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
  try { Stop-Service -Name $ServiceName -Force -ErrorAction Stop } catch {}
  Start-Sleep -Seconds 2
  & sc.exe delete $ServiceName | Out-Null
  Write-Host "Service removed." -ForegroundColor Green
} else {
  Write-Host "The service was not installed."
}

if (Test-Path $InstallDir) {
  Remove-Item -Recurse -Force $InstallDir
  Write-Host "Program files removed." -ForegroundColor Green
}

if ($Purge) {
  if (Test-Path $DataDir) {
    Remove-Item -Recurse -Force $DataDir
    Write-Host "Settings, saved login and logs removed." -ForegroundColor Green
  }
} else {
  Write-Host "Settings and logs kept in $DataDir (use -Purge to delete them too)."
}
