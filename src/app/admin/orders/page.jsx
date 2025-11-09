"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "../../../components/ToastProvider";

const allowedStatuses = ["Pendiente", "Procesado", "Enviado", "Entregado", "Cancelado"];

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState([]);
  const toast = useToast();
  const fmtDate = useMemo(() => (d) => new Date(d).toLocaleString(), []);
  const [downloading, setDownloading] = useState(false);
  const [topByQuantity, setTopByQuantity] = useState(null);
  const [topByRevenue, setTopByRevenue] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/orders?all=1", { cache: "no-store" });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    })();
    // fetch top stats
    (async () => {
      try {
        const q = await fetch('/api/orders/export?format=json&top=1&sort=quantity');
        const r = await fetch('/api/orders/export?format=json&top=1&sort=revenue');
        if (q.ok) {
          const jd = await q.json();
          setTopByQuantity((jd.rows && jd.rows[0]) || null);
        }
        if (r.ok) {
          const jd2 = await r.json();
          setTopByRevenue((jd2.rows && jd2.rows[0]) || null);
        }
      } catch (e) {
        // ignore silently
      }
    })();
  }, []);

  const changeStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || `Error ${res.status}`);
        return;
      }
      toast.success("Estado actualizado");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch {
      toast.error("No se pudo actualizar el estado");
    }
  };

  if (session?.user?.role !== "admin") {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex justify-center pt-10 px-4 pb-16">
        <div className="w-full max-w-3xl space-y-4 flex items-start">
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Pedidos</h2>
              <div className="flex items-center gap-2">
                <button
                  disabled={downloading}
                  onClick={async () => {
                    try {
                      setDownloading(true);
                      const res = await fetch(`/api/orders/export?format=csv`);
                      if (!res.ok) throw new Error(`Error ${res.status}`);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `ventas_top_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch(e) {
                      toast.error(e.message || 'No se pudo descargar CSV');
                    } finally {
                      setDownloading(false);
                    }
                  }}
                  className="px-3 py-1 rounded bg-pink-300 hover:bg-pink-400 text-slate-900 text-sm border border-pink-400"
                  title="Descargar CSV con top productos"
                >
                  {downloading ? 'Descargando…' : 'Descargar CSV'}
                </button>
                <button
                  disabled={downloading}
                  onClick={async () => {
                    try {
                      setDownloading(true);
                      const res = await fetch(`/api/orders/export?format=pdf`);
                      if (!res.ok) throw new Error(`Error ${res.status}`);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `ventas_top_${new Date().toISOString().replace(/[:.]/g,'-')}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch(e) {
                      toast.error(e.message || 'No se pudo descargar PDF');
                    } finally {
                      setDownloading(false);
                    }
                  }}
                  className="px-3 py-1 rounded bg-pink-300 hover:bg-pink-400 text-slate-900 text-sm border border-pink-400"
                  title="Descargar PDF con top productos"
                >
                  {downloading ? 'Descargando…' : 'Descargar PDF'}
                </button>
              </div>
            </div>
            {/* orders table (moved into left column) */}
            {orders.length === 0 ? (
              <p className="text-xs text-slate-600 text-center">No hay pedidos.</p>
            ) : (
              <table className="w-full text-sm text-slate-800 card mt-4">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">ID</th>
                    <th className="p-2">Usuario</th>
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-200">
                      <td className="p-2">#{o.id}</td>
                      <td className="p-2">{o.user?.email || o.user?.username || "—"}</td>
                      <td className="p-2">{fmtDate(o.createdAt)}</td>
                      <td className="p-2">
                        <select
                          value={(() => {
                            const m = {
                              pendiente: "Pendiente",
                              procesando: "Procesado",
                              enviado: "Enviado",
                              entregado: "Entregado",
                              cancelado: "Cancelado",
                            };
                            return m[(o.status || "").toLowerCase()] || o.status || "Pendiente";
                          })()}
                          onChange={(e) => changeStatus(o.id, e.target.value)}
                          className="border border-slate-300 rounded px-2 py-1 bg-white"
                        >
                          {allowedStatuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="ml-4 flex flex-col items-stretch gap-2">
            <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-pink-100 border border-pink-200 text-pink-900 rounded-full px-3 py-2 shadow-sm w-56">
              <div className="flex-none w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-800 font-bold text-sm">#</div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="text-[10px] text-pink-600 leading-tight">Más vendido</div>
                <div className="text-sm font-semibold whitespace-normal leading-tight max-h-10 overflow-hidden" title={topByQuantity?.name || ''}>{topByQuantity?.name || '—'}</div>
              </div>
              <div className="flex-none text-right ml-3">
                <div className="text-[10px] text-slate-500">Cant.</div>
                <div className="font-bold text-sm">{topByQuantity ? topByQuantity.totalQuantity : '—'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gradient-to-r from-pink-25 to-pink-50 border border-pink-100 text-pink-900 rounded-full px-3 py-2 shadow-sm w-56">
              <div className="flex-none w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-semibold text-sm">$</div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="text-[10px] text-pink-600 leading-tight">Mayor ingreso</div>
                <div className="text-sm font-semibold whitespace-normal leading-tight max-h-10 overflow-hidden" title={topByRevenue?.name || ''}>{topByRevenue?.name || '—'}</div>
              </div>
              <div className="flex-none text-right ml-3">
                <div className="text-[10px] text-slate-500">Mx</div>
                <div className="font-bold text-sm">{topByRevenue ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(topByRevenue.totalRevenue) : '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
