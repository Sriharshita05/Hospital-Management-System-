import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Pencil, FlaskConical, RefreshCw } from "lucide-react";

import api from "../../services/api";
import { errorMessage, formatDate, todayLocal, toDateInput } from "../../utils/format";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/Toast";

function Diagnostics() {
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editing, setEditing] = useState(null); // null | "new" | report

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/diagnostic-reports");
      setReports(response.data.data || []);
    } catch (err) {
      setError(errorMessage(err, "Unable to load diagnostic reports."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return reports.filter((r) => {
      const matches =
        !q ||
        [r.reportId, r.testName, r.patient?.name, r.patient?.patientId, r.doctor?.name, r.visit?.visitId].some((x) =>
          String(x || "").toLowerCase().includes(q)
        );

      return matches && (statusFilter === "All" || r.status === statusFilter);
    });
  }, [reports, search, statusFilter]);

  const pendingCount = reports.filter((r) => r.status === "Pending").length;

  return (
    <div className="ui-page">
      <PageHeader
        title="Diagnostic Reports"
        subtitle={`${reports.length} report(s) · ${pendingCount} pending`}
        actions={
          <button className="ui-btn ui-btn-primary" onClick={() => setEditing("new")}>
            <Plus size={17} /> New Report
          </button>
        }
      />

      <div className="ui-toolbar">
        <div className="ui-search">
          <Search size={17} />
          <input
            placeholder="Search by report ID, test, patient or doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="ui-select ui-inline" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>

        <button className="ui-btn ui-btn-secondary" onClick={load} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && <div className="ui-error-banner">{error}</div>}

      <div className="ui-card ui-card-flush">
        {loading ? (
          <Loader label="Loading reports..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No diagnostic reports found"
            text={reports.length ? "Try changing your search or filter." : "Reports will appear here once created."}
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Test</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Visit</th>
                  <th>Report date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td className="ui-mono">{r.reportId}</td>
                    <td>
                      {r.testName}
                      {r.fileName && <span className="ui-sub">{r.fileName}</span>}
                    </td>
                    <td>
                      {r.patient?.name || "—"}
                      <span className="ui-sub">{r.patient?.patientId}</span>
                    </td>
                    <td>{r.doctor?.name || "—"}</td>
                    <td className="ui-mono">{r.visit?.visitId || "—"}</td>
                    <td>{formatDate(r.reportDate)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div className="ui-actions">
                        <button className="ui-icon-btn" title="Open / edit" onClick={() => setEditing(r)}>
                          <Pencil size={16} />
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

      {editing && (
        <ReportModal
          report={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            toast.success(message);
            load();
          }}
        />
      )}
    </div>
  );
}

function ReportModal({ report, onClose, onSaved }) {
  const isEdit = Boolean(report);

  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(!isEdit);
  const [form, setForm] = useState({
    visit: "",
    testName: report?.testName || "",
    reportDate: report ? toDateInput(report.reportDate) : todayLocal(),
    status: report?.status || "Pending",
    fileName: report?.fileName || "",
    fileReference: report?.fileReference || "",
    remarks: report?.remarks || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) return;

    api
      .get("/visits")
      .then((r) => setVisits(r.data.data || []))
      .catch((err) => setError(errorMessage(err, "Unable to load visits.")))
      .finally(() => setLoadingVisits(false));
  }, [isEdit]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEdit && !form.visit) return setError("Please select a visit.");
    if (!form.testName.trim()) return setError("Test name is required.");
    if (!form.reportDate) return setError("Report date is required.");

    const body = {
      testName: form.testName.trim(),
      reportDate: form.reportDate,
      status: form.status,
      fileName: form.fileName.trim(),
      fileReference: form.fileReference.trim(),
      remarks: form.remarks.trim()
    };

    try {
      setSaving(true);

      if (isEdit) {
        await api.put(`/diagnostic-reports/${report.reportId}`, body);
        onSaved("Diagnostic report updated successfully.");
      } else {
        await api.post("/diagnostic-reports", { ...body, visit: form.visit });
        onSaved("Diagnostic report created successfully.");
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to save diagnostic report."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Report ${report.reportId}` : "New Diagnostic Report"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ui-btn ui-btn-primary" type="submit" form="report-form" disabled={saving || loadingVisits}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Report"}
          </button>
        </>
      }
    >
      {loadingVisits ? (
        <Loader />
      ) : (
        <form id="report-form" onSubmit={submit} noValidate>
          {error && <div className="ui-form-error">{error}</div>}

          {isEdit && (
            <dl className="ui-details" style={{ marginBottom: 20 }}>
              <div>
                <dt>Patient</dt>
                <dd>{report.patient?.name} <span className="ui-sub">{report.patient?.patientId}</span></dd>
              </div>
              <div>
                <dt>Doctor / Visit</dt>
                <dd>{report.doctor?.name} <span className="ui-sub">{report.visit?.visitId}</span></dd>
              </div>
            </dl>
          )}

          <div className="ui-form-grid">
            {!isEdit && (
              <div className="ui-field full">
                <label>Visit *</label>
                <select className="ui-select" value={form.visit} onChange={update("visit")}>
                  <option value="">Select visit</option>
                  {visits.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.visitId} · {v.patient?.name} · {v.doctor?.name} · {formatDate(v.visitDate)}
                    </option>
                  ))}
                </select>
                <span className="ui-hint">The patient and doctor are taken from the selected visit.</span>
              </div>
            )}

            <div className="ui-field">
              <label>Test name *</label>
              <input className="ui-input" value={form.testName} onChange={update("testName")} placeholder="e.g. Complete Blood Count" />
            </div>

            <div className="ui-field">
              <label>Report date *</label>
              <input type="date" className="ui-input" value={form.reportDate} onChange={update("reportDate")} />
            </div>

            <div className="ui-field">
              <label>Status</label>
              <select className="ui-select" value={form.status} onChange={update("status")}>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="ui-field">
              <label>File name</label>
              <input className="ui-input" value={form.fileName} onChange={update("fileName")} placeholder="e.g. cbc-report.pdf" />
            </div>

            <div className="ui-field full">
              <label>File reference / link</label>
              <input className="ui-input" value={form.fileReference} onChange={update("fileReference")} placeholder="Reference number or storage location" />
              <span className="ui-hint">File upload is not part of this version; store a reference to where the file is kept.</span>
            </div>

            <div className="ui-field full">
              <label>Remarks / test results</label>
              <textarea className="ui-textarea" value={form.remarks} onChange={update("remarks")} />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default Diagnostics;
