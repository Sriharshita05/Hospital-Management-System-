function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="ui-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </div>
  );
}

export default PageHeader;
