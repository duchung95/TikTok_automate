import pandas as pd
from datetime import datetime

# Load the CSV data
file_path = '/Users/hungnguyen/Desktop/TiktokShop/web_app/frontend/scripts/all_order.csv'
df = pd.read_csv(file_path)

df = df[~df['Product Name'].str.startswith('Voucher')]

# Convert 'Created Time' to datetime
df['Created Time'] = pd.to_datetime(df['Created Time'])

# --- Weekly Order Trend ---
df_indexed = df.set_index('Created Time')
weekly_orders = df_indexed.resample('W-SUN').size() # 'W-SUN' means weeks start on Monday and end on Sunday
weekly_growth = weekly_orders.pct_change().fillna(0) * 100

print("===========================================")
print("WEEKLY ORDER TREND")
print("===========================================")
for week_end, total_orders in weekly_orders.items():
    week_start = week_end - pd.Timedelta(days=6)
    growth = weekly_growth.get(week_end, 0)
    growth_str = f"(+{growth:.2f}%)" if growth > 0 else f"({growth:.2f}%)"
    
    # Don't show growth for the very first week
    if week_end == weekly_orders.index[0]:
        print(f"Week of {week_start.strftime('%Y-%m-%d')}: {total_orders} orders (First Week)")
    else:
        print(f"Week of {week_start.strftime('%Y-%m-%d')}: {total_orders} orders {growth_str}")

# Define days of week order
days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
df['Day'] = pd.Categorical(df['Created Time'].dt.day_name(), categories=days_order, ordered=True)

# Define 3-hour period bins and labels (0 to 24 hours, step by 3)
bins = list(range(0, 25, 3))
labels = ['0-3 AM', '3-6 AM', '6-9 AM', '9-12 PM', '12-3 PM', '3-6 PM', '6-9 PM', '9-12 AM']
df['Time Period'] = pd.cut(df['Created Time'].dt.hour, bins=bins, right=False, labels=labels)

# Group by day and time period
time_day_distribution = df.groupby(['Day', 'Time Period'], observed=False).size().unstack(fill_value=0)

# --- Total orders by 3-hour period ---
period_counts = df['Time Period'].value_counts().sort_index()

print("\n===========================================")
print("TOTAL ORDERS BY 3-HOUR PERIOD")
print("===========================================")
for period, count in period_counts.items():
    print(f"- {period}: {count} orders")


# Display total orders by day of week
order_counts = df['Day'].value_counts().sort_index()
print("\n===========================================")
print("TOTAL ORDERS BY DAY OF WEEK")
print("===========================================")
for day, count in order_counts.items():
    print(f"{day}: {count} orders")

# Display the 3-hour period breakdown for each day
print("\n===========================================")
print("ORDER BREAKDOWN BY DAY AND 3-HOUR PERIOD")
print("===========================================")
for day in days_order:
    print(f"\n{day}:")
    for period in labels:
        count = time_day_distribution.loc[day, period]
        print(f"  - {period}: {count} orders")