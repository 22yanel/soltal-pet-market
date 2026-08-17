require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const path = require("path");

const port = Number(process.env.PORT || 8080);
const sessionId = process.env.OPENWA_SESSION_ID || "soltal-pet-market";
const phoneNumber = normalizeNumber(process.env.WHATSAPP_PHONE_NUMBER);
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
let reconnectTimer = null;

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
    const sentMessage = await whatsappClient.sendMessage(`${to}@s.whatsapp.net`, { text });
    return response.json({ ok: true, messageId: sentMessage.key?.id });
  } catch (error) {
    console.error("No se pudo enviar el mensaje:", error.message);
    return response.status(502).json({ error: "No se pudo enviar el mensaje." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Puente OpenWA escuchando en el puerto ${port}.`);
});

async function initializeClient() {
  const baileys = await import("@whiskeysockets/baileys");
  const loggerModule = await import("pino");
  const logger = loggerModule.default({ level: "silent" });
  const authPath = path.join("session-data", sessionId);
  const { state, saveCreds } = await baileys.useMultiFileAuthState(authPath);
  const { version } = await baileys.fetchLatestBaileysVersion();
  const client = baileys.default({
    version,
    auth: state,
    logger,
    browser: baileys.Browsers.windows("Chrome"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  client.ev.on("creds.update", saveCreds);
  client.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") return;
    for (const item of messages) {
      const jid = item.key?.remoteJid || "";
      const body =
        item.message?.conversation ||
        item.message?.extendedTextMessage?.text ||
        item.message?.imageMessage?.caption ||
        item.message?.videoMessage?.caption ||
        "";
      deliverIncomingMessage({
        id: item.key?.id,
        from: jid,
        body,
        type: "chat",
        t: Number(item.messageTimestamp || Math.floor(Date.now() / 1000)),
        fromMe: Boolean(item.key?.fromMe),
        isGroupMsg: jid.endsWith("@g.us"),
      }).catch((error) =>
        console.error("No se pudo entregar el mensaje entrante:", error.message)
      );
    }
  });

  client.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      whatsappClient = client;
      console.log("WhatsApp conectado para Soltal Pet Market.");
      return;
    }
    if (connection !== "close") return;
    whatsappClient = null;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    if (statusCode === baileys.DisconnectReason.loggedOut) {
      console.error("WhatsApp cerró la sesión. Es necesario vincularlo otra vez.");
      return;
    }
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => initializeClient().catch(console.error), 3_000);
  });

  if (!state.creds.registered) {
    if (!phoneNumber) {
      throw new Error("Configura WHATSAPP_PHONE_NUMBER con el número que se vinculará.");
    }
    const requestCode = async (attempt = 1) => {
      try {
        const code = await client.requestPairingCode(phoneNumber);
        console.log(`CÓDIGO DE VINCULACIÓN: ${code.match(/.{1,4}/g).join("-")}`);
      } catch (error) {
        if (attempt < 4) {
          setTimeout(() => requestCode(attempt + 1), 5_000);
          return;
        }
        console.error("No se pudo generar el código de vinculación:", error.message);
      }
    };
    setTimeout(() => requestCode(), 5_000);
  }
}

initializeClient().catch((error) => {
  console.error("El motor de WhatsApp no pudo iniciar:", error);
  process.exitCode = 1;
});
