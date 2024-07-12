import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 } from "uuid";
import { NEW_MESSAGE, NEW_MESSAGE_ALERT } from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import { errorMiddleware } from "./middlewares/error.js";
import { Message } from "./models/message.js";
import adminRouter from "./routes/admin.js";
import chatRouter from "./routes/chat.js";
import userRouter from "./routes/user.js";
import { connectDB } from "./utils/features.js";
import bodyParser from "body-parser";
import {v2 as cloudinary} from 'cloudinary'

const userSocketIDs = new Map();

dotenv.config({
  path: "./.env",
});

connectDB(process.env.MONGO_URL);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const app = express();
const server = createServer(app);

const io = new Server(server, {});

// createUser(10)
// createSingleChats(10);
// createGroupChats(10)

// createMessagesInAChat("6669e52a6605ccbed117a872",50)

// here we are using middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true })); // or false
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

app.get("/", async (req, res) => {
  res.send("hello from this side");
});

app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/admin", adminRouter);

// yaha se socket ka kaam chal raha hai
io.use((socket, next) => {});

io.on("connection", (socket) => {
  const user = {
    _id: "adsfadfaf",
    name: "namego",
  };

  // yaha pe ho ye raha hai ki jo bhi user aa raha hai vo uska userId socketId se map ho ja raha hai
  userSocketIDs.set(user._id.toString(), socket.id);
  console.log(userSocketIDs);
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: v4(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const memberSocket = getSockets(members); //isse humko user socket mil jayega
    io.to(memberSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(memberSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);
    } catch (error) {
      console.log(error);
    }
    console.log("New message", messageForRealTime, memberSocket);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    userSocketIDs.delete(user._id.toString());
  });
});

app.use(errorMiddleware);

export { userSocketIDs };

server.listen(5000, () => {
  console.log("server listening on port 5000");
});
