const TONES = {
  pending: "warning",
  "in progress": "warning",
  confirmed: "info",
  completed: "success",
  paid: "success",
  success: "success",
  cancelled: "danger",
  failed: "danger",
  refunded: "muted",
  active: "success",
  inactive: "muted"
};

function StatusBadge({ status }) {
  const tone = TONES[String(status).toLowerCase()] || "muted";
  return <span className={`ui-badge ui-badge-${tone}`}>{status}</span>;
}

export default StatusBadge;
