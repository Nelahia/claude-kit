import { RESUME_MARK } from './relay-prompt'

const A = 'System.Windows.Automation'

/**
 * PowerShell that focuses Claude, accepts the workspace-trust dialog if shown, finds the
 * prompt box through UI Automation, waits for the prefilled handoff, then presses Enter.
 * Each step is logged to `log` so a silent failure can be read afterwards.
 */
export const sendScript = (log: string): string =>
  [
    `$log = '${log}'; function L($m) { Add-Content $log ((Get-Date -Format o) + ' ' + $m) }`,
    "L 'spawn'; Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes",
    "L 'start'; $s = New-Object -ComObject WScript.Shell; $done = $false",
    `$btn = [${A}.ControlType]::Button; $edit = [${A}.ControlType]::Edit`,
    `$pid2 = [${A}.AutomationElement]::ProcessIdProperty; $typ = [${A}.AutomationElement]::ControlTypeProperty`,
    "$id = (Get-Process claude | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 1).Id",
    'foreach ($i in 1..40) {',
    "[void]$s.AppActivate('Claude')",
    `$w = [${A}.AutomationElement]::RootElement.FindFirst('Children', (New-Object ${A}.PropertyCondition($pid2, $id)))`,
    `if ($w) { foreach ($b in $w.FindAll('Descendants', (New-Object ${A}.PropertyCondition($typ, $btn)))) {`,
    `if ($b.Current.Name -match 'confiance|Trust') { $b.GetCurrentPattern([${A}.InvokePattern]::Pattern).Invoke(); L 'trusted'; Start-Sleep -Milliseconds 800; break } }`,
    `$e = $w.FindFirst('Descendants', (New-Object ${A}.PropertyCondition($typ, $edit)))`,
    `$t = ''; if ($e) { foreach ($c in $e.FindAll('Descendants', [${A}.Condition]::TrueCondition)) { $t += $c.Current.Name } }`,
    `if ($e -and $t -match '${RESUME_MARK}') { $e.SetFocus(); Start-Sleep -Milliseconds 300; $s.SendKeys('{ENTER}'); L 'enter'; $done = $true; break } }`,
    "L ('try ' + $i); Start-Sleep -Milliseconds 300 }",
    "L ('end ' + $done); if ($done) { 'sent' }",
  ].join('; ')
