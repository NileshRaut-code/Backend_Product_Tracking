import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const __dirname = path.resolve();

// Use dynamic Railway port
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "https://product-tracking-ruddy.vercel.app", // your frontend
  })
);

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Routes for user + delivery pages
app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "public/user.html"));
});

app.get("/deliver", (req, res) => {
  res.sendFile(path.join(__dirname, "public/delivery.html"));
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});
// Storage for active connections
const delivery_Guys = new Map(); // ws -> orders[]
const user_socketid_order = new Map(); // ws -> order_id
const user_Guy = new Map(); // order_id -> ws

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "register_delivery_guy") {
        delivery_Guys.set(ws, data.orders || []);
        console.log("Delivery guy registered for orders:", data.orders);
      }

      if (data.type === "register_user") {
        user_Guy.set(data.order_id, ws);
        user_socketid_order.set(ws, data.order_id);
        console.log("User registered for order:", data.order_id);
      }

      if (data.type === "gpsupdate") {
        const gps = data.gps;
        const orders = delivery_Guys.get(ws);

        if (orders) {
          orders.forEach((id) => {
            const userWs = user_Guy.get(id);
            if (userWs && userWs.readyState === 1) {
              userWs.send(
                JSON.stringify({ type: "gps_user_receive", gps })
              );
            }
          });
        }
      }
    } catch (e) {
      console.error("Invalid message received:", message.toString());
    }
  });

  ws.on("close", () => {
    if (user_socketid_order.has(ws)) {
      const orderId = user_socketid_order.get(ws);
      user_Guy.delete(orderId);
      user_socketid_order.delete(ws);
    }

    if (delivery_Guys.has(ws)) {
      delivery_Guys.delete(ws);
    }

    console.log("WebSocket connection closed");
  });
});

app.get("/", (req, res) => {
  res.send("Hello Railway 🚀");
});

// Always bind to 0.0.0.0
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
