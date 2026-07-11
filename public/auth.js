// auth.js — login/signup page logic
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // If already logged in, skip straight to the app
  if (window.studySyncApi.isLoggedIn()) {
    window.location.href = "/app.html";
    return;
  }

  const el = {
    body: document.body,
    tabLogin: $("#tabLogin"),
    tabSignup: $("#tabSignup"),
    loginForm: $("#loginForm"),
    signupForm: $("#signupForm"),
    authError: $("#authError"),
    authErrorText: $("#authErrorText"),
    authSwitch: $("#authSwitch"),
    loginSubmit: $("#loginSubmit"),
    signupSubmit: $("#signupSubmit"),
  };

  /* tab switching */
  function showTab(tab) {
    const isLogin = tab === "login";
    el.tabLogin.classList.toggle("is-active", isLogin);
    el.tabSignup.classList.toggle("is-active", !isLogin);
    el.loginForm.style.display = isLogin ? "block" : "none";
    el.signupForm.style.display = isLogin ? "none" : "block";
    el.authError.classList.remove("is-visible");
    el.authSwitch.innerHTML = isLogin
      ? `New here? <button type="button" id="switchToSignup">Create an account</button>`
      : `Already have an account? <button type="button" id="switchToLogin">Log in</button>`;
    const switchBtn = isLogin ? $("#switchToSignup") : $("#switchToLogin");
    switchBtn.addEventListener("click", () => showTab(isLogin ? "signup" : "login"));
  }

  el.tabLogin.addEventListener("click", () => showTab("login"));
  el.tabSignup.addEventListener("click", () => showTab("signup"));

  const params = new URLSearchParams(window.location.search);
  showTab(params.get("mode") === "signup" ? "signup" : "login");

  function showError(msg) {
    el.authErrorText.textContent = msg;
    el.authError.classList.add("is-visible");
  }

  function setLoading(btn, loading, label) {
    btn.disabled = loading;
    btn.textContent = loading ? "One sec…" : label;
  }

  el.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    el.authError.classList.remove("is-visible");
    setLoading(el.loginSubmit, true, "Log in");
    try {
      await window.studySyncApi.login($("#loginEmail").value.trim(), $("#loginPassword").value);
      window.location.href = "/app.html";
    } catch (err) {
      showError(err.isNetworkError ? "Can't reach the StudySync server — is it running?" : err.message);
      setLoading(el.loginSubmit, false, "Log in");
    }
  });

  el.signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    el.authError.classList.remove("is-visible");
    setLoading(el.signupSubmit, true, "Create account");
    try {
      await window.studySyncApi.register(
        $("#signupName").value.trim(),
        $("#signupEmail").value.trim(),
        $("#signupPassword").value
      );
      window.location.href = "/app.html";
    } catch (err) {
      showError(err.isNetworkError ? "Can't reach the StudySync server — is it running?" : err.message);
      setLoading(el.signupSubmit, false, "Create account");
    }
  });
})();
