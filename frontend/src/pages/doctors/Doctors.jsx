
import { useEffect, useState } from "react";
import {
  Search,
  Stethoscope,
  RefreshCw,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";

import api from "../../services/api";
import AddDoctor from "./AddDoctor";
import EditDoctor from "./EditDoctor";
import "./Doctors.css";

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const user = JSON.parse(
    localStorage.getItem("hospital_user") || "{}"
  );

  const isAdmin = user.role === "admin";

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/doctors");

      const records =
        response.data.data?.doctors ??
        response.data.data ??
        response.data.doctors ??
        [];

      setDoctors(Array.isArray(records) ? records : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load doctors."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleDeactivate = async (doctor) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate Dr. ${doctor.name}?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/doctors/${doctor.doctorId}`);
      await fetchDoctors();

      alert("Doctor deactivated successfully.");
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Unable to deactivate doctor."
      );
    }
  };

  const filteredDoctors = doctors.filter((doctor) => {
    const value = search.toLowerCase();

    return (
      doctor.name?.toLowerCase().includes(value) ||
      doctor.doctorId?.toLowerCase().includes(value) ||
      doctor.email?.toLowerCase().includes(value) ||
      doctor.specialization?.toLowerCase().includes(value) ||
      doctor.department?.name?.toLowerCase().includes(value)
    );
  });

  const activeCount = doctors.filter(
    (doctor) => doctor.isActive !== false
  ).length;

  return (
    <div className="doctors-page">

      <div className="doctors-header">
        <div>
          <h1>Doctors</h1>
          <p>Manage hospital doctors and their information.</p>
        </div>

        <div className="doctors-header-actions">
          <button
            className="doctor-refresh-button"
            onClick={fetchDoctors}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          {isAdmin && (
            <button
              className="doctor-add-button"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={18} />
              Add Doctor
            </button>
          )}
        </div>
      </div>

      <div className="doctor-stats-card">
        <div className="doctor-stat-icon">
          <Stethoscope size={23} />
        </div>

        <div>
          <p>Total Active Doctors</p>
          <h2>{activeCount}</h2>
        </div>
      </div>

      <div className="doctors-table-card">

        <div className="doctors-toolbar">
          <h2>Doctor Directory</h2>

          <div className="doctor-search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search doctors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="doctor-message">Loading doctors...</p>
        ) : error ? (
          <div className="doctor-message doctor-error">
            {error}
            <button onClick={fetchDoctors}>Try Again</button>
          </div>
        ) : (
          <div className="doctors-table-wrapper">
            <table className="doctors-table">
              <thead>
                <tr>
                  <th>Doctor ID</th>
                  <th>Name</th>
                  <th>Specialization</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Experience</th>
                  <th>Fee</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 9 : 8}
                      className="doctor-empty"
                    >
                      No doctors found.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doctor) => (
                    <tr key={doctor._id || doctor.doctorId}>
                      <td>{doctor.doctorId || "—"}</td>
                      <td>{doctor.name}</td>
                      <td>{doctor.specialization}</td>

                      <td>
                        {typeof doctor.department === "object"
                          ? doctor.department?.name || "—"
                          : "—"}
                      </td>

                      <td>{doctor.phone}</td>
                      <td>{doctor.experience} years</td>
                      <td>₹{doctor.consultationFee}</td>

                      <td>
                        <span
                          className={
                            doctor.isActive === false
                              ? "doctor-status inactive"
                              : "doctor-status"
                          }
                        >
                          {doctor.isActive === false
                            ? "Inactive"
                            : "Active"}
                        </span>
                      </td>

                      {isAdmin && (
                        <td>
                          <div className="doctor-action-buttons">
                            <button
                              className="doctor-edit-button"
                              title="Edit doctor"
                              onClick={() =>
                                setSelectedDoctor(doctor)
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              className="doctor-delete-button"
                              title="Deactivate doctor"
                              disabled={doctor.isActive === false}
                              onClick={() =>
                                handleDeactivate(doctor)
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <AddDoctor
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchDoctors}
        />
      )}

      {selectedDoctor && (
        <EditDoctor
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onSuccess={fetchDoctors}
        />
      )}

    </div>
  );
}

export default Doctors;
