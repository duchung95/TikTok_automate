"""
Reads Stock_1779398775.xlsx and fills in all variant IDs in flashship_mapping.json.
Color codes like BLUEJEAN_CC are converted to proper names like 'Blue Jean'.
"""
import openpyxl
import json

# Map from stock color codes (without _CC) to display names
COLOR_CODE_MAP = {
    "BANANA":        "Banana",
    "BAY":           "Bay",
    "BERRY":         "Berry",
    "BLACK":         "Black",
    "BLOSSOM":       "Blossom",
    "BLUEJEAN":      "Blue Jean",
    "BLUESPRUCE":    "Blue Spruce",
    "BRICK":         "Brick",
    "BRIGHTORANGE":  "Bright Orange",
    "BURNTORANGE":   "Burnt Orange",
    "BUTTER":        "Butter",
    "CHALKYMINT":    "Chalky Mint",
    "CHAMBRAY":      "Chambray",
    "CHILI":         "Chili",
    "CRIMSON":       "Crimson",
    "CRUNCHBERRY":   "Crunch Berry",
    "DENIM":         "Denim",
    "ESPRESSO":      "Espresso",
    "FLOBLUE":       "Flo Blue",
    "GRANITE":       "Granite",
    "GRAPE":         "Grape",
    "GRAPHITE":      "Graphite",
    "GREY":          "Grey",
    "ICEBLUE":       "Ice Blue",
    "ISLANDREEF":    "Island Reef",
    "IVORY":         "Ivory",
    "KHAKI":         "Khaki",
    "LAGOONBLUE":    "Lagoon Blue",
    "LIGHTGREEN":    "Light Green",
    "MELON":         "Melon",
    "MIDNIGHT":      "Midnight",
    "MOSS":          "Moss",
    "MUSTARD":       "Mustard",
    "NAVY":          "Navy",
    "NEONCANTALOUPE":"Neon Cantaloupe",
    "NEONLEMON":     "Neon Lemon",
    "NEONPINK":      "Neon Pink",
    "NEONREDORANGE": "Neon Red Orange",
    "NEONVIOLET":    "Neon Violet",
    "ORCHID":        "Orchid",
    "PEPPER":        "Pepper",
    "RED":           "Red",
    "SAGE":          "Sage",
    "SANDSTONE":     "Sandstone",
    "SAPPHIRE":      "Sapphire",
    "SEAFOAM":       "Seafoam",
    "TERRACOTTA":    "Terracotta",
    "TOPAZBLUE":     "Topaz Blue",
    "TRUENAVY":      "True Navy",
    "VINEYARD":      "Vineyard",
    "VIOLET":        "Violet",
    "WASHEDDENIM":   "Washed Denim",
    "WATERMELON":    "Watermelon",
    "WHITE":         "White",
    "WINE":          "Wine",
    "YAM":           "Yam",
}

# Load stock file
wb = openpyxl.load_workbook("Stock_1779398775.xlsx")
ws = wb.active
rows = list(ws.iter_rows(values_only=True))

# Build lookup: (color_display_name, size) -> variant_id
stock_lookup = {}
unknown_codes = set()
for row in rows[1:]:
    variant_id, _, _, style, brand, color_code, size, status, _ = row
    if not variant_id or not color_code or not size:
        continue
    code = color_code.replace("_CC", "")
    display = COLOR_CODE_MAP.get(code)
    if display is None:
        unknown_codes.add(code)
        continue
    key = f"{display}, {size}"
    stock_lookup[key] = int(variant_id)

if unknown_codes:
    print(f"WARNING: Unknown color codes (not mapped): {sorted(unknown_codes)}")

print(f"Stock lookup built: {len(stock_lookup)} entries")

# Load current mapping
with open("flashship_mapping.json") as f:
    mapping = json.load(f)

old_map = mapping["variant_map"]
new_map = {}

added = 0
updated = 0
unchanged = 0

# Start fresh: include ALL entries from stock file
for key, vid in sorted(stock_lookup.items()):
    if key in old_map:
        if old_map[key] is None:
            new_map[key] = vid
            added += 1
        elif old_map[key] != vid:
            print(f"  CONFLICT: {key!r} old={old_map[key]} new={vid} -> keeping new")
            new_map[key] = vid
            updated += 1
        else:
            new_map[key] = vid
            unchanged += 1
    else:
        new_map[key] = vid
        added += 1

# Keep any existing entries NOT in stock (shouldn't happen but preserve)
for key, vid in old_map.items():
    if key not in new_map:
        new_map[key] = vid
        if vid is not None:
            print(f"  KEPT (not in stock): {key!r} -> {vid}")

mapping["variant_map"] = new_map
with open("flashship_mapping.json", "w") as f:
    json.dump(mapping, f, indent=2)

print(f"\nDone! Added: {added}, Updated: {updated}, Unchanged: {unchanged}")
print(f"Total variant_map entries: {len(new_map)}")
print(f"Non-null entries: {sum(1 for v in new_map.values() if v is not None)}")
