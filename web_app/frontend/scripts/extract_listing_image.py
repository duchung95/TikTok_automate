# This script will read the listing with image from Tiktok Shop.
# You will need to go to Tiktok shop, select Bulk Edit, then select "Select Filtered" under the
# Select Order (don't select anything) as this will select all Listings.
# After that, extract the 3 columns: Product Name, Main Image, Image 2 and save to the Listing_with_images.csv.
# Run this script and you will get the listing_images.json that will allow useOrdersStore.ts to
# read and map the product name of the orders to the listing.
import os 
import sys 
import pandas as pd 
import json 

file_name = 'Listing_with_images.csv'
def extract_listing_images():
    df = pd.read_csv(file_name)
    json_result = {}
    for index, row in df.iterrows():
        product_name = row['Product Name']
        product_name = product_name.replace(' - Hnh Design Apperal', '')
        product_name = product_name.replace('- Hnh Design Apperal', '')
        product_name = product_name.replace(' - HnhDesign Clothing', '')
        product_name = product_name.replace('- HnhDesign Clothing', '')
        product_name = product_name.rstrip(' ')
        product_name = product_name.rstrip(',')
        print(product_name)
        main_image_url = row['Image1']
        if pd.notna(main_image_url):
            json_result[product_name] = main_image_url

    with open('listing_images.json', 'w') as json_file:
        json.dump(json_result, json_file, indent=4)

if __name__ == "__main__":
    extract_listing_images()