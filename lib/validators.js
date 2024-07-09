import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";
const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessages = errors
    .array()
    .map((error) => error.msg) // Correctly access each error item here
    .join(",");

  if (errors.isEmpty()) {
    return next();
  } else {
    return next(new ErrorHandler(errorMessages, 400));
  }
};
const registerValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("userEmail")
    .notEmpty()
    .withMessage("Please Enter Email")
    .isEmail()
    .withMessage("Please Enter a Valid Email"),
  body("password", "Please Enter Password").notEmpty(),
];

const loginValidator = () => [
  body("userEmail")
    .notEmpty()
    .withMessage("Please Enter Email")
    .isEmail()
    .withMessage("Please Enter a Valid Email"),
  body("password", "Please Enter Password").notEmpty(),
];

const newGroupValidator = () => [
  body("name", "Please Enter group name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("please select member")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2-100"),
];

const addMembersValidator = () => [
  body("chatId", "Please enter chat ID").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("please select members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Please select memner "),
];

const removeMembersValidator = () => [
  body("userId", "Please enter User ID").notEmpty(),
  body("chatId", "Please enter chat ID").notEmpty(),
];

const leaveGroupValidator = () => [param("id", "please send id").notEmpty()];
const sentAttachmentsValidator = () => [
  body("chatId", "Please enter chatId").notEmpty(),

];

const getMessagesValidator = () => [param("id", "Please enter id").notEmpty()];
const getChatDetailsValidator = () => [
  param("id", "Please enter id").notEmpty(),
];
const renameGroupValidator = () => [
  param("id", "Please enter id").notEmpty(),
  body("name", "please select the group name").notEmpty(),
];

const deleteChatValidator = () => [param("id", "Please enter id").notEmpty()];

const sendFriendRequestValidator = () => [
  body("userId", "Please select person").notEmpty(),
];

const acceptFriendRequestValidator = () => [
  body("requestId", "Please Enter Request ID").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("please  sent the status")
    .isBoolean()
    .withMessage("Accept must be a boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "Please Enter Secret key").notEmpty()
]

export {
  acceptFriendRequestValidator, addMembersValidator, adminLoginValidator, deleteChatValidator, getChatDetailsValidator, getMessagesValidator, leaveGroupValidator, loginValidator,
  newGroupValidator, registerValidator, removeMembersValidator, renameGroupValidator, sendFriendRequestValidator, sentAttachmentsValidator, validateHandler
};

