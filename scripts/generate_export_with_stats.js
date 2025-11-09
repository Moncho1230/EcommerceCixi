const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

(async () => {
  const prisma = new PrismaClient();
  try {
    const items = await prisma.orderItem.findMany({
      where: { productId: { not: null } },
      select: { productId: true, name: true, unitPrice: true, quantity: true, orderId: true },
    });

    const map = new Map();
    const ordersSet = new Set();
    for (const it of items) {
      const key = Number(it.productId);
      ordersSet.add(it.orderId);
      if (!map.has(key)) map.set(key, { productId: key, name: it.name || '', totalQuantity: 0, totalRevenue: 0, orderIds: new Set() });
      const acc = map.get(key);
      acc.totalQuantity += Number(it.quantity || 0);
      acc.totalRevenue += Number(it.unitPrice || 0) * Number(it.quantity || 0);
      if (it.orderId) acc.orderIds.add(it.orderId);
      if (!acc.name && it.name) acc.name = it.name;
    }

    const rows = Array.from(map.values()).map(r => ({
      productId: r.productId,
      name: r.name,
      totalQuantity: r.totalQuantity,
      totalRevenue: r.totalRevenue,
      orderCount: r.orderIds.size,
      avgUnitPrice: r.totalQuantity ? r.totalRevenue / r.totalQuantity : 0,
    }));

    const totalUnitsSold = rows.reduce((s, r) => s + r.totalQuantity, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const distinctProductsSold = rows.length;
    const totalOrders = ordersSet.size;
    const avgRevenuePerOrder = totalOrders ? totalRevenue / totalOrders : 0;
    const avgRevenuePerProduct = distinctProductsSold ? totalRevenue / distinctProductsSold : 0;

    const topByQuantity = [...rows].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5);
    const topByRevenue = [...rows].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

    // Prepare stats object
    const stats = {
      totalUnitsSold,
      totalRevenue,
      distinctProductsSold,
      totalOrders,
      avgRevenuePerOrder,
      avgRevenuePerProduct,
      topByQuantity: topByQuantity.map(r => ({ productId: r.productId, name: r.name, totalQuantity: r.totalQuantity })),
      topByRevenue: topByRevenue.map(r => ({ productId: r.productId, name: r.name, totalRevenue: r.totalRevenue })),
    };

  // helper to format money with simple peso symbol (e.g. $1,234.00)
  const formatMoney = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Write CSV with a stats section at the top
  const csvLines = [];
  csvLines.push('"Statistic","Value"');
  csvLines.push(`"Total units sold","${totalUnitsSold}"`);
  csvLines.push(`"Total revenue","${formatMoney(totalRevenue)}"`);
  csvLines.push(`"Distinct products sold","${distinctProductsSold}"`);
  csvLines.push(`"Total orders","${totalOrders}"`);
  csvLines.push(`"Average revenue per order","${formatMoney(avgRevenuePerOrder)}"`);
  csvLines.push(`"Average revenue per product","${formatMoney(avgRevenuePerProduct)}"`);
  csvLines.push('');
    csvLines.push('productId,name,totalQuantity,totalRevenue,orderCount,avgUnitPrice');
    for (const r of rows.sort((a, b) => b.totalQuantity - a.totalQuantity)) {
      // escape quotes in name
      const nameEsc = (r.name || '').replace(/"/g, '""');
      csvLines.push(`${r.productId},"${nameEsc}",${r.totalQuantity},${r.totalRevenue.toFixed(2)},${r.orderCount},${r.avgUnitPrice.toFixed(2)}`);
    }

    fs.writeFileSync('export_with_stats.csv', csvLines.join('\n'));

    // Create a simple PDF with stats + top tables
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();
    let y = height - 40;

    const drawText = (text, opts = {}) => {
      page.drawText(text, { x: 40 + (opts.x || 0), y: y - (opts.dy || 0), size: opts.size || 12, font: helvetica, color: rgb(0.2, 0.1, 0.1) });
      y -= (opts.moveY || (opts.size || 12) + (opts.gap || 6));
    };

    drawText('Export — Estadísticas de productos', { size: 16, moveY: 24 });
  drawText(`Total units sold: ${totalUnitsSold}`, { size: 11 });
  drawText(`Total revenue: ${formatMoney(totalRevenue)}`, { size: 11 });
    drawText(`Distinct products sold: ${distinctProductsSold}`, { size: 11 });
    drawText(`Total orders: ${totalOrders}`, { size: 11 });
  drawText(`Avg revenue / order: ${formatMoney(avgRevenuePerOrder)}`, { size: 11 });
    drawText('');
    drawText('Top products by quantity:', { size: 13 });

    for (const r of topByQuantity) {
      drawText(`- ${r.name} (qty: ${r.totalQuantity})`, { size: 11 });
    }

    drawText('');
    drawText('Top products by revenue:', { size: 13 });
    for (const r of topByRevenue) {
      drawText(`- ${r.name} (revenue: ${formatMoney(r.totalRevenue)})`, { size: 11 });
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('export_with_stats.pdf', pdfBytes);

    // Also write JSON preview for convenience
    fs.writeFileSync('export_with_stats.json', JSON.stringify({ stats, rows }, null, 2));

    console.log('Wrote export_with_stats.csv, export_with_stats.pdf and export_with_stats.json');
  } catch (e) {
    console.error('Error generating export with stats:', e.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
