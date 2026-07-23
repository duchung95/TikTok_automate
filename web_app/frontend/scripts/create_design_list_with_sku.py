# This script will read the flashpod order data export (excel) for LLC and regular shop
# Then it will call the Flashpod API using the token in FLASHPOD_TOKEN and LLC_FLASHPOD_TOKEN
# in the OS environment variables (so you have to call export FLASHPOD_TOKEN=<token> and export LLC_FLASHPOD_TOKEN=<token>)
# before using this script. 
# To use, please have the flashpod order data exported as Excel files for both shop.
# Have the Tiktok order data exported as CSV files for both shop. 
# update the name in the script. 

import pandas as pd 
import json 
import requests 
import os 
import json 

flashship_order_excel = 'flashpod_regular_order_april_july.xlsx'
flashship_llc_excel = 'flashpod_llc_order_june_july.xlsx'

llc_tt_order = 'all_llc_order.csv'
llc_regular_order = 'all_order_regular.csv'


def get_flashpod_design(order_array, api_token, is_llc: bool = False):
    # Calling the Flashpod API
    # downloaded the flashpod order data from their website, combine 
    # them into one file to create a complete flashpod order list
    # we then use the list to extract the partner order id 
    # to call the API and save the result into a json file 
    url = "https://api.flashship.net/seller-api-v2/orders/list-partner-order-id"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }

    page = 1
    design_dict = {}
    for i in range(0, len(order_array), 20):
        process_list = order_array[i:i + 20]
        order_id_array = [item['Flashpod Order ID'] for item in process_list]

        body = {
            "list_partner_order_id": order_id_array
        }
        
        response = requests.post(url, headers=headers, json=body)
        if response.status_code == 200:
            print(f"Success: page {page}")
            data = response.json()
            page_name = f"page{page}{'_llc' if is_llc else ''}"
            design_dict[page_name] = data
            page += 1
        else:
            print(f"Error: {response.status_code} - {response.text}")
            print(body)
            

    #json.dump(design_dict, open("design_dict.json", "w"), indent=4)
    return design_dict

def create_design_list_table():
    # This will call the Flashpod API to get the design list for each order
    # It read the flash_order_excel for bot LLC and regular shop
    # automatically extract the order id and calling the API by batch of 20.
    # It will export to flashpod_order_json.json file so the create_design_list_table()
    # can use 
    regular_api_token = os.environ.get("FLASHPOD_TOKEN")
    llc_api_token = os.environ.get("LLC_FLASHPOD_TOKEN")
    if not regular_api_token:
        raise ValueError("Missing FLASHPOD_TOKEN environment variable")

    if not llc_api_token:
        raise ValueError("Missing LLC_FLASHPOD_TOKEN environment variable")

    flashship_order_df = pd.read_excel(flashship_order_excel)
    flashship_order_df['Flashpod Order ID'] = flashship_order_df['Order ID']
    flashship_order_df['Order ID'] = flashship_order_df['Order ID'].astype(str).str.split("-").str[-1]
    flashship_order_df['Order ID'] = flashship_order_df['Order ID'].astype(str).str.split(" ").str[-1]


    flashship_llc_df = pd.read_excel(flashship_llc_excel)
    flashship_llc_df['Flashpod Order ID'] = flashship_llc_df['Order ID']
    flashship_llc_df['Order ID'] = flashship_llc_df['Order ID'].astype(str).str.split("-").str[-1]
    flashship_llc_df['Order ID'] = flashship_llc_df['Order ID'].astype(str).str.split(" ").str[-1]


    llc_tt_df = pd.read_csv(llc_tt_order)
    regular_tt_df = pd.read_csv(llc_regular_order)
    combine_tt_order_df = pd.concat([llc_tt_df, regular_tt_df], ignore_index=True)

    drop_status_list = ['Canceled']
    combine_tt_order_df = combine_tt_order_df[~combine_tt_order_df['Order Status'].isin(drop_status_list)]
    combine_tt_order_df = combine_tt_order_df[~combine_tt_order_df['Product Name'].str.startswith('Voucher', na=False)]
    combine_tt_order_df['Order ID'] = combine_tt_order_df['Order ID'].astype(str)
    

    llc_tt_flashpod_df = pd.merge(flashship_llc_df, combine_tt_order_df, on='Order ID', how='inner', suffixes=('_flaship', '_tt'))
    regular_tt_flashpod_df = pd.merge(flashship_order_df, combine_tt_order_df, on='Order ID', how='inner', suffixes=('_flaship', '_tt'))
    llc_order_array = llc_tt_flashpod_df.to_dict(orient='records')
    regular_order_array = regular_tt_flashpod_df.to_dict(orient='records')

    llc_api_result = get_flashpod_design(llc_order_array, llc_api_token, True)
    regular_api_result = get_flashpod_design(regular_order_array, regular_api_token)
    merge_result = {**llc_api_result, **regular_api_result}

    json.dump(merge_result, open("flashpod_order_json.json", "w"), indent=4)

