require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const { create } = require("@open-wa/wa-automate");

const port = Number(process.env.PORT || 8080);
const sessionId = process.env.OPENWA_SESSION_ID || "soltal-pet-market";
const headless = process.env.OPENWA_HEADLESS === "true";
const apiKey = process.env.OPENWA_API_KEY;
const webhookUrl = process.env.OPENWA_WEBHOOK_URL;
const webhookSecret = process.env.OPENWA_WEBHOOK_SECRET;

if (!apiKey || !webhookUrl || !webhookSecret) {
  throw new Error(
    "Configura OPENWA_API_KEY, OPENWA_WEBHOOK_URL y OPENWA_WEBHOOK_SECRET."
  );
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

let whatsappClient = null;

function safeEqual(value, expected) {
  const valueBuffer = Buffer.from(String(value || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));
  return (
    valueBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

function normalizeNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function sign(payload) {
  return `sha256=${crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex")}`;
}

async function deliverIncomingMessage(message) {
  if (!message || message.fromMe || message.isGroupMsg || !message.body) return;

  const payload = JSON.stringify({
    event: "message.received",
    message: {
      id: message.id,
      from: message.from,
      body: message.body,
      type: message.type,
      timestamp: message.t,
    },
  });

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OpenWA-Signature": sign(payload),
    },
    body: payload,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`El webhook respondió ${response.status}.`);
  }
}

app.get("/health", (_request, response) => {
  response.json({ ok: true, whatsappReady: Boolean(whatsappClient), sessionId });
});

app.post("/send", async (request, response) => {
  if (!safeEqual(request.header("X-API-Key"), apiKey)) {
    return response.status(401).json({ error: "No autorizado." });
  }

  if (!whatsappClient) {
    return response.status(503).json({ error: "WhatsApp todavía no está conectado." });
  }

  const to = normalizeNumber(request.body?.to);
  const text = String(request.body?.text || "").trim();

  if (!to || !text || text.length > 4096) {
    return response.status(400).json({ error: "Destinatario o mensaje no válido." });
  }

  try {
    const messageId = await whatsappClient.sendText(`${to}@c.us`, text);
    return response.json({ ok: true, messageId });
  } catch (error) {
    console.error("No se pudo enviar el mensaje:", error.message);
    return response.status(502).json({ error: "No se pudo enviar el mensaje." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Puente OpenWA escuchando en el puerto ${port}.`);
});

create({
  sessionId,
  sessionDataPath: "session-data",
  multiDevice: true,
  headless,
  authTimeout: 0,
  qrTimeout: 0,
  cacheEnabled: false,
  killProcessOnBrowserClose: false,
})
  .then((client) => {
    whatsappClient = client;
    client.onMessage((message) => {
      deliverIncomingMessage(message).catch((error) =>
        console.error("No se pudo entregar el mensaje entrante:", error.message)
      );
    });
    console.log("WhatsApp conectado para Soltal Pet Market.");
  })
  .catch((error) => {
    console.error("OpenWA no pudo iniciar:", error);
    process.exitCode = 1;
  });
