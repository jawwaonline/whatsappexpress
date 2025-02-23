import express from "express";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import cors from "cors";
import "dotenv/config";

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.BEARER_TOKEN;
const PORT = process.env.PORT || 3000;
const SESSION_PATH = `./data/${CLIENT_ID}`;
const MAIN_RECEIVER = process.env.MAIN_RECEIVER;

const validateToken = (req, res, next) => {
  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    return res.status(403).json({ error: "Ungültiges Token" });
  }
  next();
};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "WhatsApp API" });
});

app.get("/status", (req, res) => {
  console.log("GET /status");
  res.json({ status: "OK" });
});

app.post("/send", validateToken, async (req, res) => {
  try {
    const { receiver, message } = req.body;
    if (!receiver || !message) {
      return res.status(400).json({ error: "Empfänger und Nachricht erforderlich" });
    }

    const number = receiver.includes("@c.us") ? receiver : `${receiver}@c.us`;

    const isRegistered = await client.isRegisteredUser(number);
    if (!isRegistered) {
      return res.status(400).json({ error: "Empfänger nicht registriert" });
    }

    await client.sendMessage(number, message);
    res.json({ success: true, message: "Nachricht gesendet", receiver: number });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Initialisiere den WhatsApp-Client
const client = new Client({
  puppeteer: { headless: true },
  authStrategy: new LocalAuth({ clientId: CLIENT_ID, dataPath: SESSION_PATH }),
});

client.initialize();

// INITIALIZE

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR Code erhalten. Bitte scannen!");
});

client.on("ready", async () => {
  console.log("READY");
  const debugWWebVersion = await client.getWWebVersion();
  console.log(`WWebVersion = ${debugWWebVersion}`);

  client.pupPage.on("pageerror", function (err) {
    console.log("Page error: " + err.toString());
  });
  client.pupPage.on("error", function (err) {
    console.log("Page error: " + err.toString());
  });
});

client.on("auth_failure", (msg) => {
  console.error("AUTHENTICATION FAILURE", msg);
});

// RECEIVING MESSAGES
client.on("message", async (msg) => {
  const sender = msg.from;

  console.log("Nachricht erhalten:", msg.body);
  console.log("Von:", sender);

  client.sendMessage(MAIN_RECEIVER, `Nachricht empfangen von ${sender}: ${msg.body}`);
});

app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
