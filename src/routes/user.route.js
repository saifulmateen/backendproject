import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { ApiError } from "../utils/ApiError.js";
const router = Router()

//we can transform this middleware in reusable middle ware by defining it in a constant
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount:1  
        }
    ]),
    registerUser
)


export default router