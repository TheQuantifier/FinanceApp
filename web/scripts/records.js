// ========== RECORDS PAGE LOGIC (Expenses + Income; header/footer handled by default.js) ==========
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

  // ---- Data
  let EXP_RAW = [];
  let INC_RAW = [];
  let summaryCurrency = CURRENCY_FALLBACK;

  async function loadData() {
    const resp = await fetch(DATA_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`Failed to load data (${resp.status})`);
    const json = await resp.json();

    EXP_RAW = json.transactions || []; // expenses come from "transactions"
    INC_RAW = json.income || [];       // income comes from "income"
    summaryCurrency = json.summary?.currency || CURRENCY_FALLBACK;

    hydrateCategoryFilters(json);
  }

  function hydrateCategoryFilters(json) {
    // Expenses: prefer summary.categories, fallback to EXP_RAW unique categories
    const expSel = $("#category");
    if (expSel) {
      const expCats =
        Object.keys(json.summary?.categories || {}).length
          ? Object.keys(json.summary.categories)
          : Array.from(new Set(EXP_RAW.map(t => t.category).filter(Boolean)));
      expCats.sort((a, b) => a.localeCompare(b));
      for (const name of expCats) {
        const opt = document.createElement("option");
        opt.value = name; opt.textContent = name;
        expSel.appendChild(opt);
      }
    }

    // Income: prefer summary.income_sources, fallback to INC_RAW unique categories
    const incSel = $("#categoryIncome");
    if (incSel) {
      const incCats =
        Object.keys(json.summary?.income_sources || {}).length
          ? Object.keys(json.summary.income_sources)
          : Array.from(new Set(INC_RAW.map(t => t.category).filter(Boolean)));
      incCats.sort((a, b) => a.localeCompare(b));
      for (const name of incCats) {
        const opt = document.createElement("option");
        opt.value = name; opt.textContent = name;
        incSel.appendChild(opt);
      }
    }
  }

  // ---- Generic controller factory (configured per section)
  function makeController(cfg) {
    // cfg: {
    //   prefix: "exp" | "inc",
    //   rows: () => array,
    //   textFields: ["merchant","category","notes"] or ["source","category","notes"],
    //   sortKeys: { alpha: "merchant" | "source" }
    //   columns: (txn) => string (row HTML)
    // }
    const els = {
      q: $(`#${cfg.prefix === "exp" ? "q" : "qIncome"}`),
      category: $(`#${cfg.prefix === "exp" ? "category" : "categoryIncome"}`),
      method: $(`#${cfg.prefix === "exp" ? "method" : "methodIncome"}`),
      minDate: $(`#${cfg.prefix === "exp" ? "minDate" : "minDateIncome"}`),
      maxDate: $(`#${cfg.prefix === "exp" ? "maxDate" : "maxDateIncome"}`),
      minAmt: $(`#${cfg.prefix === "exp" ? "minAmt" : "minAmtIncome"}`),
      maxAmt: $(`#${cfg.prefix === "exp" ? "maxAmt" : "maxAmtIncome"}`),
      sort: $(`#${cfg.prefix === "exp" ? "sort" : "sortIncome"}`),
      pageSize: $(`#${cfg.prefix === "exp" ? "pageSize" : "pageSizeIncome"}`),
      form: $(`#${cfg.prefix === "exp" ? "filtersForm" : "filtersFormIncome"}`),
      btnClear: $(`#${cfg.prefix === "exp" ? "btnClear" : "btnClearIncome"}`),
      tbody: $(`#${cfg.prefix === "exp" ? "recordsTbody" : "recordsTbodyIncome"}`),
      prevPage: $(`#${cfg.prefix === "exp" ? "prevPage" : "prevPageIncome"}`),
      nextPage: $(`#${cfg.prefix === "exp" ? "nextPage" : "nextPageIncome"}`),
      pageInfo: $(`#${cfg.prefix === "exp" ? "pageInfo" : "pageInfoIncome"}`),
      btnExport: $(`#${cfg.prefix === "exp" ? "btnExportExpenses" : "btnExportIncome"}`),
    };

    const state = {
      q: "", category: "", method: "",
      minDate: "", maxDate: "",
      minAmt: "", maxAmt: "",
      sort: "date_desc",
      page: 1,
      pageSize: 25,
    };

    function matchesText(txn, q) {
      if (!q) return true;
      const t = q.toLowerCase();
      return cfg.textFields.some(f => (txn[f] || "").toLowerCase().includes(t));
    }

    function withinDate(txn, minDate, maxDate) {
      if (!minDate && !maxDate) return true;
      const d = txn.date;
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
      let list = cfg.rows().slice();

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
          case "merchant_asc":
          case "source_asc": {
            const k = cfg.sortKeys.alpha;
            return (a[k] || "").localeCompare(b[k] || "");
          }
          case "merchant_desc":
          case "source_desc": {
            const k = cfg.sortKeys.alpha;
            return (b[k] || "").localeCompare(a[k] || "");
          }
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
      return { slice: list.slice(start, start + size), page, pages, total: list.length };
    }

    function renderTable(rows) {
      const tb = els.tbody;
      if (!tb) return;
      tb.innerHTML = "";
      if (!rows.length) {
        tb.innerHTML = `<tr><td colspan="6" class="subtle">No results.</td></tr>`;
        return;
      }
      for (const txn of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = cfg.columns(txn);
        tb.appendChild(tr);
      }
    }

    function renderPager(info) {
      if (els.pageInfo) els.pageInfo.textContent =
        `Page ${info.page} of ${info.pages} — ${info.total} result${info.total === 1 ? "" : "s"}`;
      if (els.prevPage) els.prevPage.disabled = info.page <= 1;
      if (els.nextPage) els.nextPage.disabled = info.page >= info.pages;
    }

    function updateView() {
      const filtered = applyFilters();
      const info = paginate(filtered);
      renderTable(info.slice);
      renderPager(info);
    }

    function readForm() {
      state.q = els.q?.value.trim() || "";
      state.category = els.category?.value || "";
      state.method = els.method?.value || "";
      state.minDate = els.minDate?.value || "";
      state.maxDate = els.maxDate?.value || "";
      state.minAmt = els.minAmt?.value || "";
      state.maxAmt = els.maxAmt?.value || "";
      state.sort = els.sort?.value || "date_desc";
      state.pageSize = Number(els.pageSize?.value) || 25;
      state.page = 1;
    }

    function exportCSV() {
      const filtered = applyFilters();
      const header = ["Date", cfg.sortKeys.alpha === "merchant" ? "Merchant" : "Source", "Category", "Amount", "Method", "Notes"];
      const lines = [header.join(",")];
      for (const t of filtered) {
        const alphaValue = (t[cfg.sortKeys.alpha] || "").replace(/"/g, '""');
        const row = [
          t.date,
          alphaValue,
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
        download: `${cfg.prefix === "exp" ? "expenses" : "income"}-${new Date().toISOString().slice(0,10)}.csv`,
      });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }

    function wire() {
      els.form?.addEventListener("submit", (e) => { e.preventDefault(); readForm(); updateView(); });
      els.btnClear?.addEventListener("click", () => {
        $$("#" + els.form.id + " input, #" + els.form.id + " select").forEach(el => {
          if (el === els.pageSize) return;
          if (el.tagName === "SELECT") el.selectedIndex = 0;
          else el.value = "";
        });
        readForm();
        updateView();
      });
      els.q?.addEventListener("input", () => { readForm(); updateView(); });
      els.sort?.addEventListener("change", () => { readForm(); updateView(); });
      els.pageSize?.addEventListener("change", () => { readForm(); updateView(); });
      els.prevPage?.addEventListener("click", () => { state.page = Math.max(1, state.page - 1); updateView(); });
      els.nextPage?.addEventListener("click", () => { state.page = state.page + 1; updateView(); });
      els.btnExport?.addEventListener("click", exportCSV);
    }

    return { wire, updateView, readForm };
  }

  // Shared quick actions (expense section)
  function wireTopActions() {
    $("#btnAddTxn")?.addEventListener("click", () => alert("Open add transaction modal…"));
    $("#btnUpload")?.addEventListener("click", () => alert("Open upload flow…"));
  }

  async function init() {
    wireTopActions();

    try {
      await loadData();

      // Expenses controller (uses merchant)
      const expensesCtrl = makeController({
        prefix: "exp",
        rows: () => EXP_RAW,
        textFields: ["merchant", "category", "notes"],
        sortKeys: { alpha: "merchant" },
        columns: (t) => `
          <td>${fmtDate(t.date)}</td>
          <td>${t.merchant || ""}</td>
          <td>${t.category || ""}</td>
          <td class="num">${fmtMoney(t.amount, summaryCurrency)}</td>
          <td>${t.payment_method || ""}</td>
          <td>${t.notes || ""}</td>
        `
      });

      // Income controller (uses source)
      const incomeCtrl = makeController({
        prefix: "inc",
        rows: () => INC_RAW,
        textFields: ["source", "category", "notes"],
        sortKeys: { alpha: "source" },
        columns: (t) => `
          <td>${fmtDate(t.date)}</td>
          <td>${t.source || ""}</td>
          <td>${t.category || ""}</td>
          <td class="num">${fmtMoney(t.amount, summaryCurrency)}</td>
          <td>${t.payment_method || ""}</td>
          <td>${t.notes || ""}</td>
        `
      });

      expensesCtrl.wire();
      incomeCtrl.wire();

      expensesCtrl.readForm();
      incomeCtrl.readForm();

      expensesCtrl.updateView();
      incomeCtrl.updateView();
    } catch (err) {
      console.error(err);
      const tb1 = $("#recordsTbody");
      const tb2 = $("#recordsTbodyIncome");
      if (tb1) tb1.innerHTML = `<tr><td colspan="6" class="subtle">Failed to load data.</td></tr>`;
      if (tb2) tb2.innerHTML = `<tr><td colspan="6" class="subtle">Failed to load data.</td></tr>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
