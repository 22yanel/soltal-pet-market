import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name || !body.category || !body.subCategory || !body.price) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      name: body.name,
      category: body.category,
      sub_category: body.subCategory,
      price: Number(body.price),
      stock: Number(body.stock || 0),
      image: body.image || "",
      description: body.description || "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
