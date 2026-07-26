import os
import json 
import pandas as pd 
llc_tt_order = 'all_llc_order.csv'
llc_regular_order = 'all_order_regular.csv'

def extract_best_seller_keywords(data, KEYWORDS):
    data2 = data[data['Product Name'].str.contains(KEYWORDS, case=False, na=False)]
    data2['color_name'] = data2['Variation'].str.split(',').str[0]

    halloween_best_sellers = (
        data2.groupby(['Product Name'])['Quantity']
        .sum()
        .nlargest(20)
        .reset_index()
        .rename(columns={'Quantity': 'total_sold'})
    )
    pd.set_option('display.max_colwidth', None)
    for i, row in halloween_best_sellers.iterrows():
        print(f"{i+1}. [{row['total_sold']} sold] {row['Product Name']}")
    print("------------------------------------------------------------------------------------")

def extract_best_seller():
    data = pd.read_csv(llc_regular_order)
    drop_status_list = ['Canceled']
    data = data[~data['Order Status'].isin(drop_status_list)]
    data = data[~data['Product Name'].str.startswith('Voucher', na=False)]

    KEYWORDS = r'back to school|teacher'
    extract_best_seller_keywords(data, KEYWORDS)
    KEYWORDS = r'halloween|spooky|pumpkin|ghost|witch|candy|costume|Halloween'
    extract_best_seller_keywords(data, KEYWORDS)
    KEYWORDS = r'nurse|goose|duck'
    extract_best_seller_keywords(data, KEYWORDS)

    KEYWORDS = r''
    extract_best_seller_keywords(data, KEYWORDS)
    

    data['color_name'] = data['Variation'].str.split(',').str[0]
    color_best_sellers = (
        data.groupby(['color_name'])['Quantity']
        .sum()
        .nlargest(10)
        .reset_index()
        .rename(columns={'Quantity': 'total_sold'})
    )
    pd.set_option('display.max_colwidth', None)
    print(color_best_sellers.to_string(index=False))


if __name__ == "__main__":
    extract_best_seller()
