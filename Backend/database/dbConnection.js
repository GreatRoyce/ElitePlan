const mongoose = require("mongoose");

require("dotenv").config();

const dbConnectionString = process.env.DBSTRING;

const connectDB  = async () =>{
    try{
        console.log("connecting to db...")
        await mongoose.connect(dbConnectionString, {});
        console.log("connection to db, established! ✅");
    }catch(error){
        console.error("Error connecting to db:", error);
    }
};

module.exports = connectDB;
