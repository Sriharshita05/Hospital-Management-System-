import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Eye, ClipboardList, RefreshCw, Lock } from "lucide-react";

import api from "../../services/api";
import { getUser } from "../../utils/auth";
import {
  errorMessage,
  formatDate,
  formatTime,
  todayLocal,
  toDateInput
} from "../../utils/format";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/Toast";

const emptyForm = {
  appointment: "",
  patient: "",
  doctor: "",
  visitDate: todayLocal(),
  reason: "",
  symptoms: "",
  clinicalNotes: "",
  followUpDate: ""
};

function Visits() {
  const user = getUser();
  const toast = useToast();
  const canEdit = ["admin", "clinician"].includes(user.role);
  const isLinkedClinician = user.role === "clinician" && Boolean(user.doctor);

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/visits");
      setVisits(response.data.data || []);
    } catch (err) {
      setError(errorMessage(err, "Unable to load visits."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return visits.filter((v) => {
      const matchesSearch =
        !q ||
        [v.visitId, v.patient?.name, v.patient?.patientId, v.doctor?.name, v.reason].some((x) =>
          String(x || "").toLowerCase().includes(q)
        );

      return matchesSearch && (statusFilter === "All" || v.status === statusFilter);
    });
  }, [visits, search, statusFilter]);

  return (
    <div className="ui-page">
      <PageHeader
        title="Visits"
        subtitle="Patient visits and clinical consultation records"
        actions={
          canEdit && (
            <button className="ui-btn ui-btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={17} /> New Visit
            </button>
          )
        }
      />

      {user.role === "frontDesk" && (
        <div className="ui-form-note">
          Clinical notes and symptoms are hidden for front desk accounts.
        </div>
      )}

      <div className="ui-toolbar">
        <div className="ui-search">
          <Search size={17} />
          <input
            placeholder="Search by visit ID, patient, doctor or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="ui-select ui-inline"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All statuses</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <button className="ui-btn ui-btn-secondary" onClick={load} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && <div className="ui-error-banner">{error}</div>}

      <div className="ui-card ui-card-flush">
        {loading ? (
          <Loader label="Loading visits..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No visits found"
            text={visits.length ? "Try changing your search or filter." : "Visits will appear here once created."}
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Visit ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Visit date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v._id}>
                    <td className="ui-mono">{v.visitId}</td>
                    <td>
                      {v.patient?.name || "—"}
                      <span className="ui-sub">{v.patient?.patientId}</span>
                    </td>
                    <td>
                      {v.doctor?.name || "—"}
                      <span className="ui-sub">{v.doctor?.specialization}</span>
                    </td>
                    <td>{formatDate(v.visitDate)}</td>
                    <td className="ui-wrap">{v.reason}</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td>
                      <div className="ui-actions">
                        <button className="ui-icon-btn" title="View / edit" onClick={() => setSelected(v)}>
                          <Eye size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateVisitModal
          isLinkedClinician={isLinkedClinician}
          existingVisits={visits}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            toast.success("Visit created successfully.");
            load();
          }}
        />
      )}

      {selected && (
        <VisitDetailsModal
          visit={selected}
          canEdit={canEdit}
          onClose={() => setSelected(null)}
          onSaved={(message) => {
            setSelected(null);
            toast.success(message);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Create ---------------- */

function CreateVisitModal({ isLinkedClinician, existingVisits, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [p, d, a] = await Promise.all([
          api.get("/patients"),
          api.get("/doctors"),
          api.get("/appointments")
        ]);
        setPatients(p.data.data || []);
        setDoctors(d.data.data || []);
        setAppointments(a.data.data || []);
      } catch (err) {
        setError(errorMessage(err, "Unable to load form options."));
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  // Appointments that can still receive a visit
  const visitedAppointmentIds = useMemo(
    () => new Set(existingVisits.map((v) => v.appointment?._id).filter(Boolean)),
    [existingVisits]
  );

  const availableAppointments = appointments.filter(
    (a) =>
      ["Pending", "Confirmed"].includes(a.status) &&
      !visitedAppointmentIds.has(a._id) &&
      (!isLinkedClinician || a.doctor?._id === getUser().doctor)
  );

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAppointment = (e) => {
    const id = e.target.value;
    const appt = appointments.find((a) => a._id === id);

    setForm((f) => ({
      ...f,
      appointment: id,
      patient: appt ? appt.patient?._id : "",
      doctor: appt ? appt.doctor?._id : f.doctor,
      reason: appt && !f.reason ? appt.reason : f.reason
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.appointment && !form.patient) return setError("Please select a patient.");
    if (!form.appointment && !isLinkedClinician && !form.doctor) return setError("Please select a doctor.");
    if (!form.visitDate) return setError("Visit date is required.");
    if (!form.reason.trim()) return setError("Reason for visit is required.");
    if (form.followUpDate && form.followUpDate < form.visitDate) {
      return setError("Follow-up date cannot be before the visit date.");
    }

    const payload = {
      visitDate: form.visitDate,
      reason: form.reason.trim(),
      symptoms: form.symptoms.trim() || undefined,
      clinicalNotes: form.clinicalNotes.trim() || undefined,
      followUpDate: form.followUpDate || undefined
    };

    if (form.appointment) payload.appointment = form.appointment;
    if (form.patient) payload.patient = form.patient;
    if (form.doctor && !isLinkedClinician) payload.doctor = form.doctor;

    try {
      setSaving(true);
      await api.post("/visits", payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Unable to create visit."));
    } finally {
      setSaving(false);
    }
  };

  const fromAppointment = Boolean(form.appointment);

  return (
    <Modal
      title="New Visit"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ui-btn ui-btn-primary" form="visit-create-form" type="submit" disabled={saving || loading}>
            {saving ? "Saving..." : "Create Visit"}
          </button>
        </>
      }
    >
      {loading ? (
        <Loader />
      ) : (
        <form id="visit-create-form" onSubmit={submit} noValidate>
          {error && <div className="ui-form-error">{error}</div>}

          <div className="ui-form-grid">
            <div className="ui-field full">
              <label>Linked appointment (optional)</label>
              <select className="ui-select" value={form.appointment} onChange={handleAppointment}>
                <option value="">— Walk-in / no appointment —</option>
                {availableAppointments.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.appointmentId} · {a.patient?.name} · {a.doctor?.name} · {formatDate(a.appointmentDate)} {formatTime(a.startTime)}
                  </option>
                ))}
              </select>
              <span className="ui-hint">Choosing an appointment fills in the patient and doctor automatically.</span>
            </div>

            <div className="ui-field">
              <label>Patient *</label>
              <select className="ui-select" value={form.patient} onChange={update("patient")} disabled={fromAppointment}>
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>
                ))}
              </select>
            </div>

            <div className="ui-field">
              <label>Doctor *</label>
              {isLinkedClinician ? (
                <input className="ui-input" value="Your doctor profile" disabled />
              ) : (
                <select className="ui-select" value={form.doctor} onChange={update("doctor")} disabled={fromAppointment}>
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} – {d.specialization}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="ui-field">
              <label>Visit date *</label>
              <input type="date" className="ui-input" value={form.visitDate} onChange={update("visitDate")} />
            </div>

            <div className="ui-field">
              <label>Follow-up date</label>
              <input type="date" className="ui-input" value={form.followUpDate} min={form.visitDate} onChange={update("followUpDate")} />
            </div>

            <div className="ui-field full">
              <label>Reason for visit *</label>
              <input className="ui-input" value={form.reason} onChange={update("reason")} placeholder="e.g. Fever and headache" />
            </div>

            <div className="ui-field full">
              <label>Symptoms</label>
              <textarea className="ui-textarea" value={form.symptoms} onChange={update("symptoms")} />
            </div>

            <div className="ui-field full">
              <label>Clinical notes</label>
              <textarea className="ui-textarea" value={form.clinicalNotes} onChange={update("clinicalNotes")} />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ---------------- View / edit ---------------- */

function VisitDetailsModal({ visit, canEdit, onClose, onSaved }) {
  const locked = visit.status === "Completed";
  const editable = canEdit && !locked;

  const [form, setForm] = useState({
    reason: visit.reason || "",
    symptoms: visit.symptoms || "",
    clinicalNotes: visit.clinicalNotes || "",
    followUpDate: toDateInput(visit.followUpDate)
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmComplete, setConfirmComplete] = useState(false);

  const hidden = visit.clinicalNotes === undefined && visit.symptoms === undefined;
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async (extra = {}) => {
    setError("");

    if (!form.reason.trim()) {
      setConfirmComplete(false);
      return setError("Reason cannot be empty.");
    }

    try {
      setSaving(true);
      await api.put(`/visits/${visit.visitId}`, {
        reason: form.reason.trim(),
        symptoms: form.symptoms,
        clinicalNotes: form.clinicalNotes,
        followUpDate: form.followUpDate,
        ...extra
      });
      onSaved(extra.status === "Completed" ? "Visit marked as completed." : "Visit updated successfully.");
    } catch (err) {
      setConfirmComplete(false);
      setError(errorMessage(err, "Unable to update visit."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Visit ${visit.visitId}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={onClose} disabled={saving}>Close</button>
          {editable && (
            <>
              <button className="ui-btn ui-btn-success" onClick={() => setConfirmComplete(true)} disabled={saving}>
                Complete Visit
              </button>
              <button className="ui-btn ui-btn-primary" onClick={() => save()} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </>
      }
    >
      {error && <div className="ui-form-error">{error}</div>}

      <dl className="ui-details" style={{ marginBottom: 20 }}>
        <div>
          <dt>Patient</dt>
          <dd>{visit.patient?.name} <span className="ui-sub">{visit.patient?.patientId} · {visit.patient?.phone}</span></dd>
        </div>
        <div>
          <dt>Doctor</dt>
          <dd>{visit.doctor?.name} <span className="ui-sub">{visit.doctor?.specialization}</span></dd>
        </div>
        <div>
          <dt>Visit date</dt>
          <dd>{formatDate(visit.visitDate)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge status={visit.status} /></dd>
        </div>
        {visit.appointment && (
          <div>
            <dt>Appointment</dt>
            <dd>{visit.appointment.appointmentId} <span className="ui-sub">{formatDate(visit.appointment.appointmentDate)} · {visit.appointment.status}</span></dd>
          </div>
        )}
      </dl>

      {locked && <div className="ui-form-note">Completed visits are closed and cannot be edited.</div>}

      {editable ? (
        <div className="ui-form-grid">
          <div className="ui-field full">
            <label>Reason *</label>
            <input className="ui-input" value={form.reason} onChange={update("reason")} />
          </div>
          <div className="ui-field full">
            <label>Symptoms</label>
            <textarea className="ui-textarea" value={form.symptoms} onChange={update("symptoms")} />
          </div>
          <div className="ui-field full">
            <label>Clinical notes</label>
            <textarea className="ui-textarea" value={form.clinicalNotes} onChange={update("clinicalNotes")} />
          </div>
          <div className="ui-field">
            <label>Follow-up date</label>
            <input type="date" className="ui-input" value={form.followUpDate} onChange={update("followUpDate")} />
          </div>
        </div>
      ) : (
        <dl className="ui-details">
          <div className="full"><dt>Reason</dt><dd>{visit.reason}</dd></div>
          <div className="full">
            <dt>Symptoms</dt>
            <dd>
              {hidden ? <span className="ui-restricted"><Lock size={13} /> Restricted</span> : visit.symptoms || "—"}
            </dd>
          </div>
          <div className="full">
            <dt>Clinical notes</dt>
            <dd>
              {hidden ? <span className="ui-restricted"><Lock size={13} /> Restricted</span> : visit.clinicalNotes || "—"}
            </dd>
          </div>
          <div><dt>Follow-up date</dt><dd>{formatDate(visit.followUpDate)}</dd></div>
        </dl>
      )}

      {confirmComplete && (
        <ConfirmDialog
          title="Complete visit"
          message="Mark this visit as completed? Completed visits are closed and cannot be edited. A confirmed linked appointment will also be completed."
          confirmLabel="Complete visit"
          loading={saving}
          onConfirm={() => save({ status: "Completed" })}
          onCancel={() => setConfirmComplete(false)}
        />
      )}
    </Modal>
  );
}

export default Visits;
