import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"
import { uploadOnServer } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch(error){
        throw new ApiError(500, "Something went wrong while generating tokens.")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {userName, fullName, email, password} = req.body;
    if( [fullName, userName, email, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are compulsory.")
    }

    const existingUser = await User.findOne( {$or: [{userName}, {email}]} )

    if(existingUser) throw new ApiError(409, "User already exists");

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath) throw new ApiError(400, "Avatar locally required.");

    const avatar = await uploadOnServer(avatarLocalPath)
    const coverImage = await uploadOnServer(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400, "Avatar required.")
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
        email,
        userName: userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-passowrd -refreshToken")

    if(!createdUser) throw new ApiError(405, "User can't be created right now.");

    res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully.")
    )
})

/*todo list for login
1. take username and password from the user, validate
2. match it with the database
3. if correct, login the user and assign refresh and access token
4. send cookie
*/
const loginUser = asyncHandler(async (req, res) => {
    const {email, userName, password} = req.body;
    if(!userName && !email){
        throw new ApiError(400, "Username or Email is required.")
    }
    const user = await User.findOne({
        $or: [{userName}, {email}]
    })

    if(!user) throw new ApiError(404, "User doesn't exist.");

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) throw new ApiError(401, "Password incorrect.");

    const{accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken ")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.
    status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, 
            {
                user: loggedInUser, accessToken, refreshToken
            }
        )
    )
})

const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out."))
})

export {registerUser, loginUser, logoutUser}