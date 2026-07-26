import { useEffect, useState } from 'react';
import { loadImage } from './db';

/** טעינת תמונה מ-IndexedDB כ-Object URL, כולל ניקוי בזיכרון */
export function useImageUrl(imageId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }
    let alive = true;
    let objUrl: string | null = null;
    void loadImage(imageId).then((blob) => {
      if (blob && alive) {
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      }
    });
    return () => {
      alive = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [imageId]);

  return url;
}
