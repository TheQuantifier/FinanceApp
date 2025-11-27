// scripts/profile.js
// Profile page with real API integration
// Loads authenticated user info + allows editing it

import { api } from "./api.js";

(function () {
  const toggleBtn = document.getElementById("toggleEditBtn");
  const editBtn = document.getElementById("editProfileBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const form = document.getElementById("editForm");
  const view = document.getElementById("detailsView");

  // Read-only UI fields
  const f = {
    fullName: document.getElementById("detailFullName"),
    preferred: document.getElementById("detailPreferred"),
    email: document.getElementById("profileEmail"),
    phone: document.getElementById("profilePhone"),
    bio: document.getElementById("detailBio"),
  };

  // Form fields
  const input = {
    fullName: document.getElementById("inputFullName"),
    preferred: document.getElementById("inputPreferred"),
    email: document.getElementById("inputEmail"),
    phone: document.getElementById("inputPhone"),
    bio: document.getElementById("inputBio"),
  };

  // -------------------------------
  // Show / hide form
  // -------------------------------
  function showForm() {
    form.hidden = false;
    view.hidden = true;
    toggleBtn?.setAttribute("aria-expanded", "true");
  }

  function hideForm() {
    form.hidden = true;
    view.hidden = false;
    toggleBtn?.setAttribute("aria-expanded", "false");
  }

  toggleBtn?.addEventListener("click", () => {
    form.hidden ? showForm() : hideForm();
  });

  editBtn?.addEventListener("click", showForm);
  cancelBtn?.addEventListener("click", hideForm);

  // -------------------------------
  // Load currently logged-in user
  // -------------------------------
  async function loadUser() {
    try {
      const { user } = await api.auth.me(); // GET /auth/me

      // Read-only fields
      f.fullName.textContent = user.name || "—";
      f.preferred.textContent = user.preferredName || "—";
      f.email.textContent = user.email || "—";
      f.phone.textContent = user.phone || "—";
      f.bio.textContent = user.bio || "—";

      // Form fields
      input.fullName.value = user.name || "";
      input.preferred.value = user.preferredName || "";
      input.email.value = user.email || "";
      input.phone.value = user.phone || "";
      input.bio.value = user.bio || "";

    } catch (err) {
      console.error("Failed to load profile:", err);
      alert("You must be logged in to view your profile.");
      window.location.href = "login.html";
    }
  }

  // -------------------------------
  // SUBMIT — Update profile
  // -------------------------------
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: input.fullName.value.trim(),
      preferredName: input.preferred.value.trim(),
      email: input.email.value.trim(),
      phone: input.phone.value.trim(),
      bio: input.bio.value.trim(),
    };

    try {
      // PUT /auth/me (handled in backend)
      const { user } = await api.auth.updateProfile(payload);

      // Update read-only view
      f.fullName.textContent = user.name || "—";
      f.preferred.textContent = user.preferredName || "—";
      f.email.textContent = user.email || "—";
      f.phone.textContent = user.phone || "—";
      f.bio.textContent = user.bio || "—";

      hideForm();

    } catch (err) {
      console.error(err);
      alert("Update failed: " + err.message);
    }
  });

  // -------------------------------
  // Copy profile link
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
  // Init
  // -------------------------------
  loadUser();
})();