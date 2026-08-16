import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createHmac, timingSafeEqual } from "crypto";
import {
  isAuthorizedWhatsAppSender,
  sendWhatsAppText,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusMap: Record<string, string> = {
  recibido: "received",
  recibida: "received",
  preparar: "preparing",
  preparando: "preparing",
  preparacion: "preparing",
  "en camino": "on_the_way",
  camino: "on_the_way",
  entregado: "delivered",
  entregada: "delivered",
  entrega: "delivered",
  entragado: "delivered",
  cancelado: "cancelled",
  cancelada: "cancelled",
  cancelar: "cancelled",
};

const statusLabels: Record<string, string> = {
  received: "Recibido",
  preparing: "En preparación",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const statusEmailMessages: Record<string, string> = {
  received:
    "Tu pedido fue recibido correctamente. Nuestro equipo ya tiene la información.",
  preparing:
    "Tu pedido está en preparación. Estamos organizando tus productos.",
  on_the_way:
    "Tu pedido ya va en camino. Pronto será entregado en la dirección indicada.",
  delivered:
    "Tu pedido fue marcado como entregado. Gracias por comprar en Soltal Pet Market.",
  cancelled:
    "Tu pedido fue cancelado. Si tienes dudas, puedes contactarnos.",
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getOrderIdFromText(text: string) {
  const match = text.match(/#?\b(\d+)\b/);
  return match ? Number(match[1]) : null;
}

function getStatusFromText(text: string) {
  const cleanText = normalizeText(text);

  if (cleanText.includes("en camino")) {
    return "on_the_way";
  }

  for (const key of Object.keys(statusMap)) {
    if (cleanText.includes(key)) {
      return statusMap[key];
    }
  }

  return null;
}

function hasValidOpenWASignature(
  rawBody: string,
  signatureHeader: string | null
) {
  const webhookSecret = process.env.OPENWA_WEBHOOK_SECRET;

  if (!webhookSecret || !signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex")}`;
  const receivedBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function buildStatusEmail(order: any, newStatus: string) {
  const customer = order.customer || {};
  const items = order.items || [];
  const productsRows = items
    .map(
      (item: any) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${item.name}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${item.quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">RD$${Number(item.price).toLocaleString("es-DO")}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">RD$${Number(item.price * item.quantity).toLocaleString("es-DO")}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;background:#f7fbf5;padding:30px;color:#0f172a;">
      <div style="max-width:850px;margin:auto;background:#ffffff;border-radius:24px;padding:32px;">
        <div style="border-bottom:3px solid #15803d;padding-bottom:20px;margin-bottom:24px;">
          <h1 style="color:#15803d;font-size:28px;font-weight:900;margin:0;">SOLTAL PET MARKET</h1>
          <p style="margin:6px 0 0;color:#64748b;">Actualización de tu pedido</p>
          <h2 style="margin:22px 0 0;font-size:26px;">Pedido #${order.id}</h2>
          <span style="display:inline-block;margin-top:12px;padding:10px 16px;border-radius:999px;background:#dcfce7;color:#166534;font-weight:900;">
            Estado: ${statusLabels[newStatus] || newStatus}
          </span>
        </div>
        <p style="font-size:17px;line-height:1.7;color:#334155;">
          Hola ${customer.fullName || "cliente"}, ${statusEmailMessages[newStatus] || "tu pedido fue actualizado."}
        </p>
        <h3>Productos</h3>
        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          <tbody>${productsRows}</tbody>
        </table>
        <div style="margin-top:24px;text-align:right;font-size:28px;font-weight:900;color:#15803d;">
          Total: RD$${Number(order.total).toLocaleString("es-DO")}
        </div>
      </div>
    </div>`;
}

async function sendStatusEmail(order: any, newStatus: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  const customerEmail = order.customer?.email || order.user_email;

  if (!resendApiKey || !customerEmail) return;

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
      subject: `Tu pedido #${order.id} está: ${statusLabels[newStatus] || newStatus}`,
      html: buildStatusEmail(order, newStatus),
    }),
  });

  if (!response.ok) {
    console.log("Error enviando correo de estado:", await response.text());
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, channel: "openwa" });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    if (
      !hasValidOpenWASignature(
        rawBody,
        request.headers.get("x-openwa-signature")
      )
    ) {
      return NextResponse.json(
        { error: "Firma de OpenWA no válida." },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const from = String(body?.message?.from || "").replace(/@c\.us$/i, "");
    const text = String(body?.message?.body || "");

    if (body?.event !== "message.received" || !from || !text) {
      return NextResponse.json({ ok: true });
    }

    if (!isAuthorizedWhatsAppSender(from)) {
      console.log("Mensaje de WhatsApp ignorado: remitente no autorizado.");
      return NextResponse.json({ ok: true });
    }

    const newStatus = getStatusFromText(text);
    const orderId = getOrderIdFromText(text);

    if (!newStatus) {
      return NextResponse.json({ ok: true });
    }

    if (!orderId) {
      await sendWhatsAppText({
        to: from,
        text: "⚠️ Debes indicar el número de pedido. Ejemplos:\n\npreparando 12\nen camino 12\nentregado 12",
      });
      return NextResponse.json({ ok: true });
    }

    const { data: order, error: findError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (findError || !order) {
      await sendWhatsAppText({
        to: from,
        text: `❌ No encontré el pedido #${orderId}.`,
      });
      return NextResponse.json({ ok: true });
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .select("*")
      .single();

    if (updateError || !updatedOrder) {
      await sendWhatsAppText({
        to: from,
        text: `❌ Error actualizando el pedido #${orderId}: ${updateError?.message || "Error desconocido"}`,
      });
      return NextResponse.json({ ok: true });
    }

    await sendStatusEmail(updatedOrder, newStatus);
    await sendWhatsAppText({
      to: from,
      text: `✅ Pedido #${orderId} actualizado a: ${statusLabels[newStatus]}\n📧 Correo enviado al cliente.`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("Error en webhook OpenWA:", error);
    return NextResponse.json({ ok: true });
  }
}
