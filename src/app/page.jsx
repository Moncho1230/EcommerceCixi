"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { addToCart } from "../libs/cart";
import { addKitToCart } from "../libs/cart";

function CommentsBox({ productId }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [count, setCount] = useState(0);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);

  async function loadComments() {
    const res = await fetch(`/api/products/${productId}/comments`, { cache: "no-store" });
    const data = await res.json();
    setList(Array.isArray(data.comments) ? data.comments : []);
    setCount(Number(data.count || 0));
  }

  useEffect(() => {
    if (open) loadComments();
  }, [open]);

  const publish = async () => {
    const txt = content.trim();
    if (!txt) return;
    setLoading(true);
    try {
      // Si seleccionó estrellas, guardamos la calificación primero (opcional)
      if (rating > 0) {
        try {
          await fetch(`/api/ratings/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, value: rating })
          });
        } catch (e) {
          // si falla la calificación, continuamos con el comentario
          console.error("Rating failed", e);
        }
      }

      const res = await fetch(`/api/products/${productId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: txt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || `Error ${res.status}`);
        setLoading(false);
        return;
      }
      const created = await res.json();
      setList((prev) => [
        { id: created?.id ?? Math.random(), content: txt, createdAt: created?.createdAt ?? new Date().toISOString() },
        ...prev,
      ]);
      setCount((c) => c + 1);
      setContent("");
      setRating(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end w-full">
      {/* Fila superior: estrellas + botón de comentarios */}
      <div className="flex items-center gap-3">
        <div className="flex items-center" title={rating ? `${rating} / 5` : "Calificar"}>
          {[1,2,3,4,5].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`Calificar ${i} estrella${i>1?"s":""}`}
              className="p-0.5"
              onClick={() => setRating(i)}
            >
              <span
                className="text-lg"
                style={{ color: i <= rating ? "#f7c3c9" : "rgb(148 163 184)" }}
              >
                {i <= rating ? "★" : "☆"}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => setOpen((v) => !v)} className="btn-secondary">
          Comentarios ({count})
        </button>
      </div>
      {open && (
        <div className="mt-3 w-full card p-4 text-slate-900">
          <div className="mb-3">
            <textarea
              rows={3}
              maxLength={500}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe tu comentario (máx. 500)"
              className="w-full input-base"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={publish}
                disabled={loading || content.trim().length === 0}
                className="btn-secondary"
              >
                {loading ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
          {list.length === 0 ? (
            <p className="text-xs text-slate-700">No hay comentarios aún.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((c) => (
                <li key={c.id} className="card p-3">
                  <div className="text-xs text-slate-700">
                    <div className="font-semibold text-slate-900">Comentario de usuario</div>
                    <div className="opacity-80">{c.content}</div>
                    <div className="opacity-60 mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [kits, setKits] = useState([]);
  const fmt = useMemo(() => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }), []);

  async function loadProducts() {
    const res = await fetch("/api/products", { cache: "no-store" });
    setProducts(await res.json());
  }

  async function loadKits() {
    const res = await fetch("/api/kits", { cache: "no-store" });
    const data = await res.json();
    setKits(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadProducts();
    loadKits();
  }, []);

  // Si es admin y entra al home, redirigir a /products/pricing
  useEffect(() => {
    if (isAdmin) {
      router.replace("/products/pricing");
    }
  }, [isAdmin, router]);

  const kitTotal = (k) =>
    (k.items || []).reduce((acc, it) => acc + (Number(it?.product?.price || 0) * Number(it?.quantity || 0)), 0);

  const deleteKit = async (id) => {
    if (!confirm("¿Eliminar este kit?")) return;
    await fetch(`/api/kits/${id}`, { method: "DELETE" });
    await loadKits();
  };

  return (
  <div className="min-h-screen bg-white">

      {/* Productos */}
      <div className="flex justify-center pt-10 px-4">
        <div className="w-3/5 space-y-6">
          <h2 className="text-3xl text-slate-900 font-bold text-center">Nuestros Productos</h2>

          {products.length === 0 ? (
            <p className="text-xs text-slate-200 text-center mt-2">No hay productos disponibles.</p>
          ) : (
            <ul className="space-y-3">
              {products.map((p) => (
                <li key={p.id} className="card p-4 flex items-start gap-4 text-slate-900">
                  <div className="w-24 h-24 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">Sin imagen</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm md:text-base truncate">{p.name}</div>
                    <div className="text-xs text-slate-600">{p.category ? `Categoría: ${p.category.name}` : "Sin categoría"}</div>
                    <div className="text-xs text-slate-600 line-clamp-2">{p.description ? p.description : "Sin descripción"}</div>
                    <div className="text-xs text-slate-700 mt-1 flex items-center gap-3">
                      <span>Precio: {p.price != null ? fmt.format(p.price) : "—"}</span>
                      <span>Stock: {p.stock != null ? p.stock : 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {!isAdmin && (
                      <button
                        disabled={p.stock <= 0}
                        onClick={() => {
                          const r = addToCart({ id: p.id, name: p.name, price: p.price, stock: p.stock });
                          if (!r.ok) {
                            if (r.reason === "no-stock") alert("Sin stock disponible");
                            if (r.reason === "stock-limit") alert("Alcanzaste el stock disponible");
                            return;
                          }
                          alert("Agregado al carrito");
                        }}
                        className="btn-primary"
                      >
                        Agregar al carrito
                      </button>
                    )}
                    <CommentsBox productId={p.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* -------------------- KITS -------------------- */}
          <h2 className="text-3xl text-slate-900 font-bold text-center mt-10">Kits</h2>

          {kits.length === 0 ? (
            <p className="text-xs text-slate-200 text-center mt-2">Aún no hay kits.</p>
          ) : (
            <ul className="space-y-3">
              {kits.map((k) => (
                <li key={k.id} className="card p-4 flex flex-col md:flex-row justify-between gap-3 text-slate-900">
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-[#623645] text-lg">{k.name}</div>
                    <ul className="text-xs list-disc ml-4">
                      {(k.items || []).map((it) => (
                        <li key={it.id}>
                          {it.product?.name} × {it.quantity} {it.product?.price != null ? `( $${it.product.price} c/u )` : ""}
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs mt-1">Total del kit: {fmt.format(kitTotal(k))}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isAdmin && (
                      <button
                        onClick={() => {
                          const r = addKitToCart(k);
                          if (!r.ok) return;
                          alert("Kit agregado al carrito");
                        }}
                        className="btn-primary"
                      >
                        Agregar al carrito
                      </button>
                    )}

                    <a
                      href={`/kits/${k.id}`}
                      className="btn-primary"
                    >
                      Editar
                    </a>

                    <button
                      onClick={() => deleteKit(k.id)}
                      className="btn-primary"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
