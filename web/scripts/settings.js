console.log("Settings page loaded.");

// --------------------------------------
// DARK MODE (placeholder)
// --------------------------------------
document.getElementById("toggleDarkMode")?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// --------------------------------------
// NOTIFICATION TOGGLES (placeholder)
// --------------------------------------
document.getElementById("notif_email")?.addEventListener("change", () => {
  console.log("Email notifications toggled");
});

// --------------------------------------
// DELETE ACCOUNT
// --------------------------------------
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
