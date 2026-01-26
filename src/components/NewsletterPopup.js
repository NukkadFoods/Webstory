import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import NewsletterSignup from './NewsletterSignup';

const NewsletterPopup = () => {
    const [isVisible, setIsVisible] = useState(false);

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

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-fade-in-up">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>

                {/* Content */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FontAwesomeIcon icon={faEnvelope} size="2x" />
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

                <p className="text-xs text-gray-400 text-center mt-4">
                    No spam, unsubscribe at any time.
                </p>
            </div>
        </div>
    );
};

export default NewsletterPopup;
