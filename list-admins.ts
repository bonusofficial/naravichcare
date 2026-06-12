import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminUser from "./src/models/AdminUser";

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const admins = await AdminUser.find({});
    console.log(admins);
    process.exit(0);
}
run();
