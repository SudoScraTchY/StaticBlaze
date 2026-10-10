<#
.SYNOPSIS
    Syncs the StaticBlaze source repo into the live blog repo (sudoscratchy.github.io).

.DESCRIPTION
    The blog repo shares git history with this repo and carries its own adaptations. This
    script automates what a human would do:

      1. fetch the blog remote
      2. merge blog/main into main
      3. resolve conflicts by policy:
           - code paths (.github, src, styles, tools, tests) -> THIS repo wins
           - content/taxonomy/*.json                          -> union by slug
           - other content/**                                 -> blog wins (it is where the
                                                                   admin commits new posts)
      4. re-apply the protected blog-only files from blog/main
      5. verify: build, tests, tailwind, generate, audit gates (unless -SkipVerify)
      6. push to BOTH repos; each repo's deploy workflow then rebuilds its own site

    Protected blog-only files (never overwritten by source, re-applied after every merge):
      - content/authors/mehrshad.json                      (real bio)
      - src/StaticBlaze.Site/Components/Pages/AuthorPage.razor  (resume section)
      - content/assets/Mehrshad_Zand_Resume.pdf            (resume asset)

    The deploy workflow is repo-aware (admin base path and SITE_URL derive from the repo
    name), so the same tree deploys correctly to both sites with no per-repo patching.

.PARAMETER WhatIf
    Print the plan without merging, pushing or writing anything.

.PARAMETER SkipVerify
    Skip the build/test/generate/audit verification before pushing (not recommended).

.EXAMPLE
    powershell -File tools/sync-blog.ps1 -WhatIf
    powershell -File tools/sync-blog.ps1
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo

$BlogRemote = 'blog'
$BlogUrl = 'https://github.com/SudoScraTchY/sudoscratchy.github.io.git'

$Protected = @(
    'content/authors/mehrshad.json',
    'src/StaticBlaze.Site/Components/Pages/AuthorPage.razor',
    'content/assets/Mehrshad_Zand_Resume.pdf'
)

function Write-Step($message) { Write-Host "`n=== $message ===" -ForegroundColor Cyan }

# ---------------------------------------------------------------- 1. preflight
Write-Step 'preflight'

if (-not (Test-Path (Join-Path $repo '.git'))) { throw 'run this script from inside the StaticBlaze repo' }

$dirty = git status --porcelain
if ($dirty) { throw "worktree is dirty - commit or stash first:`n$dirty" }

if (-not (git remote | Where-Object { $_ -eq $BlogRemote })) {
    if ($PSCmdlet.ShouldProcess($BlogUrl, 'git remote add blog')) {
        git remote add $BlogRemote $BlogUrl | Out-Null
        Write-Host "added remote '$BlogRemote' -> $BlogUrl"
    }
}

git fetch $BlogRemote 2>&1 | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { throw 'git fetch blog failed (network?)' }

$ahead = @(git rev-list --count "blog/main..HEAD")[0]
$behind = @(git rev-list --count "HEAD..blog/main")[0]
Write-Host "source is $ahead commit(s) ahead of blog, $behind behind"

if ($behind -eq 0 -and $ahead -eq 0) { Write-Host 'repos already identical. nothing to do.'; exit 0 }
if ($WhatIfPreference) {
    Write-Host 'what-if: would merge blog/main into main, re-apply protected files, verify, then push both repos.'
    exit 0
}

# ---------------------------------------------------------------- 2. merge
Write-Step 'merge blog/main into main'

git merge "blog/main" --no-edit -m 'sync: merge blog into source (automated by tools/sync-blog.ps1)' 2>&1 | ForEach-Object { Write-Host $_ }

if ($LASTEXITCODE -ne 0) {
    $conflicts = @(git diff --name-only --diff-filter=U)
    Write-Host "resolving $($conflicts.Count) conflict(s) by policy:" -ForegroundColor Yellow
    foreach ($f in $conflicts) {
        if ($Protected -contains $f) {
            git checkout --theirs -- $f
            Write-Host "  blog wins (protected): $f"
        }
        elseif ($f -like 'content/taxonomy/*.json') {
            # union by slug: keep every term from both sides, blog order last
            $raw = Get-Content $f -Raw
            $ours = @(); $theirs = @()
            $inOurs = $false; $inTheirs = $false
            foreach ($line in ($raw -split "`n")) {
                if ($line -like '<<<<<<<*') { $inOurs = $true; continue }
                if ($line -like '=======*') { $inOurs = $false; $inTheirs = $true; continue }
                if ($line -like '>>>>>>>*') { $inTheirs = $false; continue }
                if ($inOurs -and $line.Trim() -match '\{') { $ours += $line.Trim() }
                if ($inTheirs -and $line.Trim() -match '\{') { $theirs += $line.Trim() }
            }
            $bySlug = @{}
            foreach ($entry in ($ours + $theirs)) {
                $slug = [regex]::Match($entry, '"slug"\s*:\s*"([^"]+)"').Groups[1].Value
                if ($slug) { $bySlug[$slug] = $entry }
            }
            $merged = "[`n" + (($bySlug.Values | ForEach-Object { '  ' + ($_ -replace ',$', '') }) -join ",`n") + "`n]"
            [IO.File]::WriteAllText((Join-Path $repo $f), $merged, (New-Object System.Text.UTF8Encoding($false)))
            Write-Host "  union by slug: $f ($($bySlug.Count) terms)"
        }
        elseif ($f -like 'content/*') {
            git checkout --theirs -- $f
            Write-Host "  blog wins (content): $f"
        }
        else {
            git checkout --ours -- $f
            Write-Host "  source wins (code): $f"
        }
        git add $f
    }
    git commit --no-edit 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { throw 'merge commit failed - resolve manually with git status' }
}

# ---------------------------------------------------------------- 3. protected files
Write-Step 're-apply protected blog-only files'

foreach ($f in $Protected) {
    $exists = git cat-file -e "blog/main:$f" 2>$null
    if ($LASTEXITCODE -eq 0) {
        git checkout "blog/main" -- $f
        Write-Host "  restored from blog: $f"
    } else {
        Write-Host "  (not on blog, kept as merged): $f" -ForegroundColor DarkGray
    }
}

$staged = git status --porcelain
if ($staged) {
    git commit -m 'sync: re-apply protected blog-only files (automated)' 2>&1 | ForEach-Object { Write-Host $_ }
} else {
    Write-Host '  nothing to re-apply'
}

# ---------------------------------------------------------------- 4. verify
if (-not $SkipVerify) {
    Write-Step 'verify: build + tests'

    # PATH trap on this machine: first dotnet is a runtime-only shim
    $env:PATH = "C:\Program Files\dotnet;" + $env:PATH
    $env:DOTNET_ROOT = "C:\Program Files\dotnet"
    if (-not $env:APPDATA) { $env:APPDATA = "$env:USERPROFILE\AppData\Roaming" }
    if (-not $env:LOCALAPPDATA) { $env:LOCALAPPDATA = "$env:USERPROFILE\AppData\Local" }

    dotnet build StaticBlaze.slnx -c Release --no-restore --nologo
    if ($LASTEXITCODE -ne 0) { throw 'build failed - push aborted' }

    dotnet test StaticBlaze.slnx -c Release --no-restore --nologo --verbosity quiet
    if ($LASTEXITCODE -ne 0) { throw 'tests failed - push aborted' }

    Write-Step 'verify: tailwind + generate + gates'
    node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/site.css -o dist-assets/site.css --minify
    if ($LASTEXITCODE -ne 0) { throw 'tailwind site.css failed' }
    node tools/node-tools/node_modules/@tailwindcss/cli/dist/index.mjs -i styles/admin.css -o src/StaticBlaze.Admin/wwwroot/assets/admin.css --minify
    if ($LASTEXITCODE -ne 0) { throw 'tailwind admin.css failed' }

    dotnet run --project src/StaticBlaze.Generator -c Release --no-restore -- --content content --out dist --css dist-assets/site.css --static styles/static --vendor styles/vendor --fonts styles/fonts
    if ($LASTEXITCODE -ne 0) { throw 'generation failed - push aborted' }

    node tools/audit-site.mjs dist
    if ($LASTEXITCODE -ne 0) { throw 'audit gate failed - push aborted' }
    node tools/check-crossengine.mjs dist/assets/site.css
    if ($LASTEXITCODE -ne 0) { throw 'cross-engine gate failed - push aborted' }
    node tools/check-casing.mjs
    if ($LASTEXITCODE -ne 0) { throw 'casing gate failed - push aborted' }
}

# ---------------------------------------------------------------- 5. push both
Write-Step 'push both repos'

git push origin main 2>&1 | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { throw 'push to source (origin) failed' }

$pushed = $false
foreach ($attempt in 1..4) {
    git push $BlogRemote 'HEAD:main' 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -eq 0) { $pushed = $true; break }
    Write-Host "blog push attempt $attempt failed, retrying..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}
if (-not $pushed) { throw 'push to blog failed after 4 attempts - run: git push blog HEAD:main' }

$sha = (git rev-parse HEAD).Substring(0, 7)
Write-Host "`nsync complete at $sha" -ForegroundColor Green
Write-Host "  source CI: https://github.com/SudoScraTchY/StaticBlaze/actions"
Write-Host "  blog   CI: https://github.com/SudoScraTchY/sudoscratchy.github.io/actions"
Write-Host "  live site: https://sudoscratchy.github.io/"
