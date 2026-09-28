---
title: "Deployed from a Workflow: This Post Is the Test"
slug: deployed-from-a-workflow
description: "A live deployment test: this post was committed, built by GitHub Actions, published by the pages deploy workflow, and verified at its public URL. If you can read this, the pipeline works end to end."
author: mehrshad
category: meta
tags: [github-actions, github-pages, deployment, testing]
published: 2026-09-27T21:30:00Z
featured: false
---
Every blog claims its deploy pipeline works. This post is the proof for this one.

It was written as a markdown file, committed to `main`, and picked up by `.github/workflows/deploy.yml` — the workflow that checks file casing, runs the test suite, compiles the Tailwind CSS, generates the static site, gates it through the site audit and cross-engine checks, uploads the artifact, and deploys it to GitHub Pages.

If this page renders at its own URL, then every link in that chain held.

## What the deployment actually does

The pipeline is deliberately boring to describe and strict in practice:

1. **Casing check first.** A file committed as `foo.csproj` while the solution references `Foo.csproj` builds on Windows and explodes on the Linux runner. The gate names that cause in one line instead of failing mysteriously.
2. **Tests.** The generator and its golden-file tests run before anything is published.
3. **CSS.** Tailwind compiles both the public and admin stylesheets with the CLI, no Node runtime needed.
4. **Generation.** The static site is generated from `content/` — including this post.
5. **Quality gates.** The site audit (crawlability, canonicals, sitemap) and the cross-engine CSS check run against the built output. A regression fails the deploy.
6. **Deploy.** The artifact goes to the `github-pages` environment via OpenID Connect — no personal access token exists anywhere in this pipeline.

## Why there is no token in this repository

The workflow declares `permissions: contents: read, pages: write, id-token: write`. GitHub issues a short-lived OIDC token to the job, and `actions/deploy-pages` exchanges it for a Pages deployment. There is no PAT to leak, rotate, or accidentally commit — the safest token is the one that does not exist.

## The setting that made this possible

Until today the repository's Pages source was "Deploy from a branch", which meant GitHub's legacy Jekyll builder also published on every push and raced this workflow for the same URL. The source now reads **GitHub Actions**, so this workflow is the only publisher.

This is the same pipeline that built [the first post](/StaticBlaze/posts/hello-staticblaze/), and the one that renders the [mermaid diagrams](/StaticBlaze/posts/mermaid-capability-check/) elsewhere on this site.
