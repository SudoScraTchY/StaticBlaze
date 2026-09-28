---
title: "Hello, StaticBlaze"
slug: hello-staticblaze
description: "First light for a blog that is just a folder of markdown, a generator, and GitHub Pages. What this thing is and how a page gets made."
author: mehrshad
category: meta
tags: [blazor, static-sites, github, markdown]
published: 2026-08-10T10:00:00Z
featured: true
---
This site has no server. There is no database, no runtime rendering, no container idling in a datacenter somewhere. There is a folder of markdown, a console application that turns it into HTML, and GitHub Pages serving the result for free.

The idea is simple enough to draw on a napkin:

```mermaid
flowchart LR
    A[content/*.md] --> B[Generator]
    B --> C[static HTML]
    C --> D[GitHub Pages]
    E[Admin app] -- "commits via GitHub API" --> A
```

## What happens on publish

1. Markdown and a small `site.json` live in the repository.
2. A push triggers GitHub Actions.
3. The generator validates every post, renders Blazor components into plain HTML, and writes the whole site out.
4. Pages uploads the artifact. Visitors get HTML that was finished before they asked for it.

## The reading experience is plain text at heart

A post is one file. Frontmatter carries the metadata:

```yaml
title: "Hello, StaticBlaze"
slug: hello-staticblaze
tags: [blazor, static-sites]
published: 2026-08-10T10:00:00Z
```

And the body is just markdown. Tables work:

| Piece | Runs where | Cost |
|---|---|---|
| Generator | CI runner | free |
| Admin app | author's browser | free |
| Public site | GitHub Pages | free |

Code works, with highlighting added later by a small script so the HTML you are reading stays clean.

## Why bother

Because static does not have to mean crude. Jekyll proved the model fifteen years ago; this is the same model with C# doing the carving. Everything on this page, from the [archive](/archive/) to the tags below, was decided at build time.

More soon. And the diagrams you saw at the top are not a plugin - the whole [mermaid capability set](/StaticBlaze/posts/mermaid-capability-check/) renders from plain fences, and the pipeline that [deploys this site](/StaticBlaze/posts/deployed-from-a-workflow/) is the same one that built this page.
