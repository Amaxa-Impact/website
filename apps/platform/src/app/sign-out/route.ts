import type { NextRequest } from "next/server";
import { signOut } from "@workos-inc/authkit-nextjs";

export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get("redirect");
  // Only allow same-origin relative paths so this can't be used as an open
  // redirect (e.g. ?redirect=https://evil.com or ?redirect=//evil.com).
  const redirectTo =
    redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  await signOut({ returnTo: redirectTo });
}
