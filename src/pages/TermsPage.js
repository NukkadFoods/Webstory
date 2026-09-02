import React from 'react';
import Header from '../components/Header';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-serif">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500">Last updated: September 2026</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6 text-gray-700 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Forexyy (forexyy.com), you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">2. Description of Service</h2>
            <p>
              Forexyy provides AI-augmented news aggregation, automated journalistic summaries, and AI audio commentary across global news, business, technology, finance, and politics. All commentary is synthesized using artificial intelligence for informational purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">3. Financial & Legal Disclaimer</h2>
            <p>
              The news analysis, financial commentary, and audio insights provided on Forexyy do not constitute financial, investment, legal, or tax advice. Always consult a certified financial advisor before making financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">4. Intellectual Property & Attribution</h2>
            <p>
              All syndicated news items credit their respective originating sources. Original AI analyses, audio narrations, branding, and platform code are the intellectual property of Forexyy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">5. Reader Subscriptions & Google Reader Revenue</h2>
            <p>
              Forexyy offers free access and optional newsletter registrations supported by Google Reader Revenue Manager. Readers may opt in or opt out of communications at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">6. Governing Law & Contact</h2>
            <p>
              These Terms shall be governed and construed in accordance with applicable laws. For inquiries, email <a href="mailto:support@forexyy.com" className="text-blue-600 underline">support@forexyy.com</a> or visit our <a href="/about" className="text-blue-600 underline">About page</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
