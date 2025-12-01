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
    // SUMMARY CARD
    // -------------------------------
    document.getElementById("fullName").innerText = user.fullName || "—";
    document.getElementById("username").innerText = "@" + (user.username || "—");
    document.getElementById("email").innerText = user.email || "—";
    document.getElementById("phoneNumber").innerText = user.phoneNumber || "—";
    document.getElementById("location").innerText = user.location || "—";
    document.getElementById("role").innerText = user.role || "—";
    document.getElementById("createdAt").innerText = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : "—";

    // -------------------------------
    // DETAILS VIEW
    // -------------------------------
    document.getElementById("detail_fullName").innerText = user.fullName || "—";
    document.getElementById("detail_role").innerText = user.role || "—";
    document.getElementById("detail_email").innerText = user.email || "—";
    document.getElementById("detail_phoneNumber").innerText = user.phoneNumber || "—";
    document.getElementById("detail_location").innerText = user.location || "—";
    document.getElementById("detail_username").innerText = user.username || "—";
    document.getElementById("detail_bio").innerText = user.bio || "—";

    // -------------------------------
    // FORM FIELDS
    // -------------------------------
    document.getElementById("input_fullName").value = user.fullName || "";
    document.getElementById("input_role").value = user.role || "";
    document.getElementById("input_email").value = user.email || "";
    document.getElementById("input_phoneNumber").value = user.phoneNumber || "";
    document.getElementById("input_location").value = user.location || "";
    document.getElementById("input_username").value = user.username || "";
    document.getElementById("input_bio").value = user.bio || "";

  } catch (err) {
    console.error("Error loading user:", err);
    alert("You must be logged in.");
    window.location.href = "login.html";
  }
}

// -------------------------------
// Save Profile
// -------------------------------
async function saveProfile() {
  const updates = {
    fullName: document.getElementById("input_fullName").value.trim(),
    role: document.getElementById("input_role").value.trim(),
    email: document.getElementById("input_email").value.trim(),
    phoneNumber: document.getElementById("input_phoneNumber").value.trim(),
    location: document.getElementById("input_location").value.trim(),
    username: document.getElementById("input_username").value.trim(),
    bio: document.getElementById("input_bio").value.trim(),
  };

  try {
    const { user } = await api.auth.updateProfile(updates);

    // Re-render UI
    loadUserProfile();

    alert("Profile updated successfully!");

  } catch (err) {
    console.error("Update failed:", err);
    alert("Update failed: " + err.message);
  }
}

window.saveProfile = saveProfile;