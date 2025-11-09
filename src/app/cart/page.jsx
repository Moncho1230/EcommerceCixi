"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getCart, setQty, removeFromCart, clearCart } from "../../libs/cart"; 
import { useToast } from "../../components/ToastProvider";

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [productsMap, setProductsMap] = useState({}); 
  const fmt = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }), []);
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    setItems(getCart());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = await res.json();
        const map = {};
        (Array.isArray(data) ? data : []).forEach((p) => (map[p.id] = p));
        setProductsMap(map);
      } catch {
        setProductsMap({});
      }
    })();
  }, []);

  const getMaxStock = (it) => {
    const live = productsMap[it.id]?.stock;
    if (typeof live === "number") return live;
    if (typeof it.stock === "number") return it.stock;
    return 9999;
  };

  const getLivePrice = (it) => {
    const live = productsMap[it.id]?.price;
    if (typeof live === "number") return live;
    return typeof it.price === "number" ? it.price : 0;
    };

  const total = useMemo(
    () => items.reduce((acc, it) => acc + getLivePrice(it) * (it.qty || 0), 0),
    [items, productsMap]
  );

  const dec = (it) => {
    const current = it.qty || 1;
    const next = Math.max(1, current - 1);
    const updated = setQty(it.id, next);
    setItems(updated);
  };

  const inc = (it) => {
    const current = it.qty || 1;
    const max = getMaxStock(it);
    if (current >= max) return; 
    const updated = setQty(it.id, current + 1);
    setItems(updated);
  };

  const changeQty = (it, value) => {
    let n = Number(value);
    if (!Number.isFinite(n)) n = 1;
    n = Math.max(1, Math.floor(n));
    n = Math.min(n, getMaxStock(it));
    const updated = setQty(it.id, n);
    setItems(updated);
  };

  const remove = (it) => {
    const updated = removeFromCart(it.id);
    setItems(updated);
  };

  const confirmOrder = async () => {
    if (!session?.user?.id) {
      toast.info("Inicia sesión para confirmar tu pedido");
      router.push("/auth/login");
      return;
    }
    if (items.length === 0) {
      toast.info("Tu carrito está vacío");
      return;
    }
    const payloadItems = items.map((it) => {
      // Detect item type
      let type = undefined;
      if (typeof it.id === "string" && it.id.startsWith("kit-custom-")) type = "customKit";
      else if (typeof it.id === "string" && it.id.startsWith("kit-")) type = "kit";
      else type = "product";
      return {
        type,
        productId: type === "product" ? Number(it.id) : null,
        name: it.name,
        unitPrice: getLivePrice(it),
        quantity: it.qty || 1,
        detail: it.detail || null,
      };
    });

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || `Error ${res.status}`);
        return;
      }
      const order = await res.json();
      clearCart();
      setItems([]);
      toast.success("Pedido creado con éxito");
      router.push(`/orders/${order.id}`);
    } catch {
      toast.error("No se pudo crear el pedido");
    }
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Título centrado */}
      <div className="pt-10 px-4">
        <h2 className="text-center text-2xl text-slate-900 font-bold">Carrito de compras</h2>
      </div>

      {/* Contenido */}
      <div className="flex justify-center pt-6 px-4 pb-20">
  <div className="w-full max-w-2xl space-y-3">
          {items.length === 0 ? (
            <p className="text-xs text-slate-600 text-center mt-2">Tu carrito está vacío.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((it) => {
                  const max = getMaxStock(it);
                  const price = getLivePrice(it);
                  const subtotal = price * (it.qty || 0);

                  return (
                    <li
                      key={it.id}
                      className="card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-900"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#623645] text-sm truncate">{it.name}</div>
                        <div className="kv"><b>Precio:</b>{fmt.format(price)}</div>
                        <div className="kv"><b>Disponible:</b>{Number.isFinite(max) ? max : "—"}</div>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => dec(it)}
                          disabled={(it.qty || 1) <= 1}
                          className="btn-secondary px-2"
                          aria-label="Disminuir cantidad"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min={1}
                          max={max}
                          value={it.qty || 1}
                          onChange={(e) => changeQty(it, e.target.value)}
                          className="w-14 text-center input-base"
                        />

                        <button
                          onClick={() => inc(it)}
                          disabled={(it.qty || 1) >= max}
                          className="btn-secondary px-2"
                          aria-label="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal y eliminar */}
                      <div className="flex items-center gap-2">
                        <div className="text-slate-900 font-semibold whitespace-nowrap">{fmt.format(subtotal)}</div>
                        <button
                          onClick={() => remove(it)}
                          className="btn-primary"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Total + Confirmar */}
              <div className="card p-3 flex justify-between items-center gap-3">
                <div className="text-slate-900 font-bold">Total: {fmt.format(total)}</div>
                <button onClick={confirmOrder} className="btn-primary">Confirmar pedido</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
