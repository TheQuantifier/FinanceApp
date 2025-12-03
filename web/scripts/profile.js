import { api } from "./api.js";

/* ----------------------------------------
   DOM ELEMENTS
---------------------------------------- */
const editBtn = document.getElementById("editProfileBtn");
const form = document.getElementById("editForm");
const cancelBtn = document.getElementById("cancelEditBtn");

// SUMMARY ELEMENTS
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

// SECURITY STATS
const stats = {
  lastLogin: document.getElementById("stat_lastLogin"),
  twoFA: document.getElementById("stat_2FA"),
  uploads: document.getElementById("stat_uploads"),
};

/* ----------------------------------------
   EDIT PROFILE FORM
---------------------------------------- */
function showForm() {
  form.hidden = false;
  editBtn.disabled = true;
}

function hideForm() {
  form.hidden = true;
  editBtn.disabled = false;
}

async function loadUserProfile() {
  try {
    const { user } = await api.auth.me();

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

    stats.lastLogin.innerText = user.lastLogin
      ? new Date(user.lastLogin).toLocaleString()
      : "—";
    stats.twoFA.innerText = user.twoFA ? "Enabled" : "Disabled";
    stats.uploads.innerText = user.recordsUploaded ?? "—";

    Object.keys(input).forEach((k) => {
      input[k].value = user[k] || "";
    });

  } catch (err) {
    alert("You must be logged in.");
    window.location.href = "login.html";
  }
}

async function saveProfile(e) {
  e.preventDefault();

  const updates = {};
  for (const key in input) updates[key] = input[key].value.trim();

  try {
    await api.auth.updateProfile(updates);
    hideForm();
    await loadUserProfile();
    alert("Profile updated successfully!");
  } catch (err) {
    alert("Update failed: " + err.message);
  }
}

/* ----------------------------------------
   COPY PROFILE LINK
---------------------------------------- */
document.getElementById("copyProfileLinkBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(location.href);
  alert("Profile link copied!");
});

/* ----------------------------------------
   CHANGE PASSWORD — MATCHES api.js
---------------------------------------- */
const passwordModal = document.getElementById("passwordModal");
const passwordForm = document.getElementById("passwordForm");
const closePasswordModal = document.getElementById("closePasswordModal");

document.getElementById("changePasswordBtn").addEventListener("click", () => {
  passwordModal.classList.remove("hidden");
});

closePasswordModal.addEventListener("click", () => {
  passwordModal.classList.add("hidden");
});

passwordModal.addEventListener("click", (e) => {
  if (e.target === passwordModal) {
    passwordModal.classList.add("hidden");
  }
});

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (newPassword !== confirmPassword) {
    alert("New passwords do not match.");
    return;
  }

  try {
    await api.auth.changePassword(currentPassword, newPassword);

    alert("Password updated successfully!");
    passwordModal.classList.add("hidden");
    passwordForm.reset();
  } catch (err) {
    alert("Password update failed: " + err.message);
  }
});


/* ----------------------------------------
   TWO-FACTOR AUTH
---------------------------------------- */
document.getElementById("toggle2FA").addEventListener("click", async () => {
  try {
    const { status } = await api.auth.toggle2FA();
    stats.twoFA.innerText = status ? "Enabled" : "Disabled";
    alert(`Two-factor authentication ${status ? "enabled" : "disabled"}.`);
  } catch (err) {
    alert("Could not update Two-Factor Authentication.");
  }
});

/* ----------------------------------------
   SIGN OUT ALL SESSIONS
---------------------------------------- */
document.getElementById("signOutAllBtn").addEventListener("click", async () => {
  if (!confirm("Sign out all devices?")) return;

  try {
    await api.auth.signOutAll();
    alert("All sessions have been signed out.");
    window.location.href = "login.html";
  } catch (err) {
    alert("Failed to sign out all sessions: " + err.message);
  }
});

/* ----------------------------------------
   LOGOUT (from profile section)
---------------------------------------- */
const logoutBtn = document.getElementById("logoutFromProfile");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await api.auth.logout();
    window.location.href = "login.html";
  });
}

/* ----------------------------------------
   INIT
---------------------------------------- */
document.addEventListener("DOMContentLoaded", loadUserProfile);
form.addEventListener("submit", saveProfile);
editBtn.addEventListener("click", showForm);
cancelBtn.addEventListener("click", hideForm);
