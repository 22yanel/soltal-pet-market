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

function buildInvoiceEmail(order: any) {
  const customer = order.customer || {};
  const items = order.items || [];

  const statusLabels: Record<string, string> = {
    received: "Recibido",
    preparing: "En preparación",
    on_the_way: "En camino",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

  const productsRows = items
    .map(
      (item: any) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${item.name}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${item.quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">RD$${Number(item.price).toLocaleString("es-DO")}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">RD$${Number(item.price * item.quantity).toLocaleString("es-DO")}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;background:#f7fbf5;padding:30px;color:#0f172a;">
      <div style="max-width:850px;margin:auto;background:#ffffff;border-radius:24px;padding:32px;">
        <div style="border-bottom:3px solid #15803d;padding-bottom:20px;margin-bottom:24px;">
          <h1 style="color:#15803d;font-size:28px;font-weight:900;margin:0;">
            SOLTAL PET MARKET
          </h1>

          <p style="margin:6px 0 0;color:#64748b;">
            Todo para tus animales en un solo lugar
          </p>

          <h2 style="margin:22px 0 0;font-size:26px;">
            Factura #${order.id}
          </h2>

          <p style="margin:6px 0;color:#64748b;">
            Fecha: ${new Date(order.created_at).toLocaleString("es-DO")}
          </p>

          <span style="display:inline-block;margin-top:8px;padding:8px 14px;border-radius:999px;background:#dcfce7;color:#166534;font-weight:800;">
            Estado: ${statusLabels[order.status] || order.status}
          </span>
        </div>

        <div style="background:#f7fbf5;padding:18px;border-radius:18px;margin-bottom:20px;">
          <h3 style="margin-top:0;color:#15803d;">Datos del cliente</h3>
          <p><strong>Nombre:</strong> ${customer.fullName || "No indicado"}</p>
          <p><strong>Teléfono:</strong> ${customer.phone || "No indicado"}</p>
          <p><strong>Correo:</strong> ${customer.email || "No indicado"}</p>
          <p><strong>Ciudad:</strong> ${customer.city || "No indicado"}</p>
          <p><strong>Sector:</strong> ${customer.sector || "No indicado"}</p>
          <p><strong>Dirección:</strong> ${customer.address || "No indicado"}</p>
          <p><strong>Referencia:</strong> ${customer.reference || "No indicado"}</p>
          <p><strong>Google Maps:</strong> ${customer.mapsUrl || "No indicado"}</p>
        </div>

        <h3>Productos comprados</h3>

        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          <thead>
            <tr>
              <th style="text-align:left;background:#14532d;color:white;padding:12px;">Producto</th>
              <th style="text-align:left;background:#14532d;color:white;padding:12px;">Cantidad</th>
              <th style="text-align:left;background:#14532d;color:white;padding:12px;">Precio</th>
              <th style="text-align:left;background:#14532d;color:white;padding:12px;">Subtotal</th>
            </tr>
          </thead>

          <tbody>
            ${productsRows}
          </tbody>
        </table>

        <div style="margin-top:24px;text-align:right;font-size:28px;font-weight:900;color:#15803d;">
          Total: RD$${Number(order.total).toLocaleString("es-DO")}
        </div>

        <p style="margin-top:30px;color:#64748b;text-align:center;">
          Gracias por comprar en Soltal Pet Market. Guarda tu número de pedido para consultar el estado.
        </p>
      </div>
    </div>
  `;
}

async function sendInvoiceEmail(order: any) {
  async function sendTelegramOrderNotification(order: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log("Faltan variables de Telegram.");
    return;
  }

  const customer = order.customer || {};
  const items = order.items || [];

  const productsText = items
    .map(
      (item: any) =>
        `• ${item.name} x${item.quantity} - RD$${Number(
          item.price * item.quantity
        ).toLocaleString("es-DO")}`
    )
    .join("\n");

  const message = `
🛒 *Nuevo pedido en Soltal Pet Market*

📦 *Pedido:* #${order.id}
📌 *Estado:* Recibido
💰 *Total:* RD$${Number(order.total).toLocaleString("es-DO")}

👤 *Cliente:* ${customer.fullName || "No indicado"}
📞 *Teléfono:* ${customer.phone || "No indicado"}
📧 *Correo:* ${customer.email || "No indicado"}

📍 *Ciudad:* ${customer.city || "No indicado"}
🏘️ *Sector:* ${customer.sector || "No indicado"}
🏠 *Dirección:* ${customer.address || "No indicado"}
📌 *Referencia:* ${customer.reference || "No indicado"}
🗺️ *Google Maps:* ${customer.mapsUrl || "No indicado"}

🧾 *Productos:*
${productsText}
`;

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Error enviando mensaje a Telegram:", errorText);
  }
}
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  const customerEmail = order.customer?.email;

  if (!resendApiKey) {
    console.log("Falta RESEND_API_KEY.");
    return;
  }

  if (!customerEmail) {
    console.log("El cliente no indicó correo.");
    return;
  }

  const recipients = adminEmail ? [customerEmail, adminEmail] : [customerEmail];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Soltal Pet Market <onboarding@resend.dev>",
      to: recipients,
      subject: `Factura Soltal Pet Market - Pedido #${order.id}`,
      html: buildInvoiceEmail(order),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Error enviando factura:", errorText);
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  const authHeader = request.headers.get("authorization");
  let loggedUser = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAdmin.auth.getUser(token);
    loggedUser = data.user || null;
  }

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
    user_id: loggedUser?.id || null,
    user_email: loggedUser?.email || body.customer?.email || null,
  };

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert(orderPayload)
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
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

  await sendInvoiceEmail(order);
  await sendTelegramOrderNotification(order);

  return NextResponse.json(
    {
      ok: true,
      message:
        "Pedido creado correctamente, stock actualizado y factura enviada.",
      order,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
