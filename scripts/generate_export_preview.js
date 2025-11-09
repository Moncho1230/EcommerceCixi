const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

(async () => {
  const prisma = new PrismaClient();
  try {
    const items = await prisma.orderItem.findMany({
      where: { productId: { not: null } },
      select: { productId: true, name: true, unitPrice: true, quantity: true },
    });

    const map = new Map();
    for (const it of items) {
      const key = Number(it.productId);
      if (!map.has(key)) map.set(key, { productId: key, name: it.name || '', totalQuantity: 0, totalRevenue: 0 });
      const acc = map.get(key);
      acc.totalQuantity += Number(it.quantity || 0);
      acc.totalRevenue += Number(it.unitPrice || 0) * Number(it.quantity || 0);
      if (!acc.name && it.name) acc.name = it.name;
    }

    const qtyRows = Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity || b.totalRevenue - a.totalRevenue).slice(0, 10);
    const revRows = Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalQuantity - a.totalQuantity).slice(0, 10);

    fs.writeFileSync('export_quantity.json', JSON.stringify({ rows: qtyRows, sortBy: 'quantity' }, null, 2));
    fs.writeFileSync('export_revenue.json', JSON.stringify({ rows: revRows, sortBy: 'revenue' }, null, 2));

    console.log('Wrote export_quantity.json and export_revenue.json (top 10).');
  } catch (e) {
    console.error('Error generating preview:', e.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
