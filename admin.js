/* Admin panel pages */
(function () {
  "use strict";
  const NS = window.NS;
  const { $, $$, esc, ic, api, toast, busy, modal, btn, fmt, bdt, dt, ago, mountView, skeleton, onClick, empty, pageTitle, state } = NS;
  const confirmBox = NS.confirm;
  const R = (path, render) => NS.route(path, { mode: "admin", role: "admin", render });
  const sw = (on, attrs) => '<button type="button" class="switch ' + (on ? "on" : "") + '" data-sw ' + (attrs || "") + ' aria-pressed="' + !!on + '"></button>';
  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-sw]");
    if (s) { s.classList.toggle("on"); s.setAttribute("aria-pressed", s.classList.contains("on")); }
  });
  const isOn = (el) => el.classList.contains("on");
  const field = (label, input, hint) => '<div class="field"><label>' + label + "</label>" + input + (hint ? '<span class="hint">' + hint + "</span>" : "") + "</div>";

  // ------------------------------------------------------------ overview
  R("/admin", async (el, alive) => {
    skeleton(el);
    const s = await api("GET", "/admin/stats");
    if (!alive()) return;
    const kp = (icon, tone, label, val, money) => '<div class="card kpi hover"><div class="ico-box ' + tone + '">' + ic(icon, 24) + "</div><small>" + label + '</small><b data-count="' + val + '"' + (money ? ' data-money="1"' : "") + ">0</b></div>";
    const v = mountView(el, pageTitle("Admin Overview", "Sales, users and system health at a glance.") +
      '<div class="stack stagger"><div class="kpis stagger">' +
      kp("users", "", "Users", s.users) + kp("zap", "green", "Active packages", s.active_plans) + kp("wallet", "violet", "Revenue", s.revenue, true) + kp("card", "amber", "Packages sold", s.sales) + "</div>" +
      (s.pending ? '<div class="alert warn">' + ic("alert", 20) + "<span>" + s.pending + " deposit request" + (s.pending > 1 ? "s are" : " is") + " waiting for approval (" + bdt(s.pending_amount) + '). <a href="#/admin/deposits" style="text-decoration:underline">Review now</a></span></div>' : "") +
      (s.servers.total === 0 ? '<div class="alert bad">' + ic("server", 20) + '<span>No lookup server added yet. The API will not work until you add one. <a href="#/admin/servers" style="text-decoration:underline">Add server</a></span></div>'
        : s.servers.down > 0 ? '<div class="alert warn">' + ic("server", 20) + "<span>" + s.servers.down + " of " + s.servers.total + ' servers are down. <a href="#/admin/servers" style="text-decoration:underline">Check servers</a></span></div>' : "") +
      '<section class="card"><div class="card-head"><div class="ico-box green">' + ic("chart", 24) + '</div><div class="grow"><h3>API requests, last 7 days</h3><p class="muted" style="font-size:13px">Successful lookups, all users</p></div></div>' + NS.bars(s.usage, 7) + "</section></div>");
    NS.countUp(v);
  });

  // ------------------------------------------------------------ users
  R("/admin/users", async (el, alive) => {
    let q = "", page = 1;
    const v = mountView(el, pageTitle("Users", "Search, manage balance and packages, regenerate keys.") +
      '<div class="stack"><div class="input-wrap"><input class="input" id="usearch" placeholder="Search by name or email" autocomplete="off"><span class="eye" style="pointer-events:none;color:var(--mut)">' + ic("search", 20) + '</span></div><div id="ulist"><div class="skel" style="height:200px"></div></div></div>');
    const list = $("#ulist", v);
    async function load() {
      const d = await api("GET", "/admin/users?q=" + encodeURIComponent(q) + "&page=" + page);
      if (!alive()) return;
      const pages = Math.max(1, Math.ceil(d.total / d.per));
      list.innerHTML = '<section class="card">' + (d.users.length ? '<div class="tscroll"><table class="table stack-m"><thead><tr><th>User</th><th>Balance</th><th>Package</th><th>Left</th><th>Joined</th><th></th></tr></thead><tbody>' +
        d.users.map((u) => '<tr><td data-l="User"><div><b>' + esc(u.name) + "</b>" + (u.role === "admin" ? ' <span class="badge blue">admin</span>' : "") + (u.banned ? ' <span class="badge bad">suspended</span>' : "") + '<div class="muted" style="font-size:13px">' + esc(u.email) + '</div></div></td><td data-l="Balance">' + bdt(u.balance) + '</td><td data-l="Package">' + NS.planBadge(u.plan.state) + '</td><td data-l="Left"><div>' + fmt(u.plan.remaining) + (u.plan.expires_at ? '<div class="hint">' + (u.plan.state === "expired" ? "ended " : "until ") + NS.dshort(u.plan.expires_at) + "</div>" : "") + '</div></td><td data-l="Joined">' + NS.dshort(u.created_at) + '</td><td class="actions">' + btn("Manage", "btn-soft btn-sm", 'data-act="manage" data-id="' + u.id + '"', "edit") + "</td></tr>").join("") + "</tbody></table></div>" +
        '<div class="row" style="justify-content:space-between;margin-top:14px"><span class="muted" style="font-size:13px">' + d.total + " users &middot; page " + page + " of " + pages + "</span><span class=\"row\">" +
        btn("Prev", "btn-ghost btn-sm", 'data-act="prev"' + (page <= 1 ? " disabled" : "")) + btn("Next", "btn-ghost btn-sm", 'data-act="next"' + (page >= pages ? " disabled" : "")) + "</span></div>" : empty("users", "No users found.")) + "</section>";
      list._users = d.users;
    }
    await load();
    let tm;
    $("#usearch", v).addEventListener("input", (e) => { clearTimeout(tm); tm = setTimeout(() => { q = e.target.value.trim(); page = 1; load(); }, 300); });
    onClick(v, {
      prev: () => { page--; load(); }, next: () => { page++; load(); },
      manage: (t) => openUser(list._users.find((u) => String(u.id) === t.dataset.id), load),
    });
  });

  function openUser(u, reload) {
    const p = u.plan;
    const m = modal('<div class="row"><div class="ico-box violet">' + ic("user", 24) + '</div><div class="grow"><h3 style="margin:0">' + esc(u.name) + '</h3><div class="muted" style="font-size:13px">' + esc(u.email) + "</div></div>" + NS.planBadge(p.state) + "</div>" +
      '<div class="stat3" style="margin:16px 0"><div><small>Balance</small><b style="font-size:17px">' + bdt(u.balance) + '</b></div><div><small>Used</small><b style="font-size:17px">' + fmt(p.used) + '</b></div><div><small>Left</small><b style="font-size:17px">' + fmt(p.remaining) + "</b></div></div>" +
      '<div class="keybox"><code id="ukey">' + esc(u.api_key) + "</code>" + btn("Copy", "btn-ghost btn-sm", 'data-act="ckey"', "copy") + "</div>" +
      '<div class="row" style="margin:12px 0 4px">' + btn("New key", "btn-ghost btn-sm", 'data-act="regen"', "refresh") + btn(u.key_active ? "Disable key" : "Enable key", "btn-ghost btn-sm", 'data-act="keytoggle"', "key") +
      btn("Revoke package", "btn-ghost btn-sm", 'data-act="revoke"', "x") + (u.role !== "admin" ? btn(u.banned ? "Unsuspend" : "Suspend", u.banned ? "btn-ok btn-sm" : "btn-danger btn-sm", 'data-act="ban"', "ban") : "") + "</div>" +
      '<hr style="border:0;border-top:1px solid var(--line2);margin:16px 0">' +
      '<form id="fbal"><h3 style="font-size:16px;margin-bottom:10px">Adjust balance</h3><div class="grid2">' + field("Amount (BDT)", '<input class="input" name="amount" inputmode="decimal" placeholder="e.g. 100 or -50" required>') + field("Note", '<input class="input" name="note" placeholder="optional">') + "</div>" + btn("Apply", "btn-dark btn-sm", 'type="submit"', "wallet") + "</form>" +
      '<hr style="border:0;border-top:1px solid var(--line2);margin:16px 0">' +
      '<form id="fgr"><h3 style="font-size:16px;margin-bottom:10px">Grant package (generate access)</h3><div class="grid2">' + field("Requests", '<input class="input" name="requests" inputmode="numeric" placeholder="e.g. 1000" required>') + field("Days", '<input class="input" name="days" inputmode="numeric" placeholder="e.g. 30" required>') + "</div>" +
      '<div class="grid2">' + field("Name", '<input class="input" name="name" placeholder="Admin grant">') + field("Mode", '<select class="input" name="mode"><option value="add">Add to current package</option><option value="set">Replace package</option></select>') + "</div>" + btn("Grant", "btn-primary btn-sm", 'type="submit"', "zap") + "</form>" +
      '<div class="m-actions">' + btn("Close", "btn-ghost", "data-close") + "</div>", { noFocus: true });
    const done = (msg) => { toast(msg); m.close(); reload(); };
    const call = async (b, path, body, msg) => { try { await busy(b, () => api("POST", "/admin/users/" + u.id + path, body)); done(msg); } catch (e) { toast(e.message, "err"); } };
    onClick(m.el, {
      ckey: (t) => NS.copy(u.api_key, t),
      regen: async (t) => { if (await confirmBox("Generate a new key?", "The old key stops working immediately.", "Generate", true)) call(t, "/regen-key", {}, "New key generated"); },
      keytoggle: (t) => call(t, "/key-active", { active: !u.key_active }, u.key_active ? "Key disabled" : "Key enabled"),
      revoke: async (t) => { if (await confirmBox("Revoke package?", "Remaining requests and validity will be removed.", "Revoke", true)) call(t, "/revoke-plan", {}, "Package revoked"); },
      ban: (t) => call(t, "/ban", { banned: !u.banned }, u.banned ? "User unsuspended" : "User suspended"),
    });
    $("#fbal", m.el).addEventListener("submit", (e) => { e.preventDefault(); const f = e.target; call($("[type=submit]", f), "/balance", { amount: f.amount.value, note: f.note.value }, "Balance updated"); });
    $("#fgr", m.el).addEventListener("submit", (e) => { e.preventDefault(); const f = e.target; call($("[type=submit]", f), "/grant", { requests: f.requests.value, days: f.days.value, name: f.name.value, mode: f.mode.value }, "Package granted"); });
  }

  // ------------------------------------------------------------ packages
  R("/admin/packages", async (el, alive) => {
    skeleton(el);
    const d = await api("GET", "/admin/packages");
    if (!alive()) return;
    const v = mountView(el, pageTitle("Packages", "Set the request count, validity and price users can buy.", btn("New package", "btn-primary btn-sm", 'data-act="new"', "plus")) +
      '<section class="card">' + (d.packages.length ? '<div class="tscroll"><table class="table stack-m"><thead><tr><th>Name</th><th>Price</th><th>Requests</th><th>Days</th><th>Status</th><th></th></tr></thead><tbody>' +
        d.packages.map((p) => '<tr><td data-l="Name"><div><b>' + esc(p.name) + '</b><div class="muted" style="font-size:13px">' + esc(p.description) + '</div></div></td><td data-l="Price">' + bdt(p.price) + '</td><td data-l="Requests">' + fmt(p.requests) + '</td><td data-l="Days">' + p.days + '</td><td data-l="Status"><span class="badge ' + (p.active ? "ok" : "") + '">' + (p.active ? "Visible" : "Hidden") + '</span></td><td class="actions"><span class="row" style="justify-content:flex-end;gap:6px">' + btn("", "btn-soft btn-sm btn-icon", 'data-act="edit" data-id="' + p.id + '" aria-label="Edit"', "edit") + btn("", "btn-danger btn-sm btn-icon", 'data-act="del" data-id="' + p.id + '" aria-label="Delete"', "trash") + "</span></td></tr>").join("") + "</tbody></table></div>" : empty("pkg", "No packages yet. Create the first one.")) + "</section>");
    function form(p) {
      p = p || { name: "", description: "", price: "", requests: "", days: "", sort: 0, active: true };
      const m = modal("<h3>" + (p.id ? "Edit package" : "New package") + '</h3><form style="margin-top:14px"><div class="form-err" id="pe"></div>' +
        field("Name", '<input class="input" name="name" value="' + esc(p.name) + '" required maxlength="40">') + field("Description", '<input class="input" name="description" value="' + esc(p.description) + '" maxlength="160" placeholder="Short line shown on the card">') +
        '<div class="grid2">' + field("Price (BDT)", '<input class="input" name="price" inputmode="decimal" value="' + esc(p.price) + '" required>') + field("Requests", '<input class="input" name="requests" inputmode="numeric" value="' + esc(p.requests) + '" required>') + "</div>" +
        '<div class="grid2">' + field("Validity (days)", '<input class="input" name="days" inputmode="numeric" value="' + esc(p.days) + '" required>') + field("Sort order", '<input class="input" name="sort" inputmode="numeric" value="' + esc(p.sort) + '">', "Lower shows first") + "</div>" +
        '<div class="row" style="margin-bottom:6px"><b>Visible to users</b><span class="right">' + sw(p.active, 'id="pact"') + "</span></div>" +
        '<div class="m-actions">' + btn("Cancel", "btn-ghost", 'type="button" data-close') + btn("Save", "btn-primary", 'type="submit"', "check") + "</div></form>");
      $("form", m.el).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target, er = $("#pe", m.el); er.classList.remove("show");
        const body = { name: f.name.value, description: f.description.value, price: f.price.value, requests: f.requests.value, days: f.days.value, sort: f.sort.value, active: isOn($("#pact", m.el)) };
        try { await busy($("[type=submit]", f), () => api(p.id ? "PUT" : "POST", "/admin/packages" + (p.id ? "/" + p.id : ""), body)); toast("Package saved"); m.close(); NS.refreshRoute(); }
        catch (x) { er.textContent = x.message; er.classList.add("show"); }
      });
    }
    onClick(v, {
      new: () => form(),
      edit: (t) => form(d.packages.find((p) => String(p.id) === t.dataset.id)),
      del: async (t) => {
        if (!(await confirmBox("Delete package?", "If users already bought it, it will be hidden instead of deleted.", "Delete", true))) return;
        try { const r = await api("DELETE", "/admin/packages/" + t.dataset.id); toast(r.hidden ? "Package hidden (it has sales)" : "Package deleted"); NS.refreshRoute(); } catch (x) { toast(x.message, "err"); }
      },
    });
  });

  // ------------------------------------------------------------ deposits
  R("/admin/deposits", async (el, alive) => {
    let st = "pending";
    const v = mountView(el, pageTitle("Deposits", "Verify the transaction ID in your payment app, then approve.") +
      '<div class="stack"><div class="tabs" id="dtab">' + ["pending", "approved", "rejected", "all"].map((s) => '<button class="tab ' + (s === st ? "on" : "") + '" data-act="st" data-s="' + s + '">' + s[0].toUpperCase() + s.slice(1) + "</button>").join("") + '</div><div id="dlist"></div></div>');
    const list = $("#dlist", v);
    async function load() {
      list.innerHTML = '<div class="skel" style="height:160px"></div>';
      const d = await api("GET", "/admin/deposits" + (st === "all" ? "" : "?status=" + st));
      if (!alive()) return;
      list.innerHTML = '<section class="card">' + (d.deposits.length ? '<div class="tscroll"><table class="table stack-m"><thead><tr><th>User</th><th>Method</th><th>Paid from</th><th>Trx ID</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>' +
        d.deposits.map((x) => '<tr><td data-l="User"><div><b>' + esc(x.name) + '</b><div class="muted" style="font-size:13px">' + esc(x.email) + '</div><div class="hint">' + dt(x.created_at) + '</div></div></td><td data-l="Method">' + esc(x.method) + '</td><td data-l="From" class="mono">' + esc(x.sender) + '</td><td data-l="Trx ID" class="mono">' + esc(x.trx_id) + '</td><td data-l="Amount" class="num"><b>' + bdt(x.amount) + '</b></td><td data-l="Status"><span class="badge ' + ({ pending: "warn", approved: "ok", rejected: "bad" }[x.status]) + '">' + x.status + "</span></td><td class=\"actions\">" +
          (x.status === "pending" ? '<span class="row" style="justify-content:flex-end;gap:6px">' + btn("Approve", "btn-ok btn-sm", 'data-act="ok" data-id="' + x.id + '"', "check") + btn("Reject", "btn-danger btn-sm", 'data-act="no" data-id="' + x.id + '"', "x") + "</span>" : "") + "</td></tr>").join("") + "</tbody></table></div>" : empty("card", "Nothing here.")) + "</section>";
    }
    await load();
    onClick(v, {
      st: (t) => { st = t.dataset.s; $$(".tab", v).forEach((x) => x.classList.toggle("on", x === t)); load(); },
      ok: async (t) => { if (!(await confirmBox("Approve deposit?", "The amount will be added to the user's balance.", "Approve"))) return; try { await busy(t, () => api("POST", "/admin/deposits/" + t.dataset.id + "/approve")); toast("Deposit approved"); load(); } catch (x) { toast(x.message, "err"); load(); } },
      no: (t) => {
        const m = modal("<h3>Reject deposit</h3><form style=\"margin-top:12px\">" + field("Reason (shown to user)", '<input class="input" name="note" placeholder="e.g. Transaction ID not found" maxlength="120">') + '<div class="m-actions">' + btn("Cancel", "btn-ghost", 'type="button" data-close') + btn("Reject", "btn-danger", 'type="submit"') + "</div></form>");
        $("form", m.el).addEventListener("submit", async (e) => { e.preventDefault(); try { await busy($("[type=submit]", e.target), () => api("POST", "/admin/deposits/" + t.dataset.id + "/reject", { note: e.target.note.value })); toast("Deposit rejected"); m.close(); load(); } catch (x) { toast(x.message, "err"); } });
      },
    });
  });

  // ------------------------------------------------------------ servers
  R("/admin/servers", async (el, alive) => {
    skeleton(el);
    const d = await api("GET", "/admin/servers");
    if (!alive()) return;
    const dot = (s) => '<span class="dot" style="color:' + (s === "up" ? "var(--ok)" : s === "down" ? "var(--bad)" : "var(--mut)") + '"></span>';
    const v = mountView(el, pageTitle("Servers", "Name check servers the gateway connects to. Requests fail over to the next one automatically.", btn("Add server", "btn-primary btn-sm", 'data-act="new"', "plus")) +
      '<div class="stack"><div class="alert">' + ic("info", 20) + "<span>Add the base URL of your name check server (for example <b>https://your-app.onrender.com</b>) and the key set in its <b>API_KEYS</b> variable. Servers are health-checked every 4 minutes, which also keeps free hosts awake.</span></div>" +
      (d.servers.length ? '<div class="cols">' + d.servers.map((s) => '<div class="card hover"><div class="row">' + dot(s.last_status) + "<b>" + esc(s.name) + '</b><span class="right badge ' + (s.active ? "ok" : "") + '">' + (s.active ? "Active" : "Paused") + '</span></div><div class="mono muted" style="font-size:12.5px;margin:10px 0;word-break:break-all">' + esc(s.base_url) + '</div><div class="row" style="font-size:13px"><span class="badge ' + (s.last_status === "up" ? "ok" : s.last_status === "down" ? "bad" : "") + '">' + (s.last_status === "up" ? "Operational" : s.last_status === "down" ? "Down" : "Unknown") + "</span><span class=\"muted\">" + (s.last_ms ? s.last_ms + " ms &middot; " : "") + "checked " + ago(s.last_checked) + "</span></div>" +
        '<div class="row" style="margin-top:14px;gap:8px">' + btn("Test", "btn-soft btn-sm", 'data-act="test" data-id="' + s.id + '"', "activity") + btn("Edit", "btn-ghost btn-sm", 'data-act="edit" data-id="' + s.id + '"', "edit") + btn("", "btn-danger btn-sm btn-icon", 'data-act="del" data-id="' + s.id + '" aria-label="Delete"', "trash") + "</div></div>").join("") + "</div>" : '<div class="card">' + empty("server", "No servers yet. Add your first one.") + "</div>") + "</div>");
    function form(s) {
      s = s || { name: "", base_url: "", priority: 10, active: true, has_key: false };
      const m = modal("<h3>" + (s.id ? "Edit server" : "Add server") + '</h3><form style="margin-top:14px"><div class="form-err" id="se"></div>' +
        field("Name", '<input class="input" name="name" value="' + esc(s.name) + '" placeholder="Server 1" maxlength="40">') + field("Base URL", '<input class="input" name="base_url" value="' + esc(s.base_url) + '" placeholder="https://your-app.onrender.com" inputmode="url" required>') +
        field("Server key", '<input class="input" name="secret_key" type="password" autocomplete="off" placeholder="' + (s.has_key ? "Saved. Leave blank to keep" : "Value of API_KEYS on that server") + '">') +
        field("Priority", '<input class="input" name="priority" inputmode="numeric" value="' + esc(s.priority) + '">', "Lower number is tried first") +
        '<div class="row" style="margin-bottom:6px"><b>Active</b><span class="right">' + sw(s.active, 'id="sact"') + "</span></div>" +
        '<div class="m-actions">' + btn("Cancel", "btn-ghost", 'type="button" data-close') + btn("Save", "btn-primary", 'type="submit"', "check") + "</div></form>");
      $("form", m.el).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target, er = $("#se", m.el); er.classList.remove("show");
        const body = { name: f.name.value, base_url: f.base_url.value, priority: f.priority.value, active: isOn($("#sact", m.el)) };
        if (f.secret_key.value) body.secret_key = f.secret_key.value;
        try { await busy($("[type=submit]", f), () => api(s.id ? "PUT" : "POST", "/admin/servers" + (s.id ? "/" + s.id : ""), body)); toast("Server saved"); m.close(); NS.refreshRoute(); }
        catch (x) { er.textContent = x.message; er.classList.add("show"); }
      });
    }
    onClick(v, {
      new: () => form(),
      edit: (t) => form(d.servers.find((s) => String(s.id) === t.dataset.id)),
      test: async (t) => { try { const r = await busy(t, () => api("POST", "/admin/servers/" + t.dataset.id + "/test")); toast(r.status === "up" ? "Server is up (" + r.ms + " ms)" : "Server is not responding", r.status === "up" ? "ok" : "err"); NS.refreshRoute(); } catch (x) { toast(x.message, "err"); } },
      del: async (t) => { if (!(await confirmBox("Remove server?", "The gateway will stop using it.", "Remove", true))) return; try { await api("DELETE", "/admin/servers/" + t.dataset.id); toast("Server removed"); NS.refreshRoute(); } catch (x) { toast(x.message, "err"); } },
    });
  });

  // ------------------------------------------------------------ settings
  R("/admin/settings", async (el, alive) => {
    skeleton(el);
    const { settings: s } = await api("GET", "/admin/settings");
    if (!alive()) return;
    const methodRow = (m) => '<div class="card" style="padding:14px;box-shadow:none" data-method><div class="grid2">' + field("Name", '<input class="input" data-k="name" value="' + esc(m.name) + '" placeholder="bKash">') + field("Number", '<input class="input" data-k="number" value="' + esc(m.number) + '" inputmode="tel" placeholder="01XXXXXXXXX">') + "</div>" +
      '<div class="grid2">' + field("Type", '<input class="input" data-k="type" value="' + esc(m.type) + '" placeholder="Personal / Merchant">') + '<div class="field"><label>Enabled</label><div style="min-height:48px;display:flex;align-items:center;gap:12px">' + sw(m.enabled, 'data-k="enabled"') + btn("Remove", "btn-danger btn-sm", 'type="button" data-act="rmm"', "trash") + '</div></div></div><input type="hidden" data-k="id" value="' + esc(m.id) + '"></div>';
    const v = mountView(el, pageTitle("Settings", "Site details, payment numbers and rules.") +
      '<form class="stack"><section class="card"><h3 style="margin-bottom:14px">General</h3>' + field("Site name", '<input class="input" name="site_name" value="' + esc(s.site_name) + '" maxlength="40">') +
      field("Announcement", '<input class="input" name="announcement" value="' + esc(s.announcement) + '" maxlength="300" placeholder="Shown to users as a notice. Leave blank for none.">') +
      '<div class="grid2">' + field("Minimum deposit (BDT)", '<input class="input" name="min_deposit" inputmode="decimal" value="' + esc(s.min_deposit) + '">') + field("Support link", '<input class="input" name="support_link" value="' + esc(s.support_link) + '" placeholder="https://t.me/yourname">') + "</div></section>" +
      '<section class="card"><div class="card-head"><h3>Payment methods</h3><span class="right">' + btn("Add method", "btn-soft btn-sm", 'type="button" data-act="addm"', "plus") + '</span></div><div class="stack" id="mlist">' + s.payment_methods.map(methodRow).join("") + "</div></section>" +
      '<section class="card"><h3 style="margin-bottom:6px">Rules &amp; Terms</h3><p class="hint" style="margin-bottom:10px">One rule per line. Leave empty to use the default rules.</p><textarea class="input" name="rules" rows="8" maxlength="4000">' + esc(s.rules) + "</textarea></section>" +
      '<div class="form-err" id="ge"></div>' + btn("Save settings", "btn-primary btn-lg", 'type="submit"', "check") + "</form>");
    onClick(v, {
      addm: () => { const d = document.createElement("div"); d.innerHTML = methodRow({ id: "m" + Date.now().toString(36), name: "", number: "", type: "Personal", enabled: true }); $("#mlist", v).appendChild(d.firstElementChild); },
      rmm: (t) => t.closest("[data-method]").remove(),
    });
    $("form", v).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, er = $("#ge", v); er.classList.remove("show");
      const methods = $$("[data-method]", v).map((r) => ({ id: $("[data-k=id]", r).value, name: $("[data-k=name]", r).value, number: $("[data-k=number]", r).value, type: $("[data-k=type]", r).value, enabled: isOn($("[data-k=enabled]", r)) }));
      try {
        await busy($("[type=submit]", f), () => api("PUT", "/admin/settings", { site_name: f.site_name.value, announcement: f.announcement.value, min_deposit: f.min_deposit.value, support_link: f.support_link.value, rules: f.rules.value, payment_methods: methods }));
        toast("Settings saved");
        const p = await api("GET", "/public"); state.pub = p; document.title = p.site_name + " | Name Check API";
      } catch (x) { er.textContent = x.message; er.classList.add("show"); }
    });
  });

  // ------------------------------------------------------------ logs
  R("/admin/logs", async (el, alive) => {
    skeleton(el);
    const d = await api("GET", "/admin/logs");
    if (!alive()) return;
    mountView(el, pageTitle("Request Logs", "Last 100 API calls across all users.") + '<section class="card">' + (d.logs.length ? '<div class="tscroll"><table class="table stack-m"><thead><tr><th>Time</th><th>User</th><th>Endpoint</th><th>UID</th><th>Result</th><th class="num">Time</th></tr></thead><tbody>' +
      d.logs.map((r) => '<tr><td data-l="Time">' + dt(r.created_at) + '</td><td data-l="User">' + esc(r.email || "-") + '</td><td data-l="Endpoint" class="mono">/' + esc(r.kind) + '</td><td data-l="UID" class="mono">' + esc(r.uid_queried) + '</td><td data-l="Result"><span class="badge ' + (r.status === "ok" ? "ok" : r.status === "not_found" ? "warn" : "bad") + '">' + (r.status === "ok" ? "Success" : r.status === "not_found" ? "Not found" : "Error " + (r.http || "")) + '</span></td><td data-l="Duration" class="num">' + (r.ms || 0) + " ms</td></tr>").join("") + "</tbody></table></div>" : empty("list", "No requests yet.")) + "</section>");
  });
})();
