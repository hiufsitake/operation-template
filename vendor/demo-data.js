/* ============================================================
   DEMO MODE — hard-coded sample data
   ------------------------------------------------------------
   This template has no real backend. This file replaces the
   Supabase client with an in-memory fake that serves the sample
   records below, so every module renders populated tables and
   all the buttons/tabs work without a database.

   Writes (insert/update/delete) mutate this in-memory copy only,
   so changes appear immediately but reset on page reload.

   TO GO LIVE: delete this file, remove the <script> tag that
   loads it from each page, and fill in real Supabase creds.
   ============================================================ */
(function () {
  'use strict';

  var TODAY = new Date();
  function d(offsetDays) {
    var x = new Date(TODAY.getTime() + offsetDays * 86400000);
    return x.toISOString().split('T')[0];
  }
  function ts(offsetDays) {
    return new Date(TODAY.getTime() + offsetDays * 86400000).toISOString();
  }

  var DB = {
    staff: [
      { id: 1, name: 'Alex Tan',      email: 'alex.tan@example.com',   join_date: '2021-03-15', class: 'Management' },
      { id: 2, name: 'Priya Nair',    email: 'priya.nair@example.com', join_date: '2022-07-01', class: 'Engineering' },
      { id: 3, name: 'Marcus Lee',    email: 'marcus.lee@example.com', join_date: '2023-01-09', class: 'Engineering' },
      { id: 4, name: 'Siti Rahman',   email: 'siti.rahman@example.com',join_date: '2023-06-20', class: 'Admin' },
      { id: 5, name: 'Daniel Wong',   email: 'daniel.wong@example.com',join_date: '2024-02-05', class: 'Operations' },
      { id: 6, name: 'Demo Admin',    email: 'admin1@example.com',     join_date: '2020-01-02', class: 'Management' }
    ],

    suppliers: [
      { id: 1, company_name: 'Apex Industrial Supplies Sdn. Bhd.', address: '12 Jalan Perindustrian 3, 40150 Shah Alam, Selangor', hp: '03-5521 8890', email_address: 'sales@apexindustrial.example.com', remark: 'Preferred vendor — 30 day terms' },
      { id: 2, company_name: 'Northgate Electrical Trading',        address: '88 Lorong Bakti, 11900 Bayan Lepas, Penang',        hp: '04-6412 3300', email_address: 'orders@northgate.example.com',      remark: 'Cabling & switchgear' },
      { id: 3, company_name: 'BlueRiver Safety Equipment',          address: '5 Jalan Utama, 81300 Skudai, Johor',                hp: '07-5580 1122', email_address: 'enquiry@blueriver.example.com',     remark: 'PPE and site safety' },
      { id: 4, company_name: 'Summit Office Solutions',             address: 'Unit 7-2, Menara Summit, 50450 Kuala Lumpur',       hp: '03-2166 7788', email_address: 'hello@summitoffice.example.com',    remark: 'Stationery & IT peripherals' },
      { id: 5, company_name: 'Greenfield Civil Works',              address: 'Lot 220, Jalan Kilang, 93450 Kuching, Sarawak',     hp: '082-338 900',  email_address: 'admin@greenfield.example.com',      remark: 'Civil & groundworks subcontractor' }
    ],

    customers: [
      { id: 1, company_name: 'Harbour Point Development Bhd.', address: 'Level 18, Harbour Tower, 50088 Kuala Lumpur',   pic: 'Ms. Chan Wei Ling', hp: '012-334 5566', email_address: 'weiling@harbourpoint.example.com', remark: 'Main contractor — Phase 2' },
      { id: 2, company_name: 'Sterling Manufacturing Sdn. Bhd.', address: 'PLO 55, Kawasan Perindustrian, 81700 Pasir Gudang', pic: 'Mr. Rajesh Kumar', hp: '019-772 8811', email_address: 'rajesh@sterlingmfg.example.com', remark: 'Annual maintenance contract' },
      { id: 3, company_name: 'Lakeside Hospitality Group',      address: '3 Persiaran Tasik, 63000 Cyberjaya, Selangor',  pic: 'Ms. Nurul Aina',    hp: '011-2233 4455', email_address: 'nurul@lakesidehg.example.com',    remark: 'Resort refurbishment' },
      { id: 4, company_name: 'Vanguard Logistics Sdn. Bhd.',    address: 'Warehouse 4, Free Trade Zone, 47100 Puchong',   pic: 'Mr. Tan Boon Huat', hp: '016-889 2200', email_address: 'boonhuat@vanguardlog.example.com', remark: 'Warehouse electrical upgrade' },
      { id: 5, company_name: 'Meridian Property Holdings',      address: '22 Jalan Bukit Bintang, 55100 Kuala Lumpur',    pic: 'Ms. Farah Idris',   hp: '013-445 9900', email_address: 'farah@meridianprop.example.com',  remark: 'Retail lot fit-out' }
    ],

    po_logs: [
      { id: 1, po_number: 'PO-' + d(-12).replace(/-/g, '') + '-01', po_date: d(-12), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', supplier_name: 'Apex Industrial Supplies Sdn. Bhd.', supplier_address: '12 Jalan Perindustrian 3, 40150 Shah Alam, Selangor', project_no: 'S2401', total_amount: 12720.00, status: 'Approved', created_by: 'Priya Nair', creator_email: 'priya.nair@example.com', approved_by: 'Alex Tan', created_at: ts(-12),
        items: [ { desc: 'Stainless steel pipe, 50mm dia.', qty: 40, unit: 'm',   price: 180, sst: 6 }, { desc: 'Pipe support bracket (galvanised)', qty: 60, unit: 'pcs', price: 45,  sst: 6 } ] },
      { id: 2, po_number: 'PO-' + d(-8).replace(/-/g, '') + '-01', po_date: d(-8), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', supplier_name: 'Northgate Electrical Trading', supplier_address: '88 Lorong Bakti, 11900 Bayan Lepas, Penang', project_no: 'S2402', total_amount: 8586.00, status: 'Pending', created_by: 'Marcus Lee', creator_email: 'marcus.lee@example.com', approved_by: null, created_at: ts(-8),
        items: [ { desc: 'XLPE armoured cable 4C x 25mm²', qty: 120, unit: 'm',  price: 62, sst: 6 }, { desc: 'MCCB 100A 3-pole', qty: 6, unit: 'pcs', price: 190, sst: 6 } ] },
      { id: 3, po_number: 'PO-' + d(-5).replace(/-/g, '') + '-01', po_date: d(-5), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', supplier_name: 'BlueRiver Safety Equipment', supplier_address: '5 Jalan Utama, 81300 Skudai, Johor', project_no: 'S2401', total_amount: 3392.00, status: 'Pending', created_by: 'Siti Rahman', creator_email: 'siti.rahman@example.com', approved_by: null, created_at: ts(-5),
        items: [ { desc: 'Safety helmet with chin strap', qty: 40, unit: 'pcs', price: 38, sst: 6 }, { desc: 'Full body harness, double lanyard', qty: 8, unit: 'pcs', price: 210, sst: 6 } ] },
      { id: 4, po_number: 'PO-' + d(-3).replace(/-/g, '') + '-01', po_date: d(-3), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', supplier_name: 'Summit Office Solutions', supplier_address: 'Unit 7-2, Menara Summit, 50450 Kuala Lumpur', project_no: 'S2403', total_amount: 2586.20, status: 'Rejected', created_by: 'Daniel Wong', creator_email: 'daniel.wong@example.com', approved_by: 'Alex Tan', created_at: ts(-3),
        items: [ { desc: 'Laser printer (mono, network)', qty: 2, unit: 'pcs', price: 1090, sst: 6 }, { desc: 'A4 copier paper, 80gsm', qty: 10, unit: 'ream', price: 14, sst: 6 } ] },
      { id: 5, po_number: 'PO-' + d(-1).replace(/-/g, '') + '-01', po_date: d(-1), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', supplier_name: 'Greenfield Civil Works', supplier_address: 'Lot 220, Jalan Kilang, 93450 Kuching, Sarawak', project_no: 'S2404', total_amount: 26500.00, status: 'Pending', created_by: 'Priya Nair', creator_email: 'priya.nair@example.com', approved_by: null, created_at: ts(-1),
        items: [ { desc: 'Site clearing and levelling works', qty: 1, unit: 'lot', price: 18000, sst: 0 }, { desc: 'Reinforced concrete apron, 150mm', qty: 85, unit: 'm²', price: 100, sst: 0 } ] }
    ],

    cash_claims: [
      { id: 1, claim_number: 'CC-' + d(-10).replace(/-/g, '') + '-01', submission_date: d(-10), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', claimant_name: 'Marcus Lee', claimant_nric: '900101-14-5501', claimant_phone: '012-345 6789', claimant_email: 'marcus.lee@example.com', payable_name: 'Marcus Lee', bank_details: 'Demo Bank — 1234 5678 9012', project: 'S2401 — Harbour Point Phase 2', total_amount: 640.00, status: 'Approved', created_at: ts(-10),
        items: [ { desc: 'Site travel — toll and fuel', qty: 1, price: 240 }, { desc: 'Accommodation (2 nights)', qty: 1, price: 400 } ] },
      { id: 2, claim_number: 'CC-' + d(-6).replace(/-/g, '') + '-01', submission_date: d(-6), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', claimant_name: 'Siti Rahman', claimant_nric: '930512-10-5522', claimant_phone: '019-887 6655', claimant_email: 'siti.rahman@example.com', payable_name: 'Siti Rahman', bank_details: 'Demo Bank — 2345 6789 0123', project: 'Office — General Admin', total_amount: 385.50, status: 'Pending', created_at: ts(-6),
        items: [ { desc: 'Office pantry supplies', qty: 1, price: 185.5 }, { desc: 'Courier charges (Sept)', qty: 1, price: 200 } ] },
      { id: 3, claim_number: 'CC-' + d(-2).replace(/-/g, '') + '-01', submission_date: d(-2), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', claimant_name: 'Daniel Wong', claimant_nric: '950220-08-5533', claimant_phone: '016-223 4455', claimant_email: 'daniel.wong@example.com', payable_name: 'Daniel Wong', bank_details: 'Demo Bank — 3456 7890 1234', project: 'S2404 — Vanguard Warehouse', total_amount: 1120.00, status: 'Pending', created_at: ts(-2),
        items: [ { desc: 'Equipment rental — scissor lift (3 days)', qty: 3, price: 320 }, { desc: 'Consumables — drill bits, anchors', qty: 1, price: 160 } ] }
    ],

    staff_claims: [
      { id: 1, claim_number: 'SC-' + d(-9).replace(/-/g, '') + '-01', submission_date: d(-9), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', staff_name: 'Priya Nair', staff_email: 'priya.nair@example.com', total_amount: 452.30, status: 'Approved', created_at: ts(-9),
        items: [ { desc: 'Client lunch meeting — Harbour Point', qty: 1, price: 182.3 }, { desc: 'Parking and tolls', qty: 1, price: 70 }, { desc: 'Printing — tender documents', qty: 1, price: 200 } ] },
      { id: 2, claim_number: 'SC-' + d(-4).replace(/-/g, '') + '-01', submission_date: d(-4), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', staff_name: 'Marcus Lee', staff_email: 'marcus.lee@example.com', total_amount: 268.00, status: 'Pending', created_at: ts(-4),
        items: [ { desc: 'Mileage — site visit (160 km)', qty: 160, price: 1.2 }, { desc: 'Meal allowance', qty: 2, price: 38 } ] },
      { id: 3, claim_number: 'SC-' + d(-1).replace(/-/g, '') + '-01', submission_date: d(-1), company_key: 'SOLUTIONS', company_name: '<Company Name> Sdn. Bhd.', staff_name: 'Daniel Wong', staff_email: 'daniel.wong@example.com', total_amount: 95.00, status: 'Pending', created_at: ts(-1),
        items: [ { desc: 'Taxi — airport transfer', qty: 1, price: 95 } ] }
    ],

    logs: [
      { id: 1, staff_id: 2, type: 'Annual',    start_date: d(-20), end_date: d(-18), days: 3,   status: 'Approved', remark: 'Family trip',            half_type: null,      created_at: ts(-25), approved_at: ts(-24) },
      { id: 2, staff_id: 3, type: 'Medical',   start_date: d(-7),  end_date: d(-7),  days: 1,   status: 'Approved', remark: 'Clinic visit — MC attached', half_type: null,  created_at: ts(-7),  approved_at: ts(-7) },
      { id: 3, staff_id: 4, type: 'Annual',    start_date: d(3),   end_date: d(5),   days: 3,   status: 'Pending',  remark: 'Wedding leave',          half_type: null,      created_at: ts(-2),  approved_at: null },
      { id: 4, staff_id: 5, type: 'Emergency', start_date: d(-1),  end_date: d(-1),  days: 0.5, status: 'Pending',  remark: 'Family matter',          half_type: 'Morning', created_at: ts(-1),  approved_at: null },
      { id: 5, staff_id: 2, type: 'Annual',    start_date: d(10),  end_date: d(12),  days: 3,   status: 'Pending',  remark: 'Year-end break',         half_type: null,      created_at: ts(0),   approved_at: null }
    ],

    project_logs: [
      { id: 1, year: 2026, project_no: 'S2401', client_name: 'Harbour Point Development Bhd.', description: 'Mechanical & electrical installation — Phase 2 tower', value: 485000, status: 'Ongoing',  invoice_status: 'Partial',  payment_status: 'Partial',  company_key: 'SOLUTIONS', remark: 'Phase 2 of 3 — on schedule', has_po: true,  opa_progress: null, land_title: null, site_survey: null },
      { id: 2, year: 2026, project_no: 'S2402', client_name: 'Sterling Manufacturing Sdn. Bhd.', description: 'Annual preventive maintenance — plant switchgear', value: 128000, status: 'Ongoing',  invoice_status: 'Not Issued', payment_status: 'Unpaid', company_key: 'SOLUTIONS', remark: 'Quarterly service cycle', has_po: true,  opa_progress: null, land_title: null, site_survey: null },
      { id: 3, year: 2026, project_no: 'S2403', client_name: 'Lakeside Hospitality Group', description: 'Resort block refurbishment — lighting and power', value: 262500, status: 'Pending',  invoice_status: 'Not Issued', payment_status: 'Unpaid', company_key: 'SOLUTIONS', remark: 'Awaiting client LOA', has_po: false, opa_progress: null, land_title: null, site_survey: null },
      { id: 4, year: 2025, project_no: 'S2404', client_name: 'Vanguard Logistics Sdn. Bhd.', description: 'Warehouse electrical upgrade and LED retrofit', value: 96800,  status: 'Done',     invoice_status: 'Issued',  payment_status: 'Paid',   company_key: 'SOLUTIONS', remark: 'Completed and handed over', has_po: true, opa_progress: null, land_title: null, site_survey: null },
      { id: 5, year: 2025, project_no: 'S2405', client_name: 'Meridian Property Holdings', description: 'Retail lot fit-out — Bukit Bintang', value: 154200, status: 'Done',     invoice_status: 'Issued',  payment_status: 'Paid',   company_key: 'SOLUTIONS', remark: 'Retention released', has_po: true,  opa_progress: null, land_title: null, site_survey: null }
    ],

    project_costs: [
      { id: 1, project_no: 'S2401', date: d(-11), description: 'Pipework materials', supplier: 'Apex Industrial Supplies Sdn. Bhd.', amount: 12720, pv_number: 'PV-2401-01', company: 'SOLUTIONS' },
      { id: 2, project_no: 'S2401', date: d(-6),  description: 'Site safety equipment', supplier: 'BlueRiver Safety Equipment',      amount: 3392,  pv_number: 'PV-2401-02', company: 'SOLUTIONS' },
      { id: 3, project_no: 'S2402', date: d(-7),  description: 'Cabling and breakers',  supplier: 'Northgate Electrical Trading',    amount: 8586,  pv_number: 'PV-2402-01', company: 'SOLUTIONS' },
      { id: 4, project_no: 'S2404', date: d(-2),  description: 'Civil groundworks',     supplier: 'Greenfield Civil Works',          amount: 26500, pv_number: 'PV-2404-01', company: 'SOLUTIONS' },
      { id: 5, project_no: 'S2403', date: d(-3),  description: 'Office equipment',      supplier: 'Summit Office Solutions',         amount: 2586,  pv_number: 'PV-2403-01', company: 'SOLUTIONS' }
    ],

    vehicles: [
      { id: 1, plate_number: 'ABC 1234', car_model: 'Toyota Hilux 2.4G',     date_purchased: '2022-04-12', road_tax_expiry: d(35),  road_tax_cost: 380,  insurance_expiry: d(35),  insurance_company: 'Demo Insurance Bhd.',  insurance_cost: 2450, ncd: '55%', pic: 'Marcus Lee',  pic_email: 'marcus.lee@example.com',  remark: 'Site pickup — Northern region', voc_url: null, last_reminder_date: null },
      { id: 2, plate_number: 'DEF 5678', car_model: 'Isuzu D-Max 1.9',       date_purchased: '2021-09-30', road_tax_expiry: d(-5),  road_tax_cost: 380,  insurance_expiry: d(-5),  insurance_company: 'Demo Insurance Bhd.',  insurance_cost: 2280, ncd: '45%', pic: 'Daniel Wong', pic_email: 'daniel.wong@example.com', remark: 'EXPIRED — renewal in progress', voc_url: null, last_reminder_date: null },
      { id: 3, plate_number: 'GHI 9012', car_model: 'Perodua Alza 1.5',      date_purchased: '2023-02-18', road_tax_expiry: d(120), road_tax_cost: 90,   insurance_expiry: d(120), insurance_company: 'Sample Assurance',      insurance_cost: 1180, ncd: '25%', pic: 'Siti Rahman', pic_email: 'siti.rahman@example.com', remark: 'Office runabout',              voc_url: null, last_reminder_date: null },
      { id: 4, plate_number: 'JKL 3456', car_model: 'Ford Ranger XLT 2.0',   date_purchased: '2020-11-05', road_tax_expiry: d(18),  road_tax_cost: 420,  insurance_expiry: d(18),  insurance_company: 'Demo Insurance Bhd.',  insurance_cost: 2680, ncd: '55%', pic: 'Priya Nair',  pic_email: 'priya.nair@example.com',  remark: 'Due soon — arrange renewal',   voc_url: null, last_reminder_date: null }
    ],

    receipt_logs: [
      { id: 1, issuer: '<Company Name> Sdn. Bhd.', receipt_no: 'RCP-00181', customer_name: 'Harbour Point Development Bhd.', email_address: 'weiling@harbourpoint.example.com', status: 'Sent', sent_at: ts(-9) },
      { id: 2, issuer: '<Company Name> Sdn. Bhd.', receipt_no: 'RCP-00182', customer_name: 'Sterling Manufacturing Sdn. Bhd.', email_address: 'rajesh@sterlingmfg.example.com',  status: 'Sent', sent_at: ts(-6) },
      { id: 3, issuer: '<Company Name> Sdn. Bhd.', receipt_no: 'RCP-00183', customer_name: 'Vanguard Logistics Sdn. Bhd.',   email_address: 'boonhuat@vanguardlog.example.com', status: 'Sent', sent_at: ts(-2) }
    ],

    pending_users: [
      { id: 1, email: 'newhire@example.com', name: 'newhire', status: 'Pending', created_at: ts(-1) }
    ],

    settings: [
      { id: 1, key: 'annual_leave_default', value: '14' }
    ]
  };

  var nextId = 1000;
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function applyOrder(rows, col, opts) {
    var asc = !(opts && opts.ascending === false);
    return rows.sort(function (a, b) {
      var x = a[col], y = b[col];
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x > y ? 1 : -1) * (asc ? 1 : -1);
    });
  }

  // Chainable, awaitable query builder over the in-memory tables.
  function from(table) {
    var rows = clone(DB[table] || []);
    var headOnly = false;
    var pendingWrite = null;

    var qb = {};
    function ret() { return qb; }

    qb.select = function (_cols, opts) {
      if (opts && opts.head) headOnly = true;
      return qb;
    };
    qb.insert = function (payload) {
      var arr = Array.isArray(payload) ? payload : [payload];
      var inserted = arr.map(function (r) {
        var row = clone(r);
        if (row.id === undefined) row.id = ++nextId;
        if (!row.created_at) row.created_at = new Date().toISOString();
        DB[table] = DB[table] || [];
        DB[table].unshift(row);
        return row;
      });
      pendingWrite = inserted;
      return qb;
    };
    qb.upsert = function (payload) { return qb.insert(payload); };
    qb.update = function (patch) {
      pendingWrite = { __update: clone(patch) };
      return qb;
    };
    qb.delete = function () {
      pendingWrite = { __delete: true };
      return qb;
    };

    // Filters
    function filter(col, val, cmp) {
      rows = rows.filter(function (r) { return cmp(r[col], val); });
      return qb;
    }
    qb.eq = function (c, v) { return filter(c, v, function (a, b) { return String(a) === String(b); }); };
    qb.neq = function (c, v) { return filter(c, v, function (a, b) { return String(a) !== String(b); }); };
    qb.gt = function (c, v) { return filter(c, v, function (a, b) { return a > b; }); };
    qb.gte = function (c, v) { return filter(c, v, function (a, b) { return a >= b; }); };
    qb.lt = function (c, v) { return filter(c, v, function (a, b) { return a < b; }); };
    qb.lte = function (c, v) { return filter(c, v, function (a, b) { return a <= b; }); };
    qb.like = qb.ilike = function (c, v) {
      var rx = new RegExp('^' + String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
      return filter(c, v, function (a) { return rx.test(String(a)); });
    };
    qb.in = function (c, list) { return filter(c, list, function (a) { return list.map(String).indexOf(String(a)) !== -1; }); };
    qb.is = function (c, v) { return filter(c, v, function (a) { return v === null ? (a === null || a === undefined) : a === v; }); };
    qb.not = function (c, _op, v) { return filter(c, v, function (a) { return v === null ? (a !== null && a !== undefined) : String(a) !== String(v); }); };
    qb.or = ret;
    qb.filter = ret;
    qb.range = function (a, b) { rows = rows.slice(a, b + 1); return qb; };
    qb.order = function (c, o) { rows = applyOrder(rows, c, o); return qb; };
    qb.limit = function (n) { rows = rows.slice(0, n); return qb; };
    qb.single = function () { qb.__single = true; return qb; };
    qb.maybeSingle = function () { qb.__single = true; return qb; };

    function resolveValue() {
      // Commit pending write against the filtered row set
      if (pendingWrite && pendingWrite.__delete) {
        var delIds = rows.map(function (r) { return r.id; });
        DB[table] = (DB[table] || []).filter(function (r) { return delIds.indexOf(r.id) === -1; });
        return { data: rows, error: null, count: rows.length, status: 200 };
      }
      if (pendingWrite && pendingWrite.__update) {
        var updIds = rows.map(function (r) { return r.id; });
        var updated = [];
        (DB[table] || []).forEach(function (r) {
          if (updIds.indexOf(r.id) !== -1) {
            Object.keys(pendingWrite.__update).forEach(function (k) { r[k] = pendingWrite.__update[k]; });
            updated.push(clone(r));
          }
        });
        return { data: updated, error: null, count: updated.length, status: 200 };
      }
      if (pendingWrite) {
        return { data: pendingWrite, error: null, count: pendingWrite.length, status: 201 };
      }
      if (headOnly) return { data: null, error: null, count: rows.length, status: 200 };
      if (qb.__single) return { data: rows.length ? rows[0] : null, error: null, count: rows.length, status: 200 };
      return { data: rows, error: null, count: rows.length, status: 200 };
    }

    // Make the builder awaitable
    qb.then = function (onFulfilled, onRejected) {
      return Promise.resolve(resolveValue()).then(onFulfilled, onRejected);
    };
    qb.catch = function (fn) { return Promise.resolve(resolveValue()).catch(fn); };
    qb.finally = function (fn) { return Promise.resolve(resolveValue()).finally(fn); };

    return qb;
  }

  var DEMO_USER = {
    id: 'demo-user-0001',
    email: 'admin1@example.com',
    user_metadata: { full_name: 'Demo Admin', name: 'Demo Admin' }
  };
  var DEMO_SESSION = {
    user: DEMO_USER,
    access_token: 'demo-access-token',
    expires_at: Math.floor(Date.now() / 1000) + 86400
  };

  function makeClient() {
    return {
      from: from,
      auth: {
        getSession: function () { return Promise.resolve({ data: { session: DEMO_SESSION }, error: null }); },
        getUser: function () { return Promise.resolve({ data: { user: DEMO_USER }, error: null }); },
        onAuthStateChange: function () {
          return { data: { subscription: { unsubscribe: function () {} } } };
        },
        signInWithPassword: function () { return Promise.resolve({ data: { session: DEMO_SESSION, user: DEMO_USER }, error: null }); },
        signUp: function () { return Promise.resolve({ data: { session: DEMO_SESSION, user: DEMO_USER }, error: null }); },
        signOut: function () { return Promise.resolve({ error: null }); },
        resetPasswordForEmail: function () { return Promise.resolve({ data: {}, error: null }); },
        updateUser: function () { return Promise.resolve({ data: { user: DEMO_USER }, error: null }); }
      },
      storage: {
        from: function () {
          return {
            upload: function (path) { return Promise.resolve({ data: { path: path }, error: null }); },
            remove: function () { return Promise.resolve({ data: [], error: null }); },
            getPublicUrl: function (path) { return { data: { publicUrl: '../logo.jpg?demo=' + encodeURIComponent(path) } }; }
          };
        }
      },
      channel: function () {
        return { on: function () { return this; }, subscribe: function () { return this; } };
      },
      removeChannel: function () {}
    };
  }

  // Replace the real SDK factory so every page gets the demo client.
  window.supabase = window.supabase || {};
  window.supabase.createClient = makeClient;
  window.__DEMO_DB = DB;
})();
