import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const body = await request.json();

  const orderId = body.orderId;
  const phone = body.phone;

  if (!orderId || !phone) {
    return NextResponse.json(
      { error: "Debes escribir el número de pedido y teléfono." },
      { status: 400 }
    );
  }

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", Number(orderId))
    .single();

  if (error || !order) {
    return NextResponse.json(
      { error: "No encontramos ese pedido." },
      { status: 404 }
    );
  }

  const customerPhone = String(order.customer?.phone || "").replace(/\D/g, "");
  const typedPhone = String(phone || "").replace(/\D/g, "");

  if (!customerPhone || customerPhone !== typedPhone) {
    return NextResponse.json(
      { error: "El teléfono no coincide con ese pedido." },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { order },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
