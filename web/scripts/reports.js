// scripts/reports.js
// Generates reports using live backend data via api.records.getAll()

import { api } from "./api.js";

let categoryChartInstance = null;
let monthlyChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  loadReports();
});

// ======================================================
// MAIN LOADER
// ======================================================
async function loadReports() {
  try {
    const all = await api.records.getAll();

    const expenses = all.filter(r => r.type === "expense");
    const income = all.filter(r => r.type === "income");

    const derived = computeSummaryFromRaw(expenses, income);

    updateSummary(derived);

    renderCategoryChart(derived.categories);
    renderIncomeExpenseOverTime(expenses, income);

  } catch (error) {
    console.error("Error loading reports:", error);
    document.querySelectorAll(".card p").forEach(p => {
      p.textContent = "Error loading data";
    });
  }
}

// ======================================================
// SUMMARY FROM RAW RECORDS
// ======================================================
function computeSummaryFromRaw(expenses, income) {
  const currency = "USD";

  // ----- EXPENSES -----
  const categories = {};
  let total_spending = 0;

  for (const t of expenses) {
    const amt = toNumber(t.amount);
    total_spending += amt;

    const cat = t.category || "Uncategorized";
    categories[cat] = (categories[cat] || 0) + amt;
  }

  // ----- INCOME -----
  let total_income = 0;
  for (const inc of income) {
    total_income += toNumber(inc.amount);
  }

  // Monthly average (by expense months)
  const months = new Set(expenses.map(e => yyyymm(e.date)).filter(Boolean));
  const monthCount = Math.max(1, months.size);
  const monthly_average = total_spending / monthCount;

  return {
    currency,
    total_spending,
    total_income,
    monthly_average,
    categories,
    topCategory: getTopCategory(categories),
  };
}

// ======================================================
// SUMMARY CARDS
// ======================================================
function updateSummary(sum) {
  const fmt = n => `$${toNumber(n).toFixed(2)} ${sum.currency}`;

  const $ = id => document.getElementById(id);

  $("total-expenses").textContent = fmt(sum.total_spending);
  $("total-income").textContent = fmt(sum.total_income);
  $("monthly-average").textContent = fmt(sum.monthly_average);
  $("top-category").textContent = sum.topCategory || "N/A";
}

function getTopCategory(categories) {
  let top = "N/A";
  let max = 0;

  for (const [cat, amt] of Object.entries(categories || {})) {
    if (amt > max) {
      max = amt;
      top = cat;
    }
  }
  return top;
}

// ======================================================
// CHART COLORS BASED ON THEME
// ======================================================
function getChartColors() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";

  if (theme === "dark") {
    return {
      primary: "#0d6efd",
      success: "#198754",
      warning: "#ffc107",
      danger: "#dc3545",
      info: "#0dcaf0",
      muted: "#adb5bd",
      background: "#212529",
      text: "#f8f9fa",
    };
  }

  return {
    primary: "#007BFF",
    success: "#28A745",
    warning: "#FFC107",
    danger: "#DC3545",
    info: "#17A2B8",
    muted: "#6c757d",
    background: "#ffffff",
    text: "#212529",
  };
}

// ======================================================
// CATEGORY DOUGHNUT CHART
// ======================================================
function renderCategoryChart(categories) {
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;

  if (categoryChartInstance) categoryChartInstance.destroy();

  const colors = getChartColors();
  const labels = Object.keys(categories || {});
  const values = Object.values(categories || {});

  categoryChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: "Spending by Category",
          data: values,
          backgroundColor: [
            colors.primary,
            colors.success,
            colors.warning,
            colors.danger,
            colors.muted,
            colors.info,
            "#6610f2",
            "#6c757d",
          ],
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { color: colors.text } },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 13 },
          formatter: (value, ctx) => {
            const arr = ctx.chart.data.datasets[0].data;
            const total = arr.reduce((a, b) => a + toNumber(b), 0);
            if (!total) return "0%";
            return ((value / total) * 100).toFixed(1) + "%";
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

// ======================================================
// MONTHLY INCOME VS EXPENSES CHART
// ======================================================
function renderIncomeExpenseOverTime(expenses, income) {
  const ctx = document.getElementById("monthlyChart");
  if (!ctx) return;

  if (monthlyChartInstance) monthlyChartInstance.destroy();

  const colors = getChartColors();
  const expenseByDate = sumByDate(expenses);
  const incomeByDate = sumByDate(income);

  const labels = Array.from(
    new Set([...Object.keys(expenseByDate), ...Object.keys(incomeByDate)])
  )
    .filter(Boolean)
    .sort();

  monthlyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Expenses ($)",
          data: labels.map(d => toNumber(expenseByDate[d])),
          borderColor: colors.danger,
          backgroundColor: "rgba(220,53,69,0.2)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Income ($)",
          data: labels.map(d => toNumber(incomeByDate[d])),
          borderColor: colors.success,
          backgroundColor: "rgba(40,167,69,0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true, ticks: { color: colors.text } },
        x: { ticks: { color: colors.text } },
      },
      plugins: {
        legend: { labels: { color: colors.text } },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: $${toNumber(ctx.parsed.y).toFixed(2)}`,
          },
        },
      },
    },
  });

  // Checkbox toggles
  const expToggle = document.getElementById("toggle-expenses");
  if (expToggle) {
    expToggle.addEventListener("change", () => {
      monthlyChartInstance.data.datasets[0].hidden = !expToggle.checked;
      monthlyChartInstance.update();
    });
  }

  const incToggle = document.getElementById("toggle-income");
  if (incToggle) {
    incToggle.addEventListener("change", () => {
      monthlyChartInstance.data.datasets[1].hidden = !incToggle.checked;
      monthlyChartInstance.update();
    });
  }
}

// ======================================================
// HELPERS
// ======================================================
function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function yyyymm(iso) {
  if (!iso) return null;
  const date = normalizeDateKey(iso);
  return date ? date.slice(0, 7) : null;
}

function sumByDate(rows) {
  const out = {};
  for (const r of rows || []) {
    const d = normalizeDateKey(r.date);
    if (!d) continue;
    out[d] = (out[d] || 0) + toNumber(r.amount);
  }
  return out;
}

function normalizeDateKey(iso) {
  if (!iso) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  // Parse fallback
  const d = new Date(iso);
  if (isNaN(d)) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}
