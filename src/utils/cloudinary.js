import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnServer = async (filePath) => {
    try {
        if (!filePath) return null;

        const response = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto"
        });

        fs.unlinkSync(filePath); // clean local file
        console.log("File uploaded to Cloudinary:", response.url);
        return response;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return null;
    }
}

export { uploadOnServer };
