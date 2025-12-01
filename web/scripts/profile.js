import { api } from "./api.js";

// -------------------------------
// Load Profile on Page Load
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
});

// -------------------------------
// Load User Profile From Backend
// -------------------------------
async function loadUserProfile() {
  try {
    const { user } = await api.auth.me();

    // -------------------------------
    // Populate SUMMARY section
    // -------------------------------
    document.getElementById("summary-username").innerText = user.username || "—";
    document.getElementById("summary-email").innerText = user.email || "—";
    document.getElementById("summary-role").innerText = user.role || "—";
    document.getElementById("summary-location").innerText = user.location || "—";

    // -------------------------------
    // Populate FORM fields
    // -------------------------------
    document.getElementById("username").value = user.username || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("location").value = user.location || "";
    document.getElementById("createdAt").value = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : "";
    document.getElementById("fullName").value = user.fullName || "";
    document.getElementById("role").value = user.role || "";
    document.getElementById("phoneNumber").value = user.phoneNumber || "";
    document.getElementById("bio").value = user.bio || "";

  } catch (err) {
    console.error("Error loading user:", err);
    alert("You must be logged in.");
    window.location.href = "login.html";
  }
}

// -------------------------------
// Save / Update Profile
// -------------------------------
async function saveProfile() {
  const updates = {
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("email").value.trim(),
    location: document.getElementById("location").value.trim(),
    fullName: document.getElementById("fullName").value.trim(),
    role: document.getElementById("role").value.trim(),
    phoneNumber: document.getElementById("phoneNumber").value.trim(),
    bio: document.getElementById("bio").value.trim(),
  };

  try {
    const { user } = await api.auth.updateProfile(updates);

    // Update summary instantly
    document.getElementById("summary-username").innerText = user.username;
    document.getElementById("summary-email").innerText = user.email;
    document.getElementById("summary-role").innerText = user.role;
    document.getElementById("summary-location").innerText = user.location;

    alert("Profile updated successfully.");

  } catch (err) {
    console.error("Update failed:", err);
    alert("Update failed: " + err.message);
  }
}

// Make saveProfile() available to HTML button
window.saveProfile = saveProfile;