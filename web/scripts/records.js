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

  let deleteTargetId = null;

  // ===============================
  // HELPERS
  // ===============================
  function showModal(modal) { modal.classList.remove("hidden"); }
  function hideModal(modal) { modal.classList.add("hidden"); }

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
      <td>${record.type}</td>
      <td>${record.category || "—"}</td>
      <td class="num">${Number(record.amount).toFixed(2)}</td>
      <td>${record.note || "—"}</td>
      <td class="actions-col">
        <div class="actions-menu-wrap">
          <button class="actions-btn" data-menu-btn="true">⋮</button>
          <div class="actions-dropdown hidden">
            <button data-edit="${record.id}">Edit Record</button>
            <button data-delete="${record.id}" style="color:#b91c1c;">Delete Record</button>
          </div>
        </div>
      </td>
    `;
    return tr;
  }

  function wireActionMenus() {
    document.querySelectorAll(".actions-menu-wrap").forEach(wrapper => {
      const btn = wrapper.querySelector("[data-menu-btn]");
      const menu = wrapper.querySelector(".actions-dropdown");

      btn.addEventListener("click", e => {
        e.stopPropagation();
        document.querySelectorAll(".actions-dropdown").forEach(m => {
          if (m !== menu) m.classList.add("hidden");
        });
        menu.classList.toggle("hidden");
      });
    });

    document.addEventListener("click", () => {
      document.querySelectorAll(".actions-dropdown").forEach(m => m.classList.add("hidden"));
    });
  }

  function wireRowActionEvents() {
    document.addEventListener("click", async e => {
      const editId = e.target.dataset.edit;
      const delId = e.target.dataset.delete;

      if (editId) {
        const record = await api.records.getById(editId);
        if (!record) return;

        if (record.type === "expense") {
          document.getElementById("expenseDate").value = record.date;
          document.getElementById("expenseAmount").value = record.amount;
          document.getElementById("expenseCategory").value = record.category;
          document.getElementById("expenseNotes").value = record.note;
          addExpenseModal.dataset.editId = record.id;
          showModal(addExpenseModal);
        } else {
          document.getElementById("incomeDate").value = record.date;
          document.getElementById("incomeAmount").value = record.amount;
          document.getElementById("incomeCategory").value = record.category;
          document.getElementById("incomeNotes").value = record.note;
          addIncomeModal.dataset.editId = record.id;
          showModal(addIncomeModal);
        }
      }

      if (delId) {
        deleteTargetId = delId;
        showModal(deleteModal);
      }
    });
  }

  // ===============================
  // LOAD RECORDS
  // ===============================
  async function loadRecords() {
    try {
      expenseTbody.innerHTML = `<tr><td colspan="6" class="subtle">Loading…</td></tr>`;
      incomeTbody.innerHTML = `<tr><td colspan="6" class="subtle">Loading…</td></tr>`;

      const records = await api.records.getAll();
      const expenses = records.filter(r => r.type === "expense");
      const income = records.filter(r => r.type === "income");

      renderTable(expenses, expenseTbody, filtersForm, "expense");
      renderTable(income, incomeTbody, filtersFormIncome, "income");

    } catch (err) {
      console.error(err);
      expenseTbody.innerHTML = `<tr><td colspan="6" class="subtle">Error loading expenses.</td></tr>`;
      incomeTbody.innerHTML = `<tr><td colspan="6" class="subtle">Error loading income.</td></tr>`;
    }
  }

  // ===============================
  // TABLE RENDERING + FILTERS
  // ===============================
  function renderTable(records, tbody, form, type) {
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

    if (!display.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="subtle">No matching records.</td></tr>`;
      return;
    }

    display.forEach(r => tbody.appendChild(createRow(r)));
    wireActionMenus();
  }

  // ===============================
  // MODALS: ADD/EDIT
  // ===============================
  btnAddExpense?.addEventListener("click", () => showModal(addExpenseModal));
  cancelExpenseBtn?.addEventListener("click", () => hideModal(addExpenseModal));

  btnAddIncome?.addEventListener("click", () => showModal(addIncomeModal));
  cancelIncomeBtn?.addEventListener("click", () => hideModal(addIncomeModal));

  expenseForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const editId = addExpenseModal.dataset.editId;
    const payload = {
      type: "expense",
      date: document.getElementById("expenseDate").value,
      amount: parseFloat(document.getElementById("expenseAmount").value),
      category: document.getElementById("expenseCategory").value,
      note: document.getElementById("expenseNotes").value,
    };
    try {
      if (editId) await api.records.update(editId, payload);
      else await api.records.create(payload);
      hideModal(addExpenseModal);
      expenseForm.reset();
      delete addExpenseModal.dataset.editId;
      loadRecords();
    } catch (err) {
      alert("Error saving expense: " + err.message);
    }
  });

  incomeForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const editId = addIncomeModal.dataset.editId;
    const payload = {
      type: "income",
      date: document.getElementById("incomeDate").value,
      amount: parseFloat(document.getElementById("incomeAmount").value),
      category: document.getElementById("incomeCategory").value,
      note: document.getElementById("incomeNotes").value,
    };
    try {
      if (editId) await api.records.update(editId, payload);
      else await api.records.create(payload);
      hideModal(addIncomeModal);
      incomeForm.reset();
      delete addIncomeModal.dataset.editId;
      loadRecords();
    } catch (err) {
      alert("Error saving income: " + err.message);
    }
  });

  // ===============================
  // DELETE RECORDS
  // ===============================
  cancelDeleteRecordBtn.addEventListener("click", () => {
    deleteTargetId = null;
    hideModal(deleteModal);
  });

  confirmDeleteRecordBtn.addEventListener("click", async () => {
    if (!deleteTargetId) return;
    try {
      await api.records.delete(deleteTargetId);
      deleteTargetId = null;
      hideModal(deleteModal);
      loadRecords();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  });

  // ===============================
  // FILTERS
  // ===============================
  filtersForm?.addEventListener("submit", e => { e.preventDefault(); loadRecords(); });
  filtersFormIncome?.addEventListener("submit", e => { e.preventDefault(); loadRecords(); });

  document.getElementById("btnClear")?.addEventListener("click", () => {
    filtersForm.reset();
    loadRecords();
  });

  document.getElementById("btnClearIncome")?.addEventListener("click", () => {
    filtersFormIncome.reset();
    loadRecords();
  });

  // ===============================
  // CSV EXPORT
  // ===============================
  btnExportExpenses?.addEventListener("click", async () => {
    const records = await api.records.getAll();
    exportToCSV(records.filter(r => r.type === "expense"), "expenses");
  });

  btnExportIncome?.addEventListener("click", async () => {
    const records = await api.records.getAll();
    exportToCSV(records.filter(r => r.type === "income"), "income");
  });

  function exportToCSV(records, label) {
    if (!records.length) { alert("No records to export."); return; }

    const headers = ["Date", "Type", "Category", "Amount", "Notes"];
    const rows = [headers.join(",")];

    records.forEach(r => {
      const date = r.date ? r.date.split("T")[0] : "";
      const type = r.type || "";
      const category = (r.category || "").replace(/,/g, ";");
      const amount = r.amount ?? "";
      const notes = (r.note || "").replace(/,/g, ";");
      rows.push([date, type, category, amount, notes].join(","));
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label}_records_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===============================
  // INITIAL LOAD
  // ===============================
  wireRowActionEvents();
  loadRecords();
});
