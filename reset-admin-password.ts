import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminUser from "./src/models/AdminUser";
import { validatePassword } from "./src/lib/password-policy";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function run() {
    const uri = process.env.MONGODB_URI;
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!uri) throw new Error("MONGODB_URI is not configured");
    if (!username) throw new Error("ADMIN_USERNAME is required");

    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    await mongoose.connect(uri);
    const user = await AdminUser.findOne({ username }).select("+password");
    if (!user) throw new Error(`Admin user "${username}" was not found`);

    user.password = password;
    user.isActive = true;
    await user.save();

    console.log(`Password reset successfully for "${username}"`);
}

run()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
