import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

const newGroupChat = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;
  if (members.length < 2)
    return next(
      new ErrorHandler("group chat must have at least 2 members", 400)
    );

  const allMembers = [...members, req.user]; //yaha pe jo bhi member aaye hoge unka userid hoga is wajah se hum bhi apni id add ker rahe hai
  const groupChat = await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`); //ye do emit event banaya gaya hai kyo ki isse hoga ki jab all to ek alert message send hoga
  emitEvent(req, REFETCH_CHATS, members); //aur ye hai ki jaise hi group bane at that time to refetch the chat off user other then the group admin
  res.status(201).json({
    success: true,
    data: groupChat,
  });
});
const getMyChat = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name username avatar"
  );
  // jis bhi properties ko hum user karne wale hai usko pehle hi populate ker lo

  const transformedChats = chats.map((chat) => {
    const otherMember = getOtherMember(chat.members, req.user);
    return {
      _id: chat._id,
      name: chat.groupChat ? chat.name : otherMember.name,
      groupChat: chat.groupChat,
      avatar: chat.groupChat
        ? chat.members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url], //yaha pe hum avtar ke url ko direct access is liye ker paa rahe hai kyo ki hum par populate ker liye vo sub properties ko
      members: chat.members.reduce((prev, curr) => {
        //what this line says ye line keh rahi hai ki reduce ker do or save ker to usko prev data form
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });

  res.status(200).json({
    success: true,
    chats:transformedChats,
  });
});
const getMyGroup = TryCatch(async (req, res, next) => {
  const chatGroup = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar"); //how populte work first parameter take kisko aap target ker rahe ho aur dusri baat hai ki aap uski kon kon si property populate kerna chate ho

  const groups = chatGroup.map(({ members, _id, groupChat, name }) => {
    return {
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    };
  });

  res.status(200).json({
    success: true,
    groups,
  });
});
const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  // Find the chat by ID
  if (members.length < 1) {
    return next(new ErrorHandler("Please provide member"));
  }
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat not found", 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler("this is not group chat", 404));
  }
  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("you are not allowed to add members", 403));
  }

  // Find all new members by their IDs
  const allNewMembersPromises = members.map((memberId) =>
    User.findById(memberId)
  );
  const allNewMembers = await Promise.all(allNewMembersPromises);

  // fix bugs of duplicate members
  const uniqueMembers = allNewMembers.filter(
    (i) => !chat.members.includes(i._id.toString())
  );

  chat.members.push(...uniqueMembers.map((i) => i._id));

  if (chat.members.length > 100) {
    return next(new ErrorHandler("Group members limit reached", 400));
  }

  await chat.save();
  const allUserName = allNewMembers.map((i) => i.name).join("");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUserName} has been added in the group`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);
  res.status(200).json({
    success: true,
    message: "member added successfully",
  });
});
const removeMembers = TryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;

  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) {
    return next(new ErrorHandler("Chat not found", 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a group chat", 404));
  }
  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not allowed to add members", 403));
  }
  if (chat.members.length <= 3) {
    return next(new ErrorHandler("Group must have at least 3 members", 400));
  }
  if (!userThatWillBeRemoved) {
    return next(new ErrorHandler("User not found", 404));
  }

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${userThatWillBeRemoved.name} was removed from the group`
  );

  res.status(200).json({
    success: true,
    message: "User removed successfully",
  });
});
const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.members.length <= 3) {
    return next(new ErrorHandler("Group must have at least 3 members", 400));
  }

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (chat.creator.toString() === req.user.toString()) {
    const randomElement = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;

  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, `User ${user.name} has left the group`);

  res.status(200).json({
    success: true,
    message: "User has left the group",
  });
});
// attachments from here
const sentAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name avatar"),
  ]);

  if (!chat) return next(new ErrorHandler("chat not found", 404));

  const files = req.files || [];

  if (files.length < 1)
    return next(new ErrorHandler("please provide attachments", 400));
  if (files.length > 5)
    return next(new ErrorHandler("please provide only 5 attachments", 400));

  // upload file here that with cloudinary
  const attachments = await uploadFilesToCloudinary(files);

  // we are sending two message one to for frontend and second for to save it in mongodb

  const messageForDB = {
    content: "",
    attachments,
    sender: req.user,
    chat: chatId,
  };
  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
      avatar:me.avatar
    },
  };

  
  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });
  
  const message = await Message.create(messageForDB);
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, {
    chatId,
  });

  res.status(201).json({
    success: true,
    message,
  });
});
// from here we are make function to get chatdetails
const getChatDetails = TryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) return next(new ErrorHandler("chat not found", 404));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    return res.status(201).json({
      success: "true",
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id).populate(
      "members",
      "name avatar"
    );
    if (!chat) return next(new ErrorHandler("chat is not found", 404));
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    res.status(201).json({
      success: true,
      chat,
    });
  }
});
// to update  chat
const renameGroup = TryCatch(async (req, res, next) => {
  const { name } = req.body;
  console.log(name);
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new ErrorHandler("chat not found", 404));
  if (!chat.groupChat) return next(new ErrorHandler("chat not groupChat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("you are not allowed to rename the group", 403)
    );

  chat.name = name;
  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);
  res.status(201).json({
    success: true,
    chat,
  });
});
// to delete the chat
const deleteChat = TryCatch(async (req, res, next) => {
  // Find the chat by its ID
  const chat = await Chat.findById(req.params.id);

  // If chat not found, return a 404 error
  if (!chat) {
    return next(new ErrorHandler("Chat not found", 404));
  }

  // Check if the user requesting the deletion is the creator of the chat
  if (chat.creator.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are not allowed to delete this group", 403)
    );
  }

  // Find all messages in the chat that have attachments
  const messagesWithAttachments = await Message.find({
    chat: req.params.id,
    attachments: { $exists: true, $ne: [] },
  });

  // Extract public IDs of all attachments for deletion from Cloudinary
  const publicIds = messagesWithAttachments.flatMap(({ attachments }) =>
    attachments.map(({ public_id }) => public_id)
  );

  // Delete attachments from Cloudinary, the chat itself, and all related messages concurrently
  await Promise.all([
    deleteFilesFromCloudinary(publicIds),
    chat.deleteOne(),
    Message.deleteMany({ chat: req.params.id }),
  ]);

  // Emit an event to notify about chat deletion to the relevant members
  emitEvent(req, REFETCH_CHATS, chat.members);

  // Send a success response to the client
  res.status(200).json({
    success: true,
    message: "Chat and related messages deleted successfully.",
  });
});
const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const { page = 1 } = req.query;

  const limit = 20;
  const skip = (page - 1) * limit;
  const [messages, totalMessageCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name avatar")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessageCount / limit);

  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});
export {
  addMembers,
  deleteChat,
  getChatDetails,
  getMessages,
  getMyChat,
  getMyGroup,
  leaveGroup,
  newGroupChat,
  removeMembers,
  renameGroup,
  sentAttachments,
};
