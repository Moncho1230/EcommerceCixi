"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export default function FloatingOrders() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = session?.user?.role === "admin";
  const isLogged = !!session?.user?.id;

  // Hide on certain pages
  if (
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/admin") ||
    pathname === "/orders" ||
    pathname?.startsWith("/orders/")
  ) return null;

  // Only show for logged-in non-admin users
  if (!isLogged || isAdmin) return null;

  return (
    <button
      type="button"
      className="fixed bottom-6 right-6 z-40 btn-secondary shadow-lg px-4 py-3 text-sm"
      title="Mis pedidos"
      onClick={() => router.push("/orders")}
    >
      🧾 Mis pedidos
    </button>
  );
}
