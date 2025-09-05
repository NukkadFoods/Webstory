// AdSense Manager to prevent duplicate ad initialization
class AdSenseManager {
  constructor() {
    this.pushedSlots = new Set();
    this.adElements = new Map();
    this.pendingAds = new Set();
    this.isStrictMode = this.detectStrictMode();
  }

  // Detect if we're in React StrictMode (development)
  detectStrictMode() {
    return process.env.NODE_ENV === 'development';
  }

  // Initialize an ad slot if it hasn't been initialized yet
  initializeAd(element, slotId) {
    if (!element || !window.adsbygoogle) {
      console.log('AdSense not ready:', { element: !!element, adsbygoogle: !!window.adsbygoogle });
      return false;
    }

    const elementId = `${slotId}-${element.dataset.adClient || 'default'}`;
    
    // Check if this specific element already has an ad
    if (this.adElements.has(element)) {
      console.log('Element already has ad:', elementId);
      return false;
    }

    // Check if element already has ad content
    if (element.innerHTML.trim() !== '') {
      console.log('Element already has content:', elementId);
      this.adElements.set(element, elementId);
      return false;
    }

    // Prevent duplicate initialization for same slot
    if (this.pendingAds.has(elementId)) {
      console.log('Ad already pending:', elementId);
      return false;
    }

    try {
      this.pendingAds.add(elementId);
      
      // In strict mode, add extra delay to prevent double initialization
      const delay = this.isStrictMode ? 200 : 50;
      
      setTimeout(() => {
        // Double check element is still valid and empty
        if (element.parentNode && element.innerHTML.trim() === '') {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            this.pushedSlots.add(elementId);
            this.adElements.set(element, elementId);
            console.log('✅ AdSense ad successfully initialized:', elementId);
          } catch (pushError) {
            console.error('AdSense push error:', pushError);
          }
        }
        this.pendingAds.delete(elementId);
      }, delay);
      
      return true;
    } catch (error) {
      console.error('AdSense initialization error:', error);
      this.pendingAds.delete(elementId);
      return false;
    }
  }

  // Remove an ad slot from tracking when component unmounts
  removeAd(element) {
    if (this.adElements.has(element)) {
      const slotId = this.adElements.get(element);
      this.adElements.delete(element);
      console.log('🗑️ Removed ad tracking:', slotId);
    }
  }

  // Reset all ads (useful for page navigation)
  resetAds() {
    console.log('🔄 Resetting all ads for new page');
    this.adElements.clear();
    this.pendingAds.clear();
    // Keep pushedSlots to prevent re-initialization conflicts
  }

  // Check if AdSense script is loaded
  isAdSenseLoaded() {
    return typeof window !== 'undefined' && window.adsbygoogle;
  }

  // Get current state for debugging
  getState() {
    return {
      pushedSlots: Array.from(this.pushedSlots),
      adElements: this.adElements.size,
      pendingAds: Array.from(this.pendingAds),
      isStrictMode: this.isStrictMode
    };
  }
}

// Export singleton instance
export const adSenseManager = new AdSenseManager();
