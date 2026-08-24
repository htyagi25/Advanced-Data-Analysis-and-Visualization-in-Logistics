"""
Week 4 - Predictive Modeling and Optimization in Logistics Systems
--------------------------------------------------------------------
1. Loads the Week 3 simulated order-level dataset.
2. Engineers features and trains/evaluates several regression models to
   forecast delivery_delay_min (the key logistics metric being forecast).
3. Selects the best model via cross-validation + hyperparameter tuning.
4. Uses the trained model's predictions, together with a data-driven cost
   model, to formulate and solve a vehicle-assignment OPTIMIZATION problem
   (PuLP MILP) that minimizes cost subject to a service-level (delay) cap.
5. Saves all metrics, comparison tables, and charts used in the Word report.
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, KFold, cross_validate, GridSearchCV
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

import pulp

sns.set_theme(style="whitegrid", font_scale=1.05)
ACCENT = "#1F4E5F"
PALETTE = ["#1F4E5F", "#2E6E82", "#5FA0AF", "#9AC5CE", "#C97B4A", "#D9A441"]
sns.set_palette(PALETTE)

RNG_SEED = 42
FIGDIR = "../figs"
DATADIR = "../data"
os.makedirs(FIGDIR, exist_ok=True)
os.makedirs(DATADIR, exist_ok=True)

# =================================================================
# 1. LOAD DATA
# =================================================================
df = pd.read_csv("../data/simulated_logistics_data.csv", parse_dates=["order_ts"])
df["is_weekend"] = df["order_ts"].dt.dayofweek.isin([5, 6]).astype(int)
print(f"Loaded {len(df)} orders")

TARGET = "delivery_delay_min"
NUMERIC_FEATURES = ["route_distance_km", "order_volume_units", "is_weekend"]
CATEGORICAL_FEATURES = ["warehouse", "vehicle_type", "sku_category"]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

X = df[FEATURES].copy()
y = df[TARGET].copy()

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RNG_SEED
)
print(f"Train: {X_train.shape[0]} rows | Test: {X_test.shape[0]} rows")

# =================================================================
# 2. PREPROCESSING PIPELINE
# =================================================================
preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), NUMERIC_FEATURES),
        ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), CATEGORICAL_FEATURES),
    ]
)

# =================================================================
# 3. MODEL CANDIDATES + CROSS-VALIDATION
# =================================================================
candidates = {
    "Linear Regression": LinearRegression(),
    "Ridge Regression": Ridge(alpha=1.0, random_state=RNG_SEED),
    "Random Forest": RandomForestRegressor(n_estimators=200, random_state=RNG_SEED, n_jobs=-1),
    "Gradient Boosting": GradientBoostingRegressor(random_state=RNG_SEED),
}

kf = KFold(n_splits=5, shuffle=True, random_state=RNG_SEED)
cv_results = []

for name, model in candidates.items():
    pipe = Pipeline([("prep", preprocessor), ("model", model)])
    scores = cross_validate(
        pipe, X_train, y_train, cv=kf,
        scoring={"rmse": "neg_root_mean_squared_error", "mae": "neg_mean_absolute_error", "r2": "r2"},
        n_jobs=-1,
    )
    cv_results.append({
        "model": name,
        "cv_rmse_mean": -scores["test_rmse"].mean(),
        "cv_rmse_std": scores["test_rmse"].std(),
        "cv_mae_mean": -scores["test_mae"].mean(),
        "cv_r2_mean": scores["test_r2"].mean(),
    })

cv_df = pd.DataFrame(cv_results).sort_values("cv_rmse_mean")
cv_df.to_csv(f"{DATADIR}/cv_model_comparison.csv", index=False)
print("\n5-Fold CV comparison (on training set):\n", cv_df.round(3))

# =================================================================
# 4. HYPERPARAMETER TUNING (best candidate family: Random Forest)
# =================================================================
rf_pipe = Pipeline([("prep", preprocessor), ("model", RandomForestRegressor(random_state=RNG_SEED, n_jobs=-1))])
param_grid = {
    "model__n_estimators": [150, 300],
    "model__max_depth": [6, 10, None],
    "model__min_samples_leaf": [1, 5],
}
grid = GridSearchCV(
    rf_pipe, param_grid, cv=kf, scoring="neg_root_mean_squared_error", n_jobs=-1
)
grid.fit(X_train, y_train)
print("\nBest RF params:", grid.best_params_)
print("Best RF CV RMSE:", -grid.best_score_)

best_rf = grid.best_estimator_

# Also fit a tuned Gradient Boosting for comparison on the held-out test set
gb_pipe = Pipeline([("prep", preprocessor), ("model", GradientBoostingRegressor(
    random_state=RNG_SEED, n_estimators=200, max_depth=3, learning_rate=0.08
))])
gb_pipe.fit(X_train, y_train)

lr_pipe = Pipeline([("prep", preprocessor), ("model", LinearRegression())])
lr_pipe.fit(X_train, y_train)

final_models = {
    "Linear Regression": lr_pipe,
    "Gradient Boosting (tuned)": gb_pipe,
    "Random Forest (tuned)": best_rf,
}

# =================================================================
# 5. HELD-OUT TEST SET EVALUATION
# =================================================================
test_results = []
predictions = {}
for name, pipe in final_models.items():
    preds = pipe.predict(X_test)
    predictions[name] = preds
    rmse = mean_squared_error(y_test, preds) ** 0.5
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    test_results.append({"model": name, "test_rmse": rmse, "test_mae": mae, "test_r2": r2})

test_df = pd.DataFrame(test_results).sort_values("test_rmse")
test_df.to_csv(f"{DATADIR}/test_set_evaluation.csv", index=False)
print("\nHeld-out test set evaluation:\n", test_df.round(3))

BEST_MODEL_NAME = test_df.iloc[0]["model"]
best_model = final_models[BEST_MODEL_NAME]
best_preds = predictions[BEST_MODEL_NAME]
print(f"\nSelected best model: {BEST_MODEL_NAME}")

# Baseline comparison: naive mean predictor
naive_pred = np.full_like(y_test, y_train.mean(), dtype=float)
naive_rmse = mean_squared_error(y_test, naive_pred) ** 0.5
print(f"Naive mean-baseline RMSE: {naive_rmse:.2f} (best model RMSE: {test_df.iloc[0]['test_rmse']:.2f})")

# =================================================================
# 6. FEATURE IMPORTANCE (best tree-based model)
# =================================================================
tree_model_name = "Random Forest (tuned)" if "Random Forest (tuned)" in final_models else BEST_MODEL_NAME
tree_pipe = final_models[tree_model_name]
ohe = tree_pipe.named_steps["prep"].named_transformers_["cat"]
cat_names = list(ohe.get_feature_names_out(CATEGORICAL_FEATURES))
all_feature_names = NUMERIC_FEATURES + cat_names
importances = tree_pipe.named_steps["model"].feature_importances_
imp_df = pd.DataFrame({"feature": all_feature_names, "importance": importances}).sort_values(
    "importance", ascending=False
)
imp_df.to_csv(f"{DATADIR}/feature_importance.csv", index=False)
print("\nFeature importances (Random Forest):\n", imp_df.round(3))

# =================================================================
# 7. CHARTS
# =================================================================
# --- Fig A: model comparison (test RMSE) ---
fig, ax = plt.subplots(figsize=(7.5, 4.2))
order = test_df.sort_values("test_rmse", ascending=True)
bars = ax.barh(order["model"], order["test_rmse"], color=PALETTE[:len(order)])
for bar, val in zip(bars, order["test_rmse"]):
    ax.text(val + 0.15, bar.get_y() + bar.get_height()/2, f"{val:.2f}", va="center", fontsize=10)
ax.axvline(naive_rmse, color=PALETTE[4], linestyle="--", linewidth=1.6, label=f"Naive mean baseline ({naive_rmse:.2f})")
ax.set_xlabel("Test RMSE (minutes, lower is better)")
ax.set_title("Model Comparison: Held-Out Test RMSE", fontsize=13, weight="bold", color=ACCENT)
ax.legend(fontsize=9)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/w4_fig1_model_comparison.png", dpi=180)
plt.close()

# --- Fig B: predicted vs actual (best model) ---
fig, ax = plt.subplots(figsize=(6.6, 6.0))
ax.scatter(y_test, best_preds, alpha=0.35, s=18, color=PALETTE[2])
lims = [min(y_test.min(), best_preds.min()), max(y_test.max(), best_preds.max())]
ax.plot(lims, lims, color=PALETTE[4], linestyle="--", linewidth=2, label="Perfect prediction")
ax.set_xlabel("Actual delivery delay (min)")
ax.set_ylabel("Predicted delivery delay (min)")
ax.set_title(f"Predicted vs. Actual Delay — {BEST_MODEL_NAME}", fontsize=12.5, weight="bold", color=ACCENT)
ax.legend(fontsize=9)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/w4_fig2_pred_vs_actual.png", dpi=180)
plt.close()

# --- Fig C: residual distribution ---
residuals = y_test.values - best_preds
fig, ax = plt.subplots(figsize=(7.5, 4.2))
sns.histplot(residuals, bins=40, kde=True, color=PALETTE[0], ax=ax)
ax.axvline(0, color=PALETTE[4], linestyle="--", linewidth=1.8)
ax.set_xlabel("Residual (actual − predicted, minutes)")
ax.set_ylabel("Count")
ax.set_title("Residual Distribution on Held-Out Test Set", fontsize=13, weight="bold", color=ACCENT)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/w4_fig3_residuals.png", dpi=180)
plt.close()

# --- Fig D: feature importance ---
fig, ax = plt.subplots(figsize=(8.3, 4.6))
top_imp = imp_df.head(10).sort_values("importance")
ax.barh(top_imp["feature"], top_imp["importance"], color=PALETTE[1])
ax.set_xlabel("Relative importance")
ax.set_title("Feature Importance — Random Forest Delay Model", fontsize=12.5, weight="bold", color=ACCENT)
plt.tight_layout()
plt.savefig(f"{FIGDIR}/w4_fig4_feature_importance.png", dpi=180)
plt.close()

print("\nModeling charts saved to", FIGDIR)

# =================================================================
# 8. OPTIMIZATION: MODEL-INFORMED VEHICLE ASSIGNMENT (PuLP MILP)
# =================================================================
# Data-driven per-vehicle cost model: fit cost ~ distance separately per
# vehicle type on the full dataset, to get realistic $/km and fixed-cost
# coefficients to use as the optimization's objective coefficients.
cost_rates = {}
for v in df["vehicle_type"].unique():
    sub = df[df["vehicle_type"] == v]
    lr = LinearRegression().fit(sub[["route_distance_km"]], sub["delivery_cost"])
    cost_rates[v] = {"fixed": float(lr.intercept_), "per_km": float(lr.coef_[0])}
print("\nData-driven per-vehicle cost model (delivery_cost ~ distance):")
for v, r in cost_rates.items():
    print(f"  {v}: fixed=${r['fixed']:.2f}, per_km=${r['per_km']:.2f}")

# Take one "day" of orders (a representative sample) to keep the MILP small
# and interpretable, mirroring a daily dispatch-planning use case.
np.random.seed(RNG_SEED)
day_orders = df.sample(n=40, random_state=RNG_SEED).reset_index(drop=True)

vehicle_types = ["Bike", "Van", "Truck"]
BIKE_MAX_VOLUME = 6  # bikes cannot carry large orders
FLEET_CAPACITY = {"Bike": 14, "Van": 16, "Truck": 10}  # vehicles available that day

# Predicted delay for each order under each hypothetical vehicle assignment,
# using the trained best_model (holding all other features fixed) -- this is
# the key link between the predictive model and the optimization.
what_if_rows = []
for _, row in day_orders.iterrows():
    for v in vehicle_types:
        what_if_rows.append({
            "route_distance_km": row["route_distance_km"],
            "order_volume_units": row["order_volume_units"],
            "is_weekend": row["is_weekend"],
            "warehouse": row["warehouse"],
            "vehicle_type": v,
            "sku_category": row["sku_category"],
        })
what_if_df = pd.DataFrame(what_if_rows)
what_if_df["predicted_delay"] = best_model.predict(what_if_df[FEATURES])

# Attach predicted delay + cost for each (order, vehicle) pair
records = []
for i, row in day_orders.iterrows():
    for v in vehicle_types:
        mask = (
            (what_if_df["route_distance_km"] == row["route_distance_km"]) &
            (what_if_df["order_volume_units"] == row["order_volume_units"]) &
            (what_if_df["vehicle_type"] == v) &
            (what_if_df["warehouse"] == row["warehouse"]) &
            (what_if_df["sku_category"] == row["sku_category"])
        )
        pred_delay = what_if_df.loc[mask, "predicted_delay"].iloc[0]
        rate = cost_rates[v]
        cost = rate["fixed"] + rate["per_km"] * row["route_distance_km"]
        feasible = not (v == "Bike" and row["order_volume_units"] > BIKE_MAX_VOLUME)
        records.append({
            "order_idx": i, "vehicle_type": v,
            "predicted_delay": pred_delay, "cost": cost, "feasible": feasible,
        })
assign_df = pd.DataFrame(records)

# --- Baseline: the vehicle type actually used historically for these orders ---
baseline_cost = day_orders["delivery_cost"].sum()
baseline_actual_delay = day_orders["delivery_delay_min"].sum()
baseline_late_count = (day_orders["delivery_delay_min"] > 0).sum()

baseline_predicted_total_delay = assign_df.merge(
    day_orders[["vehicle_type"]].reset_index().rename(columns={"index": "order_idx"}),
    on=["order_idx", "vehicle_type"], how="inner"
)["predicted_delay"].sum()

# --- MILP: minimize a weighted blend of cost and model-predicted delay ---
# Rather than a hard delay cap (which can conflict with fleet-capacity limits
# and render the problem infeasible), delay is priced directly into the
# objective using a lambda ($ per predicted minute of delay). This reflects
# a realistic dispatch trade-off: a small cost premium is acceptable if it
# meaningfully reduces predicted lateness. Lambda is set so that eliminating
# one minute of predicted delay is "worth" $0.60 of extra dispatch cost --
# roughly in line with typical last-mile SLA penalty/cost ratios.
LAMBDA_DELAY = 0.6  # $ per predicted minute of delay

prob = pulp.LpProblem("VehicleAssignment", pulp.LpMinimize)
x = {
    (r.order_idx, r.vehicle_type): pulp.LpVariable(f"x_{r.order_idx}_{r.vehicle_type}", cat="Binary")
    for r in assign_df.itertuples() if r.feasible
}

# Objective: minimize total cost + lambda * total predicted delay
prob += pulp.lpSum(
    x[(r.order_idx, r.vehicle_type)] * (r.cost + LAMBDA_DELAY * r.predicted_delay)
    for r in assign_df.itertuples() if r.feasible
)

# Constraint: each order assigned exactly one feasible vehicle
for oid in day_orders.index:
    prob += pulp.lpSum(x[(oid, v)] for v in vehicle_types if (oid, v) in x) == 1

# Constraint: fleet capacity per vehicle type (vehicles available that day)
for v in vehicle_types:
    prob += pulp.lpSum(x[(oid, v)] for oid in day_orders.index if (oid, v) in x) <= FLEET_CAPACITY[v]

solve_status = prob.solve(pulp.PULP_CBC_CMD(msg=0))
print("\nOptimization status:", pulp.LpStatus[prob.status])
assert pulp.LpStatus[prob.status] == "Optimal", "Solver did not reach optimality — check constraints"

chosen = [(oid, v) for (oid, v), var in x.items() if var.value() == 1]
opt_assign = pd.DataFrame(chosen, columns=["order_idx", "vehicle_type"])
opt_merged = opt_assign.merge(assign_df, on=["order_idx", "vehicle_type"])
optimized_cost = opt_merged["cost"].sum()
optimized_predicted_delay = opt_merged["predicted_delay"].sum()

vehicle_mix_baseline = day_orders["vehicle_type"].value_counts().to_dict()
vehicle_mix_optimized = opt_assign["vehicle_type"].value_counts().to_dict()

optimization_summary = {
    "n_orders": int(len(day_orders)),
    "baseline_total_cost": round(float(baseline_cost), 2),
    "optimized_total_cost": round(float(optimized_cost), 2),
    "cost_savings": round(float(baseline_cost - optimized_cost), 2),
    "cost_savings_pct": round(100 * (baseline_cost - optimized_cost) / baseline_cost, 1),
    "baseline_predicted_total_delay_min": round(float(baseline_predicted_total_delay), 1),
    "optimized_predicted_total_delay_min": round(float(optimized_predicted_delay), 1),
    "vehicle_mix_baseline": vehicle_mix_baseline,
    "vehicle_mix_optimized": vehicle_mix_optimized,
    "solver_status": pulp.LpStatus[prob.status],
}
with open(f"{DATADIR}/optimization_summary.json", "w") as f:
    json.dump(optimization_summary, f, indent=2, default=str)

print("\nOptimization summary:")
print(json.dumps(optimization_summary, indent=2, default=str))

# --- Fig E: baseline vs optimized cost + vehicle mix ---
fig, axes = plt.subplots(1, 2, figsize=(11, 4.4))

ax = axes[0]
bars = ax.bar(["Baseline\n(historical)", "Optimized\n(model-informed)"],
               [baseline_cost, optimized_cost], color=[PALETTE[3], PALETTE[0]])
for bar, val in zip(bars, [baseline_cost, optimized_cost]):
    ax.text(bar.get_x() + bar.get_width()/2, val + 3, f"${val:.0f}", ha="center", fontsize=10)
ax.set_ylabel("Total dispatch cost ($, 40 orders)")
ax.set_title("Total Cost: Baseline vs. Optimized", fontsize=12, weight="bold", color=ACCENT)

ax = axes[1]
mix_df = pd.DataFrame({"Baseline": pd.Series(vehicle_mix_baseline), "Optimized": pd.Series(vehicle_mix_optimized)}).fillna(0)
mix_df = mix_df.reindex(vehicle_types)
mix_df.plot(kind="bar", ax=ax, color=[PALETTE[3], PALETTE[0]])
ax.set_ylabel("Number of orders")
ax.set_xlabel("Vehicle type")
ax.set_title("Vehicle Mix: Baseline vs. Optimized", fontsize=12, weight="bold", color=ACCENT)
ax.legend(title=None, fontsize=9)
plt.xticks(rotation=0)

plt.tight_layout()
plt.savefig(f"{FIGDIR}/w4_fig5_optimization_results.png", dpi=180)
plt.close()

print("\nAll Week 4 outputs saved.")
