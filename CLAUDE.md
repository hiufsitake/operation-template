# Operations Portal Template — Claude Context

Template internal web portal for a company's group of businesses. Built as a PWA, deployed on Cloudflare Workers, with Supabase as the database and auth backend. Placeholder company name/logo/letterhead/contact details are used throughout — replace them with your own before real use.

---

## Project Structure

```
operation-template/
├── index.html          # Main dashboard + SITI AI chatbot + login
├── siti.js             # (reserved / SITI helper)
├── po/                 # Purchase Order module
├── cashclaim/          # Cash Claim module
├── staffclaim/         # Staff Claim module
├── leave/              # Leave application module
├── vehicle/            # Vehicle management module
├── pcm/                # Project Cost Management module
├── project/            # Project tracker module
├── customers/          # Customer database module
├── receiptsender/      # Receipt Sender module
├── settings/           # Admin-only settings (staff management)
├── wrangler.jsonc      # Cloudflare Workers deploy config
└── manifest.json       # PWA manifest (also duplicated in each subfolder)
```

Each module is a self-contained `index.html` — no build step, no bundler. All libraries loaded from CDN.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Vanilla HTML/JS + Tailwind CSS (CDN) |
| Database & Auth | Supabase (PostgreSQL) |
| Hosting | Cloudflare Workers (static assets) |
| Email | EmailJS (browser-only, no backend) |
| PDF | jsPDF + jsPDF-AutoTable |
| Excel export | SheetJS (XLSX) |
| AI | Google Gemini API (SITI chatbot + document reading) |
| Icons | Lucide |
| PWA | manifest.json + apple-mobile-web-app meta tags |

---

## Supabase Config

```
Project URL : https://YOUR_PROJECT_REF.supabase.co
Anon Key    : YOUR_SUPABASE_ANON_KEY
```

To find every occurrence in the codebase: `grep -r "YOUR_PROJECT_REF" .`

---

## Database Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `staff` | Global staff directory | `id`, `name`, `email`, `join_date` |
| `po_logs` | Purchase orders | `po_number`, `company`, `project`, `supplier`, `items` (jsonb), `total`, `status`, `submitted_by` |
| `cash_claims` | Cash reimbursements | `claimant_name`, `claimant_email`, `project`, `items` (jsonb), `total`, `status` |
| `staff_claims` | Staff expense claims | `staff_name`, `staff_email`, `project`, `company`, `claim_type`, `items` (jsonb), `total`, `status` |
| `logs` | Leave applications | `staff_name`, `staff_email`, `leave_type`, `start_date`, `end_date`, `days`, `status` |
| `projects` | Project records | `project_code`, `project_name`, `client`, `status`, `start_date`, `end_date`, `value`, `company` |
| `project_logs` | Project activity log | `project_id` (FK → projects), `action`, `note`, `logged_by` |
| `project_costs` | PCM costing entries | `project`, `company`, `category`, `description`, `amount`, `type`, `submitted_by` |
| `customers` | Customer database | `name`, `email`, `phone`, `address`, `company`, `notes` |
| `vehicles` | Company vehicles | `plate`, `make`, `model`, `year`, `road_tax_expiry`, `insurance_expiry`, `puspakom_expiry`, `photo_url` |
| `suppliers` | Supplier list for PO | `name`, `email`, `phone`, `address`, `category` |
| `receipt_logs` | Receipt sender history | `recipient_name`, `recipient_email`, `amount`, `description`, `sent_by`, `status` |
| `settings` | App-level key-value config | `key`, `value` |

Status values for approval modules: `'Pending'` / `'Approved'` / `'Rejected'`

---

## Admin Access

Defined in `index.html` and `settings/index.html`:

```javascript
const ADMIN_EMAILS = [
    'admin1@example.com',
    'admin2@example.com',
    'admin3@example.com'
];
```

Admins can: see pending-count badges on dashboard tiles, delete staff profiles in Settings, approve/reject requests in all modules.

---

## EmailJS Config

Used by: `po/index.html`, `cashclaim/index.html`, `staffclaim/index.html`, `leave/index.html`

