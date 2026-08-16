import mongoose from "mongoose";
import dotenv from "dotenv";
import Registration from "./src/models/Registration";
import Package from "./src/models/Package";
import Agent from "./src/models/Agent";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log(`✅ Connected to: ${mongoose.connection.name}\n`);

        console.log("🔄 Starting migration...\n");

        // Step 1: Update all registrations with missing profit fields
        // Include rows that carry the schema default of 0, not just rows predating
        // the profit fields entirely. Cancelled/refunded rows are pulled in too so
        // their flags and approvedAt get backfilled for the report.
        const registrations = await Registration.find({
            status: { $in: ["approved", "cancelled", "refunded"] },
            $or: [
                { salePrice: { $exists: false } },
                { salePrice: 0 },
                { packageCost: { $exists: false } },
                { netProfit: { $exists: false } },
                { approvedAt: { $exists: false } },
                { approvedAt: null }
            ]
        });

        console.log(`📦 Found ${registrations.length} registrations to update\n`);

        let updated = 0;
        let skipped = 0;

        for (const reg of registrations) {
            try {
                // Find package to get cost
                const pkg = await Package.findById(reg.packageType);

                // Set default values if not already set
                if (reg.salePrice === undefined || reg.salePrice === 0) {
                    reg.salePrice = pkg?.yearlyPrice || 0;
                }

                if (reg.packageCost === undefined || reg.packageCost === 0) {
                    reg.packageCost = pkg?.costPrice || 0;
                }

                // Falsy checks rather than `=== undefined`: these paths carry schema
                // defaults (0 / false), which Mongoose fills in on hydration, so an
                // undefined check would never fire on legacy rows.
                if (!reg.agentCommission) {
                    // Use the agent's own rate so backfilled rows match what the
                    // approval route now records for new sales.
                    const agent = reg.agentCode
                        ? await Agent.findOne({ agentCode: reg.agentCode })
                        : null;
                    reg.agentCommission = (reg.salePrice * (agent?.commissionRate || 0)) / 100;
                }

                if (!reg.otherExpenses) {
                    reg.otherExpenses = 0;
                }

                // Ensure cancelled/refunded flags reflect the row's status
                if (reg.status === "cancelled") reg.isCancelled = true;
                if (reg.status === "refunded") reg.isRefunded = true;

                // The profit report filters by approvedAt; rows approved before that
                // field existed would otherwise drop out of every date-range query.
                if (!reg.approvedAt) {
                    reg.approvedAt = reg.updatedAt || reg.createdAt;
                }

                // totalCost / netProfit / profitMargin are computed by the pre-save hook.

                await reg.save();
                updated++;

                if (updated % 10 === 0) {
                    console.log(`✓ Updated ${updated} registrations...`);
                }
            } catch (error) {
                console.error(`❌ Error updating registration ${reg._id}:`, error);
                skipped++;
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   - Updated: ${updated} registrations`);
        console.log(`   - Skipped: ${skipped} registrations`);
        console.log(`   - Total processed: ${registrations.length}`);

        // Step 2: Update packages with default cost price if missing
        const packagesWithoutCost = await Package.find({
            $or: [
                { costPrice: { $exists: false } },
                { costPrice: 0 }
            ]
        });

        console.log(`\n📦 Found ${packagesWithoutCost.length} packages without cost price`);

        for (const pkg of packagesWithoutCost) {
            // Set default cost as 60% of yearly price (40% margin)
            pkg.costPrice = Math.floor(pkg.yearlyPrice * 0.6);
            await pkg.save();
            console.log(`✓ Set cost price for package "${pkg.name}": ${pkg.costPrice} THB`);
        }

        console.log("\n🎉 All done!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
