import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseServer } from "@/lib/auth/supabase";
import { getSessionUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/validation";

/** Supabase magic-link / OAuth callback: exchanges the code for a session cookie. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (!supabaseConfigured() || !code) return NextResponse.redirect(new URL("/sign-in?error=callback", url.origin));
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/sign-in?error=callback", url.origin));
  await getSessionUser(); // creates the application user on first sign-in
  return NextResponse.redirect(new URL(next, url.origin));
}
