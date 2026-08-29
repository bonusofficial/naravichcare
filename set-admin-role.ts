import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminUser from "./src/models/AdminUser";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Changes an admin account's role.
 *
 * Usage: npm run set-admin-role <username> <role>
 *   e.g. npm run set-admin-role bonusofficial super_admin
 *
 * Roles come from the same list the app enforces, so a typo fails loudly here
 * instead of silently locking the account out of every page.
 */

const VALID_ROLES = ["super_admin", "admin", "viewer", "technician", "staff"];

async function run() {
    const [username, role] = process.argv.slice(2);

    if (!username || !role) {
        console.error("Usage: npm run set-admin-role <username> <role>");
        console.error(`Roles: ${VALID_ROLES.join(", ")}`);
        process.exit(1);
    }
    if (!VALID_ROLES.includes(role)) {
        console.error(`Unknown role "${role}". Valid roles: ${VALID_ROLES.join(", ")}`);
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI as string);

    const user = await AdminUser.findOne({ username });
    if (!user) {
        const existing = await AdminUser.find({}).select("username role").lean();
        console.error(`No admin found with username "${username}".`);
        console.error("Existing accounts:");
        for (const account of existing) {
            console.error(`  - ${account.username} (${account.role})`);
        }
        process.exit(1);
    }

    const previousRole = user.role;
    if (previousRole === role) {
        console.log(`"${username}" is already ${role}. Nothing to change.`);
        process.exit(0);
    }

    // Permissions are derived from the role (see src/lib/permissions.ts), so the
    // role is the only field that needs changing.
    user.role = role;
    await user.save();

    console.log(`Updated "${username}": ${previousRole} -> ${role}`);
    if (role === "super_admin") {
        console.log("The account now has full access. Log out and back in to refresh the session.");
    }
    process.exit(0);
}

run().catch((error) => {
    console.error("Failed to update role:", error instanceof Error ? error.message : error);
    process.exit(1);
});
