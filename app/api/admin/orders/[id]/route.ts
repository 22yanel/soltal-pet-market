import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    .eq("id", Number(params.id))
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    { order: data },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

