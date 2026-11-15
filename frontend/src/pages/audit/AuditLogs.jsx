import { useCallback, useEffect, useState } from "react";
import { Search, Activity, RefreshCw } from "lucide-react";

import api from "../../services/api";
import { errorMessage, formatDateTime } from "../../utils/format";
import { roleLabel } from "../../utils/auth";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import Pagination from "../../components/common/Pagination";

const MODULES = [
  "Authentication", "Patient", "Department", "Doctor", "Schedule", "Appointment",
  "Visit", "Prescription", "DiagnosticReport", "Billing"
];
const ACTIONS = ["CREATE", "UPDATE", "DEACTIVATE", "LOGIN"];

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({ search: "", module: "", action: "", status: "", from: "", to: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Wait for the user to stop typing before calling the API
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [filters.search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = { page, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      ["module", "action", "status", "from", "to"].forEach((k) => {
        if (filters[k]) params[k] = filters[k];
      });

      const response = await api.get("/audit-logs", { params });
      setLogs(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(errorMessage(err, "Unable to load audit logs."));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.module, filters.action, filters.status, filters.from, filters.to]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (field) => (e) => {
    setFilters((f) => ({ ...f, [field]: e.target.value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: "", module: "", action: "", status: "", from: "", to: "" });
    setPage(1);
  };

  return (
    <div className="ui-page">
      <PageHeader title="Audit Logs" subtitle="A record of staff activity across the system (admin only)" />

      <div className="ui-toolbar">
        <div className="ui-search">
          <Search size={17} />
          <input placeholder="Search description or resource ID..." value={filters.search} onChange={setFilter("search")} />
        </div>

        <select className="ui-select ui-inline" value={filters.module} onChange={setFilter("module")}>
          <option value="">All modules</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select className="ui-select ui-inline" value={filters.action} onChange={setFilter("action")}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <select className="ui-select ui-inline" value={filters.status} onChange={setFilter("status")}>
          <option value="">Any outcome</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      <div className="ui-toolbar">
        <div className="ui-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <label>From</label>
          <input type="date" className="ui-input" value={filters.from} max={filters.to || undefined} onChange={setFilter("from")} />
        </div>
        <div className="ui-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <label>To</label>
          <input type="date" className="ui-input" value={filters.to} min={filters.from || undefined} onChange={setFilter("to")} />
        </div>
        <button className="ui-btn ui-btn-secondary" onClick={clearFilters}>Clear filters</button>
        <button className="ui-btn ui-btn-secondary" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>

      {error && <div className="ui-error-banner">{error}</div>}

      <div className="ui-card ui-card-flush">
        {loading ? (
          <Loader label="Loading audit logs..." />
        ) : logs.length === 0 ? (
          <EmptyState icon={Activity} title="No audit entries found" text="Try changing or clearing the filters." />
        ) : (
          <>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Staff</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Description</th>
                    <th>Resource</th>
                    <th>Outcome</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(log.createdAt)}</td>
                      <td>
                        {log.staff?.name || "Unknown"}
                        <span className="ui-sub">{log.staff ? `${log.staff.staffId} · ${roleLabel(log.staff.role)}` : ""}</span>
                      </td>
                      <td><strong>{log.action}</strong></td>
                      <td>{log.module}</td>
                      <td className="ui-wrap">{log.description || "—"}</td>
                      <td className="ui-mono">{log.resourceId || "—"}</td>
                      <td><StatusBadge status={log.status} /></td>
                      <td className="ui-mono">{log.ipAddress || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default AuditLogs;
