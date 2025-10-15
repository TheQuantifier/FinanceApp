// reports.js
// Dynamically loads report data from /data/sample.json and generates charts

async function loadReports() {
  try {
    const response = await fetch("data/sample.json");
    if (!response.ok) throw new Error("Failed to load report data.");

    const data = await response.json();

    // Populate summary cards
    updateSummary(data.summary);

    // Generate charts
    renderCategoryChart(data.summary.categories);
    renderIncomeExpenseOverTime(data.transactions, data.income);

  } catch (error) {
    console.error("Error loading reports:", error);
    document.querySelectorAll(".card p").forEach(p => p.textContent = "Error loading data");
  }
}

// ========== Summary Section ==========
function updateSummary(summary) {
  const total = summary.total_spending || 0;
  const topCategory = getTopCategory(summary.categories);
  const avg = total / Object.keys(summary.categories).length;

  document.getElementById("total-expenses").textContent = `$${total.toFixed(2)} ${summary.currency}`;
  document.getElementById("monthly-average").textContent = `$${avg.toFixed(2)} ${summary.currency}`;
  document.getElementById("top-category").textContent = topCategory;
}

function getTopCategory(categories) {
  let top = null;
  let max = 0;
  for (const [category, amount] of Object.entries(categories)) {
    if (amount > max) {
      max = amount;
      top = category;
    }
  }
  return top || "N/A";
}

// ========== Charts ==========

// Chart 1: Spending by Category (with percentage labels)
function renderCategoryChart(categories) {
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        label: "Spending by Category",
        data: Object.values(categories),
        backgroundColor: ["#007BFF", "#28A745", "#FFC107", "#DC3545", "#6F42C1"],
      }],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 13 },
          formatter: (value, context) => {
            const dataArr = context.chart.data.datasets[0].data;
            const total = dataArr.reduce((sum, val) => sum + val, 0);
            const pct = ((value / total) * 100).toFixed(1);
            return pct + "%";
          },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

// Chart 2: Income & Expenses Over Time (with toggles)
function renderIncomeExpenseOverTime(transactions, income) {
  const ctx = document.getElementById("monthlyChart");
  if (!ctx) return;

  const sortedExpenses = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  const sortedIncome = income.sort((a, b) => new Date(a.date) - new Date(b.date));

  const expenseDates = sortedExpenses.map(t => t.date);
  const incomeDates = sortedIncome.map(i => i.date);
  const labels = Array.from(new Set([...expenseDates, ...incomeDates])).sort();

  const expenseMap = Object.fromEntries(sortedExpenses.map(t => [t.date, t.amount]));
  const incomeMap = Object.fromEntries(sortedIncome.map(i => [i.date, i.amount]));

  const expenseData = labels.map(date => expenseMap[date] || 0);
  const incomeData = labels.map(date => incomeMap[date] || 0);

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Expenses ($)",
          data: expenseData,
          borderColor: "#DC3545",
          backgroundColor: "rgba(220, 53, 69, 0.2)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Income ($)",
          data: incomeData,
          borderColor: "#28A745",
          backgroundColor: "rgba(40, 167, 69, 0.2)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true },
      },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
    },
  });

  // === Checkboxes for toggling ===
  const expToggle = document.getElementById("toggle-expenses");
  const incToggle = document.getElementById("toggle-income");

  if (expToggle) {
    expToggle.addEventListener("change", () => {
      chart.data.datasets[0].hidden = !expToggle.checked;
      chart.update("none");
    });
  }

  if (incToggle) {
    incToggle.addEventListener("change", () => {
      chart.data.datasets[1].hidden = !incToggle.checked;
      chart.update("none");
    });
  }
}

window.addEventListener("DOMContentLoaded", loadReports);