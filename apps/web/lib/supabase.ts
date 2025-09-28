import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl) {
  throw new Error("[supabase] SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not configured");
}

if (!supabaseAnonKey) {
  throw new Error("[supabase] SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    detectSessionInUrl: false,
    autoRefreshToken: false
  }
});
