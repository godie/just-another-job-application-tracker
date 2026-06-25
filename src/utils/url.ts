import DOMPurify from 'dompurify';

export const sanitizeUrl = (url: string): string => {
    if (!url || typeof url !== 'string') {
      return '#';
    }
  
    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol.toLowerCase();
  
      const allowedSchemes = ['http:', 'https:', 'mailto:', 'tel:'];
      if (!allowedSchemes.includes(protocol)) {
        return '#';
      }
  
      return url;
    } catch {
      if (url.startsWith('/') && !url.startsWith('//')) {
        return url;
      }
      return '#';
    }
  };
  
  export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
    const sanitizedObj: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          sanitizedObj[key] = DOMPurify.sanitize(value);
        } else if (Array.isArray(value)) {
          sanitizedObj[key] = value.map(item => {
            if (typeof item === 'object' && item !== null) {
              return sanitizeObject(item as Record<string, unknown>);
            }
            if (typeof item === 'string') {
              return DOMPurify.sanitize(item);
            }
            return item;
          });
        } else if (typeof value === 'object' && value !== null) {
          sanitizedObj[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
          sanitizedObj[key] = value;
        }
      }
    }
    return sanitizedObj as T;
  };