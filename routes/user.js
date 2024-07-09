import express from "express";
import {
    acceptFriendRequest,
    getAllNotification,
    getMyFriends,
    getMyProfile,
    login,
    logout,
    register,
    searchUser,
    sendFriendRequest,
} from "../controllers/user.js";
import {
    acceptFriendRequestValidator,
    loginValidator,
    registerValidator,
    sendFriendRequestValidator,
    validateHandler,
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { singelAvatar } from "../middlewares/multer.js";

const router = express.Router();

router.post(
  "/register",
  singelAvatar,
  registerValidator(),
  validateHandler,
  register
);
router.post("/login", loginValidator(), validateHandler, login);

// after this all request check weather user is login or not
router.use(isAuthenticated);
router.get("/me", getMyProfile);
router.get("/logout", logout);
router.get("/search", searchUser);
router.post(
  "/send-request",
  sendFriendRequestValidator(),
  validateHandler,
  sendFriendRequest
);
router.put(
  "/accept-request",
  acceptFriendRequestValidator(),
  validateHandler,
  acceptFriendRequest
);

router.get("/notification", getAllNotification);
router.get("/friends", getMyFriends);

export default router;
