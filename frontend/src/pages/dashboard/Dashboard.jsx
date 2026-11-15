import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Stethoscope,
  Building2,
  CalendarDays,
  Clock,
  CheckCircle2,
  IndianRupee,
  Wallet,
  RefreshCw,
  CalendarX
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

import api from "../../services/api";
import { getUser, roleLabel } from "../../utils/auth";
import { errorMessage, formatCurrency, formatDate, formatTime } from "../../utils/format";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";

const STATUS_COLORS = {
  Pending: "#d99424",
  Confirmed: "#2457d6",
  Completed: "#16a36a",
  Cancelled: "#dc4c4c"
};

function StatCard({ icon: Icon, label, value, tone = "" }) {
  return (
    <div className="ui-card ui-stat">
      <div className={`ui-stat-icon ${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <p>{label}</p>
        <h3>{value}</h3>
      </div>
    </div>
  );
}

function Dashboard() {
  const user = getUser();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/dashboard/stats");
      setStats(response.data.data);
    } catch (err) {
      setError(errorMessage(err, "Unable to load dashboard data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const header = (
    <PageHeader
      title="Dashboard"
      subtitle={`Welcome back, ${user.name || "User"} (${roleLabel(user.role)}) · ${today}`}
      actions={
        <button className="ui-btn ui-btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    />
  );

  if (loading && !stats) {
    return (
      <div className="ui-page">
        {header}
        <Loader label="Loading dashboard..." />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="ui-page">
        {header}
        <div className="ui-error-banner">{error}</div>
      </div>
    );
  }

  const { totals, appointments, visits, weeklyAppointments, upcomingAppointments, billing } = stats;

  const statusData = Object.keys(STATUS_COLORS)
    .map((name) => ({ name, value: appointments[name] || 0 }))
    .filter((item) => item.value > 0);

  return (
    <div className="ui-page">
      {header}

      {error && <div className="ui-error-banner">{error}</div>}

      <div className="ui-stats">
        <StatCard icon={Users} label="Active Patients" value={totals.activePatients} />
        <StatCard icon={Stethoscope} label="Active Doctors" value={totals.activeDoctors} tone="success" />
        <StatCard icon={Building2} label="Departments" value={totals.departments} tone="purple" />
        <StatCard icon={CalendarDays} label="Today's Appointments" value={appointments.today} tone="warning" />
        <StatCard icon={Clock} label="Pending Appointments" value={appointments.Pending} tone="warning" />
        <StatCard icon={CheckCircle2} label="Completed Appointments" value={appointments.Completed} tone="success" />
        {billing && (
          <>
            <StatCard icon={IndianRupee} label="Revenue (Paid)" value={formatCurrency(billing.totalRevenue)} tone="success" />
            <StatCard icon={Wallet} label="Pending Payments" value={formatCurrency(billing.pendingAmount)} tone="danger" />
          </>
        )}
        <StatCard icon={CalendarDays} label="Visits In Progress" value={visits.inProgress} />
      </div>

      <div className="ui-two-col">
        <div className="ui-card">
          <h3 className="ui-card-title">Appointments – last 7 days</h3>
          <p className="ui-card-sub">Number of appointments per day</p>

          <div className="ui-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAppointments}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="appointments" name="Appointments" fill="#2457d6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ui-card">
          <h3 className="ui-card-title">Appointment status</h3>
          <p className="ui-card-sub">All appointments ({appointments.total})</p>

          <div className="ui-chart">
            {statusData.length === 0 ? (
              <EmptyState icon={CalendarX} title="No appointments yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    label
                  >
                    {statusData.map((item) => (
                      <Cell key={item.name} fill={STATUS_COLORS[item.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {billing && (
        <div className="ui-card" style={{ marginBottom: 20 }}>
          <h3 className="ui-card-title">Revenue – last 6 months</h3>
          <p className="ui-card-sub">Paid bills only</p>

          <div className="ui-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billing.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" name="Revenue" fill="#16a36a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="ui-card ui-card-flush">
        <div style={{ padding: "20px 20px 0" }}>
          <h3 className="ui-card-title">Upcoming appointments</h3>
          <p className="ui-card-sub">Pending and confirmed, from today onwards</p>
        </div>

        {upcomingAppointments.length === 0 ? (
          <EmptyState icon={CalendarX} title="No upcoming appointments" />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppointments.map((a) => (
                  <tr key={a._id}>
                    <td className="ui-mono">{a.appointmentId}</td>
                    <td>{a.patient?.name || "—"}</td>
                    <td>{a.doctor?.name || "—"}</td>
                    <td>{formatDate(a.appointmentDate)}</td>
                    <td>{formatTime(a.startTime)}</td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
