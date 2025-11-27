// scripts/upload.js
// FinanceApp — Modernized
// Uses the official API module (api.receipts.*)
// No hard-coded backend URLs

import { api } from "./api.js";

(function () {
  // Accepted file types
  const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];
  const MAX_MB = 50;

  // DOM elements
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusMsg = document.getElementById("statusMsg");
  const recentTableBody = document.getElementById("recentTableBody");

  if (!dropzone || !fileInput) {
    console.error("upload.js: Missing #dropzone or #fileInput in DOM");
    return;
  }

  let queue = [];
  let pickerArmed = false;

  // ----------------------------------------------------
  // Helper utilities
  // ----------------------------------------------------
  const setStatus = (msg, isError = false) => {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.classList.toggle("error", !!isError);
  };

  const bytesToSize = (bytes) => {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0, n = bytes || 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    const fixed = n >= 10 || i === 0 ? 0 : 1;
    return `${n.toFixed(fixed)} ${units[i]}`;
  };

  const extFromName = (name) =>
    name.includes(".") ? name.split(".").pop().toUpperCase() : "";

  const isAccepted = (file) =>
    ACCEPTED.includes(file.type) ||
    ["pdf", "png", "jpg", "jpeg"].includes(extFromName(file.name).toLowerCase());

  const overLimit = (file) =>
    file.size > MAX_MB * 1024 * 1024;

  // ----------------------------------------------------
  // Recent uploads table
  // ----------------------------------------------------
  const trashSVG = `<img src="images/trash.jpg" alt="Delete" class="icon-trash" />`;

  const renderRecentRows = (rows) => {
    recentTableBody.innerHTML = "";
    if (!rows.length) {
      recentTableBody.innerHTML =
        `<tr><td colspan="6" class="subtle">No uploads yet.</td></tr>`;
      return;
    }

    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.dataset.id = r._id;

      tr.innerHTML = `
        <td>${r.originalFilename || "—"}</td>
        <td>${r.mimetype || "—"}</td>
        <td class="num">${bytesToSize(r.sizeBytes || 0)}</td>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
        <td>${r.ocrText ? "parsed" : "raw"}</td>
        <td class="num">
          <button class="icon-btn js-delete" data-id="${r._id}">
            ${trashSVG}
          </button>
        </td>
      `;
      recentTableBody.appendChild(tr);
    }
  };

  const refreshRecent = async () => {
    try {
      const rows = await api.receipts.getAll();
      renderRecentRows(rows || []);
    } catch (err) {
      console.error(err);
      recentTableBody.innerHTML =
        `<tr><td colspan="6" class="subtle">Failed to load uploads.</td></tr>`;
    }
  };

  // Delete button event
  recentTableBody?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-delete");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    if (!id) return;

    if (!confirm("Delete this receipt?")) return;

    try {
      btn.disabled = true;
      await api.receipts.remove(id);
      setStatus("Deleted.");
      refreshRecent();
    } catch (err) {
      console.error(err);
      setStatus(`Delete failed: ${err.message}`, true);
      btn.disabled = false;
    }
  });

  // ----------------------------------------------------
  // Queue rendering
  // ----------------------------------------------------
  function renderQueue() {
    fileList.innerHTML = "";
    const hasItems = queue.length > 0;
    uploadBtn.disabled = !hasItems;
    if (!hasItems) return;

    queue.forEach((file, idx) => {
      const item = document.createElement("div");
      item.className = "file-item";

      const thumb = document.createElement("div");
      thumb.className = "file-thumb";

      if ((file.type || "").startsWith("image/")) {
        const img = document.createElement("img");
        img.alt = "";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        const reader = new FileReader();
        reader.onload = (e) => (img.src = e.target.result);
        reader.readAsDataURL(file);
        thumb.appendChild(img);
      } else {
        thumb.textContent = extFromName(file.name) || "FILE";
      }

      const meta = document.createElement("div");
      meta.className = "file-meta";
      meta.innerHTML = `
        <div class="file-name">${file.name}</div>
        <div class="file-subtle">${file.type || "Unknown"} • ${bytesToSize(file.size)}</div>
      `;

      const actions = document.createElement("div");
      actions.className = "file-actions";
      const removeBtn = document.createElement("button");
      removeBtn.className = "file-remove";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        queue.splice(idx, 1);
        renderQueue();
      });
      actions.appendChild(removeBtn);

      item.appendChild(thumb);
      item.appendChild(meta);
      item.appendChild(actions);

      fileList.appendChild(item);
    });
  }

  function addFiles(files) {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;

    const accepted = [];
    let rejected = 0;

    incoming.forEach((f) => {
      if (!isAccepted(f) || overLimit(f)) {
        rejected++;
        return;
      }
      accepted.push(f);
    });

    if (accepted.length) {
      queue = queue.concat(accepted);
      renderQueue();
      setStatus(`${accepted.length} file(s) added.`);
    }

    if (rejected > 0) {
      setStatus(
        `${rejected} file(s) skipped (PDF/PNG/JPG only, ≤ ${MAX_MB} MB).`,
        true
      );
    }
  }

  // ----------------------------------------------------
  // File picker
  // ----------------------------------------------------
  function openPickerOnce() {
    if (!fileInput || pickerArmed) return;
    pickerArmed = true;
    const disarm = () => (pickerArmed = false);

    const onChange = () => {
      disarm();
      fileInput.removeEventListener("change", onChange);
    };

    fileInput.addEventListener("change", onChange, { once: true });
    setTimeout(disarm, 2500);

    try {
      fileInput.showPicker?.() ?? fileInput.click();
    } catch {
      fileInput.click();
    }
  }

  fileInput.addEventListener("click", (e) => e.stopPropagation(), true);
  dropzone.addEventListener("click", () => openPickerOnce(), true);
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPickerOnce();
    }
  });

  fileInput.addEventListener("change", (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  });

  // Drag/drop events
  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("is-dragover");
    })
  );

  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (evt === "drop" && e.dataTransfer?.files) {
        addFiles(e.dataTransfer.files);
      }
      dropzone.classList.remove("is-dragover");
    })
  );

  clearBtn?.addEventListener("click", () => {
    queue = [];
    fileInput.value = "";
    renderQueue();
    setStatus("Cleared selection.");
  });

  // ----------------------------------------------------
  // Upload all files through api.receipts.upload()
  // ----------------------------------------------------
  async function uploadAll() {
    while (queue.length > 0) {
      const file = queue[0];

      uploadBtn.disabled = true;
      dropzone.setAttribute("aria-busy", "true");
      setStatus(`Uploading ${file.name}…`);

      try {
        await api.receipts.upload(file); // ← your official endpoint
        setStatus(`Uploaded: ${file.name}`);
        queue.shift();
        renderQueue();
        await refreshRecent();
      } catch (err) {
        console.error(err);
        setStatus(`Upload failed: ${err.message}`, true);
        break;
      } finally {
        dropzone.removeAttribute("aria-busy");
      }
    }

    uploadBtn.disabled = queue.length === 0;
  }

  uploadBtn?.addEventListener("click", uploadAll);

  // ----------------------------------------------------
  // Init
  // ----------------------------------------------------
  renderQueue();
  refreshRecent();
})();