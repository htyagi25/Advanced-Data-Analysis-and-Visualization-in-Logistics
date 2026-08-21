import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
from scipy import stats

sns.set_theme(style="whitegrid", font_scale=1.05)
ACCENT = "#1F4E5F"
PALETTE = ["#1F4E5F", "#2E6E82", "#5FA0AF", "#9AC5CE", "#C97B4A", "#D9A441"]
sns.set_palette(PALETTE)

rng = np.random.default_rng(42)

# ---------------------------------------------------------------
# 1. SIMULATE DATASET
# ---------------------------------------------------------------
N = 3000
warehouses = np.array(["W1 - North", "W2 - Central", "W3 - South"])
warehouse_probs = [0.42, 0.35, 0.23]
vehicle_types = np.array(["Van", "Bike", "Truck"])
vehicle_probs = [0.55, 0.30, 0.15]

start_date = pd.Timestamp("2026-05-01")
order_ts = start_date + pd.to_timedelta(rng.integers(0, 90, N), unit="D") + \
           pd.to_timedelta(rng.integers(0, 24 * 60, N), unit="m")

warehouse = rng.choice(warehouses, size=N, p=warehouse_probs)
vehicle_type = rng.choice(vehicle_types, size=N, p=vehicle_probs)

# distance depends on warehouse (W3 - South serves a more spread-out region)
base_distance = {"W1 - North": 8, "W2 - Central": 6, "W3 - South": 12}
distance = np.array([
    max(0.5, rng.gamma(shape=2.2, scale=base_distance[w] / 2.2)) for w in warehouse
])

# order volume (units)
order_volume = rng.poisson(lam=4, size=N) + 1

# transportation cost: base + per-km + per-unit + vehicle premium + noise
vehicle_premium = {"Van": 1.0, "Bike": 0.55, "Truck": 1.8}
cost = (
    3.5
    + distance * 0.85 * np.array([vehicle_premium[v] for v in vehicle_type])
    + order_volume * 0.6
    + rng.normal(0, 1.5, N)
)
cost = np.clip(cost, 2, None)

# delivery delay (minutes): driven by distance, volume, warehouse congestion, some randomness
warehouse_congestion = {"W1 - North": 4, "W2 - Central": 12, "W3 - South": 2}
delay_min = (
    -39
    + distance * 1.9
    + order_volume * 0.8
    + np.array([warehouse_congestion[w] for w in warehouse])
    + rng.normal(0, 9, N)
)
# weekend effect: deliveries placed on weekends run later
is_weekend = pd.DatetimeIndex(order_ts).dayofweek.isin([5, 6])
delay_min = delay_min + is_weekend * 7

delivery_delay_min = np.round(delay_min, 1)
on_time = delivery_delay_min <= 0

# inject some missing + outlier values to mirror Week 2 cleaning realism (already "cleaned" here)
sku_category = rng.choice(
    ["Electronics", "Apparel", "Home & Kitchen", "Grocery", "Personal Care"],
    size=N, p=[0.18, 0.24, 0.20, 0.23, 0.15]
)

df = pd.DataFrame({
    "order_id": [f"ORD{100000+i}" for i in range(N)],
    "order_ts": order_ts,
    "warehouse": warehouse,
    "vehicle_type": vehicle_type,
    "sku_category": sku_category,
    "route_distance_km": np.round(distance, 2),
    "order_volume_units": order_volume,
    "delivery_cost": np.round(cost, 2),
    "delivery_delay_min": delivery_delay_min,
    "on_time": on_time,
})
df["order_date"] = df["order_ts"].dt.date
df["month"] = df["order_ts"].dt.to_period("M").astype(str)
df["week"] = df["order_ts"].dt.to_period("W").apply(lambda r: r.start_time)

df.to_csv("../data/simulated_logistics_data.csv", index=False)
print("Dataset shape:", df.shape)
print(df.head())

# ---------------------------------------------------------------
# 2. DESCRIPTIVE STATISTICS
# ---------------------------------------------------------------
desc = df[["route_distance_km", "order_volume_units", "delivery_cost", "delivery_delay_min"]].describe().T
desc["skew"] = df[["route_distance_km", "order_volume_units", "delivery_cost", "delivery_delay_min"]].skew()
desc.to_csv("../data/descriptive_stats.csv")
print("\nDescriptive statistics:\n", desc)

otd_rate = df["on_time"].mean()
otd_by_wh = df.groupby("warehouse")["on_time"].mean().sort_values()
print("\nOverall OTD rate: {:.1%}".format(otd_rate))
print("OTD by warehouse:\n", otd_by_wh)

corr_cols = ["route_distance_km", "order_volume_units", "delivery_cost", "delivery_delay_min"]
corr = df[corr_cols].corr()
corr.to_csv("../data/correlation_matrix.csv")
print("\nCorrelation matrix:\n", corr)

# ANOVA: does OTD differ significantly by warehouse?
groups = [g["delivery_delay_min"].values for _, g in df.groupby("warehouse")]
f_stat, p_val = stats.f_oneway(*groups)
print(f"\nANOVA on delay by warehouse: F={f_stat:.2f}, p={p_val:.5f}")

# Pearson correlation significance: distance vs delay
r_val, p_corr = stats.pearsonr(df["route_distance_km"], df["delivery_delay_min"])
print(f"Pearson r (distance vs delay) = {r_val:.3f}, p={p_corr:.2e}")

# ---------------------------------------------------------------
# 3. VISUALIZATIONS
# ---------------------------------------------------------------
FIGDIR = "../figs"
import os
os.makedirs(FIGDIR, exist_ok=True)

