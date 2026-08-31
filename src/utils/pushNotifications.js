// Base64 to Uint8Array converter required by Web Push
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
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported');
    return false;
  }

  try {
    // 1. Register the Service Worker
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    console.log('Push Service Worker registered successfully');

    // 2. Ask for permission (we usually want to tie this to a user action, not on load)
    // We'll expose a subscribe function separately for the UI to trigger
    return true;
  } catch (error) {
    console.error('Error during service worker registration:', error);
    return false;
  }
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, message: 'Push messaging not supported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Permission denied for notifications' };
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Already subscribed to push notifications');
      return { success: true, message: 'Already subscribed' };
    }

    const apiUrl = process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com';
    
    // Fetch public VAPID key from backend
    const vapidResponse = await fetch(`${apiUrl}/api/push/vapid-public-key`);
    const vapidData = await vapidResponse.json();
    const publicVapidKey = vapidData.publicKey;

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // Send subscription to backend
    const subResponse = await fetch(`${apiUrl}/api/push/subscribe`, {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (subResponse.ok) {
      return { success: true, message: 'Successfully subscribed to breaking news alerts!' };
    } else {
      return { success: false, message: 'Failed to save subscription on server' };
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return { success: false, message: 'Failed to subscribe: ' + error.message };
  }
};
