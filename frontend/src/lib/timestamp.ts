/** "09:04"-style timestamp, matching the mockups' own plain HH:MM display strings. */
export function formatTimestamp(date: Date = new Date()): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
