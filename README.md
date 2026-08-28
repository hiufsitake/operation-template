# Operations Portal Template

> **© 2026 Your Company. All Rights Reserved.**
> This repository contains proprietary and confidential software. Unauthorised use, copying, modification, distribution, or reverse-engineering of any part of this codebase is strictly prohibited. See [LICENSE](./LICENSE) for full terms.

A template internal web portal for a company's group of businesses, built as a Progressive Web App (PWA) and deployed on Cloudflare Workers. It covers day-to-day operational workflows across several modules. Replace the placeholder company name, logo, letterhead, and contact details throughout before deploying for real use — see [SETUP.md](./SETUP.md).

---

## Modules

| Module | Path | Description |
|---|---|---|
| **Purchase Order** | `/po` | Create, review, and approve POs across company entities. Supplier database with Excel import. |
| **Cash Claim** | `/cashclaim` | Staff cash reimbursement submissions with PDF generation and email notifications. |
| **Staff Claim** | `/staffclaim` | Staff expense claims with approval workflow and email notifications. |
| **Leave** | `/leave` | Leave application and approval system with balance tracking. |
| **Vehicle** | `/vehicle` | Company vehicle management with road tax expiry tracking and reminder emails. |
| **PCM** | `/pcm` | Project Cost Management — costing records per project with AI-assisted receipt scanning. |
| **Project** | `/project` | Project tracker with status, progress, and remarks. |
| **Settings** | `/settings` | Global staff database and system configuration (admin only). |

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS with Tailwind CSS (CDN)
- **Backend/DB:** [Supabase](https://supabase.com) (PostgreSQL + Auth)
- **Hosting:** Cloudflare Workers (static asset serving)
- **Email:** EmailJS
- **PDF:** jsPDF + jsPDF-AutoTable
- **Icons:** Lucide

---

## Deployment

The portal is deployed as a static site via Cloudflare Workers using Wrangler.

```bash
# Install Wrangler
npm install -g wrangler

# Deploy
wrangler deploy
```

The `wrangler.jsonc` config serves the root directory as static assets.

---

## Supabase Setup

The portal connects to a Supabase project. The following tables are required:

| Table | Purpose |
|---|---|
| `staff` | Global staff directory (name, email, join date) |
| `settings` | Key-value store for system config |
| `po_logs` | Purchase order records |
| `cash_claims` | Cash claim records |
| `staff_claims` | Staff expense claim records |
| `logs` | Leave application records |
| `suppliers` | Supplier database for PO module |
| `vehicles` | Vehicle records |
| `project_logs` | Project records |

Row Level Security (RLS) should be enabled on all tables. Admin-only operations (delete, update status) are restricted by checking the authenticated user's email against a hardcoded admin list.

---

## Auth

Authentication is handled via Supabase Auth. **This template repo runs in demo mode** — the login/auth guard is disabled everywhere so every page is open to any visitor; re-enable it (see `CLAUDE.md`) before using this for real data. Certain operations (approvals, deletions, exports) are restricted to admin emails defined in each module once auth is re-enabled.

---

## Hosting

This template ships with no GitHub Actions workflows or Cloudflare dependency — it's a static site served directly via GitHub Pages (Settings → Pages → Deploy from a branch). Add your own CI/CD if you need one.
