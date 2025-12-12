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

  let pendingDelete = { recordId: null, linkedReceiptId: null };
  let expensePage = 1;
  let incomePage = 1;

  // ===============================
  // HELPERS
  // ===============================
  const showModal = (modal) => modal?.classList.remove("hidden");
  const hideModal = (modal) => modal?.classList.add("hidden");

  const FX_RATES = {
    USD: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.1, CAD: 1.37, AUD: 1.55, JPY: 148 },
    EUR: { USD: 1.09, EUR: 1, GBP: 0.86, INR: 90.4, CAD: 1.49, AUD: 1.69, JPY: 161 },
    GBP: { USD: 1.26, EUR: 1.16, GBP: 1, INR: 105.5, CAD: 1.73, AUD: 1.96, JPY: 187 },
  };
  
  const convertCurrency = (amount, fromCurrency, toCurrency) => {
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

  const typeBadge = (record) => record.linkedReceiptId
    ? `<span class="badge badge-receipt">Receipt</span>`
    : `<span class="badge badge-manual">Manual</span>`;

  const createRow = (record) => {
    const tr = document.createElement("tr");
    tr.dataset.recordId = record._id;
    tr.dataset.linkedReceiptId = record.linkedReceiptId || "";

    tr.innerHTML = `
      <td>${fmtDate(record.date)}</td>
      <td>${record.type}</td>
      <td>${record.category || "—"}</td>
      <td class="num currency-field" data-value="${record.amount}" data-currency="${record.currency || 'USD'}">
        ${fmtMoney(record.amount, record.currency || 'USD')}
      </td>
      <td>${record.note || "—"}</td>
      <td>${typeBadge(record)}</td>
      <td class="actions-col">
        <div class="actions-menu-wrap">
          <button class="actions-btn" data-menu-btn="true">⋮</button>
          <div class="actions-dropdown hidden">
            <button data-edit="${record._id}">Edit Record</button>
            <button data-delete="${record._id}" style="color:#b91c1c;">Delete Record</button>
          </div>
        </div>
      </td>
    `;
    return tr;
  };

  // ===============================
  // DELETE LOGIC
  // ===============================
  function openDeleteModal(recordId, linkedReceiptId) {
    pendingDelete = { recordId, linkedReceiptId };
    btnDeleteRecordAndReceipt.style.display = linkedReceiptId ? "block" : "none";
    showModal(deleteRecordModal);
  }

  async function performDelete(deleteReceiptToo) {
    try {
      await api.records.remove(pendingDelete.recordId, deleteReceiptToo && pendingDelete.linkedReceiptId);
      hideModal(deleteRecordModal);
      loadRecords();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }

  btnDeleteRecordOnly.addEventListener("click", () => performDelete(false));
  btnDeleteRecordAndReceipt.addEventListener("click", () => performDelete(true));
  btnCancelDeleteRecord.addEventListener("click", () => hideModal(deleteRecordModal));
  deleteRecordModal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) hideModal(deleteRecordModal);
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
      menu.classList.toggle("hidden");
      return;
    }

    if (e.target.dataset.edit) {
      const record = await api.records.getOne(e.target.dataset.edit);
      if (!record) return;
      document.querySelectorAll(".actions-dropdown").forEach((m) => m.classList.add("hidden"));

      const modal = record.type === "expense" ? addExpenseModal : addIncomeModal;
      const prefix = record.type === "expense" ? "expense" : "income";

      document.getElementById(`${prefix}Date`).value = isoToInputDate(record.date);
      document.getElementById(`${prefix}Amount`).value = record.amount;
      document.getElementById(`${prefix}Category`).value = record.category;
      document.getElementById(`${prefix}Notes`).value = record.note;

      modal.dataset.editId = record._id;
      showModal(modal);
      return;
    }

    if (e.target.dataset.delete) {
      const row = e.target.closest("tr");
      openDeleteModal(e.target.dataset.delete, row?.dataset.linkedReceiptId || "");
      return;
    }

    document.querySelectorAll(".actions-dropdown").forEach((m) => m.classList.add("hidden"));
  });

  // ===============================
  // LOAD RECORDS
  // ===============================
  async function loadRecords() {
    expenseTbody.innerHTML = `<tr><td colspan="7" class="subtle">Loading…</td></tr>`;
    incomeTbody.innerHTML = `<tr><td colspan="7" class="subtle">Loading…</td></tr>`;

    try {
      const records = await api.records.getAll();
      renderTable(records.filter(r => r.type === "expense"), expenseTbody, filtersForm, "expense");
      renderTable(records.filter(r => r.type === "income"), incomeTbody, filtersFormIncome, "income");
    } catch (err) {
      console.error(err);
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

    let currentPage = type === "expense" ? expensePage : incomePage;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
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
      tbody.innerHTML = `<tr><td colspan="7" class="subtle">No matching records.</td></tr>`;
      return;
    }

    display.forEach(r => tbody.appendChild(createRow(r)));
  };

  // ===============================
  // FORM MODALS
  // ===============================
  btnAddExpense?.addEventListener("click", () => showModal(addExpenseModal));
  cancelExpenseBtn?.addEventListener("click", () => hideModal(addExpenseModal));
  btnAddIncome?.addEventListener("click", () => showModal(addIncomeModal));
  cancelIncomeBtn?.addEventListener("click", () => hideModal(addIncomeModal));

  const handleFormSubmit = (form, modal, type) => async (e) => {
    e.preventDefault();
    const editId = modal.dataset.editId;
    const payload = {
      type,
      date: document.getElementById(`${type}Date`).value,
      amount: parseFloat(document.getElementById(`${type}Amount`).value),
      category: document.getElementById(`${type}Category`).value,
      note: document.getElementById(`${type}Notes`).value
    };
    try {
      if (editId) await api.records.update(editId, payload);
      else await api.records.create(payload);

      hideModal(modal);
      form.reset();
      delete modal.dataset.editId;
      loadRecords();
    } catch (err) {
      alert(`Error saving ${type}: ` + err.message);
    }
  };

  expenseForm?.addEventListener("submit", handleFormSubmit(expenseForm, addExpenseModal, "expense"));
  incomeForm?.addEventListener("submit", handleFormSubmit(incomeForm, addIncomeModal, "income"));

  // ===============================
  // FILTERS & CLEAR
  // ===============================
  filtersForm?.addEventListener("submit", e => { e.preventDefault(); expensePage = 1; loadRecords(); });
  filtersFormIncome?.addEventListener("submit", e => { e.preventDefault(); incomePage = 1; loadRecords(); });

  document.getElementById("btnClear")?.addEventListener("click", () => { filtersForm?.reset(); expensePage = 1; loadRecords(); });
  document.getElementById("btnClearIncome")?.addEventListener("click", () => { filtersFormIncome?.reset(); incomePage = 1; loadRecords(); });

  // ===============================
  // EXPORT CSV
  // ===============================
  const exportToCSV = (records, label) => {
    if (!records.length) return alert("No records to export.");
    const headers = ["Date","Type","Category","Amount","Notes"];
    const rows = [headers.join(",")];
    records.forEach(r => {
      rows.push([
        r.date?.split("T")[0] || "",
        r.type || "",
        (r.category||"").replace(/,/g,";"),
        r.amount ?? "",
        (r.note||"").replace(/,/g,";")
      ].join(","));
    });
    const blob = new Blob([rows.join("\n")], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label}_records_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  btnExportExpenses?.addEventListener("click", async () => exportToCSV((await api.records.getAll()).filter(r => r.type === "expense"), "expenses"));
  btnExportIncome?.addEventListener("click", async () => exportToCSV((await api.records.getAll()).filter(r => r.type === "income"), "income"));

  // ===============================
  // PAGINATION BUTTONS
  // ===============================
  document.getElementById("prevPageExpense")?.addEventListener("click", () => { if (expensePage>1) { expensePage--; loadRecords(); } });
  document.getElementById("nextPageExpense")?.addEventListener("click", () => { expensePage++; loadRecords(); });
  document.getElementById("prevPageIncome")?.addEventListener("click", () => { if (incomePage>1) { incomePage--; loadRecords(); } });
  document.getElementById("nextPageIncome")?.addEventListener("click", () => { incomePage++; loadRecords(); });

  // INITIAL LOAD
  loadRecords();
});
