import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"
import { uploadOnServer } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    const {userName, fullName, email, password} = req.body;
    console.log("email: ", email);

    if( [fullName, userName, email, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are compulsory.")
    }

    const existingUser = User.findOne( {$or: [{userName}, {email}]} )

    if(existingUser) throw new ApiError(409, "User already exists");

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath) throw new ApiError(400, "Avatar required.");

    const avatar = await uploadOnServer(avatarLocalPath)
    const coverImage = await uploadOnServer(coverImageLocalPath)
    
    if(!avatar) throw new ApiError(400, "Avatar required.");

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
        email,
        userName: userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-passowrd -refreshToken")
})

export {registerUser}