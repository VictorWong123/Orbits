import { redirect } from "next/navigation";

/**
 * Legacy login route — permanently redirected to /account.
 * The middleware also redirects /login at the edge, so this component
 * is only reached in dev environments that bypass the middleware.
 */
export default function LoginPage() {
  redirect("/account");
}
