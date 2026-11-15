
import { useEffect, useState } from "react";
import api from "../../services/api";

const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

function AddAppointment({ onClose, onSuccess }) {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [schedule, setSchedule] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [formData, setFormData] = useState({
    appointmentId: "",
    patient: "",
    doctor: "",
    appointmentDate: "",
    startTime: "",
    reason: ""
  });

  const [fetching, setFetching] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getToday = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setFetching(true);

        const [patientResponse, doctorResponse] =
          await Promise.all([
            api.get("/patients"),
            api.get("/doctors")
          ]);

        const patientRecords =
          patientResponse.data.data?.patients ??
          patientResponse.data.data ??
          patientResponse.data.patients ??
          [];

        const doctorRecords =
          doctorResponse.data.data?.doctors ??
          doctorResponse.data.data ??
          doctorResponse.data.doctors ??
          [];

        setPatients(
          Array.isArray(patientRecords)
            ? patientRecords.filter(p => p.isActive !== false)
            : []
        );

        setDoctors(
          Array.isArray(doctorRecords)
            ? doctorRecords.filter(d => d.isActive !== false)
            : []
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load patients and doctors."
        );
      } finally {
        setFetching(false);
      }
    };

    fetchOptions();
  }, []);

  // Load schedule and occupied slots when doctor/date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      setSchedule(null);
      setAvailableSlots([]);

      if (!formData.doctor || !formData.appointmentDate) {
        return;
      }

      try {
        setLoadingSlots(true);
        setError("");

        const selectedDoctor = doctors.find(
          doctor => doctor._id === formData.doctor
        );

        if (!selectedDoctor?.doctorId) {
          setError("Doctor ID is missing.");
          return;
        }

        const [scheduleResponse, appointmentResponse] =
          await Promise.all([
            api.get(`/schedules/doctor/${selectedDoctor.doctorId}`),
            api.get("/appointments")
          ]);

        const schedules = scheduleResponse.data.data || [];

        const selectedDate = new Date(
          `${formData.appointmentDate}T00:00:00`
        );

        const selectedDay = weekdays[selectedDate.getDay()];

        const matchingSchedule = schedules.find(
          item =>
            item.dayOfWeek === selectedDay &&
            item.isActive !== false
        );

        if (!matchingSchedule) {
          setError(
            `Doctor has no active schedule on ${selectedDay}.`
          );
          return;
        }

        setSchedule(matchingSchedule);

        const appointments =
          appointmentResponse.data.data?.appointments ??
          appointmentResponse.data.data ??
          appointmentResponse.data.appointments ??
          [];

        const occupiedTimes = new Set();

        appointments.forEach(appointment => {
          const sameDoctor =
            appointment.doctor?._id === formData.doctor ||
            appointment.doctor === formData.doctor;

          const appointmentDate = appointment.appointmentDate
            ? new Date(appointment.appointmentDate)
                .toISOString()
                .slice(0, 10)
            : "";

          if (
            sameDoctor &&
            appointmentDate === formData.appointmentDate &&
            appointment.isSlotReserved !== false
          ) {
            (appointment.occupiedSlots || []).forEach(slot => {
              occupiedTimes.add(slot);
            });
          }
        });

        const toMinutes = time => {
          const [hours, minutes] = time.split(":").map(Number);
          return hours * 60 + minutes;
        };

        const toTime = minutes => {
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;

          return (
            String(hours).padStart(2, "0") +
            ":" +
            String(remainingMinutes).padStart(2, "0")
          );
        };

        const start = toMinutes(matchingSchedule.startTime);
        const end = toMinutes(matchingSchedule.endTime);
        const duration = matchingSchedule.slotDuration;

        const today = getToday();
        const now = new Date();

        const currentMinutes =
          now.getHours() * 60 + now.getMinutes();

        const slots = [];

        for (
          let time = start;
          time + duration <= end;
          time += duration
        ) {
          const slot = toTime(time);

          const isPast =
            formData.appointmentDate < today ||
            (
              formData.appointmentDate === today &&
              time <= currentMinutes
            );

          const slotOccupied = Array.from(occupiedTimes).some(
            occupied => {
              const occupiedMinutes = toMinutes(occupied);

              return (
                occupiedMinutes >= time &&
                occupiedMinutes < time + duration
              );
            }
          );

          if (!isPast && !slotOccupied) {
            slots.push(slot);
          }
        }

        setAvailableSlots(slots);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load available time slots."
        );
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [formData.doctor, formData.appointmentDate, doctors]);

  const handleChange = e => {
    const { name, value } = e.target;

    setFormData(previous => ({
      ...previous,
      [name]: value
    }));

    if (name === "doctor" || name === "appointmentDate") {
      setFormData(previous => ({
        ...previous,
        [name]: value,
        startTime: ""
      }));
    }
  };

  const formatTime = time => {
    const [hours, minutes] = time.split(":").map(Number);

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await api.post("/appointments", formData);

      alert("Appointment booked successfully!");

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to book appointment."
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="patient-modal-overlay">
        <div className="patient-modal">
          <p>Loading patients and doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-modal-overlay">
      <div className="patient-modal">
        <div className="patient-modal-header">
          <h2>Book Appointment</h2>

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
              <label>Appointment ID *</label>
              <input
                type="text"
                name="appointmentId"
                placeholder="Example: APT001"
                value={formData.appointmentId}
                onChange={handleChange}
                required
              />
            </div>

            <div className="patient-form-group">
              <label>Select Patient *</label>
              <select
                name="patient"
                value={formData.patient}
                onChange={handleChange}
                required
              >
                <option value="">Select a patient</option>

                {patients.map(patient => (
                  <option key={patient._id} value={patient._id}>
                    {patient.name} ({patient.patientId})
                  </option>
                ))}
              </select>
            </div>

            <div className="patient-form-group">
              <label>Select Doctor *</label>
              <select
                name="doctor"
                value={formData.doctor}
                onChange={handleChange}
                required
              >
                <option value="">Select a doctor</option>

                {doctors.map(doctor => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.name} - {doctor.specialization}
                  </option>
                ))}
              </select>
            </div>

            <div className="patient-form-group">
              <label>Appointment Date *</label>
              <input
                type="date"
                name="appointmentDate"
                min={getToday()}
                value={formData.appointmentDate}
                onChange={handleChange}
                required
              />
            </div>

            {schedule && (
              <div className="patient-form-group">
                <label>Doctor's Working Hours</label>
                <input
                  type="text"
                  value={`${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`}
                  readOnly
                />
                <small>
                  Slot duration: {schedule.slotDuration} minutes
                </small>
              </div>
            )}

            <div className="patient-form-group">
              <label>Available Time Slots *</label>

              <select
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                disabled={
                  loadingSlots ||
                  !schedule ||
                  availableSlots.length === 0
                }
                required
              >
                <option value="">
                  {loadingSlots
                    ? "Loading slots..."
                    : !schedule
                      ? "Select doctor and date first"
                      : availableSlots.length === 0
                        ? "No available slots"
                        : "Select a time slot"}
                </option>

                {availableSlots.map(slot => (
                  <option key={slot} value={slot}>
                    {formatTime(slot)}
                  </option>
                ))}
              </select>

              {schedule && !loadingSlots && (
                <small>
                  {availableSlots.length} available slot(s)
                </small>
              )}
            </div>

            <div className="patient-form-group">
              <label>Reason for Appointment *</label>
              <textarea
                name="reason"
                placeholder="Enter reason for consultation"
                value={formData.reason}
                onChange={handleChange}
                rows={3}
                required
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
              disabled={
                loading ||
                loadingSlots ||
                !formData.startTime ||
                patients.length === 0 ||
                doctors.length === 0
              }
            >
              {loading ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAppointment;
