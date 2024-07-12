import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64 } from "../lib/helper.js";

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

const emitEvent = (req, event, users, data) => {
  console.log(data, event);
};

const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });
  try {
    const results = await Promise.all(uploadPromises);
    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
    return formattedResults;
  } catch (error) {
    throw new Error("error uploading files to cloudinary",error);
  }
};

const deleteFilesFromCloudinary = () => {};

export {
  connectDB,
  sendToken,
  cookieOption,
  emitEvent,
  deleteFilesFromCloudinary,
  uploadFilesToCloudinary,
};
