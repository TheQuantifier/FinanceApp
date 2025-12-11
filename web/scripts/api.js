// ======================================================================
// FinanceApp Frontend API Wrapper
// Fully aligned with backend routes, behaviors, and linked receipt logic
// ======================================================================

// --------------------------------------
// CONFIG (auto-switch for localhost vs Render)
// --------------------------------------
const API_BASE =
  window.location.hostname.includes("localhost")
    ? "http://localhost:5000/api"
    : "https://financeapp-5u9g.onrender.com/api";

// --------------------------------------
// INTERNAL REQUEST WRAPPER
// --------------------------------------
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    console.warn("API returned non-JSON response for:", path);
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// ======================================================================
// AUTH MODULE
// ======================================================================
export const auth = {
  register(email, password, fullName) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    });
  },

  login(identifier, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
  },

  logout() {
    return request("/auth/logout", { method: "POST" });
  },

  me() {
    return request("/auth/me");
  },

  updateProfile(updates) {
    return request("/auth/me", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  changePassword(currentPassword, newPassword) {
    return request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  deleteAccount() {
    return request("/auth/me", { method: "DELETE" });
  },
};

// ======================================================================
// RECORDS MODULE
// ======================================================================
export const records = {
  getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/records${query ? `?${query}` : ""}`);
  },

  getOne(id) {
    return request(`/records/${id}`);
  },

  create({ type, amount, category, date, note }) {
    return request("/records", {
      method: "POST",
      body: JSON.stringify({ type, amount, category, date, note }),
    });
  },

  update(id, updates) {
    return request(`/records/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /**
   * deleteReceipt === true  → delete linked receipt also
   * deleteReceipt === false → unlink but keep receipt
   * deleteReceipt === undefined → omit parameter
   */
  remove(id, deleteReceipt) {
    const query =
      deleteReceipt === undefined ? "" : `?deleteReceipt=${deleteReceipt}`;

    return request(`/records/${id}${query}`, { method: "DELETE" });
  },
};

// ======================================================================
// RECEIPTS MODULE
// ======================================================================
export const receipts = {
  async upload(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/receipts/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Invalid JSON returned from receipt upload");
    }

    if (!res.ok) {
      throw new Error(data?.message || "Receipt upload failed");
    }

    return data;
  },

  getAll() {
    return request("/receipts");
  },

  getOne(id) {
    return request(`/receipts/${id}`);
  },

  async download(id) {
    const res = await fetch(`${API_BASE}/receipts/${id}/download`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error("Download failed");
    return await res.blob();
  },

  async downloadToFile(id, filename = "receipt") {
    const blob = await this.download(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  remove(id, deleteRecord) {
    const query =
      deleteRecord === undefined ? "" : `?deleteRecord=${deleteRecord}`;

    return request(`/receipts/${id}${query}`, { method: "DELETE" });
  },
};

// ======================================================================
// UI HELPERS (shared by all frontend pages)
// ======================================================================

/** Returns "Receipt" if the record is linked, otherwise "Manual". */
export function getUploadType(record) {
  return record?.linkedReceiptId ? "Receipt" : "Manual";
}

export function getPayMethodLabel(method) {
  const map = {
    Cash: "Cash",
    Check: "Check",
    "Credit Card": "Credit Card",
    "Debit Card": "Debit Card",
    "Gift Card": "Gift Card",
    Multiple: "Multiple Methods",
    Other: "Other / Unknown",
  };
  return map[method] || "Unknown";
}

export function getReceiptSummary(receipt) {
  const p = receipt?.parsedData || {};

  return {
    date: p.date || "",
    dateAdded: receipt.createdAt || "",
    source: p.source || receipt.originalFilename,
    subAmount: Number(p.subAmount || 0),
    amount: Number(p.amount || 0),
    taxAmount: Number(p.taxAmount || 0),
    payMethod: getPayMethodLabel(p.payMethod),
    items: Array.isArray(p.items) ? p.items : [],
  };
}

// ======================================================================
// ROOT EXPORT
// ======================================================================
export const api = {
  auth,
  records,
  receipts,
  getUploadType,
  getReceiptSummary,
  getPayMethodLabel,
};
