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
      renderSpendingOverTime(data.transactions);
  
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
  
  // Chart 1: Spending by Category
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
        },
      },
    });
  }
  
  // Chart 2: Spending Over Time (by Date)
  function renderSpendingOverTime(transactions) {
    const ctx = document.getElementById("monthlyChart");
    if (!ctx) return;
  
    // Sort transactions by date
    const sorted = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  
    new Chart(ctx, {
      type: "line",
      data: {
        labels: sorted.map(t => t.date),
        datasets: [{
          label: "Transaction Amount ($)",
          data: sorted.map(t => t.amount),
          borderColor: "#007BFF",
          backgroundColor: "rgba(0, 123, 255, 0.2)",
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }
  
  window.addEventListener("DOMContentLoaded", loadReports);
  