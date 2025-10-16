// ========== HOME DASHBOARD LOGIC (no header/footer loading here) ==========
(() => {
  const DATA_URL = "data/sample.json"; // adjust if your path differs
  const CURRENCY_FALLBACK = "USD";

  const $ = (sel, root = document) => root.querySelector(sel);

  const fmtMoney = (value, currency) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: currency || CURRENCY_FALLBACK })
      .format(value ?? 0);

  const fmtDate = (iso) =>
    new Date(iso + (iso?.length === 10 ? "T00:00:00" : ""))
      .toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

  // ---- Chart (simple canvas bar chart, no external libs)
  function drawBarChart(canvas, dataObj) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const entries = Object.entries(dataObj || {});
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => +e[1] || 0);
    const max = Math.max(1, ...values);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const P = { t: 20, r: 20, b: 50, l: 40 };
    const innerW = canvas.width - P.l - P.r;
    const innerH = canvas.height - P.t - P.b;

    // axes
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(P.l, P.t);
    ctx.lineTo(P.l, P.t + innerH);
    ctx.lineTo(P.l + innerW, P.t + innerH);
    ctx.stroke();

    const gap = 14;
    const barW = Math.max(10, (innerW - gap * (values.length + 1)) / Math.max(values.length, 1));
    const palette = ["#0057b8", "#00a3e0", "#1e3a8a", "#0ea5e9", "#2563eb", "#0891b2", "#3b82f6"];

    values.forEach((v, i) => {
      const h = (v / max) * (innerH - 10);
      const x = P.l + gap + i * (barW + gap);
      const y = P.t + innerH - h;
      ctx.fillStyle = palette[i % palette.length];
      ctx.fillRect(x, y, barW, h);

      ctx.fillStyle = "#111827";
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
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

  function renderLegend(container, categories) {
    if (!container) return;
    container.innerHTML = "";
    const palette = ["#0057b8", "#00a3e0", "#1e3a8a", "#0ea5e9", "#2563eb", "#0891b2", "#3b82f6"];
    Object.keys(categories || {}).forEach((name, i) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.style.color = palette[i % palette.length];
      chip.innerHTML = `<span class="dot" aria-hidden="true"></span>${name}`;
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

  function renderKpis(summary) {
    $("#kpiIncome").textContent = fmtMoney(summary.total_income, summary.currency);
    $("#kpiSpending").textContent = fmtMoney(summary.total_spending, summary.currency);
    $("#kpiBalance").textContent = fmtMoney(summary.net_balance, summary.currency);
    $("#lastUpdated").textContent = `Data updated ${new Date(summary.last_updated).toLocaleString()}`;
  }

  function renderTransactions(tbody, txns, currency) {
    if (!tbody) return;
    tbody.innerHTML = "";
    (txns || [])
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
      .forEach(txn => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${fmtDate(txn.date)}</td>
          <td>${txn.merchant || ""}</td>
          <td>${txn.category || ""}</td>
          <td class="num">${fmtMoney(txn.amount, currency)}</td>
          <td>${txn.payment_method || ""}</td>
          <td>${txn.notes || ""}</td>
        `;
        tbody.appendChild(tr);
      });

    if (!tbody.children.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="subtle">No transactions yet.</td>`;
      tbody.appendChild(tr);
    }
  }

  async function loadData() {
    const resp = await fetch(DATA_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`Failed to load data (${resp.status})`);
    return resp.json();
  }

  function wireActions() {
    $("#btnUpload")?.addEventListener("click", () => alert("Open upload flow…"));
    $("#btnAddTxn")?.addEventListener("click", () => alert("Open add transaction modal…"));
    $("#btnExport")?.addEventListener("click", () => alert("Exporting CSV…"));
  }

  function personalizeWelcome() {
    const name = (window.currentUser && window.currentUser.name) || null;
    $("#welcomeTitle").textContent = name ? `Welcome back, ${name}` : "Welcome back";
  }

  async function init() {
    // default.js already injected header/footer; this file only handles page logic.
    wireActions();
    personalizeWelcome();

    try {
      const data = await loadData();
      const { summary, transactions } = data;

      renderKpis(summary);
      renderTransactions(document.getElementById("txnTbody"), transactions || [], summary.currency);

      const canvas = document.getElementById("categoriesChart");
      drawBarChart(canvas, summary.categories || {});
      renderLegend(document.getElementById("chartLegend"), summary.categories || {});
      renderBreakdown(document.getElementById("categoryList"), summary.categories || {}, summary.currency);
    } catch (err) {
      console.error(err);
      const status = document.getElementById("lastUpdated");
      if (status) status.textContent = "Could not load data.";
      const tb = document.getElementById("txnTbody");
      if (tb) tb.innerHTML = `<tr><td colspan="6" class="subtle">Failed to load transactions.</td></tr>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
