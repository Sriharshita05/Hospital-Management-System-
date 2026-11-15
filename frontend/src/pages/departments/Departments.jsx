
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Building2,
  RefreshCw
} from "lucide-react";

import api from "../../services/api";
import AddDepartment from "./AddDepartment";
import EditDepartment from "./EditDepartment";
import "./Departments.css";

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const user = JSON.parse(
    localStorage.getItem("hospital_user") || "{}"
  );

  const isAdmin = user.role === "admin";

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/departments");

      const records =
        response.data.data?.departments ??
        response.data.data ??
        response.data.departments ??
        [];

      setDepartments(
        Array.isArray(records) ? records : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load departments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = departments.filter((department) => {
    const value = search.toLowerCase();

    return (
      department.departmentId?.toLowerCase().includes(value) ||
      department.name?.toLowerCase().includes(value) ||
      department.location?.toLowerCase().includes(value)
    );
  });

  const activeCount = departments.filter(
    (department) => department.isActive !== false
  ).length;

  const deactivateDepartment = async (department) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${department.name}?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/departments/${department.departmentId}`
      );

      alert("Department deactivated successfully.");
      fetchDepartments();
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Unable to deactivate department."
      );
    }
  };

  return (
    <div className="departments-page">
      <div className="departments-header">
        <div>
          <h1>Departments</h1>
          <p>Manage hospital departments</p>
        </div>

        {isAdmin && (
          <button
            className="department-primary-button"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={18} />
            Add Department
          </button>
        )}
      </div>

      <div className="department-stats">
        <div className="department-stat-card">
          <div className="department-stat-icon">
            <Building2 size={22} />
          </div>

          <div>
            <p>Total Active Departments</p>
            <h2>{activeCount}</h2>
          </div>
        </div>
      </div>

      <div className="departments-toolbar">
        <div className="department-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search by ID, name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className="department-refresh-button"
          onClick={fetchDepartments}
          title="Refresh departments"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {error && (
        <div className="department-error">
          {error}
        </div>
      )}

      <div className="departments-table-container">
        {loading ? (
          <p className="department-message">
            Loading departments...
          </p>
        ) : filteredDepartments.length === 0 ? (
          <p className="department-message">
            No departments found.
          </p>
        ) : (
          <table className="departments-table">
            <thead>
              <tr>
                <th>Department ID</th>
                <th>Department Name</th>
                <th>Description</th>
                <th>Location</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {filteredDepartments.map((department) => (
                <tr key={department._id}>
                  <td>{department.departmentId}</td>
                  <td>{department.name}</td>
                  <td>{department.description || "—"}</td>
                  <td>{department.location || "—"}</td>

                  <td>
                    <span
                      className={
                        department.isActive === false
                          ? "department-status inactive"
                          : "department-status active"
                      }
                    >
                      {department.isActive === false
                        ? "Inactive"
                        : "Active"}
                    </span>
                  </td>

                  {isAdmin && (
                    <td>
                      <div className="department-actions">
                        <button
                          className="department-edit-button"
                          title="Edit department"
                          onClick={() =>
                            setSelectedDepartment(department)
                          }
                          disabled={department.isActive === false}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          className="department-delete-button"
                          title="Deactivate department"
                          onClick={() =>
                            deactivateDepartment(department)
                          }
                          disabled={department.isActive === false}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddForm && (
        <AddDepartment
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchDepartments}
        />
      )}

      {selectedDepartment && (
        <EditDepartment
          department={selectedDepartment}
          onClose={() => setSelectedDepartment(null)}
          onSuccess={fetchDepartments}
        />
      )}
    </div>
  );
}

export default Departments;
