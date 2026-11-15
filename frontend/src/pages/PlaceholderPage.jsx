import { Link } from "react-router-dom";

function PlaceholderPage({ title }) {
  return (
    <div className="placeholder-page" style={{ margin: "40px auto", maxWidth: 520, textAlign: "center" }}>
      <h1>{title}</h1>
      <p style={{ marginBottom: 18 }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="ui-btn ui-btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}

export default PlaceholderPage;
