# TikTok Shop → FlashShip Order Processor

A desktop tool (Python / tkinter) that reads a **TikTok Shop CSV export** and generates a **FlashShip-compatible XLSX import file**.

## Features

- 📂 Opens any TikTok Shop order CSV export
- Automatically filters to **"To ship"** orders only — cancels, vouchers, and already-shipped orders are excluded
- Shows a scrollable table with order date, customer, address, product, and variant info
- 🔒 Rows with no FlashShip **Variant ID** are locked (highlighted red) — cannot be selected or exported; must be processed manually
- ✏ Inline editing for **Link Label**, **Design Front (Mặt trước)**, and **Design Back (Mặt sau)** with URL validation
- Requires all three link fields to be filled before export
- 💾 Exports a ready-to-upload `.xlsx` file matching the FlashShip import template format

## Files

| File | Purpose |
|---|---|
| `process_tiktik_order.py` | Main application |
| `flashship_mapping.json` | Maps TikTok variation strings → FlashShip variant IDs |

## Requirements

```
Python 3.9+
openpyxl
```

Install dependencies:
```bash
pip3 install openpyxl
```

## Usage

```bash
python3 process_tiktik_order.py
```

1. Click **Mở file TikTok CSV** and select your TikTok order export
2. Check/uncheck rows to include in the export
3. Click each cell under **Link Label**, **Mặt trước**, **Mặt sau** to enter URLs
4. Click **Xuất file FlashShip XLSX** — the file saves next to the script and opens in Finder

## Variant Mapping

`flashship_mapping.json` contains the mapping from TikTok `Variation` values (e.g. `"Bay, M"`) to FlashShip numeric variant IDs. Update this file if new products or sizes are added.
