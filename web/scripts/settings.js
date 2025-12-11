import { api } from "./api.js";

console.log("Settings page loaded.");

// ======================================
// DARK MODE TOGGLE (FIXED)
// ======================================
const toggleDarkModeBtn = document.getElementById("toggleDarkMode");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  toggleDarkModeBtn.textContent =
    theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";
}

// Load saved theme
const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

// Theme toggle
toggleDarkModeBtn?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
});

// --------------------------------------
// NOTIFICATION TOGGLES
// --------------------------------------
const notifEmail = document.getElementById("notif_email");
const notifSMS = document.getElementById("notif_sms");

// --------------------------------------
// FORMAT & SETTINGS
// --------------------------------------
const dateFormatSelect = document.getElementById("dateFormat");
const currencySelect = document.getElementById("currencySelect");
const numberFormatSelect = document.getElementById("numberFormatSelect");
const timezoneSelect = document.getElementById("timezoneSelect");
const dashboardViewSelect = document.getElementById("dashboardViewSelect");
const languageSelect = document.querySelector(".profile-grid select");

// Detect device timezone
const userDeviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// --------------------------------------
// LOAD SAVED SETTINGS (default dashboardView = Monthly)
// --------------------------------------
const savedSettings = JSON.parse(localStorage.getItem("userSettings")) || {
  dateFormat: "MM/DD/YYYY",
  currency: "USD",
  numberFormat: "1,234.56",
  timezone: userDeviceTimezone,
  dashboardView: "Monthly",
  language: "English",
  notifEmail: false,
  notifSMS: false,
};

// --------------------------------------
// APPLY SAVED SETTINGS TO INPUTS
// --------------------------------------
if (dateFormatSelect) dateFormatSelect.value = savedSettings.dateFormat;
if (currencySelect) currencySelect.value = savedSettings.currency;
if (numberFormatSelect) numberFormatSelect.value = savedSettings.numberFormat;

if (timezoneSelect) timezoneSelect.value = savedSettings.timezone || userDeviceTimezone;
if (dashboardViewSelect) dashboardViewSelect.value = savedSettings.dashboardView;
if (languageSelect) languageSelect.value = savedSettings.language;

if (notifEmail) notifEmail.checked = savedSettings.notifEmail;
if (notifSMS) notifSMS.checked = savedSettings.notifSMS;

// --------------------------------------
// SAVE SETTINGS BUTTON
// --------------------------------------
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

saveSettingsBtn.addEventListener("click", () => {
  const newSettings = {
    dateFormat: dateFormatSelect?.value || savedSettings.dateFormat,
    currency: currencySelect?.value || savedSettings.currency,
    numberFormat: numberFormatSelect?.value || savedSettings.numberFormat,
    timezone: timezoneSelect?.value || userDeviceTimezone,
    dashboardView: dashboardViewSelect?.value || "Monthly",
    language: languageSelect?.value || savedSettings.language,
    notifEmail: notifEmail?.checked || false,
    notifSMS: notifSMS?.checked || false,
  };

  // Save to localStorage
  localStorage.setItem("userSettings", JSON.stringify(newSettings));

  // Save default dashboard view separately for quick access
  localStorage.setItem("defaultDashboardView", newSettings.dashboardView);

  alert("Settings saved!");

  // Apply immediately
  applyFormats(newSettings);
});

// --------------------------------------
// APPLY FORMATS TO PAGE
// --------------------------------------
function applyFormats(settings) {
  document.querySelectorAll(".date-field").forEach((el) => {
    const date = new Date(el.dataset.timestamp);
    el.textContent = formatDate(date, settings.dateFormat);
  });

  document.querySelectorAll(".currency-field").forEach((el) => {
    const value = parseFloat(el.dataset.value);
    el.textContent = formatCurrency(value, settings.currency);
  });

  document.querySelectorAll(".number-field").forEach((el) => {
    const value = parseFloat(el.dataset.value);
    el.textContent = formatNumber(value, settings.numberFormat);
  });
}

function formatDate(date, format) {
  return date.toLocaleDateString(); 
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function formatNumber(value, style) {
  return new Intl.NumberFormat("en-US").format(value);
}

// --------------------------------------
// DELETE ACCOUNT
// --------------------------------------
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", async () => {
    const confirm1 = confirm("Are you sure you want to delete your account?");
    if (!confirm1) return;

    const confirm2 = confirm(
      "⚠️ This action is permanent.\n\nYour profile, all records, receipts, and uploads will be permanently deleted.\n\nContinue?"
    );
    if (!confirm2) return;

    try {
      await api.auth.deleteAccount();
      alert("Your account has been permanently deleted.");
      window.location.href = "login.html";
    } catch (err) {
      alert("Failed to delete account: " + err.message);
    }
  });
}
