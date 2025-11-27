// web/scripts/register.js

import { api } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("registerMessage");

  if (!form) {
    console.error("❌ registerForm not found on page.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.style.color = "";

    // --- Get field values ---
    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    // --- Validation ---
    if (!name || !email || !password) {
      msg.textContent = "Please fill in all fields.";
      msg.style.color = "red";
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      msg.textContent = "Please enter a valid email.";
      msg.style.color = "red";
      return;
    }

    if (password.length < 8) {
      msg.textContent = "Password must be at least 8 characters long.";
      msg.style.color = "red";
      return;
    }

    msg.textContent = "Creating your account…";
    msg.style.color = "black";

    try {
      // ---- CALL BACKEND THROUGH api.js ----
      const result = await api.auth.register(email, password, name);

      msg.textContent = "✅ Account created! Redirecting…";
      msg.style.color = "green";

      // Wait briefly then redirect
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

    } catch (err) {
      console.error("Registration error:", err);
      msg.textContent = err.message || "Registration failed.";
      msg.style.color = "red";
    }
  });
});