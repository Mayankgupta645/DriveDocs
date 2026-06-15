const mongoose = require("mongoose");
const Url = "mongodb://127.0.0.1:27017/DriveDocs_userdatabase";
mongoose.connect(Url);
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