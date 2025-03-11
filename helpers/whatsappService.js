const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

let sock;
let isConnecting = false;
let keepAliveInterval;

const startWhatsApp = async () => {
  if (isConnecting) return;
  isConnecting = true;

  console.log("🟡 Initializing WhatsApp connection...");

  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  return new Promise((resolve, reject) => {
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        console.log("✅ WhatsApp Connected!");
        isConnecting = false;
        startKeepAlive();
        resolve(sock);
      } else if (connection === "connecting") {
        console.log("⏳ Connecting to WhatsApp...");
      } else if (connection === "close") {
        isConnecting = false;
        stopKeepAlive();

        if (
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          console.log("🔄 Connection lost. Reconnecting...");
          startWhatsApp();
        } else {
          console.log("❌ Logged out. Please scan the QR code again.");
          reject(new Error("Logged out. Scan QR code again."));
        }
      }
    });
    sock.ev.on("messages.upsert", async ({ messages }) => {
      if (!messages || !messages[0]?.message) return;

      const msg = messages[0];
      const senderJid = msg.key.remoteJid;
      const messageText =
        msg.message.conversation || msg.message.extendedTextMessage?.text;

      if (!messageText) return;

      console.log(`📩 Received message from ${senderJid}: ${messageText}`);

      if (messageText.toLowerCase() === ".ping") {
        await sock.sendMessage(senderJid, { text: `*ᑭOᑎG!* 🤖` });

        console.log(`🔄 Replied with Pong!`);
      }
    });

    return sock;
  });
};

const startKeepAlive = () => {
  stopKeepAlive();
  keepAliveInterval = setInterval(async () => {
    if (sock?.user) {
      await sock.sendPresenceUpdate("available");
      console.log("🔄 Keep-alive ping sent");
    }
  }, 1800000);
};

const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
};

const getWhatsAppClient = async () => {
  if (!sock) {
    console.log("⚠️ WhatsApp client not initialized. Initializing now...");
    return await startWhatsApp();
  }

  if (sock.ws.readyState !== 1) {
    console.log("⏳ Waiting for WhatsApp to be fully connected...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return sock;
};

const sendWhatsAppMessage = async (mobileNo, message) => {
  try {
    const client = await getWhatsAppClient();

    if (!client) {
      throw new Error("WhatsApp client is not available.");
    }

    const formattedMobileNo = `91${mobileNo}@s.whatsapp.net`;

    console.log(`📤 Sending message to ${mobileNo}...`);
    await client.sendMessage(formattedMobileNo, { text: message });

    console.log(`📩 Message sent successfully to ${mobileNo}`);
  } catch (error) {
    console.error("❌ Error sending message:", error.message);
  }
};

module.exports = { sendWhatsAppMessage };
