(() => {
  const DISMISS = "fashionpur_identity_popup_dismissed_until";
  const ACCOUNT_CONTROL = "#customer_login_link, .fp-mobile-nav a[href^='/account']";
  const host = document.querySelector("fashionpur-identity");
  if (!host) return;

  const endpoint = host.dataset.cartEndpoint;
  const accountUrl = host.dataset.accountUrl;
  const delay = Number(host.dataset.delay || 3000);
  const testPopup = new URLSearchParams(location.search).has("identity_popup_test") || new URLSearchParams(location.search).has("identity_widget_test");
  let cart, requestId, phone, widgetConfig, widgetLoading, widgetInitializationError, resendUntil = 0, resendTimer, storefrontAuthenticated = false;

  const dismissalUntil = () => { try { return Number(localStorage.getItem(DISMISS) || 0); } catch { return 0; } };
  // Draft-theme testing must not require clearing mobile Safari/Chrome storage
  // after a shopper has dismissed the prompt. This query parameter is inert
  // unless explicitly present and is not used by normal shoppers.
  const canPrompt = () => !storefrontAuthenticated && (testPopup || Date.now() >= dismissalUntil());
  const secretFor = (token) => {
    const key = `fashionpur_cart_claim_${token}`;
    let value = localStorage.getItem(key);
    if (!value) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(key, value);
    }
    return value;
  };
  const capture = async () => {
    if (!endpoint) return null;
    const response = await fetch("/cart.js", { credentials: "same-origin" });
    if (!response.ok) return null;
    cart = await response.json();
    if (cart.token) {
      fetch(endpoint, {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json", "x-fashionpur-cart-claim": secretFor(cart.token) },
        body: JSON.stringify(cart), keepalive: true,
      }).catch(() => {});
    }
    return cart;
  };
  const go = (path = "/account/profile") => {
    if (!accountUrl) return;
    const url = new URL(accountUrl, location.origin);
    url.pathname = path;
    url.searchParams.set("return_to", host.dataset.returnTo || location.pathname);
    if (cart?.token) url.searchParams.set("cart_token", cart.token);
    location.assign(url.toString());
  };

  const modal = document.createElement("section");
  modal.className = "fashionpur-otp";
  modal.hidden = true;
  modal.innerHTML = '<div class="fashionpur-otp__panel" role="dialog" aria-modal="true" aria-labelledby="fashionpur-otp-title"><button class="fashionpur-otp__close" type="button" aria-label="Close">×</button><p>FASHIONPUR</p><h2 id="fashionpur-otp-title">Save your bag</h2><p data-copy>Enter your mobile number to save your cart.</p><input class="fashionpur-otp__country" list="fashionpur-otp-countries" aria-label="Search country or dialing code" placeholder="Search country or dialing code" autocomplete="off"><datalist id="fashionpur-otp-countries"><option data-code="IN" value="🇮🇳 India +91"><option data-code="US" value="🇺🇸 United States +1"><option data-code="CA" value="🇨🇦 Canada +1"><option data-code="GB" value="🇬🇧 United Kingdom +44"><option data-code="AE" value="🇦🇪 United Arab Emirates +971"><option data-code="SA" value="🇸🇦 Saudi Arabia +966"><option data-code="QA" value="🇶🇦 Qatar +974"><option data-code="KW" value="🇰🇼 Kuwait +965"><option data-code="BH" value="🇧🇭 Bahrain +973"><option data-code="OM" value="🇴🇲 Oman +968"><option data-code="DE" value="🇩🇪 Germany +49"><option data-code="FR" value="🇫🇷 France +33"><option data-code="IT" value="🇮🇹 Italy +39"><option data-code="ES" value="🇪🇸 Spain +34"><option data-code="NL" value="🇳🇱 Netherlands +31"><option data-code="BE" value="🇧🇪 Belgium +32"><option data-code="IE" value="🇮🇪 Ireland +353"><option data-code="SE" value="🇸🇪 Sweden +46"><option data-code="CH" value="🇨🇭 Switzerland +41"></datalist><input class="fashionpur-otp__phone" type="tel" placeholder="Mobile number" inputmode="tel" autocomplete="tel"><input class="fashionpur-otp__code" hidden type="text" placeholder="6-digit OTP" inputmode="numeric" autocomplete="one-time-code"><div id="fashionpur-msg91-captcha"></div><label class="fashionpur-otp__consent"><input type="checkbox"> Send me Fashionpur offers on WhatsApp</label><p class="fashionpur-otp__error" role="alert"></p><button class="fashionpur-otp__continue" type="button">Get OTP</button><button class="fashionpur-otp__dismiss" type="button">Not now</button></div>';
  document.body.append(modal);

  const button = modal.querySelector(".fashionpur-otp__continue");
  const phoneInput = modal.querySelector(".fashionpur-otp__phone");
  const countryInput = modal.querySelector(".fashionpur-otp__country");
  const codeInput = modal.querySelector(".fashionpur-otp__code");
  const error = modal.querySelector(".fashionpur-otp__error");
  const consent = modal.querySelector(".fashionpur-otp__consent input");
  const copy = modal.querySelector("[data-copy]");
  const countries = [...modal.querySelectorAll("#fashionpur-otp-countries option")];
  const countryOption = (value) => countries.find((option) => option.dataset.code === value || option.value === value);
  const suggested = countryOption(host.dataset.country) || countryOption("IN");
  countryInput.value = suggested.value;

  const dismiss = () => {
    modal.hidden = true;
    try { localStorage.setItem(DISMISS, String(Date.now() + 604800000)); } catch { /* Private browsing may block storage. */ }
  };
  modal.querySelector(".fashionpur-otp__close").addEventListener("click", dismiss);
  modal.querySelector(".fashionpur-otp__dismiss").addEventListener("click", dismiss);
  const showPopup = () => { modal.hidden = false; phoneInput.focus(); };

  const json = async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Please try again.");
    return data;
  };
  const api = (path, body) => fetch(new URL(path, accountUrl).toString(), {
    method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }).then(json);
  const getWidgetConfig = () => fetch(new URL("/account/api/otp/widget-config", accountUrl).toString(), { credentials: "include" }).then(json);
  // MSG91's browser SDK returns provider errors under `data.errors` in some
  // failure paths. Preserve its safe, shopper-facing message instead of
  // replacing it with an unhelpful generic error.
  const callbackError = (reason) => {
    const message = typeof reason === "string"
      ? reason
      : reason?.data?.errors || reason?.data?.message || reason?.message || reason?.error;
    return new Error(typeof message === "string" && message.trim() ? message : "MSG91 could not process this request.");
  };
  const asPromise = (call) => new Promise((resolve, reject) => call(resolve, reject));
  const loadWidget = async () => {
    if (window.sendOtp && window.verifyOtp && window.retryOtp) return widgetConfig;
    if (widgetLoading) return widgetLoading;
    widgetLoading = (async () => {
      widgetConfig = await getWidgetConfig();
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://verify.msg91.com/otp-provider.js";
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("MSG91 could not load. Check your connection and try again."));
        document.head.append(script);
      });
      if (!window.initSendOTP) throw new Error("MSG91 Widget did not initialize.");
      // MSG91's current SDK requires both callbacks even when custom UI uses
      // exposed methods.  Without them it returns before exposing sendOtp.
      widgetInitializationError = null;
      window.initSendOTP({
        widgetId: widgetConfig.widgetId,
        tokenAuth: widgetConfig.tokenAuth,
        exposeMethods: true,
        captchaRenderId: "fashionpur-msg91-captcha",
        success: () => {},
        failure: (item) => { widgetInitializationError = callbackError(item).message; },
      });
      if (!window.sendOtp || !window.verifyOtp || !window.retryOtp) throw new Error("MSG91 Widget is not ready. Please try again.");
      return widgetConfig;
    })();
    try { return await widgetLoading; } catch (item) { widgetLoading = null; throw item; }
  };
  const sendWidgetOtp = async () => {
    await loadWidget();
    if (widgetInitializationError) throw new Error(widgetInitializationError);
    const data = await asPromise((resolve, reject) => window.sendOtp(phone.slice(1), resolve, (item) => reject(callbackError(item))));
    requestId = data?.message || data?.requestId || data?.reqId || null;
    if (!requestId) throw new Error("MSG91 did not return an OTP request. Please try again.");
  };
  const retryWidgetOtp = async () => {
    await loadWidget();
    const data = await asPromise((resolve, reject) => window.retryOtp(null, resolve, (item) => reject(callbackError(item)), requestId));
    requestId = data?.message || data?.requestId || data?.reqId || requestId;
  };
  const verifyWidgetOtp = async () => {
    const data = await asPromise((resolve, reject) => window.verifyOtp(codeInput.value.trim(), resolve, (item) => reject(callbackError(item)), requestId));
    const accessToken = typeof data === "string" ? data : data?.message || data?.accessToken || data?.access_token || data?.token;
    if (!accessToken) throw new Error("MSG91 did not return a verified login token. Please request a new code.");
    return api("/account/api/otp/widget-verify", {
      accessToken, consent: consent.checked, locale: navigator.language || null,
      cartToken: cart?.token, cartClaimSecret: cart?.token ? secretFor(cart.token) : null,
    });
  };

  const resend = document.createElement("button");
  resend.type = "button";
  resend.hidden = true;
  resend.className = "fashionpur-otp__dismiss";
  codeInput.after(resend);
  const countdown = () => {
    clearInterval(resendTimer);
    resend.hidden = false;
    resend.disabled = true;
    resendTimer = setInterval(() => {
      const seconds = Math.ceil((resendUntil - Date.now()) / 1000);
      if (seconds <= 0) {
        clearInterval(resendTimer);
        resend.disabled = false;
        resend.textContent = "Resend OTP";
      } else {
        resend.textContent = `Resend available in ${seconds}s`;
      }
    }, 250);
  };
  resend.addEventListener("click", async () => {
    error.textContent = "";
    resend.disabled = true;
    resend.textContent = "Resending…";
    try {
      await retryWidgetOtp();
      resendUntil = Date.now() + 30000;
      countdown();
    } catch (item) {
      resend.disabled = false;
      resend.textContent = "Resend OTP";
      error.textContent = item.message;
    }
  });

  button.addEventListener("click", async () => {
    error.textContent = "";
    if (!requestId) {
      const raw = phoneInput.value.trim();
      const selected = countryOption(countryInput.value);
      if (!selected && !raw.startsWith("+")) {
        error.textContent = "Choose a country from the list, or enter the complete number with + country code.";
        return;
      }
      const dialingCode = selected?.value.match(/\+(\d+)/)?.[1];
      phone = raw.startsWith("+") ? raw : `+${dialingCode}${raw.replace(/\D/g, "")}`;
      if (!/^\+\d{7,15}$/.test(phone)) {
        error.textContent = "Enter a valid international mobile number.";
        return;
      }
      button.disabled = true;
      button.textContent = "Sending…";
      try {
        await sendWidgetOtp();
        codeInput.hidden = false;
        phoneInput.hidden = true;
        countryInput.hidden = true;
        copy.textContent = `OTP sent to ${phone}.`;
        button.textContent = "Verify OTP";
        resendUntil = Date.now() + 30000;
        countdown();
        codeInput.focus();
      } catch (item) {
        error.textContent = item.message;
        button.textContent = "Get OTP";
      } finally {
        button.disabled = false;
      }
      return;
    }
    if (!/^\d{4,8}$/.test(codeInput.value.trim())) {
      error.textContent = "Enter the OTP sent to your phone.";
      return;
    }
    button.disabled = true;
    button.textContent = "Verifying…";
    try {
      await verifyWidgetOtp();
      clearInterval(resendTimer);
      modal.hidden = true;
      storefrontAuthenticated = true;
      host.querySelector("[data-identity-login]").hidden = true;
      host.querySelector("[data-identity-account]").style.display = "inline-block";
    } catch (item) {
      error.textContent = item.message;
    } finally {
      button.disabled = false;
      button.textContent = "Verify OTP";
    }
  });

  const openAccountOrLogin = () => capture().catch(() => null).finally(() => storefrontAuthenticated ? go() : showPopup());
  document.addEventListener("click", (event) => {
    const target = event.target.closest(`[data-identity-login], [data-identity-account], ${ACCOUNT_CONTROL}`);
    if (!target) return;
    event.preventDefault();
    if (target.hasAttribute("data-identity-account") || target.matches(ACCOUNT_CONTROL)) openAccountOrLogin();
    else { capture().catch(() => null); showPopup(); }
  });

  const changed = () => { capture(); };
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const result = originalFetch.apply(this, args);
    const url = String(args[0] instanceof Request ? args[0].url : args[0]);
    if (/\/cart\/(add|change|update|clear)\.js/.test(url)) result.finally(() => setTimeout(changed, 250));
    return result;
  };
  const drawerOpened = () => document.querySelector("cart-drawer[open], .cart-drawer.is-open, #CartDrawer.is-open");
  new MutationObserver(() => {
    if (drawerOpened() && canPrompt()) capture().then(() => setTimeout(() => { if (canPrompt()) showPopup(); }, delay));
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["open", "class"] });

  fetch(new URL("/account/api/session", accountUrl).toString(), { credentials: "include" }).then((response) => response.json()).then((session) => {
    storefrontAuthenticated = session.authenticated === true;
    if (storefrontAuthenticated) {
      host.querySelector("[data-identity-login]").hidden = true;
      const account = host.querySelector("[data-identity-account]");
      account.style.display = "inline-block";
      account.textContent = session.name || session.maskedPhone || "My Account";
    }
  }).catch(() => {});
  if (location.pathname === "/cart") capture().then(() => { if (canPrompt()) setTimeout(() => { if (canPrompt()) showPopup(); }, delay); });
})();
