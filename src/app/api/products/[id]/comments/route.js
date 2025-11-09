import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
const prisma = new PrismaClient();

function parseId(idRaw) {
  const n = Number(idRaw);
  return Number.isNaN(n) ? idRaw : n; 
}

export async function GET(_req, context) {
  const { params } = await context;
  const id = parseId(params.id);
  try {
    const comments = await prisma.comment.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const count = await prisma.comment.count({ where: { productId: id } });
    return NextResponse.json({ comments, count });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req, context) {
  const { params } = await context;
  const id = parseId(params.id);
  try {
    const body = await req.json();
    const content = String(body?.content || "").trim();
    if (content.length < 1 || content.length > 500) {
      return NextResponse.json({ error: "Contenido 1..500 caracteres" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    // try to capture user name from session when available
    let userName = "Usuario";
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        userName = session.user.name || session.user.email || userName;
      }
    } catch (e) {
      // ignore
    }

    const created = await prisma.comment.create({
      data: { productId: id, userName, content },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  const { params } = await context;
  const productId = parseId(params.id);
  try {
    const session = await getServerSession(authOptions);
    if (!session || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const commentId = Number(body?.commentId);
    if (!Number.isFinite(commentId)) {
      return NextResponse.json({ error: 'commentId inválido' }, { status: 400 });
    }

    const c = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!c || c.productId !== productId) {
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
