from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment

OUT = "docs/Subscription_Request_Form.xlsx"

RATE = 100          # RM per module per month
MIN_MONTHS = 6      # minimum upfront term

NAVY   = "0F172A"
GREEN  = "10B981"
YELLOW = "FFF2CC"   # cells the client fills in
GREY   = "F1F5F9"
WHITE  = "FFFFFF"

F = "Arial"
BLUE_TXT = "0000FF"   # hardcoded input convention

wb = Workbook()
ws = wb.active
ws.title = "Request Form"
ws.sheet_view.showGridLines = False

thin = Side(style="thin", color="CBD5E1")
box = Border(left=thin, right=thin, top=thin, bottom=thin)

def title(cell, text, size=16):
    ws[cell] = text
    ws[cell].font = Font(name=F, size=size, bold=True, color=WHITE)

def section(row, text):
    ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=8)
    c = ws.cell(row=row, column=2, value=text)
    c.font = Font(name=F, size=11, bold=True, color=WHITE)
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[row].height = 22

def field(row, label, example, required=True, height=None):
    """Label in B, yellow input merged C:E, grey italic example in F:H."""
    lab = ws.cell(row=row, column=2, value=label + (" *" if required else ""))
    lab.font = Font(name=F, size=10, bold=True)
    lab.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    ws.merge_cells(start_row=row, start_column=3, end_row=row, end_column=5)
    inp = ws.cell(row=row, column=3)
    inp.fill = PatternFill("solid", fgColor=YELLOW)
    inp.font = Font(name=F, size=10, color=BLUE_TXT)
    inp.alignment = Alignment(horizontal="left", vertical="center", indent=1, wrap_text=True)
    for col in range(3, 6):
        ws.cell(row=row, column=col).border = box

    ws.merge_cells(start_row=row, start_column=6, end_row=row, end_column=8)
    ex = ws.cell(row=row, column=6, value=("e.g.  " + example) if example else "")
    ex.font = Font(name=F, size=9, italic=True, color="94A3B8")
    ex.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    ws.row_dimensions[row].height = height or 20
    return inp

# ── Column widths ─────────────────────────────────────────────────────────
widths = {"A": 2.5, "B": 30, "C": 22, "D": 26, "E": 16, "F": 14, "G": 11, "H": 18, "I": 2.5}
for col, w in widths.items():
    ws.column_dimensions[col].width = w

