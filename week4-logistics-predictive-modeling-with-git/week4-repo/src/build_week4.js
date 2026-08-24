const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, LevelFormat, PageBreak,
  ImageRun,
} = require("docx");
const fs = require("fs");

const FONT = "Calibri";
const CODE_FONT = "Consolas";
const ACCENT = "1F4E5F";
const ACCENT_LIGHT = "DCE9EE";
const GREY = "595959";
const FIGDIR = "../figs";

// ---------- helpers ----------
function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 140 } });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } });
}
function p(text) {
  return new Paragraph({ spacing: { after: 160, line: 276 }, children: [new TextRun({ text, font: FONT, size: 22 })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ text, numbering: { reference: "bullet-list", level }, spacing: { after: 90 } });
}
function codeBlock(lines) {
  return new Table({
    width: { size: 9350, type: WidthType.DXA },
    columnWidths: [9350],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "B7B7B7" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "B7B7B7" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "B7B7B7" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "B7B7B7" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9350, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: lines.map(
              (line) => new Paragraph({
                spacing: { after: 0 },
                children: [new TextRun({ text: line.length ? line : " ", font: CODE_FONT, size: 18, color: "1B1B1B" })],
              })
            ),
          }),
        ],
      }),
    ],
  });
}
function caption(text) {
  return new Paragraph({
    spacing: { before: 60, after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, italics: true, font: FONT, size: 18, color: GREY })],
  });
}
function figure(path, pxWidth, pxHeight, displayW = 560) {
  const displayH = Math.round((pxHeight / pxWidth) * displayW);
  const data = fs.readFileSync(path);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 40 },
    children: [new ImageRun({ type: "png", data, transformation: { width: displayW, height: displayH } })],
  });
}
function genericTable(headerLabels, rows, colWidths) {
  const header = new TableRow({
    tableHeader: true,
    children: headerLabels.map(
      (t) => new TableCell({
        shading: { type: ShadingType.CLEAR, fill: ACCENT },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF", font: FONT, size: 20 })] })],
      })
    ),
  });
  const body = rows.map(
    (r) => new TableRow({
      children: r.map(
        (cellText, i) => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: i === 0 ? ACCENT_LIGHT : "FFFFFF" },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: cellText, font: FONT, size: 20, bold: i === 0 })] })],
        })
      ),
    })
  );
  return new Table({
    width: { size: 9350, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [header, ...body],
  });
}

