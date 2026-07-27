
# STACKWEB Footer Updater
# 1. Removes any existing sw-dev-footer injections (CSS block + HTML block)
# 2. Re-injects cleanly with the real logo and correct tagline
# Run from the project root

$projectRoot = "c:\xampp\htdocs\STACKWEB-ONLINE-VOTING-SYSTEM"

# ── Shared CSS block (injected once per page inside <style>) ──────────────────
$footerCSS = @'

    /* ── STACKWEB Dev Footer ────────────────────────────────── */
    .sw-dev-footer{background:#fff;border-top:3px solid #e8e8e8;padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;gap:1.25rem;flex-wrap:wrap;flex-shrink:0;font-family:'Inter',sans-serif;}
    .sw-dev-footer-brand{display:flex;align-items:center;gap:0.75rem;}
    .sw-dev-footer-logo{height:52px;width:auto;display:block;object-fit:contain;}
    .sw-dev-footer-copy{font-size:0.72rem;color:#555;text-align:right;line-height:1.6;}
    .sw-dev-footer-copy strong{color:#1a237e;font-weight:700;}
    .sw-dev-footer-copy .tag{color:#e65100;font-style:italic;font-size:0.68rem;}
    @media(max-width:600px){.sw-dev-footer{flex-direction:column;align-items:center;text-align:center;}.sw-dev-footer-copy{text-align:center;}}
    /* ── End STACKWEB Dev Footer ────────────────────────────── */
'@

function Get-FooterHTML($logoPath) {
    $year = (Get-Date).Year
    return @"

  <!-- ── STACKWEB Developers Footer ────────────────────────── -->
  <footer class="sw-dev-footer">
    <div class="sw-dev-footer-brand">
      <img src="$logoPath" alt="StackWeb Developers — Smart Systems. Real Solutions." class="sw-dev-footer-logo" />
    </div>
    <div class="sw-dev-footer-copy">
      &copy; $year <strong>StackWeb Developers</strong>. All rights reserved.<br/>
      <span class="tag">Smart Systems. Real Solutions.</span>
    </div>
  </footer>
  <!-- ── End STACKWEB Developers Footer ────────────────────── -->
"@
}

function Strip-ExistingFooter($content) {
    # Remove the old CSS block (between the markers)
    $content = $content -replace '(?s)\r?\n    /\* ── STACKWEB Dev Footer.*?End STACKWEB Dev Footer [─]+\s*\*/', ''
    # Remove the old footer HTML block (between the HTML comments)
    $content = $content -replace '(?s)\r?\n  <!-- ── STACKWEB Developers Footer.*?End STACKWEB Developers Footer [─]+\s*-->\r?\n', "`n"
    return $content
}

function Inject-Footer($filePath, $logoRelPath) {
    $content = Get-Content $filePath -Raw -Encoding UTF8

    # Strip any previous injection
    $content = Strip-ExistingFooter $content

    # 1. Inject CSS — insert before the LAST </style> in <head>
    # Find position of last </style>
    $lastStyleClose = $content.LastIndexOf('</style>')
    if ($lastStyleClose -ge 0) {
        $content = $content.Substring(0, $lastStyleClose) + $footerCSS + "`n    " + $content.Substring($lastStyleClose)
    }

    # 2. Inject footer HTML just before </body>
    $footerHtml = Get-FooterHTML $logoRelPath
    $content = $content -replace '</body>', "$footerHtml`n</body>"

    Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  [OK] $($filePath.Replace($projectRoot,''))" -ForegroundColor Green
}

Write-Host "`n=== StackWeb Footer Injector (Real Logo) ===" -ForegroundColor Cyan

$logoDepths = @{
    "$projectRoot\src\pages\admin"    = "../../../src/assets/images/stackweb-dev-logo.png"
    "$projectRoot\src\pages\voter"    = "../../../src/assets/images/stackweb-dev-logo.png"
    "$projectRoot\src\pages\operator" = "../../../src/assets/images/stackweb-dev-logo.png"
}

foreach ($dir in $logoDepths.Keys) {
    $logoPath = $logoDepths[$dir]
    Get-ChildItem "$dir\*.html" | ForEach-Object {
        Inject-Footer $_.FullName $logoPath
    }
}

# Error page (2 levels deep from src/)
Inject-Footer "$projectRoot\src\pages\error.html" "../../src/assets/images/stackweb-dev-logo.png"

# Root index.html
Inject-Footer "$projectRoot\index.html" "src/assets/images/stackweb-dev-logo.png"

Write-Host "`n=== All pages updated with real logo! ===" -ForegroundColor Green
