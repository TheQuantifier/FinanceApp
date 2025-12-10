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

  let expensePage = 1;
  let incomePage = 1;

  // ===============================
  // HELPERS
  // ===============================
  const showModal = (modal) => modal && modal.classList.remove("hidden");
  const hideModal = (modal) => modal && modal.classList.add("hidden");

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const isoToInputDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  // Create table row
  const createRow = (record) => {
    const tr = document.createElement("tr");

    tr.dataset.recordId = record._id;
    tr.dataset.linkedReceiptId = record.linkedReceiptId || "";

    tr.innerHTML = `
      <td>${fmtDate(record.date)}</td>
      <td>${record.type}</td>
      <td>${record.category || "—"}</td>
      <td class="num">${Number(record.amount).toFixed(2)}</td>
      <td>${record.note || "—"}</td>
      <td>${api.getUploadType(record)}</td>

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
  // EVENT DELEGATION
  // ===============================
  document.addEventListener("click", async (e) => {
    const menuBtn = e.target.closest("[data-menu-btn]");
    if (menuBtn) {
      e.stopPropagation();
      const menu = menuBtn.nextElementSibling;

      document.querySelectorAll(".actions-dropdown").forEach((m) => {
        if (m !== menu) m.classList.add("hidden");
      });

      menu.classList.toggle("hidden");
      return;
    }

    // ========== EDIT ==========
    const editId = e.target.dataset.edit;
    if (editId) {
      const record = await api.records.getOne(editId);
      if (!record) return;

      if (record.type === "expense") {
        document.getElementById("expenseDate").value = isoToInputDate(record.date);
        document.getElementById("expenseAmount").value = record.amount;
        document.getElementById("expenseCategory").value = record.category;
        document.getElementById("expenseNotes").value = record.note;

        addExpenseModal.dataset.editId = record._id;
        showModal(addExpenseModal);

      } else {
        document.getElementById("incomeDate").value = isoToInputDate(record.date);
        document.getElementById("incomeAmount").value = record.amount;
        document.getElementById("incomeCategory").value = record.category;
        document.getElementById("incomeNotes").value = record.note;

        addIncomeModal.dataset.editId = record._id;
        showModal(addIncomeModal);
      }
      return;
    }

    // ========== DELETE ==========
    const delId = e.target.dataset.delete;
    if (delId) {
      const row = e.target.closest("tr");
      const linkedReceiptId = row?.dataset.linkedReceiptId || null;

      document.querySelectorAll(".actions-dropdown").forEach((m) =>
        m.classList.add("hidden")
      );

      let deleteReceipt = false;

      // First popup — ask if receipt should be deleted
      if (linkedReceiptId) {
        deleteReceipt = confirm(
          "This record is linked to a receipt.\n\nDo you also want to delete the receipt?"
        );
      }

      // Second popup — final confirmation
      const finalConfirm = confirm(
        deleteReceipt
          ? "Are you sure you want to delete BOTH the record and the receipt?"
          : "Are you sure you want to delete ONLY the record?"
      );

      if (!finalConfirm) return;

      try {
        if (deleteReceipt && linkedReceiptId) {
          await api.receipts.remove(linkedReceiptId, true);

        } else {
          await api.records.remove(delId);

          if (linkedReceiptId) {
            await api.receipts.remove(linkedReceiptId, false);
          }
        }

        loadRecords();
      } catch (err) {
        alert("Failed to delete: " + err.message);
      }

      return;
    }

    // Close menus if clicking outside
    document.querySelectorAll(".actions-dropdown").forEach((m) =>
      m.classList.add("hidden")
    );
  });

  // ===============================
  // LOAD RECORDS
  // ===============================
  async function loadRecords() {
    expenseTbody.innerHTML = `<tr><td colspan="7" class="subtle">Loading…</td></tr>`;
    incomeTbody.innerHTML = `<tr><td colspan="7" class="subtle">Loading…</td></tr>`;

    try {
      const records = await api.records.getAll();
      const expenses = records.filter((r) => r.type === "expense");
      const income = records.filter((r) => r.type === "income");

      renderTable(expenses, expenseTbody, filtersForm);
      renderTable(income, incomeTbody, filtersFormIncome);

    } catch (err) {
      console.error(err);
    }
  }

  // ===============================
  // TABLE RENDERING & FILTERING
  // ===============================
  const renderTable = (records, tbody, form) => {
    if (!form) return;

    const searchInput =
      form.querySelector("input[type=search]") ||
      form.querySelector("input[type=text]");

    const q = (searchInput?.value || "").toLowerCase();
    const category = form.querySelector("select[id^=category]")?.value || "";
    const minDateStr = form.querySelector("input[id^=minDate]")?.value || "";
    const maxDateStr = form.querySelector("input[id^=maxDate]")?.value || "";

    const minDate = minDateStr ? new Date(minDateStr) : null;
    const maxDate = maxDateStr ? new Date(maxDateStr) : null;

    const minAmt =
      parseFloat(form.querySelector("input[id^=minAmt]")?.value) || 0;
    const maxAmt =
      parseFloat(form.querySelector("input[id^=maxAmt]")?.value) || Infinity;

    const sort = form.querySelector("select[id^=sort]")?.value || "";
    const pageSize =
      parseInt(form.querySelector("select[id^=pageSize]")?.value, 10) || 25;

    let filtered = records.filter((r) => {
      const note = (r.note || "").toLowerCase();
      const cat = (r.category || "").toLowerCase();
      const rDate = r.date ? new Date(r.date) : null;

      return (
        (!q || cat.includes(q) || note.includes(q)) &&
        (!category || r.category === category) &&
        (!minDate || (rDate && rDate >= minDate)) &&
        (!maxDate || (rDate && rDate <= maxDate)) &&
        r.amount >= minAmt &&
        r.amount <= maxAmt
      );
    });

    filtered.sort((a, b) => {
      const da = a.date ? new Date(a.date) : null;
      const db = b.date ? new Date(b.date) : null;

      switch (sort) {
        case "date_asc": return da - db;
        case "date_desc": return db - da;
        case "amount_asc": return a.amount - b.amount;
        case "amount_desc": return b.amount - a.amount;
        case "category_asc": return (a.category || "").localeCompare(b.category || "");
        case "category_desc": return (b.category || "").localeCompare(a.category || "");
        default: return 0;
      }
    });

    let currentPage, pagerPrev, pagerNext, pagerInfo;

    if (tbody.id === "recordsTbody") {
      currentPage = expensePage;
      pagerPrev = document.getElementById("prevPageExpense");
      pagerNext = document.getElementById("nextPageExpense");
      pagerInfo = document.getElementById("pageInfoExpense");
    } else {
      currentPage = incomePage;
      pagerPrev = document.getElementById("prevPageIncome");
      pagerNext = document.getElementById("nextPageIncome");
      pagerInfo = document.getElementById("pageInfoIncome");
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    if (tbody.id === "recordsTbody") expensePage = currentPage;
    else incomePage = currentPage;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const display = filtered.slice(start, end);

    if (pagerInfo) pagerInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (pagerPrev) pagerPrev.disabled = currentPage === 1;
    if (pagerNext) pagerNext.disabled = currentPage === totalPages;

    tbody.innerHTML = "";
    if (!display.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="subtle">No matching records.</td></tr>`;
      return;
    }

    display.forEach((r) => tbody.appendChild(createRow(r)));
  };

  // ===============================
  // ADD/EDIT FORMS
  // ===============================
  btnAddExpense?.addEventListener("click", () => showModal(addExpenseModal));
  cancelExpenseBtn?.addEventListener("click", () => hideModal(addExpenseModal));

  btnAddIncome?.addEventListener("click", () => showModal(addIncomeModal));
  cancelIncomeBtn?.addEventListener("click", () => hideModal(addIncomeModal));

  expenseForm?.addEventListener("submit", async (e) => {
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

  incomeForm?.addEventListener("submit", async (e) => {
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
  // EXPORT CSV
  // ===============================
  const exportToCSV = (records, label) => {
    if (!records.length) return alert("No records to export.");

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

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label}_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  btnExportExpenses?.addEventListener("click", async () => {
    const records = await api.records.getAll();
    exportToCSV(records.filter((r) => r.type === "expense"), "expenses");
  });

  btnExportIncome?.addEventListener("click", async () => {
    const records = await api.records.getAll();
    exportToCSV(records.filter((r) => r.type === "income"), "income");
  });

  // ===============================
  // PAGINATION
  // ===============================
  document.getElementById("prevPageExpense")?.addEventListener("click", () => {
    if (expensePage > 1) {
      expensePage--;
      loadRecords();
    }
  });

  document.getElementById("nextPageExpense")?.addEventListener("click", () => {
    expensePage++;
    loadRecords();
  });

  document.getElementById("prevPageIncome")?.addEventListener("click", () => {
    if (incomePage > 1) {
      incomePage--;
      loadRecords();
    }
  });

  document.getElementById("nextPageIncome")?.addEventListener("click", () => {
    incomePage++;
    loadRecords();
  });

  // ===============================
  // INITIAL LOAD
  // ===============================
  loadRecords();
});
