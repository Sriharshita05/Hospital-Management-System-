import Modal from "./Modal";

function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onConfirm,
  onCancel
}) {
  return (
    <Modal
      title={title}
      onClose={loading ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <button className="ui-btn ui-btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`ui-btn ${danger ? "ui-btn-danger" : "ui-btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </>
      }
    >
      <p className="ui-confirm-text">{message}</p>
    </Modal>
  );
}

export default ConfirmDialog;
