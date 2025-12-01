// scripts/profile.js
import { api } from "./api.js";

(function () {
  // -------------------------------
  // ELEMENTS
  // -------------------------------
  const heroEditBtn = document.getElementById("editProfileBtn");
  const detailsEditBtn = document.getElementById("toggleEditBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const form = document.getElementById("editForm");
  const view = document.getElementById("detailsView");

  // Read-only UI fields
  const f = {
    fullName: document.getElementById("detail_fullName"),
    role: document.getElementById("detail_role"),
    email: document.getElementById("detail_email"),
    phoneNumber: document.getElementById("detail_phoneNumber"),
    location: document.getElementById("detail_location"),
    username: document.getElementById("detail_username"),
    bio: document.getElementById("detail_bio"),
  };

  // Form fields
  const input = {
    fullName: document.getElementById("input_fullName"),
    role: document.getElementById("input_role"),
    email: document.getElementById("input_email"),
    phoneNumber: document.getElementById("input_phoneNumber"),
    location: document.getElementById("input_location"),
    username: document.getElementById("input_username"),
    bio: document.getElementById("input_bio"),
  };

  // -------------------------------
  // SHOW / HIDE FORM
  // -------------------------------
  function showForm() {
    form.hidden = false;
    view.hidden = true;
    detailsEditBtn?.setAttribute("aria-expanded", "true");
  }

  function hideForm() {
    form.hidden = true;
    view.hidden = false;
    detailsEditBtn?.setAttribute("aria-expanded", "false");
  }

  heroEditBtn?.addEventListener("click", showForm);
  detailsEditBtn?.addEventListener("click", () => {
    form.hidden ? showForm() : hideForm();
  });
  cancelBtn?.addEventListener("click", hideForm);

  // -------------------------------
  // LOAD USER PROFILE
  // -------------------------------
  async function loadUserProfile() {
    try {
      const { user } = await api.auth.me();

      // SUMMARY CARD
      document.getElementById("fullName").textContent = user.fullName || "—";
      document.getElementById("username").textContent = "@" + (user.username || "—");
      document.getElementById("email").textContent = user.email || "—";
      document.getElementById("phoneNumber").textContent = user.phoneNumber || "—";
      document.getElementById("location").textContent = user.location || "—";
      document.getElementById("role").textContent = user.role || "—";
      document.getElementById("createdAt").textContent = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "—";

      // DETAILS VIEW
      f.fullName.textContent = user.fullName || "—";
      f.role.textContent = user.role || "—";
      f.email.textContent = user.email || "—";
      f.phoneNumber.textContent = user.phoneNumber || "—";
      f.location.textContent = user.location || "—";
      f.username.textContent = user.username || "—";
      f.bio.textContent = user.bio || "—";

      // FORM FIELDS
      input.fullName.value = user.fullName || "";
      input.role.value = user.role || "";
      input.email.value = user.email || "";
      input.phoneNumber.value = user.phoneNumber || "";
      input.location.value = user.location || "";
      input.username.value = user.username || "";
      input.bio.value = user.bio || "";

    } catch (err) {
      console.error("Failed to load profile:", err);
      alert("You must be logged in.");
      window.location.href = "login.html";
    }
  }

  // -------------------------------
  // SAVE PROFILE
  // -------------------------------
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const updates = {
      fullName: input.fullName.value.trim(),
      role: input.role.value.trim(),
      email: input.email.value.trim(),
      phoneNumber: input.phoneNumber.value.trim(),
      location: input.location.value.trim(),
      username: input.username.value.trim(),
      bio: input.bio.value.trim(),
    };

    try {
      await api.auth.updateProfile(updates);
      await loadUserProfile();
      hideForm();
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Update failed:", err);
      alert("Update failed: " + err.message);
    }
  });

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
  // INIT
  // -------------------------------
  loadUserProfile();
})();
