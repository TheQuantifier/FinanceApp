import { api } from "./api.js";

console.log("Settings page loaded.");

// =========================================================
// HELPERS
// =========================================================
function detectDeviceCurrency() {
  try {
    const parts = new Intl.NumberFormat().formatToParts(1.11);
    const currency = Intl.NumberFormat().resolvedOptions().currency;
    return currency || "USD";
  } catch {
    return "USD";
  }
}

function detectNumberFormat() {
  const formatted = Intl.NumberFormat().format(1234.56);
  return formatted.includes(",") && formatted.includes(".") ? "US" : "EU";
}

function detectDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function detectDeviceLocale() {
  return Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
}



// =========================================================
// DARK MODE
// =========================================================
const toggleDarkModeBtn = document.getElementById("toggleDarkMode");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  toggleDarkModeBtn.textContent =
    theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";
}

const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

toggleDarkModeBtn?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
});

// =========================================================
// SETTINGS ELEMENTS
// =========================================================
const currencySelect = document.getElementById("currencySelect");
const numberFormatSelect = document.getElementById("numberFormatSelect");
const timezoneSelect = document.getElementById("timezoneSelect");
const dashboardViewSelect = document.getElementById("dashboardViewSelect");
const languageSelect = document.getElementById("languageSelect");

const notifEmail = document.getElementById("notif_email");
const notifSMS = document.getElementById("notif_sms");

// =========================================================
// LOAD SAVED SETTINGS — WITH AUTO-DETECT FIRST RUN
// =========================================================
const deviceSettings = {
  currency: detectDeviceCurrency(),
  numberFormat: detectNumberFormat(),
  timezone: detectDeviceTimezone(),
  locale: detectDeviceLocale(),
};

let savedSettings = JSON.parse(localStorage.getItem("userSettings"));

if (!savedSettings) {
  // First app run → Auto-save device settings
  savedSettings = {
    currency: deviceSettings.currency,
    numberFormat: deviceSettings.numberFormat,
    timezone: deviceSettings.timezone,
    dashboardView: "Monthly",
    language: "English",
    notifEmail: false,
    notifSMS: false,
  };

  localStorage.setItem("userSettings", JSON.stringify(savedSettings));
}

// =========================================================
// APPLY SAVED SETTINGS TO UI
// =========================================================
if (currencySelect) currencySelect.value = savedSettings.currency;
if (numberFormatSelect) numberFormatSelect.value = savedSettings.numberFormat;
if (timezoneSelect) timezoneSelect.value = savedSettings.timezone;
if (dashboardViewSelect) dashboardViewSelect.value = savedSettings.dashboardView;
if (languageSelect) languageSelect.value = savedSettings.language;

if (notifEmail) notifEmail.checked = savedSettings.notifEmail;
if (notifSMS) notifSMS.checked = savedSettings.notifSMS;

// =========================================================
// SAVE SETTINGS
// =========================================================
document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  const updated = {
    currency: currencySelect.value,
    numberFormat: numberFormatSelect.value,
    timezone: timezoneSelect.value,
    dashboardView: dashboardViewSelect.value,
    language: languageSelect.value,
    notifEmail: notifEmail.checked,
    notifSMS: notifSMS.checked,
  };

  localStorage.setItem("userSettings", JSON.stringify(updated));
  localStorage.setItem("defaultDashboardView", updated.dashboardView);
  localStorage.setItem("settings_currency", updated.currency);

  alert("Settings saved!");

  applyFormats(updated);
});

// =========================================================
// FORMATTING ENGINE (Global utility)
// =========================================================
function applyFormats(settings) {
  // Dates
  document.querySelectorAll(".date-field").forEach((el) => {
    const timestamp = el.dataset.timestamp;
    const date = new Date(timestamp);
    el.textContent = formatDate(date, settings.timezone);
  });

  // Currency
  document.querySelectorAll(".currency-field").forEach((el) => {
    const originalValue = parseFloat(el.dataset.value);
    const originalCurrency = el.dataset.currency || "USD"; // default
  
    // Convert before formatting
    const converted = convertCurrency(
      originalValue,
      originalCurrency,
      settings.currency
    );
  
    el.textContent = formatCurrency(converted, settings.currency);
  });

  // Numbers
  document.querySelectorAll(".number-field").forEach((el) => {
    const value = parseFloat(el.dataset.value);
    el.textContent = formatNumber(value, settings.numberFormat);
  });
}

function formatDate(date, timezone) {
  return date.toLocaleDateString(undefined, { timeZone: timezone });
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

function formatNumber(value, format) {
  if (format === "US") return new Intl.NumberFormat("en-US").format(value);
  if (format === "EU") return new Intl.NumberFormat("de-DE").format(value);
  return value;
}

// =========================================================
// CURRENCY CONVERSION ENGINE
// =========================================================

// Simple static conversion table (can be replaced with live API later)
const FX_RATES = {
  USD: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.1, CAD: 1.37, AUD: 1.55, JPY: 148 },
  EUR: { USD: 1.09, EUR: 1, GBP: 0.86, INR: 90.4, CAD: 1.49, AUD: 1.69, JPY: 161 },
  GBP: { USD: 1.26, EUR: 1.16, GBP: 1, INR: 105.5, CAD: 1.73, AUD: 1.96, JPY: 187 },
};

function convertCurrency(amount, fromCurrency, toCurrency) {
  if (!FX_RATES[fromCurrency] || !FX_RATES[fromCurrency][toCurrency]) {
    console.warn("Missing FX rate:", fromCurrency, "→", toCurrency);
    return amount; // fallback: no conversion
  }

  return amount * FX_RATES[fromCurrency][toCurrency];
}


// =========================================================
// DELETE ACCOUNT
// =========================================================
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
