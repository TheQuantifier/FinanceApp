import { api } from "./api.js";

/* --------------------------------------------------
   STUB FUNCTIONS FOR UNIMPLEMENTED AUTH FEATURES
-------------------------------------------------- */
if (!api.auth.toggle2FA) {
  api.auth.toggle2FA = async () => ({
    status: false,
    message: "Two-factor authentication is not implemented yet.",
  });
}

if (!api.auth.signOutAll) {
  api.auth.signOutAll = async () => ({
    status: false,
    message: "Sign-out-from-all-devices is not implemented yet.",
  });
}

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

// AVATAR ELEMENTS
const changeAvatarBtn = document.getElementById("changeAvatarBtn");
const avatarBlock = document.querySelector(".avatar-block .avatar");
let avatarFile = null;

/* ----------------------------------------
   DARK MODE SUPPORT
---------------------------------------- */
const themeToggleBtn = document.getElementById("toggleDarkMode");

const setTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
};

// Initialize theme
setTheme(localStorage.getItem("theme") || "light");

// Optional toggle button
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "dark" : "light");
  });
}

/* ----------------------------------------
   EDIT PROFILE FORM
---------------------------------------- */
const showForm = () => {
  form.hidden = false;
  editBtn.disabled = true;
};

const hideForm = () => {
  form.hidden = true;
  editBtn.disabled = false;
};

/* ----------------------------------------
   LOAD USER PROFILE
---------------------------------------- */
async function loadUserProfile() {
  try {
    const { user } = await api.auth.me();

    f.fullName.innerText = user.fullName || user.username || "—";
    f.username.innerText = "@" + (user.username || "—");
    f.email.innerText = user.email || "—";
    f.phoneNumber.innerText = user.phoneNumber || "—";
    f.location.innerText = user.location || "—";
    f.role.innerText = user.role || "—";
    f.createdAt.innerText = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : "—";
    f.bio.innerText = user.bio || "—";

    stats.lastLogin.innerText = "Not available";
    stats.twoFA.innerText = "Not available";
    stats.uploads.innerText = "Not available";

    Object.keys(input).forEach((k) => {
      input[k].value = user[k] || "";
    });

    // Load avatar if exists
    if (user.avatarUrl) {
      avatarBlock.style.backgroundImage = `url(${user.avatarUrl})`;
      avatarBlock.textContent = "";
    } else {
      avatarBlock.style.backgroundImage = "";
      avatarBlock.textContent = "";
    }
  } catch (err) {
    alert("You must be logged in.");
    window.location.href = "login.html";
  }
}

/* ----------------------------------------
   SAVE PROFILE
---------------------------------------- */
async function saveProfile(e) {
  e.preventDefault();
  const updates = {};
  for (const key in input) {
    updates[key] = input[key].value.trim();
  }

  try {
    await api.auth.updateProfile(updates);

    if (avatarFile) {
      await api.auth.uploadAvatar(avatarFile);
      avatarFile = null;
    }

    hideForm();
    await loadUserProfile();
    alert("Profile updated successfully!");
  } catch (err) {
    alert("Update failed: " + err.message);
  }
}

/* ----------------------------------------
   CHANGE AVATAR
---------------------------------------- */
changeAvatarBtn.addEventListener("click", () => {
  const inputFile = document.createElement("input");
  inputFile.type = "file";
  inputFile.accept = "image/*";

  inputFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      avatarBlock.style.backgroundImage = `url(${event.target.result})`;
      avatarBlock.textContent = "";
    };
    reader.readAsDataURL(file);

    avatarFile = file;
  });

  inputFile.click();
});

/* ----------------------------------------
   COPY PROFILE LINK
---------------------------------------- */
document.getElementById("copyProfileLinkBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(location.href);
  alert("Profile link copied!");
});

/* ----------------------------------------
   CHANGE PASSWORD
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
  if (e.target === passwordModal) passwordModal.classList.add("hidden");
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
   TWO-FACTOR AUTH (STUB)
---------------------------------------- */
document.getElementById("toggle2FA").addEventListener("click", async () => {
  try {
    const result = await api.auth.toggle2FA();
    stats.twoFA.innerText = "Not available";
    alert(result.message);
  } catch (err) {
    alert("Could not update Two-Factor Authentication.");
  }
});

/* ----------------------------------------
   SIGN OUT ALL SESSIONS (STUB)
---------------------------------------- */
document.getElementById("signOutAllBtn").addEventListener("click", async () => {
  if (!confirm("Sign out all devices?")) return;
  try {
    const result = await api.auth.signOutAll();
    alert(result.message);
  } catch (err) {
    alert("Failed to sign out all sessions.");
  }
});

/* ----------------------------------------
   INIT
---------------------------------------- */
document.addEventListener("DOMContentLoaded", loadUserProfile);
form.addEventListener("submit", saveProfile);
editBtn.addEventListener("click", showForm);
cancelBtn.addEventListener("click", hideForm);
