import express from "express";
import {
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
} from "../controllers/chat.js";
import {
  addMembersValidator,
  deleteChatValidator,
  getChatDetailsValidator,
  getMessagesValidator,
  leaveGroupValidator,
  newGroupValidator,
  removeMembersValidator,
  sentAttachmentsValidator,
  validateHandler,
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachmentsMulter } from "../middlewares/multer.js";

const router = express.Router();

// after this all request check weather user is login or not

router.use(isAuthenticated);
router.post("/new", newGroupValidator(), validateHandler, newGroupChat);
router.get("/my", getMyChat);
router.get("/my/group", getMyGroup);
router.put("/addmembers", addMembersValidator(), validateHandler, addMembers);
router.put(
  "/removemember",
  removeMembersValidator(),
  validateHandler,
  removeMembers
);
router.put(
  "/leavegroup/:id",
  leaveGroupValidator(),
  validateHandler,
  leaveGroup
);

// send attachments

router.post(
  "/message",
  attachmentsMulter,
  sentAttachmentsValidator(),
  validateHandler,
  sentAttachments
);

// get Messsage

router.get(
  "/message/:id",
  getMessagesValidator(),
  validateHandler,
  getMessages
);

// get chat details

router
  .route("/:id")
  .get(getChatDetailsValidator(), validateHandler, getChatDetails)
  .put(removeMembersValidator(), validateHandler, renameGroup)
  .delete(deleteChatValidator(), validateHandler, deleteChat);

export default router;
