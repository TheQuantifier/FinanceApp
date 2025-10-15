/* ===============================================
   Finance App – default.js
   Shared script for all pages.
   Loads header/footer and sets active nav link.
   =============================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadHeaderAndFooter();
});

/**
 * Fetch and inject header & footer, then set active nav link
 */
function loadHeaderAndFooter() {
  // --- Load Header ---
  fetch("components/header.html")
    .then((res) => {
      if (!res.ok) throw new Error("Header not found");
      return res.text();
    })
    .then((html) => {
      document.getElementById("header").innerHTML = html;
      setActiveNavLink();
    })
    .catch((err) => console.error("Header load failed:", err));

  // --- Load Footer ---
  fetch("components/footer.html")
    .then((res) => {
      if (!res.ok) throw new Error("Footer not found");
      return res.text();
    })
    .then((html) => {
      document.getElementById("footer").innerHTML = html;
    })
    .catch((err) => console.error("Footer load failed:", err));
}

/**
 * Highlights the current page in the navigation menu
 */
function setActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll("#header nav a");

  navLinks.forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}