# ── Banner ────────────────────────────────────────────────────────────────
ws.merge_cells("B2:H3")
title("B2", "OPERATIONS PORTAL  —  SUBSCRIPTION REQUEST FORM")
ws["B2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
for r in (2, 3):
    for c in range(2, 9):
        ws.cell(row=r, column=c).fill = PatternFill("solid", fgColor=NAVY)
ws.row_dimensions[2].height = 24
ws.row_dimensions[3].height = 14

ws.merge_cells("B4:H4")
ws["B4"] = ("RM%d per module, per month  ·  Minimum %d months, payable upfront  ·  9 modules available"
            % (RATE, MIN_MONTHS))
ws["B4"].font = Font(name=F, size=10, bold=True, color=WHITE)
ws["B4"].fill = PatternFill("solid", fgColor=GREEN)
ws["B4"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
ws.row_dimensions[4].height = 20

# ── How to complete ───────────────────────────────────────────────────────
ws.merge_cells("B6:H6")
ws["B6"] = "HOW TO COMPLETE THIS FORM"
ws["B6"].font = Font(name=F, size=10, bold=True)

legend = [
    "1.  Fill in every shaded (yellow) cell.  Fields marked * are required.",
    "2.  In the MODULE SELECTION table, type  Y  in the 'Select' column for each module you want.  Leave blank or type N to exclude it.",
    "3.  Choose your subscription term (6, 12 or 24 months).  6 months is the minimum.",
    "4.  The Subtotal and Total Payable cells calculate automatically — do not type over them.",
    "5.  Sign, stamp and return this form to us by email.",
]
r = 7
for line in legend:
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=8)
    c = ws.cell(row=r, column=2, value=line)
    c.font = Font(name=F, size=9, color="475569")
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[r].height = 14
    r += 1

# ── Section A: company ────────────────────────────────────────────────────
r += 1
section(r, "SECTION A   —   COMPANY INFORMATION"); r += 1
company_fields = [
    ("Company Name",                      "Acme Engineering Sdn. Bhd.", True,  20),
    ("Business Reg. No. (BRN / SSM)",     "202301012345 (1501234-A)",   True,  20),
    ("SST Registration No.",              "W10-1808-32000123  (or 'Not registered')", False, 20),
    ("Registered Business Address",       "Lot 12, Jalan Perusahaan 3", True,  32),
    ("Postcode",                          "98000",                      True,  20),
    ("City",                              "Miri",                       True,  20),
    ("State",                             "Sarawak",                    True,  20),
    ("Company Phone",                     "+60 85-123 456",             True,  20),
    ("Company Email",                     "accounts@acme.com.my",       True,  20),
    ("Industry",                          "Construction / Oil & Gas",   False, 20),
    ("Estimated Portal Users",            "11 - 25",                    False, 20),
]
for label, ex, req, h in company_fields:
    field(r, label, ex, req, h); r += 1

# ── Section B: PIC ────────────────────────────────────────────────────────
r += 1
section(r, "SECTION B   —   PERSON IN CHARGE"); r += 1
for label, ex, req in [
    ("Full Name",   "Jane Lim",             True),
    ("Designation", "Operations Manager",   True),
    ("Mobile No.",  "+60 12-345 6789",      True),
    ("Email Address", "jane@acme.com.my",   True),
]:
    field(r, label, ex, req); r += 1

# ── Section C: term ───────────────────────────────────────────────────────
r += 1
section(r, "SECTION C   —   SUBSCRIPTION TERM"); r += 1
TERM_ROW = r
term_cell = field(r, "Subscription Term (months)", "6, 12 or 24  —  minimum 6", True)
term_cell.value = MIN_MONTHS
term_cell.alignment = Alignment(horizontal="center", vertical="center")
term_cell.font = Font(name=F, size=11, bold=True, color=BLUE_TXT)
term_cell.comment = Comment(
    "Minimum term is %d months, payable upfront.\nAllowed values: 6, 12 or 24." % MIN_MONTHS,
    "Operations Portal")
r += 1
start_row = r
field(r, "Preferred Start Date", "01/03/2026", False); r += 1

dv_term = DataValidation(type="list", formula1='"6,12,24"', allow_blank=False,
                         showErrorMessage=True, errorTitle="Invalid term",
                         error="Choose 6, 12 or 24 months. The minimum term is 6 months.")
ws.add_data_validation(dv_term)
dv_term.add(ws.cell(row=TERM_ROW, column=3))

# ── Section D: modules ────────────────────────────────────────────────────
r += 1
section(r, "SECTION D   —   MODULE SELECTION"); r += 1

headers = ["No.", "Module", "What it does", "Rate (RM/month)", "Select (Y/N)", "Months", "Subtotal (RM)"]
HDR_ROW = r
for i, h in enumerate(headers):
    c = ws.cell(row=r, column=2 + i, value=h)
    c.font = Font(name=F, size=9, bold=True, color=WHITE)
    c.fill = PatternFill("solid", fgColor=GREEN)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = box
ws.row_dimensions[r].height = 28
r += 1

MODULES = [
    ("Project Management", "Track projects, progress, invoicing and payment status."),
    ("PO System",          "Raise, approve and issue purchase orders with PDF output."),
    ("Cash Claim",         "Staff cash reimbursements with approval flow and PDF vouchers."),
    ("Staff Claim",        "Staff expense claims with itemised entry and approvals."),
    ("Leave System",       "Leave applications, balances and approval workflow."),
    ("Receipt Sender",     "Issue and email receipts to customers, with full history."),
    ("Customer Database",  "Central customer directory with search and contact records."),
    ("Vehicle Management", "Fleet records with road tax and insurance expiry reminders."),
    ("Project Costing",    "Cost tracking per project with margin visibility."),
]

FIRST = r
term_ref = "$C$%d" % TERM_ROW
for i, (name, desc) in enumerate(MODULES, start=1):
    row = r
    ws.cell(row=row, column=2, value=i).alignment = Alignment(horizontal="center", vertical="center")
    ws.cell(row=row, column=2).font = Font(name=F, size=10)

    n = ws.cell(row=row, column=3, value=name)
    n.font = Font(name=F, size=10, bold=True)
    n.alignment = Alignment(horizontal="left", vertical="center", indent=1)

    d = ws.cell(row=row, column=4, value=desc)
    d.font = Font(name=F, size=9, color="475569")
    d.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True, indent=1)

    rate = ws.cell(row=row, column=5, value=RATE)
    rate.number_format = '#,##0.00'
    rate.alignment = Alignment(horizontal="center", vertical="center")
    rate.font = Font(name=F, size=10)

    sel = ws.cell(row=row, column=6)
    sel.fill = PatternFill("solid", fgColor=YELLOW)
    sel.alignment = Alignment(horizontal="center", vertical="center")
    sel.font = Font(name=F, size=10, bold=True, color=BLUE_TXT)

    # Months applies only to a selected module, and always mirrors the term cell.
    mon = ws.cell(row=row, column=7,
                  value='=IF(UPPER($F%d)="Y",%s,0)' % (row, term_ref))
    mon.alignment = Alignment(horizontal="center", vertical="center")
    mon.font = Font(name=F, size=10)

    sub = ws.cell(row=row, column=8,
                  value='=IF(UPPER($F%d)="Y",$E%d*%s,0)' % (row, row, term_ref))
    sub.number_format = '#,##0.00;(#,##0.00);-'
    sub.alignment = Alignment(horizontal="right", vertical="center", indent=1)
    sub.font = Font(name=F, size=10)

    for col in range(2, 9):
        ws.cell(row=row, column=col).border = box
    ws.row_dimensions[row].height = 26
    r += 1
