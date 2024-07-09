import express from "express"
import { adminLogin, adminLogout, allChats, allUsers, allmessages, dashboardStats } from "../controllers/admin.js"
import { adminLoginValidator, validateHandler } from "../lib/validators.js"
import { adminAuthenticated } from "../middlewares/auth.js"

const router = express.Router()


router.get("/")

router.post("/verify",adminLoginValidator(),validateHandler,adminLogin)
router.get("/logout", adminLogout)

// this can only admin access it 
router.use(adminAuthenticated)

router.get("/users", allUsers)
router.get("/chats",allChats)
router.get("/messages", allmessages )
router.get("/stats",dashboardStats)




export default router