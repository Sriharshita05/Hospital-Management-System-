
import { useState } from "react";
import api from "../../services/api";

function AddDepartment({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    departmentId: "",
    name: "",
    description: "",
    location: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await api.post("/departments", formData);

      alert("Department added successfully!");

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to add department."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-modal-overlay">
      <div className="patient-modal">
        <div className="patient-modal-header">
          <h2>Add Department</h2>

          <button
            type="button"
            onClick={onClose}
            className="patient-cancel-button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="patient-form-grid">

            <div className="patient-form-group">
              <label>Department ID *</label>
              <input
                type="text"
                name="departmentId"
                placeholder="Example: DEPT001"
                value={formData.departmentId}
                onChange={handleChange}
                required
              />
            </div>

            <div className="patient-form-group">
              <label>Department Name *</label>
              <input
                type="text"
                name="name"
                placeholder="Example: Cardiology"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="patient-form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                placeholder="Example: First Floor"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="patient-form-group">
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Enter department description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

          </div>

          {error && (
            <p className="patient-form-error">{error}</p>
          )}

          <div className="patient-form-actions">
            <button
              type="button"
              className="patient-cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="patient-submit-button"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDepartment;