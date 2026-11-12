# Kitchen print agent

A Windows service that prints kitchen tickets for online orders. It replaces
the Sunmi terminal, which is locked by its reseller.

It runs in the background on the till PC. Nobody has to be logged in, no browser
has to be open, and after a power cut it starts printing again on its own.

## What it does

Every five seconds it asks the website for orders at its branch. Anything paid
for and not yet printed gets printed, and the website is told, so the same order
can never print twice — on this PC or on any other device.

If the printer is out of paper or switched off, the failure is recorded against
the order and shows up in the admin panel, instead of the ticket quietly
disappearing.

## Installing

On the till PC — over AnyDesk is fine:

1. Install the printer driver first and print a Windows test page. For the
   Epson TM-T20III that is the **Advanced Printer Driver (APD) v6** from
   epson.co.uk. The agent cannot print through a driver that is not there.
2. Set that printer as the Windows default, and turn off *Let Windows manage my
   default printer*. (Or skip this and pass `-Printer "EPSON TM-T20III Receipt"`
   below.)
3. Copy this folder onto the PC.
4. Right-click PowerShell → **Run as administrator**, then:

```powershell
cd <wherever you copied it>
powershell -ExecutionPolicy Bypass -File install.ps1
```

It asks for the staff email and password the agent should sign in as. Use a
branch staff account — not a manager or owner login.

It then compiles the agent, registers the service, starts it and prints a test
ticket. If paper comes out, it is done.

### Options

```powershell
.\install.ps1 -Location balham -Copies 2 -Printer "EPSON TM-T20III Receipt"
```

| Option | Default | What it does |
| --- | --- | --- |
| `-Location` | `balham` | Which branch's orders to print |
| `-Copies` | `1` | Tickets per order — 2 for kitchen plus counter |
| `-GapSeconds` | `3` | Pause between copies |
| `-Printer` | default printer | Print to a named printer instead |
| `-OpenDrawerOnCash` | off | Kick the cash drawer on a cash order |
| `-BaseUrl` | the live site | Point at a test deployment |

Run `install.ps1` again at any time to change a setting or update the agent.

## Checking on it

```powershell
# Is it running?
Get-Service BBCPrintAgent

# What has it been doing?
Get-Content "$env:ProgramData\BombayBicycleChef\PrintAgent\logs\agent-$(Get-Date -f yyyy-MM-dd).log" -Tail 20 -Wait

# What does a ticket look like? (no paper used)
& "$env:ProgramFiles\Bombay Bicycle Chef\PrintAgent\bbc-print-agent.exe" --preview

# Print a test ticket
& "$env:ProgramFiles\Bombay Bicycle Chef\PrintAgent\bbc-print-agent.exe" --test-print

# Watch it work in a window, with the service stopped
Stop-Service BBCPrintAgent
& "$env:ProgramFiles\Bombay Bicycle Chef\PrintAgent\bbc-print-agent.exe" --console
Start-Service BBCPrintAgent
```

## When something is wrong

**Nothing prints and the log says "Not signed in"** — the password changed, or
the account lost its staff role. Re-run `install.ps1`.

**"Cannot open printer"** — the printer is off, unplugged, or the driver was
removed. Print a Windows test page first; fix that before looking here.

**Tickets print twice** — shouldn't happen: the website records `printed_at` and
the agent keeps its own list of orders it printed but could not report. If it
does, send the log.

**It printed nothing but the order exists** — check the order actually reached
`paid`. The kitchen printer page in the admin panel (*Orders → Kitchen printer*)
shows the same queue and has a **Print now** button.

## Removing it

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

Add `-Purge` to delete the saved login and logs as well.

## How it is put together

| File | What it is |
| --- | --- |
| `BbcPrintAgent.cs` | The whole agent — one file, compiled on the machine by the C# compiler built into Windows |
| `install.ps1` | Compiles it, saves settings and login, registers the service |
| `uninstall.ps1` | Takes it all out again |

It uses the same `/api/pos/*` endpoints the Android terminal used, so there is
one shared definition of an order and of "this has been printed".

The staff password is stored encrypted with Windows DPAPI at machine scope: the
file is useless if copied to another computer, and the service can read it with
nobody logged in. It does **not** hide the password from an administrator of
this PC — which is why the agent signs in as branch staff and nothing more.
