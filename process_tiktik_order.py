"""
TikTok Shop → FlashShip XLSX Import Generator
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import csv
import json
import os
from datetime import date
from urllib.parse import urlparse
import openpyxl

# ─── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
MAPPING_FILE = os.path.join(SCRIPT_DIR, "flashship_mapping.json")

CANCELLED_STATUSES = {"Cancelled", "Seller Cancel", "Cancel Request", "Unpaid"}
VOUCHER_PREFIX = "Spend $"
SHIP_STATUS    = "To ship"
PLACEHOLDER    = "✏  Nhấp để nhập link..."

FLASHSHIP_COLUMNS = [
    "Order ID", "Shipping method", "Customer's name", "Email", "Phone",
    "Country", "State", "Address line 1", "Address line 2", "City", "Zip",
    "Link Label", "Quantity", "Variant ID",
    "Design front", "Design back",
    "Design Left Hand", "Design Right Hand", "Design Neck", "Design Hood",
    "Design Pocket", "Design Neck Label Inner", "Special Print",
    "Front Extra Large", "Back Extra Large", "Left Extra Large", "Right Extra Large",
    "Mockup Front", "Mockup Back", "Mockup Left Hand", "Mockup Right Hand",
    "Mockup Neck", "Mockup Hood", "Mockup Pocket", "Mockup Neck Label Inner",
    "Product Note", "DTF/DTG", "Card Code",
]

STATE_MAP = {
    "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
    "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
    "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
    "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
    "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS",
    "Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH",
    "New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC",
    "North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA",
    "Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN",
    "Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA",
    "West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC",
}

# ─── Helpers ────────────────────────────────────────────────────────────────────
def load_mapping():
    if not os.path.exists(MAPPING_FILE):
        return {}, {}, {}
    with open(MAPPING_FILE, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("variant_map", {}), data.get("size_fix", {}), data.get("color_fix", {})

def lookup_variant(variation, variant_map, size_fix, color_fix):
    parts = [p.strip() for p in variation.split(",")]
    if len(parts) == 2:
        color, size = parts[0], parts[1]
        color = color_fix.get(color, color)
        size  = size_fix.get(size, size)
        fixed = f"{color}, {size}"
    else:
        fixed = variation
    return variant_map.get(fixed), fixed

def is_valid_url(value):
    if not value:
        return True
    try:
        r = urlparse(value)
        return r.scheme in ("http", "https") and bool(r.netloc)
    except Exception:
        return False

# ─── Filter rows ────────────────────────────────────────────────────────────────
def filter_rows(rows, variant_map, size_fix, color_fix):
    items = []
    for row in rows:
        status    = row.get("Order Status", "").strip()
        variation = row.get("Variation", "").strip()
        order_id  = row.get("Order ID", "").strip()
        if not order_id:
            continue
        if status in CANCELLED_STATUSES:
            continue
        if variation.startswith(VOUCHER_PREFIX):
            continue
        if status != SHIP_STATUS:
            continue

        vid, fixed_var = lookup_variant(variation, variant_map, size_fix, color_fix)

        raw_phone = row.get("Phone#", row.get("Phone", "")).strip()
        digits = "".join(c for c in raw_phone if c.isdigit())
        if digits.startswith("1") and len(digits) == 11:
            digits = digits[1:]

        state_raw = row.get("Province", row.get("State", "")).strip()
        state     = STATE_MAP.get(state_raw, state_raw)

        items.append({
            "order_id":        order_id,
            "order_date":      row.get("Created Time", row.get("Order Creation Date", "")).strip(),
            "customer":        row.get("Recipient", row.get("Ship to name", "")).strip(),
            "variation":       variation,
            "fixed_variation": fixed_var,
            "variant_id":      vid,
            "quantity":        row.get("Quantity", "1").strip(),
            "status_note":     "" if vid else "❌ Không có Variant ID. Phải làm order thủ công.",
            "phone":           digits,
            "state":           state,
            "address1":        row.get("Ship to address",  row.get("Address line 1", "")).strip(),
            "address2":        row.get("Ship to address2", row.get("Address line 2", "")).strip(),
            "city":            row.get("City", "").strip(),
            "zip":             row.get("Zipcode", row.get("Zip", "")).strip(),
            "link_label":      "",
            "design_front":    "",
            "design_back":     "",
        })
    return items

# ─── App ────────────────────────────────────────────────────────────────────────
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("TikTok Shop → FlashShip CSV Generator")
        self.geometry("1400x700")
        self.minsize(900, 500)
        self.resizable(True, True)

        self.variant_map, self.size_fix, self.color_fix = load_mapping()
        self.items       = []
        self.check_vars  = []
        self._edit_entry     = None
        self._edit_iid       = None
        self._edit_col_index = None
        self._edit_col_name  = None

        self._build_ui()

    # ── UI ──────────────────────────────────────────────────────────────────────
    def _build_ui(self):
        toolbar = tk.Frame(self, pady=6, padx=10)
        toolbar.pack(fill="x")

        tk.Button(toolbar, text="📂  Mở file TikTok CSV", command=self._open_csv,
                  font=("Helvetica", 13, "bold"), bg="#e8e8e8", fg="black",
                  relief="flat", padx=12, pady=6).pack(side="left")

        self.export_btn = tk.Button(toolbar, text="💾  Xuất file FlashShip XLSX",
                                    command=self._export,
                                    font=("Helvetica", 13, "bold"),
                                    bg="#d0e8d0", fg="black",
                                    relief="flat", padx=12, pady=6,
                                    state="disabled")
        self.export_btn.pack(side="left", padx=10)

        tk.Button(toolbar, text="☑ Tất cả", command=self._select_all,
                  relief="flat", padx=8).pack(side="left", padx=(20, 2))
        tk.Button(toolbar, text="☐ Bỏ chọn", command=self._select_none,
                  relief="flat", padx=8).pack(side="left")

        self.status_var = tk.StringVar(value="Mở file TikTok CSV để bắt đầu.")
        tk.Label(toolbar, textvariable=self.status_var,
                 font=("Helvetica", 11), fg="#555").pack(side="right")

        legend = tk.Frame(self, padx=10)
        legend.pack(fill="x")
        tk.Label(legend,
                 text="💡 Nhấp vào ô Link Label / Mặt trước / Mặt sau để chỉnh sửa.   "
                      "🔒 Hàng đỏ = không có Variant ID (bị khóa, không thể xuất).",
                 font=("Helvetica", 10), fg="#555").pack(side="left")

        # ── Table ───────────────────────────────────────────────────────────────
        frame = tk.Frame(self)
        frame.pack(fill="both", expand=True, padx=10, pady=(4, 10))

        cols = ("check", "order_date", "order_id", "customer", "address",
                "variation", "variant_id", "qty",
                "link_label", "design_front", "design_back", "note")
        self.tree = ttk.Treeview(frame, columns=cols, show="headings",
                                 selectmode="browse")

        col_cfg = [
            ("check",        "✔",               58,  "center"),
            ("order_date",   "Ngày đặt",        120,  "w"),
            ("order_id",     "Mã đơn hàng",     170,  "w"),
            ("customer",     "Khách hàng",      140,  "w"),
            ("address",      "Địa chỉ",         200,  "w"),
            ("variation",    "Sản phẩm",        180,  "w"),
            ("variant_id",   "Variant ID",       90,  "center"),
            ("qty",          "SL",               40,  "center"),
            ("link_label",   "Link Label  ✏",   210,  "w"),
            ("design_front", "Mặt trước  ✏",    210,  "w"),
            ("design_back",  "Mặt sau  ✏",      210,  "w"),
            ("note",         "Ghi chú",          320,  "w"),
        ]
        for cid, heading, width, anchor in col_cfg:
            self.tree.heading(cid, text=heading)
            self.tree.column(cid, width=width, minwidth=30, anchor=anchor,
                             stretch=cid in ("link_label","design_front","design_back",
                                             "variation","address","note"))

        vsb = ttk.Scrollbar(frame, orient="vertical",   command=self.tree.yview)
        hsb = ttk.Scrollbar(frame, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")
        frame.rowconfigure(0, weight=1)
        frame.columnconfigure(0, weight=1)

        self.tree.tag_configure("odd",         background="#f9f9f9")
        self.tree.tag_configure("even",        background="#ffffff")
        self.tree.tag_configure("locked",      background="#ffe0e0", foreground="#aaaaaa")
        self.tree.tag_configure("url_err",     background="#ffd0d0")
        self.tree.tag_configure("placeholder", foreground="#aaaaaa")

        style = ttk.Style()
        style.configure("Treeview",         font=("Helvetica", 12), rowheight=32)
        style.configure("Treeview.Heading", font=("Helvetica", 12, "bold"))

        self.tree.bind("<Button-1>", self._on_click)

    # ── Open CSV ────────────────────────────────────────────────────────────────
    def _open_csv(self):
        path = filedialog.askopenfilename(
            title="Chọn file CSV TikTok Shop",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        if not path:
            return
        try:
            with open(path, newline="", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                raw = [{k.strip(): v.strip() for k, v in row.items()} for row in reader]
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không đọc được file:\n{e}")
            return

        self.items = filter_rows(raw, self.variant_map, self.size_fix, self.color_fix)
        if not self.items:
            messagebox.showinfo("Không có dữ liệu", "Không tìm thấy đơn 'To ship' nào.")
            return
        self._populate_table()
        self.export_btn.config(state="normal")

    # ── Populate ────────────────────────────────────────────────────────────────
    def _populate_table(self):
        for row in self.tree.get_children():
            self.tree.delete(row)
        self.check_vars.clear()

        for i, item in enumerate(self.items):
            locked = not item["variant_id"]
            var = tk.BooleanVar(value=not locked)
            self.check_vars.append(var)

            tag        = "locked" if locked else ("odd" if i % 2 else "even")
            check_sym  = "—"  if locked else "☑"
            vid        = item["variant_id"] if item["variant_id"] else "—"
            addr_parts = [p for p in [item["city"], item["state"], item["zip"]] if p]
            address    = ", ".join(addr_parts)
            lbl        = item["link_label"]   or PLACEHOLDER
            front      = item["design_front"] or PLACEHOLDER
            back       = item["design_back"]  or PLACEHOLDER

            self.tree.insert("", "end", iid=str(i), tags=(tag,), values=(
                check_sym, item["order_date"], item["order_id"], item["customer"],
                address, item["variation"], vid, item["quantity"],
                lbl, front, back, item["status_note"],
            ))

        self._update_status(sum(1 for v in self.check_vars if v.get()))

    # ── Click ────────────────────────────────────────────────────────────────────
    def _on_click(self, event):
        if self._edit_entry:
            self._commit_edit()

        col = self.tree.identify_column(event.x)
        iid = self.tree.identify_row(event.y)
        if not iid:
            return

        col_names = ("check", "order_date", "order_id", "customer", "address",
                     "variation", "variant_id", "qty",
                     "link_label", "design_front", "design_back", "note")
        col_index = int(col.replace("#", "")) - 1
        col_name  = col_names[col_index] if col_index < len(col_names) else ""
        idx       = int(iid)

        # Checkbox toggle
        if col_name == "check":
            if not self.items[idx]["variant_id"]:
                return  # locked
            new_val = not self.check_vars[idx].get()
            self.check_vars[idx].set(new_val)
            vals    = list(self.tree.item(iid, "values"))
            vals[0] = "☑" if new_val else "☐"
            self.tree.item(iid, values=vals)
            self._update_status(sum(1 for v in self.check_vars if v.get()))
            return

        if col_name not in ("link_label", "design_front", "design_back"):
            return

        try:
            bbox = self.tree.bbox(iid, col)
        except Exception:
            return
        if not bbox:
            return

        x, y, w, h = bbox
        current_val = self.items[idx][col_name]   # real value, not placeholder

        entry = tk.Entry(self.tree, font=("Helvetica", 12), relief="solid", bd=1,
                         highlightthickness=1, highlightbackground="#1565c0")
        entry.place(x=x, y=y, width=max(w, 300), height=h)
        entry.insert(0, current_val)
        entry.select_range(0, "end")
        entry.focus_set()

        self._edit_entry     = entry
        self._edit_iid       = iid
        self._edit_col_index = col_index
        self._edit_col_name  = col_name

        entry.bind("<Return>",   lambda e: self._commit_edit())
        entry.bind("<Escape>",   lambda e: self._cancel_edit())
        entry.bind("<FocusOut>", lambda e: self._commit_edit())

    # ── Edit helpers ─────────────────────────────────────────────────────────────
    def _commit_edit(self):
        if not self._edit_entry:
            return
        val        = self._edit_entry.get().strip()
        iid        = self._edit_iid
        idx        = int(iid)
        col_name   = self._edit_col_name
        col_index  = self._edit_col_index

        # URL validation
        if not is_valid_url(val):
            self._edit_entry.config(bg="#ffd0d0", highlightbackground="#c0392b")
            self._edit_entry.focus_set()
            if not hasattr(self, "_url_warn_label"):
                self._url_warn_label = tk.Label(
                    self.tree,
                    text="⚠ Link không hợp lệ (phải bắt đầu bằng https://...)",
                    bg="#ffd0d0", fg="#c0392b",
                    font=("Helvetica", 10), relief="solid", bd=1)
            bx, by, bw, bh = self.tree.bbox(iid, f"#{col_index + 1}")
            self._url_warn_label.place(x=bx, y=by + bh, width=340)
            self._url_warn_label.lift()
            return

        if hasattr(self, "_url_warn_label"):
            self._url_warn_label.place_forget()

        self.items[idx][col_name] = val

        # Recompute tag
        has_url_err = any(
            not is_valid_url(self.items[idx][f])
            for f in ("link_label", "design_front", "design_back")
        )
        current_tags = [t for t in self.tree.item(iid, "tags")
                        if t not in ("odd", "even", "locked", "url_err")]
        if has_url_err:
            current_tags.append("url_err")
        elif not self.items[idx]["variant_id"]:
            current_tags.append("locked")
        else:
            current_tags.append("odd" if idx % 2 else "even")
        self.tree.item(iid, tags=current_tags)

        # Display: placeholder if empty
        display_val = val if val else PLACEHOLDER
        vals = list(self.tree.item(iid, "values"))
        vals[col_index] = display_val
        self.tree.item(iid, values=vals)

        self._edit_entry.destroy()
        self._edit_entry = None

    def _cancel_edit(self):
        if self._edit_entry:
            self._edit_entry.destroy()
            self._edit_entry = None

    # ── Select all / none ────────────────────────────────────────────────────────
    def _select_all(self):
        for i, var in enumerate(self.check_vars):
            if not self.items[i]["variant_id"]:
                continue
            var.set(True)
            vals    = list(self.tree.item(str(i), "values"))
            vals[0] = "☑"
            self.tree.item(str(i), values=vals)
        self._update_status(sum(1 for v in self.check_vars if v.get()))

    def _select_none(self):
        for i, var in enumerate(self.check_vars):
            if not self.items[i]["variant_id"]:
                continue
            var.set(False)
            vals    = list(self.tree.item(str(i), "values"))
            vals[0] = "☐"
            self.tree.item(str(i), values=vals)
        self._update_status(0)

    def _update_status(self, checked):
        total  = len(self.items)
        locked = sum(1 for it in self.items if not it["variant_id"])
        self.status_var.set(
            f"Đã chọn {checked} / {total - locked} mặt hàng   |   "
            f"🔒 {locked} hàng bị khóa — thiếu Variant ID (phải làm thủ công)"
        )

    # ── Export ───────────────────────────────────────────────────────────────────
    def _export(self):
        if self._edit_entry:
            self._commit_edit()

        # Validate: all link fields are required and must be valid URLs
        missing_rows = []
        invalid_rows = []
        for i, item in enumerate(self.items):
            if not self.check_vars[i].get():
                continue
            customer = item["customer"] or item["order_id"]
            for field, label in (("link_label",   "Link Label"),
                                  ("design_front", "Mặt trước (Design Front)"),
                                  ("design_back",  "Mặt sau (Design Back)")):
                val = item[field]
                if not val:
                    missing_rows.append(f"  • {customer} — thiếu {label}")
                elif not is_valid_url(val):
                    invalid_rows.append(f"  • {customer} — {label}: \"{val}\"")

        errors = []
        if missing_rows:
            errors.append("❌ Các ô sau chưa được điền:\n" + "\n".join(missing_rows))
        if invalid_rows:
            errors.append("⚠ Các link sau không hợp lệ (phải bắt đầu bằng https://):\n"
                          + "\n".join(invalid_rows))
        if errors:
            messagebox.showerror("Chưa điền đầy đủ thông tin", "\n\n".join(errors))
            return

        out_name = f"flashship_import_{date.today().isoformat()}.xlsx"
        out_path = os.path.join(SCRIPT_DIR, out_name)

        exported = skipped_unchecked = skipped_no_variant = 0

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "FlashShip Import"
        ws.append(FLASHSHIP_COLUMNS)

        from openpyxl.styles import Font, PatternFill, Alignment
        hdr_fill = PatternFill("solid", fgColor="1a1a2e")
        hdr_font = Font(bold=True, color="FFFFFF")
        for cell in ws[1]:
            cell.font      = hdr_font
            cell.fill      = hdr_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for i, item in enumerate(self.items):
            if not self.check_vars[i].get():
                skipped_unchecked += 1
                continue
            if not item["variant_id"]:
                skipped_no_variant += 1
                continue

            row = {col: "" for col in FLASHSHIP_COLUMNS}
            row["Order ID"]        = item["order_id"]
            row["Shipping method"] = "1"
            row["Customer's name"] = item["customer"]
            row["Phone"]           = item["phone"]
            row["Country"]         = "US"
            row["State"]           = item["state"]
            row["Address line 1"]  = item["address1"]
            row["Address line 2"]  = item["address2"]
            row["City"]            = item["city"]
            row["Zip"]             = item["zip"]
            row["Link Label"]      = item["link_label"]
            row["Quantity"]        = item["quantity"]
            row["Variant ID"]      = item["variant_id"]
            row["Design front"]    = item["design_front"]
            row["Design back"]     = item["design_back"]
            row["DTF/DTG"]         = "1"
            ws.append([row[col] for col in FLASHSHIP_COLUMNS])
            exported += 1

        # Auto-size columns
        for col_cells in ws.columns:
            max_len = max((len(str(c.value)) if c.value else 0) for c in col_cells)
            ws.column_dimensions[col_cells[0].column_letter].width = min(max_len + 4, 60)

        if exported == 0:
            messagebox.showwarning("Không có dữ liệu",
                                   "Không có hàng nào được xuất.\n"
                                   "Kiểm tra lại các hàng đã chọn có Variant ID hợp lệ.")
            return

        wb.save(out_path)
        msg = (f"✅  Đã xuất {exported} mặt hàng ra file:\n{out_path}\n\n"
               f"Bỏ qua — không chọn: {skipped_unchecked}\n"
               f"Bỏ qua — thiếu Variant ID: {skipped_no_variant}")
        messagebox.showinfo("Xuất file thành công", msg)
        os.system(f'open -R "{out_path}"')


if __name__ == "__main__":
    App().mainloop()
