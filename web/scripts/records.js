// scripts/records.js
import { api } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  // ===============================
  // ELEMENTS
  // ===============================
  const expenseTbody = document.getElementById("recordsTbody");
  const incomeTbody = document.getElementById("recordsTbodyIncome");

  const filtersForm = document.getElementById("filtersForm");
  const filtersFormIncome = document.getElementById("filtersFormIncome");

  const addExpenseModal = document.getElementById("addExpenseModal");
  const addIncomeModal = document.getElementById("addIncomeModal");
  const expenseForm = document.getElementById("expenseForm");
  const incomeForm = document.getElementById("incomeForm");

  const btnAddExpense = document.getElementById("btnAddExpense");
  const btnAddIncome = document.getElementById("btnAddIncome");
  const cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
  const cancelIncomeBtn = document.getElementById("cancelIncomeBtn");

  const btnExportExpenses = document.getElementById("btnExportExpenses");
  const btnExportIncome = document.getElementById("btnExportIncome");

  const deleteRecordModal = document.getElementById("deleteRecordModal");
  const btnDeleteRecordOnly = document.getElementById("btnDeleteRecordOnly");
  const btnDeleteRecordAndReceipt = document.getElementById("btnDeleteRecordAndReceipt");
  const btnCancelDeleteRecord = document.getElementById("btnCancelDeleteRecord");

  const statusExpense = document.getElementById("recordsStatusExpense");
  const statusIncome = document.getElementById("recordsStatusIncome");

  let pendingDelete = { recordId: null, linkedReceiptId: null };
  let expensePage = 1;
  let incomePage = 1;

  // NEW: cache so we don’t hit API on each keystroke
  let allRecordsCache = [];

  const debounce = (fn, delay = 200) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  // ===============================
  // FX RATES (STATIC — replace with live API for real-time)
  // ===============================
  const FX_RATES = {
    USD: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.1, CAD: 1.37, AUD: 1.55, JPY: 148 },
    EUR: { USD: 1.09, EUR: 1, GBP: 0.86, INR: 90.4, CAD: 1.49, AUD: 1.69, JPY: 161 },
    GBP: { USD: 1.26, EUR: 1.16, GBP: 1, INR: 105.5, CAD: 1.73, AUD: 1.96, JPY: 187 },
  };

  // ===============================
  // HELPERS
  // ===============================
  const showModal = (modal) => modal?.classList.remove("hidden");
  const hideModal = (modal) => modal?.classList.add("hidden");

  const showStatus = (type, msg, kind = "ok") => {
    const el = type === "income" ? statusIncome : statusExpense;
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.classList.toggle("is-ok", kind === "ok");
    el.classList.toggle("is-error", kind === "error");
  };

  const clearStatusSoon = (type, ms = 2500) => {
    const el = type === "income" ? statusIncome : statusExpense;
    if (!el) return;
    window.setTimeout(() => {
      el.style.display = "none";
      el.textContent = "";
      el.classList.remove("is-ok", "is-error");
    }, ms);
  };

  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    if (FX_RATES[fromCurrency] && FX_RATES[fromCurrency][toCurrency]) {
      return amount * FX_RATES[fromCurrency][toCurrency];
    }
    console.warn("Missing FX rate:", fromCurrency, "→", toCurrency);
    return amount;
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "2-digit"
  }) : "—";

  const isoToInputDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const getCurrentCurrency = () => {
    return localStorage.getItem("settings_currency") ||
           localStorage.getItem("auto_currency") ||
           "USD";
  };

  const fmtMoney = (value, originalCurrency = "USD") => {
    const currency = getCurrentCurrency();
    const converted = convertCurrency(Number(value) || 0, originalCurrency, currency);
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(converted);
  };

  // Support both Mongo-style `_id` and SQL-style `id`
  const getRecordId = (r) => r?.id ?? r?._id ?? "";

  // Support both camelCase and snake_case for linked receipt id
  const getLinkedReceiptId = (r) => r?.linkedReceiptId ?? r?.linked_receipt_id ?? "";

  const typeBadgeEl = (record) => {
    const span = document.createElement("span");
    if (getLinkedReceiptId(record)) {
      span.className = "badge badge-receipt";
      span.textContent = "Receipt";
    } else {
      span.className = "badge badge-manual";
      span.textContent = "Manual";
    }
    return span;
  };

  const createRow = (record) => {
    const tr = document.createElement("tr");
    const recordId = getRecordId(record);
    const linkedReceiptId = getLinkedReceiptId(record);

    tr.dataset.recordId = recordId;
    tr.dataset.linkedReceiptId = linkedReceiptId;

    const tdDate = document.createElement("td");
    tdDate.textContent = fmtDate(record.date);

    const tdType = document.createElement("td");
    tdType.textContent = record.type || "—";

    const tdCat = document.createElement("td");
    tdCat.textContent = record.category || "—";

    const tdAmt = document.createElement("td");
    tdAmt.className = "num currency-field";
    tdAmt.dataset.value = String(record.amount ?? 0);
    tdAmt.dataset.currency = record.currency || "USD";
    tdAmt.textContent = fmtMoney(record.amount, record.currency || "USD");

    const tdNote = document.createElement("td");
    tdNote.textContent = record.note || "—";

    const tdBadge = document.createElement("td");
    tdBadge.appendChild(typeBadgeEl(record));

    const tdActions = document.createElement("td");
    tdActions.className = "actions-col";

    const wrap = document.createElement("div");
    wrap.className = "actions-menu-wrap";

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "actions-btn";
    menuBtn.dataset.menuBtn = "true";
    menuBtn.setAttribute("aria-haspopup", "menu");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "⋮";

    const dropdown = document.createElement("div");
    dropdown.className = "actions-dropdown hidden";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.dataset.edit = recordId;
    editBtn.textContent = "Edit Record";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.dataset.delete = recordId;
    delBtn.style.color = "#b91c1c";
    delBtn.textContent = "Delete Record";

    dropdown.appendChild(editBtn);
    dropdown.appendChild(delBtn);
    wrap.appendChild(menuBtn);
    wrap.appendChild(dropdown);
    tdActions.appendChild(wrap);

    tr.appendChild(tdDate);
    tr.appendChild(tdType);
    tr.appendChild(tdCat);
    tr.appendChild(tdAmt);
    tr.appendChild(tdNote);
    tr.appendChild(tdBadge);
    tr.appendChild(tdActions);

    return tr;
  };

  // ===============================
  // DELETE LOGIC
  // ===============================
  function openDeleteModal(recordId, linkedReceiptId) {
    pendingDelete = { recordId, linkedReceiptId };
    if (btnDeleteRecordAndReceipt) {
      btnDeleteRecordAndReceipt.style.display = linkedReceiptId ? "block" : "none";
    }
    showModal(deleteRecordModal);
  }

  async function performDelete(deleteReceiptToo) {
    try {
      await api.records.remove(pendingDelete.recordId, deleteReceiptToo && !!pendingDelete.linkedReceiptId);
      hideModal(deleteRecordModal);
      await loadRecords();
    } catch (err) {
      const type = pendingDelete?.recordId ? (document.querySelector(`tr[data-record-id="${pendingDelete.recordId}"]`)?.querySelector("td:nth-child(2)")?.textContent || "expense") : "expense";
      showStatus(type === "income" ? "income" : "expense", "Failed to delete: " + (err?.message || "Unknown error"), "error");
      clearStatusSoon(type === "income" ? "income" : "expense", 3500);
    }
  }

  btnDeleteRecordOnly.addEventListener("click", () => performDelete(false));
  btnDeleteRecordAndReceipt.addEventListener("click", () => performDelete(true));
  btnCancelDeleteRecord.addEventListener("click", () => hideModal(deleteRecordModal));
  deleteRecordModal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) hideModal(deleteRecordModal);
  });

  // ===============================
  // ESC and Backdrop Close for Modals
  // ===============================
  const closeAllModals = () => {
    hideModal(addExpenseModal);
    hideModal(addIncomeModal);
    hideModal(deleteRecordModal);
  };

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeAllModals();
    document.querySelectorAll(".actions-dropdown").forEach((m) => m.classList.add("hidden"));
    document.querySelectorAll(".actions-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
  });

  // Backdrop click to close add/edit modals
  addExpenseModal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) hideModal(addExpenseModal);
  });
  addIncomeModal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) hideModal(addIncomeModal);
  });

  // ===============================
  // TABLE EVENTS (EDIT/DELETE MENU)
  // ===============================
  document.addEventListener("click", async (e) => {
    const menuBtn = e.target.closest("[data-menu-btn]");
    if (menuBtn) {
      e.stopPropagation();
      const menu = menuBtn.nextElementSibling;
      document.querySelectorAll(".actions-dropdown").forEach((m) => { if (m !== menu) m.classList.add("hidden"); });
      const isHidden = menu.classList.toggle("hidden");
      menuBtn.setAttribute("aria-expanded", String(!isHidden));
      return;
    }

    if (e.target.dataset.edit) {
      const record = await api.records.getOne(e.target.dataset.edit);
      if (!record) return;
      document.querySelectorAll(".actions-dropdown").forEach((m) => m.classList.add("hidden"));
      document.querySelectorAll(".actions-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));

      const modal = record.type === "expense" ? addExpenseModal : addIncomeModal;
      const prefix = record.type === "expense" ? "expense" : "income";

      document.getElementById(`${prefix}Date`).value = isoToInputDate(record.date);
      document.getElementById(`${prefix}Amount`).value = record.amount;
      document.getElementById(`${prefix}Category`).value = record.category;
      document.getElementById(`${prefix}Notes`).value = record.note;

      modal.dataset.editId = getRecordId(record);
      showModal(modal);
      return;
    }

    if (e.target.dataset.delete) {
      const row = e.target.closest("tr");
      openDeleteModal(e.target.dataset.delete, row?.dataset.linkedReceiptId || "");
      return;
    }

    document.querySelectorAll(".actions-dropdown").forEach((m) => m.classList.add("hidden"));
    document.querySelectorAll(".actions-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
  });

  // ===============================
  // LOAD RECORDS
  // ===============================
  async function loadRecords() {
    expenseTbody.innerHTML = "";
    incomeTbody.innerHTML = "";

    const loadingRow = () => {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.className = "subtle";
      td.textContent = "Loading…";
      tr.appendChild(td);
      return tr;
    };

    expenseTbody.appendChild(loadingRow());
    incomeTbody.appendChild(loadingRow());

    try {
      allRecordsCache = await api.records.getAll();
      renderAll();
    } catch (err) {
      console.error(err);
      showStatus("expense", "Failed to load records.", "error");
      clearStatusSoon("expense", 3500);
      showStatus("income", "Failed to load records.", "error");
      clearStatusSoon("income", 3500);
    }
  }

  const renderTable = (records, tbody, form, type) => {
    if (!form) return;

    const searchInput = form.querySelector("input[type=search], input[type=text]");
    const q = (searchInput?.value || "").toLowerCase();
    const category = form.querySelector("select[id^=category]")?.value || "";
    const minDateStr = form.querySelector("input[id^=minDate]")?.value || "";
    const maxDateStr = form.querySelector("input[id^=maxDate]")?.value || "";
    const minDate = minDateStr ? new Date(minDateStr) : null;
    const maxDate = maxDateStr ? new Date(maxDateStr) : null;
    const minAmt = parseFloat(form.querySelector("input[id^=minAmt]")?.value) || 0;
    const maxAmt = parseFloat(form.querySelector("input[id^=maxAmt]")?.value) || Infinity;
    const sort = form.querySelector("select[id^=sort]")?.value || "";
    const pageSize = parseInt(form.querySelector("select[id^=pageSize]")?.value, 10) || 25;

    let filtered = records.filter(r => {
      const note = (r.note || "").toLowerCase();
      const cat = (r.category || "").toLowerCase();
      const rDate = r.date ? new Date(r.date) : null;
      return (!q || cat.includes(q) || note.includes(q)) &&
             (!category || r.category === category) &&
             (!minDate || (rDate && rDate >= minDate)) &&
             (!maxDate || (rDate && rDate <= maxDate)) &&
             r.amount >= minAmt && r.amount <= maxAmt;
    });

    filtered.sort((a,b) => {
      const da = a.date ? new Date(a.date) : null;
      const db = b.date ? new Date(b.date) : null;
      switch(sort) {
        case "date_asc": return da - db;
        case "date_desc": return db - da;
        case "amount_asc": return a.amount - b.amount;
        case "amount_desc": return b.amount - a.amount;
        case "category_asc": return (a.category||"").localeCompare(b.category||"");
        case "category_desc": return (b.category||"").localeCompare(a.category||"");
        default: return 0;
      }
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const clampPage = (p) => Math.min(Math.max(1, p), totalPages);
    let currentPage = type === "expense" ? expensePage : incomePage;
    currentPage = clampPage(currentPage);
    if (type === "expense") expensePage = currentPage;
    else incomePage = currentPage;

    const start = (currentPage - 1) * pageSize;
    const display = filtered.slice(start, start + pageSize);

    const pagerPrev = document.getElementById(`prevPage${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const pagerNext = document.getElementById(`nextPage${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const pagerInfo = document.getElementById(`pageInfo${type.charAt(0).toUpperCase() + type.slice(1)}`);

    if (pagerInfo) pagerInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (pagerPrev) pagerPrev.disabled = currentPage === 1;
    if (pagerNext) pagerNext.disabled = currentPage === totalPages;

    tbody.innerHTML = "";
    if (!display.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.className = "subtle";
      td.textContent = "No matching records.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    display.forEach(r => tbody.appendChild(createRow(r)));
  };

  const renderAll = () => {
    const expenses = allRecordsCache.filter((r) => r.type === "expense");
    const income = allRecordsCache.filter((r) => r.type === "income");
  
    renderTable(expenses, expenseTbody, filtersForm, "expense");
    renderTable(income, incomeTbody, filtersFormIncome, "income");
  };
  
  const debouncedRenderAll = debounce(renderAll, 200);

  // ===============================
  // FORM MODALS
  // ===============================
  btnAddExpense?.addEventListener("click", () => {
    delete addExpenseModal.dataset.editId;
    expenseForm?.reset();
    showModal(addExpenseModal);
  });
  cancelExpenseBtn?.addEventListener("click", () => hideModal(addExpenseModal));
  btnAddIncome?.addEventListener("click", () => {
    delete addIncomeModal.dataset.editId;
    incomeForm?.reset();
    showModal(addIncomeModal);
  });
  cancelIncomeBtn?.addEventListener("click", () => hideModal(addIncomeModal));

  const handleFormSubmit = (form, modal, type) => async (e) => {
    e.preventDefault();
    const submitBtn = form?.querySelector('button[type="submit"]');
    const prevBtnText = submitBtn?.textContent;
    const editId = modal.dataset.editId;
    const payload = {
      type,
      date: document.getElementById(`${type}Date`).value,
      amount: parseFloat(document.getElementById(`${type}Amount`).value),
      category: document.getElementById(`${type}Category`).value,
      note: document.getElementById(`${type}Notes`).value
    };

    if (!payload.date) {
      showStatus(type, "Please choose a date.", "error");
      clearStatusSoon(type, 3000);
      return;
    }
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      showStatus(type, "Please enter a valid amount greater than 0.", "error");
      clearStatusSoon(type, 3000);
      return;
    }
    if (!payload.category) {
      showStatus(type, "Please enter a category.", "error");
      clearStatusSoon(type, 3000);
      return;
    }

    showStatus(type, editId ? "Saving changes…" : "Saving…");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving…";
    }

    try {
      if (editId) await api.records.update(editId, payload);
      else await api.records.create(payload);

      hideModal(modal);
      form.reset();
      delete modal.dataset.editId;
      await loadRecords();

      showStatus(type, editId ? "Record updated." : "Record added.");
      clearStatusSoon(type, 2500);
    } catch (err) {
      showStatus(type, `Error saving ${type}: ` + (err?.message || "Unknown error"), "error");
      clearStatusSoon(type, 3500);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = prevBtnText || "Save";
      }
    }
  };

  expenseForm?.addEventListener("submit", handleFormSubmit(expenseForm, addExpenseModal, "expense"));
  incomeForm?.addEventListener("submit", handleFormSubmit(incomeForm, addIncomeModal, "income"));

  // ===============================
  // FILTERS & CLEAR (LIVE)
  // ===============================
  const wireLiveFilters = (form, type) => {
    if (!form) return;

    const resetPage = () => {
      if (type === "expense") expensePage = 1;
      else incomePage = 1;
    };

    // Keep submit working if you press Enter, but prefer live filtering
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      resetPage();
      debouncedRenderAll();
    });

    // Live updates for all controls
    const controls = form.querySelectorAll("input, select");
    controls.forEach((el) => {
      const evt = el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(evt, () => {
        resetPage();
        debouncedRenderAll();
      });
    });
  };

  wireLiveFilters(filtersForm, "expense");
  wireLiveFilters(filtersFormIncome, "income");

  document.getElementById("btnClear")?.addEventListener("click", () => {
    filtersForm?.reset();
    expensePage = 1;
    debouncedRenderAll();
  });

  document.getElementById("btnClearIncome")?.addEventListener("click", () => {
    filtersFormIncome?.reset();
    incomePage = 1;
    debouncedRenderAll();
  });

  // ===============================
  // EXPORT CSV
  // ===============================
  const exportToCSV = (records, typeLabel) => {
    const type = typeLabel === "income" ? "income" : "expense";
    if (!records.length) {
      showStatus(type, "No records to export.", "error");
      clearStatusSoon(type, 2500);
      return;
    }

    const headers = ["Date", "Type", "Category", "Amount", "Notes"];
    const rows = [headers.join(",")];

    records.forEach((r) => {
      rows.push(
        [
          r.date?.split("T")[0] || "",
          r.type || "",
          (r.category || "").replace(/,/g, ";"),
          r.amount ?? "",
          (r.note || "").replace(/,/g, ";"),
        ].join(",")
      );
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${typeLabel}_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showStatus(type, "Export started.");
    clearStatusSoon(type, 2000);
  };

  btnExportExpenses?.addEventListener("click", async () => {
    try {
      showStatus("expense", "Preparing export…");
      if (!allRecordsCache.length) {
        await loadRecords();
      }
      exportToCSV(allRecordsCache.filter((r) => r.type === "expense"), "expense");
    } catch (err) {
      showStatus("expense", "Export failed: " + (err?.message || "Unknown error"), "error");
      clearStatusSoon("expense", 3500);
    }
  });

  btnExportIncome?.addEventListener("click", async () => {
    try {
      showStatus("income", "Preparing export…");
      if (!allRecordsCache.length) {
        await loadRecords();
      }
      exportToCSV(allRecordsCache.filter((r) => r.type === "income"), "income");
    } catch (err) {
      showStatus("income", "Export failed: " + (err?.message || "Unknown error"), "error");
      clearStatusSoon("income", 3500);
    }
  });

  // ===============================
  // PAGINATION BUTTONS
  // ===============================
  document.getElementById("prevPageExpense")?.addEventListener("click", () => {
    if (expensePage > 1) {
      expensePage--;
      renderAll();
    }
  });

  document.getElementById("nextPageExpense")?.addEventListener("click", () => {
    expensePage++;
    renderAll();
  });

  document.getElementById("prevPageIncome")?.addEventListener("click", () => {
    if (incomePage > 1) {
      incomePage--;
      renderAll();
    }
  });

  document.getElementById("nextPageIncome")?.addEventListener("click", () => {
    incomePage++;
    renderAll();
  });

  // INITIAL LOAD
  loadRecords();
});
