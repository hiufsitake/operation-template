# COMPANY Portal — Full Setup Guide

This document explains every external service used by the COMPANY Portal, what each one does, and how to set it up from scratch. Anyone rebuilding or migrating the portal should follow this guide in order.

---

## Table of Contents

1. [Overview of Services](#1-overview-of-services)
2. [Supabase](#2-supabase)
3. [EmailJS](#3-emailjs)
4. [Google Gemini AI](#4-google-gemini-ai)
5. [Cloudflare Workers (Hosting)](#5-cloudflare-workers-hosting)
6. [Progressive Web App (PWA)](#6-progressive-web-app-pwa)
7. [Frontend Libraries (CDN)](#7-frontend-libraries-cdn)
8. [Admin Access Control](#8-admin-access-control)
9. [Company & SITI Chatbot Configuration](#9-company--siti-chatbot-configuration)
10. [File & Asset Checklist](#10-file--asset-checklist)

---

## 1. Overview of Services

| Service | Purpose | Free Tier? |
|---|---|---|
| Supabase | Database, authentication, file storage | Yes |
| EmailJS | Send emails from the browser (no backend) | Yes (200/month) |
| Google Gemini AI | AI document reading, SITI chatbot | Yes (rate-limited) |
| Cloudflare Workers | Static site hosting, global CDN | Yes |
| Google Fonts | Inter typeface for all pages | Yes |
| Tailwind CSS (CDN) | Utility CSS styling | Yes |
| Lucide Icons (CDN) | Icon set | Yes |
| jsPDF + AutoTable | Generate PDF documents in-browser | Yes |
| SheetJS (XLSX) | Export data to Excel files | Yes |
| pdf-lib | Merge/stamp PDFs (Receipt Sender) | Yes |

---

## 2. Supabase

Supabase is the core backend. It handles user login, all data storage, and the vehicle photo storage bucket.

### 2.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose an organisation, give the project a name (e.g. `operation-template`), set a strong database password, and pick the closest region (e.g. Singapore).
4. Wait ~2 minutes for the project to be ready.

### 2.2 Get Your API Credentials

Go to **Project Settings → API**. You need two values:

- **Project URL** — looks like `https://xxxxxxxxxxxxxx.supabase.co`
- **Anon / Public Key** — a long JWT string

Replace these two values everywhere they appear in the HTML files. Search for `YOUR_PROJECT_REF` to find every occurrence.

```
Current Project URL : https://YOUR_PROJECT_REF.supabase.co
Current Anon Key    : YOUR_SUPABASE_ANON_KEY
```

> The anon key is safe to include in frontend code. It is restricted by Supabase Row Level Security (RLS) rules.

### 2.3 Authentication Setup

1. In the Supabase dashboard go to **Authentication → Providers**.
2. Make sure **Email** is enabled.
3. Go to **Authentication → URL Configuration** and set:
   - **Site URL** — your Cloudflare Workers URL (e.g. `https://operation-template.your-account.workers.dev`)
   - **Redirect URLs** — add the same URL plus `http://localhost` for local testing.
4. Optionally disable **Confirm email** under **Authentication → Settings** if you want users to log in immediately without email verification.

### 2.4 Create All Database Tables

Run the following SQL in **SQL Editor → New Query**. Create each table exactly as shown — the column names must match what the JavaScript code expects.

---

#### `staff` — Global staff directory

```sql
create table staff (
  id bigint primary key,
  name text not null,
  email text not null unique,
  join_date date not null
);
```

Used by: Settings (add/delete staff), Leave (dropdown), Staff Claim (dropdown), PO (dropdown), Cash Claim (dropdown), SITI chatbot.

---

#### `po_logs` — Purchase Orders

```sql
create table po_logs (
  id bigint primary key,
  created_at timestamptz default now(),
  po_number text,
  company text,
  project text,
  supplier text,
  items jsonb,
  total numeric,
  status text default 'Pending',
  submitted_by text,
  submitted_email text,
  remarks text,
  requested_by text
);
```

Used by: PO module, Dashboard badge count, SITI chatbot.

---

#### `cash_claims` — Cash Claim requests

```sql
create table cash_claims (
  id bigint primary key,
  created_at timestamptz default now(),
  claimant_name text,
  claimant_email text,
  claimant_nric text,
  claimant_phone text,
  payable_name text,
  bank_details text,
  project text,
  items jsonb,
  total numeric,
  status text default 'Pending',
  submitted_by text,
  remarks text
);
```

Used by: Cash Claim module, Dashboard badge count, SITI chatbot.

---

#### `staff_claims` — Staff Claim requests

```sql
create table staff_claims (
  id bigint primary key,
  created_at timestamptz default now(),
  staff_name text,
  staff_email text,
  project text,
  company text,
  claim_type text,
  items jsonb,
  total numeric,
  status text default 'Pending',
  submitted_by text,
  remarks text
);
```

Used by: Staff Claim module, Dashboard badge count, SITI chatbot.

---

#### `logs` — Leave requests

```sql
create table logs (
  id bigint primary key,
  created_at timestamptz default now(),
  staff_name text,
  staff_email text,
  leave_type text,
  start_date date,
  end_date date,
  days numeric,
  reason text,
  status text default 'Pending',
  submitted_by text,
  remarks text
);
```

Used by: Leave module, Dashboard badge count, SITI chatbot.

---

#### `projects` — Project records

```sql
create table projects (
  id bigint primary key,
  created_at timestamptz default now(),
  project_code text,
  project_name text,
  client text,
  status text,
  start_date date,
  end_date date,
  value numeric,
  company text
);
```

Used by: Project Management module, SITI chatbot.

---

#### `project_logs` — Project activity log

```sql
create table project_logs (
  id bigint primary key,
  created_at timestamptz default now(),
  project_id bigint references projects(id),
  action text,
  note text,
  logged_by text
);
```

Used by: Project Management module, SITI chatbot.

---

#### `project_costs` — Project Costing (PCM)

```sql
create table project_costs (
  id bigint primary key,
  created_at timestamptz default now(),
  project text,
  company text,
  category text,
  description text,
  amount numeric,
  type text,
  submitted_by text
);
```

Used by: PCM module, SITI chatbot.

---

#### `customers` — Customer database

```sql
create table customers (
  id bigint primary key,
  created_at timestamptz default now(),
  name text,
  email text,
  phone text,
  address text,
  company text,
  notes text
);
```

Used by: Customer Database module, SITI chatbot.

---

#### `vehicles` — Vehicle records

```sql
create table vehicles (
  id bigint primary key,
  created_at timestamptz default now(),
  plate text not null,
  make text,
  model text,
  year text,
  road_tax_expiry date,
  insurance_expiry date,
  puspakom_expiry date,
  owner text,
  notes text,
  photo_url text
);
```

Used by: Vehicle Management module.

---

#### `suppliers` — Supplier database

```sql
create table suppliers (
  id bigint primary key,
  created_at timestamptz default now(),
  name text,
  email text,
  phone text,
  address text,
  category text
);
```

Used by: PO module (supplier dropdown).

---

#### `receipt_logs` — Receipt Sender history

```sql
create table receipt_logs (
  id bigint primary key,
  created_at timestamptz default now(),
  recipient_name text,
  recipient_email text,
  amount numeric,
  description text,
  sent_by text,
  status text
);
```

Used by: Receipt Sender module, SITI chatbot.

---

#### `settings` — App-level settings (reserved)

```sql
create table settings (
  id bigint primary key,
  key text unique,
  value text
);
```

Reserved for future app-wide configuration values.

---

### 2.5 Storage Bucket (Vehicle Photos)

1. In the Supabase dashboard go to **Storage**.
2. Click **New Bucket**, name it exactly `vehicles`, and set it to **Public**.
3. This allows vehicle photos uploaded in the Vehicle module to be publicly accessible via URL.

### 2.6 Row Level Security (RLS)

By default Supabase blocks all access. You have two options:

**Option A — Disable RLS (simple, suitable for internal tools):**
For each table, go to **Table Editor → [table name] → RLS** and disable it. This means anyone with the anon key can read/write, but since the portal requires login, this is acceptable for an internal tool.

**Option B — Enable RLS with policies (more secure):**
Add a policy to each table that allows access only to authenticated users:
```sql
-- Example for the staff table
alter table staff enable row level security;
create policy "Authenticated users only" on staff
  for all using (auth.role() = 'authenticated');
```
Repeat for every table if you want stricter security.

---

## 3. EmailJS

EmailJS lets the portal send emails directly from the browser without a backend server.

### 3.1 Create an EmailJS Account

1. Go to [https://www.emailjs.com](https://www.emailjs.com) and sign up.
2. Free tier allows 200 emails per month.

### 3.2 Add an Email Service

1. Go to **Email Services → Add New Service**.
2. Choose **Gmail** (or any provider).
3. Connect the Gmail account that will send the notification emails (e.g. `admin1@example.com`).
4. Note the **Service ID** generated (e.g. `YOUR_EMAILJS_SERVICE_ID`).

```
Current Service ID: YOUR_EMAILJS_SERVICE_ID
```

### 3.3 Create an Email Template

1. Go to **Email Templates → Create New Template**.
2. Design the template. The portal sends these variables:

| Variable | Description |
|---|---|
| `{{to_email}}` | Recipient's email address |
| `{{to_name}}` | Recipient's name |
| `{{subject}}` | Email subject line |
| `{{message}}` | Main body content (HTML or plain text) |
| `{{from_name}}` | Sender display name (e.g. COMPANY Portal) |

3. Note the **Template ID** generated (e.g. `YOUR_EMAILJS_TEMPLATE_ID`).

```
Current Template ID: YOUR_EMAILJS_TEMPLATE_ID
```

### 3.4 Get Your Public Key

1. Go to **Account → API Keys**.
2. Copy your **Public Key**.

```
Current Public Key: YOUR_EMAILJS_PUBLIC_KEY
```

### 3.5 Update the Code

These three values appear in four files: `po/index.html`, `cashclaim/index.html`, `staffclaim/index.html`, `leave/index.html`.

Search for `EMAIL_SERVICE`, `EMAIL_TEMPLATE`, and `EMAIL_KEY` in each file and replace the string values.

---

## 4. Google Gemini AI

The portal uses the Google Gemini API for two purposes:
- **SITI chatbot** (main dashboard) — answers questions about portal data
- **Document AI** — reads uploaded receipts/images and extracts data automatically (Staff Claim, PO, Receipt Sender, PCM)

### 4.1 Create a Google AI Studio API Key

1. Go to [https://aistudio.google.com](https://aistudio.google.com) and sign in with a Google account.
2. Click **Get API Key → Create API key**.
3. One key is enough — every module calls Gemini through the same server-side proxy (see below).

### 4.2 Store the Key as a Server-Side Secret

The Gemini key is **never** placed in any HTML file or in `config.js` — it lives
only as an encrypted secret on the Cloudflare Worker (`env.GEMINI_API_KEY`),
and every module calls Google through the Worker's `/api/gemini/*` proxy in
`src/index.js`. This keeps the key out of the browser entirely.

Set it either as a GitHub Actions secret named `GEMINI_API_KEY` (if your
deploy workflow pushes Worker secrets on push to `main`), or directly in the
Cloudflare dashboard under **Workers & Pages → your Worker → Settings →
Variables and Secrets**. See `.github/SECRETS.md` for the full inventory of
which secret goes where.

### 4.3 Models Used

The portal references these Gemini model names:

| Model ID | Used For |
|---|---|
| `gemini-3-flash-preview` | SITI chatbot default (fast, free) |
| `gemini-3.1-pro-preview` | SITI chatbot option (smarter) |
| `gemini-2.5-pro` | SITI chatbot option (most capable) |
| `gemini-1.5-flash` | Document reading fallback |

If a model name becomes invalid (Google renames models), update the `<select>` options in `index.html` and the fallback model name in the document-reading modules.

---

## 5. Cloudflare Workers (Hosting)

The portal is deployed as a static site on Cloudflare Workers using Wrangler.

### 5.1 Install Wrangler

```bash
npm install -g wrangler
```

### 5.2 Log In to Cloudflare

```bash
wrangler login
```

This opens a browser window. Approve the login.

### 5.3 Current Wrangler Configuration

The file `wrangler.jsonc` at the project root controls the deployment:

```jsonc
{
  "name": "operation-template",
  "compatibility_date": "2026-04-11",
  "observability": { "enabled": true },
  "assets": { "directory": "." },
  "compatibility_flags": ["nodejs_compat"]
}
```

| Setting | Meaning |
|---|---|
| `name` | The Workers project name — also becomes part of the default URL |
| `compatibility_date` | Locks the Workers runtime version so behaviour stays stable |
| `assets.directory` | Serves the entire repo root as static files |
| `nodejs_compat` | Enables Node.js compatibility APIs inside Workers |

### 5.4 Deploy

```bash
# From the repo root
wrangler deploy
```

After deploying, Cloudflare gives you a URL like:
`https://operation-template.<your-account>.workers.dev`

Set this URL as the **Site URL** in Supabase Authentication settings (see Section 2.3).

### 5.5 Custom Domain (Optional)

1. In the Cloudflare dashboard go to **Workers & Pages → operation-template → Custom Domains**.
2. Add your domain (e.g. `portal.example.com`).
3. Update the Supabase Site URL and Redirect URLs to match.

---

## 6. Progressive Web App (PWA)

The portal can be installed on mobile phones as a home-screen app (works offline-first look and feel).

### 6.1 Manifest Files

There is a `manifest.json` in the root and in each module subfolder. All are identical:

```json
{
  "name": "COMPANY Operations",
  "short_name": "COMPANY",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "applogo.png", "sizes": "192x192", "type": "image/png" },
    { "src": "applogo.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 6.2 App Icons

Two image files are used as the app identity:

| File | Used For |
|---|---|
| `applogo.png` | Home-screen icon (PWA install icon), Apple Touch icon |
| `ilogo.PNG` | Browser favicon (tab icon) — root pages |
| `ilogopo.PNG` | Browser favicon — PO module |
| `logo.jpg` | Splash/loading screen logo, login page logo |

If rebranding, replace all three image files. Keep the same filenames or update every `<link rel="icon">` and `<link rel="apple-touch-icon">` tag across all HTML files.

### 6.3 iOS PWA Notes

- The `<meta name="apple-mobile-web-app-capable" content="yes">` tag enables standalone mode on iOS.
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` makes the iOS status bar transparent.
- **Important:** `window.confirm()` and `window.alert()` are silently blocked in iOS PWA standalone mode. The portal uses a custom toast notification system instead — never use `confirm()` or `alert()` in new code.

---

## 7. Frontend Libraries (CDN)

All libraries are loaded from CDN links — no `npm install` required.

| Library | CDN URL | Version | Purpose |
|---|---|---|---|
| Tailwind CSS | `https://cdn.tailwindcss.com` | Latest | All UI styling |
| Lucide Icons | `https://unpkg.com/lucide@latest` | Latest | Icons throughout the app |
| Supabase JS | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | v2 | Database & auth client |
| jsPDF | `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` | 2.5.1 | PDF generation |
| jsPDF AutoTable | `https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js` | 3.5.25 | Table layout inside PDFs |
| EmailJS | `https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js` | v3 | Send emails from browser |
| SheetJS (XLSX) | `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js` | 0.18.5 | Export to Excel |
| pdf-lib | `https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js` | 1.17.1 | PDF stamping (Receipt Sender) |
| Google Fonts | `https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900` | Latest | Inter typeface |

> If any CDN link breaks in the future, replace it with a newer version URL from the library's official website or npmjs.com.

---

## 8. Admin Access Control

Three email addresses have elevated admin privileges. Admins can:
- See pending-count badges on the dashboard tiles
- Delete staff profiles in Settings

The list is defined in `index.html` and `settings/index.html`:

```javascript
const ADMIN_EMAILS = [
    'admin1@example.com',
    'admin2@example.com',
    'admin3@example.com'
];
```

To add or remove an admin, update this array in both files and redeploy.

> This is a client-side check — it controls what the UI shows. For a harder security boundary, enforce admin checks in Supabase RLS policies as well.

---

## 9. Company & SITI Chatbot Configuration

The SITI AI chatbot on the dashboard knows company details so it can answer questions correctly. These are hardcoded in `index.html`:

```javascript
const CO_DATA = {
    'SOLUTIONS':    { name: 'COMPANY A SDN. BHD.',    reg: 'XXXXXXXXXXXX (XXXXXXX-X)', email: 'companya@example.com',    sst: true },
    'OPTIMIZATION': { name: 'COMPANY B SDN. BHD.', reg: 'XXXXXXXXXXXX (XXXXXXX-X)', email: 'companyb@example.com',    sst: true },
    'ENERGY':       { name: 'COMPANY C SDN. BHD.',       reg: 'XXXXXXXXXXXX (XXXXXXX-X)', email: 'companyc@example.com', sst: true }
};
const HQ_ADDR = "123 Company Street, City, State, Postcode, Country.";
const HQ_TEL  = "+000-000 0000 (Head Office)";
```

Update these values if the company registration numbers, addresses, or emails change.

### SITI Data Sources

SITI fetches live data from Supabase every 3 minutes and can answer questions about:

| Topic | Table Queried |
|---|---|
| Staff list & leave balances | `staff`, `logs` |
| Purchase orders | `po_logs` |
| Cash claims | `cash_claims` |
| Staff claims | `staff_claims` |
| Projects & profitability | `projects`, `project_logs`, `project_costs` |
| Customers | `customers` |
| Vehicles | `vehicles` |
| Receipts sent | `receipt_logs` |

---

## 10. File & Asset Checklist

When rebuilding or migrating, confirm all of the following are in place:

### Services
- [ ] Supabase project created and credentials updated in all HTML files
- [ ] All 13 database tables created (see Section 2.4)
- [ ] `vehicles` storage bucket created and set to Public
- [ ] RLS configured for all tables
- [ ] Supabase Auth Site URL set to the deployed Cloudflare URL
- [ ] EmailJS account set up, Service ID / Template ID / Public Key updated in 4 files
- [ ] Google Gemini API keys created and updated in 5 files
- [ ] Cloudflare Workers project deployed with `wrangler deploy`

### Code
- [ ] All `YOUR_PROJECT_REF` references replaced with new Supabase project URL
- [ ] Admin emails list updated in `index.html` and `settings/index.html`
- [ ] Company details updated in `index.html` (CO_DATA, HQ_ADDR, HQ_TEL)

### Assets
- [ ] `applogo.png` — PWA home-screen icon (min 512×512 px)
- [ ] `ilogo.PNG` — favicon for browser tab
- [ ] `logo.jpg` — loading screen and login page logo
- [ ] All `manifest.json` files present in root and each module folder

---

*Last updated: April 2026*
