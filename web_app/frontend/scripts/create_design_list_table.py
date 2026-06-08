# This script is written to combine the Flashship API data order with TikTok order data 
# to create the design list table that mapping the product name on tiktok with the design image url 
# and the mockup image url and will create a Excel at the end of the process. You can copy and paste 
# the result from the Excel to the design list on the Google Drive 

import pandas as pd 
import json 

#extract using Flashship API for list of partners list id 
# and make it format like page1, page2 since each API call only 
# have 20 order ids max 
flashship_order_json = 'flaship_order.json' 

all_orders = 'order-2026-06-07-15_32.csv' # you have to order from tiktok order exports
variant_mapping = 'flashship_mapping.json'
def create_design_list_table():
    # Load the JSON data
    with open(flashship_order_json, 'r') as f:
        flashship_data = json.load(f)

    with open(variant_mapping, 'r') as f:
        variant_data = json.load(f)
        variant_map_obj = variant_data['variant_map']

    variant_map_obj_invert = {value: key for key, value in variant_map_obj.items()}

    order_data = pd.read_csv(all_orders)

    tiktok_df = pd.read_csv(all_orders)
    tiktok_df = tiktok_df[~tiktok_df['Product Name'].str.startswith('Voucher', na=False)]

    variant_replacement = {
        '2XL': 'XXL',
        '3XL': 'XXXL',
        '4XL': 'XXXXL'
    }

    flash_ship_data = []

    product_name_list = {}
    for key, value in flashship_data.items():
        # Process each order and extract relevant information
        for order in value['data']:
            order_id = order['partner_order_id'].replace("HD - ", "")
            products = order['products']
            for product in products:
                variant_id = product['variant_id']
                variant_name = variant_map_obj_invert.get(variant_id, '')

                if variant_name == '':
                    continue

                # Making sure that variant names are consistent between our mapping
                # and with the one on TikTok because the one on Tiktok has spelling issues
                variant_name = variant_name.replace('2XL', 'XXL')
                variant_name = variant_name.replace('3XL', 'XXXL')
                variant_name = variant_name.replace('4XL', 'XXXXL')
                variant_name = variant_name.replace('Watermelon', 'Water Melon')
                variant_name = variant_name.replace('Ivory', 'Irovy')
                variant_name = variant_name.replace('Crunch Berry', 'Crunchberry')
                variant_name = variant_name.replace('Chambray', 'Charmbay')

                # Match by Order ID and Variation (both normalised to str for safety)
                matched_rows = tiktok_df[
                    (tiktok_df['Order ID'].astype(str) == str(order_id)) &
                    (tiktok_df['Variation'] == variant_name)
                ]
                product_name = matched_rows['Product Name'].iloc[0] if not matched_rows.empty else ''

                if product_name == '':
                    continue

                if product_name in product_name_list:
                    continue
                else:
                    product_name_list[product_name] = True

                # Replacing the uc?id= in flashship URL with the file/d/ so it can be read on drive 
                flash_ship_data.append({
                    'product_name': product_name,
                    'front_image_url': product['front_print_url'].replace('uc?id=', 'file/d/') if product['front_print_url'] else '',
                    'front_image': '',
                    'mockup_image_url': product['mockup_front'].replace('uc?id=', 'file/d/') if product['mockup_front'] else '',
                    'mockup_image': ''
                })

    # Save the DataFrame to a CSV file
    df = pd.DataFrame(flash_ship_data)
    df.to_excel('design_list_table2.xlsx', index=False)

if __name__ == "__main__":
    create_design_list_table()