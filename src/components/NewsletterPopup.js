import React, { useState, useEffect } from 'react';
import { X, Mail, Bell } from 'lucide-react';
import NewsletterSignup from './NewsletterSignup';
import { subscribeToPushNotifications } from '../utils/pushNotifications';

const NewsletterPopup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [pushStatus, setPushStatus] = useState('');
    const [isPushing, setIsPushing] = useState(false);

    useEffect(() => {
        // Check if user has already subscribed or closed the popup recently
        const hasClosedPopup = localStorage.getItem('newsletter_popup_closed');

        if (!hasClosedPopup) {
            // Show popup after 15 seconds
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 15000); // 15 seconds

            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Remember that user closed it for 24 hours
        const expiry = new Date().getTime() + 24 * 60 * 60 * 1000;
        localStorage.setItem('newsletter_popup_closed', expiry);
    };

    const handlePushSubscribe = async () => {
        setIsPushing(true);
        setPushStatus('');
        const result = await subscribeToPushNotifications();
        setPushStatus(result.message);
        setIsPushing(false);
        if (result.success) {
            setTimeout(handleClose, 2000);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-fade-in-up">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 transition"
                    aria-label="Close newsletter popup"
                >
                    <X size={24} />
                </button>

                {/* Content */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Get Daily Updates
                    </h2>
                    <p className="text-gray-600">
                        Join our newsletter to get your choice of genre news delivered twice a day for free!
                    </p>
                </div>

                {/* Reusing the existing signup form */}
                <div className="popup-form-wrapper">
                    <NewsletterSignup />
                </div>

                <div className="mt-6 border-t border-gray-100 pt-4 text-center">
                    <p className="text-sm text-gray-500 mb-3">Or get instant breaking news alerts on this device</p>
                    <button
                        onClick={handlePushSubscribe}
                        disabled={isPushing}
                        className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                    >
                        <Bell size={18} />
                        {isPushing ? 'Subscribing...' : 'Enable Push Notifications'}
                    </button>
                    {pushStatus && (
                        <p className={`text-xs mt-2 ${pushStatus.includes('success') || pushStatus.includes('Already') ? 'text-green-600' : 'text-red-600'}`}>
                            {pushStatus}
                        </p>
                    )}
                </div>

                <p className="text-xs text-gray-600 text-center mt-4">
                    No spam, unsubscribe at any time.
                </p>
            </div>
        </div>
    );
};

export default NewsletterPopup;
