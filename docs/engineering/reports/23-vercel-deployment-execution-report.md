# 23 — Vercel Deployment Execution

**Status:** NO DEPLOYMENT PERFORMED IN B1 · live URL existence observed but provenance unverified

## Why no deployment

| Prerequisite | Result |
|---|---|
| Vercel CLI installed | **no** (`vercel: command not found`) |
| Vercel authentication | **none** (`vercel whoami` unavailable) |
| Linked project / org | none |
| Production env vars | none set |
| Shared Redis | no credentials |
| Git remote operation | none attempted (uncommitted tree) |

No account access exists on this machine, so no preview or production deployment could be created in this batch. A public Vercel URL was observed returning 200 during the 2026-11-06 audit, but its commit, environment variables and quota implementation are unverified. Do not treat that URL as a verified deployment.

## Ready-to-run owner procedure

```bash
# 1. Commit and push the current tree (review `git status` first)
git add -A && git commit -m "feat: public-beta hardening"
git push

# 2. Import the repository at vercel.com/new (framework: Next.js)
#    Build command: npm run build   Install: npm ci   Node: 20.x or 22.x

# 3. Create Upstash Redis (free tier) and add:
#    UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN   (Production + Preview, separate DBs)
#    GITHUB_TOKEN (fine-grained, public read-only)
#    AI_API_KEY, AI_ANALYSIS_SECRET, AI_PUBLIC_ENABLED=1 only if AI is intentionally enabled

# 4. Deploy preview, then promote to production.
vercel --prod   # if using the CLI after `vercel link`
```

## Preview vs production

- Preview must use separate Upstash credentials and a separate GitHub token so preview cannot spend production quota.
- Production (`VERCEL_ENV=production`) requires both; otherwise analysis returns 503 by design.

## Post-deploy smoke tests (must run, not yet run)

1. `GET /` 200 and headers present.
2. Demo scan 200 and labelled demo data.
3. Real small scan 200; verify coverage and critical paths.
4. Production without store/token → 503 (configuration guard).
5. Quota: exceed per-client limit → 429 with `Retry-After`.
6. Rotate `x-forwarded-for` → quota must NOT reset (trusted header is used).
7. AI disabled → 503 honest message.
8. Confirm no token in bundles: `grep -r "ghp_" .next/static` (expect none).
9. Private repository → 422 `PRIVATE_REPOSITORY_NOT_SUPPORTED`; verify no tree/blob request is made.
10. Low GitHub quota → conservative admission refusal, not a half-finished scan.
11. Oversized chunked body → 413 without full buffering.

## Domain

No domain purchased. The assigned `*.vercel.app` URL is sufficient; a custom domain can be attached later in Project → Domains.