import re

def map_variant(
    variation: str,
    mapping: dict,
    color_fix: dict = {},
    size_fix: dict = {}
) -> dict:
    """
    Maps a TikTok variation string (e.g. 'Black, XL' or 'Golden Retriever, M, Pepper')
    to a fixed variation and variant ID using the flashship mapping.

    Mirrors the TypeScript mapVariant() in csvParser.ts exactly.
    Returns: { 'fixed_variation': str, 'variant_id': str }
    """
    normalised = re.sub(r'\s+', ' ', variation.strip())
    parts = [p.strip() for p in normalised.split(',')]
    if not mapping:
        return { 'fixed_variation': normalised, 'variant_id': '' }

    if len(parts) == 2:
        color = color_fix.get(parts[0], parts[0])
        size  = size_fix.get(parts[1], parts[1])
        fixed = f"{color}, {size}"

    elif len(parts) == 3:
        # Format: "Breed, Size, Color" — breed is design-specific, ignored for variant mapping
        size  = size_fix.get(parts[1], parts[1])
        color = color_fix.get(parts[2], parts[2])
        fixed = f"{color}, {size}"
        
        if fixed not in mapping:
            # Try: size at the end
            size  = size_fix.get(parts[2], parts[2])
            color = color_fix.get(parts[1], parts[1])
            fixed = f"{color}, {size}"

            if fixed not in mapping:
                # Try: color at the start
                size  = size_fix.get(parts[1], parts[1])
                color = color_fix.get(parts[0], parts[0])
                fixed = f"{color}, {size}"
    else:
        fixed = normalised

    variant_id = mapping.get(fixed, '')
    return { 'fixed_variation': fixed, 'variant_id': variant_id }

