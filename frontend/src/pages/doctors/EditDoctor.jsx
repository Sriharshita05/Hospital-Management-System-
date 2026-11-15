
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../../services/api";

function EditDoctor({ doctor, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: doctor.name || "",
    email: doctor.email || "",
    phone: doctor.phone || "",
    specialization: doctor.specialization || "",
    department:
      typeof doctor.department === "object"
        ? doctor.department?._id || ""
        : doctor.department || "",
    qualification: doctor.qualification || "",
    experience: doctor.experience ?? "",
    consultationFee: doctor.consultationFee ?? ""
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

useEffect(() => {
  api.get("/departments")
    .then((response) => {
      const records =
        response.data.data?.departments ??
        response.data.data ??
        response.data.departments ??
        [];

      setDepartments(Array.isArray(records) ? records : []);
    })
    .catch(() => {
      setError("Unable to load departments.");
    });
}, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const payload = {
        ...formData,
        experience: Number(formData.experience),
        consultationFee: Number(formData.consultationFee)
      };

      await api.put(
        `/doctors/${doctor.doctorId}`,
        payload
      );

      await onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update doctor."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-modal-overlay">
      <div className="patient-modal">
        <div className="patient-modal-header">
          <div>
            <h2>Edit Doctor</h2>
            <p>Update doctor information.</p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="patient-form-grid">
            <div className="patient-form-group">
              <label>Doctor ID</label>
              <input value={doctor.doctorId} disabled />
            </div>

            {[
              ["name", "Full Name", "text"],
              ["email", "Email", "email"],
              ["phone", "Phone", "text"],
              ["specialization", "Specialization", "text"],
              ["qualification", "Qualification", "text"],
              ["experience", "Experience (Years)", "number"],
              ["consultationFee", "Consultation Fee (₹)", "number"]
            ].map(([name, label, type]) => (
              <div className="patient-form-group" key={name}>
                <label>{label}</label>
                <input
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  min={type === "number" ? "0" : undefined}
                  required
                />
              </div>
            ))}

            <div className="patient-form-group">
              <label>Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>

                {departments.map((department) => (
                  <option
                    key={department._id}
                    value={department._id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
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
            >
              Cancel
            </button>

            <button
              type="submit"
              className="patient-submit-button"
              disabled={loading}
            >
              {loading ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditDoctor;
