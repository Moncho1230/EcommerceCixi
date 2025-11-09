"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const name = session?.user?.name || session?.user?.email;

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!session?.user) {
    return (
      <a href="/auth/login" className="text-slate-700 hover:text-[#f7c3c9] font-medium text-sm">
        Iniciar sesión
      </a>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded px-3 py-1 text-xs font-semibold shadow-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="truncate max-w-[10rem]">{name}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 bg-white shadow-lg z-50 p-3 text-slate-700">
          <div className="text-xs mb-2 opacity-80">Signed in as</div>
          <div className="text-sm font-semibold truncate mb-2 text-slate-900">{name}</div>

          {/* Enlace a mis pedidos para usuarios (no admin) */}
          {session?.user?.role !== "admin" && (
            <a href="/orders" className="block w-full text-left text-xs mb-3 hover:underline text-slate-700">
              Mis pedidos
            </a>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full btn-primary"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
