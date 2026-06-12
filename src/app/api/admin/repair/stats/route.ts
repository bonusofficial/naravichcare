import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RepairJob from "@/models/RepairJob";

export async function GET() {
    try {
        await dbConnect();

        // 1. Basic Counts
        const totalJobs = await RepairJob.countDocuments();
        const pendingJobs = await RepairJob.countDocuments({ status: { $in: ["pending", "checking", "waiting_parts"] } });
        const readyPickup = await RepairJob.countDocuments({ status: "ready_pickup" });
        const completedJobs = await RepairJob.countDocuments({ status: "completed" });

        // 2. Revenue Aggregation (Daily & Monthly)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const startOfThisMonth = new Date();
        startOfThisMonth.setDate(1);
        startOfThisMonth.setHours(0, 0, 0, 0);

        const dailyStats = await RepairJob.aggregate([
            { $match: { createdAt: { $gte: startOfToday } } },
            { $group: { 
                _id: null, 
                revenue: { $sum: "$totalPrice" }, 
                profit: { $sum: { $subtract: ["$totalPrice", { $ifNull: ["$partsPurchaseCost", 0] }] } },
                count: { $sum: 1 } 
            } }
        ]);

        const monthlyStats = await RepairJob.aggregate([
            { $match: { createdAt: { $gte: startOfThisMonth } } },
            { $group: { 
                _id: null, 
                revenue: { $sum: "$totalPrice" }, 
                profit: { $sum: { $subtract: ["$totalPrice", { $ifNull: ["$partsPurchaseCost", 0] }] } },
                count: { $sum: 1 } 
            } }
        ]);

        // 3. Status Breakdown for Chart/List
        const statusGroups = await RepairJob.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        return NextResponse.json({
            stats: {
                total: totalJobs,
                pending: pendingJobs,
                ready: readyPickup,
                completed: completedJobs,
                dailyRevenue: dailyStats[0]?.revenue || 0,
                dailyProfit: dailyStats[0]?.profit || 0,
                monthlyRevenue: monthlyStats[0]?.revenue || 0,
                monthlyProfit: monthlyStats[0]?.profit || 0,
                dailyCount: dailyStats[0]?.count || 0
            },
            statusBreakdown: statusGroups
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
