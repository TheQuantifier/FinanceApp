/* ===============================================
   Finance App – default.js
   Shared script for all pages.
   Loads header/footer, sets active nav link,
   manages account dropdown, and updates
   login/logout state from the backend API.
   =============================================== */

import { api } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  loadHeaderAndFooter();
});

/**
 * Fetch and inject header & footer, then set active nav link
 */
function loadHeaderAndFooter() {
  // --- Load Header ---
  fetch("components/header.html")
    .then((res) => {
      if (!res.ok) throw new Error("Header not found");
      return res.text();
    })
    .then((html) => {
      document.getElementById("header").innerHTML = html;

      setActiveNavLink();
      initAccountMenu();
      updateHeaderAuthState();   // <-- NEW
      wireLogoutButton();        // <-- NEW
    })
    .catch((err) => console.error("Header load failed:", err));

  // --- Load Footer ---
  fetch("components/footer.html")
    .then((res) => {
      if (!res.ok) throw new Error("Footer not found");
      return res.text();
    })
    .then((html) => {
      document.getElementById("footer").innerHTML = html;
    })
    .catch((err) => console.error("Footer load failed:", err));
}

/**
 * Highlights the current page in the navigation menu
 */
function setActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll("#header nav a");

  navLinks.forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) link.classList.add("active");
    else link.classList.remove("active");
  });
}

/**
 * Initializes account menu dropdown toggle behavior
 */
function initAccountMenu() {
  const icon = document.getElementById("account-icon");
  const menu = document.getElementById("account-menu");

  if (!icon || !menu) return;

  icon.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("show");
    icon.setAttribute("aria-expanded", isOpen);
  });

  document.addEventListener("click", (e) => {
    if (!icon.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
    }
  });

  icon.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
      icon.blur();
    }
  });
}

/**
 * Detects login status and updates header UI
 * (shows username, hides login/register, etc.)
 */
async function updateHeaderAuthState() {
  try {
    const { user } = await api.auth.me();

    // Logged-in UI visible
    document.querySelectorAll(".auth-logged-in")
      .forEach((el) => el.classList.remove("hidden"));

    // Logged-out UI hidden
    document.querySelectorAll(".auth-logged-out")
      .forEach((el) => el.classList.add("hidden"));

    // Show name
    const nameEl = document.getElementById("headerUserName");
    if (nameEl) nameEl.textContent = user.name || "Account";

  } catch {
    // Logged-out UI visible
    document.querySelectorAll(".auth-logged-in")
      .forEach((el) => el.classList.add("hidden"));

    // Logged-in UI hidden
    document.querySelectorAll(".auth-logged-out")
      .forEach((el) => el.classList.remove("hidden"));
  }
}

/**
 * Wires the Logout button (after header loads)
 */
function wireLogoutButton() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#logoutBtn");
    if (!btn) return;

    try {
      await api.auth.logout();
      window.location.href = "login.html";
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Could not log out.");
    }
  });
}