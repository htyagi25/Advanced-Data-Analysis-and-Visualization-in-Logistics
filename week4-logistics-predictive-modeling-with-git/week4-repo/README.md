# Logistics Week 4 — Predictive Modeling & Optimization

Python + Node.js pipeline that forecasts last-mile delivery delay with several
regression models, cross-validates and tunes them, evaluates the finalists on a
held-out test set, and then feeds the winning model's own predictions into a
mixed-integer optimization (PuLP) that assigns vehicles to a day's deliveries to
minimize cost under a service-level trade-off. Results are assembled into a
formatted Word (`.docx`) report.

This is the Week 4 deliverable for a logistics analytics project (predictive
modeling and optimization phase). It builds on a prior dataset-simulation and
exploratory-analysis phase — a static copy of that dataset is included in
`data/` so this repo runs standalone.

## What it does

### 1. `src/model_and_optimize.py`

**Predictive modeling — forecasting `delivery_delay_min`:**
- Loads the order-level dataset (3,000 simulated last-mile deliveries: warehouse,
  vehicle type, product category, route distance, order volume, delivery cost,
  delivery delay).
- Engineers features (standardizes numeric features, one-hot encodes categoricals,
  derives a weekend flag) inside a single scikit-learn `Pipeline` to avoid data
  leakage during cross-validation.
- Trains and 5-fold cross-validates four candidate models: Linear Regression,
  Ridge Regression, Random Forest, and Gradient Boosting.
- Tunes Random Forest hyperparameters via `GridSearchCV` (n_estimators, max_depth,
  min_samples_leaf).
- Evaluates all finalists once on a held-out 20% test set (RMSE, MAE, R²) and
  selects the best-performing model.
- Computes Random Forest feature importances as a model-agnostic sanity check.
- Generates 4 charts: model comparison (test RMSE vs. a naive baseline),
  predicted-vs-actual scatter, residual distribution, and feature importance.

**Optimization — model-informed vehicle assignment:**
- Fits a data-driven cost model (delivery cost ~ distance) separately per vehicle
  type, to source realistic objective-function coefficients from the data itself
  rather than hand-picked constants.
- For a sampled day of 40 orders, uses the trained delay model to predict delay
  under each of the 3 possible vehicle assignments per order — this is the direct
  link between the predictive model and the prescriptive optimization.
- Formulates and solves a mixed-integer program (PuLP + CBC solver) that assigns
  each order to a feasible vehicle, minimizing total cost plus a priced-in delay
  penalty, subject to daily fleet-capacity constraints per vehicle type and a
  bike weight/volume eligibility rule.
- Compares the optimized assignment against the historical baseline (cost,
  predicted total delay, vehicle mix) and generates a comparison chart.

**Outputs:**
`data/cv_model_comparison.csv`, `data/test_set_evaluation.csv`,
`data/feature_importance.csv`, `data/optimization_summary.json`,
`figs/w4_fig1..5_*.png`

### 2. `src/build_week4.js`

Assembles the full analysis narrative, embedded charts, tables, and annotated
Python code excerpts into a formatted Word document using the `docx` npm package.

**Output:** `Week4_Predictive_Modeling_Optimization_Report.docx`

## Requirements

- Python 3.10+ with: `pandas`, `numpy`, `matplotlib`, `seaborn`, `scipy`,
  `scikit-learn`, `pulp`
- Node.js 18+ with the `docx` npm package

## Setup

```bash
pip install -r requirements.txt
npm install
```

## Usage

Run in order — the report build step embeds the charts the modeling script
generates.

```bash
cd src

# 1. Train/evaluate models, run the optimization, generate charts
python3 model_and_optimize.py

# 2. Build the Word report (embeds charts from ../figs)
node build_week4.js
```

The final report is written to `Week4_Predictive_Modeling_Optimization_Report.docx`
in the repo root.

## Repo structure

```
.
├── README.md
├── requirements.txt
├── package.json
├── .gitignore
├── src/
│   ├── model_and_optimize.py   # modeling, cross-validation, tuning, optimization, charts
│   └── build_week4.js          # Word report assembly (docx)
├── data/
│   ├── simulated_logistics_data.csv   # input dataset (3,000 orders)
│   ├── cv_model_comparison.csv        # generated: 5-fold CV results
│   ├── test_set_evaluation.csv        # generated: held-out test metrics
│   ├── feature_importance.csv         # generated: Random Forest importances
│   └── optimization_summary.json      # generated: baseline vs. optimized dispatch
├── figs/                              # generated chart PNGs
└── Week4_Predictive_Modeling_Optimization_Report.docx   # final deliverable
```

## Key results (seeded, reproducible)

- **Model selection:** Linear Regression narrowly wins on held-out test RMSE
  (8.60 min) over tuned Random Forest (8.76 min) and Gradient Boosting (8.63 min),
  all clearing a naive mean-baseline of 14.74 min by a wide margin. This is
  consistent with route distance accounting for ~80% of Random Forest feature
  importance — the underlying relationship is close to linear, so the added
  flexibility of ensemble methods doesn't pay off on unseen data.
- **Optimization:** the MILP achieves a 2.0% total dispatch cost reduction
  ($513.50 → $503.20 on a sampled 40-order day) while holding total predicted
  delay essentially flat (-401.3 → -399.1 minutes), despite operating under a
  tighter fleet-capacity constraint than the historical dispatch pattern used.

All results are reproducible: the random seed (`42`) is fixed throughout, so
re-running `model_and_optimize.py` regenerates identical numbers and charts.

## Notes

- The dataset is **simulated**, not pulled from a real production system —
  it's built with realistic, seeded relationships (route distance driving both
  cost and delay, warehouse-level congestion differences) so the modeling and
  optimization results reflect genuine, reproducible patterns.
- The delay-cost trade-off parameter used in the optimization objective
  (λ = $0.60 per predicted minute of delay) is an analyst assumption for
  illustration, not a measured business figure — see the script and report for
  where to plug in a real SLA-penalty or customer-satisfaction cost if available.
