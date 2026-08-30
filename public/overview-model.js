export const OVERVIEW_PREVIEW_LIMIT = 5;

export function overviewPreview(items) {
  const collection = Array.isArray(items) ? items : [];
  const total = collection.length;
  const hasMore = total > OVERVIEW_PREVIEW_LIMIT;

  return {
    items: collection.slice(0, OVERVIEW_PREVIEW_LIMIT),
    total,
    hasMore,
    summary: hasMore
      ? `Showing ${OVERVIEW_PREVIEW_LIMIT} of ${total}`
      : `Showing all ${total}`,
    actionLabel: hasMore ? `View all ${total}` : '',
  };
}
