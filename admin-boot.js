/* admin.html bootstrap: admin-only login, default route, redirects of user-only pages to the main site */
(function () {
  "use strict";
  const NS = window.NS;
  if (!NS) return;
  const { $, esc, ic, api, toast, busy, btn, mountView, state } = NS;

  // /admin খুললে সরাসরি অ্যাডমিন ওভারভিউ (বা লগইন)
  if (!location.hash || location.hash === "#" || location.hash === "#/") {
    history.replaceState(null, "", location.pathname + location.search + "#/admin");
  }

  const siteName = () => (state.pub && state.pub.site_name) || "NameAPI";
  const brand = () => '<a class="brand" href="#/admin"><span class="logo">' + ic("shield", 22) + "</span><span>" + esc(siteName()) + "</span></a>";

  // এই পেজে নেই এমন রুট: হোম -> অ্যাডমিন, ইউজার পেজ -> মূল সাইট
  const go = (target) => ({ mode: "auth", render() { location.replace(target); } });
  NS.route("/", { mode: "auth", render() { location.hash = "#/admin"; } });
  NS.route("/404", { mode: "auth", render() { location.hash = "#/admin"; } });
  NS.route("/register", { mode: "auth", render() { location.hash = "#/login"; } });
  ["/dashboard", "/upgrade", "/add-money", "/status", "/docs", "/rules"].forEach((p) => NS.route(p, go("/#" + p)));

  // অ্যাডমিন লগইন (শুধু অ্যাডমিন অ্যাকাউন্ট ঢুকতে পারবে)
  NS.route("/login", {
    mode: "auth", guest: true,
    async render(el) {
      const v = mountView(el,
        '<div class="auth-wrap"><span class="blob a"></span><span class="blob b"></span><div class="card auth-card">' + brand() +
        "<h1>Admin Sign In</h1>" +
        '<p class="muted" style="margin-bottom:22px">Sign in with your admin account to open the admin panel.</p>' +
        '<form novalidate><div class="form-err" id="ae"></div>' +
        '<div class="field"><label>Admin email</label><input class="input" type="email" name="email" autocomplete="email" inputmode="email" placeholder="admin@example.com" required></div>' +
        '<div class="field"><label>Password</label><div class="input-wrap"><input class="input" type="password" name="password" autocomplete="current-password" placeholder="Your password" required>' +
        '<button type="button" class="btn btn-icon btn-sm eye" style="background:transparent" data-act="eye" aria-label="Show password">' + ic("eye", 19) + "</button></div></div>" +
        btn("Sign In", "btn-primary btn-block btn-lg", 'type="submit"') + "</form>" +
        '<p class="auth-foot" style="margin-top:14px"><a href="/">Back to website</a></p></div></div>');
      NS.onClick(v, {
        eye: (t) => {
          const i = $("input[name=password]", v), show = i.type === "password";
          i.type = show ? "text" : "password"; t.innerHTML = ic(show ? "eyeoff" : "eye", 19);
        },
      });
      $("form", v).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target, er = $("#ae", v), b = $("[type=submit]", f);
        er.classList.remove("show");
        try {
          await busy(b, () => api("POST", "/login", { email: f.email.value, password: f.password.value }));
          await NS.refreshMe();
          if (!state.me || state.me.role !== "admin") {
            try { await api("POST", "/logout"); } catch (x) {}
            state.me = null;
            throw new Error("This account is not an admin.");
          }
          state.mode = null;
          toast("Signed in");
          location.hash = "#/admin";
        } catch (x) { er.textContent = x.message; er.classList.add("show"); }
      });
    },
  });

  // ট্যাব টাইটেল
  const origStart = NS.start;
  NS.start = async function () {
    await origStart();
    document.title = siteName() + " | Admin Panel";
  };
})();
