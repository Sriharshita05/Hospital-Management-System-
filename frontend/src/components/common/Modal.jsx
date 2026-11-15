import { useEffect } from "react";
import { X } from "lucide-react";

function Modal({ title, onClose, children, footer, size = "md" }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="ui-modal-overlay" onMouseDown={onClose}>
      <div
        className={`ui-modal ui-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ui-modal-header">
          <h2>{title}</h2>
          <button className="ui-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="ui-modal-body">{children}</div>

        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
