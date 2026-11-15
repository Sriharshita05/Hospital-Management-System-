import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Pencil, UserCog, RefreshCw } from "lucide-react";

import logo from "../../assets/logo.jpg";
import api from "../../services/api";
import { getUser, roleLabel } from "../../utils/auth";
import { errorMessage } from "../../utils/format";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/Toast";

function Staff() {
  const toast = useToast();
  const me = getUser();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | staff member

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/auth/staff");
      setStaff(response.data.data || []);
    } catch (err) {
      setError(errorMessage(err, "Unable to load staff."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      [s.staffId, s.name, s.email, s.role].some((x) => String(x || "").toLowerCase().includes(q))
    );
  }, [staff, search]);

  return (
    <div className="ui-page">
      <PageHeader
        title="Staff"
        subtitle="Manage staff accounts and roles (admin only)"
        actions={
          <button className="ui-btn ui-btn-primary" onClick={() => setEditing("new")}>
            <Plus size={17} /> Add Staff
          </button>
        }
      />

      <div className="ui-toolbar">
        <div className="ui-search">
          <Search size={17} />
          <input placeholder="Search by name, email, staff ID or role..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="ui-btn ui-btn-secondary" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>

      {error && <div className="ui-error-banner">{error}</div>}

      <div className="ui-card ui-card-flush">
        {loading ? (
          <Loader label="Loading staff..." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={UserCog} title="No staff found" />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Linked doctor</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id}>
                    <td className="ui-mono">{s.staffId}</td>
                    <td>{s.name}{s.staffId === me.staffId && <span className="ui-sub">(you)</span>}</td>
                    <td>{s.email}</td>
                    <td>{roleLabel(s.role)}</td>
                    <td>{s.doctor ? `${s.doctor.name}` : "—"}</td>
                    <td><StatusBadge status={s.isActive ? "Active" : "Inactive"} /></td>
                    <td>
                      <div className="ui-actions">
                        <button className="ui-icon-btn" title="Edit" onClick={() => setEditing(s)}>
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
        <StaffModal
          member={editing === "new" ? null : editing}
          isSelf={editing !== "new" && editing.staffId === me.staffId}
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

function StaffModal({ member, isSelf, onClose, onSaved }) {
  const isEdit = Boolean(member);

  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    staffId: member?.staffId || "",
    name: member?.name || "",
    email: member?.email || "",
    password: "",
    role: member?.role || "frontDesk",
    doctor: member?.doctor?._id || "",
    isActive: member ? member.isActive : true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/doctors").then((r) => setDoctors(r.data.data || [])).catch(() => {});
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Name is required.");

    if (!isEdit) {
      if (!form.staffId.trim()) return setError("Staff ID is required.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Enter a valid email address.");
      if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    } else if (form.password && form.password.length < 8) {
      return setError("New password must be at least 8 characters.");
    }

    try {
      setSaving(true);

      if (isEdit) {
        const body = {
          name: form.name.trim(),
          role: form.role,
          isActive: form.isActive,
          doctor: form.role === "clinician" ? form.doctor || null : null
        };
        if (form.password) body.password = form.password;

        await api.put(`/auth/staff/${member.staffId}`, body);
        onSaved("Staff account updated successfully.");
      } else {
        await api.post("/auth/register", {
          staffId: form.staffId.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          doctor: form.role === "clinician" && form.doctor ? form.doctor : undefined
        });
        onSaved("Staff account created successfully.");
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to save staff account."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Edit ${member.name}` : "Add Staff"}
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ui-btn ui-btn-primary" type="submit" form="staff-form" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Account"}
          </button>
        </>
      }
    >
      <form id="staff-form" onSubmit={submit} noValidate>
        {!isEdit && (
          <div className="staff-form-brand">
            <img src={logo} alt="Hospital Management System" />
          </div>
        )}
        {error && <div className="ui-form-error">{error}</div>}

        <div className="ui-form-grid">
          <div className="ui-field">
            <label>Staff ID *</label>
            <input className="ui-input" value={form.staffId} onChange={update("staffId")} disabled={isEdit} placeholder="e.g. STF002" />
          </div>
          <div className="ui-field">
            <label>Full name *</label>
            <input className="ui-input" value={form.name} onChange={update("name")} />
          </div>
          <div className="ui-field full">
            <label>Email *</label>
            <input type="email" className="ui-input" value={form.email} onChange={update("email")} disabled={isEdit} />
          </div>
          <div className="ui-field">
            <label>Role *</label>
            <select className="ui-select" value={form.role} onChange={update("role")} disabled={isSelf}>
              <option value="admin">Admin</option>
              <option value="clinician">Clinician</option>
              <option value="frontDesk">Front Desk</option>
            </select>
          </div>
          <div className="ui-field">
            <label>{isEdit ? "New password" : "Password *"}</label>
            <input type="password" className="ui-input" value={form.password} onChange={update("password")} autoComplete="new-password" placeholder={isEdit ? "Leave blank to keep" : "Min. 8 characters"} />
          </div>

          {form.role === "clinician" && (
            <div className="ui-field full">
              <label>Linked doctor profile</label>
              <select className="ui-select" value={form.doctor} onChange={update("doctor")}>
                <option value="">— Not linked (can see all clinical records) —</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>{d.name} – {d.specialization}</option>
                ))}
              </select>
              <span className="ui-hint">A linked clinician only sees visits, prescriptions and reports of this doctor.</span>
            </div>
          )}

          {isEdit && (
            <div className="ui-field full">
              <label>Account status</label>
              <select
                className="ui-select"
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === "active" }))}
                disabled={isSelf}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive (cannot log in)</option>
              </select>
              {isSelf && <span className="ui-hint">You cannot change your own role or deactivate your own account.</span>}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default Staff;
