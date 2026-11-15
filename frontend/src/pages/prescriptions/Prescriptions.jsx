import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Eye, FileText, RefreshCw, Trash2, Printer } from "lucide-react";

import api from "../../services/api";
import { getUser } from "../../utils/auth";
import { errorMessage, formatDate } from "../../utils/format";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import { useToast } from "../../components/common/Toast";

const emptyMedicine = {
  medicineName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: ""
};

function Prescriptions() {
  const toast = useToast();
  const user = getUser();
  const canCreate = ["admin", "clinician"].includes(user.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/prescriptions");
      setItems(response.data.data || []);
    } catch (err) {
      setError(errorMessage(err, "Unable to load prescriptions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((p) =>
      [
        p.prescriptionId,
        p.patient?.name,
        p.patient?.patientId,
        p.doctor?.name,
        p.visit?.visitId,
        ...(p.medicines || []).map((m) => m.medicineName)
      ].some((x) => String(x || "").toLowerCase().includes(q))
    );
  }, [items, search]);

  return (
    <div className="ui-page">
      <PageHeader
        title="Prescriptions"
        subtitle="Medicines prescribed during patient visits"
        actions={
          canCreate && (
            <button className="ui-btn ui-btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={17} /> New Prescription
            </button>
          )
        }
      />

      <div className="ui-toolbar">
        <div className="ui-search">
          <Search size={17} />
          <input
            placeholder="Search by ID, patient, doctor, visit or medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="ui-btn ui-btn-secondary" onClick={load} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && <div className="ui-error-banner">{error}</div>}

      <div className="ui-card ui-card-flush">
        {loading ? (
          <Loader label="Loading prescriptions..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No prescriptions found"
            text={items.length ? "Try a different search." : "Prescriptions will appear here once created."}
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Prescription ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Visit</th>
                  <th>Medicines</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id}>
                    <td className="ui-mono">{p.prescriptionId}</td>
                    <td>
                      {p.patient?.name || "—"}
                      <span className="ui-sub">{p.patient?.patientId}</span>
                    </td>
                    <td>{p.doctor?.name || "—"}</td>
                    <td className="ui-mono">{p.visit?.visitId || "—"}</td>
                    <td>{p.medicines?.length || 0} item(s)</td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <div className="ui-actions">
                        <button className="ui-icon-btn" title="View" onClick={() => setSelected(p)}>
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
        <CreatePrescriptionModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            toast.success("Prescription created successfully.");
            load();
          }}
        />
      )}

      {selected && <PrescriptionDetails prescription={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CreatePrescriptionModal({ onClose, onSaved }) {
  const [visits, setVisits] = useState([]);
  const [visit, setVisit] = useState("");
  const [medicines, setMedicines] = useState([{ ...emptyMedicine }]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/visits")
      .then((r) => setVisits(r.data.data || []))
      .catch((err) => setError(errorMessage(err, "Unable to load visits.")))
      .finally(() => setLoading(false));
  }, []);

  const updateMedicine = (index, field, value) =>
    setMedicines((list) => list.map((m, i) => (i === index ? { ...m, [field]: value } : m)));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!visit) return setError("Please select a visit.");

    for (const [i, m] of medicines.entries()) {
      if (!m.medicineName.trim() || !m.dosage.trim() || !m.frequency.trim() || !m.duration.trim()) {
        return setError(`Medicine ${i + 1}: name, dosage, frequency and duration are required.`);
      }
    }

    try {
      setSaving(true);
      await api.post("/prescriptions", {
        visit,
        medicines: medicines.map((m) => ({
          medicineName: m.medicineName.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          instructions: m.instructions.trim() || undefined
        })),
        notes: notes.trim() || undefined
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Unable to create prescription."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New Prescription"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ui-btn ui-btn-primary" type="submit" form="rx-form" disabled={saving || loading}>
            {saving ? "Saving..." : "Create Prescription"}
          </button>
        </>
      }
    >
      {loading ? (
        <Loader />
      ) : (
        <form id="rx-form" onSubmit={submit} noValidate>
          {error && <div className="ui-form-error">{error}</div>}

          <div className="ui-field" style={{ marginBottom: 18 }}>
            <label>Visit *</label>
            <select className="ui-select" value={visit} onChange={(e) => setVisit(e.target.value)}>
              <option value="">Select visit</option>
              {visits.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.visitId} · {v.patient?.name} · {v.doctor?.name} · {formatDate(v.visitDate)}
                </option>
              ))}
            </select>
            <span className="ui-hint">The patient and doctor are taken from the selected visit.</span>
          </div>

          {medicines.map((m, i) => (
            <div className="ui-repeat" key={i}>
              <div className="ui-repeat-head">
                <span>Medicine {i + 1}</span>
                {medicines.length > 1 && (
                  <button
                    type="button"
                    className="ui-icon-btn danger"
                    title="Remove medicine"
                    onClick={() => setMedicines((list) => list.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="ui-form-grid">
                <div className="ui-field">
                  <label>Medicine name *</label>
                  <input className="ui-input" value={m.medicineName} onChange={(e) => updateMedicine(i, "medicineName", e.target.value)} />
                </div>
                <div className="ui-field">
                  <label>Dosage *</label>
                  <input className="ui-input" placeholder="e.g. 500 mg" value={m.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} />
                </div>
                <div className="ui-field">
                  <label>Frequency *</label>
                  <input className="ui-input" placeholder="e.g. Twice a day" value={m.frequency} onChange={(e) => updateMedicine(i, "frequency", e.target.value)} />
                </div>
                <div className="ui-field">
                  <label>Duration *</label>
                  <input className="ui-input" placeholder="e.g. 5 days" value={m.duration} onChange={(e) => updateMedicine(i, "duration", e.target.value)} />
                </div>
                <div className="ui-field full">
                  <label>Instructions</label>
                  <input className="ui-input" placeholder="e.g. After meals" value={m.instructions} onChange={(e) => updateMedicine(i, "instructions", e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="ui-btn ui-btn-secondary ui-btn-sm"
            onClick={() => setMedicines((list) => [...list, { ...emptyMedicine }])}
          >
            <Plus size={15} /> Add medicine
          </button>

          <div className="ui-field" style={{ marginTop: 18 }}>
            <label>Notes</label>
            <textarea className="ui-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>
      )}
    </Modal>
  );
}

function PrescriptionDetails({ prescription: p, onClose }) {
  return (
    <Modal
      title={`Prescription ${p.prescriptionId}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
          <button className="ui-btn ui-btn-primary" onClick={onClose}>Close</button>
        </>
      }
    >
      <dl className="ui-details">
        <div>
          <dt>Patient</dt>
          <dd>{p.patient?.name} <span className="ui-sub">{p.patient?.patientId}</span></dd>
        </div>
        <div>
          <dt>Doctor</dt>
          <dd>{p.doctor?.name} <span className="ui-sub">{p.doctor?.specialization}</span></dd>
        </div>
        <div>
          <dt>Visit</dt>
          <dd>{p.visit?.visitId} <span className="ui-sub">{formatDate(p.visit?.visitDate)} · {p.visit?.reason}</span></dd>
        </div>
        <div>
          <dt>Prescribed on</dt>
          <dd>{formatDate(p.createdAt)}</dd>
        </div>
      </dl>

      <h3 className="ui-section-title">Medicines</h3>
      <div className="ui-table-wrap" style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
        <table className="ui-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            {p.medicines.map((m, i) => (
              <tr key={i}>
                <td>{m.medicineName}</td>
                <td>{m.dosage}</td>
                <td>{m.frequency}</td>
                <td>{m.duration}</td>
                <td>{m.instructions || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {p.notes && (
        <>
          <h3 className="ui-section-title">Notes</h3>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{p.notes}</p>
        </>
      )}
    </Modal>
  );
}

export default Prescriptions;
