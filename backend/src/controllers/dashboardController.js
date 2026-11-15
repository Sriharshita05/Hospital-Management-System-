import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Department from "../models/Department.js";
import Appointment from "../models/Appointment.js";
import Visit from "../models/Visit.js";
import Bill from "../models/Bill.js";
import { getTodayIST, addDays } from "../utils/dates.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const getDashboardStats = async (req, res) => {
  try {
    const { date: today } = getTodayIST();
    const tomorrow = addDays(today, 1);
    const weekStart = addDays(today, -6);
    const canSeeBilling = ["admin", "frontDesk"].includes(req.staff.role);

    // Start of the month five months ago (for the 6 month revenue chart)
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

    const queries = [
      Patient.countDocuments({ isActive: { $ne: false } }),
      Doctor.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Appointment.countDocuments({ appointmentDate: { $gte: today, $lt: tomorrow } }),
      Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Appointment.aggregate([
        { $match: { appointmentDate: { $gte: weekStart, $lt: tomorrow } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$appointmentDate" } },
            count: { $sum: 1 }
          }
        }
      ]),
      Appointment.find({
        appointmentDate: { $gte: today },
        status: { $in: ["Pending", "Confirmed"] }
      })
        .populate("patient", "patientId name")
        .populate("doctor", "doctorId name")
        .sort({ appointmentDate: 1, startTime: 1 })
        .limit(6),
      Visit.countDocuments({ status: "In Progress" }),
      Visit.countDocuments({ visitDate: { $gte: today, $lt: tomorrow } })
    ];

    if (canSeeBilling) {
      queries.push(
        Bill.aggregate([
          {
            $group: {
              _id: "$paymentStatus",
              count: { $sum: 1 },
              total: { $sum: "$totalAmount" }
            }
          }
        ]),
        Bill.aggregate([
          { $match: { paymentStatus: "Paid", paidAt: { $gte: monthStart } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } },
              total: { $sum: "$totalAmount" }
            }
          }
        ])
      );
    }

    const results = await Promise.all(queries);

    const [
      activePatients,
      activeDoctors,
      departments,
      todayAppointments,
      statusAgg,
      trendAgg,
      upcoming,
      visitsInProgress,
      visitsToday,
      billAgg,
      revenueAgg
    ] = results;

    // Appointment status counts
    const statusCounts = { Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 };
    statusAgg.forEach((s) => {
      statusCounts[s._id] = s.count;
    });

    // Last 7 days, with zeros filled in
    const trendMap = new Map(trendAgg.map((t) => [t._id, t.count]));
    const weeklyAppointments = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const key = d.toISOString().slice(0, 10);
      weeklyAppointments.push({
        date: key,
        day: DAY_NAMES[d.getUTCDay()],
        appointments: trendMap.get(key) || 0
      });
    }

    // Billing (admin and front desk only)
    let billing = null;
    if (canSeeBilling) {
      const byStatus = { Pending: { count: 0, total: 0 }, Paid: { count: 0, total: 0 }, Failed: { count: 0, total: 0 }, Refunded: { count: 0, total: 0 } };
      billAgg.forEach((b) => {
        byStatus[b._id] = { count: b.count, total: Math.round(b.total * 100) / 100 };
      });

      const revenueMap = new Map(revenueAgg.map((r) => [r._id, r.total]));
      const monthlyRevenue = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + i, 1));
        const key = d.toISOString().slice(0, 7);
        monthlyRevenue.push({
          month: `${MONTH_NAMES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
          revenue: Math.round((revenueMap.get(key) || 0) * 100) / 100
        });
      }

      billing = {
        totalRevenue: byStatus.Paid.total,
        pendingAmount: byStatus.Pending.total,
        paidBills: byStatus.Paid.count,
        pendingBills: byStatus.Pending.count,
        byStatus,
        monthlyRevenue
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        totals: { activePatients, activeDoctors, departments },
        appointments: {
          today: todayAppointments,
          total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
          ...statusCounts
        },
        visits: { inProgress: visitsInProgress, today: visitsToday },
        weeklyAppointments,
        upcomingAppointments: upcoming,
        billing
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics"
    });
  }
};
