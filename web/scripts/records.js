// ========== RECORDS PAGE LOGIC (header/footer handled by default.js) ==========
(() => {
  const DATA_URL = "data/sample.json"; // adjust if needed
  const CURRENCY_FALLBACK = "USD";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const fmtMoney = (value, currency) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: currency || CURRENCY_FALLBACK }).format(value ?? 0);

  const fmtDate = (iso) =>
    new Date(iso + (iso?.length === 10 ? "T00:00:00" : "")).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "2-digit"
    });

  // ---- Data + state
  let RAW = [];
  let summaryCurrency = CURRENCY_FALLBACK;

  const state = {
    q: "",
    category: "",
    method: "",
    minDate: "",
    maxDate: "",
    minAmt: "",
    maxAmt: "",
    sort: "date_desc",
    page: 1,
    pageSize: 25,
  };

  async function loadData() {
    const resp = await fetch(DATA_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`Failed to load data (${resp.status})`);
    const json = await resp.json();
    RAW = json.transactions || [];
    summaryCurrency = json.summary?.currency || CURRENCY_FALLBACK;
    hydrateCategoryFilter(json.summary?.categories || {});
  }

  function hydrateCategoryFilter(categories) {
    const sel = $("#category");
    if (!sel) return;
    const names = Object.keys(categories).sort((a, b) => a.localeCompare(b));
    for (const name of names) {
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    }
  }

  // ---- Filtering / sorting / paging
  function matchesText(txn, q) {
    if (!q) return true;
    const t = q.toLowerCase();
    return (
      (txn.merchant || "").toLowerCase().includes(t) ||
      (txn.category || "").toLowerCase().includes(t) ||
      (txn.notes || "").toLowerCase().includes(t)
    );
  }

  function withinDate(txn, minDate, maxDate) {
    if (!minDate && !maxDate) return true;
    const d = txn.date; // yyyy-mm-dd
    if (minDate && d < minDate) return false;
    if (maxDate && d > maxDate) return false;
    return true;
  }

  function withinAmount(txn, minAmt, maxAmt) {
    const a = Number(txn.amount) || 0;
    if (minAmt !== "" && a < Number(minAmt)) return false;
    if (maxAmt !== "" && a > Number(maxAmt)) return false;
    return true;
  }

  function applyFilters() {
    let list = RAW.slice();

    list = list.filter(txn =>
      matchesText(txn, state.q) &&
      (!state.category || txn.category === state.category) &&
      (!state.method || (txn.payment_method || "").toLowerCase() === state.method.toLowerCase()) &&
      withinDate(txn, state.minDate, state.maxDate) &&
      withinAmount(txn, state.minAmt, state.maxAmt)
    );

    list.sort((a, b) => {
      switch (state.sort) {
        case "date_asc": return a.date.localeCompare(b.date);
        case "date_desc": return b.date.localeCompare(a.date);
        case "amount_asc": return (a.amount ?? 0) - (b.amount ?? 0);
        case "amount_desc": return (b.amount ?? 0) - (a.amount ?? 0);
        case "merchant_asc": return (a.merchant || "").localeCompare(b.merchant || "");
        case "merchant_desc": return (b.merchant || "").localeCompare(a.merchant || "");
        default: return 0;
      }
    });

    return list;
  }

  function paginate(list) {
    const size = Number(state.pageSize) || 25;
    const pages = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(Math.max(1, state.page), pages);
    const start = (page - 1) * size;
    const slice = list.slice(start, start + size);
    return { slice, page, pages, total: list.length };
  }

  // ---- Render
  function renderTable(rows) {
    const tb = $("#recordsTbody");
    if (!tb) return;

    tb.innerHTML = "";
    if (!rows.length) {
      tb.innerHTML = `<tr><td colspan="6" class="subtle">No results.</td></tr>`;
      return;
    }

    for (const txn of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDate(txn.date)}</td>
        <td>${txn.merchant || ""}</td>
        <td>${txn.category || ""}</td>
        <td class="num">${fmtMoney(txn.amount, summaryCurrency)}</td>
        <td>${txn.payment_method || ""}</td>
        <td>${txn.notes || ""}</td>
      `;
      tb.appendChild(tr);
    }
  }

  function renderPager(info) {
    $("#pageInfo").textContent = `Page ${info.page} of ${info.pages} — ${info.total} result${info.total === 1 ? "" : "s"}`;
    $("#prevPage").disabled = info.page <= 1;
    $("#nextPage").disabled = info.page >= info.pages;
  }

  function updateView() {
    const filtered = applyFilters();
    const info = paginate(filtered);
    renderTable(info.slice);
    renderPager(info);
  }

  // ---- Export CSV for filtered set
  function exportCSV() {
    const filtered = applyFilters();
    const header = ["Date", "Merchant", "Category", "Amount", "Method", "Notes"];
    const lines = [header.join(",")];

    for (const t of filtered) {
      const row = [
        t.date,
        (t.merchant || "").replace(/"/g, '""'),
        (t.category || "").replace(/"/g, '""'),
        (Number(t.amount) ?? 0).toFixed(2),
        (t.payment_method || "").replace(/"/g, '""'),
        (t.notes || "").replace(/"/g, '""'),
      ].map(v => /[",\n]/.test(v) ? `"${v}"` : String(v));
      lines.push(row.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `records-${new Date().toISOString().slice(0,10)}.csv`
    });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ---- Wiring
  function readForm() {
    state.q = $("#q").value.trim();
    state.category = $("#category").value;
    state.method = $("#method").value;
    state.minDate = $("#minDate").value;
    state.maxDate = $("#maxDate").value;
    state.minAmt = $("#minAmt").value;
    state.maxAmt = $("#maxAmt").value;
    state.sort = $("#sort").value;
    state.pageSize = Number($("#pageSize").value) || 25;
    state.page = 1; // reset when filters change
  }

  function wireFilters() {
    $("#filtersForm").addEventListener("submit", (e) => {
      e.preventDefault();
      readForm();
      updateView();
    });

    $("#btnClear").addEventListener("click", () => {
      $$("#filtersForm input, #filtersForm select").forEach(el => {
        if (el.id === "pageSize") return;
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
      });
      readForm();
      updateView();
    });

    $("#q").addEventListener("input", () => { readForm(); updateView(); });
    $("#sort").addEventListener("change", () => { readForm(); updateView(); });
    $("#pageSize").addEventListener("change", () => { readForm(); updateView(); });
  }

  function wirePager() {
    $("#prevPage").addEventListener("click", () => { state.page = Math.max(1, state.page - 1); updateView(); });
    $("#nextPage").addEventListener("click", () => { state.page = state.page + 1; updateView(); });
  }

  function wireActions() {
    $("#btnExport").addEventListener("click", exportCSV);
    $("#btnAddTxn").addEventListener("click", () => alert("Open add transaction modal…"));
    $("#btnUpload").addEventListener("click", () => alert("Open upload flow…"));
  }

  async function init() {
    // default.js handles header/footer injection.
    wireFilters();
    wirePager();
    wireActions();

    try {
      await loadData();
      readForm();
      updateView();
    } catch (err) {
      console.error(err);
      const tb = $("#recordsTbody");
      if (tb) tb.innerHTML = `<tr><td colspan="6" class="subtle">Failed to load data.</td></tr>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
