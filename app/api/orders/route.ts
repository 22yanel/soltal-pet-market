import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyWhatsAppNumbers } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(value: unknown) {
  return `RD$${Number(value || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatOrderDate(value: unknown) {
  const date = new Date(String(value || ""));

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleString("es-DO", {
    timeZone: "America/Santo_Domingo",
    dateStyle: "long",
    timeStyle: "short",
  });
}

function buildInvoiceEmail(order: any) {
  const customer = order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];

  const statusLabels: Record<string, string> = {
    received: "Recibido",
    preparing: "En preparación",
    on_the_way: "En camino",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

  const status = statusLabels[order.status] || order.status || "Recibido";
  const customerName = customer.fullName || "Cliente";
  const mapsUrl = typeof customer.mapsUrl === "string" ? customer.mapsUrl.trim() : "";
  const safeMapsUrl = /^https?:\/\//i.test(mapsUrl) ? escapeHtml(mapsUrl) : "";

  const productsRows = items
    .map((item: any, index: number) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);

      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:13px;vertical-align:top;">${index + 1}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:700;vertical-align:top;">${escapeHtml(item.name || "Producto")}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;color:#334155;font-size:14px;text-align:center;vertical-align:top;">${quantity}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;color:#334155;font-size:14px;text-align:right;vertical-align:top;white-space:nowrap;">${formatMoney(price)}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:800;text-align:right;vertical-align:top;white-space:nowrap;">${formatMoney(price * quantity)}</td>
        </tr>
      `;
    })
    .join("");

  const mapsButton = safeMapsUrl
    ? `
      <tr>
        <td style="padding-top:14px;">
          <a href="${safeMapsUrl}" target="_blank" rel="noreferrer" style="display:inline-block;background:#ffffff;border:1px solid #bbf7d0;color:#166534;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:800;">
            Ver ubicación en Google Maps
          </a>
        </td>
      </tr>
    `
    : "";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Factura Soltal Pet Market</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f7f4;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          Recibimos tu pedido #${escapeHtml(order.id)} en Soltal Pet Market por ${formatMoney(order.total)}.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f7f4;margin:0;padding:0;">
          <tr>
            <td align="center" style="padding:28px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:720px;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,.06);">
                <tr>
                  <td style="background:#14532d;padding:28px 30px;color:#ffffff;">
                    <div style="font-size:25px;line-height:1.2;font-weight:900;letter-spacing:.3px;">SOLTAL PET MARKET</div>
                    <div style="font-size:13px;line-height:1.5;color:#dcfce7;margin-top:6px;">Todo para tus animales en un solo lugar</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size:14px;color:#64748b;padding-bottom:8px;">Hola, ${escapeHtml(customerName)}</td>
                      </tr>
                      <tr>
                        <td style="font-size:25px;line-height:1.25;font-weight:900;color:#0f172a;padding-bottom:8px;">¡Recibimos tu pedido!</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;line-height:1.65;color:#475569;padding-bottom:22px;">
                          Gracias por comprar en Soltal Pet Market. A continuación encontrarás el resumen completo de tu compra. Conserva este correo como comprobante de tu pedido.
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:24px;">
                      <tr>
                        <td style="padding:18px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="font-size:12px;color:#64748b;padding-bottom:5px;">NÚMERO DE PEDIDO</td>
                              <td align="right" style="font-size:12px;color:#64748b;padding-bottom:5px;">ESTADO</td>
                            </tr>
                            <tr>
                              <td style="font-size:21px;font-weight:900;color:#0f172a;">#${escapeHtml(order.id)}</td>
                              <td align="right"><span style="display:inline-block;padding:7px 11px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:900;">${escapeHtml(status)}</span></td>
                            </tr>
                            <tr>
                              <td colspan="2" style="font-size:12px;color:#64748b;padding-top:10px;">${escapeHtml(formatOrderDate(order.created_at))}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="font-size:16px;font-weight:900;color:#14532d;margin-bottom:12px;">Datos de entrega</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:14px;margin-bottom:26px;">
                      <tr>
                        <td style="padding:18px;font-size:14px;line-height:1.7;color:#334155;">
                          <strong style="color:#0f172a;">${escapeHtml(customer.fullName || "No indicado")}</strong><br />
                          ${escapeHtml(customer.phone || "Teléfono no indicado")}<br />
                          ${escapeHtml(customer.email || "Correo no indicado")}<br /><br />
                          ${escapeHtml(customer.address || "Dirección no indicada")}<br />
                          ${escapeHtml(customer.sector || "Sector no indicado")}${customer.city ? `, ${escapeHtml(customer.city)}` : ""}<br />
                          ${customer.reference ? `<span style="color:#64748b;">Referencia: ${escapeHtml(customer.reference)}</span>` : ""}
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">${mapsButton}</table>
                        </td>
                      </tr>
                    </table>

                    <div style="font-size:16px;font-weight:900;color:#14532d;margin-bottom:12px;">Detalle de la compra</div>
                    <div style="width:100%;overflow-x:auto;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                        <thead>
                          <tr style="background:#f8fafc;">
                            <th style="padding:11px 12px;text-align:left;color:#64748b;font-size:11px;letter-spacing:.3px;">#</th>
                            <th style="padding:11px 12px;text-align:left;color:#64748b;font-size:11px;letter-spacing:.3px;">PRODUCTO</th>
                            <th style="padding:11px 12px;text-align:center;color:#64748b;font-size:11px;letter-spacing:.3px;">CANT.</th>
                            <th style="padding:11px 12px;text-align:right;color:#64748b;font-size:11px;letter-spacing:.3px;">PRECIO</th>
                            <th style="padding:11px 12px;text-align:right;color:#64748b;font-size:11px;letter-spacing:.3px;">SUBTOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${productsRows || `<tr><td colspan="5" style="padding:18px;color:#64748b;text-align:center;">No hay productos registrados.</td></tr>`}
                        </tbody>
                      </table>
                    </div>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
                      <tr>
                        <td></td>
                        <td width="290" style="background:#14532d;border-radius:14px;padding:18px 20px;color:#ffffff;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="font-size:13px;color:#dcfce7;">TOTAL DEL PEDIDO</td>
                              <td align="right" style="font-size:22px;font-weight:900;white-space:nowrap;">${formatMoney(order.total)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;background:#fffbeb;border:1px solid #fde68a;border-radius:14px;">
                      <tr>
                        <td style="padding:16px 18px;font-size:13px;line-height:1.6;color:#78350f;">
                          <strong>Importante:</strong> guarda el número de pedido <strong>#${escapeHtml(order.id)}</strong>. Te servirá para identificar tu compra y consultar su estado.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:22px 30px;text-align:center;font-size:12px;line-height:1.6;color:#64748b;">
                    Gracias por confiar en <strong style="color:#14532d;">Soltal Pet Market</strong>.<br />
                    Este correo fue generado automáticamente al registrar tu pedido.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendInvoiceEmail(order: any) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  const customerEmail = order.customer?.email;
  const fromEmail = process.env.INVOICE_FROM_EMAIL || "Soltal Pet Market <onboarding@resend.dev>";

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
      from: fromEmail,
      to: recipients,
      subject: `Pedido #${order.id} confirmado | Soltal Pet Market`,
      html: buildInvoiceEmail(order),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Error enviando factura:", errorText);
  }
}

async function sendWhatsAppOrderNotification(order: any) {
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

  const mapsText = customer.mapsUrl ? customer.mapsUrl : "No indicado";

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
🗺️ *Google Maps:* ${mapsText}

🧾 *Productos:*
${productsText || "No indicado"}
`;

  await notifyWhatsAppNumbers(message.trim());
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
  await sendWhatsAppOrderNotification(order);

  return NextResponse.json(
    {
      ok: true,
      message:
        "Pedido creado correctamente, stock actualizado, factura enviada y WhatsApp notificado.",
      order,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
