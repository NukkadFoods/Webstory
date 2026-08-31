import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <img
            src="/forexyy_logo_80.png"
            alt="Forexyy"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-serif">
            About Forexyy
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            AI-powered news analysis with audio commentary. We bring you breaking stories with expert-quality analysis you can read or listen to.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-serif">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Forexyy was founded in 2025 with a simple goal: make news analysis accessible to everyone. We use AI to generate expert-level commentary on breaking stories across politics, business, technology, finance, health, and world affairs — so you get the context behind the headlines, not just the headlines themselves.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our unique audio commentary feature lets you listen to news analysis like a podcast, making it easy to stay informed during your commute, workout, or daily routine.
          </p>
        </section>

        {/* Editorial Standards */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-serif">Editorial Standards</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-1">•</span>
              <span><strong>Source Transparency:</strong> All articles are sourced from established news organizations including The New York Times, Wall Street Journal, and other major outlets. We clearly attribute every story.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-1">•</span>
              <span><strong>AI Disclosure:</strong> Our commentary is AI-generated and clearly labeled as such. We believe in transparent use of AI to enhance, not replace, journalism.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-1">•</span>
              <span><strong>Corrections:</strong> If you spot an error in our analysis, please contact us. We are committed to accuracy and will promptly correct any mistakes.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-1">•</span>
              <span><strong>No Clickbait:</strong> We do not use misleading headlines. Our titles accurately reflect the content of each story.</span>
            </li>
          </ul>
        </section>

        {/* What We Cover */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-serif">What We Cover</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['Politics', 'Business', 'Technology', 'Finance', 'Health', 'Science', 'Sports', 'Entertainment', 'World News'].map(cat => (
              <Link
                key={cat}
                to={`/category/${cat.toLowerCase().replace(' news', '')}`}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-serif">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We value your feedback. Whether you have a story tip, a correction, or just want to say hello:
          </p>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-700"><strong>Email:</strong> contact@forexyy.com</p>
            <p className="text-gray-700 mt-2"><strong>Website:</strong> <a href="https://forexyy.com" className="text-blue-600 hover:underline">forexyy.com</a></p>
          </div>
        </section>

        {/* Back to Home */}
        <div className="text-center pt-6 border-t border-gray-200">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            ← Back to News
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
