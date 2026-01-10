// scripts/settings.js
import { api } from "./api.js";

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // ===============================
  // ELEMENTS
  // ===============================
  const els = {
    toggleTheme: $("#toggleDarkMode"),

    currency: $("#currencySelect"),
    numberFormat: $("#numberFormatSelect"),
    timezone: $("#timezoneSelect"),
    dashboardView: $("#dashboardViewSelect"),
    language: $("#languageSelect"),

    notifEmail: $("#notif_email"),
    notifSms: $("#notif_sms"),

    save: $("#saveSettingsBtn"),
    status: $("#settingsStatus"),

    deleteBtn: $("#deleteAccountBtn"),
    deleteModal: $("#deleteAccountModal"),
    deleteConfirm: $("#deleteConfirmInput"),
    deleteConfirmBtn: $("#confirmDeleteAccountBtn"),
    deleteCancelBtn: $("#cancelDeleteAccountBtn"),
    deleteStatus: $("#deleteAccountStatus"),
  };

  // ===============================
  // STATUS HELPERS
  // ===============================
  const showStatus = (el, msg, kind = "ok") => {
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.classList.toggle("is-ok", kind === "ok");
    el.classList.toggle("is-error", kind === "error");
  };

  const clearStatusSoon = (el, ms = 2200) => {
    if (!el) return;
    window.setTimeout(() => {
      el.style.display = "none";
      el.textContent = "";
      el.classList.remove("is-ok", "is-error");
    }, ms);
  };

  // ===============================
  // THEME
  // ===============================
  const currentTheme = () => document.documentElement.getAttribute("data-theme") || "light";

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  };

  const updateThemeButtonLabel = () => {
    if (!els.toggleTheme) return;
    els.toggleTheme.textContent = currentTheme() === "dark" ? "Switch to Light" : "Switch to Dark";
  };

  const initTheme = () => {
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);
    updateThemeButtonLabel();
  };

  // ===============================
  // DEVICE DEFAULTS (first run)
  // ===============================
  const detectDeviceCurrency = () => {
    try {
      const c = Intl.NumberFormat().resolvedOptions().currency;
      return c || "USD";
    } catch {
      return "USD";
    }
  };

  const detectNumberFormat = () => {
    try {
      const formatted = Intl.NumberFormat().format(1234.56);
      return formatted.includes(",") && formatted.includes(".") ? "US" : "EU";
    } catch {
      return "US";
    }
  };

  const detectDeviceTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  };

  const detectDeviceLocale = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
    } catch {
      return "en-US";
    }
  };

  // ===============================
  // LOAD / SAVE SETTINGS
  // ===============================
  const ensureFirstRunDefaults = () => {
    // If userSettings exists (legacy), migrate minimally
    const legacy = localStorage.getItem("userSettings");

    const hasAnyNewKey =
      localStorage.getItem("settings_currency") ||
      localStorage.getItem("settings_number_format") ||
      localStorage.getItem("settings_timezone") ||
      localStorage.getItem("settings_language") ||
      localStorage.getItem("settings_dashboard_view");

    if (!hasAnyNewKey) {
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed?.currency) localStorage.setItem("settings_currency", parsed.currency);
          if (parsed?.numberFormat) localStorage.setItem("settings_number_format", parsed.numberFormat);
          if (parsed?.timezone) localStorage.setItem("settings_timezone", parsed.timezone);
          if (parsed?.language) localStorage.setItem("settings_language", parsed.language);
          if (parsed?.dashboardView) localStorage.setItem("settings_dashboard_view", parsed.dashboardView);
          if (typeof parsed?.notifEmail === "boolean") localStorage.setItem("settings_notif_email", String(parsed.notifEmail));
          if (typeof parsed?.notifSMS === "boolean") localStorage.setItem("settings_notif_sms", String(parsed.notifSMS));
          if (!parsed?.numberFormat && !localStorage.getItem("settings_number_format")) {
            localStorage.setItem("settings_number_format", "US");
          }
          if (!parsed?.timezone && !localStorage.getItem("settings_timezone")) {
            localStorage.setItem("settings_timezone", "America/New_York");
          }
        } catch {
          // ignore
        }
      } else {
        // First run defaults
        localStorage.setItem("settings_currency", detectDeviceCurrency());
        localStorage.setItem("settings_number_format", "US");
        localStorage.setItem("settings_timezone", "America/New_York");
        localStorage.setItem("settings_language", "English");
        localStorage.setItem("settings_dashboard_view", "Monthly");
        localStorage.setItem("settings_notif_email", "false");
        localStorage.setItem("settings_notif_sms", "false");
        // optional helpful keys
        localStorage.setItem("settings_locale", detectDeviceLocale());
      }
    }
  };

  const loadSettingsIntoUI = () => {
    const savedCurrency = localStorage.getItem("settings_currency");
    const savedNumFmt = localStorage.getItem("settings_number_format");
    const savedTz = localStorage.getItem("settings_timezone");
    const savedLang = localStorage.getItem("settings_language");
    const savedDash = localStorage.getItem("settings_dashboard_view");

    if (els.currency && savedCurrency) els.currency.value = savedCurrency;
    if (els.numberFormat && savedNumFmt) els.numberFormat.value = savedNumFmt;
    if (els.timezone && savedTz) els.timezone.value = savedTz;
    if (els.language && savedLang) els.language.value = savedLang;
    if (els.dashboardView && savedDash) els.dashboardView.value = savedDash;

    if (els.notifEmail) els.notifEmail.checked = localStorage.getItem("settings_notif_email") === "true";
    if (els.notifSms) els.notifSms.checked = localStorage.getItem("settings_notif_sms") === "true";

    updateThemeButtonLabel();
  };

  const saveSettings = async () => {
    if (els.save) {
      els.save.disabled = true;
      els.save.textContent = "Saving…";
    }

    showStatus(els.status, "Saving settings…");

    try {
      if (els.currency) localStorage.setItem("settings_currency", els.currency.value);
      if (els.numberFormat) localStorage.setItem("settings_number_format", els.numberFormat.value);
      if (els.timezone) localStorage.setItem("settings_timezone", els.timezone.value);
      if (els.language) localStorage.setItem("settings_language", els.language.value);
      if (els.dashboardView) localStorage.setItem("settings_dashboard_view", els.dashboardView.value);

      if (els.notifEmail) localStorage.setItem("settings_notif_email", String(els.notifEmail.checked));
      if (els.notifSms) localStorage.setItem("settings_notif_sms", String(els.notifSms.checked));

      // legacy convenience key used elsewhere
      if (els.dashboardView) localStorage.setItem("defaultDashboardView", els.dashboardView.value);

      // Optional backend persistence if your API supports it (guarded)
      const payload = {
        currency: els.currency?.value,
        numberFormat: els.numberFormat?.value,
        timezone: els.timezone?.value,
        language: els.language?.value,
        dashboardView: els.dashboardView?.value,
        notifications: {
          email: els.notifEmail?.checked,
          sms: els.notifSms?.checked,
        },
      };

      if (api?.settings?.save) {
        await api.settings.save(payload);
      }

      showStatus(els.status, "Settings saved.", "ok");
      clearStatusSoon(els.status, 2000);
    } catch (err) {
      console.error(err);
      showStatus(els.status, "Failed to save settings: " + (err?.message || "Unknown error"), "error");
    } finally {
      if (els.save) {
        els.save.disabled = false;
        els.save.textContent = "Save Settings";
      }
    }
  };

  // ===============================
  // DELETE ACCOUNT MODAL
  // ===============================
  const showModal = (modal) => modal?.classList.remove("hidden");
  const hideModal = (modal) => modal?.classList.add("hidden");

  const openDeleteModal = () => {
    if (!els.deleteModal) return;
    if (els.deleteConfirm) els.deleteConfirm.value = "";
    if (els.deleteStatus) {
      els.deleteStatus.style.display = "none";
      els.deleteStatus.textContent = "";
      els.deleteStatus.classList.remove("is-ok", "is-error");
    }
    showModal(els.deleteModal);
    els.deleteConfirm?.focus?.();
  };

  const closeDeleteModal = () => hideModal(els.deleteModal);

  const performDeleteAccount = async () => {
    const text = (els.deleteConfirm?.value || "").trim();
    if (text !== "DELETE") {
      showStatus(els.deleteStatus, "Please type DELETE to confirm.", "error");
      clearStatusSoon(els.deleteStatus, 3000);
      return;
    }

    if (els.deleteConfirmBtn) {
      els.deleteConfirmBtn.disabled = true;
      els.deleteConfirmBtn.textContent = "Deleting…";
    }

    showStatus(els.deleteStatus, "Deleting account…");

    try {
      // Guarded backend call(s)
      if (api?.auth?.deleteAccount) {
        await api.auth.deleteAccount();
      } else if (api?.users?.deleteMe) {
        await api.users.deleteMe();
      } else if (api?.account?.delete) {
        await api.account.delete();
      } else {
        throw new Error("Delete endpoint not available yet.");
      }

      showStatus(els.deleteStatus, "Account deleted. Redirecting…", "ok");

      // Clear any legacy client-side auth artifacts (new system uses cookies)
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.setTimeout(() => {
        window.location.href = "/login.html";
      }, 900);
    } catch (err) {
      console.error(err);
      showStatus(els.deleteStatus, "Delete failed: " + (err?.message || "Unknown error"), "error");
    } finally {
      if (els.deleteConfirmBtn) {
        els.deleteConfirmBtn.disabled = false;
        els.deleteConfirmBtn.textContent = "Delete Account";
      }
    }
  };

  // ===============================
  // WIRE EVENTS
  // ===============================
  const wire = () => {
    els.toggleTheme?.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      updateThemeButtonLabel();
    });

    els.save?.addEventListener("click", saveSettings);

    // Delete account flow
    els.deleteBtn?.addEventListener("click", openDeleteModal);
    els.deleteCancelBtn?.addEventListener("click", closeDeleteModal);
    els.deleteConfirmBtn?.addEventListener("click", performDeleteAccount);

    els.deleteModal?.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) closeDeleteModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.deleteModal && !els.deleteModal.classList.contains("hidden")) {
        closeDeleteModal();
      }
    });
  };

  // ===============================
  // INIT
  // ===============================
  document.addEventListener("DOMContentLoaded", () => {
    ensureFirstRunDefaults();
    initTheme();
    loadSettingsIntoUI();
    wire();
  });
})();
