import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"
import { uploadOnServer } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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
            $unset: {
                refreshToken: 1
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


const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if(!incomingRefreshToken) throw new ApiError(401, "Unauthorized Request."); 
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if(!user) throw new ApiError(401, "Invalid Refresh Token.");
    
        if(incomingRefreshToken != user?.refreshToken) throw new ApiError(401, "Invalid Refresh Token.");
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const{accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res.
        status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json( new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access Token Refereshed."))
    } catch (error) {
        new ApiError(401, error?.message || "Invalid refresh token.")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const{oldPassowrd, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassowrd)

    if(!isPasswordCorrect) throw new ApiError(400, "Invalid Password.");

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, "Password changed Successfully."))
})


const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched Successfully."))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {email, fullName} = req.body;
    if(!fullName || !email) throw new ApiError(400, "All fields are required.");
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, "Account details updated Successuflly."))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is missing.");

    const avatar = await uploadOnServer(avatarLocalPath)

    if(!avatar.url) throw new ApiError(400, "Error while uploading on Cloudinary.");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Image updated successfully."))
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) throw new ApiError(400, "Cover Image is missing.");

    const coverImage = await uploadOnServer(coverImageLocalPath)

    if(!coverImage.url) throw new ApiError(400, "Error while uploading on Cloudinary.");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: ture}
    )
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Image updated successfully."))
})


const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()) throw new ApiError(400, "Username is missing.");

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond : {
                        if: {$in: [req.user?._id, "subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    if(!channel?.length) throw new ApiError(404, "Channel doesn't exists.");

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully.")
    )
})


const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                id: new mongoose.Types.ObjectId(req.user.id)
            }
        },
        {
            $lookup: {
                from: "vidoes",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully."))
})
export {
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}