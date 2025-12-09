// web/scripts/api.js

// --------------------------------------
// CONFIG (auto-switch suggested)
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
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// --------------------------------------
// AUTH MODULE
// --------------------------------------
export const auth = {
  async register(email, password, fullName) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    });
  },

  async login(identifier, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
  },

  async logout() {
    return request("/auth/logout", { method: "POST" });
  },

  async me() {
    return request("/auth/me");
  },

  async updateProfile(updates) {
    return request("/auth/me", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async changePassword(currentPassword, newPassword) {
    return request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async deleteAccount() {
    return request("/auth/me", { method: "DELETE" });
  },

  // --------------------------------------
  // STAND-IN FEATURES (NOT IMPLEMENTED)
  // --------------------------------------

  async toggle2FA() {
    return {
      status: false,
      message: "Two-Factor Authentication is not implemented yet.",
    };
  },

  async signOutAll() {
    return {
      status: false,
      message: "Sign-out-from-all-devices is not implemented yet.",
    };
  },
};

// --------------------------------------
// RECORDS MODULE
// --------------------------------------
export const records = {
  async getAll() {
    return request("/records");
  },

  async create({ type, amount, category, date, note }) {
    return request("/records", {
      method: "POST",
      body: JSON.stringify({ type, amount, category, date, note }),
    });
  },

  async update(id, updates) {
    return request(`/records/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async getOne(id) {
    return request(`/records/${id}`);
  },

  async remove(id) {
    return request(`/records/${id}`, { method: "DELETE" });
  },
};

// --------------------------------------
// RECEIPTS MODULE
// --------------------------------------
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

  async getAll() {
    return request("/receipts");
  },

  async getOne(id) {
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

  async remove(id) {
    return request(`/receipts/${id}`, { method: "DELETE" });
  },
};

// --------------------------------------
// HELPERS
// --------------------------------------

// Determines whether a record was auto-created from a receipt
// or manually entered by the user.
function getUploadType(record) {
  return record?.linkedReceiptId ? "Receipt" : "Manual";
}

// --------------------------------------
// EXPORTED API OBJECT
// --------------------------------------
export const api = { auth, records, receipts, getUploadType };
