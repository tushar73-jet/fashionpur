(() => {
  const DISMISS = "fashionpur_identity_popup_dismissed_until";
  const host = document.querySelector("fashionpur-identity");
  if (!host) return;
  const endpoint = host.dataset.cartEndpoint, accountUrl = host.dataset.accountUrl, delay = Number(host.dataset.delay || 3000);
  let cart;
  const capture = async () => {
    if (!endpoint) return null;
    const response = await fetch("/cart.js", { credentials: "same-origin" });
    if (!response.ok) return null;
    cart = await response.json();
    if (cart.token) fetch(endpoint, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(cart), keepalive: true }).catch(() => {});
    return cart;
  };
  const go = (path = "/account/login") => {
    if (!accountUrl) return;
    const url = new URL(accountUrl, location.origin); url.pathname = path;
    url.searchParams.set("return_to", host.dataset.returnTo || location.pathname);
    if (cart?.token) url.searchParams.set("cart_token", cart.token);
    location.assign(url.toString());
  };
  const modal = document.createElement("section");
  modal.className = "fashionpur-otp"; modal.hidden = true;
  modal.innerHTML = '<div class="fashionpur-otp__panel" role="dialog" aria-modal="true" aria-labelledby="fashionpur-otp-title"><button class="fashionpur-otp__close" type="button" aria-label="Close">×</button><p>FASHIONPUR</p><h2 id="fashionpur-otp-title">Save your bag</h2><p>Sign in with your Indian mobile number to save your cart and view your account.</p><button class="fashionpur-otp__continue" type="button">Continue with mobile number</button><button class="fashionpur-otp__dismiss" type="button">Not now</button></div>';
  document.body.append(modal);
  const dismiss = () => { modal.hidden = true; localStorage.setItem(DISMISS, String(Date.now() + 604800000)); };
  modal.querySelector(".fashionpur-otp__close").addEventListener("click", dismiss);
  modal.querySelector(".fashionpur-otp__dismiss").addEventListener("click", dismiss);
  modal.querySelector(".fashionpur-otp__continue").addEventListener("click", () => go());
  document.addEventListener("click", (event) => { const target = event.target.closest("[data-identity-login], [data-identity-account]"); if (!target) return; event.preventDefault(); capture().finally(() => go(target.hasAttribute("data-identity-account") ? "/account/profile" : "/account/login")); });
  const changed = () => { capture(); };
  const originalFetch = window.fetch;
  window.fetch = function (...args) { const result = originalFetch.apply(this, args); const url = String(args[0] instanceof Request ? args[0].url : args[0]); if (/\/cart\/(add|change|update|clear)\.js/.test(url)) result.finally(() => setTimeout(changed, 250)); return result; };
  if (location.pathname === "/cart") capture().then(() => { if (Date.now() >= Number(localStorage.getItem(DISMISS) || 0)) setTimeout(() => { modal.hidden = false; modal.querySelector(".fashionpur-otp__continue").focus(); }, delay); });
})();
