import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { setSkipAuthModal } from '../storage/auth';
import { type PageType } from '../App';
import { useSEO } from '../seo/useSEO';
import { Button } from '../components/ui/Button';

interface LandingPageProps {
  onNavigate: (page: PageType) => void;
}

const LeafPattern = ({ className = '' }: { className?: string }) => (
  <svg viewBox='0 0 100 100' className={className} fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M50 10 C60 30, 80 40, 90 60 C80 50, 60 45, 50 50 C40 45, 20 50, 10 60 C20 40, 40 30, 50 10Z' fill='currentColor' opacity='0.15' />
  </svg>
);

const OrganicShape = ({ className = '' }: { className?: string }) => (
  <svg viewBox='0 0 200 200' className={className} xmlns='http://www.w3.org/2000/svg'>
    <path d='M100,20 Q160,40 180,100 Q160,160 100,180 Q40,160 20,100 Q40,40 100,20Z' fill='currentColor' opacity='0.08' />
  </svg>
);

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();

  useSEO({
    title: t('seo.landing.title'),
    description: t('seo.landing.description'),
    canonicalUrl: 'https://jajat.godieboy.com/',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'JAJAT - Job Application Tracker',
      url: 'https://jajat.godieboy.com',
      description: t('seo.landing.description'),
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    alternates: {
      'en': 'https://jajat.godieboy.com/?lang=en',
      'es': 'https://jajat.godieboy.com/?lang=es',
      'x-default': 'https://jajat.godieboy.com/',
    },
  });

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleEnterApp = () => {
    setSkipAuthModal();
    onNavigate('applications');
  };

  const roadmapItems = [
    t('landing.roadmap1', 'AI-Powered Job Matching'),
    t('landing.roadmap2', 'Automated Follow-up Reminders'),
    t('landing.roadmap3', 'Multi-ATS Extension Support'),
    t('landing.roadmap4', 'Enhanced Funnel Analytics'),
  ];

  return (
    <div className='min-h-screen bg-background text-foreground transition-colors duration-500'>
      {/* Subtle organic background pattern */}
      <div className='fixed inset-0 pointer-events-none overflow-hidden' aria-hidden='true'>
        <div className='absolute top-20 left-10 opacity-30 dark:opacity-20'>
          <LeafPattern className='size-32 text-primary' />
        </div>
        <div className='absolute top-40 right-20 opacity-20 dark:opacity-10'>
          <OrganicShape className='size-64 text-destructive' />
        </div>
        <div className='absolute bottom-40 left-1/4 opacity-20 dark:opacity-10'>
          <LeafPattern className='size-24 text-primary rotate-45' />
        </div>
      </div>

      {/* Navigation / Lang Switcher + Enter CTA */}
      <nav className='relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 flex justify-between items-center gap-4' aria-label='Main navigation'>
        <Button
          variant='primary'
          size='md'
          className='gap-2'
          onClick={handleEnterApp}
        >
          {t('landing.enterApp')}
          <svg className='size-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 8l4 4m0 0l-4 4m4-4H3' />
          </svg>
        </Button>
        <div className='flex items-center gap-4'>
          <div className='hidden sm:flex items-center gap-3 text-sm'>
            <a href='/privacy.html' className='text-muted-foreground hover:text-foreground transition-colors'>{t('common.footer.privacyPolicy')}</a>
            <a href='/terms.html' className='text-muted-foreground hover:text-foreground transition-colors'>{t('common.footer.termsOfUse')}</a>
          </div>
          <div className='flex items-center gap-2' aria-label='Language selector'>
            <Button
              variant={i18n.language.startsWith('en') ? 'primary' : 'outline'}
              size='sm'
              onClick={() => changeLanguage('en')}
              className='px-4 py-2 h-auto text-xs font-bold'
            >
              EN
            </Button>
            <Button
              variant={i18n.language.startsWith('es') ? 'primary' : 'outline'}
              size='sm'
              onClick={() => changeLanguage('es')}
              className='px-4 py-2 h-auto text-xs font-bold'
            >
              ES
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Asymmetric, Editorial */}
      <header className='relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-24 lg:pt-12 lg:pb-32'>
        <div className='grid lg:grid-cols-12 gap-12 lg:gap-16 items-center'>
          {/* Left side - Content */}
          <div className='lg:col-span-7'>
            {/* Decorative element */}
            <div className='flex items-center gap-3 mb-8'>
              <div className='w-12 h-0.5 bg-primary'></div>
              <span className='text-primary text-sm font-medium tracking-wider uppercase'>
                Job Application Tracker
              </span>
            </div>

            {/* Main heading - Serif for editorial feel */}
            <h1 className='font-serif text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight mb-8 text-foreground'>
              {t('landing.heroTitle')}
            </h1>

            <p className='text-xl md:text-2xl text-muted-foreground mb-10 max-w-xl leading-relaxed'>
              {t('landing.heroSubtitle')}
            </p>

            <div className='flex flex-col sm:flex-row gap-4'>
              <Button
                variant='primary'
                size='lg'
                className='gap-2 text-lg py-4 px-8 h-auto'
                onClick={handleEnterApp}
              >
                {t('landing.getStarted')}
                <svg className='size-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 8l4 4m0 0l-4 4m4-4H3' />
                </svg>
              </Button>
              <Button
                variant='outline'
                size='lg'
                className='text-lg py-4 px-8 h-auto'
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See Features
              </Button>
            </div>
          </div>

          {/* Right side - Decorative illustration */}
          <div className='lg:col-span-5 relative'>
            <div className='relative'>
              {/* Organic blob shape background */}
              <div className='absolute inset-0 md:-inset-4 bg-gradient-to-br from-sage-200 via-terracotta-100 to-earth-100 dark:from-sage-900 dark:via-terracotta-900 dark:to-earth-800 rounded transform rotate-3'></div>
              <div className='relative aspect-square bg-gradient-to-br from-sage-100 to-earth-100 dark:from-sage-800 dark:to-earth-800 rounded overflow-hidden'>
                <img
                  src='/screenshots/table_view.png'
                  alt='Application tracking interface'
                  // Intrinsic dims match the source file (1280x720, 16:9).
                  // Defense-in-depth: explicit width/height lets browsers reserve space
                  // before the image arrives, preventing CLS even if the
                  // aspect-square parent style is ever removed.
                  width={1280}
                  height={720}
                  className='w-full h-full object-cover'
                  // Hero image is the LCP candidate: prioritize fetch, decode off-main-thread
                  fetchPriority='high'
                  decoding='async'
                />
                <div className='absolute inset-0 bg-gradient-to-t from-earth-900/20 to-transparent'></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id='features' className='relative py-24 bg-muted/50'>
        <div className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8'>
          {/* Section header */}
          <div className='max-w-2xl mb-20'>
            <span className='text-destructive text-sm font-medium tracking-wider uppercase mb-4 block'>
              Features
            </span>
            <h2 className='font-serif text-4xl md:text-5xl font-semibold text-foreground mb-6'>
              {t('landing.features')}
            </h2>
          </div>

          {/* Main features - Asymmetric two-column layout */}
          <div className='grid lg:grid-cols-2 gap-16 mb-24'>
            {/* Feature 1 - Left aligned */}
            <div className='relative'>
              <div className='sticky top-8'>
                <h3 className='font-serif text-2xl md:text-3xl font-semibold mb-6 text-foreground'>
                  {t('landing.feature1Title')}
                </h3>
                <p className='text-lg text-muted-foreground mb-8 leading-relaxed'>
                  {t('landing.feature1Desc')}
                </p>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='bg-card p-4 border border-border'>
                    <div className='text-primary font-semibold mb-1'>Table View</div>
                    <div className='text-muted-foreground text-sm'>Sort, filter, and analyze all your applications</div>
                  </div>
                  <div className='bg-card p-4 border border-border'>
                    <div className='text-destructive font-semibold mb-1'>Kanban Board</div>
                    <div className='text-muted-foreground text-sm'>Visualize your job search pipeline</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 1 - Screenshots */}
            <div className='space-y-6'>
              <img
                src='/screenshots/table_view.png'
                alt='Table View'
                className='w-full border border-border'
                loading='lazy'
              />
              <img
                src='/screenshots/kanban_view.png'
                alt='Kanban View'
                className='w-full border border-border'
                loading='lazy'
              />
            </div>
          </div>

          {/* Feature 3 - Reverse layout */}
          <div className='grid lg:grid-cols-2 gap-16 mb-24'>
            {/* Feature 3 - Screenshots */}
            <div className='order-last lg:order-first'>
              <img
                src='/screenshots/insights_page.png'
                alt='Insights Page'
                className='w-full border border-border'
                loading='lazy'
              />
            </div>

            {/* Feature 3 - Content */}
            <div className='relative'>
              <div className='sticky top-8'>
                <h3 className='font-serif text-2xl md:text-3xl font-semibold mb-6 text-foreground'>
                  {t('landing.feature3Title')}
                </h3>
                <p className='text-lg text-muted-foreground mb-8 leading-relaxed'>
                  {t('landing.feature3Desc')}
                </p>

                {/* Stats */}
                <div className='grid grid-cols-3 gap-6'>
                  <div className='text-center'>
                    <div className='font-serif text-4xl font-bold text-primary'>100%</div>
                    <div className='text-sm text-muted-foreground mt-1'>Local Storage</div>
                  </div>
                  <div className='text-center'>
                    <div className='font-serif text-4xl font-bold text-destructive'>0</div>
                    <div className='text-sm text-muted-foreground mt-1'>Data Leaks</div>
                  </div>
                  <div className='text-center'>
                    <div className='font-serif text-4xl font-bold text-muted-foreground'>∞</div>
                    <div className='text-sm text-muted-foreground mt-1'>Free Forever</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Features - Horizontal cards, not grid */}
          <div className='space-y-6'>
            {/* Feature 2 - Chrome Extension */}
            <div className='group flex items-start gap-8 bg-card p-8 border border-border hover:border-primary/30 transition-colors duration-300'>
              <div className='flex-shrink-0 size-16 bg-destructive/10 dark:bg-destructive/5 flex items-center justify-center'>
                <svg className='size-8 text-destructive' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' />
                </svg>
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-xl mb-2 text-foreground'>
                  <a
                    href='https://chromewebstore.google.com/detail/job-application-tracker/inlfdhmkpfikjfgjgnininfcgdnlhlcc?pli=1'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hover:text-primary transition-colors'
                  >
                    {t('landing.feature2Title')}
                    <span className='ml-2 text-sm text-primary'>↗</span>
                  </a>
                </h3>
                <p className='text-muted-foreground'>{t('landing.feature2Desc')}</p>
              </div>
            </div>

            {/* Feature 4 - Email Integration */}
            <div className='group flex items-start gap-8 bg-card p-8 border border-border hover:border-primary/30 transition-colors duration-300'>
              <div className='flex-shrink-0 size-16 bg-primary/5 dark:bg-primary/10 flex items-center justify-center'>
                <svg className='size-8 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                </svg>
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-xl mb-2 text-foreground'>
                  {t('landing.feature5Title')}
                </h3>
                <p className='text-muted-foreground'>{t('landing.feature5Desc')}</p>
              </div>
            </div>

            {/* Feature 5 - Google Sheets */}
            <div className='group flex items-start gap-8 bg-card p-8 border border-border hover:border-primary/30 transition-colors duration-300'>
              <div className='flex-shrink-0 size-16 bg-muted flex items-center justify-center'>
                <svg className='size-8 text-muted-foreground' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                </svg>
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-xl mb-2 text-foreground'>
                  {t('landing.feature4Title')}
                </h3>
                <p className='text-muted-foreground'>{t('landing.feature4Desc')}</p>
              </div>
            </div>

            {/* Feature 6 - Calendar */}
            <div className='group flex items-start gap-8 bg-card p-8 border border-border hover:border-primary/30 transition-colors duration-300'>
              <div className='flex-shrink-0 size-16 bg-destructive/10 dark:bg-destructive/5 flex items-center justify-center'>
                <svg className='size-8 text-destructive' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                </svg>
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-xl mb-2 text-foreground'>
                  {t('landing.feature6Title')}
                </h3>
                <p className='text-muted-foreground'>{t('landing.feature6Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section - More editorial/magazine style */}
      <section className='py-24 max-w-7xl mx-auto px-4 md:px-6 lg:px-8'>
        <div className='grid lg:grid-cols-12 gap-12 items-start'>
          {/* Left column - Section header */}
          <div className='lg:col-span-4'>
            <span className='text-destructive text-sm font-medium tracking-wider uppercase mb-4 block'>
              Roadmap
            </span>
            <h2 className='font-serif text-3xl md:text-4xl font-semibold text-foreground mb-6'>
              What's Coming Next
            </h2>
            <p className='text-muted-foreground leading-relaxed'>
              We're constantly working to make your job search experience even better.
            </p>
          </div>

          {/* Right column - Roadmap items */}
          <div className='lg:col-span-8'>
            <div className='space-y-0'>
              {roadmapItems.map((item, i) => (
                <div
                  key={item}
                  className='group flex items-center gap-6 py-6 border-b border-border last:border-b-0'
                >
                  <div className='flex-shrink-0 size-10 bg-primary/5 dark:bg-primary/10 flex items-center justify-center font-serif text-lg font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300'>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p className='text-lg font-medium text-foreground group-hover:text-primary transition-colors'>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action - Warm terracotta background */}
      <section className='relative py-24 bg-gradient-to-br from-terracotta-500 via-terracotta-600 to-sage-600 text-white'>
        {/* Subtle pattern overlay */}
        <div className='absolute inset-0 opacity-10'>
          <svg className='w-full h-full' viewBox='0 0 100 100' preserveAspectRatio='none'>
            <pattern id='dots' x='0' y='0' width='20' height='20' patternUnits='userSpaceOnUse'>
              <circle cx='2' cy='2' r='1' fill='white' />
            </pattern>
            <rect fill='url(#dots)' width='100%' height='100%' />
          </svg>
        </div>

        <div className='relative max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center'>
          <h2 className='font-serif text-3xl md:text-5xl font-semibold mb-8'>
            {t('landing.ready')}
          </h2>
          <p className='text-xl text-white/90 mb-12 max-w-2xl mx-auto'>
            Join thousands of job seekers who have organized their search and landed their dream roles.
          </p>
          <Button
            variant='secondary'
            size='lg'
            className='gap-3 text-lg py-4 px-10 h-auto bg-white text-foreground hover:bg-background border-border shadow-md hover:shadow-lg'
            onClick={handleEnterApp}
          >
            {t('landing.enterApp')}
            <svg className='size-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 8l4 4m0 0l-4 4m4-4H3' />
            </svg>
          </Button>
        </div>
      </section>

      {/* Footer - Minimal, natural */}
      <footer className='py-12 bg-muted'>
        <div className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-6'>
            <div className='flex items-center gap-3'>
              <div className='size-8 bg-primary rounded flex items-center justify-center'>
                <svg className='size-4 text-primary-foreground' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                </svg>
              </div>
              <span className='font-serif text-lg font-semibold text-foreground'>JAJAT</span>
            </div>
            <p className='text-muted-foreground text-sm'>
              {t('landing.footer')}
            </p>
            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
              <a href='/privacy.html' className='hover:text-foreground transition-colors'>{t('common.footer.privacyPolicy')}</a>
              <span>•</span>
              <a href='/terms.html' className='hover:text-foreground transition-colors'>{t('common.footer.termsOfUse')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
