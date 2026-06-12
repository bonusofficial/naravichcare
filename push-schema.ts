import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import "./src/models/AdminLog";
import "./src/models/AdminUser";
import "./src/models/Agent";
import "./src/models/Branch";
import "./src/models/Claim";
import "./src/models/CoveragePlan";
import "./src/models/FloatingChat";
import "./src/models/FooterSettings";
import "./src/models/HeroBanner";
import "./src/models/Insurance";
import "./src/models/LegalPage";
import "./src/models/Loan";
import "./src/models/Package";
import "./src/models/Payment";
import "./src/models/Registration";
import "./src/models/RepairCustomer";
import "./src/models/RepairJob";
import "./src/models/RepairPart";
import "./src/models/ServiceRequestPage";
import "./src/models/TermsPage";

async function run() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`Connected: ${mongoose.connection.name}\n`);

    for (const name of mongoose.modelNames()) {
        const model = mongoose.model(name);
        await model.createCollection();
        await model.syncIndexes();
        console.log(`✔ ${name} -> ${model.collection.collectionName}`);
    }

    console.log(`\nDone: ${mongoose.modelNames().length} collections`);
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
