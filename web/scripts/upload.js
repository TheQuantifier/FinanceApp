/* ===============================================
   Finance App — upload.js
   Handles drag & drop, previews, basic validation,
   and a mock "upload" action (ready to swap for API).
   =============================================== */

(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusMsg = document.getElementById("statusMsg");
  const recentTableBody = document.getElementById("recentTableBody");

  const MAX_MB = 20;
  const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/heic", "image/heif"];

  /** In-memory queue of chosen files */
  let queue = [];

  // Helpers
  const bytesToSize = (bytes) => {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0, n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const extFromName = (name) => (name.includes(".") ? name.split(".").pop().toUpperCase() : "");

  const isAccepted = (file) => {
    if (ACCEPTED.includes(file.type)) return true;
    // Some browsers may not set HEIC/HEIF types reliably; fall back to extension check.
    const ext = extFromName(file.name).toLowerCase();
    return ["pdf", "png", "jpg", "jpeg", "heic", "heif"].includes(ext);
  };

  const overLimit = (file) => file.size > MAX_MB * 1024 * 1024;

  function renderQueue() {
    fileList.innerHTML = "";
    if (queue.length === 0) {
      uploadBtn.disabled = true;
      return;
    }
    uploadBtn.disabled = false;

    queue.forEach((file, idx) => {
      const item = document.createElement("div");
      item.className = "file-item";

      const thumb = document.createElement("div");
      thumb.className = "file-thumb";

      if (file.type.startsWith("image/")) {
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
    const accepted = [];
    let rejected = 0;

    incoming.forEach((f) => {
      if (!isAccepted(f) || overLimit(f)) {
        rejected++;
        return;
      }
      accepted.push(f);
    });

    queue = queue.concat(accepted);
    renderQueue();

    if (rejected > 0) {
      statusMsg.textContent = `${rejected} file(s) skipped due to type or size limits (max ${MAX_MB}MB).`;
    } else if (accepted.length > 0) {
      statusMsg.textContent = `${accepted.length} file(s) added.`;
    }
  }

  // Input click / change
  fileInput.addEventListener("change", (e) => addFiles(e.target.files));

  // Dropzone open file dialog when clicked or Enter/Space
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
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
      if (evt === "drop") addFiles(e.dataTransfer.files);
      dropzone.classList.remove("is-dragover");
    })
  );

  // Clear
  clearBtn.addEventListener("click", () => {
    queue = [];
    fileInput.value = "";
    renderQueue();
    statusMsg.textContent = "Cleared selection.";
  });

  // Mock upload (replace with your API call)
  uploadBtn.addEventListener("click", async () => {
    uploadBtn.disabled = true;
    statusMsg.textContent = "Uploading…";

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 700));

    // On success: add to recent table (mock)
    const now = new Date();
    queue.forEach((f) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.name}</td>
        <td>${(f.type || extFromName(f.name)).toUpperCase()}</td>
        <td>${now.toLocaleDateString()}</td>
        <td class="num">${bytesToSize(f.size)}</td>
        <td>Processed</td>
      `;
      recentTableBody.prepend(tr);
    });

    statusMsg.textContent = `Uploaded ${queue.length} file(s).`;
    queue = [];
    renderQueue();
  });
})();