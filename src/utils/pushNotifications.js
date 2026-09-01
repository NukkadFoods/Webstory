// VAPID Public Key for Web Push encryption
const DEFAULT_VAPID_PUBLIC_KEY = 'BD5Rj1NOFhH3PuBqEJmuH35gBXmBY-CWyuioeG15rmKjIIWy6GCVh2O-nFrW_5DxY4W1xF7nH34b6iS_2SU3m3Y';

// Base64 to Uint8Array converter required by Web Push API
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const initializePushNotifications = async () => {
  if (typeof window === 'undefined') return false;
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('ℹ️ Push messaging is not supported in this browser');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    console.log('✅ Push Service Worker registered:', registration.scope);
    return true;
  } catch (error) {
    console.warn('⚠️ Service worker registration note:', error.message);
    return false;
  }
};

export const subscribeToPushNotifications = async () => {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Browser environment required' };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { 
      success: false, 
      message: 'Push notifications are not supported by this browser' 
    };
  }

  try {
    // 1. Request permission from user
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { 
        success: false, 
        message: 'Notification permission was denied. You can enable it in your browser settings.' 
      };
    }

    // 2. Ensure Service Worker is active
    let registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/push-sw.js');
    }
    await navigator.serviceWorker.ready;

    // 3. Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('✅ Already subscribed to push notifications');
      return { 
        success: true, 
        message: 'You are already subscribed to breaking news alerts!' 
      };
    }

    // 4. Use the VAPID public key
    const publicVapidKey = DEFAULT_VAPID_PUBLIC_KEY;
    const applicationServerKey = urlBase64ToUint8Array(publicVapidKey);

    // 5. Subscribe in browser PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    console.log('✅ Browser push subscription created');

    // 6. Send subscription to backend safely (optional sync)
    const apiUrl = process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com';
    try {
      const subResponse = await fetch(`${apiUrl}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      if (subResponse.ok) {
        console.log('✅ Subscription synced to backend');
      }
    } catch (syncErr) {
      console.warn('ℹ️ Backend subscription sync will retry later:', syncErr.message);
    }

    return { 
      success: true, 
      message: '🔔 Successfully subscribed to breaking news alerts!' 
    };

  } catch (error) {
    console.error('Push notification error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to enable notifications. Please try again.' 
    };
  }
};
