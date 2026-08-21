# RegionalCo Logistics — Week 3: EDA & Visualization

Python + Node.js pipeline that simulates a last-mile delivery dataset, runs exploratory data
analysis and statistical tests on it, generates the supporting charts, and assembles everything
into a Word (`.docx`) report.

This is the Week 3 deliverable for the RegionalCo Logistics analytics project (see Week 1
strategic planning and Week 2 data cleaning/preprocessing reports for prior phases).

## What it does

1. **`src/generate_analysis.py`**
   - Simulates a 3,000-row order-level logistics dataset (warehouse, vehicle type, product
     category, route distance, order volume, delivery cost, delivery delay).
   - Computes descriptive statistics (mean/median/std/skew) and a correlation matrix.
   - Runs statistical tests: one-way ANOVA (delay by warehouse) and Pearson correlation
     (distance vs. delay) with significance testing.
   - Generates 7 matplotlib/seaborn charts (distribution, bar, boxplot, scatter+regression,
     heatmap, time series, category comparison) and saves them as PNGs.
   - Outputs: `data/simulated_logistics_data.csv`, `data/descriptive_stats.csv`,
     `data/correlation_matrix.csv`, `figs/*.png`.

2. **`src/build_report.js`**
   - Assembles the analysis, embedded charts, Python code excerpts, and written
     interpretation into a formatted Word document using the `docx` npm package.
   - Output: `Week3_EDA_Visualization_Report.docx`.

## Requirements

- Python 3.10+ with: `pandas`, `numpy`, `matplotlib`, `seaborn`, `scipy`
- Node.js 18+ with the `docx` npm package

## Setup

```bash
# Python dependencies
pip install -r requirements.txt

# Node dependencies
npm install
```

## Usage

Run in order — the report build step embeds the PNGs the analysis script generates.

```bash
# 1. Simulate data, run EDA, generate charts
cd src
python3 generate_analysis.py

# 2. Build the Word report (embeds the charts from ../figs)
node build_report.js
```

The final report is written to `Week3_EDA_Visualization_Report.docx` in the repo root.

## Repo structure

```
.
├── README.md
├── requirements.txt
├── package.json
├── src/
│   ├── generate_analysis.py   # data simulation, EDA, statistical tests, chart generation
│   └── build_report.js        # Word report assembly (docx)
├── data/                      # generated CSVs (dataset, descriptive stats, correlation matrix)
├── figs/                      # generated chart PNGs
└── Week3_EDA_Visualization_Report.docx   # final deliverable
```

## Notes

- The dataset is **simulated**, not pulled from a real public source — it's built with
  realistic, seeded relationships (e.g., route distance driving both cost and delay,
  warehouse-level congestion differences) so the EDA and statistical tests reflect genuine,
  reproducible patterns rather than hand-written numbers. Re-running `generate_analysis.py`
  with the same seed (`np.random.default_rng(42)`) reproduces identical results.
- Key findings: route distance is the dominant driver of both delivery delay (r = 0.71) and
  delivery cost (r = 0.79); on-time delivery rate varies significantly by warehouse
  (73.6%–85.0%, ANOVA p < 0.001); vehicle type is a stronger cost lever than product category.
