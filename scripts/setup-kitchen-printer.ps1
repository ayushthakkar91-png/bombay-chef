<#
  Sets up a till PC to print kitchen tickets.

  Run this ON the till PC (over AnyDesk is fine), in PowerShell. It does not
  need administrator rights and it installs nothing — it checks the printer
  situation and creates two shortcuts:

    Desktop  — "Kitchen Printer", to start it by hand
    Startup  — the same thing, so it comes back on its own after a reboot

  The printer driver has to be installed separately, before this: a thermal
  printer with no driver cannot be made the default, and silent printing goes
  to whatever the default is.

  Usage:
    powershell -ExecutionPolicy Bypass -File setup-kitchen-printer.ps1
#>

param(
  [string]$Url = "https://www.bombay-bicycle-chef.com/admin/orders/print",
  [switch]$NoStartup
)

$ErrorActionPreference = "Stop"

function Say($text, $colour = "Gray") { Write-Host $text -ForegroundColor $colour }

Say ""
Say "Bombay Bicycle Chef - kitchen printer setup" "Cyan"
Say "-------------------------------------------"

# --- 1. Chrome -------------------------------------------------------------
# Silent printing is a Chrome flag. Edge has it too, but the kitchen page is
# only ever tested against Chrome, so don't quietly substitute one.

$candidates = @(
  (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
  (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
)
$chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
  Say "Google Chrome is not installed on this PC." "Red"
  Say "Install it from https://www.google.com/chrome and run this again."
  exit 1
}
Say "Chrome found: $chrome" "Green"

# --- 2. The default printer ------------------------------------------------
# --kiosk-printing always prints to the Windows default, with no dialog and no
# way to choose. If the default is a PDF writer, tickets vanish into files and
# nobody notices until the kitchen asks where the orders are.

$printers = Get-CimInstance Win32_Printer
$default  = $printers | Where-Object { $_.Default -eq $true } | Select-Object -First 1

Say ""
Say "Printers on this PC:"
foreach ($p in $printers) {
  $mark = "  "
  if ($p.Default -eq $true) { $mark = "* " }
  Say ("  {0}{1}" -f $mark, $p.Name)
}

$notReal = "PDF|XPS|OneNote|Fax|AnyDesk|Send To"
if (-not $default) {
  Say ""
  Say "No default printer is set. Set the receipt printer as default before using this." "Yellow"
} elseif ($default.Name -match $notReal) {
  Say ""
  Say ("The default printer is '{0}', which does not print on paper." -f $default.Name) "Yellow"
  Say "Settings > Bluetooth & devices > Printers & scanners:" "Yellow"
  Say "  1. Turn OFF 'Let Windows manage my default printer'" "Yellow"
  Say "  2. Open the receipt printer > Set as default" "Yellow"
} else {
  Say ""
  Say ("Default printer: {0}" -f $default.Name) "Green"
}

# --- 3. The shortcuts ------------------------------------------------------
#   --kiosk-printing  no print dialog: paper comes straight out
#   --kiosk           full screen, no address bar, nothing to fiddle with
# The normal Chrome profile is used on purpose, so the staff login is
# remembered and a reboot does not cost anybody an order.

$arguments = '--kiosk-printing --kiosk "{0}"' -f $Url

function New-KitchenShortcut($path) {
  $shell = New-Object -ComObject WScript.Shell
  $lnk = $shell.CreateShortcut($path)
  $lnk.TargetPath = $chrome
  $lnk.Arguments = $arguments
  $lnk.WorkingDirectory = Split-Path $chrome
  $lnk.Description = "Kitchen ticket printing - leave this open during service"
  $lnk.IconLocation = "$chrome,0"
  $lnk.Save()
}

$desktop = [Environment]::GetFolderPath("Desktop")
$link = Join-Path $desktop "Kitchen Printer.lnk"
New-KitchenShortcut $link
Say ""
Say "Created: $link" "Green"

if (-not $NoStartup) {
  $startup = [Environment]::GetFolderPath("Startup")
  $autoLink = Join-Path $startup "Kitchen Printer.lnk"
  New-KitchenShortcut $autoLink
  Say "Created: $autoLink  (starts automatically after a reboot)" "Green"
}

# --- 4. What a person still has to do --------------------------------------

Say ""
Say "Still to do, by hand:" "Cyan"
Say "  1. Double-click 'Kitchen Printer' on the desktop."
Say "  2. Log in as staff - the first time only."
Say "  3. Tap or click the page once, or Windows will not let it beep."
Say "  4. Place a test order and watch the paper."
Say ""
Say "To close it: Alt+F4." "Gray"
Say ""
