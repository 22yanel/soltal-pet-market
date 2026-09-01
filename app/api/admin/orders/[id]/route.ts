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

  const { data: updateResult, error } = await supabaseAdmin.rpc(
    "update_order_status_with_stock",
    {
      p_order_id: Number(params.id),
      p_new_status: body.status,
    }
  );

  if (error) {
    const isConflict =
      error.code === "P0001" ||
      error.code === "P0002" ||
      /stock|reactivar|producto/i.test(error.message);

    return NextResponse.json(
      { error: error.message },
      {
        status: isConflict ? 409 : 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const data = Array.isArray(updateResult) ? updateResult[0] : updateResult;

  if (!data) {
    return NextResponse.json(
      { error: "No se pudo actualizar el pedido." },
      { status: 500 }
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
