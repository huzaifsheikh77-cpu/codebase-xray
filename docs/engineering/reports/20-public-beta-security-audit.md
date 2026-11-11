# 20 — Public Beta Security Audit

## Verified controls

| Control | Evidence |
|---|---|
| Security headers (pre-existing, revalidated) | live `curl -D`: CSP `frame-ancestors 'none'; base-uri 'self'; form-action 'self'`, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP |
| Same-origin POST guard | route tests + code |
| Body caps on actual bytes | 4 KiB analyse, 512 KiB AI; tests |
| No-store on analysis/AI responses | added; verified in code and headers |
| Shared quota / fail-closed | Reports 18, live 503 probes |
| GitHub token isolation | server-only env; no logging of value |
| Secret redaction | security extractor redacts values before findings |
| AI untrusted-content handling | brief excludes repository instructions; prompt labels data |
| Repo URLs constrained | `parseRepoUrl` accepts GitHub owner/repo only; no arbitrary fetch URL |
| `Cache-Control` on sensitive routes | `no-store` |

## Findings this milestone

1. **Spoofable limiter identity (fixed).** Vercel-only headers are now trusted only when `VERCEL=1`, hashed; global budget is the backstop. Re-verified by tests.
2. **No shared limiter (fixed).** Production fails closed without a store.
3. **Contradictory security insight (fixed).** A clean “credential hygiene” insight could appear next to a secret-like-filename finding. Wording now claims only content-level signals and explicitly defers filename signals.
4. **Anonymous scans in production (fixed by gate).**

## SSRF review

The server only fetches `https://api.github.com/repos/{owner}/{repo}/...`, built from validated `owner`/`repo` segments. User input never becomes a hostname. GitHub redirects for renamed repositories stay on `api.github.com`; no redirect target is user-controlled. No proxy endpoint exists.

## Remaining risks

| Risk | Severity | State |
|---|---|---|
| Distributed IP rotation can consume global budget until exhausted | medium | global cap bounds damage; no auth |
| `postcss` high advisory via Next | medium | upstream; no forced override |
| No licence | high (legal) | owner decision |
| Repository content reaches AI summaries only | low | no source contents |
| Error logs include provider classification only | low | reviewed |
| No WAF/bot management | medium | Vercel Firewall available on paid plans; not required for beta |

## Abuse controls summary

- per-client + global counters (shared)
- duplicate scan lock
- body/size/time budgets
- one in-flight scan per repo
- early GitHub quota refusal
- emergency disable switches

## Not verified

- Headers on the deployed Vercel origin (no deployment).
- WAF/rate-limit behaviour at the edge.
- Penetration testing.