# --- Fig 1: Distribution of delivery delay (histogram + KDE) ---
fig, ax = plt.subplots(figsize=(7.5, 4.3))
sns.histplot(df["delivery_delay_min"], bins=40, kde=True, color=PALETTE[0], ax=ax)
ax.axvline(0, color=PALETTE[4], linestyle="--", linewidth=1.8, label="Promised deadline (0 min)")
ax.set_xlabel("Delivery delay (minutes; negative = early)")
ax.set_ylabel("Number of orders")
ax.set_title("Distribution of Delivery Delay Across All Orders", fontsize=13, weight="bold", color=ACCENT)
ax.legend()
plt.tight_layout()
plt.savefig(f"{FIGDIR}/fig1_delay_distribution.png", dpi=180)
plt.close()

# --- Fig 2: On-time delivery rate by warehouse (bar chart) ---
fig, ax = plt.subplots(figsize=(7.5, 4.0))
otd_sorted = (df.groupby("warehouse")["on_time"].mean() * 100).sort_values()
bars = ax.barh(otd_sorted.index, otd_sorted.values, color=PALETTE[:3][::-1])
for bar, val in zip(bars, otd_sorted.values):
    ax.text(val + 0.6, bar.get_y() + bar.get_height()/2, f"{val:.1f}%", va="center", fontsize=10)
ax.set_xlabel("On-time delivery rate (%)")
ax.set_title("On-Time Delivery Rate by Warehouse", fontsize=13, weight="bold", color=ACCENT)
ax.set_xlim(0, max(otd_sorted.values) + 8)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/fig2_otd_by_warehouse.png", dpi=180)
plt.close()

# --- Fig 3: Boxplot of delivery cost by vehicle type ---
fig, ax = plt.subplots(figsize=(7.5, 4.3))
order_vt = df.groupby("vehicle_type")["delivery_cost"].median().sort_values().index
sns.boxplot(data=df, x="vehicle_type", y="delivery_cost", order=order_vt, hue="vehicle_type",
            legend=False, palette=PALETTE[:3], ax=ax)
ax.set_xlabel("Vehicle type")
ax.set_ylabel("Delivery cost ($)")
ax.set_title("Delivery Cost Distribution by Vehicle Type", fontsize=13, weight="bold", color=ACCENT)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/fig3_cost_by_vehicle.png", dpi=180)
plt.close()

# --- Fig 4: Scatter - distance vs delay with regression line ---
fig, ax = plt.subplots(figsize=(7.5, 4.5))
sns.regplot(
    data=df.sample(900, random_state=1), x="route_distance_km", y="delivery_delay_min",
    scatter_kws={"alpha": 0.35, "s": 18, "color": PALETTE[2]},
    line_kws={"color": PALETTE[4], "linewidth": 2.2},
    ax=ax,
)
ax.axhline(0, color="grey", linestyle=":", linewidth=1)
ax.set_xlabel("Route distance (km)")
ax.set_ylabel("Delivery delay (minutes)")
ax.set_title(f"Route Distance vs. Delivery Delay  (r = {r_val:.2f})", fontsize=13, weight="bold", color=ACCENT)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/fig4_distance_vs_delay.png", dpi=180)
plt.close()

# --- Fig 5: Correlation heatmap ---
fig, ax = plt.subplots(figsize=(6.2, 5.2))
sns.heatmap(
    corr, annot=True, fmt=".2f", cmap="Blues", vmin=-1, vmax=1, square=True,
    cbar_kws={"shrink": 0.8}, linewidths=0.5, linecolor="white", ax=ax
)
ax.set_title("Correlation Matrix: Key Operational Variables", fontsize=13, weight="bold", color=ACCENT)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/fig5_correlation_heatmap.png", dpi=180)
plt.close()

# --- Fig 6: Weekly shipment volume trend (line chart) by warehouse ---
weekly = df.groupby(["week", "warehouse"]).size().reset_index(name="orders")
fig, ax = plt.subplots(figsize=(8.2, 4.3))
for i, wh in enumerate(warehouses):
    sub = weekly[weekly["warehouse"] == wh]
    ax.plot(sub["week"], sub["orders"], marker="o", markersize=3.5, linewidth=1.8, label=wh, color=PALETTE[i])
ax.set_xlabel("Week")
ax.set_ylabel("Shipment volume (orders)")
ax.set_title("Weekly Shipment Volume Trend by Warehouse", fontsize=13, weight="bold", color=ACCENT)
ax.legend(title=None, loc="upper left", fontsize=9)
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
fig.autofmt_xdate(rotation=30)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/fig6_weekly_volume_trend.png", dpi=180)
plt.close()

# --- Fig 7: Average cost per SKU category (bar) ---
fig, ax = plt.subplots(figsize=(7.5, 4.2))
cat_cost = df.groupby("sku_category")["delivery_cost"].mean().sort_values(ascending=False)
bars = ax.bar(cat_cost.index, cat_cost.values, color=PALETTE[1])
for bar, val in zip(bars, cat_cost.values):
    ax.text(bar.get_x() + bar.get_width()/2, val + 0.15, f"${val:.2f}", ha="center", fontsize=9)
ax.set_ylabel("Average delivery cost ($)")
ax.set_title("Average Delivery Cost by Product Category", fontsize=13, weight="bold", color=ACCENT)
plt.xticks(rotation=15)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/fig7_cost_by_category.png", dpi=180)
plt.close()

print("\nAll figures saved to", FIGDIR)
print(os.listdir(FIGDIR))
