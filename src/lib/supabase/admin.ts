import { createClient } from "@supabase/supabase-js";

// WARNING: This client bypasses RLS. Use ONLY in server-side code
// (Route Handlers, Server Actions) for admin operations like
// user management and tenant provisioning.
// NEVER import this file in Client Components.

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
