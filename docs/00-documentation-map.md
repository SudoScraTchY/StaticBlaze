# Documentation map and cleanup ledger

This file records **what changed in the docs tree** on the cleanup pass, and what remains.
It is the audit trail for the "keep technical/architectural, remove agent-specific" instruction.

## Removed (agent-specific / process documents)

| File | What it was | Why it was removed |
|---|---|---|
| `docs/02-task-assessment.md` | Assessment of "what is the outstanding task, how complete is it" | A one-off engagement artifact answering a task-scoping question that no longer exists. Its durable findings (the 15 defects) were resolved in the Deep Field rebuild and are recorded in `01` (scan) and `09` (handoff). |
| `docs/03-next-step-ideas.md` | A scored backlog of 15 candidate next steps | Working planning notes written during the redesign; stale once the work shipped. |
| `docs/08-task-ledger.md` | The agent's persisted task ledger (one row per task, reconciled from every source) | Pure process state for the agent's own tracking, not durable product knowledge. |

## Kept (technical / architectural)

| File | Kind | What it documents |
|---|---|---|
| `docs/01-repository-scan.md` | Technical | Folder structure, entry points, content model, build pipeline, dependencies |
| `docs/04-information-architecture.md` | Architectural | Sitemap, page inventory, navigation model, content hierarchy, user flows |
| `docs/05-design-system.md` | Technical | Tokens, contrast table, type scale, elevation, motion, interaction states |
| `docs/06-analytics-feasibility.md` | Technical | Metrics, privacy, schema, go/no-go verdict |
| `docs/07-verification-and-handoff.md` | Technical | Every verification command with exit status, measurements, defect post-mortem |
| `docs/09-deep-field-handoff.md` | Architectural | Design decision log, motion spec, failure matrix, known limitations |

## Added on this pass

| File | What it is |
|---|---|
| `docs/10-design-changes.md` | How to change the design, manually and via an agent |
| `docs/11-agent-ui-context.md` | Per-page feature inventory for an AI agent (no design prescription; ends in a user-input placeholder) |
| `docs/12-contact-endpoint.md` | How the contact form stores messages: receiver, deployment, guards |
| `docs/prototypes/page-transition-prototypes.html` | Side-by-side prototype record: full-window wipe vs partial blur refocus |
| `CHANGELOG.md` (repo root) | Notable changes, newest first |

## Ambiguity policy

The three removed files were unambiguously process artifacts. If a future cleanup
encounters a document that could be read either way, it is **not deleted** — it is flagged
here with a decision request instead.
