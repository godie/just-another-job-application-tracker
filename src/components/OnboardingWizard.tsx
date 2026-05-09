import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useKeyboardEscape from '../hooks/useKeyboardEscape';
import useFocusTrap from '../hooks/useFocusTrap';
import { markOnboardingComplete } from './OnboardingWizard.utils';

interface WizardStep {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

interface OnboardingWizardProps {
  onClose: () => void;
  onNavigate?: (page: string) => void;
}

const STEPS: WizardStep[] = [
  { id: 'welcome', icon: '👋', titleKey: 'onboarding.welcome.title', descriptionKey: 'onboarding.welcome.desc' },
  { id: 'applications', icon: '📋', titleKey: 'onboarding.applications.title', descriptionKey: 'onboarding.applications.desc' },
  { id: 'opportunities', icon: '🔍', titleKey: 'onboarding.opportunities.title', descriptionKey: 'onboarding.opportunities.desc' },
  { id: 'views', icon: '📊', titleKey: 'onboarding.views.title', descriptionKey: 'onboarding.views.desc' },
  { id: 'sync', icon: '☁️', titleKey: 'onboarding.sync.title', descriptionKey: 'onboarding.sync.desc' },
  { id: 'insights', icon: '📈', titleKey: 'onboarding.insights.title', descriptionKey: 'onboarding.insights.desc' },
  { id: 'extension', icon: '🧩', titleKey: 'onboarding.extension.title', descriptionKey: 'onboarding.extension.desc' },
  { id: 'start', icon: '🚀', titleKey: 'onboarding.start.title', descriptionKey: 'onboarding.start.desc' },
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onClose, onNavigate }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Trap focus within the modal while visible
  useFocusTrap(modalRef, isVisible);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      markOnboardingComplete();
      onClose();
    }, 300);
  }, [onClose]);

  // Clean up pending timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useKeyboardEscape(handleClose, true);

  const goNext = useCallback(() => {
    setStep((currentStep) => {
      if (currentStep < STEPS.length - 1) {
        setDirection('next');
        return currentStep + 1;
      }
      if (onNavigate) {
        onNavigate('applications');
      }
      handleClose();
      return currentStep;
    });
  }, [handleClose, onNavigate]);

  const goPrev = useCallback(() => {
    setStep((currentStep) => {
      if (currentStep > 0) {
        setDirection('prev');
        return currentStep - 1;
      }
      return currentStep;
    });
  }, []);

  const goToStep = useCallback((index: number) => {
    setStep((currentStep) => {
      setDirection(index > currentStep ? 'next' : 'prev');
      return index;
    });
  }, []);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const slideClass = direction === 'next'
    ? 'animate-in slide-in-from-right-8 fade-in duration-300'
    : 'animate-in slide-in-from-left-8 fade-in duration-300';

  return (
    <div
      ref={modalRef}
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`relative w-full max-w-lg mx-4 bg-white dark:bg-earth-800 rounded-2xl shadow-2xl border border-earth-200 dark:border-earth-700 overflow-hidden transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-earth-100 dark:bg-earth-700">
          <div
            className="h-full bg-sage-500 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 rounded-lg text-earth-400 hover:text-earth-600 dark:hover:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 transition z-10"
          aria-label={t('common.close')}
        >
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Step content */}
        <div className={`px-8 pt-10 pb-6 text-center ${slideClass}`} key={current.id}>
          <div className="text-6xl mb-4 select-none">{current.icon}</div>
          <h2
            id="onboarding-title"
            className="text-2xl font-bold text-earth-900 dark:text-earth-100 mb-3"
          >
            {t(current.titleKey)}
          </h2>
          <p className="text-earth-600 dark:text-earth-400 leading-relaxed">
            {t(current.descriptionKey)}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 px-8 pb-4">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToStep(i)}
              className={`size-2.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'bg-sage-500 w-6'
                  : i < step
                    ? 'bg-sage-300 dark:bg-sage-700'
                    : 'bg-earth-200 dark:bg-earth-600 hover:bg-earth-300 dark:hover:bg-earth-500'
              }`}
              aria-label={t('onboarding.step', { number: i + 1 })}
              type="button"
            />
          ))}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-earth-200 dark:border-earth-700 bg-earth-50/50 dark:bg-earth-900/30">
          <button
            onClick={handleClose}
            className="text-sm text-earth-500 hover:text-earth-700 dark:text-earth-400 dark:hover:text-earth-200 transition-colors"
            type="button"
          >
            {t('onboarding.skip')}
          </button>

          <div className="flex gap-3">
            {!isFirst && (
              <button
                onClick={goPrev}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-earth-300 dark:border-earth-600 text-earth-700 dark:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 transition"
                type="button"
              >
                {t('common.previous')}
              </button>
            )}
            <button
              onClick={goNext}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 transition shadow-sm"
              type="button"
            >
              {isLast ? t('onboarding.startTracking') : t('common.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