```javascript
const EMAIL_SERVICE  = "YOUR_EMAILJS_SERVICE_ID";
const EMAIL_TEMPLATE = "YOUR_EMAILJS_TEMPLATE_ID";
const EMAIL_KEY      = "YOUR_EMAILJS_PUBLIC_KEY";
```

Template variables sent: `to_email`, `to_name`, `subject`, `message`, `from_name`.

---

## Google Gemini AI Config

The Gemini key is a server-side secret only — set as `env.GEMINI_API_KEY` on
the Cloudflare Worker (see `.github/SECRETS.md`). It is never embedded in any
HTML file or in `config.js`; every module calls Google through the Worker's
`/api/gemini/*` proxy in `src/index.js`, which injects the key server-side.

Used by: `index.html` (SITI chatbot), `po/index.html` (PO document reading),
`staffclaim/index.html` (receipt/document reading), `receiptsender/index.html`
(receipt data extraction), `pcm/index.html` (cost document reading).

Models used: `gemini-3-flash-preview` (default), `gemini-3.1-pro-preview`, `gemini-2.5-pro`, `gemini-1.5-flash` (fallback).

---

## Company Data (SITI chatbot context)

Defined in `index.html`:

```javascript
const CO_DATA = {
    'SOLUTIONS':    { name: 'COMPANY A SDN. BHD.',    reg: 'XXXXXXXXXXXX (XXXXXXX-X)', email: 'companya@example.com',    sst: true },
    'OPTIMIZATION': { name: 'COMPANY B SDN. BHD.', reg: 'XXXXXXXXXXXX (XXXXXXX-X)', email: 'companyb@example.com',    sst: true },
    'ENERGY':       { name: 'COMPANY C SDN. BHD.',       reg: 'XXXXXXXXXXXX (XXXXXXX-X)', email: 'companyc@example.com', sst: true }
};
const HQ_ADDR = "123 Company Street, City, State, Postcode, Country.";
const HQ_TEL  = "+000-000 0000 (Head Office)";
```

---

## SITI Chatbot (Dashboard AI)

- Lives in `index.html`
- Fetches live data from all Supabase tables every 3 minutes
- Answers questions about staff, POs, claims, leave, projects, customers, vehicles
- Supports model selection: flash (fast), pro (smarter), 2.5-pro (most capable)
- Chat history stored in `sessionStorage` key `company_siti_history`

---

## Auth Flow

- Supabase Email auth (no OAuth)
- **Demo mode: disabled.** This template repo removed every page's auth guard so it's freely explorable without a Supabase account — `index.html` skips straight to the dashboard and every module page skips its session check. To re-enable real auth, restore the `supabaseClient.auth.getSession()` guard at the top of each module (redirect to `../index.html` when there's no session) and put back `index.html`'s original login/session flow.
- Tab session tracked via `sessionStorage.company_tab_session` (logs out when tab closes) — inactive while demo mode is on
- Password reset via `resetPasswordForEmail`
- `window.confirm()` / `window.alert()` are **avoided** on iOS PWA — use the custom toast/modal system instead

---

## Deployment

```bash
npm install -g wrangler
wrangler login
wrangler deploy        # from repo root
```

`wrangler.jsonc` serves the entire repo root as static files. After deploy, update Supabase Auth → URL Configuration with the new Cloudflare URL.

---

## Development Notes

- No build step — edit HTML files directly, refresh browser to test
- All modules are standalone `index.html` files; shared logic is copy-pasted (not imported)
- `items` columns in claims/PO tables are `jsonb` arrays of line-item objects
- Vehicle photos stored in Supabase Storage bucket named `vehicles` (public)
- This template ships with no GitHub Actions workflows — it's hosted as a static site via GitHub Pages. Add your own automation (deploy pipeline, scheduled DB pings, report emails) if you need it.

---

## Live Database Access (Claude Agent)

If you set up a Claude agent to operate on this portal's live data, give it its
own read/query instructions here (e.g. how to obtain a service-role key from
your Supabase project settings and query the REST API directly). This section
is intentionally left blank in the template — do not commit real service-role
keys, personal access tokens, or file paths from any specific machine into
this file.
