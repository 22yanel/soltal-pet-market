import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export async function POST(request: Request) {
  const body = await request.json();

  if (!body?.customer || !Array.isArray(body?.items)) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  if (body.items.length === 0) {
    return NextResponse.json(
      { error: "El carrito está vacío." },
      { status: 400 }
    );
  }

  const items: OrderItem[] = body.items;

  for (const item of items) {
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("id, name, stock")
      .eq("id", item.id)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: `No se encontró el producto: ${item.name}` },
        { status: 400 }
      );
    }

    if (Number(product.stock) < Number(item.quantity)) {
      return NextResponse.json(
        {
          error: `No hay stock suficiente para ${product.name}. Stock disponible: ${product.stock}`,
        },
        { status: 400 }
      );
    }
  }

  const orderPayload = {
    customer: body.customer,
    items: body.items,
    total: Number(body.total),
    status: "received",
  };

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert(orderPayload)
    .select()
    .single();

  if (orderError) {
    return NextResponse.json(
      { error: orderError.message },
      { status: 500 }
    );
  }

  for (const item of items) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("stock")
      .eq("id", item.id)
      .single();

    const currentStock = Number(product?.stock || 0);
    const newStock = Math.max(0, currentStock - Number(item.quantity));

    await supabaseAdmin
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.id);
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Pedido creado correctamente y stock actualizado.",
      order,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
