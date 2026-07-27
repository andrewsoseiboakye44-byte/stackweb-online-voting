# Fix all remaining issues in STACKWEB project:
# 1. Wrong image paths: ../../../src/assets/images/ -> ../../assets/images/  (for src/pages/* files)
# 2. Emoji corruption in voter-management.html (U+23F3 ⏳) and help.html (U+26A1 ⚡)

# ── Fix 1: Wrong image paths ────────────────────────────────────────
Write-Host "Fixing image paths..."

$pagesRoot = 'c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM\src\pages'
$htmlFiles = Get-ChildItem -Path $pagesRoot -Recurse -Filter '*.html'

foreach ($f in $htmlFiles) {
  $raw = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $newRaw = $raw -replace '\.\./\.\./\.\./src/assets/images/', '../../assets/images/'
  if ($newRaw -ne $raw) {
    [System.IO.File]::WriteAllText($f.FullName, $newRaw, [System.Text.Encoding]::UTF8)
    Write-Host "  Path fixed: $($f.FullName)"
  }
}

# ── Fix 2: Emoji corruption in voter-management.html ─────────────────
Write-Host "Fixing emoji corruption in voter-management.html..."
$vmFile = 'c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM\src\pages\admin\voter-management.html'
$raw = [System.IO.File]::ReadAllText($vmFile, [System.Text.Encoding]::UTF8)

# The ⏳ emoji (U+23F3) was inserted where '>' and '</' should be
# Pattern observed: sidebar-brand"⏳<img ... /⏳</div⏳
# Fix: replace '⏳' that appears in HTML attributes/tags context with proper characters
# Looking at the actual corruption pattern:
#   class="sidebar-brand"⏳<img  ->  class="sidebar-brand"><img
#   /⏳</div⏳  ->  /></div>
$raw = $raw -replace '"⏳', '">'
$raw = $raw -replace '/⏳', '/>'
$raw = $raw -replace 'div⏳', 'div>'
$raw = $raw -replace '\.html⏳', '.html>'

[System.IO.File]::WriteAllText($vmFile, $raw, [System.Text.Encoding]::UTF8)
Write-Host "  voter-management.html fixed"

# ── Fix 3: Emoji corruption in help.html ────────────────────────────
Write-Host "Fixing emoji corruption in help.html..."
$helpFile = 'c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM\src\pages\admin\help.html'
$raw = [System.IO.File]::ReadAllText($helpFile, [System.Text.Encoding]::UTF8)

# The ⚡ emoji (U+26A1) was inserted similarly
$raw = $raw -replace '"⚡', '">'
$raw = $raw -replace '/⚡', '/>'
$raw = $raw -replace 'div⚡', 'div>'
$raw = $raw -replace '\.html⚡', '.html>'

[System.IO.File]::WriteAllText($helpFile, $raw, [System.Text.Encoding]::UTF8)
Write-Host "  help.html fixed"

Write-Host "All done."
