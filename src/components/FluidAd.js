import React, { useEffect, useRef } from 'react';
import { adSenseManager } from '../utils/adSenseManager';

const FluidAd = ({ className = '' }) => {
  const adRef = useRef(null);

  useEffect(() => {
    const element = adRef.current;
    if (!element) return;

    adSenseManager.initializeAd(element, '4993440134');

    return () => {
      if (element) {
        adSenseManager.removeAd(element);
      }
    };
  }, []);

  return (
    <div className={`my-6 text-center overflow-hidden min-h-[250px] ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '250px', width: '100%' }}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
        data-ad-client="ca-pub-1825834035687372"
        data-ad-slot="4993440134"
      ></ins>
    </div>
  );
};

export default FluidAd;
