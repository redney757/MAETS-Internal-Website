function AnnouncementsPanel({ announcements }) {
  return (
    <section className="landing-panel announcements-panel">
      <h2>Announcements</h2>

      {announcements.length > 0 ? (
        <div className="announcement-list">
          {announcements.map((announcement, index) => (
            <div className="announcement-card" key={index}>
              <div className="announcement-title">{announcement.title}</div>
              <div className="announcement-body">{announcement.body}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No announcements right now.</div>
      )}
    </section>
  );
}

export default AnnouncementsPanel;