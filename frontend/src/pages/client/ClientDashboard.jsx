import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hospital,
  User,
  Calendar,
  Clock,
  LogOut,
  Plus,
  Stethoscope,
  Building2,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  XCircle,
  Clock3,
  CalendarDays,
  HeartPulse,
  RefreshCw,
  Loader2,
  Bell,
  Search,
  FileText,
  Edit3,
  ChevronDown,
  Info,
  CalendarRange,
  Pill,
  ClipboardList,
  FlaskConical,
  Eye,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Activity
} from "lucide-react";

import api from "../../services/api";
import { getUser, clearSession, roleLabel } from "../../utils/auth";
import { formatDate, formatTime } from "../../utils/format";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import "./ClientDashboard.css";

function ClientDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getUser());

  // Dashboard core state
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState({ visits: [], prescriptions: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Alert State
  const [alert, setAlert] = useState(null);

  // Header Dropdowns
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  // Modals
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showMedicalRecordsModal, setShowMedicalRecordsModal] = useState(false);
  const [showDoctorsModal, setShowDoctorsModal] = useState(false);
  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);

  // Selected item state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // Booking Form State
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [bookingDoctorId, setBookingDoctorId] = useState("");
  const [bookingDepartmentId, setBookingDepartmentId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingReason, setBookingReason] = useState("");

  // Booking slots
  const [bookingSlots, setBookingSlots] = useState([]);
  const [loadingBookingSlots, setLoadingBookingSlots] = useState(false);
  const [bookingSlotsMessage, setBookingSlotsMessage] = useState("");

  // Reschedule Form State
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduleSlotsMessage, setRescheduleSlotsMessage] = useState("");

  // Edit Profile Form State
  const [profileFormData, setProfileFormData] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    bloodGroup: ""
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Doctors modal search & filter
  const [doctorModalSearch, setDoctorModalSearch] = useState("");
  const [doctorModalDeptFilter, setDoctorModalDeptFilter] = useState("");

  // Medical records active tab
  const [recordsTab, setRecordsTab] = useState("visits");
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  // Load dashboard data
  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [meRes, aptsRes, deptsRes, docsRes] = await Promise.all([
        api.get("/auth/me").catch(() => null),
        api.get("/appointments/my"),
        api.get("/departments").catch(() => ({ data: { data: [] } })),
        api.get("/doctors").catch(() => ({ data: { data: [] } }))
      ]);

      if (meRes?.data?.data) {
        setCurrentUser(meRes.data.data);
        localStorage.setItem("hospital_user", JSON.stringify(meRes.data.data));
      }

      const apts = aptsRes.data?.data || [];
      setAppointments(Array.isArray(apts) ? apts : []);

      const depts = deptsRes.data?.data?.departments || deptsRes.data?.data || [];
      setDepartments(Array.isArray(depts) ? depts.filter((d) => d.isActive !== false) : []);

      const docs = docsRes.data?.data?.doctors || docsRes.data?.data || [];
      setDoctors(Array.isArray(docs) ? docs.filter((d) => d.isActive !== false) : []);

    } catch (err) {
      console.error("Dashboard loading error:", err);
      showAlert("error", err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fetch Medical Records
  const fetchMedicalRecords = async () => {
    try {
      setLoadingRecords(true);
      const res = await api.get("/patients/my/records");
      if (res.data?.data) {
        setMedicalRecords(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching medical records:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Fetch slots for Booking
  useEffect(() => {
    if (!bookingDoctorId || !bookingDate) {
      setBookingSlots([]);
      setBookingSlotsMessage("");
      return;
    }

    const fetchSlots = async () => {
      setLoadingBookingSlots(true);
      setBookingSlotsMessage("");
      setBookingSlots([]);

      try {
        const response = await api.get(
          `/appointments/slots/available?doctorId=${bookingDoctorId}&date=${bookingDate}`
        );
        const data = response.data?.data;
        if (data?.availableSlots) {
          setBookingSlots(data.availableSlots);
          if (data.availableSlots.length === 0) {
            setBookingSlotsMessage(data.message || "No slots available on this date.");
          }
        } else {
          setBookingSlots([]);
          setBookingSlotsMessage(data?.message || "Doctor has no active schedule for this day.");
        }
      } catch (err) {
        setBookingSlots([]);
        setBookingSlotsMessage(err.response?.data?.message || "Could not retrieve slots.");
      } finally {
        setLoadingBookingSlots(false);
      }
    };

    fetchSlots();
  }, [bookingDoctorId, bookingDate]);

  // Fetch slots for Rescheduling
  useEffect(() => {
    if (!appointmentToReschedule || !rescheduleDate) {
      setRescheduleSlots([]);
      setRescheduleSlotsMessage("");
      return;
    }

    const doctorId = typeof appointmentToReschedule.doctor === "object"
      ? appointmentToReschedule.doctor?._id
      : appointmentToReschedule.doctor;

    const fetchSlots = async () => {
      setLoadingRescheduleSlots(true);
      setRescheduleSlotsMessage("");
      setRescheduleSlots([]);

      try {
        const response = await api.get(
          `/appointments/slots/available?doctorId=${doctorId}&date=${rescheduleDate}`
        );
        const data = response.data?.data;
        if (data?.availableSlots) {
          setRescheduleSlots(data.availableSlots);
          if (data.availableSlots.length === 0) {
            setRescheduleSlotsMessage(data.message || "No slots available on this date.");
          }
        } else {
          setRescheduleSlots([]);
          setRescheduleSlotsMessage(data?.message || "Doctor has no active schedule for this day.");
        }
      } catch (err) {
        setRescheduleSlots([]);
        setRescheduleSlotsMessage(err.response?.data?.message || "Could not retrieve slots.");
      } finally {
        setLoadingRescheduleSlots(false);
      }
    };

    fetchSlots();
  }, [appointmentToReschedule, rescheduleDate]);

  // Submit new booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingSuccess("");

    if (!bookingDoctorId || !bookingDate || !bookingTime || !bookingReason.trim()) {
      setBookingError("Please complete all required fields.");
      return;
    }

    setBookingLoading(true);

    try {
      await api.post("/appointments/my", {
        doctor: bookingDoctorId,
        appointmentDate: bookingDate,
        startTime: bookingTime,
        reason: bookingReason.trim()
      });

      setBookingSuccess("Appointment requested successfully!");
      showAlert("success", "Your appointment has been requested and is awaiting hospital review.");

      setTimeout(() => {
        setShowBookingModal(false);
        setBookingDoctorId("");
        setBookingDepartmentId("");
        setBookingDate("");
        setBookingTime("");
        setBookingReason("");
        setBookingSuccess("");
        loadDashboardData(true);
      }, 1000);

    } catch (err) {
      setBookingError(
        err.response?.data?.message ||
        err.message ||
        "Failed to book appointment. Please select another slot."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  // Submit Reschedule
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setRescheduleError("");

    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError("Please select a new date and time slot.");
      return;
    }

    setRescheduleLoading(true);

    try {
      await api.patch(`/appointments/my/${appointmentToReschedule.appointmentId}/reschedule`, {
        appointmentDate: rescheduleDate,
        startTime: rescheduleTime,
        reason: rescheduleReason.trim() || undefined
      });

      showAlert("success", `Appointment ${appointmentToReschedule.appointmentId} rescheduled successfully!`);
      setShowRescheduleModal(false);
      setAppointmentToReschedule(null);
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleReason("");
      loadDashboardData(true);

    } catch (err) {
      setRescheduleError(
        err.response?.data?.message ||
        err.message ||
        "Failed to reschedule appointment."
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Confirm cancel appointment
  const executeCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    setCancellingLoading(true);
    try {
      await api.patch(`/appointments/my/${appointmentToCancel.appointmentId}/cancel`);
      showAlert("success", `Appointment ${appointmentToCancel.appointmentId} cancelled.`);
      setAppointmentToCancel(null);
      loadDashboardData(true);
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Failed to cancel appointment.");
    } finally {
      setCancellingLoading(false);
    }
  };

  // Open Edit Profile Modal
  const openEditProfile = () => {
    setProfileFormData({
      name: currentUser.name || "",
      phone: currentUser.phone || "",
      dateOfBirth: currentUser.dateOfBirth ? currentUser.dateOfBirth.slice(0, 10) : "",
      gender: currentUser.gender || "",
      address: currentUser.address || "",
      bloodGroup: currentUser.bloodGroup || ""
    });
    setProfileError("");
    setShowProfileDropdown(false);
    setShowEditProfileModal(true);
  };

  // Save Edit Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");

    if (!profileFormData.name.trim() || !profileFormData.phone.trim() || !profileFormData.address.trim()) {
      setProfileError("Name, phone, and address are required.");
      return;
    }

    setProfileLoading(true);

    try {
      const res = await api.put("/auth/me", profileFormData);
      if (res.data?.data) {
        setCurrentUser(res.data.data);
        localStorage.setItem("hospital_user", JSON.stringify(res.data.data));
      }
      showAlert("success", "Profile updated successfully!");
      setShowEditProfileModal(false);
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Open Reschedule Modal
  const openReschedule = (apt) => {
    setAppointmentToReschedule(apt);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleReason(apt.reason || "");
    setRescheduleError("");
    setShowRescheduleModal(true);
  };

  // Open Appointment Details Modal
  const openDetails = (apt) => {
    setSelectedAppointment(apt);
    setShowDetailsModal(true);
  };

  // Open Medical Records Modal
  const openMedicalRecords = () => {
    setShowMedicalRecordsModal(true);
    setShowProfileDropdown(false);
    fetchMedicalRecords();
  };

  // Personalized Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Today formatted string
  const formattedToday = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date());
  }, []);

  const todayIsoString = new Date().toISOString().split("T")[0];

  // Statistics from actual backend appointments
  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => a.status === "Pending").length;
    const approved = appointments.filter((a) => a.status === "Approved" || a.status === "Confirmed").length;
    const completed = appointments.filter((a) => a.status === "Completed").length;
    return { total, pending, approved, completed };
  }, [appointments]);

  // Notifications dynamically generated from real appointment data
  const notifications = useMemo(() => {
    const list = [];

    // Notice for pending appointments
    if (stats.pending > 0) {
      list.push({
        id: "pending-alert",
        title: "Pending Appointments",
        message: `You have ${stats.pending} appointment request(s) awaiting hospital confirmation.`,
        type: "warning",
        time: "Action pending"
      });
    }

    // Check upcoming approved appointments in next 3 days
    const now = new Date();
    appointments.forEach((apt) => {
      if ((apt.status === "Approved" || apt.status === "Confirmed") && apt.appointmentDate) {
        const aptDate = new Date(apt.appointmentDate);
        const diffDays = Math.ceil((aptDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          const docName = typeof apt.doctor === "object" ? apt.doctor?.name : "your doctor";
          list.push({
            id: `upcoming-${apt._id}`,
            title: "Upcoming Consultation",
            message: `Visit with Dr. ${docName} scheduled for ${formatDate(apt.appointmentDate)} at ${formatTime(apt.startTime)}.`,
            type: "info",
            time: diffDays === 0 ? "Today" : `In ${diffDays} day(s)`
          });
        }
      }
    });

    if (list.length === 0) {
      list.push({
        id: "all-clear",
        title: "All Caught Up",
        message: "You have no urgent medical alerts or pending appointment actions.",
        type: "success",
        time: "Just now"
      });
    }

    return list;
  }, [appointments, stats.pending]);

  // Dynamic Recent Activity Timeline
  const recentActivities = useMemo(() => {
    const activities = [];

    // Add recent appointments as activities
    const sortedApts = [...appointments].sort(
      (a, b) => new Date(b.createdAt || b.appointmentDate) - new Date(a.createdAt || a.appointmentDate)
    );

    sortedApts.slice(0, 5).forEach((apt) => {
      const docName = typeof apt.doctor === "object" ? apt.doctor?.name : "Doctor";
      activities.push({
        id: `act-apt-${apt._id}`,
        title: `Appointment ${apt.status}`,
        description: `Consultation with Dr. ${docName} on ${formatDate(apt.appointmentDate)} (${formatTime(apt.startTime)})`,
        status: apt.status,
        date: apt.createdAt ? formatDate(apt.createdAt) : formatDate(apt.appointmentDate)
      });
    });

    return activities;
  }, [appointments]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Tab filter
      if (activeTab === "pending" && apt.status !== "Pending") return false;
      if (activeTab === "approved" && apt.status !== "Approved" && apt.status !== "Confirmed") return false;
      if (activeTab === "completed" && apt.status !== "Completed") return false;
      if (activeTab === "rejected" && apt.status !== "Rejected" && apt.status !== "Cancelled") return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const docName = typeof apt.doctor === "object" ? apt.doctor?.name?.toLowerCase() || "" : "";
        const docSpec = typeof apt.doctor === "object" ? apt.doctor?.specialization?.toLowerCase() || "" : "";
        const aptId = (apt.appointmentId || "").toLowerCase();
        const reasonStr = (apt.reason || "").toLowerCase();
        return (
          docName.includes(q) ||
          docSpec.includes(q) ||
          aptId.includes(q) ||
          reasonStr.includes(q)
        );
      }

      return true;
    });
  }, [appointments, activeTab, searchQuery]);

  // Helper status badge renderer
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <span className="apt-badge pending"><Clock3 size={12} /> Pending</span>;
      case "Approved":
      case "Confirmed":
        return <span className="apt-badge approved"><CheckCircle2 size={12} /> Approved</span>;
      case "Completed":
        return <span className="apt-badge completed"><CheckCircle2 size={12} /> Completed</span>;
      case "Rejected":
      case "Cancelled":
        return <span className="apt-badge rejected"><XCircle size={12} /> {status}</span>;
      default:
        return <span className="apt-badge muted">{status}</span>;
    }
  };

  // Doctors filtered for directory modal
  const filteredDirectoryDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (doctorModalDeptFilter) {
        const deptId = typeof doc.department === "object" ? doc.department?._id : doc.department;
        if (deptId !== doctorModalDeptFilter) return false;
      }
      if (doctorModalSearch.trim()) {
        const q = doctorModalSearch.toLowerCase();
        const nameMatch = (doc.name || "").toLowerCase().includes(q);
        const specMatch = (doc.specialization || "").toLowerCase().includes(q);
        return nameMatch || specMatch;
      }
      return true;
    });
  }, [doctors, doctorModalDeptFilter, doctorModalSearch]);

  return (
    <div className="client-app-root">

      {/* 1. Header Navigation */}
      <header className="client-top-nav">
        <div className="nav-container">

          {/* Brand */}
          <div className="nav-brand">
            <div className="brand-symbol">
              <Hospital size={22} />
            </div>
            <div className="brand-headings">
              <span className="brand-title">MediCare</span>
              <span className="brand-subtitle">Hospital Management</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="nav-links">
            <a href="#welcome" className="nav-link active">Dashboard</a>
            <a href="#appointments" className="nav-link">Appointments</a>
            <button className="nav-link-btn" onClick={() => setShowDoctorsModal(true)}>Doctors</button>
            <button className="nav-link-btn" onClick={() => setShowDepartmentsModal(true)}>Departments</button>
            <button className="nav-link-btn" onClick={openMedicalRecords}>Medical Records</button>
          </nav>

          {/* Action Tools */}
          <div className="nav-actions">

            {/* Refresh Button */}
            <button
              className="action-icon-btn"
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              title="Refresh Dashboard"
              aria-label="Refresh Dashboard"
            >
              <RefreshCw size={17} className={refreshing ? "spin-icon" : ""} />
            </button>

            {/* Notification Bell Dropdown */}
            <div className="dropdown-wrapper" ref={notificationsRef}>
              <button
                className={`action-icon-btn ${showNotifications ? "active" : ""}`}
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell size={18} />
                {stats.pending > 0 && <span className="notification-dot" />}
              </button>

              {showNotifications && (
                <div className="dropdown-panel notifications-panel">
                  <div className="panel-header">
                    <h4>Notifications</h4>
                    <span className="badge-count">{notifications.length}</span>
                  </div>
                  <div className="panel-body">
                    {notifications.map((item) => (
                      <div key={item.id} className={`notification-item ${item.type}`}>
                        <div className="item-icon">
                          {item.type === "warning" ? (
                            <Clock3 size={15} />
                          ) : item.type === "info" ? (
                            <CalendarDays size={15} />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                        </div>
                        <div className="item-content">
                          <div className="item-top">
                            <span className="item-title">{item.title}</span>
                            <span className="item-time">{item.time}</span>
                          </div>
                          <p className="item-msg">{item.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Patient Profile Dropdown */}
            <div className="dropdown-wrapper" ref={profileRef}>
              <button
                className="profile-pill-btn"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                aria-label="Open profile menu"
              >
                <div className="profile-avatar">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User size={15} />}
                </div>
                <div className="profile-text">
                  <span className="name">{currentUser.name || "Patient"}</span>
                  <span className="role-tag">Client</span>
                </div>
                <ChevronDown size={14} className={`chevron ${showProfileDropdown ? "rotated" : ""}`} />
              </button>

              {showProfileDropdown && (
                <div className="dropdown-panel profile-panel">
                  <div className="profile-panel-head">
                    <div className="panel-avatar-large">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User size={20} />}
                    </div>
                    <div className="panel-user-info">
                      <h4>{currentUser.name}</h4>
                      <p>{currentUser.email}</p>
                      <span className="panel-id-pill">{currentUser.patientId || "PATIENT"}</span>
                    </div>
                  </div>

                  <div className="panel-menu">
                    <button className="panel-menu-item" onClick={openEditProfile}>
                      <Edit3 size={16} />
                      <span>Edit My Profile</span>
                    </button>
                    <button className="panel-menu-item" onClick={openMedicalRecords}>
                      <ClipboardList size={16} />
                      <span>My Medical Records</span>
                    </button>
                    <button
                      className="panel-menu-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowBookingModal(true);
                      }}
                    >
                      <Plus size={16} />
                      <span>Book Appointment</span>
                    </button>
                  </div>

                  <div className="panel-footer">
                    <button className="panel-logout-btn" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Global Alert Notification */}
      {alert && (
        <div className={`global-alert-toast ${alert.type}`}>
          <div className="alert-content">
            {alert.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)}><X size={15} /></button>
        </div>
      )}

      {/* Main Dashboard Workspace */}
      <main className="dashboard-content">

        {/* 2. Welcome Section Banner */}
        <section className="welcome-banner-card" id="welcome">
          <div className="banner-left">
            <div className="banner-tag">
              <Sparkles size={14} />
              <span>Patient Healthcare Portal</span>
            </div>
            <h2>{greeting}, {currentUser.name ? currentUser.name.split(" ")[0] : "Patient"}!</h2>
            <p>
              Welcome back to your MediCare healthcare hub. Check your upcoming visits, consult doctors, and review your diagnostic history.
            </p>
            <div className="banner-meta">
              <span className="banner-date">
                <Calendar size={14} />
                {formattedToday}
              </span>
              <button
                className="banner-cta-btn"
                onClick={() => {
                  setBookingError("");
                  setBookingSuccess("");
                  setShowBookingModal(true);
                }}
              >
                <Plus size={16} />
                <span>Book Appointment</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Statistics Cards */}
        <section className="stats-row">

          <div className="stat-card">
            <div className="stat-icon-wrap total">
              <CalendarRange size={22} />
            </div>
            <div className="stat-data">
              <span className="stat-number">{loading ? "--" : stats.total}</span>
              <span className="stat-label">Total Appointments</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap pending">
              <Clock3 size={22} />
            </div>
            <div className="stat-data">
              <span className="stat-number">{loading ? "--" : stats.pending}</span>
              <span className="stat-label">Pending Approval</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap approved">
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-data">
              <span className="stat-number">{loading ? "--" : stats.approved}</span>
              <span className="stat-label">Approved & Confirmed</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap completed">
              <HeartPulse size={22} />
            </div>
            <div className="stat-data">
              <span className="stat-number">{loading ? "--" : stats.completed}</span>
              <span className="stat-label">Completed Consultations</span>
            </div>
          </div>

        </section>

        {/* 4. Quick Actions */}
        <section className="quick-actions-section">
          <div className="section-title-wrap">
            <h3>Quick Services</h3>
            <span className="section-sub">Frequent patient actions</span>
          </div>

          <div className="quick-actions-grid">

            <div
              className="quick-action-card primary"
              onClick={() => {
                setBookingError("");
                setBookingSuccess("");
                setShowBookingModal(true);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="action-card-icon"><Plus size={20} /></div>
              <h4>Book Appointment</h4>
              <p>Schedule a visit with any doctor</p>
              <span className="action-link">Book Now <ArrowRight size={13} /></span>
            </div>

            <div
              className="quick-action-card"
              onClick={() => setShowDoctorsModal(true)}
              role="button"
              tabIndex={0}
            >
              <div className="action-card-icon doctor"><Stethoscope size={20} /></div>
              <h4>Find a Doctor</h4>
              <p>Explore specialist physicians & fees</p>
              <span className="action-link">View Directory <ArrowRight size={13} /></span>
            </div>

            <div
              className="quick-action-card"
              onClick={() => setShowDepartmentsModal(true)}
              role="button"
              tabIndex={0}
            >
              <div className="action-card-icon dept"><Building2 size={20} /></div>
              <h4>Explore Departments</h4>
              <p>Cardiology, Pediatrics & more</p>
              <span className="action-link">Explore <ArrowRight size={13} /></span>
            </div>

            <div
              className="quick-action-card"
              onClick={openMedicalRecords}
              role="button"
              tabIndex={0}
            >
              <div className="action-card-icon records"><FileText size={20} /></div>
              <h4>Medical Records</h4>
              <p>Visits, prescriptions & test reports</p>
              <span className="action-link">View Records <ArrowRight size={13} /></span>
            </div>

          </div>
        </section>

        {/* Main 2-Column Grid */}
        <div className="dashboard-grid-layout">

          {/* Main Column: 5. My Appointments */}
          <div className="grid-main-col" id="appointments">

            <div className="appointments-card-container">

              {/* Header & Controls */}
              <div className="appointments-head">
                <div className="head-text">
                  <h3>My Appointments</h3>
                  <p>Track your appointments, view details, reschedule, or cancel</p>
                </div>

                <button
                  className="btn-create-apt"
                  onClick={() => {
                    setBookingError("");
                    setBookingSuccess("");
                    setShowBookingModal(true);
                  }}
                >
                  <Plus size={15} />
                  <span>Book Appointment</span>
                </button>
              </div>

              {/* Search & Tabs Toolbar */}
              <div className="appointments-toolbar">

                <div className="search-input-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search doctor, specialization, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="status-tabs-group">
                  <button
                    className={`status-tab ${activeTab === "all" ? "active" : ""}`}
                    onClick={() => setActiveTab("all")}
                  >
                    All ({appointments.length})
                  </button>
                  <button
                    className={`status-tab ${activeTab === "pending" ? "active" : ""}`}
                    onClick={() => setActiveTab("pending")}
                  >
                    Pending ({stats.pending})
                  </button>
                  <button
                    className={`status-tab ${activeTab === "approved" ? "active" : ""}`}
                    onClick={() => setActiveTab("approved")}
                  >
                    Approved ({stats.approved})
                  </button>
                  <button
                    className={`status-tab ${activeTab === "completed" ? "active" : ""}`}
                    onClick={() => setActiveTab("completed")}
                  >
                    Completed ({stats.completed})
                  </button>
                  <button
                    className={`status-tab ${activeTab === "rejected" ? "active" : ""}`}
                    onClick={() => setActiveTab("rejected")}
                  >
                    Cancelled
                  </button>
                </div>

              </div>

              {/* Appointments List */}
              {loading ? (
                /* Skeleton Loader */
                <div className="skeletons-wrapper">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="appointment-skeleton">
                      <div className="skeleton-line title" />
                      <div className="skeleton-line sub" />
                      <div className="skeleton-line meta" />
                    </div>
                  ))}
                </div>
              ) : filteredAppointments.length === 0 ? (
                /* 7. Empty State */
                <div className="empty-state-box">
                  <div className="empty-icon"><CalendarDays size={42} /></div>
                  <h4>No Appointments Found</h4>
                  <p>
                    {searchQuery
                      ? `No appointment matched your search "${searchQuery}". Try a different keyword.`
                      : activeTab !== "all"
                      ? `You do not have any appointments in "${activeTab}" status.`
                      : "You have not scheduled any appointments yet. Choose a doctor and book your consultation."}
                  </p>
                  <button
                    className="empty-cta-btn"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveTab("all");
                      setShowBookingModal(true);
                    }}
                  >
                    <Plus size={16} /> Book Your First Appointment
                  </button>
                </div>
              ) : (
                <div className="appointments-cards-flow">
                  {filteredAppointments.map((apt) => {
                    const doctor = typeof apt.doctor === "object" ? apt.doctor : null;
                    const deptName =
                      doctor?.department && typeof doctor.department === "object"
                        ? doctor.department?.name
                        : "General Medicine";
                    const canCancel = apt.status === "Pending";
                    const canReschedule = ["Pending", "Confirmed", "Approved"].includes(apt.status);

                    return (
                      <div key={apt._id} className="apt-card-item">

                        <div className="apt-top-row">
                          <div className="doctor-info-cluster">
                            <div className="doc-avatar-icon">
                              <Stethoscope size={18} />
                            </div>
                            <div>
                              <h4 className="doc-name">Dr. {doctor?.name || "Specialist Physician"}</h4>
                              <span className="doc-details">
                                {doctor?.specialization || "Clinical Consultant"} · {deptName}
                              </span>
                            </div>
                          </div>

                          <div className="apt-status-badge-wrap">
                            {renderStatusBadge(apt.status)}
                          </div>
                        </div>

                        <div className="apt-details-pills">
                          <div className="info-pill">
                            <Calendar size={13} />
                            <span>{formatDate(apt.appointmentDate)}</span>
                          </div>
                          <div className="info-pill">
                            <Clock size={13} />
                            <span>{formatTime(apt.startTime)} - {formatTime(apt.endTime)}</span>
                          </div>
                          <div className="info-pill id-pill">
                            <span>ID: {apt.appointmentId}</span>
                          </div>
                          {doctor?.consultationFee !== undefined && (
                            <div className="info-pill fee-pill">
                              <span>Fee: ${doctor.consultationFee}</span>
                            </div>
                          )}
                        </div>

                        <div className="apt-reason-box">
                          <span className="reason-tag">Reason for Visit:</span>
                          <p>{apt.reason}</p>
                        </div>

                        <div className="apt-card-actions">
                          <button
                            className="apt-action-btn view"
                            onClick={() => openDetails(apt)}
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </button>

                          {canReschedule && (
                            <button
                              className="apt-action-btn reschedule"
                              onClick={() => openReschedule(apt)}
                            >
                              <CalendarRange size={14} />
                              <span>Reschedule</span>
                            </button>
                          )}

                          {canCancel && (
                            <button
                              className="apt-action-btn cancel"
                              onClick={() => setAppointmentToCancel(apt)}
                            >
                              <XCircle size={14} />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

          {/* Side Column: 6. Patient Profile & 7. Recent Activity */}
          <div className="grid-side-col">

            {/* Patient Profile Card */}
            <div className="profile-widget-card">
              <div className="widget-head">
                <div className="widget-title-group">
                  <User size={18} />
                  <h3>Patient Profile</h3>
                </div>
                <button className="btn-edit-profile-icon" onClick={openEditProfile} title="Edit Profile">
                  <Edit3 size={15} />
                  <span>Edit</span>
                </button>
              </div>

              <div className="patient-avatar-badge-center">
                <div className="big-avatar">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User size={30} />}
                </div>
                <h4>{currentUser.name}</h4>
                <span className="patient-id-tag">{currentUser.patientId || "PATIENT"}</span>
              </div>

              <div className="profile-attributes">
                <div className="attr-row">
                  <span className="attr-label"><Mail size={13} /> Email</span>
                  <span className="attr-value email">{currentUser.email || "N/A"}</span>
                </div>
                <div className="attr-row">
                  <span className="attr-label"><Phone size={13} /> Phone</span>
                  <span className="attr-value">{currentUser.phone || "N/A"}</span>
                </div>
                <div className="attr-row">
                  <span className="attr-label"><Calendar size={13} /> Date of Birth</span>
                  <span className="attr-value">
                    {currentUser.dateOfBirth ? formatDate(currentUser.dateOfBirth) : "N/A"}
                  </span>
                </div>
                <div className="attr-row">
                  <span className="attr-label"><User size={13} /> Gender</span>
                  <span className="attr-value">{currentUser.gender || "N/A"}</span>
                </div>
                {currentUser.bloodGroup && (
                  <div className="attr-row">
                    <span className="attr-label"><HeartPulse size={13} /> Blood Group</span>
                    <span className="attr-value blood-badge">{currentUser.bloodGroup}</span>
                  </div>
                )}
                <div className="attr-row address-row">
                  <span className="attr-label"><MapPin size={13} /> Address</span>
                  <span className="attr-value address">{currentUser.address || "N/A"}</span>
                </div>
              </div>

              <button className="btn-full-edit-profile" onClick={openEditProfile}>
                <Edit3 size={15} />
                <span>Edit Profile Information</span>
              </button>
            </div>

            {/* 7. Recent Activity Section */}
            <div className="activity-widget-card">
              <div className="widget-head">
                <div className="widget-title-group">
                  <Activity size={18} />
                  <h3>Recent Activity</h3>
                </div>
              </div>

              {recentActivities.length === 0 ? (
                <div className="activity-empty">
                  <p>No recent activity recorded yet.</p>
                </div>
              ) : (
                <div className="activity-timeline">
                  {recentActivities.map((act) => (
                    <div key={act.id} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <div className="timeline-head">
                          <span className="act-title">{act.title}</span>
                          <span className="act-date">{act.date}</span>
                        </div>
                        <p className="act-desc">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

      {/* =========================================================================
          MODALS & OVERLAYS
      ========================================================================= */}

      {/* 1. Book Appointment Modal */}
      {showBookingModal && (
        <div className="ui-modal-backdrop" onMouseDown={() => !bookingLoading && setShowBookingModal(false)}>
          <div className="ui-modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ui-modal-head">
              <div className="head-icon-title">
                <div className="modal-icon-badge"><CalendarDays size={20} /></div>
                <div>
                  <h3>Book an Appointment</h3>
                  <p>Select your doctor, preferred date, and available slot</p>
                </div>
              </div>
              <button
                className="close-modal-x"
                onClick={() => setShowBookingModal(false)}
                disabled={bookingLoading}
              >
                <X size={18} />
              </button>
            </div>

            {bookingError && (
              <div className="modal-alert-box error">
                <AlertCircle size={16} />
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccess && (
              <div className="modal-alert-box success">
                <CheckCircle2 size={16} />
                <span>{bookingSuccess}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="modal-form-flow">

              {/* Department Filter */}
              <div className="form-field-unit">
                <label>Filter by Department (Optional)</label>
                <select
                  value={bookingDepartmentId}
                  onChange={(e) => {
                    setBookingDepartmentId(e.target.value);
                    setBookingDoctorId("");
                    setBookingTime("");
                  }}
                  disabled={bookingLoading}
                >
                  <option value="">All Departments ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Doctor Selection */}
              <div className="form-field-unit">
                <label>Select Doctor <span className="req">*</span></label>
                <select
                  value={bookingDoctorId}
                  onChange={(e) => {
                    setBookingDoctorId(e.target.value);
                    setBookingTime("");
                  }}
                  disabled={bookingLoading}
                  required
                >
                  <option value="">-- Choose a Doctor --</option>
                  {doctors
                    .filter((doc) => {
                      if (!bookingDepartmentId) return true;
                      const dId = typeof doc.department === "object" ? doc.department?._id : doc.department;
                      return dId === bookingDepartmentId;
                    })
                    .map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        Dr. {doc.name} - {doc.specialization} (${doc.consultationFee})
                      </option>
                    ))}
                </select>
              </div>

              {/* Date Selection */}
              <div className="form-field-unit">
                <label>Appointment Date <span className="req">*</span></label>
                <input
                  type="date"
                  min={todayIsoString}
                  value={bookingDate}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setBookingTime("");
                  }}
                  disabled={bookingLoading}
                  required
                />
              </div>

              {/* Available Slots */}
              <div className="form-field-unit">
                <label>Select Time Slot <span className="req">*</span></label>
                {loadingBookingSlots ? (
                  <div className="slots-loading-state">
                    <Loader2 size={16} className="spin-icon" />
                    <span>Checking available slots...</span>
                  </div>
                ) : !bookingDoctorId || !bookingDate ? (
                  <p className="slots-helper-msg">Select a doctor and date to view open appointment slots.</p>
                ) : bookingSlots.length === 0 ? (
                  <p className="slots-empty-msg">{bookingSlotsMessage || "No slots available for this date."}</p>
                ) : (
                  <div className="slots-grid-pills">
                    {bookingSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        className={`slot-chip ${bookingTime === slot ? "selected" : ""}`}
                        onClick={() => setBookingTime(slot)}
                        disabled={bookingLoading}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="form-field-unit">
                <label>Reason for Visit / Symptoms <span className="req">*</span></label>
                <textarea
                  rows={3}
                  placeholder="Describe your health concern, symptoms, or consultation objective..."
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  disabled={bookingLoading}
                  required
                />
              </div>

              <div className="ui-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowBookingModal(false)}
                  disabled={bookingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={bookingLoading || !bookingTime}
                >
                  {bookingLoading ? (
                    <span className="btn-loader-text">
                      <Loader2 size={16} className="spin-icon" /> Booking...
                    </span>
                  ) : (
                    "Confirm Appointment Request"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 2. Reschedule Appointment Modal */}
      {showRescheduleModal && appointmentToReschedule && (
        <div className="ui-modal-backdrop" onMouseDown={() => !rescheduleLoading && setShowRescheduleModal(false)}>
          <div className="ui-modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ui-modal-head">
              <div className="head-icon-title">
                <div className="modal-icon-badge reschedule"><CalendarRange size={20} /></div>
                <div>
                  <h3>Reschedule Appointment</h3>
                  <p>Choose a new date and time for {appointmentToReschedule.appointmentId}</p>
                </div>
              </div>
              <button
                className="close-modal-x"
                onClick={() => setShowRescheduleModal(false)}
                disabled={rescheduleLoading}
              >
                <X size={18} />
              </button>
            </div>

            {rescheduleError && (
              <div className="modal-alert-box error">
                <AlertCircle size={16} />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="reschedule-current-summary">
              <span className="sum-label">Current Schedule:</span>
              <span className="sum-val">
                {formatDate(appointmentToReschedule.appointmentDate)} at {formatTime(appointmentToReschedule.startTime)}
              </span>
              <span className="sum-doc">
                with Dr. {typeof appointmentToReschedule.doctor === "object" ? appointmentToReschedule.doctor?.name : "Doctor"}
              </span>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="modal-form-flow">

              <div className="form-field-unit">
                <label>New Appointment Date <span className="req">*</span></label>
                <input
                  type="date"
                  min={todayIsoString}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime("");
                  }}
                  disabled={rescheduleLoading}
                  required
                />
              </div>

              <div className="form-field-unit">
                <label>New Time Slot <span className="req">*</span></label>
                {loadingRescheduleSlots ? (
                  <div className="slots-loading-state">
                    <Loader2 size={16} className="spin-icon" />
                    <span>Checking available slots...</span>
                  </div>
                ) : !rescheduleDate ? (
                  <p className="slots-helper-msg">Select a new date to view open slots.</p>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="slots-empty-msg">{rescheduleSlotsMessage || "No slots available on this date."}</p>
                ) : (
                  <div className="slots-grid-pills">
                    {rescheduleSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        className={`slot-chip ${rescheduleTime === slot ? "selected" : ""}`}
                        onClick={() => setRescheduleTime(slot)}
                        disabled={rescheduleLoading}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-field-unit">
                <label>Updated Reason or Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or updated reason for reschedule..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  disabled={rescheduleLoading}
                />
              </div>

              <div className="ui-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowRescheduleModal(false)}
                  disabled={rescheduleLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={rescheduleLoading || !rescheduleTime}
                >
                  {rescheduleLoading ? (
                    <span className="btn-loader-text">
                      <Loader2 size={16} className="spin-icon" /> Rescheduling...
                    </span>
                  ) : (
                    "Confirm Reschedule"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 3. Appointment Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="ui-modal-backdrop" onMouseDown={() => setShowDetailsModal(false)}>
          <div className="ui-modal-card details" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ui-modal-head">
              <div className="head-icon-title">
                <div className="modal-icon-badge details"><Info size={20} /></div>
                <div>
                  <h3>Appointment Details</h3>
                  <p>Comprehensive record for {selectedAppointment.appointmentId}</p>
                </div>
              </div>
              <button className="close-modal-x" onClick={() => setShowDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="details-modal-grid">
              <div className="detail-row">
                <span className="d-label">Appointment ID</span>
                <span className="d-val mono">{selectedAppointment.appointmentId}</span>
              </div>
              <div className="detail-row">
                <span className="d-label">Status</span>
                <span className="d-val">{renderStatusBadge(selectedAppointment.status)}</span>
              </div>
              <div className="detail-row">
                <span className="d-label">Physician</span>
                <span className="d-val bold">
                  Dr. {typeof selectedAppointment.doctor === "object" ? selectedAppointment.doctor?.name : "N/A"}
                </span>
              </div>
              <div className="detail-row">
                <span className="d-label">Specialization</span>
                <span className="d-val">
                  {typeof selectedAppointment.doctor === "object" ? selectedAppointment.doctor?.specialization : "N/A"}
                </span>
              </div>
              <div className="detail-row">
                <span className="d-label">Appointment Date</span>
                <span className="d-val">{formatDate(selectedAppointment.appointmentDate)}</span>
              </div>
              <div className="detail-row">
                <span className="d-label">Time Window</span>
                <span className="d-val">
                  {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                </span>
              </div>
              {selectedAppointment.doctor?.consultationFee !== undefined && (
                <div className="detail-row">
                  <span className="d-label">Consultation Fee</span>
                  <span className="d-val fee">${selectedAppointment.doctor.consultationFee}</span>
                </div>
              )}
              <div className="detail-row full">
                <span className="d-label">Reason for Consultation</span>
                <p className="d-val-block">{selectedAppointment.reason}</p>
              </div>
            </div>

            <div className="ui-modal-actions">
              {["Pending", "Confirmed", "Approved"].includes(selectedAppointment.status) && (
                <button
                  className="btn-modal-action-sub"
                  onClick={() => {
                    setShowDetailsModal(false);
                    openReschedule(selectedAppointment);
                  }}
                >
                  <CalendarRange size={15} />
                  <span>Reschedule</span>
                </button>
              )}
              {selectedAppointment.status === "Pending" && (
                <button
                  className="btn-modal-action-danger"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setAppointmentToCancel(selectedAppointment);
                  }}
                >
                  <XCircle size={15} />
                  <span>Cancel Appointment</span>
                </button>
              )}
              <button className="btn-modal-cancel" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="ui-modal-backdrop" onMouseDown={() => !profileLoading && setShowEditProfileModal(false)}>
          <div className="ui-modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ui-modal-head">
              <div className="head-icon-title">
                <div className="modal-icon-badge"><Edit3 size={20} /></div>
                <div>
                  <h3>Edit Patient Profile</h3>
                  <p>Update your personal and contact details</p>
                </div>
              </div>
              <button
                className="close-modal-x"
                onClick={() => setShowEditProfileModal(false)}
                disabled={profileLoading}
              >
                <X size={18} />
              </button>
            </div>

            {profileError && (
              <div className="modal-alert-box error">
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="modal-form-flow">

              <div className="form-field-unit">
                <label>Full Name <span className="req">*</span></label>
                <input
                  type="text"
                  value={profileFormData.name}
                  onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                  disabled={profileLoading}
                  required
                />
              </div>

              <div className="form-field-unit">
                <label>Phone Number <span className="req">*</span></label>
                <input
                  type="tel"
                  value={profileFormData.phone}
                  onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                  disabled={profileLoading}
                  required
                />
              </div>

              <div className="form-field-unit">
                <label>Date of Birth</label>
                <input
                  type="date"
                  max={todayIsoString}
                  value={profileFormData.dateOfBirth}
                  onChange={(e) => setProfileFormData({ ...profileFormData, dateOfBirth: e.target.value })}
                  disabled={profileLoading}
                />
              </div>

              <div className="form-field-unit">
                <label>Gender</label>
                <select
                  value={profileFormData.gender}
                  onChange={(e) => setProfileFormData({ ...profileFormData, gender: e.target.value })}
                  disabled={profileLoading}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field-unit">
                <label>Blood Group</label>
                <select
                  value={profileFormData.bloodGroup}
                  onChange={(e) => setProfileFormData({ ...profileFormData, bloodGroup: e.target.value })}
                  disabled={profileLoading}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="form-field-unit">
                <label>Residential Address <span className="req">*</span></label>
                <textarea
                  rows={2}
                  value={profileFormData.address}
                  onChange={(e) => setProfileFormData({ ...profileFormData, address: e.target.value })}
                  disabled={profileLoading}
                  required
                />
              </div>

              <div className="ui-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowEditProfileModal(false)}
                  disabled={profileLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <span className="btn-loader-text">
                      <Loader2 size={16} className="spin-icon" /> Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. Medical Records Modal */}
      {showMedicalRecordsModal && (
        <div className="ui-modal-backdrop" onMouseDown={() => setShowMedicalRecordsModal(false)}>
          <div className="ui-modal-card large" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ui-modal-head">
              <div className="head-icon-title">
                <div className="modal-icon-badge records"><FileText size={20} /></div>
                <div>
                  <h3>My Medical Records</h3>
                  <p>Clinical visits, prescriptions, and diagnostic test reports</p>
                </div>
              </div>
              <button className="close-modal-x" onClick={() => setShowMedicalRecordsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="records-tab-bar">
              <button
                className={`rec-tab ${recordsTab === "visits" ? "active" : ""}`}
                onClick={() => setRecordsTab("visits")}
              >
                <ClipboardList size={15} />
                <span>Clinical Visits ({medicalRecords.visits?.length || 0})</span>
              </button>
              <button
                className={`rec-tab ${recordsTab === "prescriptions" ? "active" : ""}`}
                onClick={() => setRecordsTab("prescriptions")}
              >
                <Pill size={15} />
                <span>Prescriptions ({medicalRecords.prescriptions?.length || 0})</span>
              </button>
              <button
                className={`rec-tab ${recordsTab === "reports" ? "active" : ""}`}
                onClick={() => setRecordsTab("reports")}
              >
                <FlaskConical size={15} />
                <span>Diagnostic Reports ({medicalRecords.reports?.length || 0})</span>
              </button>
            </div>

            <div className="records-content-view">
              {loadingRecords ? (
                <div className="records-loader">
                  <Loader2 size={28} className="spin-icon" />
                  <p>Loading medical records...</p>
                </div>
              ) : recordsTab === "visits" ? (
                medicalRecords.visits?.length === 0 ? (
                  <div className="records-empty">
                    <ClipboardList size={36} />
                    <h4>No Clinical Visits Recorded</h4>
                    <p>Visits will automatically appear here once documented by your consulting physician.</p>
                  </div>
                ) : (
                  <div className="records-items-list">
                    {medicalRecords.visits.map((v) => (
                      <div key={v._id} className="record-box">
                        <div className="rec-box-head">
                          <span className="rec-id">Visit ID: {v.visitId}</span>
                          <span className="rec-date">{formatDate(v.visitDate)}</span>
                        </div>
                        <p className="rec-doc">
                          Doctor: Dr. {typeof v.doctor === "object" ? v.doctor?.name : "Attending Physician"}
                        </p>
                        <p className="rec-text"><strong>Reason:</strong> {v.reason}</p>
                        {v.clinicalNotes && (
                          <p className="rec-text"><strong>Clinical Notes:</strong> {v.clinicalNotes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : recordsTab === "prescriptions" ? (
                medicalRecords.prescriptions?.length === 0 ? (
                  <div className="records-empty">
                    <Pill size={36} />
                    <h4>No Prescriptions on File</h4>
                    <p>Medications prescribed by hospital doctors will appear here.</p>
                  </div>
                ) : (
                  <div className="records-items-list">
                    {medicalRecords.prescriptions.map((p) => (
                      <div key={p._id} className="record-box">
                        <div className="rec-box-head">
                          <span className="rec-id">Rx #{p.prescriptionId}</span>
                          <span className="rec-date">{formatDate(p.createdAt)}</span>
                        </div>
                        <p className="rec-doc">
                          Prescribing Doctor: Dr. {typeof p.doctor === "object" ? p.doctor?.name : "Physician"}
                        </p>
                        <div className="meds-list">
                          {p.medicines?.map((m, idx) => (
                            <div key={idx} className="med-row">
                              <span className="med-name">{m.medicineName}</span>
                              <span className="med-dosage">{m.dosage} - {m.frequency} for {m.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                medicalRecords.reports?.length === 0 ? (
                  <div className="records-empty">
                    <FlaskConical size={36} />
                    <h4>No Diagnostic Reports</h4>
                    <p>Lab results and imaging reports will appear here when ready.</p>
                  </div>
                ) : (
                  <div className="records-items-list">
                    {medicalRecords.reports.map((r) => (
                      <div key={r._id} className="record-box">
                        <div className="rec-box-head">
                          <span className="rec-id">Report #{r.reportId}</span>
                          <span className="rec-date">{formatDate(r.reportDate)}</span>
                        </div>
                        <h5 className="test-name">{r.testName}</h5>
                        <p className="test-status">Status: <strong>{r.status}</strong></p>
                        {r.remarks && <p className="rec-text">{r.remarks}</p>}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="ui-modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowMedicalRecordsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Doctors Directory Modal */}
      {showDoctorsModal && (
        <div className="ui-modal-backdrop" onMouseDown={() => setShowDoctorsModal(false)}>
          <div className="ui-modal-card large" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ui-modal-head">
              <div className="head-icon-title">
                <div className="modal-icon-badge doctor"><Stethoscope size={20} /></div>
                <div>
                  <h3>Find a Doctor</h3>
                  <p>Browse our specialists, view credentials, and book an appointment</p>
                </div>
              </div>
              <button className="close-modal-x" onClick={() => setShowDoctorsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="directory-filters-bar">
              <div className="search-input-box modal-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search doctor name or specialization..."
                  value={doctorModalSearch}
                  onChange={(e) => setDoctorModalSearch(e.target.value)}
                />
              </div>

              <select
                className="directory-dept-select"
                value={doctorModalDeptFilter}
                onChange={(e) => setDoctorModalDeptFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="doctors-directory-grid">
              {filteredDirectoryDoctors.length === 0 ? (
                <div className="records-empty">
                  <Stethoscope size={36} />
                  <h4>No Doctors Match Your Search</h4>
                  <p>Try clearing filters to view all available hospital physicians.</p>
                </div>
              ) : (
                filteredDirectoryDoctors.map((doc) => {
                  const dept = typeof doc.department === "object" ? doc.department?.name : "General Department";
                  return (
                    <div key={doc._id} className="directory-doctor-card">
                      <div className="doc-avatar-lg">
                        <Stethoscope size={24} />
                      </div>
                      <h4>Dr. {doc.name}</h4>
                      <span className="doc-spec-badge">{doc.specialization}</span>
                      <p className="doc-dept-text">{dept}</p>

                      <div className="doc-card-details">
                        {doc.experience !== undefined && <span>{doc.experience} yrs exp</span>}
                        {doc.consultationFee !== undefined && <span className="fee">${doc.consultationFee} fee</span>}
                      </div>

                      <button
                        className="btn-book-with-doc"
                        onClick={() => {
                          setShowDoctorsModal(false);
                          setBookingDoctorId(doc._id);
                          setShowBookingModal(true);
                        }}
                      >
                        <Calendar size={14} />
                        <span>Book Consultation</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="ui-modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowDoctorsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Explore Departments Modal */}
      {showDepartmentsModal && (
        <div className="ui-modal-backdrop" onMouseDown={() => setShowDepartmentsModal(false)}>
          <div className="ui-modal-card large" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ui-modal-head">
              <div className="head-icon-title">
                <div className="modal-icon-badge dept"><Building2 size={20} /></div>
                <div>
                  <h3>Hospital Departments</h3>
                  <p>Explore our specialized medical centers and treatment units</p>
                </div>
              </div>
              <button className="close-modal-x" onClick={() => setShowDepartmentsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="departments-grid-view">
              {departments.length === 0 ? (
                <div className="records-empty">
                  <Building2 size={36} />
                  <h4>No Departments Listed</h4>
                  <p>Department listings will appear here once added to the hospital system.</p>
                </div>
              ) : (
                departments.map((dept) => (
                  <div key={dept._id} className="dept-showcase-card">
                    <div className="dept-symbol"><Building2 size={24} /></div>
                    <h4>{dept.name}</h4>
                    <p>{dept.description || "Comprehensive clinical diagnostics, patient care, and consultations."}</p>
                    <button
                      className="btn-dept-action"
                      onClick={() => {
                        setShowDepartmentsModal(false);
                        setDoctorModalDeptFilter(dept._id);
                        setShowDoctorsModal(true);
                      }}
                    >
                      <span>View Department Doctors</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="ui-modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowDepartmentsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Cancelling Appointment */}
      {appointmentToCancel && (
        <ConfirmDialog
          title="Cancel Appointment Request"
          message={`Are you sure you want to cancel your appointment (${appointmentToCancel.appointmentId})? The reserved doctor slot will be immediately released.`}
          confirmLabel="Yes, Cancel Appointment"
          danger={true}
          loading={cancellingLoading}
          onConfirm={executeCancelAppointment}
          onCancel={() => setAppointmentToCancel(null)}
        />
      )}

    </div>
  );
}

export default ClientDashboard;
