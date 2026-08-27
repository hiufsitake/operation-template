'use strict';
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BASE       = 'https://YOUR_PROJECT_REF.supabase.co/rest/v1';
const KEY        = process.env.SUPABASE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL   = 'admin1@example.com';
const TYPE       = process.argv[2] || 'daily';

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function sb(table, params = '') {
  const res = await fetch(`${BASE}/${table}?${params}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

const rm  = v => `RM ${Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmt = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const sum = (arr, key='total_amount') => arr.reduce((s,x)=>s+Number(x[key]||0),0);
const cnt = (arr, status, field='status') => arr.filter(x=>x[field]===status).length;
const grp = (arr, field, valField='total_amount') => {
  const m = {};
  arr.forEach(x => { m[x[field]] = (m[x[field]]||0) + Number(x[valField]||0); });
  return m;
};

function todayMYT() {
  const now = new Date();
  const myt = new Date(now.getTime() + 8*3600000);
  const d   = myt.toISOString().slice(0,10);
  return {
    start: `${d}T00:00:00%2B08:00`,
    end:   `${d}T23:59:59%2B08:00`,
    label: myt.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),
    short: d,
  };
}

function prevMonthMYT() {
  const now = new Date(new Date().getTime() + 8*3600000);
  const y   = now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear();
  const m   = now.getMonth() === 0 ? 12 : now.getMonth();
  const mStr = String(m).padStart(2,'0');
  const daysInMonth = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${mStr}-01T00:00:00%2B08:00`,
    end:   `${y}-${mStr}-${daysInMonth}T23:59:59%2B08:00`,
    label: new Date(y, m-1, 1).toLocaleDateString('en-GB',{month:'long',year:'numeric'}),
    short: `${y}-${mStr}`,
  };
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

const esc = s => String(s ?? '—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function statusHtml(status) {
  const s = String(status || '');
  const color = s === 'Approved'         ? '#6a6a6a'
              : s === 'Rejected'         ? '#5c5c5c'
              : s === 'Pending'          ? '#a7a7a7'
              : s === 'APPROVED & SENT'  ? '#878787'
              : s === 'ONGOING'          ? '#606060'
              : s === 'DONE'             ? '#727272'
              : '#727272';
  return `<span style="color:${color};font-weight:700">${esc(s)}</span>`;
}

function tbl(headers, rows) {
  if (!rows || !rows.length) return '<p class="empty">No records.</p>';
  const ths = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const trs = rows.map((row, ri) => {
    const bg = ri % 2 === 0 ? '#ffffff' : '#fafafa';
    return `<tr style="background:${bg}">${row.map(cell => `<td>${cell ?? '—'}</td>`).join('')}</tr>`;
  }).join('');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function secHdr(title, count) {
  const badge = count != null ? `<span>${count} record${count !== 1 ? 's' : ''}</span>` : '';
  return `<div class="sec-hdr"><span>${esc(title)}</span>${badge}</div>`;
}

function subHdr(text) { return `<div class="sub-hdr">${esc(text)}</div>`; }
function empty(text)  { return `<p class="empty">${esc(text)}</p>`; }

function statBox(...lines) {
  return `<div class="stat-box">${lines.map(l => `<div class="stat-line">${l}</div>`).join('')}</div>`;
}

function summaryCards(...items) {
  const cards = items.map(({label, value, sub}) => `
    <div class="card">
      <div class="card-val">${esc(value)}</div>
      <div class="card-lbl">${esc(label)}</div>
      ${sub ? `<div class="card-sub">${esc(sub)}</div>` : ''}
    </div>`).join('');
  return `<div class="cards">${cards}</div>`;
}

// ─── PCM Summary ─────────────────────────────────────────────────────────────

function classifyForPcm(p) {
  if (!p.project_no) return null;
  const pno = String(p.project_no).toUpperCase().trim();
  if (pno.startsWith('OPA'))            return 'OPA';
  if (pno.startsWith('A'))              return 'ADVISORY';
  if (p.company_key === 'OPTIMIZATION') return 'OPTIMIZATION';
  if (p.company_key === 'ENERGY')       return 'ENERGY';
  return 'SOLUTIONS';
}

function buildPcmSummary(allProjects, allCosts) {
  const ORDER = ['SOLUTIONS', 'OPTIMIZATION', 'ENERGY', 'OPA', 'ADVISORY'];
  const groups = {};
  ORDER.forEach(k => { groups[k] = { count: 0, value: 0, cost: 0 }; });

  // Primary row per project_no = highest-value row (receives all cost attribution)
  const primaryMap = {};
  allProjects.forEach(p => {
    const pno = p.project_no;
    if (!pno) return;
    const cur = primaryMap[pno];
    if (!cur || (Number(p.value) || 0) > (Number(cur.value) || 0)) primaryMap[pno] = p;
  });

  // Sum costs per project_no
  const costByPno = {};
  allCosts.forEach(c => {
    if (!c.project_no) return;
    costByPno[c.project_no] = (costByPno[c.project_no] || 0) + (Number(c.amount) || 0);
  });

  // Row count per category (matches project management module row count)
  allProjects.forEach(p => {
    const cat = classifyForPcm(p);
    if (cat) groups[cat].count++;
  });

  // Value & cost from primary rows only
  Object.values(primaryMap).forEach(p => {
    const cat = classifyForPcm(p);
    if (!cat) return;
    groups[cat].value += Number(p.value) || 0;
    groups[cat].cost  += costByPno[p.project_no] || 0;
  });

  let html = secHdr('PCM — COMPANY PERFORMANCE OVERVIEW');

  const rows = ORDER.map(k => {
    const g      = groups[k];
    const pl     = g.value - g.cost;
    const margin = g.value > 0 ? ((pl / g.value) * 100).toFixed(1) : '0.0';
    const plCol  = pl < 0 ? '#5c5c5c' : '#6a6a6a';
    const mCol   = pl < 0 ? '#5c5c5c' : Number(margin) <= 20 ? '#878787' : '#6a6a6a';
    return [
      `<strong>${esc(k)}</strong>`,
      String(g.count),
      rm(g.value),
      rm(g.cost),
      `<span style="color:${plCol};font-weight:700">${rm(pl)}</span>`,
      `<span style="color:${mCol};font-weight:700">${margin}%</span>`,
    ];
  });

  const totVal   = ORDER.reduce((s, k) => s + groups[k].value, 0);
  const totCost  = ORDER.reduce((s, k) => s + groups[k].cost,  0);
  const totPl    = totVal - totCost;
  const totM     = totVal > 0 ? ((totPl / totVal) * 100).toFixed(1) : '0.0';
  const totCount = ORDER.reduce((s, k) => s + groups[k].count, 0);
  rows.push([
    '<strong>TOTAL</strong>',
    `<strong>${totCount}</strong>`,
    `<strong>${rm(totVal)}</strong>`,
    `<strong>${rm(totCost)}</strong>`,
    `<strong style="color:${totPl < 0 ? '#5c5c5c' : '#6a6a6a'}">${rm(totPl)}</strong>`,
    `<strong>${totM}%</strong>`,
  ]);

  html += tbl(['Company', 'Rows', 'Contract Value', 'Accumulated Cost', 'P / L', 'Margin'], rows);
  return html;
}

// ─── Base HTML template ───────────────────────────────────────────────────────

const CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:10px; color:#181818; background:#ffffff; }
.hdr { background:#363636; padding:22px 32px 20px; display:flex; justify-content:space-between; align-items:flex-end; }
.hdr-l h1 { color:#ffffff; font-size:18px; font-weight:800; letter-spacing:0.3px; }
.hdr-l p  { color:#bcbcbc; font-size:9.5px; margin-top:5px; }
.hdr-r { color:#bcbcbc; font-size:9px; text-align:right; line-height:1.7; }
.body { padding:20px 32px 0; }
.cards { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
.card { border:1px solid #e7e7e7; border-top:3px solid #6a6a6a; border-radius:5px; padding:12px 14px; }
.card-val { color:#6a6a6a; font-size:17px; font-weight:800; }
.card-lbl { color:#727272; font-size:8.5px; margin-top:4px; }
.card-sub { color:#404040; font-size:9.5px; font-weight:600; margin-top:3px; }
.sec-hdr { background:#363636; color:#ffffff; padding:7px 12px; margin:16px 0 0; border-radius:3px;
           display:flex; justify-content:space-between; align-items:center; page-break-inside:avoid; }
.sec-hdr > span:first-child { font-size:10px; font-weight:700; letter-spacing:0.4px; }
.sec-hdr > span:last-child  { font-size:8.5px; font-weight:400; opacity:0.75; }
.sub-hdr { font-size:9px; font-weight:700; color:#363636; padding:9px 0 3px; }
.stat-box { background:#fafafa; border:1px solid #e7e7e7; border-radius:4px; padding:7px 10px; margin:6px 0 8px; }
.stat-line { font-size:8.5px; color:#404040; padding:2px 0; line-height:1.5; }
table { width:100%; border-collapse:collapse; margin:6px 0 10px; font-size:8.5px; }
th { background:#6a6a6a; color:#ffffff; font-weight:700; padding:6px 8px; text-align:left; white-space:nowrap; }
td { padding:5px 8px; color:#404040; border-bottom:1px solid #f4f4f4; vertical-align:top; }
.empty { color:#a2a2a2; font-size:8.5px; font-style:italic; padding:6px 4px 10px; }
.footer { text-align:center; color:#a2a2a2; font-size:7.5px; padding:18px 32px 16px; border-top:1px solid #e7e7e7; margin-top:20px; }
@media print { tr { page-break-inside:avoid; } }
`;

function buildHtml(reportTitle, leftSub, rightLines, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="hdr">
  <div class="hdr-l">
    <h1>COMPANY GROUP OF COMPANIES</h1>
    <p>${reportTitle}</p>
  </div>
  <div class="hdr-r">${rightLines}</div>
</div>
<div class="body">${body}</div>
<div class="footer">COMPANY Operations Portal &nbsp;·&nbsp; Auto-generated &nbsp;·&nbsp; ${new Date().toISOString()}</div>
</body></html>`;
}

// ─── Daily-specific compact CSS & template ────────────────────────────────────

const DAILY_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:8px; color:#181818; background:#ffffff; }
.hdr { background:#171717; padding:12px 22px; display:flex; justify-content:space-between; align-items:center; }
.hdr-l h1 { color:#ffffff; font-size:14px; font-weight:800; }
.hdr-l p  { color:#a1a1a1; font-size:7.5px; margin-top:2px; }
.hdr-r    { color:#a1a1a1; font-size:7px; text-align:right; line-height:1.8; }
.body     { padding:10px 22px 0; }
.cards    { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:10px; }
.card     { border:1px solid #e7e7e7; border-left:3px solid #6a6a6a; border-radius:4px; padding:7px 9px; }
.card-val { font-size:13px; font-weight:800; color:#171717; }
.card-val.warn { color:#878787; }
.card-lbl { color:#a1a1a1; font-size:6.5px; margin-top:2px; text-transform:uppercase; letter-spacing:0.4px; }
.card-sub { color:#535353; font-size:7px; font-weight:600; margin-top:2px; }
.two-col  { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-bottom:9px; }
.sec-hdr  { background:#171717; color:#ffffff; padding:5px 9px; border-radius:3px 3px 0 0;
            display:flex; justify-content:space-between; align-items:center; }
.sec-hdr > span:first-child { font-size:7.5px; font-weight:700; letter-spacing:0.3px; }
.sec-hdr > span.badge { font-size:6.5px; background:rgba(255, 255, 255,0.15); padding:1px 7px; border-radius:10px; }
.sub-hdr  { display:none; }
.stat-box { display:none; }
table  { width:100%; border-collapse:collapse; font-size:7px; border:1px solid #e7e7e7; border-top:none; }
th     { background:#fafafa; color:#727272; font-weight:700; padding:3px 7px; text-align:left;
         white-space:nowrap; font-size:6.5px; text-transform:uppercase; letter-spacing:0.3px;
         border-bottom:1px solid #e7e7e7; }
td     { padding:3px 7px; color:#404040; border-bottom:1px solid #fafafa; vertical-align:middle; }
tr:last-child td { border-bottom:none; }
tr:nth-child(even) td { background:#fafafa; }
.tag   { display:inline-block; padding:1px 5px; border-radius:3px; font-size:6px; font-weight:700;
         text-transform:uppercase; letter-spacing:0.2px; }
.tag-po    { background:#e8e8e8; color:#4f4f4f; }
.tag-cash  { background:#f4f4f4; color:#575757; }
.tag-staff { background:#eeeeee; color:#474747; }
.tag-leave { background:#f0f0f0; color:#585858; }
.ev-sub { color:#a1a1a1; font-style:italic; }
.ev-app { color:#6a6a6a; font-weight:700; }
.ev-rej { color:#5c5c5c; font-weight:700; }
.c-ok   { color:#6a6a6a; font-weight:700; }
.c-pend { color:#878787; font-weight:700; }
.c-rej  { color:#5c5c5c; font-weight:700; }
.c-sent { color:#626262; font-weight:700; }
td.empty { color:#a1a1a1; font-style:italic; text-align:center; padding:8px; }
.footer { text-align:center; color:#a1a1a1; font-size:6.5px; padding:8px 22px;
          border-top:1px solid #e7e7e7; margin-top:8px; }
@media print { * { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`;

function statusHtmlCompact(status) {
  const s = String(status || '');
  const cls = s === 'Approved' || s === 'APPROVED & SENT' ? 'c-ok'
            : s === 'Rejected'  ? 'c-rej'
            : s === 'Pending'   ? 'c-pend'
            : s === 'ONGOING'   ? 'c-ok'
            : s === 'DONE'      ? ''
            : '';
  return `<span class="${cls}">${esc(s)}</span>`;
}

function buildHtmlDaily(dateLabel, timeStr, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>${DAILY_CSS}</style></head><body>
<div class="hdr">
  <div class="hdr-l">
    <h1>COMPANY GROUP OF COMPANIES</h1>
    <p>Daily Activity Report</p>
  </div>
  <div class="hdr-r">${esc(dateLabel)}<br>Generated ${esc(timeStr)} MYT</div>
</div>
<div class="body">${body}</div>
<div class="footer">COMPANY Operations Portal &nbsp;&middot;&nbsp; Auto-generated &nbsp;&middot;&nbsp; ${new Date().toISOString()}</div>
</body></html>`;
}

// ─── Puppeteer PDF ────────────────────────────────────────────────────────────

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/opt/pw-browsers/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const p of candidates) {
    try { fs.accessSync(p, fs.constants.X_OK); return p; } catch {}
  }
  throw new Error('Chrome/Chromium not found. Set CHROME_PATH env var or install chromium.');
}

async function htmlToPdf(html, pdfPath) {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
    });
  } finally {
    await browser.close();
  }
}

// ─── DAILY REPORT ─────────────────────────────────────────────────────────────

async function buildDaily() {
  const today = todayMYT();
  console.log(`Daily report for ${today.label}`);

  const [
    todayPOs, todayCash, todayStaff, todayLeave,
    approvedStaff, rejectedStaff,
    approvedLeave, rejectedLeave,
    pendingPOs, pendingCash, pendingStaff, pendingLeave,
    staffList, pcmProjects, pcmCosts,
  ] = await Promise.all([
    sb('po_logs',     `created_at=gte.${today.start}&created_at=lte.${today.end}&select=po_number,company_name,supplier_name,total_amount,status&order=created_at.desc`),
    sb('cash_claims', `created_at=gte.${today.start}&created_at=lte.${today.end}&select=claim_number,claimant_name,total_amount,status&order=created_at.desc`),
    sb('staff_claims',`created_at=gte.${today.start}&created_at=lte.${today.end}&select=claim_number,staff_name,total_amount,status&order=created_at.desc`),
    sb('logs',        `created_at=gte.${today.start}&created_at=lte.${today.end}&select=staff_id,type,start_date,end_date,days,status&order=created_at.desc`),
    sb('staff_claims',`approved_at=gte.${today.start}&approved_at=lte.${today.end}&status=eq.Approved&select=claim_number,staff_name,total_amount,approved_by`),
    sb('staff_claims',`approved_at=gte.${today.start}&approved_at=lte.${today.end}&status=eq.Rejected&select=claim_number,staff_name,total_amount,approved_by`),
    sb('logs',        `approved_at=gte.${today.start}&approved_at=lte.${today.end}&status=eq.Approved&select=staff_id,type,start_date,end_date,days,approved_by`),
    sb('logs',        `approved_at=gte.${today.start}&approved_at=lte.${today.end}&status=eq.Rejected&select=staff_id,type,approved_by`),
    sb('po_logs',     'status=eq.Pending&select=po_number,company_name,supplier_name,total_amount,created_at&order=created_at.desc'),
    sb('cash_claims', 'status=eq.Pending&select=claim_number,claimant_name,total_amount,created_at&order=created_at.desc'),
    sb('staff_claims','status=eq.Pending&select=claim_number,staff_name,total_amount,created_at&order=created_at.desc'),
    sb('logs',        'status=eq.Pending&select=staff_id,type,start_date,end_date,days,created_at&order=created_at.desc'),
    sb('staff',       'select=id,name'),
    sb('project_logs','select=company_key,project_no,value&order=project_no.desc'),
    sb('project_costs','select=project_no,amount'),
  ]);

  const staffMap = {};
  staffList.forEach(s => { staffMap[s.id] = s.name; });

  const pendingLeaveDays = pendingLeave.reduce((s, x) => s + Number(x.days || 0), 0);
  const totalToday       = todayPOs.length + todayCash.length + todayStaff.length + todayLeave.length;
  const warnIf           = n => n > 0 ? ' warn' : '';
  const tag              = (cls, label) => `<span class="tag ${cls}">${label}</span>`;

  // ── Summary cards ──────────────────────────────────────────────────────────
  let body = `<div class="cards">
    <div class="card">
      <div class="card-val${warnIf(totalToday)}">${totalToday}</div>
      <div class="card-lbl">New Today</div>
      <div class="card-sub">PO ${todayPOs.length} &middot; Cash ${todayCash.length} &middot; Staff ${todayStaff.length} &middot; Leave ${todayLeave.length}</div>
    </div>
    <div class="card">
      <div class="card-val${warnIf(pendingPOs.length)}">${rm(sum(pendingPOs))}</div>
      <div class="card-lbl">Pending POs</div>
      <div class="card-sub">${pendingPOs.length} awaiting approval</div>
    </div>
    <div class="card">
      <div class="card-val${warnIf(pendingCash.length + pendingStaff.length)}">${rm(sum(pendingCash) + sum(pendingStaff))}</div>
      <div class="card-lbl">Pending Claims</div>
      <div class="card-sub">Cash ${pendingCash.length} &middot; Staff ${pendingStaff.length}</div>
    </div>
    <div class="card">
      <div class="card-val${warnIf(pendingLeave.length)}">${pendingLeaveDays} days</div>
      <div class="card-lbl">Leave Pending</div>
      <div class="card-sub">${pendingLeave.length} application${pendingLeave.length !== 1 ? 's' : ''}</div>
    </div>
  </div>`;

  // ── Today's activity: unified table ────────────────────────────────────────
  const actRows      = [];
  const submittedIds = new Set();

  todayPOs.forEach(p => {
    submittedIds.add(p.po_number);
    actRows.push([tag('tag-po','PO'), esc(p.po_number), esc(p.supplier_name), rm(p.total_amount), `<span class="ev-sub">submitted</span>`, statusHtmlCompact(p.status)]);
  });
  todayCash.forEach(c => {
    submittedIds.add(c.claim_number);
    actRows.push([tag('tag-cash','Cash'), esc(c.claim_number), esc(c.claimant_name), rm(c.total_amount), `<span class="ev-sub">submitted</span>`, statusHtmlCompact(c.status)]);
  });
  todayStaff.forEach(c => {
    submittedIds.add(c.claim_number);
    actRows.push([tag('tag-staff','Staff'), esc(c.claim_number), esc(c.staff_name), rm(c.total_amount), `<span class="ev-sub">submitted</span>`, statusHtmlCompact(c.status)]);
  });
  todayLeave.forEach(l => {
    const lid  = `lv_${l.staff_id}_${l.start_date}`;
    const name = esc(staffMap[l.staff_id] || String(l.staff_id));
    const dur  = l.start_date === l.end_date ? fmt(l.start_date) : `${fmt(l.start_date)}–${fmt(l.end_date)}`;
    submittedIds.add(lid);
    actRows.push([tag('tag-leave','Leave'), `${esc(l.type)} &middot; ${l.days}d`, `${name} (${dur})`, '—', `<span class="ev-sub">submitted</span>`, statusHtmlCompact(l.status)]);
  });

  approvedStaff.filter(c => !submittedIds.has(c.claim_number)).forEach(c =>
    actRows.push([tag('tag-staff','Staff'), esc(c.claim_number), esc(c.staff_name), rm(c.total_amount), `<span class="ev-app">approved</span>`, statusHtmlCompact('Approved')]));
  rejectedStaff.filter(c => !submittedIds.has(c.claim_number)).forEach(c =>
    actRows.push([tag('tag-staff','Staff'), esc(c.claim_number), esc(c.staff_name), rm(c.total_amount), `<span class="ev-rej">rejected</span>`, statusHtmlCompact('Rejected')]));
  approvedLeave.filter(l => !submittedIds.has(`lv_${l.staff_id}_${l.start_date}`)).forEach(l =>
    actRows.push([tag('tag-leave','Leave'), `${esc(l.type)} &middot; ${l.days}d`, esc(staffMap[l.staff_id] || String(l.staff_id)), '—', `<span class="ev-app">approved</span>`, statusHtmlCompact('Approved')]));
  rejectedLeave.filter(l => !submittedIds.has(`lv_${l.staff_id}_${l.start_date}`)).forEach(l =>
    actRows.push([tag('tag-leave','Leave'), esc(l.type), esc(staffMap[l.staff_id] || String(l.staff_id)), '—', `<span class="ev-rej">rejected</span>`, statusHtmlCompact('Rejected')]));

  const actHtml = actRows.length
    ? `<table><thead><tr><th>Type</th><th>Ref / Details</th><th>Name / Supplier</th><th>Amount</th><th>Event</th><th>Status</th></tr></thead>
       <tbody>${actRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : `<table><tbody><tr><td colspan="6" class="empty">No activity recorded today.</td></tr></tbody></table>`;

  // ── Pending queue: unified table ───────────────────────────────────────────
  const pendRows = [];
  pendingPOs.forEach(p    => pendRows.push([tag('tag-po','PO'),       esc(p.po_number),    esc(p.supplier_name),                        rm(p.total_amount), fmt(p.created_at)]));
  pendingCash.forEach(c   => pendRows.push([tag('tag-cash','Cash'),   esc(c.claim_number), esc(c.claimant_name),                        rm(c.total_amount), fmt(c.created_at)]));
  pendingStaff.forEach(c  => pendRows.push([tag('tag-staff','Staff'), esc(c.claim_number), esc(c.staff_name),                          rm(c.total_amount), fmt(c.created_at)]));
  pendingLeave.forEach(l  => pendRows.push([tag('tag-leave','Leave'), `${esc(l.type)} &middot; ${l.days}d`, esc(staffMap[l.staff_id] || String(l.staff_id)), '—',              fmt(l.created_at)]));

  const pendHtml = pendRows.length
    ? `<table><thead><tr><th>Type</th><th>Reference</th><th>Name / Supplier</th><th>Amount</th><th>Submitted</th></tr></thead>
       <tbody>${pendRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : `<table><tbody><tr><td colspan="5" class="empty">All clear — no pending items.</td></tr></tbody></table>`;

  // ── Two-column layout ──────────────────────────────────────────────────────
  body += `<div class="two-col">
    <div>
      <div class="sec-hdr"><span>TODAY'S ACTIVITY</span><span class="badge">${actRows.length}</span></div>
      ${actHtml}
    </div>
    <div>
      <div class="sec-hdr"><span>PENDING QUEUE</span><span class="badge">${pendRows.length}</span></div>
      ${pendHtml}
    </div>
  </div>`;

  // ── PCM snapshot (full-width) ──────────────────────────────────────────────
  body += `<div style="margin-top:0">${buildPcmSummary(pcmProjects, pcmCosts)}</div>`;

  const now     = new Date(new Date().getTime() + 8 * 3600000);
  const timeStr = now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
  const html    = buildHtmlDaily(today.label, timeStr, body);
  const pdfPath = `/tmp/company-daily-${today.short}.pdf`;
  await htmlToPdf(html, pdfPath);

  return {
    pdfPath,
    subject:  `COMPANY Daily Activity — ${today.label}`,
    filename: `company-daily-${today.short}.pdf`,
  };
}

// ─── MONTHLY REPORT ───────────────────────────────────────────────────────────

async function buildMonthly() {
  const m = prevMonthMYT();
  console.log(`Monthly report for ${m.label}`);

  const [
    pos, cash, staff, leave, pcm, vehicles, projects, staffList, allCosts,
  ] = await Promise.all([
    sb('po_logs',      `created_at=gte.${m.start}&created_at=lte.${m.end}&select=po_number,company_name,company_key,supplier_name,total_amount,status,created_at&order=created_at.desc`),
    sb('cash_claims',  `created_at=gte.${m.start}&created_at=lte.${m.end}&select=claim_number,claimant_name,total_amount,status,created_at&order=created_at.desc`),
    sb('staff_claims', `created_at=gte.${m.start}&created_at=lte.${m.end}&select=claim_number,staff_name,company_name,total_amount,status,created_at&order=created_at.desc`),
    sb('logs',         `created_at=gte.${m.start}&created_at=lte.${m.end}&select=staff_id,type,start_date,end_date,days,status&order=created_at.desc`),
    sb('project_costs',`created_at=gte.${m.start}&created_at=lte.${m.end}&select=company,project_no,description,amount,date&order=date.desc`),
    sb('vehicles',     'select=plate_number,car_model,road_tax_expiry,insurance_expiry,pic'),
    sb('project_logs', 'select=company_key,project_no,status,client_name,value&order=project_no.desc'),
    sb('staff',        'select=id,name'),
    sb('project_costs','select=project_no,amount'),
  ]);

  const staffMap = {};
  staffList.forEach(s => { staffMap[s.id] = s.name; });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);
  const vAlerts = [];
  vehicles.forEach(v => {
    [['road_tax_expiry','Road Tax'],['insurance_expiry','Insurance']].forEach(([f,l]) => {
      if (v[f] && new Date(v[f]) <= cutoff)
        vAlerts.push([esc(v.plate_number),esc(v.car_model),l,fmt(v[f]),esc(v.pic||'—')]);
    });
  });

  const poApproved = pos.filter(x=>x.status==='APPROVED & SENT');
  const totalLeaveDays = leave.filter(x=>x.status==='Approved').reduce((s,x)=>s+Number(x.days||0),0);
  const poByCo  = grp(pos, 'company_key');
  const pcmByCo = grp(pcm, 'company', 'amount');
  const ongoing = projects.filter(p=>p.status==='ONGOING');
  const pending2= projects.filter(p=>p.status==='PENDING');
  const done    = projects.filter(p=>p.status==='DONE');

  let body = '';

  body += summaryCards(
    { label:'Purchase Orders',     value: rm(sum(pos)),            sub: `${pos.length} total  ·  ${poApproved.length} approved & sent` },
    { label:'Claims (Cash+Staff)', value: rm(sum(cash)+sum(staff)), sub: `Cash: ${cash.length}  Staff: ${staff.length}` },
    { label:'Leave Approved',      value: `${totalLeaveDays} days`, sub: `${cnt(leave,'Approved')} of ${leave.length} applications` },
    { label:'PCM Costs',           value: rm(sum(pcm,'amount')),    sub: `${pcm.length} entries` },
  );

  // Executive summary
  body += secHdr('EXECUTIVE SUMMARY');
  body += statBox(
    `Purchase Orders: ${pos.length} total  |  ${poApproved.length} approved &amp; sent  (${rm(sum(poApproved))})  |  ${cnt(pos,'Pending')} pending  |  ${cnt(pos,'Rejected')} rejected`,
    `Cash Claims: ${cash.length} total  |  ${cnt(cash,'Approved')} approved  (${rm(sum(cash.filter(x=>x.status==='Approved')))})  |  ${cnt(cash,'Pending')} pending  |  ${cnt(cash,'Rejected')} rejected`,
    `Staff Claims: ${staff.length} total  |  ${cnt(staff,'Approved')} approved  (${rm(sum(staff.filter(x=>x.status==='Approved')))})  |  ${cnt(staff,'Pending')} pending`,
    `Leave: ${leave.length} applications  |  ${totalLeaveDays} days approved`,
    `PCM Costs: ${pcm.length} entries  |  ${rm(sum(pcm,'amount'))} total  ·  SOLUTIONS: ${rm(pcmByCo['SOLUTIONS']||0)}  OPTIMIZATION: ${rm(pcmByCo['OPTIMIZATION']||0)}  ENERGY: ${rm(pcmByCo['ENERGY']||0)}`,
    `Projects: ${projects.length} total  ·  ONGOING: ${ongoing.length}   PENDING: ${pending2.length}   DONE: ${done.length}`,
  );

  // Purchase orders
  body += secHdr('PURCHASE ORDERS', pos.length);
  body += statBox(
    `By company:  SOLUTIONS ${rm(poByCo['SOLUTIONS']||0)}   OPTIMIZATION ${rm(poByCo['OPTIMIZATION']||0)}   ENERGY ${rm(poByCo['ENERGY']||0)}`,
  );
  if (!pos.length) body += empty('No POs this month.');
  else body += tbl(['PO Number','Supplier','Company','Amount','Status','Date'],
    pos.map(p=>[esc(p.po_number),esc(p.supplier_name),esc(p.company_name),rm(p.total_amount),statusHtml(p.status),fmt(p.created_at)]));

  // Cash claims
  body += secHdr('CASH CLAIMS', cash.length);
  if (!cash.length) body += empty('No cash claims this month.');
  else body += tbl(['Claim Number','Claimant','Amount','Status','Date'],
    cash.map(c=>[esc(c.claim_number),esc(c.claimant_name),rm(c.total_amount),statusHtml(c.status),fmt(c.created_at)]));

  // Staff claims
  body += secHdr('STAFF CLAIMS', staff.length);
  if (!staff.length) body += empty('No staff claims this month.');
  else body += tbl(['Claim Number','Staff','Company','Amount','Status','Date'],
    staff.map(c=>[esc(c.claim_number),esc(c.staff_name),esc(c.company_name),rm(c.total_amount),statusHtml(c.status),fmt(c.created_at)]));

  // Leave
  body += secHdr('LEAVE APPLICATIONS', leave.length);
  const byType = {};
  leave.filter(x=>x.status==='Approved').forEach(x=>{ byType[x.type]=(byType[x.type]||0)+Number(x.days||0); });
  if (Object.keys(byType).length)
    body += statBox(`Approved by type:  ${Object.entries(byType).map(([k,v])=>`${k}: ${v} days`).join('   ')}`);
  if (!leave.length) body += empty('No leave applications this month.');
  else body += tbl(['Staff','Type','From','To','Days','Status'],
    leave.map(l=>[esc(staffMap[l.staff_id]||l.staff_id),esc(l.type),fmt(l.start_date),fmt(l.end_date),l.days,statusHtml(l.status)]));

  // PCM
  body += secHdr('PROJECT COSTS (PCM)', pcm.length);
  if (!pcm.length) body += empty('No PCM entries this month.');
  else body += tbl(['Company','Project','Description','Amount','Date'],
    pcm.map(c=>[esc(c.company),esc(c.project_no),esc(c.description),rm(c.amount),fmt(c.date)]));

  // PCM portfolio summary (all-time)
  body += buildPcmSummary(projects, allCosts);

  // Vehicle alerts
  body += secHdr('VEHICLE ALERTS — Expiring within 60 days', vAlerts.length);
  if (!vAlerts.length) body += empty('All clear — no documents expiring in the next 60 days.');
  else body += tbl(['Plate','Model','Document','Expiry','PIC'], vAlerts);

  // Projects
  body += secHdr('PROJECTS OVERVIEW', projects.length);
  body += statBox(`ONGOING: ${ongoing.length}   PENDING: ${pending2.length}   DONE: ${done.length}   Total: ${projects.length}`);
  if (ongoing.length) {
    body += subHdr('Active Projects (ONGOING):');
    body += tbl(['Project No','Client','Company','Value'],
      ongoing.map(p=>[esc(p.project_no),esc(p.client_name),esc(p.company_key),rm(p.value)]));
  }

  const html = buildHtml(
    `Monthly Summary Report — ${m.label}`,
    m.label,
    `Period: ${m.label}<br>Sent on 1st of month`,
    body
  );
  const pdfPath = `/tmp/company-monthly-${m.short}.pdf`;
  await htmlToPdf(html, pdfPath);

  return {
    pdfPath,
    subject: `COMPANY Monthly Report — ${m.label}`,
    filename: `company-monthly-${m.short}.pdf`,
  };
}

// ─── BACKUP REPORT ────────────────────────────────────────────────────────────

async function buildBackup() {
  const now   = new Date(new Date().getTime() + 8*3600000);
  const label = now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const short = now.toISOString().slice(0,10);
  console.log(`Backup report as of ${label}`);

  const [
    pos, cash, staff, leave, projects, pcm, customers, vehicles, staffList, receipts,
  ] = await Promise.all([
    sb('po_logs',      'select=po_number,company_name,supplier_name,total_amount,status,created_at&order=created_at.desc'),
    sb('cash_claims',  'select=claim_number,claimant_name,total_amount,status,created_at&order=created_at.desc'),
    sb('staff_claims', 'select=claim_number,staff_name,company_name,total_amount,status,created_at&order=created_at.desc'),
    sb('logs',         'select=staff_id,type,start_date,end_date,days,status,created_at&order=created_at.desc'),
    sb('project_logs', 'select=company_key,project_no,status,client_name,value&order=project_no.desc'),
    sb('project_costs','select=company,project_no,description,amount,date&order=date.desc'),
    sb('customers',    'select=company_name,pic,email_address,hp,created_at&order=created_at.desc'),
    sb('vehicles',     'select=plate_number,car_model,road_tax_expiry,insurance_expiry,pic'),
    sb('staff',        'select=id,name,email,join_date&order=name.asc'),
    sb('receipt_logs', 'select=receipt_no,customer_name,email_address,issuer,status,sent_at&order=sent_at.desc'),
  ]);

  const staffMap = {};
  staffList.forEach(s => { staffMap[s.id] = s.name; });

  let body = '';

  body += summaryCards(
    { label:'Purchase Orders',  value: String(pos.length),     sub: `Cash: ${cash.length}  Staff: ${staff.length}  Leave: ${leave.length}` },
    { label:'Projects & Costs', value: String(projects.length), sub: `${pcm.length} PCM cost entries` },
    { label:'Customers',        value: String(customers.length),sub: `${receipts.length} receipts sent` },
    { label:'Staff & Vehicles', value: String(staffList.length),sub: `${vehicles.length} vehicles` },
  );

  body += secHdr('BACKUP SUMMARY');
  body += statBox(
    `Purchase Orders: ${pos.length}  |  Cash Claims: ${cash.length}  |  Staff Claims: ${staff.length}  |  Leave Applications: ${leave.length}`,
    `Projects: ${projects.length}  |  PCM Cost Entries: ${pcm.length}  |  Customers: ${customers.length}  |  Receipts Sent: ${receipts.length}`,
    `Staff: ${staffList.length}  |  Vehicles: ${vehicles.length}`,
  );

  body += secHdr('ALL PURCHASE ORDERS', pos.length);
  if (!pos.length) body += empty('No records.');
  else body += tbl(['PO Number','Supplier','Company','Amount','Status','Date'],
    pos.map(p=>[esc(p.po_number),esc(p.supplier_name),esc(p.company_name),rm(p.total_amount),statusHtml(p.status),fmt(p.created_at)]));

  body += secHdr('ALL CASH CLAIMS', cash.length);
  if (!cash.length) body += empty('No records.');
  else body += tbl(['Claim Number','Claimant','Amount','Status','Date'],
    cash.map(c=>[esc(c.claim_number),esc(c.claimant_name),rm(c.total_amount),statusHtml(c.status),fmt(c.created_at)]));

  body += secHdr('ALL STAFF CLAIMS', staff.length);
  if (!staff.length) body += empty('No records.');
  else body += tbl(['Claim Number','Staff','Company','Amount','Status','Date'],
    staff.map(c=>[esc(c.claim_number),esc(c.staff_name),esc(c.company_name),rm(c.total_amount),statusHtml(c.status),fmt(c.created_at)]));

  body += secHdr('ALL LEAVE APPLICATIONS', leave.length);
  if (!leave.length) body += empty('No records.');
  else body += tbl(['Staff','Type','From','To','Days','Status','Submitted'],
    leave.map(l=>[esc(staffMap[l.staff_id]||l.staff_id),esc(l.type),fmt(l.start_date),fmt(l.end_date),l.days,statusHtml(l.status),fmt(l.created_at)]));

  body += secHdr('ALL PROJECTS', projects.length);
  if (!projects.length) body += empty('No records.');
  else body += tbl(['Project No','Client','Company','Value','Status'],
    projects.map(p=>[esc(p.project_no),esc(p.client_name),esc(p.company_key),rm(p.value),statusHtml(p.status)]));

  body += secHdr('ALL PCM COST ENTRIES', pcm.length);
  if (!pcm.length) body += empty('No records.');
  else body += tbl(['Company','Project','Description','Amount','Date'],
    pcm.map(c=>[esc(c.company),esc(c.project_no),esc(c.description),rm(c.amount),fmt(c.date)]));

  body += buildPcmSummary(projects, pcm);

  body += secHdr('ALL CUSTOMERS', customers.length);
  if (!customers.length) body += empty('No records.');
  else body += tbl(['Company','PIC','Email','Phone','Added'],
    customers.map(c=>[esc(c.company_name),esc(c.pic),esc(c.email_address),esc(c.hp),fmt(c.created_at)]));

  body += secHdr('ALL RECEIPTS SENT', receipts.length);
  if (!receipts.length) body += empty('No records.');
  else body += tbl(['Receipt No','Customer','Email','Issuer','Status','Date'],
    receipts.map(r=>[esc(r.receipt_no),esc(r.customer_name),esc(r.email_address),esc(r.issuer),statusHtml(r.status),fmt(r.sent_at)]));

  body += secHdr('ALL VEHICLES', vehicles.length);
  if (!vehicles.length) body += empty('No records.');
  else body += tbl(['Plate','Model','Road Tax Expiry','Insurance Expiry','PIC'],
    vehicles.map(v=>[esc(v.plate_number),esc(v.car_model),fmt(v.road_tax_expiry),fmt(v.insurance_expiry),esc(v.pic)]));

  body += secHdr('ALL STAFF', staffList.length);
  if (!staffList.length) body += empty('No records.');
  else body += tbl(['Name','Email','Join Date'],
    staffList.map(s=>[esc(s.name),esc(s.email),fmt(s.join_date)]));

  const html = buildHtml(
    'Full Data Backup',
    label,
    `As of ${label}<br>Generated on demand`,
    body
  );
  const pdfPath = `/tmp/company-backup-${short}.pdf`;
  await htmlToPdf(html, pdfPath);

  return {
    pdfPath,
    subject: `COMPANY Full Backup — ${label}`,
    filename: `company-backup-${short}.pdf`,
  };
}

// ─── Send via Resend (direct — not behind Cloudflare, works from CI) ──────────

async function send({ pdfPath, subject, filename }) {
  const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
  const sizeKB    = (fs.statSync(pdfPath).size / 1024).toFixed(1);
  console.log(`PDF ready: ${filename}  (${sizeKB} KB)`);

  const typeLabel = TYPE === 'daily' ? 'daily activity report'
    : TYPE === 'monthly' ? 'monthly summary report' : 'full data backup';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'COMPANY Reports <onboarding@resend.dev>',
      to: TO_EMAIL,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:500px;color:#181818">
          <div style="background:#363636;padding:22px 28px;border-radius:8px 8px 0 0">
            <h2 style="margin:0;color:#ffffff;font-size:17px">COMPANY GROUP OF COMPANIES</h2>
            <p style="margin:6px 0 0;color:#bcbcbc;font-size:12px">${subject}</p>
          </div>
          <div style="padding:22px 28px;border:1px solid #e7e7e7;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 10px">Please find your ${typeLabel} attached.</p>
            <p style="margin:0;color:#727272;font-size:11px">
              Sent to ${TO_EMAIL}<br>Generated automatically by COMPANY Portal Agent
            </p>
          </div>
        </div>`,
      attachments: [{ filename, content: pdfBase64 }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err}`);
  }

  const result = await res.json();
  console.log(`Sent! Resend ID: ${result.id}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Report type: ${TYPE}`);
  let report;
  if (TYPE === 'daily')        report = await buildDaily();
  else if (TYPE === 'monthly') report = await buildMonthly();
  else if (TYPE === 'backup')  report = await buildBackup();
  else throw new Error(`Unknown report type: ${TYPE}. Use daily | monthly | backup`);
  await send(report);
}

main().catch(err => { console.error(err); process.exit(1); });
