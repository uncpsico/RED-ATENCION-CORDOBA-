/* ---------- teléfonos y links ---------- */
export function formatoTel(t) { const d = String(t).replace(/\D/g, ''); if (d.startsWith('0800') && d.length === 11) return d.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3'); if (d.startsWith('0351') && d.length === 11) return d.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2-$3'); return t; }

export function parsePhones(str) {
  if (!str || /^[\s\-–]*$/.test(str)) return [];
  return str.split(/\s*(?:\/|,|;|\bo\b|\by\b)\s*/i).map(s => s.trim()).filter(Boolean).map(part => {
    const d = part.replace(/\D/g, '');
    if (/interno/i.test(part) || d.length < 6) return { label: part, tel: null };
    let t = d;
    if (d.startsWith('54')) t = '+' + d;
    else if (d.startsWith('0')) t = d;
    else if (d.length === 10) t = '0' + d;
    else if (d.length === 7) t = '0351' + d;
    return { label: part, tel: t };
  });
}

export function telUrgencia(str) {
  const plus = /^\s*\+/.test(str); const d = String(str).replace(/\D/g, '');
  if (d.length < 3 || d.length > 15) return null;
  if (plus) return '+' + d;
  if (d.length === 10 && !d.startsWith('0')) return '0' + d;
  if (d.length === 7) return '0351' + d;
  return d;
}

export const mapsUrl = inst => `https://www.google.com/maps/dir/?api=1&destination=${inst.lat},${inst.lng}`;
