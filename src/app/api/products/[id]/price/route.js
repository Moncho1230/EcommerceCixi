import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
const prisma = new PrismaClient()

export async function PATCH(req, context) {
  const { params } = await context
  const { id } = params
  const { price } = await req.json()
  const updated = await prisma.product.update({
    where: { id: Number(id) },
    data: { price: Number(price) }
  })
  return NextResponse.json(updated)
}
