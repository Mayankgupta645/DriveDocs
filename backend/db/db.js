const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

    mongoose.connection.on("connected",()=>{
        console.log("MongoDB connected successfully");
    });
    mongoose.connection.on("disconnected",(req,res)=>{
      console.log("mongoose disconnected successfully");
    });
    mongoose.connection.on("error",(err)=>{
        console.log("mongoose connection error",err);
    });

    module.exports = mongoose;