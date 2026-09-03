export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { APP_PATH, LOGIN_PATH } from "@/auth/access";
import { getAppContext } from "@/server/app-context";

/** Entry point. The proxy normally redirects before this renders; this is the server-side fallback. */
export default async function Home() {
  const ctx = await getAppContext();
  redirect(ctx ? APP_PATH : LOGIN_PATH);
}
