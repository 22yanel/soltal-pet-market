import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body?.customer || !Array.isArray(body?.items)) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const order = {
    id: `PMS-${Date.now()}`,
    status: "received",
    createdAt: new Date().toISOString(),
    ...body,
  };

  console.log("Nuevo pedido recibido:", order);
  return NextResponse.json({ ok: true, order });
}
