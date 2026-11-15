import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./Layout.css";

// Works both as a wrapper (children) and as a route layout (<Outlet />)
function DashboardLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="dashboard-layout">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

      <div
        className={`sidebar-overlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <div className="main-section">
        <Topbar onMenuClick={() => setMenuOpen((open) => !open)} />

        <main className="page-content" key={location.pathname}>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
