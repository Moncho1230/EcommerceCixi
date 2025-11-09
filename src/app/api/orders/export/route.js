import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs"; // ensure Node APIs available for PDF generation

const prisma = new PrismaClient();

function buildCsv(rows, stats) {
  const lines = [];
  const formatMoney = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // stats section
  lines.push('"Statistic","Value"');
  lines.push(`"Total units sold","${stats.totalUnitsSold}"`);
  lines.push(`"Total revenue","${formatMoney(stats.totalRevenue)}"`);
  lines.push(`"Distinct products sold","${stats.distinctProductsSold}"`);
  lines.push(`"Total orders","${stats.totalOrders}"`);
  lines.push(`"Average revenue per order","${formatMoney(stats.avgRevenuePerOrder)}"`);
  lines.push(`"Average revenue per product","${formatMoney(stats.avgRevenuePerProduct)}"`);
  lines.push('');

  // table header
  lines.push('productId,name,totalQuantity,totalRevenue,orderCount,avgUnitPrice');
  for (const r of rows) {
    const nameEsc = (r.name || '').replace(/"/g, '""');
    lines.push(`${r.productId},"${nameEsc}",${r.totalQuantity},${r.totalRevenue.toFixed(2)},${r.orderCount || 0},${(r.avgUnitPrice || 0).toFixed(2)}`);
  }
  return lines.join('\n') + '\n';
}

async function buildPdf(rows, stats) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait in points
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;
  page.drawText('Reporte de productos — Estadísticas', { x: 40, y, size: 16, font: fontBold, color: rgb(0,0,0) });
  y -= 18;
  page.drawText(new Date().toLocaleString(), { x: 40, y, size: 10, font, color: rgb(0.4,0.4,0.4) });
  y -= 16;

  const formatMoney = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // stats block
  page.drawText(`Total unidades vendidas: ${stats.totalUnitsSold}`, { x: 40, y, size: 11, font });
  y -= 14;
  page.drawText(`Total ingresos: ${formatMoney(stats.totalRevenue)}`, { x: 40, y, size: 11, font });
  y -= 14;
  page.drawText(`Productos distintos vendidos: ${stats.distinctProductsSold}`, { x: 40, y, size: 11, font });
  y -= 14;
  page.drawText(`Pedidos totales: ${stats.totalOrders}`, { x: 40, y, size: 11, font });
  y -= 14;
  page.drawText(`Ingreso promedio por pedido: ${formatMoney(stats.avgRevenuePerOrder)}`, { x: 40, y, size: 11, font });
  y -= 18;

  page.drawText('Top por cantidad:', { x: 40, y, size: 13, font: fontBold });
  y -= 14;
  for (const r of stats.topByQuantity || []) {
    page.drawText(`- ${r.name} (qty: ${r.totalQuantity})`, { x: 50, y, size: 11, font });
    y -= 12;
    if (y < 80) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
  }
  y -= 8;
  page.drawText('Top por ingreso:', { x: 40, y, size: 13, font: fontBold });
  y -= 14;
  for (const r of stats.topByRevenue || []) {
    page.drawText(`- ${r.name} (revenue: ${formatMoney(r.totalRevenue)})`, { x: 50, y, size: 11, font });
    y -= 12;
    if (y < 80) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
  }

  // leave a gap then table title
  y -= 12;
  page.drawText('Detalle por producto:', { x: 40, y, size: 13, font: fontBold });
  y -= 16;

  // table header
  const headerSize = 12;
  page.drawText('ID', { x: 40, y, size: headerSize, font: fontBold });
  page.drawText('Producto', { x: 90, y, size: headerSize, font: fontBold });
  page.drawText('Cant.', { x: 360, y, size: headerSize, font: fontBold });
  page.drawText('Ingresos', { x: 430, y, size: headerSize, font: fontBold });
  y -= 14;

  const lineHeight = 14;
  for (const r of rows) {
    if (y < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - 50;
    }
    page.drawText(String(r.productId), { x: 40, y, size: 11, font });
    page.drawText(String((r.name || '(sin nombre)').slice(0, 40)), { x: 90, y, size: 11, font });
    page.drawText(String(r.totalQuantity), { x: 360, y, size: 11, font });
    page.drawText(formatMoney(r.totalRevenue), { x: 430, y, size: 11, font });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();
  const top = Math.max(1, Math.min(1000, Number(url.searchParams.get("top") || 50)));
  const sortBy = (url.searchParams.get("sort") || "quantity").toLowerCase(); // 'quantity' or 'revenue'

  // Fetch all product-linked order items and aggregate in JS
  const items = await prisma.orderItem.findMany({
    where: { productId: { not: null } },
    select: { productId: true, name: true, unitPrice: true, quantity: true, orderId: true },
  });

  const map = new Map();
  const ordersSet = new Set();
  for (const it of items) {
    const key = Number(it.productId);
    if (it.orderId) ordersSet.add(it.orderId);
    if (!map.has(key)) map.set(key, { productId: key, name: it.name || "", totalQuantity: 0, totalRevenue: 0, orderIds: new Set() });
    const acc = map.get(key);
    acc.totalQuantity += Number(it.quantity || 0);
    acc.totalRevenue += Number(it.unitPrice || 0) * Number(it.quantity || 0);
    if (it.orderId) acc.orderIds.add(it.orderId);
    if (!acc.name && it.name) acc.name = it.name;
  }

  let rows = Array.from(map.values());
  if (sortBy === "revenue") {
    rows = rows.sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalQuantity - a.totalQuantity);
  } else {
    // default: sort by quantity
    rows = rows.sort((a, b) => b.totalQuantity - a.totalQuantity || b.totalRevenue - a.totalRevenue);
  }
  rows = rows.slice(0, top);

  // compute stats
  const totalUnitsSold = Array.from(map.values()).reduce((s, r) => s + r.totalQuantity, 0);
  const totalRevenue = Array.from(map.values()).reduce((s, r) => s + r.totalRevenue, 0);
  const distinctProductsSold = Array.from(map.values()).length;
  const totalOrders = ordersSet.size;
  const avgRevenuePerOrder = totalOrders ? totalRevenue / totalOrders : 0;
  const avgRevenuePerProduct = distinctProductsSold ? totalRevenue / distinctProductsSold : 0;

  // augment rows with orderCount and avgUnitPrice
  rows = rows.map(r => ({ ...r, orderCount: (r.orderIds ? r.orderIds.size : 0), avgUnitPrice: r.totalQuantity ? r.totalRevenue / r.totalQuantity : 0 }));

  const topByQuantity = Array.from(map.values()).sort((a,b) => b.totalQuantity - a.totalQuantity).slice(0,5).map(r=>({ productId: r.productId, name: r.name, totalQuantity: r.totalQuantity }));
  const topByRevenue = Array.from(map.values()).sort((a,b) => b.totalRevenue - a.totalRevenue).slice(0,5).map(r=>({ productId: r.productId, name: r.name, totalRevenue: r.totalRevenue }));

  const stats = {
    totalUnitsSold,
    totalRevenue,
    distinctProductsSold,
    totalOrders,
    avgRevenuePerOrder,
    avgRevenuePerProduct,
    topByQuantity,
    topByRevenue,
  };

  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  if (format === "pdf") {
    const pdfBuffer = await buildPdf(rows, stats);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ventas_top_${ts}.pdf"`,
      },
    });
  }
  if (format === "json") {
    return NextResponse.json({ rows, sortBy, stats });
  }

  // default CSV
  const csv = buildCsv(rows, stats);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventas_top_${ts}.csv"`,
    },
  });
}
