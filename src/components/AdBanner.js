import React, { useEffect, useRef } from 'react';
import { adSenseManager } from '../utils/adSenseManager';

const AdBanner = ({ slot = '5827175501', format = 'auto', responsive = true, className = '' }) => {
  const adRef = useRef(null);

  useEffect(() => {
    const element = adRef.current;
    if (!element) return;

    adSenseManager.initializeAd(element, slot);

    return () => {
      if (element) {
        adSenseManager.removeAd(element);
      }
    };
  }, [slot]);

  return (
    <div className={`my-6 text-center overflow-hidden min-h-[90px] ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ 
          display: 'block', 
          width: '100%',
          minHeight: '90px'
        }}
        data-ad-client="ca-pub-1825834035687372"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
      ></ins>
    </div>
  );
};

export default AdBanner;