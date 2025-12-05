// scripts/reports.js
// Generates reports using live backend data via api.records.getAll()

import { api } from "./api.js";

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

    // Update summary cards
    updateSummary(derived);

    // Render charts
    renderCategoryChart(derived.categories);
    renderIncomeExpenseOverTime(expenses, income);

  } catch (error) {
    console.error("Error loading reports:", error);
    document.querySelectorAll(".card p").forEach(p => (p.textContent = "Error loading data"));
  }
}

// ======================================================
// SUMMARY FROM RAW RECORDS
// ======================================================
function computeSummaryFromRaw(expenses, income) {
  const currency = "USD";

  // Expense categories & total spending
  const categories = {};
  let total_spending = 0;

  for (const t of expenses) {
    const amt = toNumber(t?.amount);
    total_spending += amt;
    const cat = t?.category || "Uncategorized";
    categories[cat] = (categories[cat] || 0) + amt;
  }

  // Monthly spending average (months with expenses)
  const months = new Set(expenses.map(e => yyyymm(e.date)).filter(Boolean));
  const monthCount = Math.max(1, months.size);
  const monthly_average = total_spending / monthCount;

  const topCategory = getTopCategory(categories);

  return { currency, total_spending, monthly_average, categories, topCategory };
}

// ======================================================
// SUMMARY CARDS
// ======================================================
function updateSummary({ currency, total_spending, monthly_average, topCategory }) {
  const fmt = n => `$${toNumber(n).toFixed(2)} ${currency}`;
  const $ = id => document.getElementById(id);

  $("total-expenses").textContent = fmt(total_spending);
  $("monthly-average").textContent = fmt(monthly_average);
  $("top-category").textContent = topCategory || "N/A";
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
      text: "#f8f9fa"
    };
  }
  // Light theme defaults
  return {
    primary: "#007BFF",
    success: "#28A745",
    warning: "#FFC107",
    danger: "#DC3545",
    info: "#17A2B8",
    muted: "#6c757d",
    background: "#ffffff",
    text: "#212529"
  };
}

// ======================================================
// CHART 1 — Category Doughnut Chart
// ======================================================
function renderCategoryChart(categories) {
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;

  const colors = getChartColors();
  const labels = Object.keys(categories || {});
  const values = Object.values(categories || {});

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: "Spending by Category",
          data: values,
          backgroundColor: [
            colors.primary, colors.success, colors.warning, colors.danger,
            colors.muted, colors.info, "#6610f2", "#6c757d"
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
// CHART 2 — Income & Expenses Over Time
// ======================================================
function renderIncomeExpenseOverTime(expenses, income) {
  const ctx = document.getElementById("monthlyChart");
  if (!ctx) return;

  const colors = getChartColors();
  const expenseByDate = sumByDate(expenses);
  const incomeByDate = sumByDate(income);

  const labels = Array.from(new Set([
    ...Object.keys(expenseByDate),
    ...Object.keys(incomeByDate),
  ])).filter(Boolean).sort();

  const expenseData = labels.map(d => toNumber(expenseByDate[d]));
  const incomeData = labels.map(d => toNumber(incomeByDate[d]));

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Expenses ($)",
          data: expenseData,
          borderColor: colors.danger,
          backgroundColor: "rgba(220,53,69,0.2)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Income ($)",
          data: incomeData,
          borderColor: colors.success,
          backgroundColor: "rgba(40,167,69,0.2)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: colors.text }
        },
        x: { ticks: { color: colors.text } }
      },
      plugins: {
        legend: { position: "top", labels: { color: colors.text } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: $${toNumber(ctx.parsed.y).toFixed(2)}`
          }
        }
      },
    },
  });

  // Toggle series visibility
  const expToggle = document.getElementById("toggle-expenses");
  const incToggle = document.getElementById("toggle-income");

  if (expToggle) {
    chart.data.datasets[0].hidden = !expToggle.checked;
    expToggle.addEventListener("change", () => {
      chart.data.datasets[0].hidden = !expToggle.checked;
      chart.update("none");
    });
  }

  if (incToggle) {
    chart.data.datasets[1].hidden = !incToggle.checked;
    incToggle.addEventListener("change", () => {
      chart.data.datasets[1].hidden = !incToggle.checked;
      chart.update("none");
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

// "YYYY-MM"
function yyyymm(iso) {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

// Sum by exact ISO date "YYYY-MM-DD"
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
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return iso;

  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(date)) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}
