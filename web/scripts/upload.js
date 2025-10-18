/* ===============================================
   Finance App — upload.js
   Drag & drop / file picker → POST to API /upload
   Saves file to uploads/ and metadata to MongoDB.
   =============================================== */

(function () {
  const API_BASE =
    new URLSearchParams(location.search).get("api") ||
    (typeof window.API_BASE === "string" && window.API_BASE) ||
    "http://localhost:4000";

  const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];
  const MAX_MB = 50;

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusMsg = document.getElementById("statusMsg");
  const recentTableBody = document.getElementById("recentTableBody");

  if (!dropzone || !fileInput) {
    console.error("upload.js: Missing #dropzone or #fileInput in the DOM.");
    return;
  }

  // Make sure the zone can be clicked
  dropzone.style.pointerEvents = "auto";
  dropzone.setAttribute("role", "button");
  dropzone.setAttribute("tabindex", "0");

  let queue = [];
  let pickerArmed = false; // single-open guard

  // ---------- Helpers ----------
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

  const extFromName = (name) => (name.includes(".") ? name.split(".").pop().toUpperCase() : "");
  const isAccepted = (file) => {
    if (ACCEPTED.includes(file.type)) return true;
    const ext = extFromName(file.name).toLowerCase();
    return ["pdf", "png", "jpg", "jpeg"].includes(ext);
  };
  const overLimit = (file) => file.size > MAX_MB * 1024 * 1024;

  const fetchJSON = async (url, opts) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) {
      const msg = json?.error || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return json;
  };

  // ---------- Recent uploads ----------
  const refreshRecent = async () => {
    if (!recentTableBody) return;
    try {
      const rows = await fetchJSON(`${API_BASE}/receipts`, { mode: "cors" });
      recentTableBody.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        const when = r.uploaded_at ? new Date(r.uploaded_at).toLocaleString() : "—";
        tr.innerHTML = `
          <td>${r.original_filename || r.stored_filename || "—"}</td>
          <td>${r.mimetype || "—"}</td>
          <td class="num">${(r.size_bytes && bytesToSize(r.size_bytes)) || "—"}</td>
          <td>${when}</td>
          <td>${r.parse_status || "raw"}</td>
        `;
        recentTableBody.appendChild(tr);
      }
    } catch {
      /* optional */
    }
  };

  // ---------- Queue / UI ----------
  function renderQueue() {
    if (!fileList || !uploadBtn) return;
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
      const name = document.createElement("div");
      name.className = "file-name";
      name.textContent = file.name;
      const sub = document.createElement("div");
      sub.className = "file-subtle";
      sub.textContent = `${file.type || "Unknown"} • ${bytesToSize(file.size)}`;
      meta.appendChild(name);
      meta.appendChild(sub);

      const actions = document.createElement("div");
      actions.className = "file-actions";
      const removeBtn = document.createElement("button");
      removeBtn.className = "file-remove";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", `Remove ${file.name}`);
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
    if (incoming.length === 0) return; // user canceled

    const accepted = [];
    let rejected = 0;

    incoming.forEach((f) => {
      if (!isAccepted(f) || overLimit(f)) { rejected++; return; }
      accepted.push(f);
    });

    if (accepted.length) {
      queue = queue.concat(accepted);
      renderQueue();
      setStatus(`${accepted.length} file(s) added.`);
    }
    if (rejected > 0) {
      setStatus(`${rejected} file(s) skipped (PDF/PNG/JPG only, ≤ ${MAX_MB} MB).`, true);
    }
  }

  // ---------- Picker (no double-open, capture click) ----------
  function openPickerOnce() {
    if (!fileInput || pickerArmed) return;
    pickerArmed = true;

    const disarm = () => { pickerArmed = false; };
    const onChange = () => { disarm(); fileInput.removeEventListener("change", onChange); };
    fileInput.addEventListener("change", onChange, { once: true });

    // Safety disarm if user cancels and 'change' doesn't fire
    setTimeout(disarm, 2500);

    // Prefer modern showPicker if available
    try {
      if (typeof fileInput.showPicker === "function") {
        fileInput.showPicker();
      } else {
        fileInput.click();
      }
    } catch {
      // Fallback to click if showPicker throws (Safari)
      try { fileInput.click(); } catch {}
    }
  }

  // If someone clicks the hidden input directly, don’t bubble up
  fileInput.addEventListener("click", (e) => e.stopPropagation(), true);

  // Click handler in capture phase so overlays can’t swallow it
  dropzone.addEventListener("click", (e) => {
    openPickerOnce();
  }, true);

  // Keyboard access
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPickerOnce();
    }
  });

  // Native input change
  fileInput.addEventListener("change", (e) => {
    addFiles(e.target.files);
    e.target.value = ""; // allow re-selecting same file
  });

  // Drag & drop
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

  // Clear
  clearBtn?.addEventListener("click", () => {
    queue = [];
    fileInput.value = "";
    renderQueue();
    setStatus("Cleared selection.");
  });

  // Upload (first file in queue)
  uploadBtn?.addEventListener("click", async () => {
    if (queue.length === 0) return;

    const file = queue[0];
    const fd = new FormData();
    fd.append("receipt", file, file.name);

    uploadBtn.disabled = true;
    dropzone?.setAttribute("aria-busy", "true");
    setStatus("Uploading…");

    try {
      const json = await fetchJSON(`${API_BASE}/upload`, {
        method: "POST",
        body: fd,
        mode: "cors",
      });

      setStatus(`Uploaded: ${json?.file?.name || file.name}. Receipt ID: ${json?.receipt_id || "—"}`);
      queue.shift();
      renderQueue();
      await refreshRecent();
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`, true);
    } finally {
      uploadBtn.disabled = queue.length === 0;
      dropzone?.removeAttribute("aria-busy");
    }
  });

  // Initial draw
  renderQueue();
  refreshRecent();
})();
