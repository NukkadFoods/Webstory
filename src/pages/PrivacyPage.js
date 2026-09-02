import React from 'react';
import Header from '../components/Header';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-serif">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500">Last updated: September 2026</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6 text-gray-700 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">1. Introduction</h2>
            <p>
              Forexyy ("we", "our", or "us") operates forexyy.com. We are committed to protecting your personal information and your right to privacy. This Privacy Policy describes how we collect, use, and protect your data when you visit our website, subscribe to our newsletter, or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Personal Data:</strong> When you subscribe to our newsletter or use Google 1-Click Reader Revenue features, we collect your email address.</li>
              <li><strong>Usage Data:</strong> We automatically collect information regarding how you access and use the website, including IP address, browser type, operating system, and pages visited via Google Analytics.</li>
              <li><strong>Cookies:</strong> We use cookies to enhance your experience and deliver contextual advertising via Google AdSense.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To deliver daily news briefings, market analysis, and breaking news alerts.</li>
              <li>To improve and customize our website functionality and AI commentary.</li>
              <li>To display relevant advertisements via Google AdSense.</li>
              <li>To comply with legal obligations and prevent unauthorized activity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">4. Third-Party Services</h2>
            <p>
              We utilize trusted third-party service providers, including:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Google AdSense & Analytics:</strong> For advertising and web traffic analysis.</li>
              <li><strong>Google Reader Revenue Manager:</strong> For seamless subscription and reader account verification.</li>
              <li><strong>Web Push Notifications:</strong> For opt-in browser breaking news notifications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">5. Your Privacy Rights & Opt-Out</h2>
            <p>
              You may unsubscribe from our newsletter at any time using the "Unsubscribe" link in any email or by visiting <a href="/unsubscribe" className="text-blue-600 underline">forexyy.com/unsubscribe</a>. You may also disable browser push notifications in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:support@forexyy.com" className="text-blue-600 underline">support@forexyy.com</a> or visit our <a href="/about" className="text-blue-600 underline">About page</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
