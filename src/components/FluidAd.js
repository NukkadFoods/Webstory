import React, { useEffect, useRef, useState } from 'react';

const FluidAd = ({ className = '' }) => {
  const adRef = useRef(null);
  const initRef = useRef(false);
  const [showAd, setShowAd] = useState(true);

  useEffect(() => {
    const element = adRef.current;
    
    if (!element || initRef.current) {
      return;
    }

    // Set the initialization flag immediately
    initRef.current = true;

    // Initialize AdSense ad
    const initializeAd = () => {
      try {
        if (window.adsbygoogle && element && !element.hasChildNodes()) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          console.log('✅ Fluid ad initialized successfully');
          setShowAd(true);
        } else if (!window.adsbygoogle) {
          // Hide component if AdSense not available
          setShowAd(false);
        }
      } catch (error) {
        console.error('❌ AdSense fluid ad error:', error);
        // Hide component on error
        setShowAd(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initializeAd, 100);

    return () => {
      clearTimeout(timeoutId);
      initRef.current = false;
    };
  }, []);

  // Don't render anything if ad shouldn't be shown
  if (!showAd) {
    return null;
  }

  return (
    <div className={`my-6 ${className}`} style={{ minHeight: '280px' }}>
      {/* Removed advertisement label and container - ads will show where they want */}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '250px' }}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
        data-ad-client="ca-pub-1825834035687372"
        data-ad-slot="4993440134"
      ></ins>
    </div>
  );
};

export default FluidAd;
