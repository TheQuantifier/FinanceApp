// scripts/records.js
// Fully aligned with backend Record model and simplified Records page.

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

  // Modals + Forms
  const addExpenseModal = document.getElementById("addExpenseModal");
  const addIncomeModal = document.getElementById("addIncomeModal");
  const expenseForm = document.getElementById("expenseForm");
  const incomeForm = document.getElementById("incomeForm");

  // Buttons
  const btnAddExpense = document.getElementById("btnAddExpense");
  const btnAddIncome = document.getElementById("btnAddIncome");
  const cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
  const cancelIncomeBtn = document.getElementById("cancelIncomeBtn");


  // ======================================================
  // HELPERS
  // ======================================================
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

  function createRow(record) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDate(record.date)}</td>
      <td>${record.category || "—"}</td>
      <td class="num">${Number(record.amount).toFixed(2)}</td>
      <td>${record.note || "—"}</td>
    `;
    return tr;
  }


  // ======================================================
  // LOAD RECORDS
  // ======================================================
  async function loadRecords() {
    try {
      expenseTbody.innerHTML = `<tr><td colspan="4" class="subtle">Loading…</td></tr>`;
      incomeTbody.innerHTML = `<tr><td colspan="4" class="subtle">Loading…</td></tr>`;

      const records = await api.records.getAll();

      const expenses = records.filter(r => r.type === "expense");
      const income = records.filter(r => r.type === "income");

      renderTable(expenses, expenseTbody, filtersForm, expensePageInfo);
      renderTable(income, incomeTbody, filtersFormIncome, incomePageInfo);

    } catch (err) {
      console.error(err);
      expenseTbody.innerHTML = `<tr><td colspan="4" class="subtle">Error loading expenses.</td></tr>`;
      incomeTbody.innerHTML = `<tr><td colspan="4" class="subtle">Error loading income.</td></tr>`;
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

      const matchAmt =
        r.amount >= minAmt && r.amount <= maxAmt;

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
      tbody.innerHTML = `<tr><td colspan="4" class="subtle">No matching records.</td></tr>`;
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
  // INITIAL LOAD
  // ======================================================
  loadRecords();
});