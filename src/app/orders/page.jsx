"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const fmtDate = useMemo(() => (d) => new Date(d).toLocaleString(), []);

  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return; // could also redirect to login
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    })();
  }, [session?.user?.id]);

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-700">Inicia sesión para ver tus pedidos</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex justify-center pt-10 px-4 pb-16">
        <div className="w-full max-w-2xl space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 text-center">Mis pedidos</h2>

          {orders.length === 0 ? (
            <p className="text-xs text-slate-600 text-center">No tienes pedidos aún.</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="card p-3 flex items-center justify-between">
                  <div className="text-sm text-slate-800">
                    <div><b>ID:</b> #{o.id}</div>
                    <div><b>Fecha:</b> {fmtDate(o.createdAt)}</div>
                    <div><b>Estado:</b> {(() => {
                      const m = {
                        pendiente: "Pendiente",
                        procesando: "Procesado",
                        enviado: "Enviado",
                        entregado: "Entregado",
                        cancelado: "Cancelado",
                      };
                      return m[(o.status || "").toLowerCase()] || o.status || "Pendiente";
                    })()}</div>
                  </div>
                  <button className="btn-primary" onClick={() => router.push(`/orders/${o.id}`)}>Ver</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
