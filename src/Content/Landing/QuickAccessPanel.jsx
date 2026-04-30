import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import api from '../../API/api.js';
import { useAuth } from '../../../Context/Context.jsx';
import ResourceImage from './ResourceImage.jsx';
import QuickAccessModal from './QuickAccessModal.jsx';

function QuickAccessPanel() {
  const { user, ldapConfig, isSiteAdmin, canEditQuickAccess } = useAuth();

  const changedBy = user?.username || 'SYSTEM';

  const [mainResources, setMainResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState('');

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState([]);

  function getResourceImageUrl(imageUrl) {
    if (!imageUrl) return null;

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    return `${api.defaults.baseURL}${imageUrl}`;
  }

  async function loadQuickAccessLinks() {
    try {
      setResourcesLoading(true);
      setResourcesError('');

      const response = await api.get('/api/landing/quick-access');
      setMainResources(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Quick access load error:', err.response?.data || err.message);
      setResourcesError('Failed to load quick access links.');
    } finally {
      setResourcesLoading(false);
    }
  }

  useEffect(() => {
    loadQuickAccessLinks();
  }, []);

  function openAddResourceModal() {
    setEditingResource(null);
    setShowResourceModal(true);
  }

  function openEditResourceModal(resource) {
    setEditingResource(resource);
    setShowResourceModal(true);
  }

  function closeResourceModal() {
    setEditingResource(null);
    setShowResourceModal(false);
  }

  function toggleDeleteSelection(resourceId) {
    setSelectedDeleteIds(prev => {
      if (prev.includes(resourceId)) {
        return prev.filter(id => id !== resourceId);
      }

      return [...prev, resourceId];
    });
  }

  async function handleDeleteSelected() {
    if (selectedDeleteIds.length === 0) {
      alert('Select at least one resource to delete.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedDeleteIds.length} quick access link(s)? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await Promise.all(
        selectedDeleteIds.map(id =>
          api.delete(`/api/landing/quick-access/${id}`, {
            data: { changedBy }
          })
        )
      );

      setSelectedDeleteIds([]);
      setDeleteMode(false);
      await loadQuickAccessLinks();
    } catch (err) {
      console.error('Delete quick access error:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to delete selected links.');
    }
  }

  function cancelDeleteMode() {
    setDeleteMode(false);
    setSelectedDeleteIds([]);
  }

  return (
    <>
      <section className="landing-panel quick-links-panel">
        <div className="panel-heading quick-access-heading">
          <div>
            <h2>Quick Access</h2>
            <p>Frequently used company systems.</p>
          </div>

          {isSiteAdmin() || canEditQuickAccess() ? (
            <div className="resource-actions">
              <button
                type="button"
                id="resourceAddButton"
                onClick={openAddResourceModal}
                title="Add quick access link"
              >
                <FontAwesomeIcon icon="plus" />
              </button>

              {!deleteMode ? (
                <button
                  type="button"
                  id="resourceDeleteModeButton"
                  onClick={() => {
                    setDeleteMode(true);
                    setSelectedDeleteIds([]);
                  }}
                  title="Enter delete mode"
                >
                  <FontAwesomeIcon icon="trash" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    id="resourceConfirmDeleteButton"
                    onClick={handleDeleteSelected}
                    title="Delete selected"
                  >
                    Delete
                  </button>

                  <button
                    type="button"
                    id="resourceCancelDeleteButton"
                    onClick={cancelDeleteMode}
                    title="Cancel delete mode"
                  >
                    Cancel
                  </button>
                </>
              )}

           
            </div> 
              ):(
                null
              )}
          
        </div>

        {deleteMode && (
          <div className="delete-mode-banner">
            Select quick access cards to delete.
            <span>{selectedDeleteIds.length} selected</span>
          </div>
        )}

        <div className="resource-card-grid">
          {resourcesLoading ? (
            <div className="empty-state resource-grid-message">
              Loading quick access links...
            </div>
          ) : resourcesError ? (
            <div className="empty-state resource-grid-message">
              {resourcesError}
            </div>
          ) : mainResources.length === 0 ? (
            <div className="empty-state resource-grid-message">
              No quick access links available.
            </div>
          ) : (
            mainResources.map(resource => {
              const selectedForDelete = selectedDeleteIds.includes(resource.id);

              if (deleteMode) {
                return (
                  <button
                    type="button"
                    key={resource.id}
                    className={[
                      'resource-card',
                      'image-resource-card',
                      'delete-select-card',
                      selectedForDelete ? 'selected-for-delete' : ''
                    ].join(' ')}
                    onClick={() => toggleDeleteSelection(resource.id)}
                  >
                    <div className="delete-check">
                      {selectedForDelete ? (
                        <FontAwesomeIcon icon="check" />
                      ) : (
                        <FontAwesomeIcon icon="trash" />
                      )}
                    </div>

                    <div className="resource-image-wrap">
                      <ResourceImage
                        resource={resource}
                        getResourceImageUrl={getResourceImageUrl}
                      />
                    </div>

                    <div className="resource-card-body">
                      <h3>{resource.title}</h3>
                      <p>{resource.subtitle}</p>
                    </div>
                  </button>
                );
              }

              return (
                <div key={resource.id} className="resource-card-wrap">
                  <a
                    className="resource-card image-resource-card"
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="resource-image-wrap">
                      <ResourceImage
                        resource={resource}
                        getResourceImageUrl={getResourceImageUrl}
                      />
                    </div>

                    <div className="resource-card-body">
                      <h3>{resource.title}</h3>
                      <p>{resource.subtitle}</p>
                    </div>
                  </a>

                  {isSiteAdmin() || canEditQuickAccess() ? (
                    <button
                      type="button"
                      className="resource-edit-button"
                      onClick={() => openEditResourceModal(resource)}
                      title="Edit quick access link"
                    >
                      <FontAwesomeIcon icon="edit" />
                    </button>
                  ):(
                    null
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {showResourceModal && (
        <QuickAccessModal
          editingResource={editingResource}
          changedBy={changedBy}
          onClose={closeResourceModal}
          onSaved={loadQuickAccessLinks}
        />
      )}
    </>
  );
}

export default QuickAccessPanel;