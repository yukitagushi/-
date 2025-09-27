import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";

const defaultConfig = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  NOTIFY_WEBHOOK: ""
};

async function loadConfig() {
  try {
    const mod = await import("./config.js");
    return mod?.default ?? mod ?? {};
  } catch (err) {
    console.info("config.js が見つかりません。オフラインモードで起動します。", err?.message || err);
    return {};
  }
}

(async () => {
  const config = { ...defaultConfig, ...(await loadConfig()) };
  let supabase = null;

  if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
    try {
      supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          detectSessionInUrl: false
        }
      });
    } catch (err) {
      console.error("Supabaseクライアントの初期化に失敗しました", err);
    }
  }

  window.__appConfig__ = config;
  window.__supabase__ = supabase;
  window.__offlineMode__ = !supabase;

  document.dispatchEvent(
    new CustomEvent("sv:supabase-ready", {
      detail: { supabase, config }
    })
  );
})();
