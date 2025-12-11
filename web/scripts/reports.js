// scripts/reports.js
import { api } from "./api.js";

let expensePieChart = null;
let incomePieChart = null;
let monthlyChartInstance = null;

document.addEventListener("DOMContentLoaded", loadReports);

// ======================================================
// MAIN LOADER
// ======================================================
async function loadReports() {
  try {
    const all = await api.records.getAll();

    const expenses = all.filter(r => r.type === "expense");
    const income = all.filter(r => r.type === "income");

    const summary = computeSummary(expenses, income);

    updateSummary(summary);

    renderPieChart("pieChartExpenses", summary.expenseCategories, "Expenses");
    renderPieChart("pieChartIncome", summary.incomeCategories, "Income");

    renderIncomeExpenseOverTime(expenses, income);

  } catch (err) {
    console.error("Error loading reports:", err);
  }
}

// ======================================================
// SUMMARY PROCESSING
// ======================================================
function computeSummary(expenses, income) {
  const expenseCategories = {};
  const incomeCategories = {};

  let totalExpenses = 0;
  let totalIncome = 0;

  for (const e of expenses) {
    const amt = Number(e.amount) || 0;
    totalExpenses += amt;
    const cat = e.category || "Uncategorized";
    expenseCategories[cat] = (expenseCategories[cat] || 0) + amt;
  }

  for (const inc of income) {
    const amt = Number(inc.amount) || 0;
    totalIncome += amt;
    const cat = inc.category || "Uncategorized";
    incomeCategories[cat] = (incomeCategories[cat] || 0) + amt;
  }

  const distinctMonths = new Set(expenses.map(e => e.date?.slice(0, 7)));
  const monthCount = Math.max(1, distinctMonths.size);

  return {
    currency: "USD",
    total_spending: totalExpenses,
    total_income: totalIncome,
    monthly_average: totalExpenses / monthCount,
    expenseCategories,
    incomeCategories,
    topCategory:
      Object.entries(expenseCategories).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "N/A",
  };
}

// ======================================================
// UPDATE SUMMARY CARD VALUES
// ======================================================
function updateSummary(s) {
  const fmt = n => `$${(Number(n) || 0).toFixed(2)} ${s.currency}`;

  document.getElementById("total-expenses").textContent = fmt(s.total_spending);
  document.getElementById("total-income").textContent = fmt(s.total_income);
  document.getElementById("monthly-average").textContent = fmt(s.monthly_average);
  document.getElementById("top-category").textContent = s.topCategory;
}

// ======================================================
// PIE CHART (SHARED COMPONENT) — FIXED SIZING
// ======================================================
function renderPieChart(canvasId, categories, label) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Destroy existing chart instance
  if (canvasId === "pieChartExpenses" && expensePieChart)
    expensePieChart.destroy();
  if (canvasId === "pieChartIncome" && incomePieChart)
    incomePieChart.destroy();

  const labels = Object.keys(categories);
  const values = Object.values(categories);
  const total = values.reduce((a, b) => a + b, 0);

  // Stable color palette
  const colors = [
    "#007BFF",
    "#28A745",
    "#FFC107",
    "#DC3545",
    "#17A2B8",
    "#6f42c1",
    "#6c757d"
  ];

  const pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: colors.slice(0, labels.length)
        }
      ]
    },
    options: {
      maintainAspectRatio: true,   // ⬅ Prevents chart growing vertically
      responsive: true,

      plugins: {
        legend: {
          position: "bottom",
          labels: { color: getChartColors().text }
        },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 13 },
          formatter: value => {
            if (!total) return "0%";
            return ((value / total) * 100).toFixed(1) + "%";
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  // Store chart instance
  if (canvasId === "pieChartExpenses") expensePieChart = pieChart;
  else incomePieChart = pieChart;
}

// ======================================================
// LINE CHART (Income vs Expenses)
// ======================================================
function renderIncomeExpenseOverTime(expenses, income) {
  const ctx = document.getElementById("monthlyChart");
  if (!ctx) return;

  if (monthlyChartInstance) monthlyChartInstance.destroy();

  const expenseByDate = sumByDate(expenses);
  const incomeByDate = sumByDate(income);

  const labels = Array.from(
    new Set([...Object.keys(expenseByDate), ...Object.keys(incomeByDate)])
  ).sort();

  const colors = getChartColors();

  monthlyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Expenses",
          data: labels.map(d => expenseByDate[d] || 0),
          borderColor: "#DC3545",
          backgroundColor: "rgba(220,53,69,0.25)",
          fill: true,
          tension: 0.3
        },
        {
          label: "Income",
          data: labels.map(d => incomeByDate[d] || 0),
          borderColor: "#28A745",
          backgroundColor: "rgba(40,167,69,0.25)",
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: colors.text } }
      },
      scales: {
        x: { ticks: { color: colors.text } },
        y: { ticks: { color: colors.text }, beginAtZero: true }
      }
    }
  });

  // Toggle visibility
  document.getElementById("toggle-expenses")?.addEventListener("change", e => {
    monthlyChartInstance.data.datasets[0].hidden = !e.target.checked;
    monthlyChartInstance.update();
  });

  document.getElementById("toggle-income")?.addEventListener("change", e => {
    monthlyChartInstance.data.datasets[1].hidden = !e.target.checked;
    monthlyChartInstance.update();
  });
}

// ======================================================
// HELPERS
// ======================================================
function getChartColors() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";

  return theme === "dark"
    ? { text: "#f8f9fa" }
    : { text: "#212529" };
}

function sumByDate(rows) {
  const out = {};
  for (const r of rows) {
    const key = r.date?.slice(0, 10);
    if (key) out[key] = (out[key] || 0) + Number(r.amount || 0);
  }
  return out;
}
