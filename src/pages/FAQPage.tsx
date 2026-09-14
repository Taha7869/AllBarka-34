import React, { useEffect } from 'react';
import FAQSection from '../components/FAQSection';

export default function FAQPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full bg-[var(--color-base)] pt-10 pb-20">
      <FAQSection />
    </div>
  );
}
