import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const __dirname = path.resolve();

app.use(express.json());
app.use(cors({ origin: "https://product-tracking-ruddy.vercel.app" }));

app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "public/user.html"));
});

app.get("/deliver", (req, res) => {
  res.sendFile(path.join(__dirname, "public/delivery.html"));
});

// Storage
const delivery_Guys = {};
const user_socketid_order = {};
const user_Guy = {};

// Handle WebSocket connections
wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "register_delivery_guy") {
        delivery_Guys[ws] = data.orders; // store orders for this delivery guy
      }

      if (data.type === "register_user") {
        user_Guy[data.order_id] = ws;
        user_socketid_order[ws] = data.order_id;
      }

      if (data.type === "gpsupdate") {
        const gps = data.gps;
        const orders = delivery_Guys[ws];

        if (orders) {
          orders.forEach((id) => {
            const userWs = user_Guy[id];
            if (userWs && userWs.readyState === 1) {
              userWs.send(JSON.stringify({ type: "gps_user_recive", gps }));
            }
          });
        }
      }
    } catch (e) {
      console.error("Invalid message:", message);
    }
  });

  ws.on("close", () => {
    if (user_socketid_order[ws]) {
      delete user_Guy[user_socketid_order[ws]];
      delete user_socketid_order[ws];
    }

    if (delivery_Guys[ws]) {
      delete delivery_Guys[ws];
    }
  });
});

server.listen(8000, () => {
  console.log("Server is running on port 8000");
});
