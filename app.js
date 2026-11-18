/* Name API site: landing, auth, user panel. Admin pages are in admin.js */
(function () {
  "use strict";
  const NS = (window.NS = {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  NS.$ = $; NS.$$ = $$; NS.esc = esc;

  // ------------------------------------------------------------ icons (SVG)
  const P = {
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1.8"/><rect x="14" y="3" width="7" height="5" rx="1.8"/><rect x="14" y="12" width="7" height="9" rx="1.8"/><rect x="3" y="16" width="7" height="5" rx="1.8"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.1"/><path d="M6 6l9-3 2 3"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v15H6a2 2 0 00-2 2V5z"/><path d="M4 20a2 2 0 012-2h13v3H6a2 2 0 01-2-1z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    bell: '<path d="M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7z"/><path d="M10 20a2 2 0 004 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3.2-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 15c2.5.6 4 2.2 4 5"/>',
    logout: '<path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9M6.6 6.6A17 17 0 002 12s4 7 10 7c1.7 0 3.2-.4 4.6-1.1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
    refresh: '<path d="M20 11a8 8 0 00-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0014 4l2-2"/><path d="M20 20v-5h-5"/>',
    server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
    pkg: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4 18-7z"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  };
  const ic = (n, s, cls) => '<svg class="ic ' + (cls || "") + '" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || "") + "</svg>";
  NS.ic = ic;

  // ------------------------------------------------------------ helpers
  const state = (NS.state = { me: null, pub: null, mode: null });
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const bdt = (n) => "৳" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const dt = (d) => (d ? new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "-");
  const dshort = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric" }) : "-");
  const daysLeft = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 864e5));
  const ago = (d) => {
    if (!d) return "never";
    const s = Math.max(0, Math.floor((Date.now() - new Date(d)) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    return Math.floor(s / 86400) + " d ago";
  };
  Object.assign(NS, { fmt, bdt, dt, dshort, daysLeft, ago });
  const PLAN = { none: ["No package", "warn"], active: ["Active", "ok"], expired: ["Expired", "bad"], exhausted: ["Limit reached", "bad"] };
  NS.planBadge = (st) => '<span class="badge ' + PLAN[st][1] + '"><span class="dot"></span>' + PLAN[st][0] + "</span>";
  NS.btn = (label, cls, attrs, icon) => '<button class="btn ' + (cls || "") + '" ' + (attrs || "") + ">" + (icon ? ic(icon, 18) : "") + '<span class="lbl">' + label + "</span></button>";
  const btn = NS.btn;

  async function api(method, path, body) {
    const opt = { method, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (method !== "GET") { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body || {}); }
    let r;
    try { r = await fetch("/app" + path, opt); } catch (e) { throw new Error("Network error. Check your connection and try again."); }
    let j = null;
    try { j = await r.json(); } catch (e) {}
    if (r.status === 401 && state.me && path !== "/login") { state.me = null; state.mode = null; location.hash = "#/login"; }
    if (!r.ok || !j || j.ok === false) { const err = new Error((j && j.error) || "Request failed (" + r.status + ")"); err.status = r.status; throw err; }
    return j;
  }
  NS.api = api;

  function toast(msg, type) {
    const t = document.createElement("div");
    t.className = "toast " + (type || "ok");
    t.innerHTML = ic(type === "err" ? "alert" : "check", 20) + "<span>" + esc(msg) + "</span>";
    $("#toasts").appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, 3200);
  }
  NS.toast = toast;
  async function busy(b, fn) {
    if (b) { b.classList.add("loading"); b.disabled = true; }
    try { return await fn(); } finally { if (b) { b.classList.remove("loading"); b.disabled = false; } }
  }
  NS.busy = busy;

  function modal(html, opts) {
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(back);
    const prevFocus = document.activeElement;
    const close = () => { document.removeEventListener("keydown", onKey); back.remove(); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    back.addEventListener("mousedown", (e) => { if (e.target === back) close(); });
    $$("[data-close]", back).forEach((b) => b.addEventListener("click", close));
    const first = $("input,select,textarea", back);
    if (first && !(opts && opts.noFocus)) setTimeout(() => first.focus(), 60);
    return { el: back.firstElementChild, back, close };
  }
  NS.modal = modal;
  function confirmBox(title, msg, okLabel, danger) {
    return new Promise((resolve) => {
      const m = modal("<h3>" + esc(title) + '</h3><p class="muted">' + esc(msg) + '</p><div class="m-actions">' + btn("Cancel", "btn-ghost", "data-close") + btn(esc(okLabel || "Confirm"), danger ? "btn-danger" : "btn-primary", 'data-ok') + "</div>", { noFocus: true });
      let done = false;
      $("[data-ok]", m.el).addEventListener("click", () => { done = true; m.close(); resolve(true); });
      m.back.addEventListener("click", () => { if (!done) setTimeout(() => resolve(false), 0); });
      document.addEventListener("keydown", function esc2(e) { if (e.key === "Escape") { document.removeEventListener("keydown", esc2); resolve(false); } });
    });
  }
  NS.confirm = confirmBox;

  function copyText(text, b) {
    const done = () => {
      toast("Copied to clipboard");
      if (b) { const l = $(".lbl", b); const old = l ? l.textContent : ""; if (l) l.textContent = "Copied"; setTimeout(() => { if (l) l.textContent = old; }, 1600); }
    };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else fallback();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed. Select and copy manually.", "err"); }
      ta.remove();
    }
  }
  NS.copy = copyText;

  // বাটনে রিপল ইফেক্ট
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn");
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = "width:" + d + "px;height:" + d + "px;left:" + (e.clientX - r.left - d / 2) + "px;top:" + (e.clientY - r.top - d / 2) + "px";
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  });

  function countUp(root) {
    $$("[data-count]", root).forEach((el) => {
      const to = Number(el.dataset.count) || 0, money = el.dataset.money === "1", dur = 900, t0 = performance.now();
      const show = (v) => (el.textContent = money ? bdt(v) : fmt(Math.round(v)));
      if (to === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return show(to);
      (function step(t) {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        show(to * e);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }
  NS.countUp = countUp;

  function onClick(root, handlers) {
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]");
      if (!t || !root.contains(t)) return;
      const h = handlers[t.dataset.act];
      if (h) { e.preventDefault(); h(t, e); }
    });
  }
  NS.onClick = onClick;
  function bars(rows, n) {
    n = n || 7;
    const map = {};
    (rows || []).forEach((r) => (map[r.d] = r.c));
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - i);
      const k = d.toISOString().slice(0, 10);
      out.push({ k, c: map[k] || 0, l: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }) });
    }
    const max = Math.max(1, ...out.map((x) => x.c));
    return '<div class="bars">' + out.map((x, i) => '<div class="bar" title="' + esc(x.k) + ": " + x.c + ' requests"><b>' + (x.c ? fmt(x.c) : "") + '</b><i style="height:' + Math.max(3, Math.round((x.c / max) * 100)) + '%;animation-delay:' + i * 60 + 'ms"></i><span>' + x.l + "</span></div>").join("") + "</div>";
  }
  NS.bars = bars;
  const skeleton = (el) => { el.innerHTML = '<div class="stack"><div class="skel" style="height:44px;width:40%"></div><div class="skel" style="height:190px"></div><div class="skel" style="height:150px"></div></div>'; };
  NS.skeleton = skeleton;
  const mountView = (el, html) => { el.innerHTML = '<div class="view">' + html + "</div>"; return el.firstElementChild; };
  NS.mountView = mountView;
  NS.pageTitle = (title, sub, right) => '<div class="page-title"><h1>' + esc(title) + "</h1>" + (right ? '<div class="right row">' + right + "</div>" : "") + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div>";
  const empty = (icon, text) => '<div class="empty">' + ic(icon, 34) + "<div>" + esc(text) + "</div></div>";
  NS.empty = empty;
  const siteName = () => (state.pub && state.pub.site_name) || (state.me && state.me.settings && state.me.settings.site_name) || "NameAPI";
  const brand = () => '<a class="brand" href="#/"><span class="logo">' + ic("shield", 22) + "</span><span>" + esc(siteName()) + "</span></a>";

  // ------------------------------------------------------------ router
  const routes = {};
  NS.route = (path, def) => { routes[path] = def; };
  let token = 0;
  const hashPath = () => ((location.hash || "#/").replace(/^#/, "").split("?")[0] || "/");

  const USER_NAV = [
    ["/dashboard", "grid", "Dashboard"], ["/upgrade", "zap", "Upgrade API"], ["/add-money", "wallet", "Add Money"],
    ["/status", "activity", "API Status"], ["/docs", "book", "Dev Docs"], ["/rules", "shield", "Rules & Terms"],
  ];
  const ADMIN_NAV = [
    ["/admin", "chart", "Overview"], ["/admin/users", "users", "Users"], ["/admin/packages", "pkg", "Packages"],
    ["/admin/deposits", "card", "Deposits"], ["/admin/servers", "server", "Servers"], ["/admin/settings", "cog", "Settings"], ["/admin/logs", "list", "Request Logs"],
  ];

  function mount(mode) {
    const app = $("#app");
    if (state.mode === mode && $("#view")) return;
    state.mode = mode;
    if (mode === "public") {
      const me = state.me;
      app.innerHTML =
        '<header class="pub-nav">' + brand() +
        '<nav class="pub-links"><a data-act="scroll" data-to="pricing" href="#/">Pricing</a><a href="#/docs">Docs</a><a href="#/rules">Rules</a></nav>' +
        '<span class="right row" style="gap:8px;flex-wrap:nowrap">' +
        (me ? '<a class="btn btn-dark btn-sm" href="#/dashboard">' + ic("grid", 16) + '<span class="lbl">Dashboard</span></a>'
          : '<a class="btn btn-ghost btn-sm" href="#/login"><span class="lbl">Sign In</span></a><a class="btn btn-dark btn-sm" href="#/register"><span class="lbl">Sign Up</span>' + ic("arrow", 16, "go") + "</a>") +
        '</span></header><main id="view"></main>' +
        '<footer class="footer"><div>' + brand().replace('class="brand"', 'class="brand" style="justify-content:center;margin-bottom:10px"') + '</div><div><a href="#/docs">Dev Docs</a><a href="#/rules">Rules &amp; Terms</a><a href="#/login">Sign In</a></div><p style="margin-top:12px">&copy; ' + new Date().getFullYear() + " " + esc(siteName()) + ". All rights reserved.</p></footer>";
    } else if (mode === "auth") {
      app.innerHTML = '<main id="view"></main>';
    } else {
      const nav = mode === "admin" ? ADMIN_NAV : USER_NAV;
      const me = state.me;
      app.innerHTML =
        '<div class="shell"><aside class="sidebar" id="side">' + brand() +
        '<nav class="nav">' + (mode === "admin" ? '<div class="label">Admin Panel</div>' : "") +
        nav.map((n) => '<a href="#' + n[0] + '" data-path="' + n[0] + '">' + ic(n[1], 20) + "<span>" + n[2] + "</span></a>").join("") +
        (me && me.role === "admin" ? '<div class="label">Switch</div><a href="#' + (mode === "admin" ? "/dashboard" : "/admin") + '" data-path="x">' + ic(mode === "admin" ? "home" : "cog", 20) + "<span>" + (mode === "admin" ? "User Panel" : "Admin Panel") + "</span></a>" : "") +
        '</nav><div class="side-foot">' + btn("Sign out", "btn-ghost btn-block", 'data-act="logout"', "logout") + '</div></aside><div class="scrim" id="scrim" data-act="closeside"></div>' +
        '<div class="shell-main"><div class="topbar"><button class="top-icon" id="burger" data-act="openside" aria-label="Menu">' + ic("menu", 22) + "</button>" +
        '<button class="top-icon" data-act="bell" aria-label="Notices">' + ic("bell", 21) + '<span class="pip hide" id="pip"></span></button>' +
        '<span class="right row" style="gap:12px;flex-wrap:nowrap">' +
        '<a class="bal" href="#/add-money"><span class="coin">৳</span><span><small>Balance</small><b id="topbal">' + bdt(me ? me.balance : 0) + "</b></span></a>" +
        '<button class="avatar" data-act="menu" aria-label="Account">' + esc(((me && me.name) || "U").trim().slice(0, 2).toUpperCase()) + "</button></span></div>" +
        '<main class="content" id="view"></main></div></div>';
    }
  }
  NS.updateTop = () => {
    const b = $("#topbal");
    if (b && state.me) b.textContent = bdt(state.me.balance);
  };
  function markNav(path) {
    $$("#side .nav a").forEach((a) => a.classList.toggle("on", a.dataset.path === path || (a.dataset.path !== "/admin" && a.dataset.path !== "x" && path.startsWith(a.dataset.path + "/"))));
  }

  async function route() {
    const my = ++token;
    const path = hashPath();
    const def = routes[path] || routes["/404"];
    const me = state.me;
    if (def.role === "user" && !me) { location.hash = "#/login"; return; }
    if (def.role === "admin" && (!me || me.role !== "admin")) { location.hash = me ? "#/dashboard" : "#/login"; return; }
    if (def.guest && me) { location.hash = me.role === "admin" ? "#/admin" : "#/dashboard"; return; }
    const mode = typeof def.mode === "function" ? def.mode() : def.mode;
    mount(mode);
    closeSide();
    markNav(path);
    const el = $("#view");
    window.scrollTo({ top: 0 });
    try {
      await def.render(el, () => my === token);
    } catch (e) {
      if (my !== token) return;
      mountView(el, '<div class="card empty">' + ic("alert", 38) + "<h3>Something went wrong</h3><p>" + esc(e.message) + '</p><div style="margin-top:14px">' + btn("Try again", "btn-primary", 'data-act="retry"', "refresh") + "</div></div>");
      onClick(el, { retry: () => route() });
    }
  }
  NS.refreshRoute = () => route();
  window.addEventListener("hashchange", route);

  // ------------------------------------------------------------ global actions
  function openSide() { const s = $("#side"), c = $("#scrim"); if (s) { s.classList.add("open"); c.classList.add("show"); } }
  function closeSide() { const s = $("#side"), c = $("#scrim"); if (s) { s.classList.remove("open"); c.classList.remove("show"); } }
  function closeMenu() { const m = $("#acctmenu"); if (m) m.remove(); }
  async function refreshMe() {
    const r = await api("GET", "/me");
    state.me = r.user ? Object.assign(r.user, { settings: r.settings }) : null;
    NS.updateTop();
    return state.me;
  }
  NS.refreshMe = refreshMe;
  async function logout() {
    try { await api("POST", "/logout"); } catch (e) {}
    state.me = null; state.mode = null; closeMenu();
    location.hash = "#/";
    route();
  }
  function changePasswordModal() {
    const m = modal("<h3>Change password</h3><p class=\"muted\" style=\"margin-bottom:14px\">Use at least 8 characters.</p>" +
      '<form><div class="form-err" id="pe"></div><div class="field"><label>Current password</label><input class="input" type="password" name="current" autocomplete="current-password" required></div>' +
      '<div class="field"><label>New password</label><input class="input" type="password" name="password" autocomplete="new-password" minlength="8" required></div>' +
      '<div class="m-actions">' + btn("Cancel", "btn-ghost", "type=\"button\" data-close") + btn("Update password", "btn-primary", 'type="submit"') + "</div></form>");
    $("form", m.el).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, b = $("[type=submit]", f), er = $("#pe", m.el);
      er.classList.remove("show");
      try { await busy(b, () => api("POST", "/password", { current: f.current.value, password: f.password.value })); toast("Password updated"); m.close(); }
      catch (x) { er.textContent = x.message; er.classList.add("show"); }
    });
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) { if (!e.target.closest("#acctmenu")) closeMenu(); return; }
    const a = t.dataset.act;
    if (a === "openside") openSide();
    else if (a === "closeside") closeSide();
    else if (a === "logout") { e.preventDefault(); logout(); }
    else if (a === "scroll") {
      e.preventDefault();
      if (hashPath() !== "/") { location.hash = "#/"; setTimeout(() => { const x = document.getElementById(t.dataset.to); if (x) x.scrollIntoView({ behavior: "smooth" }); }, 350); }
      else { const x = document.getElementById(t.dataset.to); if (x) x.scrollIntoView({ behavior: "smooth" }); }
    } else if (a === "bell") {
      const n = state.pub && state.pub.announcement;
      modal("<h3>Notices</h3>" + (n ? '<div class="alert" style="margin-top:12px">' + ic("info", 20) + "<span>" + esc(n) + "</span></div>" : '<p class="muted" style="margin-top:8px">No new notices.</p>') + '<div class="m-actions">' + btn("Close", "btn-dark", "data-close") + "</div>");
      const p = $("#pip"); if (p) p.classList.add("hide");
    } else if (a === "menu") {
      e.stopPropagation();
      if ($("#acctmenu")) return closeMenu();
      const d = document.createElement("div");
      d.className = "menu"; d.id = "acctmenu";
      d.innerHTML = '<div class="who"><b>' + esc(state.me.name) + '</b><span class="muted" style="font-size:13px">' + esc(state.me.email) + "</span></div>" +
        '<button data-act="chpw">' + ic("lock", 18) + "Change password</button>" + '<button data-act="logout">' + ic("logout", 18) + "Sign out</button>";
      $(".topbar").appendChild(d);
    } else if (a === "chpw") { closeMenu(); changePasswordModal(); }
  });

  // ------------------------------------------------------------ public landing
  NS.route("/", {
    mode: "public",
    async render(el) {
      const pub = state.pub || {};
      const up = pub.servers ? pub.servers.up : 0, down = pub.servers ? pub.servers.down : 0, total = pub.servers ? pub.servers.total : 0;
      const live = total > 0 && up === 0 && down === total ? "Service temporarily degraded" : "Gateway is live";
      const feats = [
        ["zap", "", "Real-time name lookup", "Send a player UID, get the in-game name back in about a second. Cached lookups return even faster."],
        ["server", "violet", "Automatic failover", "Requests are routed across multiple servers. If one goes down, the next one answers."],
        ["key", "green", "Keys and usage control", "Every account gets a personal API key with a request limit and an expiry date you can see at any time."],
        ["clock", "amber", "Instant activation", "Buy a package from your wallet balance and the key starts working immediately."],
      ];
      const pk = pub.packages || [];
      const best = pk.length >= 3 ? 1 : -1;
      mountView(el,
        '<section class="hero"><span class="blob a"></span><span class="blob b"></span>' +
        '<span class="live-pill"><span class="dot live"></span>' + live + "</span>" +
        '<h1>The Fastest Name Check API <span class="grad">For Game Developers</span></h1>' +
        '<p class="lead">Verify Free Fire player names in real time. Instant API keys, flexible packages and automatic failover, all behind one simple endpoint.</p>' +
        '<div class="cta"><a class="btn btn-primary btn-lg" href="#/register">' + ic("zap", 20) + '<span class="lbl">Start Building Free</span></a><a class="btn btn-ghost btn-lg" href="#/docs"><span class="lbl">Read the Docs</span></a></div></section>' +
        '<section class="section"><h2 class="big">Everything you need to scale</h2><p class="sub">Four core engines, zero complexity.</p><div class="feat stagger">' +
        feats.map((f) => '<div class="card hover"><div class="ico-box ' + f[1] + '">' + ic(f[0], 24) + "</div><h3>" + f[2] + "</h3><p>" + f[3] + "</p></div>").join("") + "</div></section>" +
        '<section class="section" id="pricing"><h2 class="big">Simple, prepaid packages</h2><p class="sub">Pay with your wallet balance. No subscriptions, no hidden fees.</p>' +
        (pk.length ? '<div class="plans stagger">' + pk.map((p, i) =>
          '<div class="card hover plan ' + (i === best ? "best" : "") + '">' + (i === best ? '<span class="ribbon">MOST POPULAR</span>' : "") +
          "<h3>" + esc(p.name) + '</h3><div class="muted" style="font-size:14px;margin-top:-8px">' + esc(p.description) + "</div>" +
          '<div class="price">' + bdt(p.price) + "<small> / " + p.days + " days</small></div>" +
          "<ul><li>" + ic("check", 18) + fmt(p.requests) + " requests</li><li>" + ic("check", 18) + p.days + " days validity</li><li>" + ic("check", 18) + "Full API access</li><li>" + ic("check", 18) + "Auto failover servers</li></ul>" +
          '<a class="btn ' + (i === best ? "btn-primary" : "btn-dark") + '" href="#/register"><span class="lbl">Get started</span>' + ic("arrow", 18, "go") + "</a></div>").join("") + "</div>"
          : '<div class="card empty">' + ic("pkg", 34) + "<div>Packages will appear here soon.</div></div>") + "</section>" +
        '<section class="section"><div class="cta-band"><h2>Ready to ship faster?</h2><p>Create a free account in under a minute and get your API key.</p><a class="btn btn-lg" style="background:#fff;color:#1e40af" href="#/register"><span class="lbl">Create account</span>' + ic("arrow", 20, "go") + "</a></div></section>");
      onClick(el, {});
    },
  });

  // ------------------------------------------------------------ auth
  function authPage(kind) {
    const reg = kind === "register";
    return {
      mode: "auth", guest: true,
      async render(el) {
        const v = mountView(el,
          '<div class="auth-wrap"><span class="blob a"></span><span class="blob b"></span><div class="card auth-card">' + brand() +
          "<h1>" + (reg ? "Create your account" : "Welcome back") + '</h1><p class="muted" style="margin-bottom:22px">' + (reg ? "Get your API key in under a minute." : "Sign in to manage your API key and packages.") + "</p>" +
          '<form novalidate><div class="form-err" id="ae"></div>' +
          (reg ? '<div class="field"><label>Full name</label><input class="input" name="name" autocomplete="name" placeholder="Your name" required></div>' : "") +
          '<div class="field"><label>Email</label><input class="input" type="email" name="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required></div>' +
          '<div class="field"><label>Password</label><div class="input-wrap"><input class="input" type="password" name="password" autocomplete="' + (reg ? "new-password" : "current-password") + '" placeholder="' + (reg ? "At least 8 characters" : "Your password") + '" required>' +
          '<button type="button" class="btn btn-icon btn-sm eye" style="background:transparent" data-act="eye" aria-label="Show password">' + ic("eye", 19) + "</button></div></div>" +
          btn(reg ? "Create account" : "Sign In", "btn-primary btn-block btn-lg", 'type="submit"') + "</form>" +
          '<p class="auth-foot">' + (reg ? 'Already have an account? <a href="#/login">Sign in</a>' : 'New here? <a href="#/register">Create an account</a>') + '</p><p class="auth-foot" style="margin-top:8px"><a href="#/">Back to home</a></p></div></div>');
        onClick(v, {
          eye: (t) => {
            const i = $("input[name=password]", v), show = i.type === "password";
            i.type = show ? "text" : "password"; t.innerHTML = ic(show ? "eyeoff" : "eye", 19);
          },
        });
        $("form", v).addEventListener("submit", async (e) => {
          e.preventDefault();
          const f = e.target, er = $("#ae", v), b = $("[type=submit]", f);
          er.classList.remove("show");
          const body = { email: f.email.value, password: f.password.value };
          if (reg) body.name = f.name.value;
          try {
            await busy(b, () => api("POST", reg ? "/register" : "/login", body));
            await refreshMe(); state.mode = null;
            toast(reg ? "Account created" : "Signed in");
            location.hash = state.me.role === "admin" ? "#/admin" : "#/dashboard";
          } catch (x) { er.textContent = x.message; er.classList.add("show"); }
        });
      },
    };
  }
  NS.route("/login", authPage("login"));
  NS.route("/register", authPage("register"));

  // ------------------------------------------------------------ dashboard
  const maskKey = (k) => k.slice(0, 6) + "•".repeat(20);
  NS.route("/dashboard", {
    mode: "app", role: "user",
    async render(el, alive) {
      skeleton(el);
      const d = await api("GET", "/dashboard");
      if (!alive()) return;
      Object.assign(state.me, d.user); NS.updateTop();
      const u = d.user, p = u.plan;
      const pct = p.requests ? Math.min(100, Math.round((p.used / p.requests) * 100)) : 0;
      const tone = p.state === "active" ? (pct > 85 ? "warn" : "ok") : "bad";
      let shown = false;
      const v = mountView(el,
        '<div class="stack stagger">' +
        (d.announcement ? '<div class="alert">' + ic("info", 20) + "<span>" + esc(d.announcement) + "</span></div>" : "") +
        (p.state !== "active" ? '<div class="alert ' + (p.state === "none" ? "warn" : "bad") + '">' + ic("alert", 20) + "<span>" + (p.state === "none" ? "You have no active package yet. Buy one to start using your key." : p.state === "expired" ? "Your package has expired. Renew it to re-activate your key." : "You have used all requests in your package. Upgrade to continue.") + ' <a href="#/upgrade" style="text-decoration:underline">Upgrade API</a></span></div>' : "") +
        '<section class="card"><div class="card-head"><div class="ico-box violet">' + ic("key", 26) + '</div><div class="grow"><h3 style="font-size:21px">Developer API Key</h3><p class="muted">Use this key to authenticate your application\'s requests.</p></div></div>' +
        '<div class="keybox">' + ic("lock", 20) + '<code id="keytxt">' + esc(maskKey(u.api_key)) + '</code><button class="btn btn-icon btn-sm btn-ghost" data-act="reveal" aria-label="Show key">' + ic("eye", 18) + "</button></div>" +
        '<div class="row" style="margin-top:14px">' + btn("Copy Key", "btn-dark grow btn-lg", 'data-act="copykey"', "copy") + btn("Regenerate", "btn-ghost", 'data-act="regen"', "refresh") + "</div>" +
        '<div class="row" style="margin-top:14px"><span class="badge ' + (u.key_active ? "ok" : "bad") + '"><span class="dot"></span>Key ' + (u.key_active ? "enabled" : "disabled") + "</span>" + NS.planBadge(p.state) + "</div></section>" +
        '<div class="sect" style="margin-bottom:0"><h2>Core Metrics</h2></div>' +
        '<div class="cols"><section class="card"><div class="card-head"><div class="ico-box">' + ic("globe", 24) + '</div><h3 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase">Master requests</h3></div>' +
        '<div class="progress ' + tone + '" style="margin-bottom:14px"><i style="width:' + pct + '%"></i></div>' +
        '<div class="stat3"><div><small>Limit</small><b data-count="' + p.requests + '">0</b></div><div><small>Used</small><b style="color:var(--brand)" data-count="' + p.used + '">0</b></div><div><small>Available</small><b style="color:var(--ok)" data-count="' + p.remaining + '">0</b></div></div></section>' +
        '<section class="card"><div class="card-head"><div class="ico-box amber">' + ic("clock", 24) + '</div><h3 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase">Package validity</h3></div>' +
        (p.expires_at ? '<div style="font-size:34px;font-weight:800;letter-spacing:-.03em">' + (p.state === "expired" ? '<span style="color:var(--bad)">Expired</span>' : daysLeft(p.expires_at) + ' <span class="muted" style="font-size:16px;font-weight:600">days left</span>') + "</div>" +
          '<p class="muted" style="margin-top:6px">' + esc(p.name || "Package") + " &middot; " + (p.state === "expired" ? "ended " : "ends ") + dshort(p.expires_at) + "</p>" : '<div style="font-size:24px;font-weight:800">No package</div><p class="muted" style="margin-top:6px">Buy a package to activate your key.</p>') +
        '<div style="margin-top:16px">' + '<a class="btn ' + (p.state === "active" ? "btn-soft" : "btn-primary") + ' btn-sm" href="#/upgrade">' + ic("zap", 16) + '<span class="lbl">' + (p.state === "active" ? "Extend or upgrade" : "Buy a package") + "</span></a></div></section></div>" +
        '<section class="card"><div class="card-head"><div class="ico-box green">' + ic("chart", 24) + '</div><div class="grow"><h3>Usage, last 7 days</h3><p class="muted" style="font-size:13px">Successful lookups per day</p></div></div>' + bars(d.usage, 7) + "</section>" +
        '<section class="card"><div class="card-head"><div class="ico-box">' + ic("list", 24) + '</div><h3>Recent requests</h3><a class="right btn btn-ghost btn-sm" href="#/status"><span class="lbl">View all</span></a></div>' + reqTable(d.recent) + "</section></div>");
      countUp(v);
      onClick(v, {
        reveal: (t) => { shown = !shown; $("#keytxt", v).textContent = shown ? u.api_key : maskKey(u.api_key); t.innerHTML = ic(shown ? "eyeoff" : "eye", 18); },
        copykey: (t) => copyText(u.api_key, t),
        regen: async () => {
          if (!(await confirmBox("Regenerate API key?", "Your old key stops working immediately. Update your apps with the new key.", "Regenerate", true))) return;
          try { const r = await api("POST", "/key/regenerate"); u.api_key = r.api_key; state.me.api_key = r.api_key; $("#keytxt", v).textContent = shown ? u.api_key : maskKey(u.api_key); toast("New API key generated"); }
          catch (x) { toast(x.message, "err"); }
        },
      });
    },
  });
  function reqTable(rows) {
    if (!rows || !rows.length) return empty("activity", "No requests yet. Your calls will show up here.");
    return '<div class="tscroll"><table class="table stack-m"><thead><tr><th>Time</th><th>Endpoint</th><th>UID</th><th>Result</th><th class="num">Time</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td data-l="Time">' + ago(r.created_at) + '</td><td data-l="Endpoint" class="mono">/' + esc(r.kind) + '</td><td data-l="UID" class="mono">' + esc(r.uid_queried) + '</td><td data-l="Result"><span class="badge ' + (r.status === "ok" ? "ok" : r.status === "not_found" ? "warn" : "bad") + '">' + (r.status === "ok" ? "Success" : r.status === "not_found" ? "Not found" : "Error") + '</span></td><td data-l="Duration" class="num">' + (r.ms || 0) + " ms</td></tr>").join("") + "</tbody></table></div>";
  }
  NS.reqTable = reqTable;

  // ------------------------------------------------------------ upgrade
  NS.route("/upgrade", {
    mode: "app", role: "user",
    async render(el, alive) {
      skeleton(el);
      const d = await api("GET", "/packages");
      if (!alive()) return;
      Object.assign(state.me, d.user); NS.updateTop();
      const p = d.user.plan, pk = d.packages, best = pk.length >= 3 ? 1 : -1;
      const v = mountView(el,
        NS.pageTitle("Upgrade API", "Packages are paid from your wallet balance. Buying while a package is active adds the requests and extends the expiry date.") +
        '<div class="stack stagger"><section class="card"><div class="row"><div class="ico-box">' + ic("layers", 24) + '</div><div class="grow"><b>Current package</b><div class="muted" style="font-size:14px">' + (p.expires_at ? esc(p.name || "Package") + " &middot; " + fmt(p.remaining) + " requests left &middot; " + (p.state === "expired" ? "expired " + dshort(p.expires_at) : "expires " + dshort(p.expires_at)) : "No package yet") + "</div></div>" + NS.planBadge(p.state) + "</div></section>" +
        (pk.length ? '<div class="plans">' + pk.map((x, i) =>
          '<div class="card hover plan ' + (i === best ? "best" : "") + '">' + (i === best ? '<span class="ribbon">MOST POPULAR</span>' : "") +
          "<h3>" + esc(x.name) + '</h3><div class="muted" style="font-size:14px;margin-top:-8px">' + esc(x.description) + "</div>" +
          '<div class="pkg-price">' + bdt(x.price) + "<small>one-time</small></div><ul><li>" + ic("check", 18) + fmt(x.requests) + " requests</li><li>" + ic("check", 18) + x.days + " days validity</li><li>" + ic("check", 18) + (x.price && x.requests ? bdt(x.price / x.requests * 100) + " per 100 requests" : "Full API access") + "</li></ul>" +
          btn(p.state === "active" ? "Add this package" : "Buy now", i === best ? "btn-primary" : "btn-dark", 'data-act="buy" data-id="' + x.id + '"', "zap") + "</div>").join("") + "</div>"
          : '<div class="card empty">' + ic("pkg", 34) + "<div>No packages available right now.</div></div>") +
        '<section class="card"><div class="card-head"><div class="ico-box amber">' + ic("file", 24) + "</div><h3>Purchase history</h3></div>" +
        (d.purchases.length ? '<div class="tscroll"><table class="table stack-m"><thead><tr><th>Date</th><th>Package</th><th>Requests</th><th>Days</th><th class="num">Price</th></tr></thead><tbody>' + d.purchases.map((x) => '<tr><td data-l="Date">' + dt(x.created_at) + '</td><td data-l="Package"><b>' + esc(x.package_name) + '</b></td><td data-l="Requests">' + fmt(x.requests) + '</td><td data-l="Days">' + x.days + '</td><td data-l="Price" class="num">' + bdt(x.price) + "</td></tr>").join("") + "</tbody></table></div>" : empty("file", "No purchases yet.")) + "</section></div>");
      onClick(v, {
        buy: (t) => {
          const x = pk.find((k) => String(k.id) === t.dataset.id), bal = state.me.balance;
          if (bal < x.price) {
            const m = modal("<h3>Not enough balance</h3><p class=\"muted\">" + esc(x.name) + " costs <b>" + bdt(x.price) + "</b> and your balance is <b>" + bdt(bal) + "</b>. Add " + bdt(x.price - bal) + " or more to continue.</p><div class=\"m-actions\">" + btn("Close", "btn-ghost", "data-close") + '<a class="btn btn-primary" href="#/add-money" data-close><span class="lbl">Add money</span></a></div>', { noFocus: true });
            return;
          }
          const m = modal("<h3>Confirm purchase</h3><p class=\"muted\" style=\"margin-bottom:12px\">" + esc(x.name) + ": " + fmt(x.requests) + " requests for " + x.days + " days.</p>" +
            '<div class="stat3" style="text-align:left;padding:14px 16px;grid-template-columns:1fr 1fr"><div><small>Price</small><b>' + bdt(x.price) + '</b></div><div style="padding-left:14px"><small>Balance after</small><b>' + bdt(bal - x.price) + "</b></div></div>" +
            (p.state === "active" ? '<p class="hint" style="margin-top:12px">Your active package will be extended, not replaced.</p>' : "") +
            '<div class="m-actions">' + btn("Cancel", "btn-ghost", "data-close") + btn("Pay " + bdt(x.price), "btn-primary", "data-pay", "check") + "</div>", { noFocus: true });
          $("[data-pay]", m.el).addEventListener("click", async (e) => {
            try {
              const r = await busy(e.currentTarget, () => api("POST", "/buy", { package_id: x.id }));
              Object.assign(state.me, r.user); NS.updateTop(); m.close(); toast(x.name + " activated"); route();
            } catch (er) { toast(er.message, "err"); m.close(); }
          });
        },
      });
    },
  });

  // ------------------------------------------------------------ add money
  const STATUS = { pending: ["Pending", "warn"], approved: ["Approved", "ok"], rejected: ["Rejected", "bad"] };
  NS.route("/add-money", {
    mode: "app", role: "user",
    async render(el, alive) {
      skeleton(el);
      const d = await api("GET", "/wallet");
      if (!alive()) return;
      state.me.balance = d.balance; NS.updateTop();
      let sel = d.methods[0] || null;
      const methodsHtml = () => d.methods.map((m) => '<button type="button" class="chip ' + (sel && sel.id === m.id ? "on" : "") + '" data-act="method" data-id="' + esc(m.id) + '">' + esc(m.name) + "</button>").join("");
      const payTo = () => sel ? '<div class="keybox" style="margin-top:10px">' + ic("send", 20) + '<div class="grow"><div class="hint">Send money to (' + esc(sel.type || "Personal") + ')</div><code style="font-size:16px;display:block">' + esc(sel.number) + "</code></div>" + btn("Copy", "btn-ghost btn-sm", 'type="button" data-act="copynum"', "copy") + "</div>" : "";
      const v = mountView(el,
        NS.pageTitle("Add Money", "Send money with your payment app, then submit the transaction ID. Your balance is added after we verify it.") +
        '<div class="stack stagger"><section class="card"><div class="row"><div class="ico-box green">' + ic("wallet", 24) + '</div><div class="grow"><small class="muted">Current balance</small><div style="font-size:30px;font-weight:800;letter-spacing:-.02em" data-count="' + d.balance + '" data-money="1">0</div></div></div></section>' +
        (d.methods.length ? '<section class="card"><h3 style="margin-bottom:14px">Add funds</h3><form novalidate><div class="form-err" id="de"></div>' +
          '<div class="field"><label>Payment method</label><div class="chips" id="mchips">' + methodsHtml() + '</div><div id="payto">' + payTo() + "</div></div>" +
          '<div class="field"><label>Amount (BDT)</label><input class="input" name="amount" inputmode="decimal" placeholder="e.g. 100" required><div class="chips">' + [50, 100, 250, 500, 1000].map((n) => '<button type="button" class="chip" data-act="amt" data-v="' + n + '">' + bdt(n) + "</button>").join("") + '</div><span class="hint">Minimum ' + bdt(d.min_deposit) + "</span></div>" +
          '<div class="grid2"><div class="field"><label>Your number (paid from)</label><input class="input" name="sender" inputmode="tel" placeholder="01XXXXXXXXX" required></div><div class="field"><label>Transaction ID</label><input class="input" name="trx_id" placeholder="e.g. 9AB3C4D5E6" autocapitalize="characters" required></div></div>' +
          btn("Submit for approval", "btn-primary btn-block btn-lg", 'type="submit"', "send") + "</form></section>"
          : '<div class="alert warn">' + ic("alert", 20) + "<span>Payments are not available yet." + (d.support_link ? ' Contact support: <a style="text-decoration:underline" href="' + esc(d.support_link) + '" target="_blank" rel="noopener">' + esc(d.support_link) + "</a>" : "") + "</span></div>") +
        '<section class="card"><div class="card-head"><div class="ico-box amber">' + ic("clock", 24) + "</div><h3>Deposit requests</h3></div>" +
        (d.deposits.length ? '<div class="tscroll"><table class="table stack-m"><thead><tr><th>Date</th><th>Method</th><th>Transaction ID</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>' + d.deposits.map((x) => '<tr><td data-l="Date">' + dt(x.created_at) + '</td><td data-l="Method">' + esc(x.method) + '</td><td data-l="Trx ID" class="mono">' + esc(x.trx_id) + '</td><td data-l="Status"><div><span class="badge ' + STATUS[x.status][1] + '">' + STATUS[x.status][0] + "</span>" + (x.note ? '<div class="hint">' + esc(x.note) + "</div>" : "") + '</div></td><td data-l="Amount" class="num"><b>' + bdt(x.amount) + "</b></td></tr>").join("") + "</tbody></table></div>" : empty("card", "No deposit requests yet.")) + "</section>" +
        '<section class="card"><div class="card-head"><div class="ico-box">' + ic("list", 24) + "</div><h3>Wallet activity</h3></div>" +
        (d.ledger.length ? '<div class="tscroll"><table class="table stack-m"><thead><tr><th>Date</th><th>Type</th><th>Note</th><th class="num">Amount</th><th class="num">Balance</th></tr></thead><tbody>' + d.ledger.map((x) => '<tr><td data-l="Date">' + dt(x.created_at) + '</td><td data-l="Type"><span class="badge ' + (x.amount >= 0 ? "ok" : "blue") + '">' + esc(x.type) + '</span></td><td data-l="Note">' + esc(x.note || "") + '</td><td data-l="Amount" class="num" style="color:' + (x.amount >= 0 ? "var(--ok)" : "var(--bad)") + '"><b>' + (x.amount >= 0 ? "+" : "") + bdt(x.amount) + '</b></td><td data-l="Balance" class="num">' + bdt(x.balance_after) + "</td></tr>").join("") + "</tbody></table></div>" : empty("list", "No activity yet.")) + "</section></div>");
      countUp(v);
      onClick(v, {
        method: (t) => { sel = d.methods.find((m) => m.id === t.dataset.id); $("#mchips", v).innerHTML = methodsHtml(); $("#payto", v).innerHTML = payTo(); },
        copynum: (t) => copyText(sel.number, t),
        amt: (t) => { $("input[name=amount]", v).value = t.dataset.v; },
      });
      const form = $("form", v);
      if (form) form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const er = $("#de", v), b = $("[type=submit]", form);
        er.classList.remove("show");
        try {
          await busy(b, () => api("POST", "/deposit", { method: sel && sel.id, amount: form.amount.value, sender: form.sender.value, trx_id: form.trx_id.value }));
          toast("Submitted. We will review it shortly."); route();
        } catch (x) { er.textContent = x.message; er.classList.add("show"); }
      });
    },
  });

  // ------------------------------------------------------------ api status
  NS.route("/status", {
    mode: "app", role: "user",
    async render(el, alive) {
      skeleton(el);
      const d = await api("GET", "/status");
      if (!alive()) return;
      const up = d.nodes.filter((n) => n.status === "up").length, tot = d.nodes.length;
      const lvl = tot === 0 ? ["warn", "Not configured", "The service has not been set up yet."] : up === tot ? ["ok", "All systems operational", "Every server is responding normally."] : up > 0 ? ["warn", "Partial outage", "Some servers are down. Requests are automatically routed to healthy ones."] : ["bad", "Major outage", "No server is responding right now. Please check back soon."];
      const p = d.user.plan;
      const v = mountView(el,
        NS.pageTitle("API Status", "Live health of the lookup servers and your recent requests.", btn("Refresh", "btn-ghost btn-sm", 'data-act="refresh"', "refresh")) +
        '<div class="stack stagger"><div class="alert ' + lvl[0] + '" style="padding:20px">' + ic(lvl[0] === "ok" ? "check" : "alert", 28) + '<div><b style="font-size:18px">' + lvl[1] + '</b><div style="font-weight:500">' + lvl[2] + "</div></div></div>" +
        '<section class="card"><div class="card-head"><div class="ico-box">' + ic("server", 24) + "</div><h3>Servers</h3></div>" +
        (tot ? '<div class="stack" style="gap:10px">' + d.nodes.map((n) => '<div class="row" style="padding:12px 14px;border:1px solid var(--line2);border-radius:14px"><span class="dot" style="color:' + (n.status === "up" ? "var(--ok)" : n.status === "down" ? "var(--bad)" : "var(--mut)") + '"></span><b>' + esc(n.name) + '</b><span class="muted" style="font-size:13px">checked ' + ago(n.checked) + '</span><span class="right row" style="gap:10px">' + (n.ms ? '<span class="mono muted" style="font-size:13px">' + n.ms + " ms</span>" : "") + '<span class="badge ' + (n.status === "up" ? "ok" : n.status === "down" ? "bad" : "") + '">' + (n.status === "up" ? "Operational" : n.status === "down" ? "Down" : "Unknown") + "</span></span></div>").join("") + "</div>" : empty("server", "No servers have been added yet.")) + "</section>" +
        '<section class="card"><div class="card-head"><div class="ico-box violet">' + ic("key", 24) + '</div><h3>Your key</h3><span class="right">' + NS.planBadge(p.state) + "</span></div>" +
        '<div class="stat3"><div><small>Limit</small><b>' + fmt(p.requests) + "</b></div><div><small>Used</small><b>" + fmt(p.used) + "</b></div><div><small>Left</small><b>" + fmt(p.remaining) + "</b></div></div></section>" +
        '<section class="card"><div class="card-head"><div class="ico-box amber">' + ic("list", 24) + "</div><h3>Last 20 requests</h3></div>" + reqTable(d.logs) + "</section></div>");
      onClick(v, { refresh: () => route() });
    },
  });

  // ------------------------------------------------------------ docs
  NS.route("/docs", {
    mode: () => (state.me ? "app" : "public"),
    async render(el) {
      const key = state.me ? state.me.api_key : "sh-YOUR_API_KEY";
      const host = location.origin;
      const ex = "2296515430";
      const samples = {
        cURL: 'curl "' + host + "/api/v1/name?uid=" + ex + "&key=" + key + '"\n\n# or send the key in a header\ncurl -H "x-api-key: ' + key + '" \\\n  "' + host + "/api/v1/name?uid=" + ex + '"',
        JavaScript: "const res = await fetch(\n  \"" + host + "/api/v1/name?uid=" + ex + "\",\n  { headers: { \"x-api-key\": \"" + key + "\" } }\n);\nconst data = await res.json();\nconsole.log(data.name);",
        Python: "import requests\n\nr = requests.get(\n    \"" + host + "/api/v1/name\",\n    params={\"uid\": \"" + ex + "\"},\n    headers={\"x-api-key\": \"" + key + "\"},\n    timeout=40,\n)\nprint(r.json())",
        PHP: "<?php\n$ctx = stream_context_create(['http' => [\n  'header' => \"x-api-key: " + key + "\\r\\n\",\n  'timeout' => 40,\n]]);\n$json = file_get_contents(\n  \"" + host + "/api/v1/name?uid=" + ex + "\", false, $ctx\n);\n$data = json_decode($json, true);\necho $data['name'];",
      };
      const tabs = Object.keys(samples);
      const body = '<div class="docs">' + NS.pageTitle("Developer Docs", "Everything you need to integrate the name check API.") +
        '<div class="stack stagger"><section class="card"><h3>Base URL</h3><div class="endpoint" style="margin-top:12px">' + esc(host) + "/api/v1</div>" +
        '<h3 style="margin-top:22px">Authentication</h3><p style="margin-top:8px">Send your API key with every request, either as the <code class="mono">key</code> query parameter or in the <code class="mono">x-api-key</code> header. Keys always start with <code class="mono">sh-</code>.</p>' +
        (state.me ? "" : '<div class="alert" style="margin-top:6px">' + ic("info", 20) + '<span><a href="#/register" style="text-decoration:underline">Create an account</a> to get your key. It is already filled into the examples below once you sign in.</span></div>') + "</section>" +
        '<section class="card"><h3>Get a player name</h3><div class="endpoint" style="margin:12px 0"><span class="method">GET</span>/api/v1/name?uid={uid}&amp;region=BD</div>' +
        '<div class="tscroll"><table class="table"><thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td class="mono">uid</td><td>string</td><td>Player UID, 5 to 15 digits. Required.</td></tr><tr><td class="mono">region</td><td>string</td><td>Server region. Default <span class="mono">BD</span>.</td></tr><tr><td class="mono">key</td><td>string</td><td>Your API key (or use the header).</td></tr></tbody></table></div>' +
        '<h3>Example</h3><div class="tabs" id="dtabs">' + tabs.map((t, i) => '<button class="tab ' + (i ? "" : "on") + '" data-act="tab" data-t="' + t + '">' + t + "</button>").join("") + '</div><div class="codewrap"><div class="copy-code">' + btn("Copy", "btn-sm", 'data-act="copycode" style="background:#1e293b;color:#fff"', "copy") + '</div><pre class="code" id="codebox">' + esc(samples.cURL) + "</pre></div>" +
        '<h3>Response</h3><pre class="code">{\n  <span class="k">"success"</span>: <span class="n">true</span>,\n  <span class="k">"uid"</span>: <span class="s">"' + ex + '"</span>,\n  <span class="k">"name"</span>: <span class="s">"PlayerName"</span>,\n  <span class="k">"region"</span>: <span class="s">"BD"</span>,\n  <span class="k">"remaining"</span>: <span class="n">499</span>,\n  <span class="k">"expires_at"</span>: <span class="s">"2026-12-18T10:00:00.000Z"</span>\n}</pre></section>' +
        '<section class="card"><h3>Full player info</h3><div class="endpoint" style="margin:12px 0"><span class="method">GET</span>/api/v1/player?uid={uid}</div><p>Returns the name plus level, likes, guild and rank details when the server provides them. Counts as one request.</p></section>' +
        '<section class="card"><h3>Check your usage</h3><div class="endpoint" style="margin:12px 0"><span class="method">GET</span>/api/v1/usage</div><p>Returns your package, remaining requests and expiry. This call is free and is not counted.</p><pre class="code"><span class="k">{ "success"</span>: <span class="n">true</span>, <span class="k">"plan"</span>: <span class="s">"Starter"</span>, <span class="k">"status"</span>: <span class="s">"active"</span>, <span class="k">"requests"</span>: <span class="n">500</span>, <span class="k">"used"</span>: <span class="n">3</span>, <span class="k">"remaining"</span>: <span class="n">497</span> <span class="k">}</span></pre></section>' +
        '<section class="card"><h3>Errors</h3><p>Failed calls return <span class="mono">success: false</span> with a machine-readable <span class="mono">code</span>.</p><div class="tscroll"><table class="table"><thead><tr><th>HTTP</th><th>Code</th><th>Meaning</th></tr></thead><tbody>' +
        [["400", "invalid_uid", "UID is not 5 to 15 digits."], ["401", "invalid_key", "Key is missing or wrong."], ["402", "no_plan / expired / limit_reached", "No package, package expired, or request limit used up. Renew on the website."], ["403", "key_disabled", "The key or account is disabled."], ["404", "not_found", "Player does not exist. Not counted."], ["429", "rate_limited", "Too many requests per minute."], ["502", "upstream_unavailable", "Lookup servers are down. Not counted."]].map((r) => "<tr><td><b>" + r[0] + '</b></td><td class="mono" style="font-size:12.5px">' + r[1] + "</td><td>" + r[2] + "</td></tr>").join("") + "</tbody></table></div>" +
        '<p style="margin-top:12px" class="muted">A request is only deducted when a name is returned successfully. Not found and server errors are refunded automatically.</p></section></div></div>';
      const v = mountView(el, body);
      let cur = "cURL";
      onClick(v, {
        tab: (t) => { cur = t.dataset.t; $$(".tab", v).forEach((x) => x.classList.toggle("on", x === t)); $("#codebox", v).textContent = samples[cur]; },
        copycode: (t) => copyText(samples[cur], t),
      });
    },
  });

  // ------------------------------------------------------------ rules
  const DEFAULT_RULES = [
    "One account per person. Your API key is personal; do not share, sell or publish it. Keys found in public code may be disabled.",
    "A request is counted only when a player name is returned. Not found results and server errors are not counted.",
    "Each package has a request limit and an expiry date. When either is reached, the API stops working until you buy or renew a package.",
    "Buying a package while one is active adds the requests and extends the expiry date. Expired packages do not carry over unused requests.",
    "Wallet balance is added after a deposit is verified. Wrong or fake transaction IDs are rejected and repeated abuse leads to suspension.",
    "Do not use the service for harassment, spam or any activity that breaks the game's terms of service.",
    "Respect the rate limit. Excessive or abusive traffic may be throttled or blocked without notice.",
    "Lookup servers depend on third-party data and may be unavailable from time to time. We do not guarantee 100% uptime.",
    "We may suspend accounts that break these rules. Rules can be updated at any time; continued use means you accept them.",
  ];
  NS.route("/rules", {
    mode: () => (state.me ? "app" : "public"),
    async render(el) {
      let rules = DEFAULT_RULES;
      try { const r = await api("GET", "/public"); state.pub = r; if (r.rules && r.rules.length) rules = r.rules; } catch (e) {}
      mountView(el, '<div class="rules">' + NS.pageTitle("Rules & Terms", "Please read these before using the service.") +
        '<section class="card"><ol>' + rules.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ol></section>" +
        (state.pub && state.pub.support_link ? '<p class="muted" style="margin-top:16px">Questions? Contact support: <a href="' + esc(state.pub.support_link) + '" target="_blank" rel="noopener">' + esc(state.pub.support_link) + "</a></p>" : "") + "</div>");
    },
  });

  NS.route("/404", {
    mode: () => (state.me ? "app" : "public"),
    async render(el) {
      mountView(el, '<div class="card empty" style="max-width:480px;margin:60px auto">' + ic("search", 40) + '<h3 style="margin:10px 0 6px">Page not found</h3><p>The page you are looking for does not exist.</p><div style="margin-top:16px"><a class="btn btn-primary" href="#/"><span class="lbl">Go home</span></a></div></div>');
    },
  });

  // ------------------------------------------------------------ boot
  NS.start = async function () {
    try {
      const [pub] = await Promise.all([api("GET", "/public"), refreshMe()]);
      state.pub = pub;
      document.title = pub.site_name + " | Name Check API";
      if (state.me && pub.announcement) setTimeout(() => { const p = $("#pip"); if (p) p.classList.remove("hide"); }, 400);
    } catch (e) {
      $("#app").innerHTML = '<div class="boot"><div class="card empty">' + ic("alert", 38) + "<h3>Cannot reach the server</h3><p>" + esc(e.message) + '</p><div style="margin-top:14px"><button class="btn btn-primary" onclick="location.reload()"><span class="lbl">Reload</span></button></div></div></div>';
      return;
    }
    route();
  };
  // admin.js যোগ হওয়ার পর শুরু
  window.addEventListener("DOMContentLoaded", () => { setTimeout(NS.start, 0); });
})();
