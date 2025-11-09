"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import UserMenu from "./UserMenu";
import { useToast } from "./ToastProvider";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  // Ocultar navbar en páginas de auth (login/register)
  if (pathname?.startsWith("/auth")) return null;
  const isAdmin = session?.user?.role === "admin";

  return (
    <nav className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center">
  <h1 className="text-slate-900 text-2xl font-bold">Ecommerce-Cixi</h1>
      <div className="flex gap-4 items-center">
        {!isAdmin && (
          <>
            <a href="/" className="text-slate-700 hover:text-[#f7c3c9] font-medium">Home</a>
            <a href="/cart" className="text-slate-700 hover:text-[#f7c3c9] font-medium">Carrito</a>
            <a href="/products/pricing" className="text-slate-700 hover:text-[#f7c3c9] font-medium">Productos</a>
          </>
        )}

        {isAdmin && (
          <>
            <a href="/products/pricing" className="text-slate-700 hover:text-[#f7c3c9] font-medium">Productos</a>
            <a href="/admin/orders" className="text-slate-700 hover:text-[#f7c3c9] font-medium">Pedidos</a>
            <a href="/kits" className="text-slate-700 hover:text-[#f7c3c9] font-medium">Crear kit</a>
            <a href="/categories" className="text-slate-700 hover:text-[#f7c3c9] font-medium">Categorías</a>
          </>
        )}

        <UserMenu />
      </div>
    </nav>
  );
}
