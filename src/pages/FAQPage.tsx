import React, { useEffect } from 'react';
import FAQSection from '../components/FAQSection';

export default function FAQPage({ preview = false }: { preview?: boolean } = {}) {
  useEffect(() => {
    if (!preview) window.scrollTo(0, 0);
  }, [preview]);

  return (
    <div className="w-full bg-[var(--color-base)] pt-10 pb-20">
      <FAQSection />
    </div>
  );
}