LAST = r - 1

dv_yn = DataValidation(type="list", formula1='"Y,N"', allow_blank=True,
                       showErrorMessage=True, errorTitle="Invalid entry",
                       error="Type Y to include this module, or N / leave blank to exclude it.")
ws.add_data_validation(dv_yn)
dv_yn.add("F%d:F%d" % (FIRST, LAST))

# ── Totals ────────────────────────────────────────────────────────────────
cnt = ws.cell(row=r, column=2, value='=COUNTIF($F%d:$F%d,"Y")' % (FIRST, LAST))
cnt.font = Font(name=F, size=10, bold=True)
cnt.alignment = Alignment(horizontal="center", vertical="center")
ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=7)
lbl = ws.cell(row=r, column=3,
              value='=" module(s) selected   x   RM"&TEXT($E%d,"#,##0")&"   x   "&TEXT(%s,"0")&" months"'
                    % (FIRST, term_ref))
lbl.font = Font(name=F, size=10, bold=True)
lbl.alignment = Alignment(horizontal="left", vertical="center", indent=1)
tot = ws.cell(row=r, column=8, value='=SUM($H%d:$H%d)' % (FIRST, LAST))
tot.number_format = '#,##0.00;(#,##0.00);-'
tot.font = Font(name=F, size=10, bold=True)
tot.alignment = Alignment(horizontal="right", vertical="center", indent=1)
for col in range(2, 9):
    c = ws.cell(row=r, column=col)
    c.fill = PatternFill("solid", fgColor=GREY)
    c.border = box
