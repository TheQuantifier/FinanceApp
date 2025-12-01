import { api } from "./api.js";

// -------------------------------
// DOM ELEMENTS
// -------------------------------
const editBtn = document.getElementById("editProfileBtn");
const form = document.getElementById("editForm");
const cancelBtn = document.getElementById("cancelEditBtn");

// Read-only summary fields (merged)
const f = {
  fullName: document.getElementById("fullName"),
  username: document.getElementById("username"),
  email: document.getElementById("email"),
  phoneNumber: document.getElementById("phoneNumber"),
  location: document.getElementById("location"),
  role: document.getElementById("role"),
  createdAt: document.getElementById("createdAt"),
  bio: document.getElementById("bio"), // fixed to match HTML
};

// Form inputs
const input = {
  fullName: document.getElementById("input_fullName"),
  username: document.getElementById("input_username"),
  email: document.getElementById("input_email"),
  phoneNumber: document.getElementById("input_phoneNumber"),
  location: document.getElementById("input_location"),
  role: document.getElementById("input_role"),
  bio: document.getElementById("input_bio"),
};

// Stats inside security card
const stats = {
  lastLogin: document.getElementById("stat_lastLogin"),
  twoFA: document.getElementById("stat_2FA"),
  uploads: document.getElementById("stat_uploads"),
};

// -------------------------------
// SHOW / HIDE FORM
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

    // -------------------------------
    // SUMMARY / READ-ONLY
    // -------------------------------
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

    // -------------------------------
    // STATS INSIDE SECURITY CARD
    // -------------------------------
    stats.lastLogin.innerText = user.lastLogin
      ? new Date(user.lastLogin).toLocaleString()
      : "—";
    stats.twoFA.innerText = user.twoFA ? "Enabled" : "Disabled";
    stats.uploads.innerText = user.recordsUploaded ?? "—";

    // -------------------------------
    // FORM INPUTS
    // -------------------------------
    input.fullName.value = user.fullName || "";
    input.username.value = user.username || "";
    input.email.value = user.email || "";
    input.phoneNumber.value = user.phoneNumber || "";
    input.location.value = user.location || "";
    input.role.value = user.role || "";
    input.bio.value = user.bio || "";

  } catch (err) {
    console.error("Error loading user profile:", err);
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
    console.error("Profile update failed:", err);
    alert("Update failed: " + err.message);
  }
}

// -------------------------------
// COPY PROFILE LINK
// -------------------------------
document.getElementById("copyProfileLinkBtn")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    alert("Profile link copied!");
  } catch {
    alert("Could not copy link.");
  }
});

// -------------------------------
// EVENT LISTENERS
// -------------------------------
editBtn.addEventListener("click", showForm);
cancelBtn.addEventListener("click", hideForm);
form.addEventListener("submit", saveProfile);

// -------------------------------
// INIT
// -------------------------------
document.addEventListener("DOMContentLoaded", loadUserProfile);
