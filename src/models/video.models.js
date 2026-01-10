import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile: {
        type: String, //cloudinary URL
        required: true
    },
    thumbnail: {
        type: String, //cloudinary URL
        required: true
    },
    videoTitle: {
        type: String,
        required: true
    },
    videoDescription: {
        type: String,
        required: true
    },
    videoDuration: {
        type: Number, //extracted from Cloudinary
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model("Video", videoSchema)