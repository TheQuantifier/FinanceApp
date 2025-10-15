/* ===============================================
   Finance App – index.js
   Handles dashboard initialization, demo data, and
   dynamic updates for the main overview page.
   =============================================== */

// Wait for the DOM to load before running scripts
document.addEventListener("DOMContentLoaded", () => {
  console.log("Finance App dashboard loaded.");

  // Initialize demo data
  const demoExpenses = [
    { category: "Food", amount: 124.5 },
    { category: "Travel", amount: 58.9 },
    { category: "Office", amount: 89.2 },
    { category: "Utilities", amount: 42.3 },
    { category: "Other", amount: 33.4 },
  ];

  // Render totals and sample graph
  renderTotals(demoExpenses);
  renderChart(demoExpenses);
});

/**
 * Calculates total expenses and displays summary.
 */
function renderTotals(expenses) {
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalBox = document.createElement("div");

  totalBox.className = "total-box";
  totalBox.innerHTML = `
    <h3>Total Spending</h3>
    <p class="amount">$${total.toFixed(2)}</p>
  `;

  document.querySelector("main").prepend(totalBox);
}

/**
 * Renders a simple category summary chart (bar style).
 */
function renderChart(expenses) {
  const chartContainer = document.createElement("div");
  chartContainer.className = "chart-container";
  chartContainer.innerHTML = `<h3>Spending by Category</h3>`;

  const maxAmount = Math.max(...expenses.map(e => e.amount));

  const chartBars = expenses.map(e => {
    const width = (e.amount / maxAmount) * 100;
    return `
      <div class="chart-row">
        <span class="label">${e.category}</span>
        <div class="bar" style="width:${width}%;"></div>
        <span class="value">$${e.amount.toFixed(2)}</span>
      </div>
    `;
  }).join("");

  chartContainer.innerHTML += chartBars;
  document.querySelector("main").appendChild(chartContainer);
}