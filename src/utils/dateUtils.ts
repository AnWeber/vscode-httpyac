export function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();

  const absDiff = Math.abs(diff);
  if (absDiff < 60000) {
    return 'just now';
  }
  if (absDiff < 2760000) {
    const val = Math.round(absDiff / 60000);
    if (val <= 1) {
      return 'a minute ago';
    }
    return `${val} minutes ago`;
  }

  if (absDiff < 72000000) {
    const val = Math.round(absDiff / 3600000);
    if (val <= 1) {
      return 'a hour ago';
    }
    return `${val} hour ago`;
  }

  return date.toLocaleTimeString();
}
