import React, { useEffect, useRef, useState } from 'react';
import { adSenseManager } from '../utils/adSenseManager';

const AdBanner = ({ slot = '5827175501', format = 'auto', responsive = true, className = '' }) => {
  const adRef = useRef(null);
  const mountedRef = useRef(false);
  const [showAd, setShowAd] = useState(true);

  useEffect(() => {
    const element = adRef.current;
    
    if (!element || mountedRef.current) {
      return;
    }

    mountedRef.current = true;

    // Check if AdSense is available
    if (!adSenseManager.isAdSenseLoaded()) {
      console.warn('AdSense script not loaded yet for slot:', slot);
      // Hide the ad component instead of showing placeholder
      setShowAd(false);
      return;
    }

    // Initialize the ad with the manager
    const initializeAd = () => {
      const success = adSenseManager.initializeAd(element, slot);
      if (success) {
        setShowAd(true);
        // Set up observer to detect when ad content loads
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && element.innerHTML.trim() !== '') {
              observer.disconnect();
            }
          });
        });
        observer.observe(element, { childList: true, subtree: true });
      } else {
        // Hide the component if ad fails to initialize
        setShowAd(false);
      }
    };

    // Small delay to ensure DOM is stable
    const timeoutId = setTimeout(initializeAd, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (element && mountedRef.current) {
        adSenseManager.removeAd(element);
      }
      mountedRef.current = false;
    };
  }, [slot]);

  // Don't render anything if ad shouldn't be shown
  if (!showAd) {
    return null;
  }

  // Generate unique key for this ad instance
  const adKey = `ad-${slot}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`my-6 ${className}`}>
      {/* Removed placeholder container - ads will show where they want */}
      <ins
        key={adKey}
        ref={adRef}
        className="adsbygoogle"
        style={{ 
          display: 'block', 
          width: '100%' 
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