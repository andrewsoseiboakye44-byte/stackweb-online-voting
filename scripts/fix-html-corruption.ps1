# Comprehensive fix for corrupted HTML files
# The corruption: every '<' in HTML tags was replaced by 'd'
# e.g. '<div class="...">' became 'ddiv class="...">'
# e.g. '</div>' became 'd/div>'
# e.g. '<!-- comment -->' became 'd!-- comment -->'

# This script restores all 'd' prefix corruptions to '<'
# Strategy: Replace 'd' with '<' wherever followed by:
#   - '!' (comments and DOCTYPE)
#   - '/' followed by a tag name
#   - A known HTML tag name (opening tags)

$files = @(
  'c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM\src\pages\admin\dashboard.html',
  'c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM\src\pages\admin\manage-candidates.html',
  'c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM\src\pages\admin\manage-elections.html'
)

# HTML tag names (common ones used in these files)
$tagPattern = '(?:!--|!DOCTYPE|html|head|body|title|meta|link|script|style|noscript|' +
              'div|span|section|article|aside|nav|header|footer|main|' +
              'h1|h2|h3|h4|h5|h6|p|a|ul|ol|li|table|thead|tbody|tr|th|td|' +
              'form|input|button|select|option|textarea|label|fieldset|legend|' +
              'img|figure|figcaption|video|audio|source|canvas|svg|path|' +
              'strong|em|code|pre|blockquote|br|hr|' +
              'i|b|u|s|small|sup|sub|' +
              'template|slot|dialog|details|summary|' +
              'iframe|embed|object|' +
              '/html|/head|/body|/div|/span|/section|/article|/aside|/nav|/header|/footer|/main|' +
              '/h1|/h2|/h3|/h4|/h5|/h6|/p|/a|/ul|/ol|/li|/table|/thead|/tbody|/tr|/th|/td|' +
              '/form|/button|/select|/option|/textarea|/label|/fieldset|/legend|' +
              '/strong|/em|/code|/pre|/blockquote|' +
              '/i|/b|/u|/s|/small|/sup|/sub|' +
              '/template|/slot|/dialog|/details|/summary|' +
              '/script|/style|/title|/figure|/figcaption|/video|/audio|/canvas|/svg|' +
              '/iframe|/embed|/object)'

foreach ($f in $files) {
  $raw = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
  
  # Replace 'd' followed by a tag name (closing tag or opening tag or comment)
  # This regex matches 'd' immediately followed by tag patterns
  # We need to be careful not to replace 'd' that are part of actual words
  # The key insight: in the corrupted HTML, 'd' appears immediately before tag names/comments
  # with NO space or other character between 'd' and the tag
  
  # Pattern: 'd' followed by (tag names, '/', '!') that would form a valid HTML construct
  $raw = [regex]::Replace($raw, "d($tagPattern)(?=[>\s/""']|$)", '<$1')
  
  [System.IO.File]::WriteAllText($f, $raw, [System.Text.Encoding]::UTF8)
  Write-Host "Fixed: $f"
}
Write-Host "Done."
