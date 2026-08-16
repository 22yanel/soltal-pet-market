type WhatsAppTextMessage = {
  to: string;
  text: string;
};

function normalizeWhatsAppNumber(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function getWhatsAppConfig() {
  return {
    gatewayUrl: String(process.env.OPENWA_GATEWAY_URL || "").replace(/\/$/, ""),
    apiKey: process.env.OPENWA_API_KEY,
  };
}

export function getWhatsAppNotifyNumbers() {
  return String(process.env.WHATSAPP_NOTIFY_NUMBERS || "")
    .split(",")
    .map(normalizeWhatsAppNumber)
    .filter(Boolean);
}

export function isAuthorizedWhatsAppSender(phone: string) {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  const allowedNumbers = String(
    process.env.WHATSAPP_ADMIN_NUMBERS || process.env.WHATSAPP_NOTIFY_NUMBERS || ""
  )
    .split(",")
    .map(normalizeWhatsAppNumber)
    .filter(Boolean);

  return Boolean(normalizedPhone && allowedNumbers.includes(normalizedPhone));
}

export async function sendWhatsAppText({ to, text }: WhatsAppTextMessage) {
  const { gatewayUrl, apiKey } = getWhatsAppConfig();
  const normalizedTo = normalizeWhatsAppNumber(to);

  if (!gatewayUrl || !apiKey) {
    console.log("Faltan OPENWA_GATEWAY_URL u OPENWA_API_KEY.");
    return false;
  }

  if (!normalizedTo) {
    console.log("El destinatario de WhatsApp no es válido.");
    return false;
  }

  const response = await fetch(`${gatewayUrl}/send`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: normalizedTo, text }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Error enviando mensaje mediante OpenWA:", errorText);
    return false;
  }

  return true;
}

export async function notifyWhatsAppNumbers(text: string) {
  const recipients = getWhatsAppNotifyNumbers();

  if (recipients.length === 0) {
    console.log("Falta WHATSAPP_NOTIFY_NUMBERS.");
    return false;
  }

  const results = await Promise.all(
    recipients.map((to) => sendWhatsAppText({ to, text }))
  );

  return results.some(Boolean);
}
