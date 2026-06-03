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

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: body.status })
    .eq("id", Number(params.id));

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: body.status,
  });
}
