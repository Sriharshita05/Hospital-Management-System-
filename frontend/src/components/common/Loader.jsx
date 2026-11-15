function Loader({ label = "Loading..." }) {
  return (
    <div className="ui-loader">
      <span className="ui-spinner" />
      <span>{label}</span>
    </div>
  );
}

export default Loader;
