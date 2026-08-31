// AdSense Manager to manage ad lifecycle and prevent duplicate pushes in SPA
class AdSenseManager {
  constructor() {
    this.pushedElements = new WeakSet();
    this.pendingTimeouts = new Map();
  }

  /**
   * Initialize an ad slot safely
   * @param {HTMLElement} element - The <ins class="adsbygoogle"> element
   * @param {string} slotId - Ad unit slot ID
   */
  initializeAd(element, slotId) {
    if (!element) return false;

    // Check if element was already pushed or already has an iframe
    if (this.pushedElements.has(element) || element.dataset.adsbygoogleStatus === 'done' || element.hasChildNodes()) {
      return true;
    }

    const pushAd = () => {
      if (!element || !element.parentNode) return;
      if (this.pushedElements.has(element) || element.hasChildNodes()) return;

      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        this.pushedElements.add(element);
        element.dataset.adInitialized = 'true';
      } catch (err) {
        if (!err.message?.includes('already have ads')) {
          console.error('AdSense push error:', err);
        }
      }
    };

    const timeoutId = setTimeout(pushAd, 150);
    this.pendingTimeouts.set(element, timeoutId);

    return true;
  }

  /**
   * Clean up ad tracking on unmount
   */
  removeAd(element) {
    if (element && this.pendingTimeouts.has(element)) {
      clearTimeout(this.pendingTimeouts.get(element));
      this.pendingTimeouts.delete(element);
    }
  }

  /**
   * Reset all pending ads on route navigation
   */
  resetAds() {
    this.pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.pendingTimeouts.clear();
  }

  /**
   * Check if AdSense global script object is available
   */
  isAdSenseLoaded() {
    return typeof window !== 'undefined';
  }
}

export const adSenseManager = new AdSenseManager();
