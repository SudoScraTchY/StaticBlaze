[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$d = 'M:/Users/SaintScraTchY/RiderProjects/StaticBlaze/styles/fonts'
New-Item -ItemType Directory -Force -Path $d | Out-Null
$sans = 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans@5/files/ibm-plex-sans-latin-{0}-normal.woff2'
$mono = 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5/files/ibm-plex-mono-latin-{0}-normal.woff2'
foreach ($w in '400','500','600','700') {
    Invoke-WebRequest -Uri ($sans -f $w) -OutFile (Join-Path $d "plex-sans-$w.woff2")
}
foreach ($w in '400','500') {
    Invoke-WebRequest -Uri ($mono -f $w) -OutFile (Join-Path $d "plex-mono-$w.woff2")
}
Get-ChildItem $d | Select-Object Name, Length
