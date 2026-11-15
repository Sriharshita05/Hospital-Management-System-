
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
  RefreshCw,
  Pencil,
  Trash2
} from "lucide-react";

import api from "../../services/api";
import AddPatient from "./AddPatient";
import EditPatient from "./EditPatient";
import "./Patients.css";

function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const user = JSON.parse(
    localStorage.getItem("hospital_user") || "{}"
  );

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/patients");

      const records = response.data.data;

      setPatients(Array.isArray(records) ? records : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load patients."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDeactivate = async (patient) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${patient.name}?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/patients/${patient.patientId}`);
      await fetchPatients();
      alert("Patient deactivated successfully.");
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Unable to deactivate patient."
      );
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const query = search.toLowerCase();

    return (
      patient.name?.toLowerCase().includes(query) ||
      patient.patientId?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.phone?.includes(query)
    );
  });

  const activeCount = patients.filter(
    (patient) => patient.isActive !== false
  ).length;

  return (
    <div className="patients-page">
      <div className="patients-heading">
        <div>
          <h1>Patients</h1>
          <p>Manage and view registered patient records.</p>
        </div>

        {(user.role === "admin" || user.role === "frontDesk") && (
          <button
            className="add-patient-button"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={18} />
            Add Patient
          </button>
        )}
      </div>

      <div className="patients-summary">
        <div className="patients-summary-icon">
          <Users size={24} />
        </div>
        <div>
          <p>Active Patients</p>
          <h2>{activeCount}</h2>
        </div>
      </div>

      <div className="patients-panel">
        <div className="patients-toolbar">
          <div>
            <h2>Patient Records</h2>
            <p>View and manage hospital patients.</p>
          </div>

          <div className="patients-actions">
            <div className="patients-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              className="refresh-button"
              onClick={fetchPatients}
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="patients-message">
            Loading patients...
          </div>
        ) : error ? (
          <div className="patients-message patients-error">
            {error}
            <button onClick={fetchPatients}>Try again</button>
          </div>
        ) : (
          <div className="patients-table-wrapper">
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th>Status</th>
                  {(user.role === "admin" ||
                    user.role === "frontDesk") && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <tr key={patient._id}>
                      <td>{patient.patientId || "-"}</td>
                      <td>{patient.name || "-"}</td>
                      <td>{patient.email || "-"}</td>
                      <td>{patient.phone || "-"}</td>
                      <td>{patient.gender || "-"}</td>
                      <td>
                        <span className="patient-status">
                          {patient.isActive === false
                            ? "Inactive"
                            : "Active"}
                        </span>
                      </td>

                      {(user.role === "admin" ||
                        user.role === "frontDesk") && (
                        <td>
                          <div className="patient-action-buttons">
                            <button
                              className="edit-patient-button"
                              title="Edit patient"
                              onClick={() =>
                                setSelectedPatient(patient)
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            {user.role === "admin" && (
                              <button
                                className="delete-patient-button"
                                title="Deactivate patient"
                                onClick={() =>
                                  handleDeactivate(patient)
                                }
                                disabled={patient.isActive === false}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={
                        user.role === "admin" ||
                        user.role === "frontDesk" ? 7 : 6
                      }
                      className="empty-patients"
                    >
                      No patients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <AddPatient
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchPatients}
        />
      )}

      {selectedPatient && (
        <EditPatient
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onSuccess={fetchPatients}
        />
      )}
    </div>
  );
}

export default Patients;
