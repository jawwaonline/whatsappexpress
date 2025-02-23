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
    return res.status(403).json({ error: "NOT AUTHORIZED - MISSING TOKEN" });
  }
  next();
};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  console.log("GET /");
  res.json({
    message: "WhatsApp API",
    status: "OK",
    endpoints: {
      send: "/send",
    },
  });
});

app.post("/send", validateToken, async (req, res) => {
  try {
    const { receiver, message } = req.body;
    if (!receiver || !message) {
      return res.status(400).json({ error: "RECEIVER AND MESSAGE REQUIRED" });
    }

    const number = receiver.includes("@c.us") ? receiver : `${receiver}@c.us`;

    const isRegistered = await client.isRegisteredUser(number);
    if (!isRegistered) {
      return res.status(400).json({ error: "RECEIVER NOT REGISTERED" });
    }
    await client.sendMessage(number, message);
    res.json({ success: true, message: "MESSAGE SENDED", receiver: number });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => console.log(`SERVER LISTENING ON PORT: ${PORT}`));

// --------------------------------- WHATSAPP CLIENT ----------------------------------
const client = new Client({
  puppeteer: { headless: true },
  authStrategy: new LocalAuth({ clientId: CLIENT_ID, dataPath: SESSION_PATH }),
});

client.initialize();

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR RECEIVED - PLEASE SCAN THE CODE WITH WHATSAPP");
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

  console.log("MESSAGE RECEIVED:", msg.body);
  console.log("FROM:", sender);

  client.sendMessage(MAIN_RECEIVER, `MESSAGE RECEIVED FROM ${sender}: ${msg.body}`);
});
