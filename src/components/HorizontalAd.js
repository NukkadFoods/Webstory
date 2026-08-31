import React, { useEffect, useRef } from 'react';
import { adSenseManager } from '../utils/adSenseManager';

const HorizontalAd = ({ className = '' }) => {
  const adRef = useRef(null);

  useEffect(() => {
    const element = adRef.current;
    if (!element) return;

    adSenseManager.initializeAd(element, '5827175501');

    return () => {
      if (element) {
        adSenseManager.removeAd(element);
      }
    };
  }, []);

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
        data-ad-slot="5827175501"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default HorizontalAd;
