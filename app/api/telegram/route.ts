import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
};

const statusLabels: Record<string, string> = {
  received: "Recibido",
  preparing: "En preparación",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
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

async function sendTelegramMessage(chatId: string | number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.log("Falta TELEGRAM_BOT_TOKEN.");
    return;
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const message = body?.message;
    const text: string = message?.text || "";
    const chatId = message?.chat?.id;

    if (!text || !chatId) {
      return NextResponse.json({ ok: true });
    }

    const newStatus = getStatusFromText(text);
    const orderId =
      getOrderIdFromText(text) ||
      getOrderIdFromText(message?.reply_to_message?.text || "");

    if (!newStatus) {
      return NextResponse.json({ ok: true });
    }

    if (!orderId) {
      await sendTelegramMessage(
        chatId,
        "⚠️ Debes indicar el número de pedido. Ejemplo:\n\n*preparando 12*\n*en camino 12*"
      );

      return NextResponse.json({ ok: true });
    }

    const { data: order, error: findError } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (findError || !order) {
      await sendTelegramMessage(
        chatId,
        `❌ No encontré el pedido #${orderId}.`
      );

      return NextResponse.json({ ok: true });
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      await sendTelegramMessage(
        chatId,
        `❌ Error actualizando el pedido #${orderId}: ${updateError.message}`
      );

      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(
      chatId,
      `✅ Pedido #${orderId} actualizado a: *${statusLabels[newStatus]}*`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("Error en webhook Telegram:", error);
    return NextResponse.json({ ok: true });
  }
}
