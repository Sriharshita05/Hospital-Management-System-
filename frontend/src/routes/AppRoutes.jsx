import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ClientDashboard from "../pages/client/ClientDashboard";
import PlaceholderPage from "../pages/PlaceholderPage";
import ProtectedRoute from "./ProtectedRoute";
import Patients from "../pages/patients/Patients";
import Doctors from "../pages/doctors/Doctors";
import Departments from "../pages/departments/Departments";
import Appointments from "../pages/appointments/Appointments";
import Schedules from "../pages/schedules/Schedules";
import Visits from "../pages/visits/Visits";
import Prescriptions from "../pages/prescriptions/Prescriptions";
import Diagnostics from "../pages/diagnostics/Diagnostics";
import Billing from "../pages/billing/Billing";
import AuditLogs from "../pages/audit/AuditLogs";
import Staff from "../pages/staff/Staff";
import { getUser } from "../utils/auth";

/** /dashboard -> smart redirect based on role */
function DashboardRedirect() {
  const user = getUser();
  if (user?.role === "client") {
    return <Navigate to="/client/dashboard" replace />;
  }
  return <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Smart /dashboard redirect */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Client Routes */}
      <Route element={<ProtectedRoute roles={["client"]} />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
      </Route>

      {/* Protected Routes (logged-in staff: admin, doctor, receptionist) */}
      <Route element={<ProtectedRoute roles={["admin", "clinician", "frontDesk"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/visits" element={<Visits />} />
        </Route>
      </Route>

      {/* Clinical records: admin and clinician */}
      <Route element={<ProtectedRoute roles={["admin", "clinician"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
        </Route>
      </Route>

      {/* Billing: admin and front desk */}
      <Route element={<ProtectedRoute roles={["admin", "frontDesk"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/billing" element={<Billing />} />
        </Route>
      </Route>

      {/* Administration: admin only */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/staff" element={<Staff />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<PlaceholderPage title="Page Not Found" />}
      />
    </Routes>
  );
}

export default AppRoutes;