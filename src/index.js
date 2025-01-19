import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";
import { createClient } from "redis";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://product-tracking-ruddy.vercel.app",
    methods: ["GET", "POST"]
  }
});

const client = createClient({
  url: process.env.R_URL,
  password: process.env.R_PASS
});

client.on("error", (err) => console.error("Redis Client Error", err));

const __dirname = path.resolve();

app.use(express.json());
app.use(cors());

app.post("/send", async (req, res) => {
  const { name, year, language } = req.body;

  try {
    await client.lPush("data", JSON.stringify({ name, year, language }));
    res.status(200).send("Submission received and stored.");
  } catch (error) {
    console.error("Redis error:", error);
    res.status(500).send("Failed to store submission.");
  }
});

app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "public/user.html"));
});

app.get("/chatbot", (req, res) => {
  res.sendFile(path.join(__dirname, "public/chat-bot.html"));
});

app.get("/deliver", (req, res) => {
  res.sendFile(path.join(__dirname, "public/delivery.html"));
});

const delivery_Guys = {};
const user_socketid_order = {};
const user_Guy = {};

io.on("connection", (socket) => {
  socket.on("register_delivery_guy", (orders) => {
    delivery_Guys[socket.id] = orders;
  });

  socket.on("register_user", (order_id) => {
    user_Guy[order_id] = socket.id;
    user_socketid_order[socket.id] = order_id;
  });

  socket.on("gpsupdate", (data) => {
    const { gps } = data;
    const orderId = delivery_Guys[socket.id];

    if (orderId) {
      orderId.forEach((id) => {
        const sid = user_Guy[id];
        if (sid) {
          io.to(sid).emit("gps_user_recive", gps);
        }
      });
    }
  });

  socket.on("disconnect", () => {
    if (user_socketid_order[socket.id]) {
      delete user_Guy[user_socketid_order[socket.id]];
      delete user_socketid_order[socket.id];
    }

    if (delivery_Guys[socket.id]) {
      delete delivery_Guys[socket.id];
    }
  });
});

async function start() {
  try {
    await client.connect();
    server.listen(8000, () => {
      console.log("Server is running on port 8000");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

start();
