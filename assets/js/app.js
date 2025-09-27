"use strict";

(function () {
  const state = {
    supabase: window.__supabase__ || null,
    config: window.__appConfig__ || {},
    offline: window.__offlineMode__ !== false,
    reports: [],
    auditLogs: [],
    user: null,
    authListenerBound: false,
    flowNotes: {}
  };

  const LOCAL_KEYS = {
    reports: "sv_reports",
    audit: "sv_audit_logs"
  };

  const pages = {
    home: document.getElementById("page-home"),
    report: document.getElementById("page-report"),
    dashboard: document.getElementById("page-dashboard"),
    flow: document.getElementById("page-flow"),
    audit: document.getElementById("page-audit"),
    auth: document.getElementById("page-auth")
  };

  const sidebar = document.getElementById("sidebar");
  const cardsEl = document.getElementById("cards");
  const emptyMsg = document.getElementById("emptyMsg");
  const filterCat = document.getElementById("filterCat");
  const filterStatus = document.getElementById("filterStatus");
  const summaryChips = document.getElementById("summaryChips");
  const searchInput = document.getElementById("searchInput");
  const flowSelect = document.getElementById("flowSelect");
  const flowTitle = document.getElementById("flowTitle");
  const flowCat = document.getElementById("flowCat");
  const flowStatus = document.getElementById("flowStatus");
  const flowOwner = document.getElementById("flowOwner");
  const flowDate = document.getElementById("flowDate");
  const actionList = document.getElementById("actionList");
  const actOwnerInput = document.getElementById("actOwner");
  const actTitleInput = document.getElementById("actTitle");
  const addActionBtn = document.getElementById("addAction");
  const btnPrint = document.getElementById("btnPrint");
  const auditSummary = document.getElementById("auditSummary");
  const auditTbody = document.getElementById("auditTbody");
  const btnAuditCsv = document.getElementById("btnAuditCsv");
  const btnAuditClear = document.getElementById("btnAuditClear");
  const newPageBtn = document.getElementById("newPageBtn");
  const authEmail = document.getElementById("authEmail");
  const authOtp = document.getElementById("authOtp");
  const authStatus = document.getElementById("authStatus");
  const btnOtpSend = document.getElementById("btnOtpSend");
  const btnOtpVerify = document.getElementById("btnOtpVerify");
  const authStateLabel = document.getElementById("authStateLabel");
  const logoutBtn = document.getElementById("btnLogout");

  initTheme();
  setupSidebar();
  setupNavigation();
  setupReportForm();
  setupDashboard();
  setupFlow();
  setupAudit();
  setupAuth();
  loadLocalSnapshots();
  showPage("home");
  renderDashboard();
  renderFlowInit();
  renderAudit();
  updateAuthState();

  document.addEventListener("sv:supabase-ready", handleSupabaseReady);

  function handleSupabaseReady(event) {
    state.supabase = event?.detail?.supabase || null;
    state.config = event?.detail?.config || {};
    state.offline = !state.supabase;
    updateAuthState();

    if (state.supabase && !state.authListenerBound) {
      state.authListenerBound = true;
      state.supabase.auth
        .getUser()
        .then(({ data }) => {
          state.user = data?.user || null;
          updateAuthState();
        })
        .catch((err) => console.warn("getUser failed", err));

      state.supabase.auth.onAuthStateChange((_eventName, session) => {
        state.user = session?.user || null;
        updateAuthState();
      });
    }

    refreshRemoteData();
  }

  async function refreshRemoteData() {
    if (!state.supabase) return;
    await ensureReports(true);
    await ensureAuditLogs(true);
    renderDashboard();
    renderFlowInit();
    renderAudit();
  }

  function initTheme() {
    const root = document.documentElement;
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const eff = saved || (prefersDark ? "dark" : "light");
    root.setAttribute("data-theme", eff);
    const icon = document.getElementById("themeIcon");
    if (icon) icon.textContent = eff === "dark" ? "☀️" : "🌙";
    document.getElementById("themeToggle")?.addEventListener("click", () => {
      const now = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", now);
      localStorage.setItem("theme", now);
      if (icon) icon.textContent = now === "dark" ? "☀️" : "🌙";
    });
  }

  function setupSidebar() {
    document.getElementById("sidebarOpen")?.addEventListener("click", () => {
      sidebar?.classList.add("is-open");
    });
    document.getElementById("sidebarClose")?.addEventListener("click", () => {
      sidebar?.classList.remove("is-open");
    });
  }

  function setupNavigation() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest?.(".js-nav, .js-link");
      if (!target) return;
      const name = target.dataset.target;
      if (!name || !pages[name]) {
        console.warn("未対応のページが指定されました", name);
        return;
      }
      event.preventDefault();
      showPage(name);
    });
  }

  function loadLocalSnapshots() {
    updateReportsCache(readLocal(LOCAL_KEYS.reports));
    updateAuditCache(readLocal(LOCAL_KEYS.audit));
  }

  function setupReportForm() {
    const form = document.getElementById("reportForm");
    if (!form) return;
    const titleEl = document.getElementById("f_title");
    const catEl = document.getElementById("f_category");
    const bodyEl = document.getElementById("f_body");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = titleEl?.value?.trim();
      const category = catEl?.value;
      const body = bodyEl?.value?.trim();
      if (!title || !category || !body) {
        alert("件名・カテゴリ・本文は必須です。");
        return;
      }
      const record = await repoCreate({ title, category, body }, { notify: true });
      await addAudit("report.create", record.id, `category=${category}`);
      form.reset();
      renderDashboard();
      renderFlowInit();
      alert("保存しました。ダッシュボードに反映されます。");
      showPage("dashboard");
    });

    newPageBtn?.addEventListener("click", () => {
      const now = new Date();
      const record = {
        id: `local-${now.getTime()}`,
        title: "サンプル通報",
        category: "労働環境",
        body: "残業が多く発生しています。改善を検討したいです。",
        status: "未対応",
        assignee: "",
        date: formatDate(now),
        createdAt: now.toISOString()
      };
      updateReportsCache([record, ...state.reports]);
      renderDashboard();
      renderFlowInit();
      alert("ダミーデータを追加しました");
    });
  }

  function setupDashboard() {
    filterCat?.addEventListener("change", () => renderDashboard());
    filterStatus?.addEventListener("change", () => renderDashboard());
    searchInput?.addEventListener("input", () => renderDashboard());
  }

  function setupFlow() {
    flowSelect?.addEventListener("change", () => renderFlow());
    btnPrint?.addEventListener("click", () => window.print());
    addActionBtn?.addEventListener("click", () => {
      if (!flowSelect?.value) return;
      const title = actTitleInput?.value?.trim();
      if (!title) {
        alert("対応の概要を入力してください。");
        return;
      }
      const owner = actOwnerInput?.value?.trim() || "担当未設定";
      const notes = state.flowNotes[flowSelect.value] || [];
      state.flowNotes[flowSelect.value] = [{ owner, title }, ...notes];
      actTitleInput.value = "";
      renderFlow();
    });
  }

  function setupAudit() {
    btnAuditCsv?.addEventListener("click", () => downloadAuditCsv());
    btnAuditClear?.addEventListener("click", async () => {
      if (!confirm("監査ログを全削除しますか？")) return;
      await clearAuditLogs();
      renderAudit();
    });
  }

  function setupAuth() {
    logoutBtn?.addEventListener("click", async () => {
      const currentUserId = state.user?.id || "";
      const currentEmail = state.user?.email || "";
      if (state.supabase) {
        try {
          await state.supabase.auth.signOut();
        } catch (err) {
          console.warn("signOut failed", err);
        }
      }
      state.user = null;
      updateAuthState();
      await addAudit("auth.logout", currentUserId, currentEmail);
      showAuthMessage("ログアウトしました。", false);
    });

    btnOtpSend?.addEventListener("click", async () => {
      const email = authEmail?.value?.trim();
      if (!email) {
        showAuthMessage("メールアドレスを入力してください。", true);
        return;
      }
      if (!state.supabase) {
        showAuthMessage("Supabase未設定のため、オフラインモードです。", true);
        return;
      }
      btnOtpSend.disabled = true;
      try {
        const { error } = await state.supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true }
        });
        if (error) throw error;
        await addAudit("auth.otp.send", "", email);
        showAuthMessage("6桁コードをメールに送信しました。届かない場合は迷惑メールをご確認ください。", false);
      } catch (err) {
        console.warn("OTP send failed", err);
        showAuthMessage(`送信に失敗しました: ${err?.message || err}`, true);
      } finally {
        btnOtpSend.disabled = false;
      }
    });

    btnOtpVerify?.addEventListener("click", async () => {
      const email = authEmail?.value?.trim();
      const code = authOtp?.value?.trim();
      if (!email || !code) {
        showAuthMessage("メールアドレスと6桁コードを入力してください。", true);
        return;
      }
      if (!state.supabase) {
        showAuthMessage("Supabase未設定のため検証できません。", true);
        return;
      }
      btnOtpVerify.disabled = true;
      try {
        const { data, error } = await state.supabase.auth.verifyOtp({
          email,
          token: code,
          type: "email"
        });
        if (error) throw error;
        state.user = data?.user || null;
        updateAuthState();
        await addAudit("auth.login", state.user?.id || "", email);
        showAuthMessage("ログインしました。", false);
        showPage("home");
      } catch (err) {
        console.warn("OTP verify failed", err);
        showAuthMessage(`認証に失敗しました: ${err?.message || err}`, true);
      } finally {
        btnOtpVerify.disabled = false;
      }
    });
  }

  function showPage(name) {
    const page = pages[name];
    if (!page) return;
    Object.values(pages).forEach((el) => el?.classList.remove("is-active"));
    page.classList.add("is-active");
    document.querySelectorAll(".nav__item").forEach((item) => item.classList.remove("is-active"));
    document
      .querySelector(`.nav__item.js-nav[data-target="${name}"]`)
      ?.classList.add("is-active");
    sidebar?.classList.remove("is-open");

    if (name === "dashboard") {
      ensureReports().then(() => renderDashboard());
    } else if (name === "flow") {
      ensureReports().then(() => renderFlowInit());
    } else if (name === "audit") {
      ensureAuditLogs().then(() => renderAudit());
    } else if (name === "auth") {
      updateAuthState();
    }
  }

  function renderDashboard() {
    const reports = state.reports;
    const fc = filterCat?.value || "all";
    const fs = filterStatus?.value || "all";
    const query = (searchInput?.value || "").trim().toLowerCase();

    const filtered = reports.filter((report) => {
      const statusOk = fs === "all" || report.status === fs;
      const catOk = fc === "all" || report.category === fc;
      const queryOk = !query || report.title.toLowerCase().includes(query);
      return statusOk && catOk && queryOk;
    });

    const total = reports.length;
    const open = reports.filter((r) => r.status === "未対応").length;
    const progress = reports.filter((r) => r.status === "対応中").length;
    const done = reports.filter((r) => r.status === "完了").length;

    if (summaryChips) {
      summaryChips.innerHTML = `
        <span class="badge">総件数: ${total}</span>
        <span class="badge">未対応: ${open}</span>
        <span class="badge">対応中: ${progress}</span>
        <span class="badge">完了: ${done}</span>
        <span class="badge">モード: ${state.supabase ? "Supabase" : "ローカル"}</span>
      `;
    }

    if (cardsEl) cardsEl.innerHTML = "";
    filtered.forEach((report) => {
      const card = document.createElement("article");
      card.className = "db-card";
      card.innerHTML = `
        <div class="db-card__title">${escapeHtml(report.title)}</div>
        <div class="db-card__meta">カテゴリ: ${escapeHtml(report.category)} / 日時: ${escapeHtml(report.date || "-")}</div>
        <div class="row" style="margin-top:6px">
          <span class="badge">ステータス: ${escapeHtml(report.status || "未対応")}</span>
          <span class="badge">担当: ${escapeHtml(report.assignee || "未設定")}</span>
          <div class="row__right card-actions">
            <button class="ghost" data-act="open" type="button">詳細</button>
            <button class="ghost" data-act="assign" type="button">担当/進捗</button>
            <button class="ghost" data-act="delete" type="button">削除</button>
          </div>
        </div>
      `;
      card.querySelector('[data-act="open"]').addEventListener("click", () => openFlow(report.id));
      card.querySelector('[data-act="assign"]').addEventListener("click", () => quickAssign(report.id));
      card.querySelector('[data-act="delete"]').addEventListener("click", () => deleteReport(report.id));
      cardsEl?.appendChild(card);
    });

    if (emptyMsg) emptyMsg.style.display = filtered.length ? "none" : "block";
  }

  function renderFlowInit() {
    const reports = state.reports;
    if (!flowSelect) return;
    flowSelect.innerHTML = reports
      .map((report) => `<option value="${report.id}">${escapeHtml(report.title)}</option>`)
      .join("");
    if (!reports.length) {
      flowSelect.innerHTML = '<option value="">通報がありません</option>';
      resetFlow();
      return;
    }
    if (!flowSelect.value || !reports.some((r) => r.id === flowSelect.value)) {
      flowSelect.value = reports[0].id;
    }
    renderFlow();
  }

  function renderFlow() {
    const id = flowSelect?.value;
    const report = state.reports.find((r) => r.id === id);
    if (!report) {
      resetFlow();
      return;
    }
    if (flowTitle) flowTitle.textContent = report.title;
    if (flowCat) flowCat.textContent = report.category;
    if (flowStatus) flowStatus.textContent = report.status || "未対応";
    if (flowOwner) flowOwner.textContent = report.assignee || "未設定";
    if (flowDate) flowDate.textContent = report.date || "-";

    const notes = state.flowNotes[id] || [];
    if (actionList) {
      actionList.innerHTML = notes
        .map((note) => `<li><strong>${escapeHtml(note.owner || "担当未設定")}</strong>: ${escapeHtml(note.title)}</li>`)
        .join("");
      if (!notes.length) actionList.innerHTML = "";
    }
  }

  function resetFlow() {
    if (flowTitle) flowTitle.textContent = "-";
    if (flowCat) flowCat.textContent = "-";
    if (flowStatus) flowStatus.textContent = "-";
    if (flowOwner) flowOwner.textContent = "-";
    if (flowDate) flowDate.textContent = "-";
    if (actionList) actionList.innerHTML = "";
  }

  function renderAudit() {
    const logs = state.auditLogs;
    if (auditSummary) {
      auditSummary.innerHTML = `
        <span class="badge">件数: ${logs.length}</span>
        <span class="badge">モード: ${state.supabase ? "Supabase" : "ローカル"}</span>
      `;
    }
    if (!auditTbody) return;
    if (!logs.length) {
      auditTbody.innerHTML = '<tr><td colspan="4" style="padding:10px 12px; text-align:center" class="muted">まだ監査ログがありません。</td></tr>';
      return;
    }
    auditTbody.innerHTML = logs
      .map(
        (log) => `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid var(--border)">${escapeHtml(formatDate(log.createdAt))}</td>
          <td style="padding:8px 12px; border-bottom:1px solid var(--border)">${escapeHtml(log.action)}</td>
          <td style="padding:8px 12px; border-bottom:1px solid var(--border)">${escapeHtml(log.targetId || "-")}</td>
          <td style="padding:8px 12px; border-bottom:1px solid var(--border)">${escapeHtml(log.detail || "")}</td>
        </tr>`
      )
      .join("");
  }

  async function quickAssign(id) {
    const target = state.reports.find((r) => r.id === id);
    if (!target) return;
    const status = prompt("ステータスを入力（未対応/対応中/完了）", target.status) || target.status;
    const assignee = prompt("担当者名を入力（空で未設定）", target.assignee || "") || "";
    const updated = await repoUpdate(id, { status, assignee });
    if (updated) {
      await addAudit("report.update", id, `status=${status} assignee=${assignee}`);
      renderDashboard();
      renderFlowInit();
    }
  }

  async function deleteReport(id) {
    if (!confirm("この通報を削除しますか？")) return;
    await repoDelete(id);
    await addAudit("report.delete", id, "");
    renderDashboard();
    renderFlowInit();
  }

  function openFlow(id) {
    showPage("flow");
    if (flowSelect && id) {
      flowSelect.value = id;
    }
    renderFlow();
  }

  async function ensureReports(forceRemote = false) {
    if (state.supabase && (forceRemote || !state.offline)) {
      try {
        const { data, error } = await state.supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (Array.isArray(data)) {
          const mapped = data.map(mapReportFromSupabase);
          updateReportsCache(mapped);
          state.offline = false;
          return state.reports;
        }
      } catch (err) {
        console.warn("リモートの通報取得に失敗しました", err);
      }
    }
    updateReportsCache(readLocal(LOCAL_KEYS.reports));
    return state.reports;
  }

  async function ensureAuditLogs(forceRemote = false) {
    if (state.supabase && (forceRemote || !state.offline)) {
      try {
        const { data, error } = await state.supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (Array.isArray(data)) {
          const mapped = data.map(mapAuditRow);
          updateAuditCache(mapped);
          return state.auditLogs;
        }
      } catch (err) {
        console.warn("監査ログ取得に失敗しました", err);
      }
    }
    updateAuditCache(readLocal(LOCAL_KEYS.audit));
    return state.auditLogs;
  }

  async function repoCreate(payload, options = {}) {
    const now = new Date();
    if (state.supabase) {
      try {
        const { data, error } = await state.supabase
          .from("reports")
          .insert({
            title: payload.title,
            category: payload.category,
            body: payload.body,
            status: "未対応",
            assignee: "",
            created_at: now.toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapReportFromSupabase(data);
        updateReportsCache([mapped, ...state.reports]);
        if (options.notify !== false) {
          await notifyEmail(`[SilentVoice] 新規通報: ${mapped.title}`, payload.body);
        }
        return mapped;
      } catch (err) {
        console.warn("リモートへの通報登録に失敗しました。ローカルへ保存します", err);
      }
    }
    const record = {
      id: `local-${Date.now()}`,
      title: payload.title,
      category: payload.category,
      body: payload.body,
      status: "未対応",
      assignee: "",
      date: formatDate(now),
      createdAt: now.toISOString()
    };
    updateReportsCache([record, ...state.reports]);
    if (options.notify !== false) {
      await notifyEmail(`[SilentVoice] 新規通報: ${record.title}`, payload.body);
    }
    return record;
  }

  async function repoUpdate(id, patch) {
    if (state.supabase) {
      try {
        const { data, error } = await state.supabase
          .from("reports")
          .update({
            status: patch.status,
            assignee: patch.assignee,
            title: patch.title,
            body: patch.body
          })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        const mapped = mapReportFromSupabase(data);
        const next = state.reports.map((report) => (report.id === id ? mapped : report));
        updateReportsCache(next);
        return mapped;
      } catch (err) {
        console.warn("リモートの更新に失敗しました", err);
      }
    }
    const next = state.reports.map((report) =>
      report.id === id
        ? {
            ...report,
            ...patch,
            date: formatDate(new Date())
          }
        : report
    );
    updateReportsCache(next);
    return next.find((report) => report.id === id) || null;
  }

  async function repoDelete(id) {
    if (state.supabase) {
      try {
        const { error } = await state.supabase.from("reports").delete().eq("id", id);
        if (error) throw error;
      } catch (err) {
        console.warn("リモートの削除に失敗しました", err);
      }
    }
    const next = state.reports.filter((report) => report.id !== id);
    updateReportsCache(next);
  }

  async function addAudit(action, targetId, detail) {
    const now = new Date();
    let entry = {
      id: `audit-${now.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
      action,
      targetId: targetId || "",
      detail: detail || "",
      createdAt: now.toISOString()
    };

    if (state.supabase) {
      try {
        const { data, error } = await state.supabase
          .from("audit_logs")
          .insert({
            action,
            target_id: entry.targetId,
            detail: entry.detail,
            created_at: entry.createdAt
          })
          .select()
          .single();
        if (error) throw error;
        entry = mapAuditRow(data);
      } catch (err) {
        console.warn("監査ログの保存に失敗しました（ローカル記録のみ）", err);
      }
    }

    updateAuditCache([entry, ...state.auditLogs]);
    if (pages.audit?.classList.contains("is-active")) {
      renderAudit();
    }
  }

  async function clearAuditLogs() {
    if (state.supabase) {
      try {
        await state.supabase.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      } catch (err) {
        console.warn("監査ログのリモート削除に失敗しました", err);
      }
    }
    updateAuditCache([]);
  }

  async function notifyEmail(subject, body) {
    const url = state.config?.NOTIFY_WEBHOOK;
    if (!url) return;
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body })
      });
    } catch (err) {
      console.warn("通知Webhookへの送信に失敗しました", err);
    }
  }

  function updateReportsCache(list, persist = true) {
    state.reports = (list || []).map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      body: item.body || "",
      status: item.status || "未対応",
      assignee: item.assignee || "",
      date: item.date || formatDate(item.createdAt || item.created_at || new Date()),
      createdAt: item.createdAt || item.created_at || new Date().toISOString()
    }));
    if (persist) {
      writeLocal(LOCAL_KEYS.reports, state.reports);
    }
  }

  function updateAuditCache(list, persist = true) {
    state.auditLogs = (list || []).slice(0, 200).map((item) => ({
      id: item.id,
      action: item.action,
      targetId: item.targetId || item.target_id || "",
      detail: item.detail || "",
      createdAt: item.createdAt || item.created_at || new Date().toISOString()
    }));
    if (persist) {
      writeLocal(LOCAL_KEYS.audit, state.auditLogs);
    }
  }

  function mapReportFromSupabase(row) {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      body: row.body || "",
      status: row.status || "未対応",
      assignee: row.assignee || "",
      date: formatDate(row.created_at || row.createdAt || new Date()),
      createdAt: row.created_at || row.createdAt || new Date().toISOString()
    };
  }

  function mapAuditRow(row) {
    return {
      id: row.id,
      action: row.action,
      targetId: row.target_id || row.targetId || "",
      detail: row.detail || "",
      createdAt: row.created_at || row.createdAt || new Date().toISOString()
    };
  }

  function updateAuthState() {
    if (!authStateLabel) return;
    if (state.offline || !state.supabase) {
      authStateLabel.textContent = "オフラインモード（認証無効）";
      if (logoutBtn) logoutBtn.style.display = "none";
      return;
    }
    if (state.user) {
      const label = state.user.email || state.user.user_metadata?.full_name || "ユーザー";
      authStateLabel.textContent = `ログイン中: ${label}`;
      if (logoutBtn) logoutBtn.style.display = "block";
    } else {
      authStateLabel.textContent = "未ログイン（メールOTPを利用できます）";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  }

  function showAuthMessage(message, isError) {
    if (!authStatus) return;
    authStatus.textContent = message;
    authStatus.style.color = isError ? "#dc2626" : "";
  }

  function downloadAuditCsv() {
    const header = ["createdAt", "action", "targetId", "detail"];
    const rows = state.auditLogs.map((log) => [log.createdAt, log.action, log.targetId || "", log.detail || ""]);
    const csv = [header, ...rows]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function formatDate(input) {
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toISOString().slice(0, 16).replace("T", " ");
  }

  function readLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn("ローカルストレージの読み込みに失敗しました", err);
      return [];
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn("ローカルストレージの保存に失敗しました", err);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
