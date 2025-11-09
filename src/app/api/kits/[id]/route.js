import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(_req, context) {
  const { params } = await context;
  const id = Number(params.id);
  const kit = await prisma.kit.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, name: true, price: true, stock: true } } } },
    },
  });
  if (!kit) return NextResponse.json({ error: "Kit no encontrado" }, { status: 404 });
  return NextResponse.json(kit);
}

export async function PATCH(req, context) {
  const { params } = await context;
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const items = Array.isArray(body?.items) ? body.items : [];
  const paperType = body?.paperType ? String(body.paperType).trim() : null;

  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (items.length === 0) {
    return NextResponse.json({ error: "Debe seleccionar al menos un producto para crear un kit" }, { status: 400 });
  }

  const norm = items.map((it) => ({
    productId: Number(it.productId),
    quantity: Math.max(1, Number(it.quantity || 1)),
  }));

  // verificar productos existen
  const ids = norm.map((x) => x.productId);
  const found = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length !== ids.length) {
    return NextResponse.json({ error: "Algún producto no existe" }, { status: 400 });
  }

  // reemplazar items: borro y creo 
  await prisma.kitItem.deleteMany({ where: { kitId: id } });
  const updated = await prisma.kit.update({
    where: { id },
    data: {
      name,
      paperType,
      items: { create: norm },
    },
    include: {
      items: { include: { product: { select: { id: true, name: true, price: true, stock: true } } } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req, context) {
  const { params } = await context;
  const id = Number(params.id);
  // borro items y luego el kit
  await prisma.kitItem.deleteMany({ where: { kitId: id } });
  await prisma.kit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
