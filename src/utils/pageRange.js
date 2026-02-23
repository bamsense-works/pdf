export const parsePageRange = (value, totalPages) => {
  if (!value || totalPages <= 0) return [];
  const pages = new Set();
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startRaw, endRaw] = part.split('-').map((n) => parseInt(n, 10));
      if (Number.isNaN(startRaw) || Number.isNaN(endRaw)) continue;
      const start = Math.min(startRaw, endRaw);
      const end = Math.max(startRaw, endRaw);
      for (let i = start; i <= end; i += 1) {
        if (i >= 1 && i <= totalPages) pages.add(i - 1);
      }
    } else {
      const page = parseInt(part, 10);
      if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
        pages.add(page - 1);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
};

export const toPageRangeString = (indices) => {
  const list = Array.isArray(indices) ? indices : Array.from(indices || []);
  const sorted = list.slice().sort((a, b) => a - b);
  return sorted.map((i) => i + 1).join(', ');
};
