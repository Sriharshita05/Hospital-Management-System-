
import { useState } from "react";
import { X } from "lucide-react";
import api from "../../services/api";

function AddPatient({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    patientId: "",
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    bloodGroup: "",
    emergencyContact: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      await api.post("/patients/register", formData);

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to register patient."
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
            <h2>Register New Patient</h2>
            <p>Enter the patient's information below.</p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="patient-form-grid">
            <label>
              Patient ID *
              <input
                name="patientId"
                value={formData.patientId}
                onChange={handleChange}
                placeholder="e.g. PAT001"
                required
              />
            </label>

            <label>
              Full Name *
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
              />
            </label>

            <label>
              Phone *
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                required
              />
            </label>

            <label>
              Date of Birth *
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Gender *
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Blood Group
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
              >
                <option value="">Select blood group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Emergency Contact
              <input
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="Emergency phone number"
              />
            </label>

            <label className="patient-full-width">
              Address *
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address"
                required
              />
            </label>
          </div>

          {error && <p className="patient-form-error">{error}</p>}

          <div className="patient-form-footer">
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
              {loading ? "Registering..." : "Register Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPatient;
