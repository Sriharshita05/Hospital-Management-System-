import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Building2,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  FileText,
  FlaskConical,
  Receipt,
  Activity,
  UserCog
} from "lucide-react";
import logo from "../../assets/logo.jpg";
import { getUser } from "../../utils/auth";

const ALL = ["admin", "clinician", "frontDesk"];

// "roles" must match the roles allowed on the matching route
const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ALL },
  { name: "Patients", path: "/patients", icon: Users, roles: ALL },
  { name: "Doctors", path: "/doctors", icon: Stethoscope, roles: ALL },
  { name: "Departments", path: "/departments", icon: Building2, roles: ALL },
  { name: "Schedules", path: "/schedules", icon: CalendarClock, roles: ALL },
  { name: "Appointments", path: "/appointments", icon: CalendarDays, roles: ALL },
  { name: "Visits", path: "/visits", icon: ClipboardList, roles: ALL },
  { name: "Prescriptions", path: "/prescriptions", icon: FileText, roles: ["admin", "clinician"] },
  { name: "Diagnostics", path: "/diagnostics", icon: FlaskConical, roles: ["admin", "clinician"] },
  { name: "Billing", path: "/billing", icon: Receipt, roles: ["admin", "frontDesk"] },
  { name: "Staff", path: "/staff", icon: UserCog, roles: ["admin"] },
  { name: "Audit Logs", path: "/audit-logs", icon: Activity, roles: ["admin"] }
];

function Sidebar({ open = false, onNavigate }) {
  const role = getUser().role;
  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-brand">
        <img
          src={logo}
          alt="Hospital Management System"
          className="sidebar-logo-img"
        />
      </div>

      <div className="sidebar-section">
        <p className="menu-label">MAIN MENU</p>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <span>MediCare HMS · v1.0</span>
      </div>
    </aside>
  );
}

export default Sidebar;
