import mongoose, {Mongoose, Schema} from "mongoose";

const commentSchema = new Schema({
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    }
}, {timestamps: true})

export const Comment = mongoose.model("Comment", commentSchema)