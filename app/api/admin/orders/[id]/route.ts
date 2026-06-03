import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const allowedStatuses = [
  "received",
  "preparing",
  "on_the_way",
  "delivered",
  "cancelled",
];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  if (!allowedStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: "Estado no permitido." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: body.status })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
