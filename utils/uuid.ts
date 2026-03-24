export const generateUUID = () => {
  // Check if crypto.randomUUID is available (requires Secure Context / HTTPS or localhost)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  // Fallback for insecure contexts (like accessing via Local IP on iPad/Safari)
  // Standard RFC4122 version 4 UUID template
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
