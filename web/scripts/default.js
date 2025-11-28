/* ===============================================
   Finance App – default.js
   Shared script for all pages.
   Loads header/footer, sets active nav link,
   manages account dropdown, updates auth state,
   renders initials avatar for logged-in users,
   AND now ensures favicon is always applied.
   =============================================== */

import { api } from "./api.js";


// =====================================================
// 🔥 GLOBAL FAVICON INJECTOR — APPLIES TO ALL PAGES
// =====================================================

(function ensureFavicon() {
  const existing = document.querySelector("link[rel='icon']");
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = "images/favicon.png";     // Adjust path if needed
  document.head.appendChild(link);
})();


// =====================================================
// Main: load header/footer when DOM is ready
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  loadHeaderAndFooter();
});


/**
 * Fetch and inject header & footer, then init UI
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
      updateHeaderAuthState();
      wireLogoutButton();
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
 * Highlights the current page in the nav menu
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
 * Account dropdown control
 */
function initAccountMenu() {
  const icon = document.getElementById("account-icon");
  const menu = document.getElementById("account-menu");
  if (!icon || !menu) return;

  icon.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("show");
    icon.setAttribute("aria-expanded", isOpen);
  });

  // Click outside closes
  document.addEventListener("click", (e) => {
    if (!icon.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
    }
  });

  // ESC closes
  icon.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
      icon.blur();
    }
  });
}


/**
 * Convert full name → initials ("John Hand" → "JH")
 */
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


/**
 * Update header state based on authentication
 */
async function updateHeaderAuthState() {
  try {
    const { user } = await api.auth.me();

    // Show logged-in elements
    document.querySelectorAll(".auth-logged-in")
      .forEach((el) => el.classList.remove("hidden"));

    // Hide logged-out elements
    document.querySelectorAll(".auth-logged-out")
      .forEach((el) => el.classList.add("hidden"));

    // Username
    const nameEl = document.getElementById("headerUserName");
    if (nameEl) nameEl.textContent = user.name || "Account";

    // Avatar initials
    const avatar = document.getElementById("avatarLetters");
    if (avatar) avatar.textContent = getInitials(user.name);

  } catch {
    // User not logged in
    document.querySelectorAll(".auth-logged-in")
      .forEach((el) => el.classList.add("hidden"));

    document.querySelectorAll(".auth-logged-out")
      .forEach((el) => el.classList.remove("hidden"));
  }
}


/**
 * Logout handler → calls backend → redirects to login
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