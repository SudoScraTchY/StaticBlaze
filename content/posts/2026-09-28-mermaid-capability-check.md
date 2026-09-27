---
title: "Every Mermaid Diagram, Rendered Live"
slug: mermaid-capability-check
description: "A full capability check of the mermaid pipeline: flowcharts, sequences, ER, journeys, gantt, pie, git graphs, mindmaps and quadrants, all rendered in the browser."
author: mehrshad
category: meta
tags: [markdown, github, design, testing]
published: 2026-09-28T00:30:00Z
featured: true
---
This site renders mermaid diagrams in the browser. The markdown pipeline rewrites every mermaid fence into a `<pre class="mermaid">` block, and a small client module upgrades those blocks into SVG using the same design tokens the page uses. What follows is every diagram type the pipeline supports, written as ordinary fenced markdown.

If a diagram below shows its *source* instead of a picture, rendering failed for that block and the page says so. That is the failure path working, not hiding.

## Flowchart

The workhorse. This one is the actual build pipeline of this site.

```mermaid
flowchart LR
    A[content/*.md] --> B{front matter ok?}
    B -- no --> X[generator refuses]
    B -- yes --> C[Markdig renders HTML]
    C --> D[mermaid blocks preserved]
    D --> E[Tailwind compiles CSS]
    E --> F[quality gates]
    F -- fail --> X
    F -- pass --> G[upload artifact]
    G --> H[GitHub Pages]
```

## Sequence diagram

How a comment gets from this page into GitHub Discussions.

```mermaid
sequenceDiagram
    autonumber
    actor R as reader
    participant G as giscus iframe
    participant GH as github.com
    participant D as Discussions
    R->>G: writes a comment
    G->>GH: posts with the reader's GitHub session
    GH->>D: creates or appends a discussion
    D-->>G: new comment count
    G-->>R: comment appears, no account on this site needed
```

## Class diagram

The content model, simplified to what actually matters.

```mermaid
classDiagram
    class SiteConfig {
        +string Title
        +string Url
        +CommentsConfig? Comments
    }
    class Post {
        +PostFrontmatter Frontmatter
        +string Html
        +string Slug
    }
    class GiscusConfig {
        +string Repo
        +string RepoId
        +string CategoryId
        +bool Enabled
    }
    SiteConfig --> GiscusConfig : optional
    SiteConfig --> Post : generates many
```

## State diagram

The contact form's state machine, exactly as implemented.

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> invalid: submit with bad fields
    invalid --> ready: fix inputs
    idle --> ready: submit with valid fields
    ready --> sending: press send
    sending --> stored: 2xx from receiver
    sending --> failed: network or 4xx/5xx
    failed --> ready: edit and resend
    stored --> [*]
```

## Entity relationship

```mermaid
erDiagram
    POST ||--o{ TAG : has
    POST }o--|| CATEGORY : files-under
    AUTHOR ||--o{ POST : writes
    POST {
        string slug PK
        string title
        datetime published
    }
    TAG {
        string slug PK
        string title
    }
```

## User journey

Publishing a post here, scored by satisfaction.

```mermaid
journey
    title Publish a post
    section Write
      Open content folder: 5: me
      Add front matter: 4: me
      Draft the body: 5: me
    section Ship
      Commit to main: 5: me
      Watch Actions run: 3: me
      Gates go green: 5: CI
    section Read
      Open the live URL: 5: reader
```

## Gantt

The redesign delivery, compressed.

```mermaid
gantt
    title Deep Field delivery
    dateFormat YYYY-MM-DD
    section Design
    Scan and assess       :done, a1, 2026-09-20, 3d
    Token system          :done, a2, after a1, 2d
    section Build
    Components rewrite    :done, b1, after a2, 3d
    Motion and scene      :done, b2, after b1, 2d
    section Ship
    CI gates              :done, c1, after b2, 1d
    Pages source flip     :active, c2, 2026-09-28, 1d
```

## Pie

Where the build time goes.

```mermaid
pie showData
    title CI minutes by step
    "dotnet test" : 34
    "tailwind" : 22
    "generate" : 18
    "quality gates" : 16
    "checkout and setup" : 10
```

## Git graph

The branch story so far.

```mermaid
gitGraph
    commit id: "naghsh"
    commit id: "deep field"
    branch feature
    commit id: "mermaid"
    commit id: "graph view"
    checkout main
    merge feature id: "ship"
```

## Mindmap

```mermaid
mindmap
  root((StaticBlaze))
    Content
      Markdown
        Front matter
        Mermaid fences
      Taxonomy
        Tags
        Categories
    Build
      Generator
        Razor templates
        Markdig
      Gates
        Casing
        Site audit
    Host
      GitHub Pages
        Actions source
        OIDC deploy
```

## Timeline

```mermaid
timeline
    title How this blog shipped
    section 2026
      August : StaticBlaze v1
             : Markdown feature tour
      September : Deep Field redesign
                : CI quality gates
                : Pages source flip
```

## Quadrant chart

```mermaid
quadrantChart
    title Effort versus payoff
    x-axis low effort --> high effort
    y-axis low payoff --> high payoff
    quadrant-1 big bets
    quadrant-2 quick wins
    quadrant-3 chores
    quadrant-4 sunk costs
    Comments: [0.3, 0.75]
    Graph view: [0.65, 0.8]
    Custom domain: [0.4, 0.2]
```

## What the pipeline rejects

The generator is strict on purpose. An undeclared tag, a duplicate canonical, or an empty diagram all fail the build with a named cause. That strictness is what makes a live test post like the one that preceded this article meaningful: if it published, it passed every gate.
