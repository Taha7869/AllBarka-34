import React from 'react';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { useVisualRefinementLanguage } from '../hooks/useVisualRefinementLanguage';

interface MobileHeaderBrandProps {
  onHomeClick: () => void;
}

export default function MobileHeaderBrand({ onHomeClick }: MobileHeaderBrandProps) {
  const { t, language } = useVisualRefinementLanguage();
  return (
    <button type="button" onClick={onHomeClick} className="mobile-royal-brand focus-ring" dir="ltr"
      aria-label={`AllBarka — ${t('visual.home')}`}>
      <span className="mobile-royal-brand__crest" aria-hidden="true"><AllBarkaCrestVector /></span>
      <span className="mobile-royal-brand__signature">
        <span className="mobile-royal-brand__name">AllBarka</span>
        <span className="mobile-royal-brand__rule" aria-hidden="true"><i /><span>◆</span><i /></span>
        <span className="mobile-royal-brand__place" dir="auto" lang={language}>{t('visual.lahore')}</span>
      </span>
    </button>
  );
}

