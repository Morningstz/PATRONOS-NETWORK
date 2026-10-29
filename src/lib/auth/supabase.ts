import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env";

export function supabaseConfigured(): boolean {
  const e = env();
  return e.AUTH_MODE === "supabase" && !!e.NEXT_PUBLIC_SUPABASE_URL && !!e.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export async function supabaseServer() {
  const e = env();
  const cookieStore = await cookies();
  return createServerClient(e.NEXT_PUBLIC_SUPABASE_URL!, e.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are refreshed by middleware instead.
        }
      },
    },
  });
}
