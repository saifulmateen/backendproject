import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})
import connectDB from "./db/index.js";


connectDB()
.then(() => {
    app.on("error", (err) => {
        console.log("Error in DB Connection: ", err);
        throw err;
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at ${process.env.PORT} PORT`);
    })
})
.catch((err) => {
    console.log("DB Connection Failed: ", err);    
})




// import express from "express";

// const app = express()
// ;( async() => {
//     try{
//         await mongoose.connect(`${process.env.DB_URI}/${DB_NAME}`)
//         app.on("error", (error) => {
//             console.log("Error: ", error);
//             throw error;
//         })
//         app.listen(process.env.PORT, () => {
//             console.log(`Listening on port ${process.env.PORT}`);
//         })
//     } catch(error){
//         console.log("Error: ", error);
//         throw error;
//     }
// })()

