import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CalendarClock, RefreshCw } from "lucide-react";

import api from "../../services/api";
import { getUser } from "../../utils/auth";
import { errorMessage, formatTime } from "../../utils/format";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../components/common/Toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DURATIONS = [10, 15, 20, 30, 45, 60];

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

function Schedules() {
  const toast = useToast();
  const isAdmin = getUser().role === "admin";

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | schedule
  const [deleting, setDeleting] = useState(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/schedules");
      setSchedules(response.data.data || []);
    } catch (err) {
      setError(errorMessage(err, "Unable to load schedules."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group schedules by doctor, days in weekday order
  const groups = useMemo(() => {
    const map = new Map();

    schedules
      .filter((s) => s.doctor && (!doctorFilter || s.doctor._id === doctorFilter))
      .forEach((s) => {
        if (!map.has(s.doctor._id)) map.set(s.doctor._id, { doctor: s.doctor, items: [] });
        map.get(s.doctor._id).items.push(s);
      });

    map.forEach((g) => g.items.sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek)));

    return [...map.values()].sort((a, b) => a.doctor.name.localeCompare(b.doctor.name));
  }, [schedules, doctorFilter]);

  const doctorOptions = useMemo(() => {
    const seen = new Map();
    schedules.forEach((s) => s.doctor && seen.set(s.doctor._id, s.doctor));
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  const confirmDelete = async () => {
    try {
      setWorking(true);
      await api.delete(`/schedules/${deleting._id}`);
      toast.success("Schedule deactivated.");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Unable to deactivate schedule."));
      setDeleting(null);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="ui-page">
      <PageHeader
        title="Doctor Schedules"
        subtitle="Weekly working hours that define bookable appointment slots"
        actions={
          isAdmin && (
            <button className="ui-btn ui-btn-primary" onClick={() => setEditing("new")}>
              <Plus size={17} /> Add Schedule
            </button>
          )
        }
      />

      <div className="ui-toolbar">
        <select className="ui-select ui-inline" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
          <option value="">All doctors</option>
          {doctorOptions.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
        <button className="ui-btn ui-btn-secondary" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>

      {error && <div className="ui-error-banner">{error}</div>}

      {loading ? (
        <div className="ui-card"><Loader label="Loading schedules..." /></div>
      ) : groups.length === 0 ? (
        <div className="ui-card">
          <EmptyState
            icon={CalendarClock}
            title="No schedules found"
            text={isAdmin ? "Add a schedule so patients can be booked with a doctor." : "An admin needs to add doctor schedules."}
          />
        </div>
      ) : (
        groups.map(({ doctor, items }) => (
          <div className="ui-card ui-card-flush" key={doctor._id} style={{ marginBottom: 16 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 className="ui-card-title" style={{ marginBottom: 2 }}>{doctor.name}</h3>
              <p className="ui-card-sub" style={{ marginBottom: 0 }}>
                {doctor.doctorId} · {doctor.specialization}
              </p>
            </div>

            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Working hours</th>
                    <th>Slot duration</th>
                    <th>Slots per day</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s._id}>
                      <td>{s.dayOfWeek}</td>
                      <td>{formatTime(s.startTime)} – {formatTime(s.endTime)}</td>
                      <td>{s.slotDuration} min</td>
                      <td>{(toMinutes(s.endTime) - toMinutes(s.startTime)) / s.slotDuration}</td>
                      {isAdmin && (
                        <td>
                          <div className="ui-actions">
                            <button className="ui-icon-btn" title="Edit" onClick={() => setEditing(s)}><Pencil size={16} /></button>
                            <button className="ui-icon-btn danger" title="Deactivate" onClick={() => setDeleting(s)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {editing && (
        <ScheduleModal
          schedule={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            toast.success(message);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Deactivate schedule"
          message={`Deactivate ${deleting.doctor?.name}'s ${deleting.dayOfWeek} schedule? Patients will no longer be able to book that day.`}
          confirmLabel="Deactivate"
          danger
          loading={working}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function ScheduleModal({ schedule, onClose, onSaved }) {
  const isEdit = Boolean(schedule);

  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    doctor: schedule?.doctor?._id || "",
    dayOfWeek: schedule?.dayOfWeek || "Monday",
    startTime: schedule?.startTime || "09:00",
    endTime: schedule?.endTime || "13:00",
    slotDuration: schedule?.slotDuration || 15
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/doctors").then((r) => setDoctors(r.data.data || [])).catch(() => setError("Unable to load doctors."));
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Live preview of the slot count
  const range = form.startTime && form.endTime ? toMinutes(form.endTime) - toMinutes(form.startTime) : 0;
  const duration = Number(form.slotDuration);
  const valid = range > 0 && duration > 0 && range % duration === 0;

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.doctor) return setError("Please select a doctor.");
    if (!form.startTime || !form.endTime) return setError("Start and end time are required.");
    if (range <= 0) return setError("End time must be later than start time.");
    if (range % duration !== 0) return setError("Working hours must be divisible by the slot duration.");

    try {
      setSaving(true);

      if (isEdit) {
        await api.put(`/schedules/${schedule._id}`, {
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime,
          endTime: form.endTime,
          slotDuration: duration
        });
        onSaved("Schedule updated successfully.");
      } else {
        await api.post("/schedules", { ...form, slotDuration: duration });
        onSaved("Schedule created successfully.");
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to save schedule."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit Schedule" : "Add Schedule"}
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ui-btn ui-btn-primary" type="submit" form="schedule-form" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Schedule"}
          </button>
        </>
      }
    >
      <form id="schedule-form" onSubmit={submit} noValidate>
        {error && <div className="ui-form-error">{error}</div>}

        <div className="ui-form-grid">
          <div className="ui-field full">
            <label>Doctor *</label>
            <select className="ui-select" value={form.doctor} onChange={update("doctor")} disabled={isEdit}>
              <option value="">Select doctor</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>{d.name} – {d.specialization}</option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label>Day *</label>
            <select className="ui-select" value={form.dayOfWeek} onChange={update("dayOfWeek")}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="ui-field">
            <label>Slot duration *</label>
            <select className="ui-select" value={form.slotDuration} onChange={update("slotDuration")}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>

          <div className="ui-field">
            <label>Start time *</label>
            <input type="time" className="ui-input" value={form.startTime} onChange={update("startTime")} />
          </div>

          <div className="ui-field">
            <label>End time *</label>
            <input type="time" className="ui-input" value={form.endTime} onChange={update("endTime")} />
          </div>
        </div>

        <p className="ui-hint" style={{ marginTop: 14 }}>
          {valid
            ? `This creates ${range / duration} bookable slot(s) per day.`
            : "Working hours must be a whole number of slots (e.g. 09:00–13:00 with 15-minute slots)."}
        </p>
      </form>
    </Modal>
  );
}

export default Schedules;
