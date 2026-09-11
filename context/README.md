# FAKEu

## Context sync protocol

This file is the shared context source for the project. Treat it as the handoff note for both Codex agents when direct file sharing is not possible.

Rules:

- Read this file first when starting work or after a pull/rebase.
- Update this file whenever the repo changes in a meaningful way.
- Keep it short and practical: current feature, what changed, important files, blockers, and next steps.
- Do not rely on raw repo memory alone; use this file as the common context anchor.
- If one person makes a change, the next Codex should refresh from this README before continuing.

Suggested format for updates:

```text
Current focus:
Files touched:
What changed:
Open questions:
Next step:
```

This keeps the repo context fresh without sharing full files.

FAKEu is a Chrome extension for X (Twitter) that helps users assess the credibility of factual claims in posts. It gives a fast, clearly-labelled preliminary signal, then performs a slower evidence-based verification in the background.

FAKEu does **not** decide whether an entire post or person is "true" or "fake." It evaluates specific, checkable claims and explains the available evidence.

## Product goal

When a user clicks **Check with FAKEu** on an X post:

1. FAKEu returns a result quickly, ideally within 1–2 seconds.
2. It first checks the cache. If this claim was checked before, the cached evidence result is returned immediately.
3. If no usable cached result exists, it displays a preliminary risk signal while an evidence check runs asynchronously.
4. The final result shows the extracted claim, verdict, explanation, sources, and check time.

The user should never be asked to wait for a long blocking fact-check in the feed.

## User experience

```text
User clicks “Check with FAKEu” on a post
        |
        +-- Cached final result found?
        |      |
        |      +-- Yes: show it immediately (usually under 1 second)
        |
        +-- No: run quick preliminary check (target: under 2 seconds)
                 |
                 +-- Show: “Preliminary: Caution” / “No obvious warning signs”
                 |
                 +-- Start background evidence check
                          |
                          +-- Show final cited verdict when ready
```

### Result states

Preliminary states are not fact-check verdicts:

- `checking` — processing has started.
- `preliminary_caution` — the post contains a potentially important claim, has no source, or contains other quick risk signals.
- `preliminary_no_obvious_warning` — no obvious text-level warning signal was found; this does not prove the claim.
- `not_checkable` — opinion, satire, joke, prediction, or no specific factual claim.

Final evidence-based states:

- `supported` — reliable evidence supports the exact claim.
- `contradicted` — reliable evidence contradicts the exact claim.
- `unverified` — evidence is missing, weak, mixed, or the event is still developing.

Avoid presenting a bare “true/fake” label. Final results must include source links and a short explanation.

## Scope of version 1

Build only the core flow:

- Chrome extension works on `x.com`.
- User manually clicks a FAKEu button on a post.
- Post text is sent to the backend.
- The system decides whether there is a checkable factual claim.
- It returns a fast preliminary result or a cached result.
- It extracts one or more claims, searches for evidence, and compares evidence to the claim in the background.
- It displays `supported`, `contradicted`, or `unverified` with citations.
- It caches normalized claims so repeated/near-identical claims are fast and inexpensive.

### Explicitly out of scope for version 1

- Automatic analysis of every post in a feed.
- Bot, spam-network, or coordinated-spread analysis.
- Account reputation scoring.
- Image, video, or deepfake verification.
- User accounts, payments, or social features.
- Full multilingual support (start with English; add Hindi/Hinglish later if needed).
- Continuous monitoring and user notifications about changed results.
- Training a custom machine-learning model.

## Core design principles

1. **Evidence over popularity.** Thousands of copied posts do not make a claim true.
2. **Cache first.** A known normalized claim should return the stored result immediately where it is still fresh.
3. **Fast is preliminary; evidence is final.** Wording/risk signals cannot prove a claim false.
4. **Use exact claims.** “A regional restriction” does not prove “a nationwide ban.”
5. **Be transparent.** Show the claim, sources, dates, and reason for every final verdict.
6. **Be cautious with uncertainty.** Absence of evidence means `unverified`, not `contradicted`.
7. **Minimize data.** Do not access DMs or collect unrelated browsing data.

## Architecture

```text
Chrome Extension (TypeScript)
        |
        | HTTPS JSON API
        v
Go Backend
  - HTTP API
  - cache lookup
  - job orchestration
  - database access
  - evidence search integration
  - final rule-based decision
        |
        +--------------------+
        |                    |
        v                    v
PostgreSQL              Python NLP service
  - checks                - checkability
  - claims                - claim extraction
  - sources               - evidence comparison
  - assessments
  - background jobs
```