def create_design_list_table():
    #Creating the design table list from the orders from both LLC and regular shop 
    # and write that list into an excel file that we can use in Google Drive 

    # Load the JSON data
    with open("flashpod_order_json.json", 'r') as f:
        flashpod_data = json.load(f)

    variant_mapping = '../src/flashship_mapping.json'
    with open(variant_mapping, 'r') as f:
        variant_data = json.load(f)
        variant_map_obj = variant_data['variant_map']
        gildan_variant_map = variant_map_obj['gildan_g5000']
        comfort_variant_map = variant_map_obj['comfort_c1717']
        color_fix = variant_data.get('color_fix', {})
        size_fix = variant_data.get('size_fix', {})

    flash_ship_data = {}
    #creating a mapping for each tt order id with variant id as the second key 
    # { tt_order_id : { variant_id : {} }}
    # then creating a mapping for each tt order id with variant id too and then we 
    # map these 2 maps together to for their exact data 
    for key, value in flashpod_data.items():
        # Map the variations using the mapping functions
        orders = value.get('data', None)
        if not orders:
            print("no data for ", key)
            continue
        for order in orders:
            order_id = order.get('partner_order_id', None)
            
            if not order_id:
                print("no order id for ", order)
                continue

            tt_order_id = order_id.replace("HD - ", "") 
            tt_order_id = tt_order_id.replace("HD -", "")
            tt_order_id = tt_order_id.replace("HD- ", "")
            tt_order_id = tt_order_id.replace("HD-", "")
            tt_order_id = tt_order_id.replace("hd - ", "")
            tt_order_id = tt_order_id.replace("hd -", "")
            
            
            products = order.get('products', [])
            flash_ship_data[tt_order_id] = {}
            for product in products:
                variant_id = product.get('variant_id', None)
                if not variant_id:
                    print("no variant id for ", product)
                    continue
                product_detail = {
                    'front_print_url': product.get('front_print_url', ''),
                    'back_print_url': product.get('back_print_url', ''),
                    'mockup_front': product.get('mockup_front', ''),
                    'mockup_back': product.get('mockup_back', '')
                }
                flash_ship_data[tt_order_id][variant_id] = product_detail

   

    llc_tt_df = pd.read_csv(llc_tt_order)
    regular_tt_df = pd.read_csv(llc_regular_order)
    combine_tt_order_df = pd.concat([llc_tt_df, regular_tt_df], ignore_index=True)

    drop_status_list = ['Canceled']
    combine_tt_order_df = combine_tt_order_df[~combine_tt_order_df['Order Status'].isin(drop_status_list)]
    combine_tt_order_df = combine_tt_order_df[~combine_tt_order_df['Product Name'].str.startswith('Voucher', na=False)]
    combine_tt_order_df['Order ID'] = combine_tt_order_df['Order ID'].astype(str)
    all_tt_orders_array = combine_tt_order_df.to_dict(orient='records')

    tiktok_order_map = {}
    for order in all_tt_orders_array:
        order_id = order['Order ID']
        variation = order['Variation']

        productName = order['Product Name']
        sub_mapping = comfort_variant_map
        if 'Comfort Colors' in productName or 'Comfort colors' in productName or 'Comfort Color' in productName:
            sub_mapping = comfort_variant_map

        variation_id = map_variant(variation, sub_mapping, color_fix, size_fix)['variant_id']
        if not variation_id:
            sub_mapping = gildan_variant_map
            variation_id = map_variant(variation, sub_mapping, color_fix, size_fix)['variant_id']
            if not variation_id:
                print(f"Warning: No variant ID found for variation '{variation}' in order '{order_id}'")
                continue

        if order_id not in tiktok_order_map:
            tiktok_order_map[order_id] = {}
        order_detail = {
            'productName': order['Product Name'],
            'sku': order['SKU ID'],
        }

        tiktok_order_map[order_id][variation_id] = order_detail
    
    rows = []
    sku_dict = {}
    product_name_dict = {}
    for key, value in tiktok_order_map.items():
        if key not in flash_ship_data:
            print(f"Warning: Order ID '{key}' not found in Flashship data")
            continue
        for variant_id, order_detail in value.items():
            if variant_id not in flash_ship_data[key]:
                print(f"Warning: Variant ID '{variant_id}' for Order ID '{key}' not found in Flashship data")
                continue
            product_name = order_detail['productName']
            sku = str(order_detail['sku'])
            if sku not in sku_dict:
                sku_dict[sku] = True
            else:
                print(f"Duplicate SKU found: {sku}")
                continue

            flashpod_detail = flash_ship_data[key][variant_id]

            row = {
                'Design Names': product_name,
                'Design Image Link': flashpod_detail['front_print_url'].replace('uc?id=', 'file/d/') if flashpod_detail['front_print_url'] else '',
                'Design Image': '',
                'Mockup Image Link': flashpod_detail['mockup_front'].replace('uc?id=', 'file/d/') if flashpod_detail['mockup_front'] else '',
                'Mockup Image': '',
                'Back Design Link': flashpod_detail['back_print_url'].replace('uc?id=', 'file/d/') if flashpod_detail['back_print_url'] else '',
                'Back Design Image': '',
                'Back Mockup Link': flashpod_detail['mockup_back'].replace('uc?id=', 'file/d/') if flashpod_detail['mockup_back'] else '',
                'Back Mockup Image': '',
                'SKU ID': sku
            }
            rows.append(row)
    df = pd.DataFrame(rows)
    df.to_excel('design_list_table_with_sku.xlsx', index=False)


if __name__ == "__main__":
    #create_design_list_table()
    create_design_list_table()
