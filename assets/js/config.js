(() => {
  const config = {
    SUPABASE_URL: "https://nhqrgdwxmaajvhumejzg.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocXJnZHd4bWFhanZodW1lanpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NzkzNzgsImV4cCI6MjA3NDQ1NTM3OH0.I1OM2bZAAAsGJVXLdHmvvScimISZU04qfUwhbTpK88w",
    NOTIFY_WEBHOOK: ""
  };

  const requiredKeys = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "NOTIFY_WEBHOOK"];
  const missingKeys = requiredKeys.filter(key => !(key in config));
  if (missingKeys.length > 0) {
    throw new Error(`[config] Missing keys: ${missingKeys.join(", ")}`);
  }

  const invalidTypes = Object.entries(config)
    .filter(([, value]) => typeof value !== "string")
    .map(([key]) => key);
  if (invalidTypes.length > 0) {
    throw new TypeError(`[config] Non-string values for: ${invalidTypes.join(", ")}`);
  }

  const frozenConfig = Object.freeze({ ...config });

  if (window.ENV) {
    console.warn("[config] window.ENV is already defined. Overwriting with frozen config.");
  }

  Object.defineProperty(window, "ENV", {
    value: frozenConfig,
    writable: false,
    configurable: false,
    enumerable: true
  });
})();
