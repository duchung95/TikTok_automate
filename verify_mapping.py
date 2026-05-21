import openpyxl, json

wb = openpyxl.load_workbook("FlashPOD_Variant ID.xlsx")
ws = wb["COMFORT COLOR 1717"]

rows = list(ws.iter_rows(values_only=True))
colors = [str(c).strip().title() if c else None for c in rows[0]]

ground_truth = {}
for row in rows[2:]:
    size = str(row[1]).strip().upper() if row[1] else None
    if not size or size == "NONE":
        continue
    for col_idx, vid in enumerate(row[2:], start=2):
        color = colors[col_idx]
        if color and color != "None" and vid:
            key = f"{color}, {size}"
            ground_truth[key] = int(vid)

with open("flashship_mapping.json") as f:
    mapping = json.load(f)
our_map = {k: v for k, v in mapping["variant_map"].items() if v is not None}

print("=== MISMATCHES (our ID != sheet ID) ===")
mismatches = 0
for key, our_id in sorted(our_map.items()):
    sheet_id = ground_truth.get(key)
    if sheet_id is None:
        print(f"  NOT IN SHEET: {repr(key)} -> {our_id}")
        mismatches += 1
    elif sheet_id != our_id:
        print(f"  WRONG ID: {repr(key)} -> ours={our_id}, sheet={sheet_id}")
        mismatches += 1

print()
print("=== IN SHEET BUT MISSING FROM OUR MAP ===")
missing = 0
for key, sheet_id in sorted(ground_truth.items()):
    if key not in our_map and key not in mapping["variant_map"]:
        print(f"  {repr(key)} -> {sheet_id}")
        missing += 1

print()
print(f"Summary: {mismatches} mismatches, {missing} missing from our map")
print(f"Our non-null entries: {len(our_map)}, Sheet entries: {len(ground_truth)}")
