import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import api from '../../API/api.js';

function QuickAccessModal({ editingResource, changedBy, onClose, onSaved }) {
  const [resourceForm, setResourceForm] = useState({
    title: editingResource?.title || '',
    subtitle: editingResource?.subtitle || '',
    url: editingResource?.url || '',
    imageUrl:
      editingResource?.imageUrl &&
      (
        editingResource.imageUrl.startsWith('http://') ||
        editingResource.imageUrl.startsWith('https://')
      )
        ? editingResource.imageUrl
        : '',
    imageFile: null
  });

  async function handleResourceSubmit(event) {
    event.preventDefault();

    if (
      !resourceForm.title.trim() ||
      !resourceForm.subtitle.trim() ||
      !resourceForm.url.trim()
    ) {
      alert('Title, subtitle, and URL are required.');
      return;
    }

    try {
      const formData = new FormData();

      formData.append('title', resourceForm.title.trim());
      formData.append('subtitle', resourceForm.subtitle.trim());
      formData.append('url', resourceForm.url.trim());
      formData.append('changedBy', changedBy);
      formData.append('createdBy', changedBy);

      if (resourceForm.imageUrl.trim()) {
        formData.append('imageUrl', resourceForm.imageUrl.trim());
      }

      if (resourceForm.imageFile) {
        formData.append('image', resourceForm.imageFile);
      }

      if (editingResource) {
        await api.put(`/api/landing/quick-access/${editingResource.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await api.post('/api/landing/quick-access', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      onClose();
      await onSaved();
    } catch (err) {
      console.error('Save quick access error:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to save quick access link.');
    }
  }

  return (
    <div className="resource-modal-backdrop">
      <form className="resource-modal" onSubmit={handleResourceSubmit}>
        <div className="resource-modal-header">
          <h2>{editingResource ? 'Edit Quick Access Link' : 'Add Quick Access Link'}</h2>

          <button type="button" onClick={onClose}>
            <FontAwesomeIcon icon="times" />
          </button>
        </div>

        <label>
          Title
          <input
            type="text"
            value={resourceForm.title}
            onChange={(event) =>
              setResourceForm(prev => ({ ...prev, title: event.target.value }))
            }
            required
          />
        </label>

        <label>
          Subtitle
          <input
            type="text"
            value={resourceForm.subtitle}
            onChange={(event) =>
              setResourceForm(prev => ({ ...prev, subtitle: event.target.value }))
            }
            required
          />
        </label>

        <label>
          URL
          <input
            type="url"
            value={resourceForm.url}
            onChange={(event) =>
              setResourceForm(prev => ({ ...prev, url: event.target.value }))
            }
            required
          />
        </label>

        <label>
          Image URL optional
          <input
            type="url"
            value={resourceForm.imageUrl}
            onChange={(event) =>
              setResourceForm(prev => ({ ...prev, imageUrl: event.target.value }))
            }
            placeholder="https://example.com/logo.png"
          />
        </label>

        <label>
          Upload image optional
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setResourceForm(prev => ({
                ...prev,
                imageFile: event.target.files?.[0] || null
              }))
            }
          />
        </label>

        <div className="resource-modal-actions">
          <button type="submit">
            {editingResource ? 'Update Link' : 'Add Link'}
          </button>

          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default QuickAccessModal;