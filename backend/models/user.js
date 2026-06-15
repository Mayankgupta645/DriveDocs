const mongoose =  require("mongoose");
const userSchema = new mongoose.Schema({
    Username:{
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true,

    },
    PhoneNumber:{
        type: String,
        required: true,
        unique: true,
    }, 
    Email:{
        type: String,
        required: true,
        unique: true,
    }
    
},{timestamps:true});
const User = mongoose.model("User",userSchema);
module.exports = User;