function ResourceListPanel({ title, subtitle, resources }) {
  return (
    <section className="landing-panel resource-list-panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="small-resource-grid">
        {resources.map(resource => (
          <a
            key={resource.title}
            className="small-resource-card"
            href={resource.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>{resource.title}</span>
            <small>Open</small>
          </a>
        ))}
      </div>
    </section>
  );
}

export default ResourceListPanel;