// web/scripts/api.js

// --------------------------------------
// CONFIG
// --------------------------------------

const API_BASE = "https://financeapp-5u9g.onrender.com/api";
// const API_BASE = "http://localhost:5000/api";  // Local testing


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

    async register(email, password, name) {
        return request("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, name }),
        });
    },

    async login(email, password) {
        return request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
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

    async getOne(id) {
        return request(`/records/${id}`);
    },

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
            credentials: "include"
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
        return request(`/receipts/${id}`, {
            method: "DELETE",
        });
    },

    async preview(id) {
        const res = await fetch(`${API_BASE}/receipts/${id}/preview`, {
            method: "GET",
            credentials: "include"
        });
        if (!res.ok) throw new Error("Preview failed");
        return await res.blob();
    },
};


// --------------------------------------
// EXPORTED API OBJECT
// --------------------------------------

export const api = { auth, records, receipts };