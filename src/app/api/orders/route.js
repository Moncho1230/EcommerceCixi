import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// GET /api/orders
// - Admin: use ?all=1 to get all orders; otherwise return user's own orders
export async function GET(req) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const url = new URL(req.url);
  const all = url.searchParams.get("all");

  if (isAdmin && all === "1") {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true, user: { select: { id: true, email: true, username: true } } },
    });
    return NextResponse.json(orders);
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: Number(session.user.id) },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return NextResponse.json(orders);
}

// POST /api/orders
// Create an order from provided items. Requires auth. Body: { items: [{ type, productId?, name, unitPrice, quantity, detail? }] }
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "Sin items" }, { status: 400 });

  // normalize and compute total
  const norm = [];
  let total = 0;
  for (const it of items) {
    const name = String(it?.name || "Item").slice(0, 200);
    const unitPrice = Number(it?.unitPrice || 0);
    const quantity = Math.max(1, Number(it?.quantity || 1));
    const type = it?.type ? String(it.type) : null;
    const productId = it?.productId != null ? Number(it.productId) : null;
    const detail = it?.detail ?? null;
    total += unitPrice * quantity;
    norm.push({ type, productId, name, unitPrice, quantity, detail });
  }

  const created = await prisma.order.create({
    data: {
      userId: Number(session.user.id),
      status: "Pendiente",
      total,
      items: { create: norm },
    },
    include: { items: true },
  });

  return NextResponse.json(created, { status: 201 });
}