### Technology choices

| Area | Initial choice | Why |
|---|---|---|
| Browser extension | TypeScript, Chrome Manifest V3 | Strong Chrome support and safer code than plain JavaScript |
| API/backend | Go | Fast, simple concurrency, good API/database tooling |
| NLP service | Python + FastAPI | Mature NLP/AI ecosystem |
| Local database | SQLite | Easiest development setup |
| Production database | PostgreSQL | Reliable queries and future scale |
| Background jobs | Simple Go worker loop at first | Avoid Redis/queues until the core flow works |
| NLP for first version | LLM API called through Python | No model training required before we have labelled data |
| Evidence retrieval | One news/web search provider plus trusted-domain filtering | Keeps version 1 manageable |

## Detailed processing flow

### 1. Extension reads a selected post

The content script injects a **Check with FAKEu** button into visible X post containers. On click, it extracts only public post information necessary for checking:

- post text
- post URL/ID
- post timestamp when available
- public author handle only if needed

The extension sends this to the Go backend. It never holds provider API keys.

### 2. Cache lookup happens before preliminary NLP

The Go backend normalizes the input and searches the database for an existing claim or a sufficiently similar normalized claim.

Possible cache outcomes:

- **Fresh final assessment:** return immediately as `cached_final`.
- **Existing job in progress:** attach the user to that job and return `checking`.
- **Old result:** show it as cached with its check date, then schedule a recheck if the claim is time-sensitive.
- **No match:** start the quick preliminary check and create a background job.

The cache key should not be the raw post text alone. It should be based on the normalized extracted claim, entities, date/scope when available, and language. Exact matching is enough initially; semantic claim matching can be added later.

### 3. Quick preliminary check

Target: under 2 seconds.

The Python NLP service determines:

- whether the post contains a checkable factual claim;
- whether it uses potentially risky framing such as “urgent,” “share before deleted,” or an unsupported major assertion;
- whether it contains a source link or attribution.

It returns a preliminary label and short reasons. This is a caution/risk signal only, never a final fake-news verdict.

### 4. Claim extraction

Python converts the post into one or more atomic factual claims. For example:

```text
Post: “The Indian government banned Product X nationwide today.”

Claim: “The Indian government imposed a nationwide ban on Product X today.”
Entities: Indian government, Product X, India, today
Type: government policy
```

Use strict structured JSON output and validate the response in Go.

### 5. Evidence retrieval

Go creates focused queries from the claim rather than searching the post text word-for-word. It retrieves a small set of candidate sources and favours:

1. Official government, court, regulatory, company, or research documents.
2. Established fact-check organizations.
3. Reputable independent news reporting.

For a government-policy claim, search official government/regulator sources first. Store each source URL, publisher, date, title, and relevant excerpt.

### 6. Evidence comparison

Python compares each evidence excerpt to the exact normalized claim. Each source is labelled:

- `supports`
- `contradicts`
- `partially_supports`
- `mentions_without_confirming`
- `irrelevant`

Example: an article describing a restriction in one state contradicts a claim that a product was banned nationwide.

### 7. Final verdict

Keep the first algorithm rule-based:

```text
Strong official/primary source contradicts the claim
  => contradicted

At least two strong independent sources support the exact claim,
and there is no strong contradiction
  => supported

Otherwise
  => unverified
```

Source quality, directness, and recency matter more than the number of posts repeating the claim.

## API contract (first draft)

### Create a check

`POST /v1/checks`

```json
{
  "postUrl": "https://x.com/example/status/123",
  "postText": "The government has banned Product X nationwide today.",
  "language": "en"
}
```

Example immediate response:

```json
{
  "checkId": "chk_123",
  "status": "checking",
  "resultSource": "new",
  "preliminaryLabel": "caution",
  "reasons": [
    "Contains a major factual claim",
    "No source is linked in the post"
  ],
  "message": "FAKEu is checking reliable sources."
}
```

Example cached response:

```json
{
  "checkId": "chk_098",
  "status": "complete",
  "resultSource": "cache",
  "verdict": "contradicted",
  "checkedAt": "2026-09-11T12:00:00Z",
  "message": "Showing a previously checked claim."
}
```

### Fetch a check result

`GET /v1/checks/{checkId}`

The extension polls this endpoint every 2–3 seconds only while a result is `checking`.

