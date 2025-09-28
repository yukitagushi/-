import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";

(() => {
  const config = window.ENV || {};
  let supabase = null;

  if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
    try {
      supabase = window.supabase = createClient(
        config.SUPABASE_URL,
        config.SUPABASE_ANON_KEY
      );
    } catch (err) {
      console.error("Supabaseクライアントの初期化に失敗しました", err);
    }
  } else {
    console.info("window.ENV に Supabase の設定が見つかりません。オフラインモードで起動します。");
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
