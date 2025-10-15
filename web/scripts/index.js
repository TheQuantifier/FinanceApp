/* ===============================================
   Finance App – index.js
   Welcome / Landing page interactions only.
   (No dashboard totals or charts on this page.)
   =============================================== */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Finance App welcome page loaded.");

  // Wire up the CTA button to navigate to Upload
  const ctaBtn = document.querySelector(".cta button");
  if (ctaBtn) {
    ctaBtn.addEventListener("click", () => {
      window.location.href = "upload.html";
    });
  }

  // Optional nicety: smooth-scroll to features if a hash is present (e.g., /index.html#features)
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }
});