```json
{
  "checkId": "chk_123",
  "status": "complete",
  "verdict": "contradicted",
  "confidence": 86,
  "claim": "The government imposed a nationwide ban on Product X today.",
  "summary": "The available official source describes a regional restriction, not a nationwide ban.",
  "checkedAt": "2026-09-11T12:03:00Z",
  "evidence": [
    {
      "title": "Official notice",
      "url": "https://example.gov/notice",
      "publisher": "Example Government",
      "publishedAt": "2026-09-11",
      "relationship": "contradicts"
    }
  ]
}
```

## Python NLP service endpoints

`POST /checkability`

```json
{ "text": "The government has banned Product X nationwide today." }
```

Returns whether it is factual/checkable, a preliminary label, and reasons.

`POST /extract-claim`

```json
{ "text": "The government has banned Product X nationwide today." }
```

Returns structured claims, entities, dates, location, scope, and claim type.

`POST /compare-evidence`

```json
{
  "claim": "The government imposed a nationwide ban on Product X today.",
  "evidenceTitle": "Official notice",
  "evidenceExcerpt": "Product X sales are restricted in selected districts."
}
```

Returns relationship, confidence, and a concise reason.

## Initial data model

| Table | Main fields |
|---|---|
| `checks` | ID, post URL, text hash, status, preliminary label, final verdict, timestamps |
| `claims` | ID, normalized claim text, claim type, language, entity data, claim hash |
| `sources` | ID, URL, publisher, title, excerpt, published date, source type/quality |
| `source_assessments` | claim ID, source ID, relationship, confidence, explanation |
| `jobs` | ID, claim ID, status, attempts, scheduled time, error message |

## Suggested repository layout

```text
fakeu/
├── README.md
├── extension/
│   ├── manifest.json
│   ├── src/
│   │   ├── content.ts
│   │   ├── background.ts
│   │   ├── api.ts
│   │   └── ui/
│   └── package.json
├── backend-go/
│   ├── cmd/api/main.go
│   ├── internal/
│   │   ├── api/
│   │   ├── checks/
│   │   ├── cache/
│   │   ├── evidence/
│   │   ├── jobs/
│   │   ├── nlpclient/
│   │   └── store/
│   ├── migrations/
│   ├── go.mod
│   └── .env.example
└── nlp-python/
    ├── app/
    │   ├── main.py
    │   ├── schemas.py
    │   ├── checkability.py
    │   ├── extraction.py
    │   └── comparison.py
    ├── requirements.txt
    └── .env.example
```

## Development roadmap

### Milestone 1 — Extension shell

- Create a Manifest V3 extension.
- Make it load on X.
- Inject a FAKEu button into a post.
- Read public post text on click.
- Show a hard-coded result in the post UI.

### Milestone 2 — Go API connection

- Create `POST /v1/checks` and `GET /v1/checks/{id}`.
- Send selected post text from the extension to Go.
- Return mocked `checking` and final responses.

### Milestone 3 — Python NLP connection

- Create a FastAPI service.
- Implement checkability and claim extraction using structured model output.
- Connect Go to the Python service.
- Support `not_checkable` safely.

### Milestone 4 — Cache-first flow

- Add SQLite locally.
- Store claims and final results.
- Check cache before the preliminary model.
- Reuse matching/in-progress checks.

### Milestone 5 — Evidence check

- Integrate one search provider.
- Filter/rank candidate sources.
- Compare excerpts with the claim.
- Implement the three final verdicts.

### Milestone 6 — Background work and interface polish

- Run evidence checking in a Go background worker.
- Poll from the extension while the job is active.
- Show sources, check date, status, failures, and empty-result states.

### Milestone 7 — Evaluation

- Collect 30–50 manually reviewed example claims.
- Include supported, contradicted, unverified, opinion, and satire examples.
- Review every FAKEu output manually.
- Improve prompts, search filtering, and verdict rules before expanding features.

## Future work (after version 1)

- Recheck time-sensitive/breaking claims and notify users only of material verdict changes.
- Semantic cache matching with embeddings.
- Hindi and Hinglish support.
- Image/video verification.
- Coordination/spam signals as a separate risk indicator, never as proof.
- Better source registry and source-quality scoring.
- Replace selected LLM operations with specialised Python NLP models after collecting high-quality labelled data.

## Collaboration instructions for Codex

When working on this repository:

- Keep the MVP scope above; do not introduce account scoring, scraping at scale, or custom ML training unless requested.
- Preserve the cache-first, two-stage design.
- Keep Go responsible for orchestration and Python responsible for NLP.
- Prefer small, testable steps with a working extension-to-backend path before adding evidence providers.
- Avoid claiming a post is fake based only on language, popularity, or account metadata.
- Return evidence-based verdicts with user-visible sources and timestamps.
- Ask before choosing paid external providers or deploying production infrastructure.

