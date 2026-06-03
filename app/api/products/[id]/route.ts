import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  if (!body.name || !body.category || !body.subCategory || !body.price) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({
      name: body.name,
      category: body.category,
      sub_category: body.subCategory,
      price: Number(body.price),
      stock: Number(body.stock || 0),
      image: body.image || "",
      description: body.description || "",
    })
    .eq("id", Number(params.id))
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", Number(params.id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
