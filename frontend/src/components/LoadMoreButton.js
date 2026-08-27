import React from 'react';

function LoadMoreButton({ items, total, hasMore, isLoading, onLoadMore }) {
  if (!hasMore && items.length === 0) return null;
  return (
    <div className="load-more">
      <span className="hint">
        Showing {items.length} of {total}
      </span>
      {hasMore && (
        <button type="button" onClick={onLoadMore} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}

export default LoadMoreButton;