// ---------- document ----------
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullet-list",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 260 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 920, hanging: 260 } } } },
        ],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { size: 52, bold: true, color: ACCENT, font: FONT }, paragraph: { spacing: { after: 120 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { size: 30, bold: true, color: ACCENT, font: FONT }, paragraph: { spacing: { before: 360, after: 180 }, border: { bottom: { color: ACCENT, space: 4, style: BorderStyle.SINGLE, size: 8 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { size: 25, bold: true, color: "2E6E82", font: FONT }, paragraph: { spacing: { before: 260, after: 120 } } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { size: 22, bold: true, italics: true, color: GREY, font: FONT }, paragraph: { spacing: { before: 180, after: 100 } } },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
        },
      },
      children: [
        // ---------------- Title Page ----------------
        new Paragraph({ spacing: { before: 1400 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Predictive Modeling and Optimization in Logistics Systems", bold: true, size: 44, color: ACCENT, font: FONT })],
          spacing: { after: 200 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Week 4 Deliverable — Delay Forecasting & Model-Informed Dispatch Optimization", size: 26, color: GREY, font: FONT })],
          spacing: { after: 60 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Regional E-Commerce Last-Mile Distribution Network", italics: true, size: 24, color: "2E6E82", font: FONT })],
          spacing: { after: 800 },
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Prepared by: Data Analyst", size: 22, font: FONT })], spacing: { after: 80 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Role tenure: ~6 months in logistics data analytics", size: 22, font: FONT })], spacing: { after: 80 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Date: August 24, 2026", size: 22, font: FONT })], spacing: { after: 80 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tools: Python (scikit-learn, pandas, PuLP, matplotlib, seaborn)", size: 20, color: GREY, font: FONT })] }),
        new Paragraph({ children: [new PageBreak()] }),

        // ---------------- Executive Summary ----------------
        h1("Executive Summary"),
        p(
          "This report develops a predictive model to forecast delivery delay for the RegionalCo Logistics last-mile network, using the same order-level dataset established in Week 3, and then uses that model's predictions to drive a vehicle-assignment optimization for daily dispatch planning. Four candidate models — linear regression, ridge regression, random forest, and gradient boosting — were trained, cross-validated, and hyperparameter-tuned, then compared on a held-out test set using RMSE, MAE, and R\u00b2."
        ),
        p(
          "A regularized linear model performed best on the held-out test set (RMSE = 8.60 minutes, R\u00b2 = 0.66), narrowly outperforming tuned ensemble methods \u2014 consistent with the Week 3 finding that route distance dominates delay and the relationship is close to linear. The trained model's predictions were then fed into a mixed-integer optimization (PuLP) that assigns vehicles to a day's orders to minimize a combined cost-and-predicted-delay objective subject to fleet capacity constraints, achieving a 2.0% cost reduction on the sampled day while holding predicted delay effectively flat despite tighter vehicle availability than the historical dispatch pattern used."
        ),

        // ---------------- 1. Problem Definition ----------------
        h1("1. Problem Definition and Data"),
        h2("1.1 Forecasting Problem"),
        p(
          "The metric selected for prediction is delivery_delay_min \u2014 the number of minutes an order is delivered after (positive) or before (negative) its promised delivery deadline. This metric was chosen over shipment volume because it is the most direct driver of the On-Time Delivery Rate KPI defined in Week 1, and because Week 3's EDA already established that it has strong, statistically significant relationships with several available features, making it a tractable and well-motivated regression target."
        ),
        p("The dataset is the same 3,000-order simulated extract used in Week 3 (schema defined in that report), split 80/20 into training (2,400 orders) and held-out test (600 orders) sets. Features used for prediction:"),
        genericTable(
          ["Feature", "Type", "Role"],
          [
            ["route_distance_km", "numeric", "Planned route distance (strongest EDA correlate of delay)"],
            ["order_volume_units", "numeric", "Number of units in the order"],
            ["is_weekend", "binary", "Derived from order_ts; weekend orders showed longer delay in Week 3"],
            ["warehouse", "categorical (3 levels)", "Captures warehouse-level congestion differences"],
            ["vehicle_type", "categorical (3 levels)", "Bike, Van, or Truck"],
            ["sku_category", "categorical (5 levels)", "Product category, included as a control variable"],
          ],
          [2600, 2400, 4350]
        ),
        caption("Table 1. Features used to predict delivery_delay_min."),

        // ---------------- 2. Model Selection ----------------
        h1("2. Model Selection and Implementation"),
        h2("2.1 Data Preparation Pipeline"),
        p(
          "Numeric features are standardized (zero mean, unit variance) and categorical features are one-hot encoded (dropping the first level to avoid collinearity), wrapped in a single scikit-learn Pipeline so that preprocessing is fit only on training folds during cross-validation \u2014 preventing information from the validation/test data from leaking into feature scaling."
        ),
        codeBlock([
          "from sklearn.compose import ColumnTransformer",
          "from sklearn.preprocessing import OneHotEncoder, StandardScaler",
          "from sklearn.pipeline import Pipeline",
          "from sklearn.model_selection import train_test_split",
          "",
          "NUMERIC = ['route_distance_km', 'order_volume_units', 'is_weekend']",
          "CATEGORICAL = ['warehouse', 'vehicle_type', 'sku_category']",
          "",
          "preprocessor = ColumnTransformer([",
          "    ('num', StandardScaler(), NUMERIC),",
          "    ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), CATEGORICAL),",
          "])",
          "",
          "X_train, X_test, y_train, y_test = train_test_split(",
          "    df[NUMERIC + CATEGORICAL], df['delivery_delay_min'],",
          "    test_size=0.2, random_state=42",
          ")",
        ]),
        caption("Snippet 1. Preprocessing pipeline and train/test split (2,400 train / 600 test orders)."),

        h2("2.2 Candidate Models"),
        p("Four models spanning a range of complexity were evaluated, selected to test whether the largely linear distance-delay relationship found in Week 3 favors a simple model, or whether ensemble methods can capture additional non-linear structure (e.g. interactions between warehouse and weekend effects):"),
        bullet("Linear Regression \u2014 baseline; directly tests the linear-relationship hypothesis from Week 3."),
        bullet("Ridge Regression (L2-regularized) \u2014 guards against overfitting from the one-hot encoded categorical features."),
        bullet("Random Forest \u2014 captures non-linear interactions without requiring explicit feature engineering."),
        bullet("Gradient Boosting \u2014 typically strong on tabular data; tests whether sequential error-correction improves on a single tree ensemble."),
        codeBlock([
          "from sklearn.linear_model import LinearRegression, Ridge",
          "from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor",
          "",
          "candidates = {",
          "    'Linear Regression': LinearRegression(),",
          "    'Ridge Regression': Ridge(alpha=1.0, random_state=42),",
          "    'Random Forest': RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),",
          "    'Gradient Boosting': GradientBoostingRegressor(random_state=42),",
          "}",
        ]),
        caption("Snippet 2. The four candidate model families evaluated."),

        // ---------------- 3. Evaluation ----------------
        h1("3. Evaluation and Validation"),
        h2("3.1 Cross-Validation on the Training Set"),
        p(
          "Each candidate was evaluated with 5-fold cross-validation on the training set (2,400 orders), scoring RMSE, MAE, and R\u00b2 on each held-out fold. Cross-validation is used here rather than a single train/validation split because with categorical features that have relatively few levels, a single split risks an unrepresentative fold; averaging over 5 folds gives a more stable estimate of generalization performance before touching the final test set."
        ),
        codeBlock([
          "from sklearn.model_selection import KFold, cross_validate",
          "",
          "kf = KFold(n_splits=5, shuffle=True, random_state=42)",
          "",
          "for name, model in candidates.items():",
          "    pipe = Pipeline([('prep', preprocessor), ('model', model)])",
          "    scores = cross_validate(",
          "        pipe, X_train, y_train, cv=kf,",
          "        scoring={'rmse': 'neg_root_mean_squared_error',",
          "                 'mae': 'neg_mean_absolute_error', 'r2': 'r2'},",
          "        n_jobs=-1,",
          "    )",
          "    print(name, -scores['test_rmse'].mean(), scores['test_r2'].mean())",
        ]),
        caption("Snippet 3. 5-fold cross-validation on the training set."),
        genericTable(
          ["Model", "CV RMSE (min)", "CV MAE (min)", "CV R\u00b2"],
          [
            ["Ridge Regression", "9.03", "7.22", "0.615"],
            ["Linear Regression", "9.03", "7.22", "0.615"],
            ["Gradient Boosting", "9.21", "7.39", "0.599"],
            ["Random Forest", "9.81", "7.89", "0.545"],
          ],
          [2900, 2150, 2150, 2150]
        ),
        caption("Table 2. 5-fold cross-validation results on the training set (2,400 orders), sorted by RMSE."),

        h2("3.2 Hyperparameter Tuning"),
        p(
          "Because ensemble methods showed no CV advantage over the linear models in their default configuration, a grid search was run on Random Forest to confirm this was not simply due to under-tuning, searching over tree count, depth, and minimum leaf size."
        ),
        codeBlock([
          "from sklearn.model_selection import GridSearchCV",
          "",
          "param_grid = {",
          "    'model__n_estimators': [150, 300],",
          "    'model__max_depth': [6, 10, None],",
          "    'model__min_samples_leaf': [1, 5],",
          "}",
          "grid = GridSearchCV(rf_pipe, param_grid, cv=kf,",
          "                     scoring='neg_root_mean_squared_error', n_jobs=-1)",
          "grid.fit(X_train, y_train)",
          "# Best params: max_depth=6, min_samples_leaf=1, n_estimators=300",
          "# Best CV RMSE: 9.27 -- still behind the linear models",
        ]),
        caption("Snippet 4. Grid search over Random Forest hyperparameters (5-fold CV)."),

        h2("3.3 Held-Out Test Set Evaluation"),
        p(
          "The tuned Random Forest, a tuned Gradient Boosting model, and Linear Regression were then evaluated once each on the held-out 600-order test set \u2014 data none of the models or the grid search had seen during training or tuning."
        ),
        genericTable(
          ["Model", "Test RMSE (min)", "Test MAE (min)", "Test R\u00b2"],
          [
            ["Linear Regression", "8.60", "6.78", "0.657"],
            ["Gradient Boosting (tuned)", "8.63", "6.88", "0.654"],
            ["Random Forest (tuned)", "8.76", "6.93", "0.643"],
          ],
          [3200, 2050, 2050, 2050]
        ),
        caption("Table 3. Held-out test set evaluation (600 orders), sorted by RMSE. A naive mean-only baseline scores RMSE = 14.74 for reference."),
        h2("3.4 Model Selection Decision"),
        p(
          "Linear Regression was selected as the production model. This may be counter-intuitive given the availability of more flexible ensemble methods, but it is the correct choice here: all three tuned models perform within 0.2 minutes RMSE of each other, and the simplest model wins narrowly on every metric on genuinely unseen data. This is consistent with the feature-importance results (Section 3.5): one feature (distance) explains the large majority of predictable variance, and the relationship is close to linear, so the added flexibility of tree ensembles brings variance without a compensating gain. Preferring the simpler, more interpretable, and cheaper-to-serve model when performance is statistically indistinguishable follows standard model-selection practice (a bias toward parsimony, sometimes summarized as Occam's razor in the machine learning context)."
        ),
        figure(`${FIGDIR}/w4_fig1_model_comparison.png`, 1350, 756),
        caption("Figure 1. Held-out test RMSE across models, compared against a naive mean-prediction baseline (14.74 min)."),
        figure(`${FIGDIR}/w4_fig2_pred_vs_actual.png`, 1188, 1080, 460),
        caption("Figure 2. Predicted vs. actual delay for the selected Linear Regression model on the held-out test set. Points cluster tightly around the perfect-prediction line, with wider spread at the extremes."),
        figure(`${FIGDIR}/w4_fig3_residuals.png`, 1350, 756),
        caption("Figure 3. Residual distribution on the test set. Residuals are roughly centered on zero with no strong skew, indicating no major systematic bias in the model's predictions."),

        h2("3.5 Feature Importance"),
        p(
          "Although Linear Regression was selected for production, the tuned Random Forest's feature importances are reported here because they offer a model-agnostic sanity check on which features matter, without assuming linearity."
        ),
        figure(`${FIGDIR}/w4_fig4_feature_importance.png`, 1494, 827),
        caption("Figure 4. Random Forest feature importances for predicting delivery delay."),
        p(
          "Route distance alone accounts for roughly 80% of total feature importance, with warehouse (specifically W2 - Central) and weekend timing contributing modestly, and order volume, vehicle type, and product category contributing very little. This corroborates the Week 3 correlation analysis and further justifies keeping the model simple: most of the categorical features carry little independent predictive signal once distance and warehouse are accounted for."
        ),

        // ---------------- 4. Optimization ----------------
        h1("4. Optimization Strategy: Model-Informed Vehicle Assignment"),
        h2("4.1 Formulation"),
        p(
          "Beyond forecasting, the trained delay model is used to inform a prescriptive decision: which vehicle type to assign to each order in a day's dispatch. This is formulated as a mixed-integer linear program (MILP) and solved with PuLP's CBC solver. For a sample of 40 orders (one simulated day), the model predicts delivery_delay_min under each of the three possible vehicle assignments per order (holding distance, volume, warehouse, and category fixed) \u2014 this is the direct link between the predictive model and the optimization: the MILP's inputs are the model's own predictions, not just historical averages."
        ),
        p("A data-driven cost model (delivery_cost regressed on distance, fit separately per vehicle type on the full dataset) supplies the objective's cost coefficients:"),
        genericTable(
          ["Vehicle type", "Fixed cost ($)", "Cost per km ($)"],
          [
            ["Bike", "6.74", "0.46"],
            ["Van", "6.54", "0.85"],
            ["Truck", "6.41", "1.52"],
          ],
          [2650, 3350, 3350]
        ),
        caption("Table 4. Data-driven per-vehicle cost coefficients, fit via linear regression of delivery_cost on route_distance_km."),
        p(
          "The optimization minimizes total cost plus a delay penalty (\u03bb = $0.60 per predicted minute of delay \u2014 a trade-off parameter reflecting that a small cost premium is worthwhile to avoid predicted lateness), subject to: each order assigned exactly one vehicle, bikes excluded for orders above 6 volume units (a physical capacity rule), and a daily fleet capacity limit (14 bikes, 16 vans, 10 trucks available)."
        ),
        codeBlock([
          "import pulp",
          "",
          "LAMBDA_DELAY = 0.6  # $ per predicted minute of delay",
          "prob = pulp.LpProblem('VehicleAssignment', pulp.LpMinimize)",
          "",
          "x = {(oid, v): pulp.LpVariable(f'x_{oid}_{v}', cat='Binary')",
          "     for oid, v in feasible_pairs}",
          "",
          "# Objective: minimize cost + lambda * predicted delay",
          "prob += pulp.lpSum(",
          "    x[(oid, v)] * (cost[oid, v] + LAMBDA_DELAY * predicted_delay[oid, v])",
          "    for (oid, v) in x",
          ")",
          "",
          "# Each order gets exactly one vehicle",
          "for oid in orders.index:",
          "    prob += pulp.lpSum(x[(oid, v)] for v in vehicle_types if (oid, v) in x) == 1",
          "",
          "# Daily fleet capacity per vehicle type",
          "for v, capacity in FLEET_CAPACITY.items():",
          "    prob += pulp.lpSum(x[(oid, v)] for oid in orders.index if (oid, v) in x) <= capacity",
          "",
          "prob.solve(pulp.PULP_CBC_CMD(msg=0))",
        ]),
        caption("Snippet 5. MILP formulation for model-informed vehicle assignment, solved with PuLP/CBC."),

        h2("4.2 Results"),
        genericTable(
          ["Metric", "Baseline (historical)", "Optimized (model-informed)"],
          [
            ["Total dispatch cost (40 orders)", "$513.50", "$503.20"],
            ["Predicted total delay (min, summed)", "-401.3", "-399.1"],
            ["Bike / Van / Truck mix", "16 / 18 / 6", "14 / 16 / 10"],
            ["Solver status", "\u2014", "Optimal"],
          ],
          [3600, 2950, 2800]
        ),
        caption("Table 5. Baseline vs. optimized dispatch outcomes for the sampled day of 40 orders."),
        figure(`${FIGDIR}/w4_fig5_optimization_results.png`, 1980, 792),
        caption("Figure 5. Total cost and vehicle mix, baseline dispatch vs. model-informed optimized dispatch."),
        p(
          "The optimizer reduces total dispatch cost by $10.30 (2.0%) while keeping total predicted delay essentially flat (-399.1 vs. -401.3 minutes), despite operating under a tighter, more realistic fleet-capacity constraint than the historical dispatch pattern (which used 16 bikes against an assumed availability of only 14). This is a meaningful result precisely because it is modest and constraint-bound: it shows the optimizer finding real, defensible savings within operational limits, rather than an unconstrained best case that would not survive contact with actual fleet availability. In particular, the optimizer shifts several orders from bikes to vans/trucks to respect the tighter bike capacity, and offsets that by re-sorting the remaining assignments toward the lowest-cost feasible vehicle for each order's distance profile."
        ),

        // ---------------- 5. Recommendations ----------------
        h1("5. Optimization Strategies and Recommendations"),
        p("Beyond the specific MILP run above, four broader recommendations follow from the modeling and optimization work in this phase:"),
        bullet("Operationalize the distance-delay model as a pre-dispatch flag. Since distance alone explains most predictable delay variance, a simple rule \u2014 flag any order with predicted delay above a chosen threshold before it is dispatched \u2014 captures most of the forecasting model's value without needing the full optimization pipeline in the first release."),
        bullet("Run the vehicle-assignment optimization daily, not statically. Fleet capacity, order mix, and distances change day to day; the MILP is cheap to solve (well under a second for 40 orders) and should be re-run each dispatch cycle rather than used to set a fixed policy."),
        bullet("Investigate W2 - Central specifically. It was the only individual warehouse to register meaningfully in the feature importance ranking (Figure 4), suggesting a warehouse-specific operational factor (dispatch congestion, staffing, or layout) worth a targeted follow-up beyond what this model can explain from the available features."),
        bullet("Revisit the delay-cost trade-off parameter (\u03bb) with stakeholder input. The $0.60-per-minute value used here is a reasonable starting assumption, not a measured figure; pairing it with actual SLA penalty costs or customer-satisfaction data would let the optimization reflect the business's real cost of lateness rather than an analyst estimate."),

        // ---------------- 6. Conclusion ----------------
        h1("6. Conclusion"),
        p(
          "This phase closes the loop from the Week 1 plan and Week 3 EDA into a working predictive-and-prescriptive pipeline: a cross-validated, hyperparameter-tuned regression model forecasts delivery delay with a clear, honest accounting of model comparison (including the finding that the simplest model won), and that model's predictions are then used directly \u2014 not just its headline accuracy \u2014 as an input to a constrained optimization that produces a concrete, feasible dispatch improvement. The result is a small but real and defensible cost saving under realistic operational constraints, along with a clear next step (daily re-optimization, threshold-based flagging, and a warehouse-specific follow-up) for turning this from an analysis into an operational tool."
        ),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("../Week4_Predictive_Modeling_Optimization_Report.docx", buf);
  console.log("done");
});
