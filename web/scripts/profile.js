// -------------------------------
// Load Profile on Page Load
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
});

// -------------------------------
// Load User Profile Data
// -------------------------------
async function loadUserProfile() {
  try {
      const response = await fetch("https://jsonplaceholder.typicode.com/users/1");

      if (!response.ok) {
          throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();

      // ----------------------------------
      // Map API → Our Required Fields
      // ----------------------------------
      const profile = {
          username: data.username || "",
          email: data.email || "",
          location: data.address?.city || "",
          createdAt: "2025-01-01", // Placeholder (API does not include this)
          fullName: data.name || "",
          role: "User", // Placeholder (API does not include this)
          phoneNumber: data.phone || "",
          bio: "This is your profile bio. You can update it later." // Placeholder
      };

      // ----------------------------------
      // Populate Summary Section
      // ----------------------------------
      document.getElementById("summary-username").innerText = profile.username;
      document.getElementById("summary-email").innerText = profile.email;
      document.getElementById("summary-role").innerText = profile.role;
      document.getElementById("summary-location").innerText = profile.location;

      // ----------------------------------
      // Populate Form Fields
      // ----------------------------------
      document.getElementById("username").value = profile.username;
      document.getElementById("email").value = profile.email;
      document.getElementById("location").value = profile.location;
      document.getElementById("createdAt").value = profile.createdAt;
      document.getElementById("fullName").value = profile.fullName;
      document.getElementById("role").value = profile.role;
      document.getElementById("phoneNumber").value = profile.phoneNumber;
      document.getElementById("bio").value = profile.bio;

  } catch (error) {
      console.error("Error loading profile:", error);
  }
}

// -------------------------------
// Save / Update Profile
// -------------------------------
function saveProfile() {
  const updatedProfile = {
      username: document.getElementById("username").value,
      email: document.getElementById("email").value,
      location: document.getElementById("location").value,
      createdAt: document.getElementById("createdAt").value,
      fullName: document.getElementById("fullName").value,
      role: document.getElementById("role").value,
      phoneNumber: document.getElementById("phoneNumber").value,
      bio: document.getElementById("bio").value
  };

  console.log("Updated Profile:", updatedProfile);

  alert("Profile saved (placeholder — no backend connected yet)");
}
