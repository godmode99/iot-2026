import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseConfig, hasPublicSupabaseConfig } from "../env.js";

export function hasSupabaseServerConfig() {
  return hasPublicSupabaseConfig();
}

export async function createSupabaseServerClient() {
  if (!hasSupabaseServerConfig()) {
    return null;
  }

  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies but not always mutate them.
        }
      }
    }
  });
}

