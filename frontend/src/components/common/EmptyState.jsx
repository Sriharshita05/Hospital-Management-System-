function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="ui-empty">
      {Icon && <Icon size={34} />}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  );
}

export default EmptyState;
