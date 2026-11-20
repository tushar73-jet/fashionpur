(() => {
  const DISMISS = "fashionpur_identity_popup_dismissed_until";
  const ACCOUNT_CONTROL = "#customer_login_link, .fp-mobile-nav a[href^='/account']";
  const host = document.querySelector("fashionpur-identity");
  if (!host) return;
  const endpoint = host.dataset.cartEndpoint, accountUrl = host.dataset.accountUrl, delay = Number(host.dataset.delay || 3000);
  let cart, requestId, phone, resendUntil = 0, resendTimer, storefrontAuthenticated = false;
  const dismissalUntil = () => { try { return Number(localStorage.getItem(DISMISS) || 0); } catch { return 0; } };
  const canPrompt = () => !storefrontAuthenticated && Date.now() >= dismissalUntil();
  const secretFor = (token) => { const key = `fashionpur_cart_claim_${token}`; let value = localStorage.getItem(key); if (!value) { const bytes = crypto.getRandomValues(new Uint8Array(32)); value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); localStorage.setItem(key, value); } return value; };
  const capture = async () => {
    if (!endpoint) return null;
    const response = await fetch("/cart.js", { credentials: "same-origin" });
    if (!response.ok) return null;
    cart = await response.json();
    if (cart.token) fetch(endpoint, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-fashionpur-cart-claim": secretFor(cart.token) }, body: JSON.stringify(cart), keepalive: true }).catch(() => {});
    return cart;
  };
  const go = (path = "/account/profile") => {
    if (!accountUrl) return;
    const url = new URL(accountUrl, location.origin); url.pathname = path;
    url.searchParams.set("return_to", host.dataset.returnTo || location.pathname);
    if (cart?.token) url.searchParams.set("cart_token", cart.token);
    location.assign(url.toString());
  };
  const modal = document.createElement("section");
  modal.className = "fashionpur-otp"; modal.hidden = true;
  modal.innerHTML = '<div class="fashionpur-otp__panel" role="dialog" aria-modal="true" aria-labelledby="fashionpur-otp-title"><button class="fashionpur-otp__close" type="button" aria-label="Close">×</button><p>FASHIONPUR</p><h2 id="fashionpur-otp-title">Save your bag</h2><p data-copy>Enter your mobile number to save your cart.</p><input class="fashionpur-otp__country" list="fashionpur-otp-countries" aria-label="Search country or dialing code" placeholder="Search country or dialing code" autocomplete="off"><datalist id="fashionpur-otp-countries"><option data-code="IN" value="🇮🇳 India +91"><option data-code="US" value="🇺🇸 United States +1"><option data-code="CA" value="🇨🇦 Canada +1"><option data-code="GB" value="🇬🇧 United Kingdom +44"><option data-code="AE" value="🇦🇪 United Arab Emirates +971"><option data-code="SA" value="🇸🇦 Saudi Arabia +966"><option data-code="QA" value="🇶🇦 Qatar +974"><option data-code="KW" value="🇰🇼 Kuwait +965"><option data-code="BH" value="🇧🇭 Bahrain +973"><option data-code="OM" value="🇴🇲 Oman +968"><option data-code="DE" value="🇩🇪 Germany +49"><option data-code="FR" value="🇫🇷 France +33"><option data-code="IT" value="🇮🇹 Italy +39"><option data-code="ES" value="🇪🇸 Spain +34"><option data-code="NL" value="🇳🇱 Netherlands +31"><option data-code="BE" value="🇧🇪 Belgium +32"><option data-code="IE" value="🇮🇪 Ireland +353"><option data-code="SE" value="🇸🇪 Sweden +46"><option data-code="CH" value="🇨🇭 Switzerland +41"></datalist><input class="fashionpur-otp__phone" type="tel" placeholder="Mobile number" inputmode="tel" autocomplete="tel"><input class="fashionpur-otp__code" hidden type="text" placeholder="6-digit OTP" inputmode="numeric" autocomplete="one-time-code"><label class="fashionpur-otp__consent"><input type="checkbox"> Send me Fashionpur offers on WhatsApp</label><p class="fashionpur-otp__error" role="alert"></p><button class="fashionpur-otp__continue" type="button">Get OTP</button><button class="fashionpur-otp__dismiss" type="button">Not now</button></div>';
  document.body.append(modal);
  const dismiss = () => { modal.hidden = true; try { localStorage.setItem(DISMISS, String(Date.now() + 604800000)); } catch { /* Storage can be unavailable in private contexts. */ } };
  modal.querySelector(".fashionpur-otp__close").addEventListener("click", dismiss);
  modal.querySelector(".fashionpur-otp__dismiss").addEventListener("click", dismiss);
  const button = modal.querySelector(".fashionpur-otp__continue"), phoneInput = modal.querySelector(".fashionpur-otp__phone"), countryInput = modal.querySelector(".fashionpur-otp__country"), codeInput = modal.querySelector(".fashionpur-otp__code"), error = modal.querySelector(".fashionpur-otp__error"), consent = modal.querySelector(".fashionpur-otp__consent input"), copy = modal.querySelector("[data-copy]");
  const countries = [...modal.querySelectorAll("#fashionpur-otp-countries option")];
  const countryOption = (value) => countries.find((option) => option.dataset.code === value || option.value === value);
  const suggested = countryOption(host.dataset.country) || countryOption("IN");
  countryInput.value = suggested.value;
  const showPopup = () => { modal.hidden = false; phoneInput.focus(); };
  const api = (path, body) => fetch(new URL(path, accountUrl).toString(), { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Please try again."); return data; });
  const resend = document.createElement("button"); resend.type = "button"; resend.hidden = true; resend.className = "fashionpur-otp__dismiss"; codeInput.after(resend);
  const countdown = () => { clearInterval(resendTimer); resendTimer = setInterval(() => { const seconds = Math.ceil((resendUntil - Date.now()) / 1000); if (seconds <= 0) { clearInterval(resendTimer); resend.hidden = false; resend.disabled = false; resend.textContent = "Resend OTP"; } else { resend.hidden = false; resend.disabled = true; resend.textContent = `Resend available in ${seconds}s`; } }, 250); };
  resend.addEventListener("click", () => { clearInterval(resendTimer); requestId = null; resend.hidden = true; codeInput.hidden = true; phoneInput.hidden = false; countryInput.hidden = false; button.textContent = "Resend OTP"; phoneInput.focus(); });
  button.addEventListener("click", async () => { error.textContent = ""; if (!requestId) { const raw = phoneInput.value.trim(); const selected = countryOption(countryInput.value); if (!selected && !raw.startsWith("+")) { error.textContent = "Choose a country from the list, or enter the complete number with + country code."; return; } const dialingCode = selected?.value.match(/\+(\d+)/)?.[1]; phone = raw.startsWith("+") ? raw : `+${dialingCode}${raw.replace(/\D/g, "")}`; if (phone.length < 8 || phone.length > 16) { error.textContent = "Enter a valid mobile number."; return; } button.disabled = true; button.textContent = "Sending…"; try { requestId = (await api("/account/api/otp/send", { phone })).requestId; codeInput.hidden = false; phoneInput.hidden = true; countryInput.hidden = true; copy.textContent = `OTP sent to ${phone}.`; button.textContent = "Verify OTP"; resendUntil = Date.now() + 30000; countdown(); } catch (item) { error.textContent = item.message; button.textContent = "Get OTP"; } finally { button.disabled = false; } return; } button.disabled = true; button.textContent = "Verifying…"; try { await api("/account/api/otp/verify", { phone, requestId, code: codeInput.value.trim(), consent: consent.checked, locale: navigator.language || null, cartToken: cart?.token, cartClaimSecret: cart?.token ? secretFor(cart.token) : null }); clearInterval(resendTimer); modal.hidden = true; storefrontAuthenticated = true; host.querySelector("[data-identity-login]").hidden = true; host.querySelector("[data-identity-account]").style.display = "inline-block"; } catch (item) { error.textContent = item.message; } finally { button.disabled = false; button.textContent = "Verify OTP"; } });
  const openAccountOrLogin = () => {
    capture().catch(() => null).finally(() => {
      if (storefrontAuthenticated) go();
      else showPopup();
    });
  };
  document.addEventListener("click", (event) => { const target = event.target.closest(`[data-identity-login], [data-identity-account], ${ACCOUNT_CONTROL}`); if (!target) return; event.preventDefault(); if (target.hasAttribute("data-identity-account") || target.matches(ACCOUNT_CONTROL)) { openAccountOrLogin(); } else { capture().catch(() => null); showPopup(); } });
  const changed = () => { capture(); };
  const originalFetch = window.fetch;
  window.fetch = function (...args) { const result = originalFetch.apply(this, args); const url = String(args[0] instanceof Request ? args[0].url : args[0]); if (/\/cart\/(add|change|update|clear)\.js/.test(url)) result.finally(() => setTimeout(changed, 250)); return result; };
  const drawerOpened = () => document.querySelector("cart-drawer[open], .cart-drawer.is-open, #CartDrawer.is-open");
  new MutationObserver(() => { if (drawerOpened() && canPrompt()) capture().then(() => setTimeout(() => { if (canPrompt()) showPopup(); }, delay)); }).observe(document.documentElement, { subtree:true, attributes:true, attributeFilter:["open","class"] });
  fetch(new URL("/account/api/session", accountUrl).toString(), { credentials:"include" }).then((r) => r.json()).then((session) => { storefrontAuthenticated = session.authenticated === true; if (storefrontAuthenticated) { host.querySelector("[data-identity-login]").hidden = true; const account = host.querySelector("[data-identity-account]"); account.style.display = "inline-block"; account.textContent = session.name || session.maskedPhone || "My Account"; } }).catch(() => {});
  if (location.pathname === "/cart") capture().then(() => { if (canPrompt()) setTimeout(() => { if (canPrompt()) showPopup(); }, delay); });
})();
