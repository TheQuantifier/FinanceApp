// web/scripts/api.js

// --------------------------------------
// CONFIG
// --------------------------------------

// Change this to your Render backend URL once deployed:
const API_BASE = "https://your-render-service.onrender.com/api";

// During local testing:
// const API_BASE = "http://localhost:5000/api";


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

    // Register new user
    async register(email, password, name) {
        return request("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, name }),
        });
    },

    // Login user
    async login(email, password) {
        return request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
    },

    // Logout
    async logout() {
        return request("/auth/logout", { method: "POST" });
    },

    // Get current user
    async me() {
        return request("/auth/me");
    },
};


// --------------------------------------
// RECORDS MODULE
// --------------------------------------

export const records = {

    // Get all records for logged-in user
    async getAll() {
        return request("/records");
    },

    // Create a new record
    async create({ type, amount, category, date, note }) {
        return request("/records", {
            method: "POST",
            body: JSON.stringify({ type, amount, category, date, note }),
        });
    },

    // Get one record
    async getOne(id) {
        return request(`/records/${id}`);
    },

    // Delete record
    async remove(id) {
        return request(`/records/${id}`, {
            method: "DELETE",
        });
    },
};


// --------------------------------------
// RECEIPTS MODULE
// --------------------------------------

export const receipts = {

    // Upload a receipt file (PDF/JPG/PNG)
    async upload(file) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_BASE}/receipts/upload`, {
            method: "POST",
            credentials: "include",
            body: formData, // no JSON header!
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

    // Get all receipts for this user
    async getAll() {
        return request("/receipts");
    },

    // Get a single receipt
    async getOne(id) {
        return request(`/receipts/${id}`);
    },

    // Download receipt file stored in GridFS
    async download(id) {
        const res = await fetch(`${API_BASE}/receipts/${id}/download`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            throw new Error("Download failed");
        }

        const blob = await res.blob();
        return blob;  // Caller decides how to save
    },

    // Trigger download in browser directly
    async downloadToFile(id, filename = "receipt") {
        const blob = await this.download(id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    },

    // (Optional) Future: Delete receipt
    async remove(id) {
        return request(`/receipts/${id}`, {
            method: "DELETE",
        });
    },

    // (Optional) Future: Preview receipt inline
    async preview(id) {
        const res = await fetch(`${API_BASE}/receipts/${id}/preview`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) throw new Error("Preview failed");

        return await res.blob(); // Caller loads into <img> or <embed>
    },
};


// --------------------------------------
// EXPORTED API OBJECT
// --------------------------------------

export const api = { auth, records, receipts };