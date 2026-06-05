import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function canCustomerModifyOrder(status: string) {
  return status === "received" || status === "preparing";
}

async function sendTelegramMessage(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log("Faltan variables de Telegram.");
    return;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Error enviando Telegram:", errorText);
  }
}

async function sendCustomerEmail(order: any, subject: string, message: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  const customerEmail = order.customer?.email || order.user_email;

  if (!resendApiKey || !customerEmail) {
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
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f7fbf5;padding:30px;color:#0f172a;">
          <div style="max-width:750px;margin:auto;background:white;border-radius:24px;padding:32px;">
            <h1 style="color:#15803d;margin:0;">SOLTAL PET MARKET</h1>
            <p style="color:#64748b;">Actualización de pedido</p>

            <h2>Pedido #${order.id}</h2>

            <p style="font-size:16px;line-height:1.7;">
              Hola ${order.customer?.fullName || "cliente"}, ${message}
            </p>

            <div style="background:#f7fbf5;padding:18px;border-radius:18px;margin-top:20px;">
              <p><strong>Estado:</strong> ${order.status}</p>
              <p><strong>Teléfono:</strong> ${order.customer?.phone || "No indicado"}</p>
              <p><strong>Dirección:</strong> ${order.customer?.address || "No indicado"}</p>
              <p><strong>Sector:</strong> ${order.customer?.sector || "No indicado"}</p>
              <p><strong>Referencia:</strong> ${order.customer?.reference || "No indicado"}</p>
            </div>

            <p style="margin-top:25px;color:#64748b;text-align:center;">
              Gracias por usar Soltal Pet Market.
            </p>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Error enviando correo:", errorText);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const orderId = Number(body?.orderId);
    const phone = String(body?.phone || "");
    const action = String(body?.action || "");

    if (!orderId || !phone || !action) {
      return NextResponse.json(
        { error: "Datos incompletos." },
        { status: 400 }
      );
    }

    const { data: order, error: findError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (findError || !order) {
      return NextResponse.json(
        { error: "No encontramos ese pedido." },
        { status: 404 }
      );
    }

    const orderPhone = normalizePhone(order.customer?.phone || "");
    const inputPhone = normalizePhone(phone);

    if (!orderPhone || orderPhone !== inputPhone) {
      return NextResponse.json(
        { error: "El teléfono no coincide con el pedido." },
        { status: 403 }
      );
    }

    if (!canCustomerModifyOrder(order.status)) {
      return NextResponse.json(
        {
          error:
            "Este pedido ya no puede modificarse. Solo puedes cancelar o cambiar la dirección antes de que esté en camino.",
        },
        { status: 400 }
      );
    }

    if (action === "cancel") {
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .select("*")
        .single();

      if (updateError || !updatedOrder) {
        return NextResponse.json(
          { error: updateError?.message || "No se pudo cancelar el pedido." },
          { status: 500 }
        );
      }

      await sendTelegramMessage(
        `❌ *Pedido cancelado por el cliente*

📦 Pedido: #${orderId}
👤 Cliente: ${order.customer?.fullName || "No indicado"}
📞 Teléfono: ${order.customer?.phone || "No indicado"}
📍 Dirección: ${order.customer?.address || "No indicado"}`
      );

      await sendCustomerEmail(
        updatedOrder,
        `Pedido #${orderId} cancelado - Soltal Pet Market`,
        "tu pedido fue cancelado correctamente antes de salir en camino."
      );

      return NextResponse.json({
        ok: true,
        message: "Pedido cancelado correctamente.",
        order: updatedOrder,
      });
    }

    if (action === "update_address") {
      const newAddress = String(body?.address || "").trim();
      const newSector = String(body?.sector || "").trim();
      const newReference = String(body?.reference || "").trim();
      const newMapsUrl = String(body?.mapsUrl || "").trim();

      if (!newAddress) {
        return NextResponse.json(
          { error: "La nueva dirección es obligatoria." },
          { status: 400 }
        );
      }

      const updatedCustomer = {
        ...order.customer,
        address: newAddress,
        sector: newSector || order.customer?.sector || "",
        reference: newReference || order.customer?.reference || "",
        mapsUrl: newMapsUrl || order.customer?.mapsUrl || "",
      };

      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ customer: updatedCustomer })
        .eq("id", orderId)
        .select("*")
        .single();

      if (updateError || !updatedOrder) {
        return NextResponse.json(
          { error: updateError?.message || "No se pudo cambiar la dirección." },
          { status: 500 }
        );
      }

      await sendTelegramMessage(
        `📍 *Dirección actualizada por el cliente*

📦 Pedido: #${orderId}
👤 Cliente: ${order.customer?.fullName || "No indicado"}
📞 Teléfono: ${order.customer?.phone || "No indicado"}

🏠 Nueva dirección: ${newAddress}
🏘️ Sector: ${updatedCustomer.sector || "No indicado"}
📌 Referencia: ${updatedCustomer.reference || "No indicado"}
🗺️ Maps: ${updatedCustomer.mapsUrl || "No indicado"}`
      );

      await sendCustomerEmail(
        updatedOrder,
        `Dirección actualizada - Pedido #${orderId}`,
        "la dirección de envío de tu pedido fue actualizada correctamente antes de salir en camino."
      );

      return NextResponse.json({
        ok: true,
        message: "Dirección actualizada correctamente.",
        order: updatedOrder,
      });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.log("Error en customer-order-actions:", error);

    return NextResponse.json(
      { error: "Error procesando la solicitud." },
      { status: 500 }
    );
  }
}
