"use client";

import { useEffect } from "react";

export function EvidenceStatsDebug() {
  useEffect(() => {
    // Check what's actually in the DOM after hydration
    const checkStats = () => {
      const totalCountEl = document.querySelector('[data-testid="total-files-count"]');
      const lastUploadEl = document.querySelector('[data-testid="last-upload-date"]');
      const storageEl = document.querySelector('[data-testid="storage-percentage"]');
      
      console.log('[Client Debug] Total Files element:', {
        element: totalCountEl,
        textContent: totalCountEl?.textContent,
        innerHTML: totalCountEl?.innerHTML,
        dataAttr: totalCountEl?.getAttribute('data-total-count'),
        computedStyle: totalCountEl ? window.getComputedStyle(totalCountEl) : null,
      });
      
      console.log('[Client Debug] Last Upload element:', {
        element: lastUploadEl,
        textContent: lastUploadEl?.textContent,
        innerHTML: lastUploadEl?.innerHTML,
        dataAttr: lastUploadEl?.getAttribute('data-last-upload'),
        computedStyle: lastUploadEl ? window.getComputedStyle(lastUploadEl) : null,
      });
      
      console.log('[Client Debug] Storage Percentage element:', {
        element: storageEl,
        textContent: storageEl?.textContent,
        innerHTML: storageEl?.innerHTML,
        dataAttr: storageEl?.getAttribute('data-storage-percentage'),
        computedStyle: storageEl ? window.getComputedStyle(storageEl) : null,
      });
    };
    
    // Check immediately and after a short delay
    checkStats();
    setTimeout(checkStats, 100);
    setTimeout(checkStats, 1000);
  }, []);

  return null;
}


