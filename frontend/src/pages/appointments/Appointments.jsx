
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  CalendarDays,
  RefreshCw,
  Eye,
  Check,
  CheckCheck,
  XCircle
} from "lucide-react";

import api from "../../services/api";
import AddAppointment from "./AddAppointment";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { errorMessage, formatDate, formatTime } from "../../utils/format";
import "./Appointments.css";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [pendingChange, setPendingChange] = useState(null);
  const [updating, setUpdating] = useState(false);
  const toast = useToast();

  const user = JSON.parse(
    localStorage.getItem("hospital_user") || "{}"
  );

  const canManage = ["admin", "frontDesk"].includes(user.role);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/appointments");

      const records =
        response.data.data?.appointments ??
        response.data.data ??
        response.data.appointments ??
        [];

      setAppointments(
        Array.isArray(records) ? records : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load appointments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Confirm / Complete / Cancel an appointment
  const changeStatus = async () => {
    const { appointment, status } = pendingChange;

    try {
      setUpdating(true);
      await api.patch(`/appointments/${appointment.appointmentId}/status`, { status });
      toast.success(`Appointment ${appointment.appointmentId} marked as ${status}.`);
      setPendingChange(null);
      fetchAppointments();
    } catch (err) {
      toast.error(errorMessage(err, "Unable to update appointment status."));
      setPendingChange(null);
    } finally {
      setUpdating(false);
    }
  };

  const statusMessages = {
    Confirmed: "Confirm this appointment?",
    Completed: "Mark this appointment as completed? This cannot be undone.",
    Cancelled: "Cancel this appointment? The time slot will be released and this cannot be undone."
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const patientName =
      typeof appointment.patient === "object"
        ? appointment.patient?.name || ""
        : "";

    const doctorName =
      typeof appointment.doctor === "object"
        ? appointment.doctor?.name || ""
        : "";

    const matchesSearch = [
      appointment.appointmentId,
      patientName,
      doctorName,
      appointment.reason
    ].some((value) =>
      String(value || "").toLowerCase().includes(search.toLowerCase())
    );

    const matchesStatus =
      statusFilter === "All" ||
      appointment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case "Confirmed":
        return "confirmed";
      case "Completed":
        return "completed";
      case "Cancelled":
        return "cancelled";
      default:
        return "pending";
    }
  };

  return (
    <div className="appointments-page">
      <div className="appointments-header">
        <div>
          <h1>Appointments</h1>
          <p>Manage patient appointments and bookings</p>
        </div>

        {canManage && (
          <button
            className="appointment-primary-button"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={18} />
            Book Appointment
          </button>
        )}
      </div>

      <div className="appointment-stats">
        <div className="appointment-stat-card">
          <div className="appointment-stat-icon">
            <CalendarDays size={22} />
          </div>

          <div>
            <p>Total Appointments</p>
            <h2>{appointments.length}</h2>
          </div>
        </div>

        <div className="appointment-stat-card">
          <div className="appointment-stat-icon pending-icon">
            <CalendarDays size={22} />
          </div>

          <div>
            <p>Pending</p>
            <h2>
              {appointments.filter(a => a.status === "Pending").length}
            </h2>
          </div>
        </div>

        <div className="appointment-stat-card">
          <div className="appointment-stat-icon confirmed-icon">
            <CalendarDays size={22} />
          </div>

          <div>
            <p>Confirmed</p>
            <h2>
              {appointments.filter(a => a.status === "Confirmed").length}
            </h2>
          </div>
        </div>
      </div>

      <div className="appointments-toolbar">
        <div className="appointment-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search appointment, patient or doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="appointment-status-filter"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <button
          className="appointment-refresh-button"
          onClick={fetchAppointments}
          title="Refresh appointments"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {error && (
        <div className="appointment-error">
          {error}
        </div>
      )}

      <div className="appointments-table-container">
        {loading ? (
          <p className="appointment-message">
            Loading appointments...
          </p>
        ) : filteredAppointments.length === 0 ? (
          <p className="appointment-message">
            No appointments found.
          </p>
        ) : (
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Appointment ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr key={appointment._id}>
                  <td>{appointment.appointmentId}</td>

                  <td>
                    {typeof appointment.patient === "object"
                      ? appointment.patient?.name || "—"
                      : "—"}
                  </td>

                  <td>
                    {typeof appointment.doctor === "object"
                      ? appointment.doctor?.name || "—"
                      : "—"}
                  </td>

                  <td>
                    {formatDate(appointment.appointmentDate)}
                  </td>

                  <td>
                    {appointment.startTime} - {appointment.endTime}
                  </td>

                  <td>{appointment.reason || "—"}</td>

                  <td>
                    <span
                      className={`appointment-status ${getStatusClass(
                        appointment.status
                      )}`}
                    >
                      {appointment.status}
                    </span>
                  </td>

                  <td>
                    <div className="ui-actions">
                      <button
                        className="ui-icon-btn"
                        title="View details"
                        onClick={() => setSelected(appointment)}
                      >
                        <Eye size={17} />
                      </button>

                      {canManage && appointment.status === "Pending" && (
                        <button
                          className="ui-icon-btn"
                          title="Confirm"
                          onClick={() =>
                            setPendingChange({ appointment, status: "Confirmed" })
                          }
                        >
                          <Check size={17} />
                        </button>
                      )}

                      {canManage && appointment.status === "Confirmed" && (
                        <button
                          className="ui-icon-btn"
                          title="Mark completed"
                          onClick={() =>
                            setPendingChange({ appointment, status: "Completed" })
                          }
                        >
                          <CheckCheck size={17} />
                        </button>
                      )}

                      {canManage &&
                        ["Pending", "Confirmed"].includes(appointment.status) && (
                          <button
                            className="ui-icon-btn danger"
                            title="Cancel appointment"
                            onClick={() =>
                              setPendingChange({ appointment, status: "Cancelled" })
                            }
                          >
                            <XCircle size={17} />
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <Modal
          title={`Appointment ${selected.appointmentId}`}
          onClose={() => setSelected(null)}
          footer={
            <button className="ui-btn ui-btn-secondary" onClick={() => setSelected(null)}>
              Close
            </button>
          }
        >
          <dl className="ui-details">
            <div>
              <dt>Patient</dt>
              <dd>
                {selected.patient?.name || "—"}
                <span className="ui-sub">
                  {selected.patient?.patientId} · {selected.patient?.phone}
                </span>
              </dd>
            </div>
            <div>
              <dt>Doctor</dt>
              <dd>
                {selected.doctor?.name || "—"}
                <span className="ui-sub">{selected.doctor?.specialization}</span>
              </dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>
                {formatDate(selected.appointmentDate)}
                {selected.schedule?.dayOfWeek && ` (${selected.schedule.dayOfWeek})`}
              </dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {formatTime(selected.startTime)} – {formatTime(selected.endTime)}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`appointment-status ${getStatusClass(selected.status)}`}>
                  {selected.status}
                </span>
              </dd>
            </div>
            <div>
              <dt>Slot reserved</dt>
              <dd>{selected.isSlotReserved ? "Yes" : "No (released)"}</dd>
            </div>
            <div className="full">
              <dt>Reason</dt>
              <dd>{selected.reason || "—"}</dd>
            </div>
          </dl>
        </Modal>
      )}

      {pendingChange && (
        <ConfirmDialog
          title={`${pendingChange.status === "Cancelled" ? "Cancel" : pendingChange.status === "Completed" ? "Complete" : "Confirm"} appointment`}
          message={`${pendingChange.appointment.appointmentId}: ${statusMessages[pendingChange.status]}`}
          confirmLabel={pendingChange.status === "Cancelled" ? "Yes, cancel it" : "Yes, continue"}
          danger={pendingChange.status === "Cancelled"}
          loading={updating}
          onConfirm={changeStatus}
          onCancel={() => setPendingChange(null)}
        />
      )}

      {showAddForm && (
        <AddAppointment
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchAppointments}
        />
      )}
    </div>
  );
}

export default Appointments;
