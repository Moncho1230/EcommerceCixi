import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { sendEmail, sendSms } from '@/libs/notify';

// Note: In Next.js 15, params must be awaited directly.
export async function GET(_req, { params }) {
  const { id: idParam } = await params;
  const session = await getServerSession(authOptions);
  const id = Number(idParam);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: { select: { id: true, email: true, username: true, role: true } } },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const isAdmin = session?.user?.role === "admin";
  if (!isAdmin && (!session?.user?.id || Number(session.user.id) !== (order.userId ?? 0))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(order);
}

export async function PATCH(req, { params }) {
  const { id: idParam } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const id = Number(idParam);
  const body = await req.json().catch(() => ({}));
  const status = String(body?.status || "").trim();
  const allowed = ["Pendiente", "Procesado", "Enviado", "Entregado", "Cancelado"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const updated = await prisma.order.update({ where: { id }, data: { status } });

  // fetch user contact info and notify
  try {
    const full = await prisma.order.findUnique({ where: { id }, include: { user: true } });
    const user = full?.user;
    const email = user?.email;
    const phone = user?.phone;
    const subject = `Tu pedido #${id} cambió a ${status}`;
    const text = `Hola ${user?.username || ''},\n\nEl estado de tu pedido #${id} ha sido actualizado a: ${status}.\n\nGracias.`;
    const html = `<p>Hola ${user?.username || ''},</p><p>El estado de tu pedido <strong>#${id}</strong> ha sido actualizado a: <strong>${status}</strong>.</p><p>Gracias.</p>`;

    if (email) await sendEmail(email, subject, text, html);
    if (phone) await sendSms(phone, `Pedido #${id} — estado: ${status}`);
  } catch (e) {
    console.error('Error sending notifications:', e?.message || e);
  }

  return NextResponse.json(updated);
}
