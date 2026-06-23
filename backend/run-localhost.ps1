Set-Location -LiteralPath $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "Node.js was not found. Install Node.js 18 or newer, then run this script again." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

& $node.Source server.js
Write-Host ""
Write-Host "Server stopped. Press Enter to close this window."
Read-Host
