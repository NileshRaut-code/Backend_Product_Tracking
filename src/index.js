import express from "express";
import http from "http"
import { Server } from 'socket.io';
import path from "path";
import cors from "cors";
import { console } from "inspector";
import redis,{createClient} from "redis"
const app=express()
const server = http.createServer(app)
const io=new Server(server ,{
    cors: {
        origin: "https://product-tracking-ruddy.vercel.app",
        methods: ["GET", "POST"]
      }
  })
  const client = createClient({url:process.env.R_URL ,password:"process.env.R_PASS"})
  client.on('error', (err) => console.log('Redis Client Error', err));
const __dirname = path.resolve(path.dirname(''));

app.use(express.json());
app.post("/send", async (req, res) => {
    console.log(req.body);
    
    const name = req.body.name;
    const year = req.body.year;
    const language = req.body.language;

    try {
        await client.lPush("data", JSON.stringify({ name, year, language }));
        res.status(200).send("Submission received and stored.");
    } catch (error) {
        console.error("Redis error:", error);
        res.status(500).send("Failed to store submission.");
    }
});
app.get('/user', (req, res) => {
    res.sendFile(__dirname + '/public/user.html');
});
app.get('/chatbot', (req, res) => {
    res.sendFile(__dirname + '/public/chat-bot.html');
});
app.get('/deliver', (req, res) => {
    res.sendFile(__dirname + '/public/delivery.html');
});

const delivery_Guys={}
const user_socketid_order={}
const user_Guy={}


io.on('connection',(socket)=>{
    console.log(socket.id,"COnnected USer");

    socket.on("register_delivery_guy",(orders)=>{
        delivery_Guys[socket.id]=orders
    })

    socket.on("register_user",(order_id)=>{
        user_Guy[order_id]=socket.id
        user_socketid_order[socket.id]=order_id;
        
    })

    socket.on("gpsupdate",(data)=>{
    const {gps}=data;

    const orderId=delivery_Guys[socket.id]
  
    if(orderId){
        orderId.map((id)=>{
            const sid=user_Guy[id];
            io.to(sid).emit("gps_user_recive",gps)
        })
       
    }
    })
    
 

    socket.on('disconnect',()=>{
        console.log("Disconnecting");
        if(user_socketid_order[socket.id]){
            delete user_Guy[user_socketid_order[socket.id]]
            delete user_socketid_order[socket.id]
        }
        if(delivery_Guys[socket.id]){
            delete delivery_Guys[socket.id]
        }
        console.log("Disconnected");
    })
    
})

async function start() {
    await client.connect()
    server.listen(8000, () => {
        console.log("Server is running on port 8000");
    });
    
}

start()