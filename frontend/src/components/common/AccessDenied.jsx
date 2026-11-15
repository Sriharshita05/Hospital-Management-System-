import { ShieldAlert } from "lucide-react";
import EmptyState from "./EmptyState";

function AccessDenied() {
  return (
    <div className="ui-card">
      <EmptyState
        icon={ShieldAlert}
        title="Access denied"
        text="Your role does not have permission to view this page."
      />
    </div>
  );
}

export default AccessDenied;
