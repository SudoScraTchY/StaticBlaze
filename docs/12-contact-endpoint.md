# Contact endpoint

The contact form is a static page, so it needs one piece of server to actually store a message.
This document covers what that piece is, how to run it, and how to point the site at it.

## How the wiring works

```
content/site.json  →  contact.endpoint  →  generator  →  <form data-endpoint="…">
                                                              │
                                          site.js reads the attribute *at submit time*
                                                              │
                                        POST {name,email,subject,body,website}
                                                              ▼
                                              tools/submissions-server.mjs  →  var/submissions/submissions.jsonl
```

- **Blank endpoint** (the default): the form validates properly, then says plainly that nothing
  was stored. It never pretends to succeed.
- **Configured endpoint**: a valid submission is POSTed, the button reports `saved`, and the
  fields clear. A failure (network, 400, 429) reports the reason and keeps your text.

## Run the receiver

It has no dependencies, no database, and no build step:

```powershell
node tools/submissions-server.mjs 8787
# submission receiver on http://localhost:8787
#   POST /submit  -> 201 {ok,id} | 400 {ok,errors} | 429 {ok,errors,retry_after}
#   GET  /health  -> {ok,accepted,rejected,stored}
#   store: <repo>/var/submissions/submissions.jsonl
#   guards: 5 per 10 min per client (in-memory, hashed), webhook off (set SB_WEBHOOK_URL)
```

Environment:

| Variable | Effect |
|---|---|
| `SB_ALLOW_ORIGIN` | CORS origin for the form POST. Defaults to `*`; set it to the site origin in production. |
| `SB_WEBHOOK_URL` | If set, accepted submissions are POSTed there (Slack, Discord, any JSON endpoint). Failure to notify never fails the submission. |

## Point the site at it

```json
// content/site.json
"contact": { "endpoint": "https://your-receiver.example.com/submit" }
```

Rebuild and deploy. The form picks it up from the generated attribute.

## Deploy the receiver

Anywhere that runs Node 20+: a small VPS with a systemd unit, a container on any host, or an
edge function (the handler is ~40 lines and easy to port). Two deployment notes:

1. **TLS is required** — the page is HTTPS, so a plain-HTTP endpoint is blocked by the browser.
2. **Set `SB_ALLOW_ORIGIN`** to your site origin once it is stable, so other sites cannot post.

## Where submissions are reviewable

The store is a JSONL file, one submission per line, plus the review tooling that already existed:

```powershell
node tools/submissions.mjs list                 # recent submissions
node tools/submissions.mjs export csv           # export for a spreadsheet
node tools/submissions.mjs export review.html   # human-readable review page with set-status
```

`var/` is gitignored: submissions are operational data, never content, never published.

## Guards, and what they do not claim

- **Validation** runs in the browser (fast feedback) *and* again in the store (the authority).
- **Honeypot**: the hidden `website` field must stay empty; bots that fill it get a 400.
- **Rate limit**: 5 submissions per 10 minutes per client. The client key is a SHA-256 of
  (per-process random salt ‖ remote address); the address itself is never logged or stored, and
  the salt is regenerated each run so the hashes cannot be correlated across restarts.
- **Not claimed**: this is not a spam classifier. A determined human can still submit. The rate
  limit plus the honeypot are the guard, and moderation happens in the review tooling.
