import { api } from "./api.js";

console.log("Settings page loaded.");

//
// ---------------------------------------------------
// DARK MODE TOGGLE — Works globally via default.js
// ---------------------------------------------------
//
const toggleDarkModeBtn = document.getElementById("toggleDarkMode");

function updateThemeButtonLabel() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  toggleDarkModeBtn.textContent =
    theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";
}

if (toggleDarkModeBtn) {
  // Set correct initial label
  updateThemeButtonLabel();

  toggleDarkModeBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    // Apply globally
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    console.log(`Theme changed to: ${newTheme}`);

    // Update button text
    updateThemeButtonLabel();
  });
}

//
// ---------------------------------------------------
// NOTIFICATION TOGGLES (placeholder)
// ---------------------------------------------------
//
document.getElementById("notif_email")?.addEventListener("change", () => {
  console.log("Email notifications toggled");
});

document.getElementById("notif_sms")?.addEventListener("change", () => {
  console.log("SMS notifications toggled");
});

//
// ---------------------------------------------------
// DELETE ACCOUNT
// ---------------------------------------------------
//
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", async () => {
    const confirm1 = confirm("Are you sure you want to delete your account?");
    if (!confirm1) return;

    const confirm2 = confirm(
      "⚠️ This action is permanent.\n\nYour profile, all records, receipts, and uploads will be permanently deleted.\n\nContinue?"
    );
    if (!confirm2) return;

    try {
      await api.auth.deleteAccount();
      alert("Your account has been permanently deleted.");
      window.location.href = "login.html";
    } catch (err) {
      alert("Failed to delete account: " + err.message);
    }
  });
}
