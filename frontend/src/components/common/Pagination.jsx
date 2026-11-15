import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({ page, totalPages, total, onChange }) {
  if (!total) return null;

  return (
    <div className="ui-pagination">
      <span>
        Page {page} of {totalPages} · {total} record{total === 1 ? "" : "s"}
      </span>

      <div>
        <button
          className="ui-btn ui-btn-secondary ui-btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={15} /> Prev
        </button>
        <button
          className="ui-btn ui-btn-secondary ui-btn-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
