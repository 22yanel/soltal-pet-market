type WhatsAppTextMessage = {
  to: string;
  text: string;
};

function normalizeWhatsAppNumber(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function getWhatsAppConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v23.0",
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
  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig();
  const normalizedTo = normalizeWhatsAppNumber(to);

  if (!accessToken || !phoneNumberId) {
    console.log("Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.");
    return false;
  }

  if (!normalizedTo) {
    console.log("El destinatario de WhatsApp no es válido.");
    return false;
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "text",
        text: {
          preview_url: true,
          body: text,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Error enviando mensaje a WhatsApp:", errorText);
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
