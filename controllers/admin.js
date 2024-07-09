import jwt from "jsonwebtoken";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { cookieOption } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";



const adminLogin = TryCatch(async (req, res) => {
  const { secretKey } = req.body;

  const adminSecretKey = process.env.ADMIN_SECRET_KEY || "AYUSHDUBEYKYAHORHA"

  const isMatch = secretKey === adminSecretKey
  if (!isMatch) return next(new ErrorHandler("nikal ja bsdk ", 401))
  
  const token = jwt.sign(secretKey, process.env.JWT_SECRET)


  return res.status(200).cookie("adminToken", token, { ...cookieOption, maxAge: 1000 * 60 * 15 }).json({
    success: true,
    message:"Welcome boss"
  })
})

const adminLogout = TryCatch(async (req, res) => {
 
  return res.status(200).cookie("adminToken",  "",{ ...cookieOption, maxAge:0}).json({
    success: true,
    message:"logout successfully"
  })
})


const allUsers = TryCatch(async (req, res) => {
  const users = await User.find({});

  const transformedUsers = await Promise.all(
    users.map(async ({ name, userEmail, avatar, _id }) => {
      const [group, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);
      return {
        name,
        userEmail,
        avatar: avatar.url,
        _id,
        group,
        friends,
      };
    })
  );

  return res.status(200).json({
    success: true,
    users: transformedUsers,
  });
});

const allChats = TryCatch(async (req, res) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChats = await Promise.all(
    chats.map(async ({ _id, name, groupChat, creator, members }) => {
      const message = await Message.countDocuments({ chat: _id });
      return {
        _id,
        name,
        members: members.slice(0, 3).map((member) => member.avatar.url),
        creator: creator
          ? {
              name: creator.name,
              avatar: creator.avatar.url,
            }
          : "none",
        groupChat,
        totalMembers: members.length,
        message,
      };
    })
  );

  res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

const allmessages = TryCatch(async (req, res) => {
  const chatId = req.query.chatId;

  if (chatId) {
    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name avatar")
      .populate("chat", "groupChat");

    const transformedMessages = messages.map(
      ({ content, attachments, _id, sender, createdAt, chat }) => {
        return {
          _id,
          attachments,
          content,
          createdAt,
          chat: chat._id,
          groupChat: chat.groupChat,
          sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
          },
        };
      }
    );

    return res.status(200).json({
      success: true,
      messages: transformedMessages,
    });
  } else {
    const messages = await Message.find({})
      .populate("sender", "name avatar")
      .populate("chat", "groupChat");

    const transformedMessages = messages.map(
      ({ content, attachments, _id, sender, createdAt, chat }) => {
        return {
          _id,
          attachments,
          content,
          createdAt,
          chat: chat._id,
          groupChat: chat.groupChat,
          sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
          },
        };
      }
    );

    return res.status(200).json({
      success: true,
      messages: transformedMessages,
    });
  }
});

const dashboardStats = TryCatch(async (req, res) => {
  const [groupCount, usersCount, messageCount, totalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

  const today = new Date();
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const last7DaysMessages = await Message.find({
    createdAt: {
      $gte: last7Days,
      $lte: today,
    },
  });

  const messages = new Array(7).fill(0);

  last7DaysMessages.forEach((message) => {
    const index = Math.floor((today.getTime() - message.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (index < 7) {
      messages[6 - index]++;
    }
  });

  return res.status(200).json({
    success: true,
    groupCount,
    usersCount,
    messageCount,
    totalChatsCount,
    messages,
  });
});


export { adminLogin, adminLogout, allChats, allUsers, allmessages, dashboardStats };

