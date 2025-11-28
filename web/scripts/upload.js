// scripts/upload.js
// FinanceApp — Receipt Uploads, Downloads, and Deletion
// Fully aligned with your updated backend & API module

import { api } from "./api.js";

(function () {
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

  // ----------------------------------------
  // Helpers
  // ----------------------------------------
  const setStatus = (msg, isError = false) => {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.classList.toggle("error", !!isError);
  };

  const bytesToSize = (bytes = 0) => {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const extFromName = (name = "") =>
    name.includes(".") ? name.split(".").pop().toUpperCase() : "";

  const isAccepted = (file) =>
    ACCEPTED.includes(file.type) ||
    ["pdf", "png", "jpg", "jpeg"].includes(extFromName(file.name).toLowerCase());

  const overLimit = (file) => file.size > MAX_MB * 1024 * 1024;

  // ----------------------------------------
  // Recent Uploads Table
  // ----------------------------------------

  const trashIcon = `<img src="images/trash.jpg" alt="Delete" class="icon-trash" />`;
  const downloadIcon = `<img src="images/download.png" alt="Download" class="icon-trash" />`;

  function renderRecentRows(rows) {
    recentTableBody.innerHTML = "";

    if (!rows.length) {
      recentTableBody.innerHTML =
        `<tr><td colspan="6" class="subtle">No uploads yet.</td></tr>`;
      return;
    }

    for (const r of rows) {
      const id = r._id;
      const created = r.createdAt
        ? new Date(r.createdAt).toLocaleString()
        : "—";
      const filename = r.originalFilename || "receipt";

      const tr = document.createElement("tr");
      tr.dataset.id = id;

      tr.innerHTML = `
        <td>${filename}</td>
        <td>${r.mimetype || "—"}</td>
        <td class="num">${bytesToSize(r.sizeBytes || 0)}</td>
        <td>${created}</td>
        <td>${r.ocrText ? "parsed" : "raw"}</td>

        <td class="num actions-col">
          <button class="icon-btn js-download" data-id="${id}" data-filename="${filename}">
            ${downloadIcon}
          </button>

          <button class="icon-btn js-delete" data-id="${id}">
            ${trashIcon}
          </button>
        </td>
      `;

      recentTableBody.appendChild(tr);
    }
  }

  async function refreshRecent() {
    try {
      const rows = await api.receipts.getAll();
      renderRecentRows(rows || []);
    } catch (err) {
      console.error("Failed to refresh uploads:", err);
      recentTableBody.innerHTML =
        `<tr><td colspan="6" class="subtle">Failed to load uploads.</td></tr>`;
    }
  }

  // ----------------------------------------
  // Download + Delete Actions
  // ----------------------------------------
  recentTableBody?.addEventListener("click", async (e) => {
    const downloadBtn = e.target.closest(".js-download");
    const deleteBtn = e.target.closest(".js-delete");

    // ========= DOWNLOAD =========
    if (downloadBtn) {
      const id = downloadBtn.dataset.id;
      const filename = downloadBtn.dataset.filename || "receipt";

      try {
        setStatus("Downloading...");
        await api.receipts.downloadToFile(id, filename);
        setStatus("Download complete.");
      } catch (err) {
        console.error("Download error:", err);
        setStatus(`Download failed: ${err.message}`, true);
      }
      return;
    }

    // ========= DELETE =========
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (!id) return;

      if (!confirm("Delete this receipt?")) return;

      try {
        deleteBtn.disabled = true;
        await api.receipts.remove(id);
        setStatus("Receipt deleted.");
        await refreshRecent();
      } catch (err) {
        console.error("Delete error:", err);
        setStatus(`Delete failed: ${err.message}`, true);
        deleteBtn.disabled = false;
      }
    }
  });

  // ----------------------------------------
  // Queue Rendering + Local List
  // ----------------------------------------
  function renderQueue() {
    fileList.innerHTML = "";
    const hasItems = queue.length > 0;
    uploadBtn.disabled = !hasItems;

    queue.forEach((file, idx) => {
      const item = document.createElement("div");
      item.className = "file-item";

      // Thumbnail
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

      // Metadata
      const meta = document.createElement("div");
      meta.className = "file-meta";
      meta.innerHTML = `
        <div class="file-name">${file.name}</div>
        <div class="file-subtle">${file.type || "Unknown"} • ${bytesToSize(file.size)}</div>
      `;

      // Remove from queue
      const removeBtn = document.createElement("button");
      removeBtn.className = "file-remove";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        queue.splice(idx, 1);
        renderQueue();
      });

      const actions = document.createElement("div");
      actions.className = "file-actions";
      actions.appendChild(removeBtn);

      item.appendChild(thumb);
      item.appendChild(meta);
      item.appendChild(actions);

      fileList.appendChild(item);
    });
  }

  function addFiles(files) {
    const incoming = Array.from(files || []);
    const accepted = [];
    let rejected = 0;

    incoming.forEach((f) => {
      if (!isAccepted(f) || overLimit(f)) rejected++;
      else accepted.push(f);
    });

    if (accepted.length) {
      queue = queue.concat(accepted);
      renderQueue();
      setStatus(`${accepted.length} file(s) added.`);
    }

    if (rejected) {
      setStatus(
        `${rejected} file(s) skipped (PDF/PNG/JPG only, ≤ ${MAX_MB} MB).`,
        true
      );
    }
  }

  // ----------------------------------------
  // File Picker + Dropzone
  // ----------------------------------------
  function openPickerOnce() {
    if (!fileInput || pickerArmed) return;

    pickerArmed = true;
    const disarm = () => (pickerArmed = false);

    const onChange = () => {
      disarm();
      fileInput.removeEventListener("change", onChange);
    };

    fileInput.addEventListener("change", onChange, { once: true });
    setTimeout(disarm, 2000);

    try {
      fileInput.showPicker?.() ?? fileInput.click();
    } catch {
      fileInput.click();
    }
  }

  fileInput.addEventListener("click", (e) => e.stopPropagation());
  dropzone.addEventListener("click", openPickerOnce);

  dropzone.addEventListener("keydown", (e) => {
    if (["Enter", " "].includes(e.key)) {
      e.preventDefault();
      openPickerOnce();
    }
  });

  fileInput.addEventListener("change", (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );

  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
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

  // ----------------------------------------
  // Upload Logic
  // ----------------------------------------
  async function uploadAll() {
    while (queue.length > 0) {
      const file = queue[0];

      uploadBtn.disabled = true;
      dropzone.setAttribute("aria-busy", "true");
      setStatus(`Uploading ${file.name}…`);

      try {
        await api.receipts.upload(file);
        setStatus(`Uploaded: ${file.name}`);
        queue.shift();
        renderQueue();
        await refreshRecent();
      } catch (err) {
        console.error("Upload error:", err);
        setStatus(`Upload failed: ${err.message}`, true);
        break;
      } finally {
        dropzone.removeAttribute("aria-busy");
      }
    }

    uploadBtn.disabled = queue.length === 0;
  }

  uploadBtn?.addEventListener("click", uploadAll);

  // ----------------------------------------
  // Init
  // ----------------------------------------
  renderQueue();
  refreshRecent();
})();