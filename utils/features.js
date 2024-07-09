import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const cookieOption = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

const connectDB = (url) => {
  mongoose
    .connect(url, { dbName: "full_chat_app" })
    .then((data) => {
      console.log(`connect to DB : ${data.connection.host}`);
    })
    .catch((err) => {
      console.log(err);
    });
};
// token generator 
const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  return res.status(code).cookie("authToken", token, cookieOption).json({
    success: true,
    message,
  });
};


const emitEvent = (req,event,users,data) => {
  console.log(data,event)
}




const deleteFilesFromCloudinary =()=>{}

export { connectDB, sendToken, cookieOption, emitEvent, deleteFilesFromCloudinary };
