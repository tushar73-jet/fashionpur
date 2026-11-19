(() => {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-identity-login]");
    if (!button) return;
    const host = button.closest("fashionpur-identity");
    const accountUrl = host?.dataset.accountUrl;
    if (!accountUrl) return;
    const url = new URL(accountUrl, window.location.origin);
    url.searchParams.set("return_to", host.dataset.returnTo || window.location.pathname);
    window.location.assign(url.toString());
  });
})();
