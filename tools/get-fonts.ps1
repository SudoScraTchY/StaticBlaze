[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Portable: fonts land next to this script (tools/fonts -> repo styles/fonts), never in one
# machine's absolute path.
$repo = Split-Path $PSScriptRoot -Parent
$d = Join-Path $repo 'styles/fonts'
New-Item -ItemType Directory -Force -Path $d | Out-Null

$sans = 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5/files/ibm-plex-sans-latin-{0}-normal.woff2'
$mono = 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5/files/ibm-plex-mono-latin-{0}-normal.woff2'

foreach ($w in '400','500','600','700') {
    Invoke-WebRequest -Uri ($sans -f $w) -OutFile (Join-Path $d "plex-sans-$w.woff2")
}
foreach ($w in '400','500') {
    Invoke-WebRequest -Uri ($mono -f $w) -OutFile (Join-Path $d "plex-mono-$w.woff2")
}

# Persian / Arabic script coverage (variable, weight 100-900). Only fetched by a page whose
# unicode-range matches, so a Latin-only page never pays for them.
$vazir = 'https://cdn.jsdelivr.net/npm/@fontsource-variable/vazirmatn@5/files/vazirmatn-{0}-wght-normal.woff2'
foreach ($subset in 'arabic','latin') {
    Invoke-WebRequest -Uri ($vazir -f $subset) -OutFile (Join-Path $d "vazirmatn-$subset-var.woff2")
}

Get-ChildItem $d | Select-Object Name, Length
