// scripts/profile.js
import { api } from "./api.js";

(function () {
  const editBtn = document.getElementById("editProfileBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const form = document.getElementById("editForm");
  const view = document.getElementById("detailsView");

  // VIEW FIELDS (exact names)
  const fields = {
    username: document.getElementById("username"),
    email: document.getElementById("email"),
    location: document.getElementById("location"),
    createdAt: document.getElementById("createdAt"),
    fullName: document.getElementById("fullName"),
    role: document.getElementById("role"),
    phoneNumber: document.getElementById("phoneNumber"),
    bio: document.getElementById("bio"),
  };

  // INPUT FIELDS (matching backend names)
  const input = {
    username: document.getElementById("input_username"),
    email: document.getElementById("input_email"),
    location: document.getElementById("input_location"),
    fullName: document.getElementById("input_fullName"),
    role: document.getElementById("input_role"),
    phoneNumber: document.getElementById("input_phoneNumber"),
    bio: document.getElementById("input_bio"),
  };

  const safe = (v) => (v && v !== "" ? v : "—");

  function showForm() {
    form.hidden = false;
    view.hidden = true;
  }

  function hideForm() {
    form.hidden = true;
    view.hidden = false;
  }

  editBtn.addEventListener("click", showForm);
  cancelBtn.addEventListener("click", hideForm);

  // LOAD USER
  async function loadUser() {
    try {
      const { user } = await api.auth.me();

      // Fill VIEW
      fields.username.textContent = safe(user.username);
      fields.email.textContent = safe(user.email);
      fields.location.textContent = safe(user.location);
      fields.createdAt.textContent = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "—";
      fields.fullName.textContent = safe(user.fullName);
      fields.role.textContent = safe(user.role);
      fields.phoneNumber.textContent = safe(user.phoneNumber);
      fields.bio.textContent = safe(user.bio);

      // Fill FORM
      input.username.value = user.username || "";
      input.email.value = user.email || "";
      input.location.value = user.location || "";
      input.fullName.value = user.fullName || "";
      input.role.value = user.role || "";
      input.phoneNumber.value = user.phoneNumber || "";
      input.bio.value = user.bio || "";

    } catch (err) {
      alert("You must be logged in.");
      window.location.href = "login.html";
    }
  }

  // SAVE UPDATES
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      username: input.username.value.trim(),
      email: input.email.value.trim(),
      location: input.location.value.trim(),
      fullName: input.fullName.value.trim(),
      role: input.role.value.trim(),
      phoneNumber: input.phoneNumber.value.trim(),
      bio: input.bio.value.trim(),
    };

    try {
      const { user } = await api.auth.updateProfile(payload);

      // Update view
      fields.username.textContent = user.username;
      fields.email.textContent = user.email;
      fields.location.textContent = user.location;
      fields.fullName.textContent = user.fullName;
      fields.role.textContent = user.role;
      fields.phoneNumber.textContent = user.phoneNumber;
      fields.bio.textContent = user.bio;

      hideForm();

    } catch (err) {
      alert("Update failed: " + err.message);
    }
  });

  loadUser();
})();
