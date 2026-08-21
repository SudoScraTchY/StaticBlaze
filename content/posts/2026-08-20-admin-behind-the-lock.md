---
title: "Draft: StaticBlaze Admin, Behind the Lock"
slug: admin-behind-the-lock
description: "How the admin app stores a GitHub PAT encrypted at rest with WebCrypto, and why that is honest about what it can and cannot protect. Work in progress."
author: mehrshad
category: engineering
tags: [github, blazor]
published: 2026-08-20T09:00:00Z
draft: true
---
Notes to self for the post about the admin app. Not published yet.

- PBKDF2 iterations: OWASP 2024 recommends 600k for SHA-256; we ship 310k as a compromise for older phones, revisit.
- Threat model honesty: encryption at rest protects localStorage dumps; it does nothing against live XSS.
- Fine-grained PAT scoped to one repo, contents read/write, 90 day expiry.
