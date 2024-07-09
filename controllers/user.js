// Import necessary modules
import bcrypt, { compare } from "bcrypt";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { TryCatch } from "../middlewares/error.js"; // Ensure this path is correct
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { User } from "../models/user.js";
import { cookieOption, emitEvent, sendToken } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

// Register user function
const register = TryCatch(async (req, res, next) => {
  const { name, userEmail, password, avatar } = req.body;

  // Check if user already exists
  let user = await User.findOne({ userEmail });
  if (user) {
    return next(new ErrorHandler("This email already exists", 404));
  }

  // Create new user
  user = new User({
    name,
    userEmail,
    password,
    avatar,
  });

  // Hash password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);

  // Save user to database
  await user.save();

  // Send token to client
  sendToken(res, user, 201, `welcome`);
});

// Login user function
const login = TryCatch(async (req, res, next) => {
  const { userEmail, password } = req.body;

  // Find user by email and select password
  const user = await User.findOne({ userEmail }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid email", 404));
  }

  // Compare password
  const isMatch = await compare(password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid password", 404));
  }

  // Send token to client
  sendToken(res, user, 200, `Welcome back, ${user.name}`);
});

const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);

  if (!user) {
    return next(new ErrorHandler("user not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("authToken", "", { ...cookieOption, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

const searchUser = TryCatch(async (req, res, next) => {
  const { name = "" } = req.query;

  const myChats = await Chat.find({ groupChat: false, members: req.user });

  // alll user from which i have done chat
  const allUserFromChats = myChats.flatMap((chat) => chat.members);

  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUserFromChats },
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users,
  });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, userId);

  res.status(201).json({ message: "Friend request sent" });
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;
  const request = await Request.findById(requestId)
    .populate("receiver", "name")
    .populate("sender", "name");

  console.log(request.receiver);
  console.log(request.sender);
  if (!request) return next(new ErrorHandler("Request not found", 404));
  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("you are not authorized to accept this request", 401)
    );

  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Friend Request rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    // request.deleteOne()
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Friend Request accepted",
    request,
  });
});

const getAllNotification = TryCatch(async (req, res, next) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map((request) => {
    return {
      _id: request._id,
      sender: {
        _id: request.sender._id,
        name: request.sender.name,
        avatar: request.sender.avatar.url,
      },
    };
  });

  return res.status(200).json({
    success: true,
    allRequests,
  });
});

const getMyFriends = TryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;
  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = members.find(member => member._id.toString() !== req.user.toString());

    if (otherUser) {
      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
    }
  }).filter(Boolean); // Remove undefined values

  if (chatId) {
    const chat = await Chat.findById(chatId);

    // this show's that is we pass any chat id the it will suggest you that user which are not part of that group chat 
    const availableFriends = friends.filter(friend => !chat.members.some(member => member._id.toString() === friend._id.toString()));
    return res.status(200).json({
      success: true,
      availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
 
});

// Export functions
export {
  acceptFriendRequest,
  getAllNotification,
  getMyFriends, getMyProfile,
  login,
  logout,
  register,
  searchUser,
  sendFriendRequest
};