ws.row_dimensions[r].height = 22
SUBTOTAL_ROW = r
r += 1

ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7)
tp = ws.cell(row=r, column=2, value="TOTAL PAYABLE UPFRONT (RM)")
tp.font = Font(name=F, size=12, bold=True, color=WHITE)
tp.alignment = Alignment(horizontal="right", vertical="center")
grand = ws.cell(row=r, column=8, value="=$H%d" % SUBTOTAL_ROW)
grand.number_format = '#,##0.00;(#,##0.00);-'
grand.font = Font(name=F, size=12, bold=True, color=WHITE)
grand.alignment = Alignment(horizontal="right", vertical="center", indent=1)
for col in range(2, 9):
    ws.cell(row=r, column=col).fill = PatternFill("solid", fgColor=NAVY)
    ws.cell(row=r, column=col).border = box
ws.row_dimensions[r].height = 26
r += 1

note = ws.cell(row=r, column=2,
               value="Rate and minimum term are set by us and are not editable. SST will be added where applicable.")
ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=8)
note.font = Font(name=F, size=8, italic=True, color="94A3B8")
note.alignment = Alignment(horizontal="left", vertical="center", indent=1)
r += 2

# ── Section E: notes ──────────────────────────────────────────────────────
section(r, "SECTION E   —   ADDITIONAL REQUIREMENTS"); r += 1
ws.merge_cells(start_row=r, start_column=2, end_row=r + 2, end_column=8)
nc = ws.cell(row=r, column=2)
nc.fill = PatternFill("solid", fgColor=YELLOW)
nc.font = Font(name=F, size=10, color=BLUE_TXT)
nc.alignment = Alignment(horizontal="left", vertical="top", indent=1, wrap_text=True)
for rr in range(r, r + 3):
    for col in range(2, 9):
        ws.cell(row=rr, column=col).border = box
    ws.row_dimensions[rr].height = 18
hint = ws.cell(row=r, column=2)
hint.comment = Comment("Custom fields, approval flow, integrations, branding requests, etc.",
                       "Operations Portal")
r += 4

# ── Declaration ───────────────────────────────────────────────────────────
ws.merge_cells(start_row=r, start_column=2, end_row=r + 1, end_column=8)
dec = ws.cell(row=r, column=2, value=(
    "DECLARATION:  We confirm the information above is accurate and request the modules selected, "
    "for the term stated, at the rates shown. Payment is due upfront for the full term and covers "
    "development, deployment and hosting. This form is a request for service and is not binding "
    "until confirmed in writing."))
dec.font = Font(name=F, size=8, color="475569")
dec.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True, indent=1)
ws.row_dimensions[r].height = 16
ws.row_dimensions[r + 1].height = 16
r += 3

for col_start, label in ((2, "Authorised Signature & Company Stamp"), (6, "Date")):
    end = col_start + 2 if col_start == 2 else col_start + 2
    ws.merge_cells(start_row=r, start_column=col_start, end_row=r, end_column=end)
    for c in range(col_start, end + 1):
        ws.cell(row=r, column=c).border = Border(bottom=Side(style="thin", color="475569"))
    lc = ws.cell(row=r + 1, column=col_start, value=label)
    lc.font = Font(name=F, size=9, color="475569")
    lc.alignment = Alignment(horizontal="left", vertical="center")
ws.row_dimensions[r].height = 28

# Print setup — one clean page
ws.print_area = "A1:I%d" % (r + 2)
ws.page_setup.orientation = "portrait"
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.freeze_panes = "A5"

# openpyxl writes formulas with no cached values; tell Excel/Sheets to compute
# them on open so the totals are never blank for the client.
wb.calculation.fullCalcOnLoad = True

wb.save(OUT)
print("wrote", OUT)
print("term row:", TERM_ROW, "| modules:", FIRST, "-", LAST, "| subtotal row:", SUBTOTAL_ROW)
