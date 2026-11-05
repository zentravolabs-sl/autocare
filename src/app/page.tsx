import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.isSuperAdmin && !session.organizationId) {
    redirect("/super-admin");
  }

  redirect("/dashboard");
}
