import { useEffect, useMemo, useState } from 'react';
import '../Design/Directory.css';
import api from '../API/api.js';

function Directory() {
  const [pbxUsers, setPBXUsers] = useState([]);
  const [pbxLoading, setPBXLoading] = useState(true);
  const [pbxError, setPBXError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function loadPBXUsers() {
      try {
        setPBXLoading(true);
        setPBXError('');

        const response = await api.get('/api/pbx/users');

        const sortedUsers = Array.isArray(response.data)
          ? [...response.data].sort((a, b) =>
              (a.displayname || '').localeCompare(b.displayname || '')
            )
          : [];

        setPBXUsers(sortedUsers);
      } catch (error) {
        console.error('PBX load error:', error.response?.data || error.message);
        setPBXError(
          typeof error.response?.data === 'string'
            ? error.response.data
            : error.message || 'Failed to load directory.'
        );
      } finally {
        setPBXLoading(false);
      }
    }

    loadPBXUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const searchValue = filter.trim().toLowerCase();

    if (!searchValue) return pbxUsers;

    return pbxUsers.filter((user) => {
      return (
        (user.displayname || '').toLowerCase().includes(searchValue) ||
        (user.cell || '').toLowerCase().includes(searchValue) ||
        (user.work || '').toLowerCase().includes(searchValue) ||
        (user.title || '').toLowerCase().includes(searchValue) ||
        (user.default_extension || '').toLowerCase().includes(searchValue)
      );
    });
  }, [pbxUsers, filter]);

  function displayValue(value) {
    if (!value || value === 'none') return '-';
    return value;
  }

  return (
    <div className="content dir-page">
      <div className="dir-shell">
        <header className="dir-header">
          <h1 className="dir-header-title">Directory</h1>
          <p className="dir-header-subtitle">
            Search employees by name, cell, DID, title, or extension.
          </p>
        </header>

        <section className="dir-content">
          <div className="dir-toolbar">
            <div className="dir-search-row">
              <input
                id="dirSearchInput"
                type="text"
                placeholder="Search directory..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>

            <div className="dir-table-head">
              <div>Name</div>
              <div>Cell</div>
              <div>DID</div>
              <div>Title</div>
              <div>Extension</div>
            </div>
          </div>

          <div className="dir-list">
            {pbxLoading ? (
              <div className="dir-state-card">
                <div className="dir-state-icon">⏳</div>
                <p>Loading directory...</p>
              </div>
            ) : pbxError ? (
              <div className="dir-state-card dir-state-error">
                <div className="dir-state-icon">⚠️</div>
                <p>Unable to load directory.</p>
                <span>{pbxError}</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="dir-state-card">
                <div className="dir-state-icon">🔍</div>
                <p>No matching users found.</p>
                <span>Try a different search.</span>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <article className="dir-row" key={user.id || `${user.displayname}-${user.default_extension}`}>
                  <div className="dir-cell dir-name" data-label="Name">
                    {displayValue(user.displayname)}
                  </div>
                  <div className="dir-cell" data-label="Cell">
                    {displayValue(user.cell)}
                  </div>
                  <div className="dir-cell" data-label="DID">
                    {displayValue(user.work)}
                  </div>
                  <div className="dir-cell" data-label="Title">
                    {displayValue(user.title)}
                  </div>
                  <div className="dir-cell" data-label="Extension">
                    {displayValue(user.default_extension)}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Directory;