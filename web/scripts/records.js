// scripts/records.js
// Fully aligned with backend Record model & simplified Records page.

import { api } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {

  // ======================================================
  // ELEMENTS
  // ======================================================
  const expenseTbody = document.getElementById("recordsTbody");
  const incomeTbody = document.getElementById("recordsTbodyIncome");

  const filtersForm = document.getElementById("filtersForm");
  const filtersFormIncome = document.getElementById("filtersFormIncome");

  const expensePageInfo = document.getElementById("pageInfo");
  const incomePageInfo = document.getElementById("pageInfoIncome");

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

  // DELETE MODAL
  const deleteModal = document.getElementById("deleteRecordModal");
  const confirmDeleteRecordBtn = document.getElementById("confirmDeleteRecordBtn");
  const cancelDeleteRecordBtn = document.getElementById("cancelDeleteRecordBtn");

  let deleteTargetId = null;   // record.id
  let deleteTargetType = null; // "expense" | "income"


  // Helpers
  function showModal(m) { m.classList.remove("hidden"); }
  function hideModal(m) { m.classList.add("hidden"); }

  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  // Build row (INCLUDING DELETE BUTTON)
  function createRow(record) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDate(record.date)}</td>
      <td>${record.category || "—"}</td>
      <td class="num">${Number(record.amount).toFixed(2)}</td>
      <td>${record.note || "—"}</td>
      <td>
        <button class="btn btn--danger btn--sm" data-delete="${record.id}">
          Delete
        </button>
      </td>
    `;
    return tr;
  }


  // ======================================================
  // LOAD RECORDS
  // ======================================================
  async function loadRecords() {
    try {
      expenseTbody.innerHTML = `<tr><td colspan="5" class="subtle">Loading…</td></tr>`;
      incomeTbody.innerHTML = `<tr><td colspan="5" class="subtle">Loading…</td></tr>`;

      const records = await api.records.getAll();

      const expenses = records.filter(r => r.type === "expense");
      const income = records.filter(r => r.type === "income");

      renderTable(expenses, expenseTbody, filtersForm, expensePageInfo);
      renderTable(income, incomeTbody, filtersFormIncome, incomePageInfo);

    } catch (err) {
      console.error(err);
      expenseTbody.innerHTML = `<tr><td colspan="5" class="subtle">Error loading expenses.</td></tr>`;
      incomeTbody.innerHTML = `<tr><td colspan="5" class="subtle">Error loading income.</td></tr>`;
    }
  }


  // ======================================================
  // TABLE RENDERING + FILTERS
  // ======================================================
  function renderTable(records, tbody, form, pageInfo) {
    if (!tbody || !form) return;

    const q = form.querySelector("input[type=search]").value.toLowerCase();
    const category = form.querySelector("select[id^=category]").value;
    const minDate = form.querySelector("input[id^=minDate]").value;
    const maxDate = form.querySelector("input[id^=maxDate]").value;
    const minAmt = parseFloat(form.querySelector("input[id^=minAmt]").value) || 0;
    const maxAmt = parseFloat(form.querySelector("input[id^=maxAmt]").value) || Infinity;
    const sort = form.querySelector("select[id^=sort]").value;
    const pageSize = parseInt(form.querySelector("select[id^=pageSize]").value) || 25;

    let filtered = records.filter(r => {
      const matchQ =
        !q ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.note && r.note.toLowerCase().includes(q));

      const matchCat = !category || r.category === category;
      const matchDate =
        (!minDate || r.date >= minDate) &&
        (!maxDate || r.date <= maxDate);

      const matchAmt = r.amount >= minAmt && r.amount <= maxAmt;

      return matchQ && matchCat && matchDate && matchAmt;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case "date_asc": return (a.date || "").localeCompare(b.date || "");
        case "date_desc": return (b.date || "").localeCompare(a.date || "");
        case "amount_asc": return a.amount - b.amount;
        case "amount_desc": return b.amount - a.amount;
        case "category_asc": return (a.category || "").localeCompare(b.category || "");
        case "category_desc": return (b.category || "").localeCompare(a.category || "");
        default: return 0;
      }
    });

    const display = filtered.slice(0, pageSize);
    tbody.innerHTML = "";

    if (display.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="subtle">No matching records.</td></tr>`;
      if (pageInfo) pageInfo.textContent = "0 records";
      return;
    }

    display.forEach(r => tbody.appendChild(createRow(r)));

    if (pageInfo) {
      pageInfo.textContent = `Showing ${display.length} of ${filtered.length} record(s)`;
    }
  }


  // ======================================================
  // ADD EXPENSE
  // ======================================================
  btnAddExpense?.addEventListener("click", () => showModal(addExpenseModal));
  cancelExpenseBtn?.addEventListener("click", () => hideModal(addExpenseModal));

  expenseForm?.addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      type: "expense",
      date: document.getElementById("expenseDate").value,
      amount: parseFloat(document.getElementById("expenseAmount").value),
      category: document.getElementById("expenseCategory").value,
      note: document.getElementById("expenseNotes").value,
    };

    try {
      await api.records.create(payload);
      hideModal(addExpenseModal);
      expenseForm.reset();
      loadRecords();
    } catch (err) {
      alert("Error saving expense: " + err.message);
    }
  });


  // ======================================================
  // ADD INCOME
  // ======================================================
  btnAddIncome?.addEventListener("click", () => showModal(addIncomeModal));
  cancelIncomeBtn?.addEventListener("click", () => hideModal(addIncomeModal));

  incomeForm?.addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      type: "income",
      date: document.getElementById("incomeDate").value,
      amount: parseFloat(document.getElementById("incomeAmount").value),
      category: document.getElementById("incomeCategory").value,
      note: document.getElementById("incomeNotes").value,
    };

    try {
      await api.records.create(payload);
      hideModal(addIncomeModal);
      incomeForm.reset();
      loadRecords();
    } catch (err) {
      alert("Error saving income: " + err.message);
    }
  });


  // ======================================================
  // DELETE RECORD HANDLER
  // ======================================================
  document.addEventListener("click", e => {
    const delId = e.target.dataset.delete;
    if (!delId) return;

    deleteTargetId = delId;
    showModal(deleteModal);
  });

  cancelDeleteRecordBtn.addEventListener("click", () => {
    deleteTargetId = null;
    hideModal(deleteModal);
  });

  confirmDeleteRecordBtn.addEventListener("click", async () => {
    if (!deleteTargetId) return;

    try {
      await api.records.delete(deleteTargetId);
      hideModal(deleteModal);
      deleteTargetId = null;
      loadRecords();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  });


  // ======================================================
  // FILTER FORMS
  // ======================================================
  filtersForm?.addEventListener("submit", e => {
    e.preventDefault();
    loadRecords();
  });

  filtersFormIncome?.addEventListener("submit", e => {
    e.preventDefault();
    loadRecords();
  });

  document.getElementById("btnClear")?.addEventListener("click", () => {
    filtersForm.reset();
    loadRecords();
  });

  document.getElementById("btnClearIncome")?.addEventListener("click", () => {
    filtersFormIncome.reset();
    loadRecords();
  });


  // ======================================================
  // EXPORT EXPENSES
  // ======================================================
  btnExportExpenses?.addEventListener("click", async () => {
    try {
      const records = await api.records.getAll();
      const expensesOnly = records.filter(r => r.type === "expense");

      if (!expensesOnly.length) {
        alert("No expenses to export.");
        return;
      }

      exportToCSV(expensesOnly, "expenses");
    } catch (err) {
      alert("Failed to export expenses: " + err.message);
    }
  });


  // ======================================================
  // EXPORT INCOME
  // ======================================================
  btnExportIncome?.addEventListener("click", async () => {
    try {
      const records = await api.records.getAll();
      const incomeOnly = records.filter(r => r.type === "income");

      if (!incomeOnly.length) {
        alert("No income records to export.");
        return;
      }

      exportToCSV(incomeOnly, "income");
    } catch (err) {
      alert("Failed to export income: " + err.message);
    }
  });


  // ======================================================
  // CSV EXPORT
  // ======================================================
  function exportToCSV(records, label) {
    const headers = ["Date", "Type", "Category", "Amount", "Notes"];
    const rows = [headers.join(",")];

    records.forEach((r) => {
      const date = r.date ? r.date.split("T")[0] : "";
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
    a.download = `${label}_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  // Initial Load
  loadRecords();
});
