# Deep fix for emoji-corrupted HTML files
# In voter-management.html, the '>' in ALL HTML tags was replaced by U+23F3 (⏳)
# In help.html, the '>' in ALL HTML tags was replaced by U+26A1 (⚡)
# We need to replace ALL occurrences of these emojis with '>'
# EXCEPT for any that are genuinely meant as content (which is very unlikely in these admin pages)

Write-Host "Deep-fixing emoji corruption..."

# voter-management.html: replace all ⏳ with >
$vmFile = 'c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM\src\pages\admin\voter-management.html'
$raw = [System.IO.File]::ReadAllText($vmFile, [System.Text.Encoding]::UTF8)
$newRaw = $raw -replace [char]0x23F3, '>'
[System.IO.File]::WriteAllText($vmFile, $newRaw, [System.Text.Encoding]::UTF8)
$count = ($raw.ToCharArray() | Where-Object { $_ -eq [char]0x23F3 }).Count
Write-Host "  voter-management.html: replaced $count ⏳ -> >"

# help.html: replace all ⚡ with >
$helpFile = 'c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM\src\pages\admin\help.html'
$raw = [System.IO.File]::ReadAllText($helpFile, [System.Text.Encoding]::UTF8)
$newRaw = $raw -replace [char]0x26A1, '>'
[System.IO.File]::WriteAllText($helpFile, $newRaw, [System.Text.Encoding]::UTF8)
$count = ($raw.ToCharArray() | Where-Object { $_ -eq [char]0x26A1 }).Count
Write-Host "  help.html: replaced $count ⚡ -> >"

Write-Host "Done."
