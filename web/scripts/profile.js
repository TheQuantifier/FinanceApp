import { api } from "./api.js";

// -------------------------------
// DOM ELEMENTS
// -------------------------------
const editBtn = document.getElementById("editProfileBtn");
const form = document.getElementById("editForm");
const cancelBtn = document.getElementById("cancelEditBtn");

// SUMMARY DISPLAY FIELDS
const f = {
  fullName: document.getElementById("fullName"),
  username: document.getElementById("username"),
  email: document.getElementById("email"),
  phoneNumber: document.getElementById("phoneNumber"),
  location: document.getElementById("location"),
  role: document.getElementById("role"),
  createdAt: document.getElementById("createdAt"),
  bio: document.getElementById("bio"),
};

// FORM INPUTS
const input = {
  fullName: document.getElementById("input_fullName"),
  username: document.getElementById("input_username"),
  email: document.getElementById("input_email"),
  phoneNumber: document.getElementById("input_phoneNumber"),
  location: document.getElementById("input_location"),
  role: document.getElementById("input_role"),
  bio: document.getElementById("input_bio"),
};

// SECURITY / STATS FIELDS
const stats = {
  lastLogin: document.getElementById("stat_lastLogin"),
  twoFA: document.getElementById("stat_2FA"),
  uploads: document.getElementById("stat_uploads"),
};

// -------------------------------
// SHOW / HIDE EDIT FORM
// -------------------------------
function showForm() {
  form.hidden = false;
  editBtn.disabled = true;
}

function hideForm() {
  form.hidden = true;
  editBtn.disabled = false;
}

// -------------------------------
// LOAD USER PROFILE
// -------------------------------
async function loadUserProfile() {
  try {
    const { user } = await api.auth.me();

    // SUMMARY
    f.fullName.innerText = user.fullName || "—";
    f.username.innerText = "@" + (user.username || "—");
    f.email.innerText = user.email || "—";
    f.phoneNumber.innerText = user.phoneNumber || "—";
    f.location.innerText = user.location || "—";
    f.role.innerText = user.role || "—";
    f.createdAt.innerText = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : "—";
    f.bio.innerText = user.bio || "—";

    // SECURITY + STATS
    stats.lastLogin.innerText = user.lastLogin
      ? new Date(user.lastLogin).toLocaleString()
      : "—";
    stats.twoFA.innerText = user.twoFA ? "Enabled" : "Disabled";
    stats.uploads.innerText = user.recordsUploaded ?? "—";

    // EDIT FORM INPUTS
    input.fullName.value = user.fullName || "";
    input.username.value = user.username || "";
    input.email.value = user.email || "";
    input.phoneNumber.value = user.phoneNumber || "";
    input.location.value = user.location || "";
    input.role.value = user.role || "";
    input.bio.value = user.bio || "";

  } catch (err) {
    alert("You must be logged in.");
    window.location.href = "login.html";
  }
}

// -------------------------------
// SAVE PROFILE
// -------------------------------
async function saveProfile(e) {
  e.preventDefault();

  const updates = {
    fullName: input.fullName.value.trim(),
    username: input.username.value.trim(),
    email: input.email.value.trim(),
    phoneNumber: input.phoneNumber.value.trim(),
    location: input.location.value.trim(),
    role: input.role.value.trim(),
    bio: input.bio.value.trim(),
  };

  try {
    await api.auth.updateProfile(updates);
    hideForm();
    loadUserProfile();
    alert("Profile updated successfully!");
  } catch (err) {
    alert("Update failed: " + err.message);
  }
}

// -------------------------------
// COPY PROFILE LINK
// -------------------------------
document.getElementById("copyProfileLinkBtn")
  ?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      alert("Profile link copied!");
    } catch {
      alert("Could not copy link.");
    }
  });

// =====================================================
//              CHANGE PASSWORD MODAL
// =====================================================
const passwordModal = document.getElementById("passwordModal");
const passwordForm = document.getElementById("passwordForm");
const closePasswordModal = document.getElementById("closePasswordModal");
const changePasswordBtn = document.getElementById("changePasswordBtn");

// OPEN modal
changePasswordBtn?.addEventListener("click", () => {
  passwordModal.hidden = false;
});

// CLOSE modal (Cancel button)
closePasswordModal?.addEventListener("click", () => {
  passwordModal.hidden = true;
});

// CLOSE modal (click outside)
passwordModal?.addEventListener("click", (e) => {
  if (e.target === passwordModal) {
    passwordModal.hidden = true;
  }
});

// SUBMIT password form
passwordForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (newPassword !== confirmPassword) {
    alert("New passwords do not match.");
    return;
  }

  try {
    await api.auth.changePassword({
      currentPassword,
      newPassword,
    });

    alert("Password updated successfully!");
    passwordModal.hidden = true;
    passwordForm.reset();
  } catch (err) {
    alert("Password update failed: " + err.message);
  }
});

// =====================================================
//              SIGN OUT ALL SESSIONS
// =====================================================
document.getElementById("signOutAllBtn")
  ?.addEventListener("click", async () => {
    if (!confirm("Sign out all devices?")) return;

    try {
      await api.auth.signOutAll();
      alert("All sessions have been signed out.");
      window.location.href = "login.html";
    } catch (err) {
      alert("Failed to sign out all sessions: " + err.message);
    }
  });

// =====================================================
//              RESTORE EDIT PROFILE FUNCTIONALITY
// =====================================================

// Show form when clicking Edit Profile
editBtn?.addEventListener("click", showForm);

// Hide form when clicking Cancel
cancelBtn?.addEventListener("click", hideForm);

// Save Profile
form?.addEventListener("submit", saveProfile);

// -------------------------------
// INIT
// -------------------------------
document.addEventListener("DOMContentLoaded", loadUserProfile);
