import { api } from "./api.js";

// -------------------------------
// DOM Elements
// -------------------------------
const editBtn = document.getElementById("editProfileBtn");
const cancelBtn = document.getElementById("cancelEditBtn");
const form = document.getElementById("editForm");

// Summary fields
const summaryFields = {
  fullName: document.getElementById("fullName"),
  username: document.getElementById("username"),
  email: document.getElementById("email"),
  phoneNumber: document.getElementById("phoneNumber"),
  location: document.getElementById("location"),
  role: document.getElementById("role"),
  createdAt: document.getElementById("createdAt"),
  bio: document.getElementById("bio"),
};

// Form inputs
const inputFields = {
  fullName: document.getElementById("input_fullName"),
  username: document.getElementById("input_username"),
  email: document.getElementById("input_email"),
  phoneNumber: document.getElementById("input_phoneNumber"),
  location: document.getElementById("input_location"),
  role: document.getElementById("input_role"),
  bio: document.getElementById("input_bio"),
};

// -------------------------------
// Show / Hide Edit Form
// -------------------------------
function showForm() {
  form.hidden = false;
}

function hideForm() {
  form.hidden = true;
}

// -------------------------------
// Load User Profile
// -------------------------------
async function loadUserProfile() {
  try {
    const { user } = await api.auth.me();

    // Update summary card
    summaryFields.fullName.textContent = user.fullName || "—";
    summaryFields.username.textContent = "@" + (user.username || "—");
    summaryFields.email.textContent = user.email || "—";
    summaryFields.phoneNumber.textContent = user.phoneNumber || "—";
    summaryFields.location.textContent = user.location || "—";
    summaryFields.role.textContent = user.role || "—";
    summaryFields.createdAt.textContent = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : "—";
    summaryFields.bio.textContent = user.bio || "—";

    // Populate form fields
    inputFields.fullName.value = user.fullName || "";
    inputFields.username.value = user.username || "";
    inputFields.email.value = user.email || "";
    inputFields.phoneNumber.value = user.phoneNumber || "";
    inputFields.location.value = user.location || "";
    inputFields.role.value = user.role || "";
    inputFields.bio.value = user.bio || "";

  } catch (err) {
    console.error("Error loading user:", err);
    alert("You must be logged in.");
    window.location.href = "login.html";
  }
}

// -------------------------------
// Save Profile
// -------------------------------
async function saveProfile(e) {
  e.preventDefault();

  const updates = {
    fullName: inputFields.fullName.value.trim(),
    username: inputFields.username.value.trim(),
    email: inputFields.email.value.trim(),
    phoneNumber: inputFields.phoneNumber.value.trim(),
    location: inputFields.location.value.trim(),
    role: inputFields.role.value.trim(),
    bio: inputFields.bio.value.trim(),
  };

  try {
    await api.auth.updateProfile(updates);
    hideForm();
    loadUserProfile();
    alert("Profile updated successfully!");
  } catch (err) {
    console.error("Update failed:", err);
    alert("Update failed: " + err.message);
  }
}

// -------------------------------
// Event Listeners
// -------------------------------
editBtn.addEventListener("click", showForm);
cancelBtn.addEventListener("click", hideForm);
form.addEventListener("submit", saveProfile);

// -------------------------------
// Initial Load
// -------------------------------
document.addEventListener("DOMContentLoaded", loadUserProfile);
