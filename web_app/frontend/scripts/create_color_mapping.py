# 06/26/2026: Hung Nguyen 
# Load the json object extract from Flashpod Variant API 
# Extract the only Gildan and comfort color variant for now. 
# run this script when you need to update the color variant mapping
# or adding new variant to our store 
import openpyxl
import json

json_path = 'flashpod_color_variant.json'
# Map from stock color codes (without _CC) to display names
COLOR_CODE_MAP = {
    # Comfort color C1717
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
    # GILDAN: G5000
    "BLACK_GD": "Black",
    "WHITE_GD": "White",
    "LIGHTBLUE_GD": "Light Blue",
    "CHARCOAL_GD": "Charcoal",
    "NAVY_GD": "Navy",
    "RED_GD": "Red",
    "SPORTGREY_GD": "Sport Grey",
    "MAROON_GD": "Maroon",
    "DARKHEATHER_GD": "Dark Heather",
    "ROYALBLUE_GD": "Royal Blue",
    "LIGHTPINK_GD": "Light Pink",
    "SAND_GD": "Sand",
    "FORESTGREEN_GD": "Forest Green",
    "ASHGREY_GD": "Ash Grey",
    "PURPLE_GD": "Purple",
    "MILITARYGREEN_GD": "Military Green",
    "ORANGE_GD": "Orange",
    "ANTIQUECHERRYRED_GD": "Antique Cherry Red",
    "ANTIQUEIRISHGREEN_GD": "Antique Irish Green",
    "ANTIQUEJADEDOME_GD": "Antique Jade Dome",
    "ANTIQUEORANGE_GD": "Antique Orange",
    "AQUATIC_GD": "Aquatic",
    "AZALEA_GD": "Azalea",
    "BERRY_GD": "Berry",
    "BROWNSAVANA_GD": "Brown Savana",
    "CARDINALRED_GD": "Cardinal Red",
    "CAROLINABLUE_GD": "Carolina Blue",
    "COBALT_GD": "Cobalt",
    "DAISY_GD": "Daisy",
    "DARKCHOCOLATE_GD": "Dark Chocolate",
    "DUSTYROSE_GD": "Dusty Rose",
    "ELECTRICGREEN_GD": "Electric Green",
    "GARNET_GD": "Garnet",
    "GOLD_GD": "Gold",
    "GRAPHITEHEATHER_GD": "Graphite Heather",
    "GRAVEL_GD": "Gravel",
    "HEATHERMILITARYGREEN_GD": "Heather Military Green",
    "HEATHERNAVY_GD": "Heather Navy",
    "HEATHERRADIANTORCHID_GD": "Heather Radiant Orchid",
    "HELICONIA_GD": "Heliconia",
    "ICEGREY_GD": "Ice Grey",
    "INDIGOBLUE_GD": "Indigo Blue",
    "IRISHGREEN_GD": "Irish Green",
    "KIWI_GD": "Kiwi",
    "LILAC_GD": "Lilac",
    "LIME_GD": "Lime",
    "MINTGREEN_GD": "Mint Green",
    "NATURAL_GD": "Natural",
    "NEONBLUE_GD": "Neon Blue",
    "OFFWHITE_GD": "Off White",
    "SORANGE_GD": "Sorange",
    "SAFETYPINK_GD": "Safety Pink",
    "SAPPHIRE_GD": "Sapphire",
    "SKY_GD": "Sky",
    "SUNSET_GD": "Sunset",
    "TANGERINE_GD": "Tangerine",
    "TENNESSEEORANGE_GD": "Tennessee Orange",
    "TORANGE_GD": "Torange",
    "TROPICALBLUE_GD": "Tropical Blue",
    "TURFGREEN_GD": "Turf Green",
    "TWEED_GD": "Tweed",
    "VIOLET_GD": "Violet",
    "YELLOWHAZE_GD": "Yellow Haze"
}

# Load the json object extract from Flashpod Variant API 
# Extract the only Gildan and comfort color variant for now. 
# run this script when you need to update the color variant mapping
# or adding new variant to our store 
def extract_color_variant():
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    items = data['data']

    style_to_extract = ['G5000', 'C1717']
    suffix_to_extract = ['_CC']
    variant_mapping = {}
    for item in items:
        if 'style' not in item or 'color' not in item:
            continue
        style = item['style']
        color = item['color']
        variant_id = item['variant_id']
        size = item['size']
        brand = item['brand']
        color_suffix = f'_{color.split('_')[-1]}'
        if style not in style_to_extract:
            continue

        brand_style_key = f"{brand}_{style}".lower()
        if brand_style_key not in variant_mapping:
            variant_mapping[brand_style_key] = {}
        if color_suffix in suffix_to_extract:
            # for comfort color which is the default so we don't need to append the suffix 
            # at the end. 
            color_without_suffix = color.replace(color_suffix, '')
            color_map_code_value = COLOR_CODE_MAP.get(color_without_suffix, color_without_suffix)
            mapping_key = f"{color_map_code_value}, {size}"
            variant_mapping[brand_style_key][mapping_key] = variant_id
        else:
            color_map_code_value = COLOR_CODE_MAP.get(color, color)
            mapping_key = f"{color_map_code_value}, {size}"
            variant_mapping[brand_style_key][mapping_key] = variant_id

    return variant_mapping

def append_to_new_color_mapping(variant_mapping):
    existing_mapping = {
        "_note": "variant_id=null means not found in local sheet \u2014 will auto-fill from API when available",
        "size_fix": {
            "XXL": "2XL",
            "XXXL": "3XL",
            "XXXXL": "4XL"
        },
        "color_fix": {
            "Irovy": "Ivory",
            "Crunchberry": "Crunch Berry",
            "Water Melon": "Watermelon",
            "Charmbay": "Chambray",
            "Charmbray": "Chambray",
            "Blue Spurce": "Blue Spruce"
        },
        "variant_map": {}
    }
    
    new_variant_map = existing_mapping['variant_map']
    new_color_add = []
    for key, value in variant_mapping.items():
        if key not in new_variant_map:
            new_variant_map[key] = value
            new_color_add.append(key)

    existing_mapping['variant_map'] = new_variant_map
    with open('../src/flashship_mapping.json', 'w') as f:
        json.dump(existing_mapping, f, indent=2)
    print("Finish adding new variant mapping")
    print(f"New colors added: {new_color_add}")

# This function extract the Gildan color unique name from the Flashpod API variant return
# The result will be use to create the COLOR_CODE_MAP at the begin of this script
def color_extract():
    with open(json_path, 'r') as f:
        data = json.load(f)

    strip = ['_GD', '_CC']
    style_to_extract = ['G5000']
    color_mapping = {}
    for item in data['data']:
        if 'color' not in item:
            continue
        color = item['color']
        brand = item['style']
        if brand in style_to_extract:
            if color not in color_mapping:
                if '_GD' in color:
                    color_name = color
                    color_split = color.split('_')
                    color_mapping[f'{color_name}'] = f'{color_split[0].capitalize()}'
                else:
                    color_name = color.split('_')[0].capitalize()
                    color_mapping[f'{color_name}'] = color_name
    json.dump(color_mapping, open('new_color_mapping.json', 'w'), indent=4)


if __name__ == "__main__":
    
    variant_map = extract_color_variant()
    append_to_new_color_mapping(variant_map)