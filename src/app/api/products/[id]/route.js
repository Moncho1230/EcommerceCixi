import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
const prisma = new PrismaClient()

export async function PATCH(req, context) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { params } = await context
    const { id } = params
    const { price, stock } = await req.json()

    const data = {}
    if (price !== undefined && price !== null) data.price = Number(price)
    if (stock !== undefined && stock !== null) data.stock = Number(stock)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await prisma.product.update({
      where: { id: Number(id) }, 
      data
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, context) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { params } = await context
    const { id } = params
    await prisma.product.delete({
      where: { id: Number(id) } 
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
