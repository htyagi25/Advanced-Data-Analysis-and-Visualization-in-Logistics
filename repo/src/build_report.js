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
function figure(path, pxWidth, pxHeight, maxWidthEmu = 5800) {
  // scale to a max display width (in DXA-ish px terms), preserve aspect ratio
  const maxW = 560; // points-ish display width in the doc (approx 5.8in at 96dpi-ish scaling handled below)
  const displayW = 560;
  const displayH = Math.round((pxHeight / pxWidth) * displayW);
  const data = fs.readFileSync(path);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 40 },
    children: [
      new ImageRun({
        type: "png",
        data,
        transformation: { width: displayW, height: displayH },
      }),
    ],
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
          children: [new TextRun({ text: "Advanced Data Analysis and Visualization in Logistics", bold: true, size: 44, color: ACCENT, font: FONT })],
          spacing: { after: 200 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Week 3 Deliverable — Exploratory Data Analysis & Visualization Report", size: 26, color: GREY, font: FONT })],
          spacing: { after: 60 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Regional E-Commerce Last-Mile Distribution Network", italics: true, size: 24, color: "2E6E82", font: FONT })],
          spacing: { after: 800 },
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Prepared by: Data Analyst", size: 22, font: FONT })], spacing: { after: 80 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Role tenure: ~6 months in logistics data analytics", size: 22, font: FONT })], spacing: { after: 80 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Date: August 21, 2026", size: 22, font: FONT })], spacing: { after: 80 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tools: Python (pandas, numpy, scipy, matplotlib, seaborn)", size: 20, color: GREY, font: FONT })] }),
        new Paragraph({ children: [new PageBreak()] }),

        // ---------------- Executive Summary ----------------
        h1("Executive Summary"),
        p(
          "This report presents the exploratory data analysis (EDA) and visualization phase of the RegionalCo Logistics analytics program, building on the cleaned and preprocessed dataset structure established in Week 2. A simulated dataset of 3,000 delivery orders across three warehouses, three vehicle types, and five product categories is analyzed to characterize delivery performance, cost drivers, and operational bottlenecks. Seven visualizations are produced and interpreted, covering distributions, comparisons across categories, correlations, and time trends."
        ),
        p(
          "The central findings are that route distance is the dominant driver of both delivery delay and delivery cost, that on-time delivery performance varies meaningfully by warehouse (73.6% to 85.0%), and that vehicle type — not product category — is the main lever available to control per-delivery cost. These findings directly inform the route optimization and inventory allocation work planned for later weeks of the project."
        ),

        // ---------------- 1. Dataset ----------------
        h1("1. Dataset Definition"),
        p(
          "The analysis uses a simulated order-level dataset representing three months of RegionalCo delivery activity (3,000 orders, May–August 2026). It is structured consistently with the schema defined in the Week 2 preprocessing report, with the cleaning steps from that phase already applied. Key variables are summarized below."
        ),
        genericTable(
          ["Variable", "Type", "Description"],
          [
            ["warehouse", "categorical", "Origin warehouse: W1 - North, W2 - Central, W3 - South"],
            ["vehicle_type", "categorical", "Van, Bike, or Truck used for the delivery"],
            ["sku_category", "categorical", "Product category of the order"],
            ["route_distance_km", "numeric", "Planned route distance from warehouse to delivery point"],
            ["order_volume_units", "numeric", "Number of units in the order"],
            ["delivery_cost", "numeric ($)", "Total cost attributed to the delivery"],
            ["delivery_delay_min", "numeric (min)", "Minutes late (negative = delivered early)"],
            ["on_time", "boolean", "True if delivery_delay_min \u2264 0"],
            ["order_ts / week / month", "datetime", "Order timestamp and derived weekly/monthly period"],
          ],
          [2400, 1900, 5050]
        ),
        caption("Table 1. Key variables in the simulated order-level dataset used for this analysis."),

        // ---------------- 2. EDA ----------------
        h1("2. Exploratory Data Analysis"),
        h2("2.1 Descriptive Statistics"),
        p("Central tendency and spread were computed for the four core numeric variables:"),
        genericTable(
          ["Variable", "Mean", "Median", "Std Dev", "Skew"],
          [
            ["Route distance (km)", "8.16", "6.61", "6.21", "1.82 (right-skewed)"],
            ["Order volume (units)", "5.02", "5.00", "2.02", "0.45 (near symmetric)"],
            ["Delivery cost ($)", "13.30", "12.01", "6.44", "2.56 (strongly right-skewed)"],
            ["Delivery delay (min)", "-11.20", "-12.00", "14.60", "0.63 (mildly right-skewed)"],
          ],
          [2600, 1600, 1600, 1650, 1900]
        ),
        caption("Table 2. Descriptive statistics for core numeric variables."),
        p(
          "Route distance and delivery cost are both right-skewed, meaning most deliveries are short and inexpensive, with a long tail of longer, costlier outliers — visually confirmed in Section 3. The average delivery arrives about 11 minutes early against the promised deadline, but with a standard deviation of nearly 15 minutes, so a meaningful share of orders still run late; the overall on-time delivery (OTD) rate across all warehouses is 80.3%."
        ),
        h2("2.2 Correlation Analysis"),
        p(
          "A Pearson correlation matrix was computed across the four core numeric variables (see Figure 5 in Section 3.5). Route distance correlates strongly with both delivery delay (r = 0.71) and delivery cost (r = 0.79), while order volume shows a weak relationship with either (r = 0.07 and r = 0.16 respectively). A one-way ANOVA confirms that mean delivery delay differs significantly across warehouses (F = 33.75, p < 0.001), and the distance–delay correlation is highly significant (p < 0.001, n = 3,000)."
        ),
        codeBlock([
          "from scipy import stats",
          "",
          "# ANOVA: does delay differ significantly by warehouse?",
          "groups = [g['delivery_delay_min'].values for _, g in df.groupby('warehouse')]",
          "f_stat, p_val = stats.f_oneway(*groups)",
          "print(f'F={f_stat:.2f}, p={p_val:.5f}')",
          "# F=33.75, p=0.00000 -> statistically significant difference across warehouses",
          "",
          "# Pearson correlation: distance vs delay",
          "r_val, p_corr = stats.pearsonr(df['route_distance_km'], df['delivery_delay_min'])",
          "print(f'r={r_val:.3f}, p={p_corr:.2e}')",
          "# r=0.707, p<0.001 -> strong, significant positive relationship",
        ]),
        caption("Snippet 1. Statistical testing used to confirm that observed EDA patterns are not due to chance."),

        // ---------------- 3. Visualizations ----------------
        h1("3. Visualizations"),
        p("Seven visualizations were produced, each chosen to answer a specific question about delivery performance, cost, or operational trends. All charts were generated with matplotlib and seaborn from the cleaned dataset."),

        h2("3.1 Distribution of Delivery Delay"),
        p("Chosen technique: histogram with a kernel density overlay, since the goal is to see the full shape of a single continuous variable — including how much mass sits on either side of the promised deadline — rather than just a summary statistic."),
        figure(`${FIGDIR}/fig1_delay_distribution.png`, 1350, 774),
        caption("Figure 1. Distribution of delivery delay across all 3,000 orders, relative to the promised deadline (0 minutes)."),
        p("Interpretation: the distribution is unimodal and right-skewed, centered a little past –10 minutes (i.e. most deliveries arrive early), but with a visible tail extending past +60 minutes. That tail — not the average — is what drives customer complaints and SLA breaches, so it is a more useful monitoring target than the mean alone."),

        h2("3.2 On-Time Delivery Rate by Warehouse"),
        p("Chosen technique: horizontal bar chart, which is well suited to comparing a single rate metric across a small number of categories and makes ranking immediately visible."),
        figure(`${FIGDIR}/fig2_otd_by_warehouse.png`, 1350, 720),
        caption("Figure 2. On-time delivery rate by warehouse, ranked from lowest to highest performing."),
        p("Interpretation: W1 - North leads at 85.0% OTD, while W3 - South trails at 73.6% — an 11.4 percentage-point gap. Combined with the ANOVA result in Section 2.2, this gap is statistically significant rather than noise, and warrants warehouse-specific investigation rather than a single network-wide fix."),

        h2("3.3 Delivery Cost by Vehicle Type"),
        p("Chosen technique: boxplot, to show the full spread (median, interquartile range, and outliers) of cost per vehicle type rather than only comparing averages, which would hide how much more variable and outlier-prone truck deliveries are."),
        figure(`${FIGDIR}/fig3_cost_by_vehicle.png`, 1350, 774),
        caption("Figure 3. Delivery cost distribution by vehicle type, showing median, interquartile range, and outliers."),
        p("Interpretation: trucks carry both the highest median cost and the widest spread, including the most extreme outliers (up to $88). Bikes are the cheapest and most consistent option. This suggests dispatch rules that default to vans/trucks for orders that could be served by bike are a direct, actionable cost lever."),

        h2("3.4 Route Distance vs. Delivery Delay"),
        p("Chosen technique: scatter plot with a fitted regression line, to visualize both the relationship's direction/strength and its linearity, which a correlation coefficient alone does not show."),
        figure(`${FIGDIR}/fig4_distance_vs_delay.png`, 1350, 810),
        caption("Figure 4. Route distance vs. delivery delay for a representative sample of 900 orders, with a linear fit (r = 0.71)."),
        p("Interpretation: the relationship is strong, positive, and close to linear across most of the range, meaning distance is a reliable predictor of delay and a reasonable candidate feature for the delay-forecasting model proposed in Week 1. Orders beyond roughly 15 km are, on average, delivered late, which is a natural threshold for flagging at-risk deliveries proactively."),

        h2("3.5 Correlation Heatmap"),
        p("Chosen technique: a heatmap, to compactly summarize pairwise relationships among all four numeric variables at once, which would be unwieldy as a series of individual scatter plots."),
        figure(`${FIGDIR}/fig5_correlation_heatmap.png`, 1116, 936),
        caption("Figure 5. Correlation matrix across route distance, order volume, delivery cost, and delivery delay."),
        p("Interpretation: distance is the common driver behind both cost (r = 0.79) and delay (r = 0.71), while order volume is a comparatively minor factor for either (r = 0.16 and r = 0.07). This re-prioritizes the improvement roadmap: route/zone optimization is likely to have more impact on both KPIs than batching strategies aimed at volume alone."),

        h2("3.6 Weekly Shipment Volume Trend"),
        p("Chosen technique: a multi-line time series chart, since tracking volume by warehouse over time requires showing both the overall trend and how the three warehouses move relative to each other."),
        figure(`${FIGDIR}/fig6_weekly_volume_trend.png`, 1475, 774),
        caption("Figure 6. Weekly shipment volume by warehouse over the three-month analysis window (partial weeks at each edge of the window)."),
        p("Interpretation: W1 - North consistently carries the highest volume, and all three warehouses show week-to-week volatility rather than a strong trend, indicating demand is closer to noisy-but-stable than seasonally trending within this window \u2014 useful context for setting realistic expectations on the demand-forecasting work proposed in Week 1."),

        h2("3.7 Average Delivery Cost by Product Category"),
        p("Chosen technique: a simple bar chart, appropriate here because the comparison is a single average across a small set of categories."),
        figure(`${FIGDIR}/fig7_cost_by_category.png`, 1350, 756),
        caption("Figure 7. Average delivery cost by product category."),
        p("Interpretation: unlike distance and vehicle type, product category shows almost no variation in average cost (a $0.65 range across five categories). This is a useful negative finding: it indicates that cost-reduction efforts should focus on routing and vehicle assignment rather than category-specific pricing or handling changes."),

        // ---------------- 4. Insights & Recommendations ----------------
        h1("4. Analytical Insights and Recommendations"),
        p("Synthesizing the EDA and visualizations, four operational conclusions stand out:"),
        bullet("Distance is the dominant cost and delay driver. Both delivery cost (r = 0.79) and delivery delay (r = 0.71) scale strongly with route distance, more than any other variable tested. Route/zone optimization (as scoped in Week 1) is therefore the highest-leverage intervention available."),
        bullet("Warehouse performance is not uniform. The 11.4-point OTD gap between W1 - North and W3 - South is statistically significant, suggesting a warehouse-level operational issue (e.g. dispatch congestion, fleet allocation, or service-area shape) rather than a network-wide problem — this should be investigated warehouse-by-warehouse rather than addressed with a single blanket policy."),
        bullet("Vehicle assignment is a controllable cost lever. Trucks are both the costliest and most variable option; shifting eligible short-distance orders to bike or van delivery is a low-risk way to reduce average cost per delivery without new infrastructure."),
        bullet("Deliveries beyond ~15 km are a leading risk indicator. Because delay rises roughly linearly with distance, this threshold can be used as a simple, explainable early-warning flag for at-risk deliveries, ahead of the more complex forecasting model planned for later weeks."),

        // ---------------- 5. Conclusion ----------------
        h1("5. Conclusion"),
        p(
          "This EDA and visualization phase confirms and sharpens the hypotheses set out in the Week 1 strategic plan: distance-driven cost and delay, and warehouse-level performance variation, are both real and measurable in this dataset, while order volume and product category are comparatively minor factors. These findings directly narrow the scope of the predictive and prescriptive modeling planned next \u2014 prioritizing a distance-aware delay model and route/zone optimization over volume-based batching strategies \u2014 and give stakeholders concrete, chart-backed evidence to support that prioritization ahead of committing further engineering effort."
        ),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("../Week3_EDA_Visualization_Report.docx", buf);
  console.log("done");
});
