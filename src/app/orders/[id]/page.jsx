"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export default function OrderDetailPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const [order, setOrder] = useState(null);
  const fmt = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }), []);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      const data = await res.json();
      setOrder(data?.id ? data : null);
    })();
  }, [id]);

  if (!order) return <div className="min-h-screen bg-white" />;

  const total = (order.items || []).reduce((acc, it) => acc + (Number(it.unitPrice || 0) * Number(it.quantity || 0)), 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex justify-center pt-10 px-4 pb-16">
        <div className="w-full max-w-2xl space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 text-center">Pedido #{order.id}</h2>
          <div className="card p-3 text-sm text-slate-800">
            <div><b>Fecha:</b> {new Date(order.createdAt).toLocaleString()}</div>
            <div><b>Estado:</b> {(() => {
              const m = {
                pendiente: "Pendiente",
                procesando: "Procesado",
                enviado: "Enviado",
                entregado: "Entregado",
                cancelado: "Cancelado",
              };
              return m[(order.status || "").toLowerCase()] || order.status || "Pendiente";
            })()}</div>
          </div>

          <div className="card p-3">
            <div className="font-semibold text-slate-900 mb-2">Items</div>
            <ul className="text-sm text-slate-800 space-y-1">
              {(order.items || []).map((it) => (
                <li key={it.id} className="flex justify-between">
                  <span>{it.name} × {it.quantity}</span>
                  <span>{fmt.format((it.unitPrice || 0) * (it.quantity || 0))}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-bold text-slate-900">
              <span>Total</span>
              <span>{fmt.format(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
