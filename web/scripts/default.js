/* ===============================================
   Finance App – default.js
   Shared script for all pages.
   Loads header/footer, sets active nav link,
   manages account dropdown, updates auth state,
   and renders initials avatar for logged-in users.
   =============================================== */

import { api } from "./api.js";

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
 * Controls the dropdown menu in the header
 */
function initAccountMenu() {
  const icon = document.getElementById("account-icon");
  const menu = document.getElementById("account-menu");
  if (!icon || !menu) return;

  icon.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("show");
    icon.setAttribute("aria-expanded", isOpen);
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!icon.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
    }
  });

  // Close on ESC
  icon.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menu.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
      icon.blur();
    }
  });
}

/**
 * Create initials from full name ("John Hand" → "JH")
 */
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Updates header avatar + name based on logged-in user
 */
async function updateHeaderAuthState() {
  try {
    const { user } = await api.auth.me();

    // SHOW logged-in UI
    document.querySelectorAll(".auth-logged-in")
      .forEach((el) => el.classList.remove("hidden"));
    // HIDE logged-out UI
    document.querySelectorAll(".auth-logged-out")
      .forEach((el) => el.classList.add("hidden"));

    // Determine display name
    const displayName = user.fullName || user.username || "Account";

    // Dropdown username
    const nameEl = document.getElementById("headerUserName");
    if (nameEl) nameEl.textContent = displayName;

    // Avatar initials
    const avatar = document.getElementById("avatarLetters");
    if (avatar) avatar.textContent = getInitials(displayName);

  } catch (err) {
    // Not authenticated → show logged-out UI
    document.querySelectorAll(".auth-logged-in")
      .forEach((el) => el.classList.add("hidden"));
    document.querySelectorAll(".auth-logged-out")
      .forEach((el) => el.classList.remove("hidden"));
  }
}

/**
 * Logout → backend logout → redirect
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