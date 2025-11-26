// web/scripts/api.js

// --------------------------------------
// CONFIG
// --------------------------------------

// Change this to your Render backend URL once deployed:
const API_BASE = "https://your-render-service.onrender.com/api";

// During local testing, you can comment that out and use:
// const API_BASE = "http://localhost:5000/api";


// --------------------------------------
// INTERNAL REQUEST WRAPPER
// --------------------------------------

async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",       // allows cookies for JWT
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options,
    });

    // Attempt to parse JSON
    let data = null;
    try {
        data = await res.json();
    } catch {}

    // Normalize error handling
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

    // Get all records
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

    // Delete record by ID
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

    // Upload a receipt file
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

    // Get all receipts
    async getAll() {
        return request("/receipts");
    },

    // Get one receipt
    async getOne(id) {
        return request(`/receipts/${id}`);
    },
};


// --------------------------------------
// EXPORTED API OBJECT (optional convenience)
// --------------------------------------

export const api = { auth, records, receipts };

/**
 * Implement this way:
 * <script type="module">
    import { api } from "/scripts/api.js";

    async function loadData() {
        const user = await api.auth.me();
        const recs = await api.records.getAll();
        console.log(user, recs);
    }

    loadData();
</script>
 */