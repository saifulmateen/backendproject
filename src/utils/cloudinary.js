import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnServer = async (filePath) => {
    try{
        if(!filePath) return null
        //being uploaded
        const response = await cloudinary.v2.uploader.upload(filePath, {
            resource_type: "auto"
        })
        //successfully uploaded
        console.log("File is uploaded on cloudinary.", response.url);
        return response
    } catch(error){
        fs.unlinkSync(filePath) //removes the locally saved temporary file
        return null
    }
}

export {uploadOnServer}