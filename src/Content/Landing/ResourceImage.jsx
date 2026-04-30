import { useState } from 'react';

function ResourceImage({ resource, getResourceImageUrl }) {
  const [imgError, setImgError] = useState(false);

  const finalImageUrl = getResourceImageUrl(resource.imageUrl);
  const fallbackText = resource.title?.slice(0, 2).toUpperCase() || 'NA';

  if (!finalImageUrl || imgError) {
    return (
      <div className="resource-image-fallback">
        {fallbackText}
      </div>
    );
  }

  return (
    <img
      src={finalImageUrl}
      alt={`${resource.title} logo`}
      onError={() => setImgError(true)}
    />
  );
}

export default ResourceImage;