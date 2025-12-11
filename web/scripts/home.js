// ========== HOME DASHBOARD LOGIC (with dynamic dashboard view) ==========
import { api } from "./api.js";

(() => {
  const CURRENCY_FALLBACK = "USD";
  const $ = (sel, root = document) => root.querySelector(sel);

  const fmtMoney = (value, currency) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || CURRENCY_FALLBACK,
    }).format(Number.isFinite(value) ? value : 0);

  const fmtDate = (iso) =>
    new Date(iso + (iso?.length === 10 ? "T00:00:00" : ""))
      .toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });

  // ============================================================
  //  HELPER: FILTER RECORDS BY DASHBOARD VIEW
  // ============================================================
  function filterRecordsByView(records, view) {
    const now = new Date();
    return records.filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      switch (view) {
        case "Weekly": {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay()); 
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return d >= startOfWeek && d <= endOfWeek;
        }
        case "Monthly":
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case "Yearly":
          return d.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }

  // ============================================================
  //  SIMPLE BAR CHART
  // ============================================================
  function drawBarChart(canvas, dataObj) {
    if (!canvas) return;

    const parentWidth = canvas.parentElement.clientWidth || 600;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = parentWidth * dpr;
    canvas.height = 300 * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const entries = Object.entries(dataObj || {});
    const labels = entries.map((e) => e[0]);
    const values = entries.map((e) => +e[1] || 0);
    const max = Math.max(1, ...values);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const P = { t: 20, r: 20, b: 50, l: 40 };
    const innerW = canvas.width / dpr - P.l - P.r;
    const innerH = canvas.height / dpr - P.t - P.b;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(P.l, P.t);
    ctx.lineTo(P.l, P.t + innerH);
    ctx.lineTo(P.l + innerW, P.t + innerH);
    ctx.stroke();

    const gap = 14;
    const barW = Math.max(
      10,
      (innerW - gap * (values.length + 1)) / Math.max(values.length, 1)
    );
    const palette = [
      "#0057b8", "#00a3e0", "#1e3a8a", "#0ea5e9", "#2563eb", "#0891b2", "#3b82f6"
    ];

    values.forEach((v, i) => {
      const h = (v / max) * (innerH - 10);
      const x = P.l + gap + i * (barW + gap);
      const y = P.t + innerH - h;
      ctx.fillStyle = palette[i % palette.length];
      ctx.fillRect(x, y, barW, h);

      const isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";
      ctx.fillStyle = isDarkTheme ? "#ffffff" : "#111827";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(v.toFixed(2)), x + barW / 2, y - 6);

      ctx.fillStyle = "#6b7280";
      ctx.save();
      ctx.translate(x + barW / 2, P.t + innerH + 16);
      ctx.rotate(-Math.PI / 10);
      ctx.fillText(labels[i], 0, 0);
      ctx.restore();
    });
  }

  // ============================================================
  //  UI HELPERS
  // ============================================================
  function renderLegend(container, categories) {
    if (!container) return;
    container.innerHTML = "";
    const palette = [
      "#0057b8", "#00a3e0", "#1e3a8a", "#0ea5e9", "#2563eb", "#0891b2", "#3b82f6"
    ];
    Object.keys(categories || {}).forEach((name, i) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.style.color = palette[i % palette.length];
      chip.innerHTML = `<span class="dot"></span>${name}`;
      container.appendChild(chip);
    });
  }

  function renderBreakdown(listEl, categories, currency) {
    if (!listEl) return;
    listEl.innerHTML = "";
    const total = Object.values(categories || {}).reduce((a, b) => a + b, 0);

    Object.entries(categories || {})
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, amt]) => {
        const li = document.createElement("li");
        const pct = total ? Math.round((amt / total) * 100) : 0;
        li.innerHTML = `<span>${name}</span><span>${fmtMoney(amt, currency)} (${pct}%)</span>`;
        listEl.appendChild(li);
      });
  }

  // ============================================================
  //  COMPUTE SUMMARY
  // ============================================================
  function computeOverview(records) {
    const expenses = records.filter((r) => r.type === "expense");
    const income = records.filter((r) => r.type === "income");

    const currency = CURRENCY_FALLBACK;

    const total_spending = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
    const total_income = income.reduce((s, r) => s + Number(r.amount || 0), 0);
    const net_balance = total_income - total_spending;

    const categories = expenses.reduce((acc, r) => {
      const key = r.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + Number(r.amount || 0);
      return acc;
    }, {});

    const dates = records.map((r) => r.date).filter(Boolean);
    const latestISO = dates.length ? dates.sort().slice(-1)[0] : null;

    return { 
      total_spending, 
      total_income, 
      net_balance, 
      categories, 
      currency, 
      last_updated: latestISO || new Date().toISOString() 
    };
  }

  function renderKpis(comp, viewLabel) {
    $("#kpiIncome").textContent = fmtMoney(comp.total_income, comp.currency);
    $("#kpiSpending").textContent = fmtMoney(comp.total_spending, comp.currency);
    $("#kpiBalance").textContent = fmtMoney(comp.net_balance, comp.currency);

    $("#kpiPeriodIncome").textContent = viewLabel;
    $("#kpiPeriodSpending").textContent = viewLabel;
    $("#kpiPeriodBalance").textContent = viewLabel;

    $("#lastUpdated").textContent =
      "Data updated " + new Date(comp.last_updated).toLocaleString();
  }

  // ============================================================
  //  TABLE
  // ============================================================
  function renderExpensesTable(tbody, records, currency) {
    if (!tbody) return;
    tbody.innerHTML = "";

    const expenses = records
      .filter((r) => r.type === "expense")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    if (!expenses.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="subtle">No expenses yet.</td></tr>`;
      return;
    }

    expenses.forEach((txn) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDate(txn.date)}</td>
        <td>${txn.category || ""}</td>
        <td class="num">${fmtMoney(txn.amount, currency)}</td>
        <td>${txn.note || ""}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ============================================================
  //  CSV EXPORT
  // ============================================================
  function exportRecordsToCSV(records) {
    if (!records || !records.length) {
      alert("No records available to export.");
      return;
    }

    const headers = ["Date", "Type", "Category", "Amount", "Notes"];
    const rows = [headers.join(",")];

    records.forEach((r) => {
      const date = r.date ? new Date(r.date).toISOString().split("T")[0] : "";
      const type = r.type || "";
      const category = (r.category || "").replace(/,/g, ";");
      const amount = r.amount ?? "";
      const notes = (r.note || "").replace(/,/g, ";");
      rows.push([date, type, category, amount, notes].join(","));
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  // ============================================================
  //  API LOADER (FIXED TO USE api.records.getAll)
  // ============================================================
  async function loadFromAPI() {
    return await api.records.getAll();
  }

  // ============================================================
  //  UI ACTIONS
  // ============================================================
  function wireActions() {
    const modal = $("#addTxnModal");
    const form = $("#txnForm");
    const btnCancel = $("#btnCancelModal");

    $("#btnUpload")?.addEventListener("click", () => {
      window.location.href = "upload.html";
    });

    $("#btnExport")?.addEventListener("click", async () => {
      try {
        const records = await api.records.getAll();
        exportRecordsToCSV(records);
      } catch (err) {
        console.error("CSV Export error:", err);
        alert("Failed to export CSV: " + err.message);
      }
    });

    $("#btnAddTxn")?.addEventListener("click", () => {
      modal.classList.remove("hidden");
    });

    btnCancel?.addEventListener("click", () => {
      modal.classList.add("hidden");
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newTxn = {
        type: $("#txnType").value,
        date: $("#txnDate").value,
        category: $("#txnCategory").value,
        amount: parseFloat($("#txnAmount").value),
        note: $("#txnNotes")?.value || "",
      };

      try {
        await api.records.create(newTxn);
        alert("Transaction added!");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to save transaction: " + err.message);
      }
    });
  }

  async function personalizeWelcome() {
    try {
      const { user } = await api.auth.me();
      $("#welcomeTitle").textContent =
        `Welcome back, ${user.fullName || user.username}`;
    } catch {
      $("#welcomeTitle").textContent = "Welcome back";
    }
  }

  // ============================================================
  //  INIT
  // ============================================================
  async function init() {
    wireActions();
    await personalizeWelcome();

    try {
      const records = await loadFromAPI();

      const savedSettings = JSON.parse(localStorage.getItem("userSettings")) || {};
      const dashboardView = savedSettings.dashboardView || "Monthly";
      const viewLabel =
        dashboardView === "Weekly" ? "This week" :
        dashboardView === "Monthly" ? "This month" :
        dashboardView === "Yearly" ? "This year" :
        "This month";

      const filteredRecords = filterRecordsByView(records, dashboardView);

      const computed = computeOverview(filteredRecords);

      renderKpis(computed, viewLabel);
      renderExpensesTable($("#txnTbody"), filteredRecords, computed.currency);

      const canvas = $("#categoriesChart");
      drawBarChart(canvas, computed.categories);
      renderLegend($("#chartLegend"), computed.categories);
      renderBreakdown($("#categoryList"), computed.categories, computed.currency);

      window.addEventListener("resize", () =>
        drawBarChart(canvas, computed.categories)
      );
    } catch (err) {
      console.error(err);
      $("#lastUpdated").textContent = "Could not load data.";
      $("#txnTbody").innerHTML =
        `<tr><td colspan="4" class="subtle">Failed to load records.</td></tr>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
