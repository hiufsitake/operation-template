# COMPANY Portal — Keys & Tokens Inventory

This file documents **where** every key/token lives and how to rotate it.
It deliberately contains **no actual secret values**. It is stored under
`.github/` which is excluded from the deployed site (`.assetsignore`).

---

## 1. Truly secret — server / CI only (NEVER in the repo)

This template ships with **no GitHub Actions workflows** — it's hosted as a
static site via GitHub Pages, which needs no secrets or deploy scripts. If
you later add automation (a real deploy pipeline, scheduled DB jobs, report
emails, etc.), store those secrets as **GitHub Actions Secrets**
(Repo → Settings → Secrets and variables → Actions) — never in the repo.

**Rotate:** generate a new value in the provider dashboard, then update the
secret in GitHub. No code change needed.

### Cloudflare Worker secrets (set in the Cloudflare dashboard)

These are encrypted secrets on the `operation-template` Worker itself, used by the
proxies in `src/index.js`. They are **not** managed via GitHub Actions —
the action's bulk-secret upload fails on this Worker (gradual deployments,
Cloudflare error 10215). Set them in **Workers & Pages → operation-template →
Settings → Variables and Secrets → add as "Secret"**. They persist across
deploys, so a normal `wrangler deploy` never wipes them.

| Secret name | Used by | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Worker `env.GEMINI_API_KEY` | Google Gemini key. The Worker proxies all AI calls at `/api/gemini/*`. **Never** in `config.js` or any HTML. |
| `RESEND_API_KEY` | Worker `env.RESEND_API_KEY` | Resend email key. Used by the `/api/send-email` proxy. |

**Rotate:** create a new key in the provider console, update the secret in the
Cloudflare dashboard (applies immediately), then delete the old key.

---

## 2. Browser keys — centralised in `config.js` (repo root)

These run in the user's browser, so they **cannot be fully hidden** on a
static site. They are centralised in one file and protected by provider-side
restrictions instead.

> **Note:** `GEMINI_API_KEY` used to live here and was stolen from the browser.
> It is now a **server-side secret** (see section 1) and `config.js` holds an
> empty placeholder. Do **not** put the Gemini key back in `config.js`.

_(No browser keys currently require provider-side locking.)_

---

## 3. Public by design — no protection needed

| Value | Where | Note |
|---|---|---|
| Supabase **anon** key + project URL | inline in each module's auth guard | Safe to be public; data is protected by Row Level Security (RLS) |

---

## Golden rules

- ✅ Server/CI secrets → **GitHub Actions Secrets** only (Gemini + Resend keys
  are now here, pushed to the Worker at deploy time).
- ✅ Provider keys that must stay private → behind the **Worker proxy**, never
  in `config.js` or any HTML.
- ❌ Never put the Cloudflare token, Resend key, Gemini key, or Supabase
  **service_role** key in any file that ships to the browser.
- 🔁 After rotating a key, **delete the old key** in the provider console so
  leaked copies stop working.
