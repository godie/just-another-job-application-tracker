import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type PageType } from '../App';

interface LandingPageProps {
  onNavigate: (page: PageType) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const roadmapItems = [
    t('landing.roadmap1', "AI-Powered Job Matching"),
    t('landing.roadmap2', "Automated Follow-up Reminders"),
    t('landing.roadmap3', "Multi-ATS Extension Support"),
    t('landing.roadmap4', "Enhanced Funnel Analytics"),
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Navigation / Lang Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-end gap-2">
        <button
          onClick={() => changeLanguage('en')}
          className={`px-3 py-1 rounded-md text-sm font-medium ${i18n.language.startsWith('en') ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          English
        </button>
        <button
          onClick={() => changeLanguage('es')}
          className={`px-3 py-1 rounded-md text-sm font-medium ${i18n.language.startsWith('es') ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          Español
        </button>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-indigo-700 dark:text-indigo-400 mb-6">
          {t('landing.heroTitle')}
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
          {t('landing.heroSubtitle')}
        </p>
        <button
          onClick={() => onNavigate('applications')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-full text-lg shadow-xl transform transition hover:scale-105"
        >
          {t('landing.getStarted')}
        </button>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">{t('landing.features')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">{t('landing.feature1Title')}</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">{t('landing.feature1Desc')}</p>
              <div className="grid grid-cols-1 gap-4">
                <img src="/screenshots/table_view.png" alt="Table View" className="rounded-lg shadow-lg border border-gray-200 dark:border-gray-700" />
                <img src="/screenshots/kanban_view.png" alt="Kanban View" className="rounded-lg shadow-lg border border-gray-200 dark:border-gray-700" />
              </div>
            </div>
            <div className="order-first md:order-last">
              <h3 className="text-2xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">{t('landing.feature3Title')}</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">{t('landing.feature3Desc')}</p>
              <img src="/screenshots/insights_page.png" alt="Insights Page" className="rounded-lg shadow-lg border border-gray-200 dark:border-gray-700" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="p-8 bg-white dark:bg-gray-700 rounded-2xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('landing.feature2Title')}</h3>
              <p className="text-gray-600 dark:text-gray-300">{t('landing.feature2Desc')}</p>
            </div>
            <div className="p-8 bg-white dark:bg-gray-700 rounded-2xl shadow-md">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('landing.feature4Title')}</h3>
              <p className="text-gray-600 dark:text-gray-300">{t('landing.feature4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-16">{t('landing.roadmap')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roadmapItems.map((item, i) => (
            <div key={i} className="border border-indigo-100 dark:border-gray-700 p-6 rounded-xl bg-indigo-50/30 dark:bg-gray-800/50">
              <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-2">0{i+1}</div>
              <p className="font-medium">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-indigo-700 py-20 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">{t('landing.ready')}</h2>
          <button
            onClick={() => onNavigate('applications')}
            className="bg-white text-indigo-700 hover:bg-gray-100 font-bold py-4 px-12 rounded-full text-lg shadow-xl transform transition hover:scale-105"
          >
            {t('landing.enterApp')}
          </button>
        </div>
      </section>

      <footer className="py-8 text-center text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
        <p>{t('landing.footer')}</p>
      </footer>
    </div>
  );
};

export default LandingPage;
