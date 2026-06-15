import pandas as pd
from datetime import datetime

# Load the CSV data
file_path = '/Users/hungnguyen/Desktop/TiktokShop/web_app/frontend/scripts/order-2026-06-07-15_32.csv'
df = pd.read_csv(file_path)

df = df[~df['Product Name'].str.startswith('Voucher')]

# Convert 'Created Time' to datetime

df['Created Time'] = pd.to_datetime(df['Created Time'])

# Define time periods
periods = {
    '0-6 AM': (0, 6),
    '6-12 PM': (6, 12),
    '12-6 PM': (12, 18),
    '6 PM-0 AM': (18, 24)
}

# Function to categorize time into periods

def categorize_time(row):
    hour = row.hour
    for period, (start, end) in periods.items():
        if start <= hour < end:
            return period
    return None

# Apply categorization

df['Time Period'] = df['Created Time'].apply(categorize_time)

# Group by day of the week and time period

df['Day'] = df['Created Time'].dt.day_name()
day_period_counts = df.groupby(['Day', 'Time Period']).size().unstack(fill_value=0)

# Find the most common time period for each day
most_common_periods = day_period_counts.idxmax(axis=1)

# Display the results
print(most_common_periods)

def count_orders_by_day(df):
    # Convert 'Created Time' to datetime
    df['Created Time'] = pd.to_datetime(df['Created Time'])
    
    # Extract the day of the week and count orders
    order_counts = df['Created Time'].dt.day_name().value_counts().sort_index()
    
    # Print the total orders for each day
    print("Total orders by day:")
    for day, count in order_counts.items():
        print(f"{day}: {count}")

# Call the function after loading the DataFrame
count_orders_by_day(df)

# Initialize counters for each time period
period_counts = {'0-6AM': 0, '6AM-12PM': 0, '12PM-6PM': 0, '6PM-0AM': 0}

# Categorize orders by time period
for index, row in df.iterrows():
    order_time = row['Created Time'].time()
    if order_time >= datetime.strptime('00:00', '%H:%M').time() and order_time < datetime.strptime('06:00', '%H:%M').time():
        period_counts['0-6AM'] += 1
    elif order_time >= datetime.strptime('06:00', '%H:%M').time() and order_time < datetime.strptime('12:00', '%H:%M').time():
        period_counts['6AM-12PM'] += 1
    elif order_time >= datetime.strptime('12:00', '%H:%M').time() and order_time < datetime.strptime('18:00', '%H:%M').time():
        period_counts['12PM-6PM'] += 1
    else:
        period_counts['6PM-0AM'] += 1

# Print out the results
print("Total orders by time period:")
for period, count in period_counts.items():
    print(f"{period}: {count} orders")