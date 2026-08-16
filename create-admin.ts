import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminUser from "./src/models/AdminUser";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`Connected: ${mongoose.connection.name}\n`);

    const username = process.argv[2];
    const password = process.argv[3];
    const name = process.argv[4] || username;
    const email = process.argv[5] || `${username}@navarichcare.com`;
    const role = process.argv[6] || "super_admin";

    if (!username || !password) {
        console.error("Usage: tsx create-admin.ts <username> <password> [name] [email] [role]");
        console.error("Roles: super_admin, admin, viewer, technician, staff");
        process.exit(1);
    }

    // Check if user exists
    const existing = await AdminUser.findOne({ username });
    if (existing) {
        console.error(`❌ User "${username}" already exists`);
        process.exit(1);
    }

    // Create new admin
    const admin = await AdminUser.create({
        username,
        password,
        name,
        email,
        role,
        isActive: true,
    });

    console.log(`✅ Admin user created successfully!\n`);
    console.log(`Username: ${admin.username}`);
    console.log(`Name: ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`\nLogin at: http://localhost:3000/admin/login`);

    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
