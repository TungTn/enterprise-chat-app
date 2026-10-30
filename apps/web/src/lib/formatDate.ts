export function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) return timeStr;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');

    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return `${timeStr} ${day}/${month}`;
    }

    return `${timeStr} ${day}/${month}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function formatFullDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN');
  } catch {
    return dateStr;
  }
}

export function formatMessageDateLabel(dateStr?: string): string {
  if (!dateStr) return 'Hôm nay';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // If time-only string like "08:30" or malformed, default to today
      return 'Hôm nay';
    }

    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Hôm nay';

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return 'Hôm nay';
  }
}
