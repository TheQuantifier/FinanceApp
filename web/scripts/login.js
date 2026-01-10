// scripts/login.js

import { api } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");

  if (!form) {
    console.error("❌ loginForm not found.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const identifier = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!identifier || !password) {
      errorEl.textContent = "Please enter your email/username and password.";
      return;
    }

    try {
      // ---- LOGIN THROUGH CENTRALIZED API MODULE ----
      await api.auth.login(identifier, password);

      // Success → redirect to dashboard
      window.location.href = "/home.html";

    } catch (err) {
      console.error("Login error:", err);
      errorEl.textContent = err.message || "Login failed.";
    }
  });
});