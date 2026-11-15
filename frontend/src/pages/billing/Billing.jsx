import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Eye, Receipt, RefreshCw, Trash2, IndianRupee, Wallet, FileText } from "lucide-react";

import api from "../../services/api";
import { getUser } from "../../utils/auth";
import { errorMessage, formatCurrency, formatDate, formatDateTime } from "../../utils/format";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/Toast";

const emptyItem = { description: "", quantity: 1, unitPrice: "" };
const round2 = (n) => Math.round(n * 100) / 100;

function Billing() {
  const toast = useToast();

  const [bills, setBills] = useState([]);
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
      const response = await api.get("/bills");
      setBills(response.data.data || []);
    } catch (err) {
      setError(errorMessage(err, "Unable to load bills."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bills.filter((b) => {
      const matches =
        !q ||
        [b.billId, b.patient?.name, b.patient?.patientId, b.visit?.visitId].some((x) =>
          String(x || "").toLowerCase().includes(q)
        );
      return matches && (statusFilter === "All" || b.paymentStatus === statusFilter);
    });
  }, [bills, search, statusFilter]);

  const totals = useMemo(() => {
    const sum = (status) =>
      bills.filter((b) => b.paymentStatus === status).reduce((t, b) => t + b.totalAmount, 0);
    return { paid: sum("Paid"), pending: sum("Pending") };
  }, [bills]);

  return (
    <div className="ui-page">
      <PageHeader
        title="Billing"
        subtitle="Patient bills and simulated payment tracking"
        actions={
          <button className="ui-btn ui-btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={17} /> New Bill
          </button>
        }
      />

      <div className="ui-stats">
        <div className="ui-card ui-stat">
          <div className="ui-stat-icon"><FileText size={22} /></div>
          <div><p>Total bills</p><h3>{bills.length}</h3></div>
        </div>
        <div className="ui-card ui-stat">
          <div className="ui-stat-icon success"><IndianRupee size={22} /></div>
          <div><p>Collected (paid)</p><h3>{formatCurrency(totals.paid)}</h3></div>
        </div>
        <div className="ui-card ui-stat">
          <div className="ui-stat-icon warning"><Wallet size={22} /></div>
          <div><p>Pending payments</p><h3>{formatCurrency(totals.pending)}</h3></div>
        </div>
      </div>

      <div className="ui-toolbar">
        <div className="ui-search">
          <Search size={17} />
          <input
            placeholder="Search by bill ID, patient or visit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="ui-select ui-inline" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All payment statuses</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Failed">Failed</option>
          <option value="Refunded">Refunded</option>
        </select>

        <button className="ui-btn ui-btn-secondary" onClick={load} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && <div className="ui-error-banner">{error}</div>}

      <div className="ui-card ui-card-flush">
        {loading ? (
          <Loader label="Loading bills..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No bills found"
            text={bills.length ? "Try changing your search or filter." : "Bills will appear here once created."}
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Patient</th>
                  <th>Visit</th>
                  <th>Created</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b._id}>
                    <td className="ui-mono">{b.billId}</td>
                    <td>
                      {b.patient?.name || "—"}
                      <span className="ui-sub">{b.patient?.patientId}</span>
                    </td>
                    <td className="ui-mono">{b.visit?.visitId || "—"}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td><strong>{formatCurrency(b.totalAmount)}</strong></td>
                    <td><StatusBadge status={b.paymentStatus} /></td>
                    <td>
                      <div className="ui-actions">
                        <button className="ui-icon-btn" title="View / pay" onClick={() => setSelected(b)}>
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
        <CreateBillModal
          existingBills={bills}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            toast.success("Bill created successfully.");
            load();
          }}
        />
      )}

      {selected && (
        <BillDetailsModal
          bill={selected}
          onClose={() => setSelected(null)}
          onChanged={(message) => {
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

function CreateBillModal({ existingBills, onClose, onSaved }) {
  const [visits, setVisits] = useState([]);
  const [visit, setVisit] = useState("");
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [taxRate, setTaxRate] = useState("0");
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

  // Visits that already have an active bill cannot be billed again
  const billedVisitIds = useMemo(
    () => new Set(existingBills.filter((b) => b.paymentStatus !== "Refunded").map((b) => b.visit?._id)),
    [existingBills]
  );
  const billableVisits = visits.filter((v) => !billedVisitIds.has(v._id));

  const updateItem = (index, field, value) =>
    setItems((list) => list.map((it, i) => (i === index ? { ...it, [field]: value } : it)));

  const subtotal = round2(
    items.reduce((t, it) => t + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)
  );
  const tax = round2((subtotal * (Number(taxRate) || 0)) / 100);
  const total = round2(subtotal + tax);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!visit) return setError("Please select a visit.");

    for (const [i, it] of items.entries()) {
      if (!it.description.trim()) return setError(`Item ${i + 1}: description is required.`);
      if (!Number.isInteger(Number(it.quantity)) || Number(it.quantity) < 1) {
        return setError(`Item ${i + 1}: quantity must be a whole number of at least 1.`);
      }
      if (it.unitPrice === "" || Number(it.unitPrice) < 0 || Number.isNaN(Number(it.unitPrice))) {
        return setError(`Item ${i + 1}: enter a valid price.`);
      }
    }

    const rate = Number(taxRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      return setError("Tax rate must be between 0 and 100.");
    }

    try {
      setSaving(true);
      await api.post("/bills", {
        visit,
        taxRate: rate,
        items: items.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice)
        }))
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Unable to create bill."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New Bill"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ui-btn ui-btn-primary" type="submit" form="bill-form" disabled={saving || loading}>
            {saving ? "Saving..." : "Create Bill"}
          </button>
        </>
      }
    >
      {loading ? (
        <Loader />
      ) : (
        <form id="bill-form" onSubmit={submit} noValidate>
          {error && <div className="ui-form-error">{error}</div>}

          <div className="ui-field" style={{ marginBottom: 18 }}>
            <label>Visit *</label>
            <select className="ui-select" value={visit} onChange={(e) => setVisit(e.target.value)}>
              <option value="">Select visit</option>
              {billableVisits.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.visitId} · {v.patient?.name} · {formatDate(v.visitDate)}
                </option>
              ))}
            </select>
            <span className="ui-hint">Only visits without an existing bill are listed. The patient comes from the visit.</span>
          </div>

          {items.map((it, i) => (
            <div className="ui-repeat" key={i}>
              <div className="ui-repeat-head">
                <span>Item {i + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="ui-icon-btn danger"
                    title="Remove item"
                    onClick={() => setItems((list) => list.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="ui-form-grid">
                <div className="ui-field full">
                  <label>Description *</label>
                  <input className="ui-input" placeholder="e.g. Consultation fee" value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                </div>
                <div className="ui-field">
                  <label>Quantity *</label>
                  <input type="number" min="1" step="1" className="ui-input" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                </div>
                <div className="ui-field">
                  <label>Unit price (₹) *</label>
                  <input type="number" min="0" step="0.01" className="ui-input" value={it.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="ui-btn ui-btn-secondary ui-btn-sm"
            onClick={() => setItems((list) => [...list, { ...emptyItem }])}
          >
            <Plus size={15} /> Add item
          </button>

          <div className="ui-field" style={{ marginTop: 18, maxWidth: 200 }}>
            <label>Tax rate (%)</label>
            <input type="number" min="0" max="100" step="0.01" className="ui-input" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>

          <div className="ui-totals">
            <div><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div><span>Tax</span><span>{formatCurrency(tax)}</span></div>
            <div className="grand"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ---------------- View / payment ---------------- */

function BillDetailsModal({ bill, onClose, onChanged }) {
  const user = getUser();
  const [method, setMethod] = useState("Cash");
  const [action, setAction] = useState(null); // "Paid" | "Failed" | "Refunded"
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const canPay = bill.paymentStatus === "Pending" || bill.paymentStatus === "Failed";
  const canRefund = user.role === "admin" && bill.paymentStatus === "Paid";

  const run = async () => {
    try {
      setWorking(true);
      setError("");
      await api.patch(`/bills/${bill.billId}/payment`, {
        paymentStatus: action,
        paymentMethod: method
      });
      onChanged(
        action === "Paid"
          ? "Payment recorded (simulated)."
          : action === "Refunded"
            ? "Bill refunded."
            : "Payment marked as failed."
      );
    } catch (err) {
      setAction(null);
      setError(errorMessage(err, "Unable to update payment."));
    } finally {
      setWorking(false);
    }
  };

  const messages = {
    Paid: `Record a simulated ${method} payment of ${formatCurrency(bill.totalAmount)}? A paid bill cannot be changed again (only refunded by an admin).`,
    Failed: "Mark this payment attempt as failed? You can still record a payment later.",
    Refunded: "Refund this paid bill? This cannot be undone."
  };

  return (
    <Modal
      title={`Bill ${bill.billId}`}
      size="lg"
      onClose={onClose}
      footer={<button className="ui-btn ui-btn-secondary" onClick={onClose}>Close</button>}
    >
      {error && <div className="ui-form-error">{error}</div>}

      <dl className="ui-details">
        <div>
          <dt>Patient</dt>
          <dd>{bill.patient?.name} <span className="ui-sub">{bill.patient?.patientId} · {bill.patient?.phone}</span></dd>
        </div>
        <div>
          <dt>Visit</dt>
          <dd>{bill.visit?.visitId} <span className="ui-sub">{formatDate(bill.visit?.visitDate)} · {bill.visit?.reason}</span></dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDateTime(bill.createdAt)}</dd>
        </div>
        <div>
          <dt>Payment status</dt>
          <dd><StatusBadge status={bill.paymentStatus} /></dd>
        </div>
        {bill.paymentMethod && (
          <div>
            <dt>Payment method</dt>
            <dd>{bill.paymentMethod}</dd>
          </div>
        )}
        {bill.paidAt && (
          <div>
            <dt>Paid at</dt>
            <dd>{formatDateTime(bill.paidAt)} <span className="ui-sub">Ref: {bill.paymentReference}</span></dd>
          </div>
        )}
      </dl>

      <h3 className="ui-section-title">Items</h3>
      <div className="ui-table-wrap" style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
        <table className="ui-table">
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {bill.items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td>{it.quantity}</td>
                <td>{formatCurrency(it.unitPrice)}</td>
                <td>{formatCurrency(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ui-totals">
        <div><span>Subtotal</span><span>{formatCurrency(bill.subtotal)}</span></div>
        <div><span>Tax</span><span>{formatCurrency(bill.tax)}</span></div>
        <div className="grand"><span>Total</span><span>{formatCurrency(bill.totalAmount)}</span></div>
      </div>

      {(canPay || canRefund) && (
        <>
          <h3 className="ui-section-title">Payment</h3>
          <div className="ui-form-note">
            Payments are simulated for this project. No real payment gateway is connected.
          </div>

          <div className="ui-toolbar" style={{ marginBottom: 0 }}>
            {canPay && (
              <>
                <select className="ui-select ui-inline" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Online">Online</option>
                </select>
                <button className="ui-btn ui-btn-success" onClick={() => setAction("Paid")}>Mark as Paid</button>
                {bill.paymentStatus === "Pending" && (
                  <button className="ui-btn ui-btn-secondary" onClick={() => setAction("Failed")}>Mark as Failed</button>
                )}
              </>
            )}
            {canRefund && (
              <button className="ui-btn ui-btn-danger" onClick={() => setAction("Refunded")}>Refund</button>
            )}
          </div>
        </>
      )}

      {action && (
        <ConfirmDialog
          title={action === "Paid" ? "Record payment" : action === "Failed" ? "Mark payment failed" : "Refund bill"}
          message={messages[action]}
          confirmLabel="Confirm"
          danger={action === "Refunded"}
          loading={working}
          onConfirm={run}
          onCancel={() => setAction(null)}
        />
      )}
    </Modal>
  );
}

export default Billing;
