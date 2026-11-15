import { useNavigate } from "react-router-dom";
import { Menu, UserCircle, LogOut } from "lucide-react";
import logo from "../../assets/logo.jpg";
import { clearSession, getUser, roleLabel } from "../../utils/auth";

function Topbar({ onMenuClick }) {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={22} />
        </button>

        <img
          src={logo}
          alt="Hospital Management System"
          className="topbar-logo-img"
        />
        <span className="topbar-title">Hospital Management System</span>
      </div>

      <div className="topbar-right">
        <div className="profile">
          <UserCircle size={35} />

          <div className="profile-info">
            <h4>{user.name || "User"}</h4>
            <span>{roleLabel(user.role)}</span>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
