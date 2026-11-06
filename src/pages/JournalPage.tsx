import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Search, Share2 } from 'lucide-react';
import { useStorefrontContent, useStorefrontContentLoading } from '../contexts/StorefrontContentContext';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { contentJournal } from '../lib/contentPresentation';
import SEO from '../components/SEO';
import ProductCard from '../components/ProductCard';

export default function JournalPage({ preview = false }: { preview?: boolean } = {}) {
  const { slug } = useParams<{ slug: string }>();
  const content = useStorefrontContent();
  const loading = useStorefrontContentLoading();
  const products = useCatalogProducts();
  const { t, language } = useLanguage();
  const articles = useMemo(() => contentJournal(content, language), [content, language]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => { if (!preview) window.scrollTo(0, 0); setShareState('idle'); }, [slug, preview]);
  useEffect(() => {
    if (shareState !== 'copied') return;
    const timer = window.setTimeout(() => setShareState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [shareState]);
  const categories = ['All', ...new Set(articles.map(article => article.category))];
  const filtered = articles.filter(article => (category === 'All' || article.category === category) &&
    (!search.trim() || [article.title, article.excerpt, ...article.tags].join(' ').toLocaleLowerCase(language).includes(search.trim().toLocaleLowerCase(language))));
  const featured = !search.trim() && category === 'All' ? filtered[0] : undefined;
  const grid = featured ? filtered.filter(article => article.slug !== featured.slug) : filtered;
  const article = slug ? articles.find(entry => entry.slug === slug) : undefined;
  const direction = language === 'en' ? 'ltr' : 'rtl';
  const imageFailure: React.ReactEventHandler<HTMLImageElement> = event => {
    if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) event.currentTarget.src = '/images/product-placeholder.svg';
  };
  const share = async () => {
    setShareState('idle');
    try {
      if (navigator.share) await navigator.share({ title: article?.title, url: window.location.href });
      else { if (!navigator.clipboard) throw new Error('unavailable'); await navigator.clipboard.writeText(window.location.href); setShareState('copied'); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setShareState('failed');
    }
  };
  if (slug && loading && !article) return <p role="status" className="p-10 text-center">{t('content.loading')}</p>;
  if (slug && !article) return <section className="editorial-journal journal-empty" dir={direction}>
    <SEO disabled={preview} noindex title={t('editorial.missing')} canonicalPath={`/journal/${slug}`} />
    <BookOpen aria-hidden="true" /><h1>{t('editorial.missing')}</h1><p>{t('editorial.missingCopy')}</p>
    <Link to="/journal">{t('editorial.back')} <ArrowLeft size={16} /></Link>
  </section>;
  if (article) {
    const related = products.filter(product => product.active !== false && article.relatedProductIds.includes(product.id));
    return <article className="editorial-journal journal-article" dir={direction}>
      <SEO disabled={preview} title={article.title} description={article.excerpt} canonicalPath={`/journal/${article.slug}`} type="article" image={article.image}
        structuredData={{ '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.excerpt,
          image: new URL(article.image, typeof window === 'undefined' ? 'https://allbarka.com' : window.location.origin).href,
          datePublished: article.publishedDate, dateModified: article.updatedDate, author: { '@type': 'Person', name: article.author.name },
          publisher: { '@type': 'Organization', name: 'AllBarka' } }} />
      <div className="journal-article-tools"><Link to="/journal"><ArrowLeft size={16} />{t('editorial.back')}</Link>
        <button type="button" onClick={share} aria-label={t('editorial.share')}><Share2 size={16} />{t('editorial.share')}</button></div>
      {shareState !== 'idle' && <p role="status" className="journal-share-state">{t(shareState === 'copied' ? 'shareCopied' : 'editorial.shareFailed')}</p>}
      <header className="journal-article-header">
        <p className="journal-eyebrow">{t(`content.category.${article.category}`, article.category)} <span>· {article.readTime}</span></p>
        <h1 dir="auto">{article.title}</h1><p className="journal-deck" dir="auto">{article.subtitle}</p>
        <p className="journal-byline" dir="auto">{article.author.name} · {article.author.role} · {article.publishedDate}</p>
      </header>
      <figure className="journal-article-image"><img src={article.image} alt={article.title} width={1200} height={680} decoding="async" onError={imageFailure} /></figure>
      <div className="journal-reading-layout">
        {article.sections.length > 1 && <nav className="journal-contents" aria-label={t('editorial.contents')}><p>{t('editorial.contents')}</p>
          {article.sections.map((section, index) => <a key={index} href={`#article-section-${index + 1}`}><span>{String(index + 1).padStart(2, '0')}</span><span dir="auto">{section.heading || article.title}</span></a>)}
        </nav>}
        <div className="journal-prose">
          {article.sections.map((section, index) => <section key={index} id={`article-section-${index + 1}`}>
            {section.heading && <h2 dir="auto">{section.heading}</h2>}
            {section.content.map((paragraph, number) => <p key={number} dir="auto">{paragraph}</p>)}
            {section.callout && <aside><h3 dir="auto">{section.callout.title}</h3><p dir="auto">{section.callout.text}</p></aside>}
          </section>)}
          {!!article.sources?.length && <footer className="journal-sources"><h2>{t('editorial.sources')}</h2><ul>{article.sources.map((source, index) => <li key={index} dir="auto">{source}</li>)}</ul></footer>}
        </div>
      </div>
      {!!related.length && <section className="journal-related"><p className="journal-eyebrow">{t('editorial.related')}</p><h2>{t('pdp.relatedTitle')}</h2>
        <div className="journal-grid">{related.map(product => <ProductCard key={product.id} product={product} isWholesale={false} />)}</div>
      </section>}
      <div className="journal-end-links"><Link to="/journal">{t('editorial.back')} <ArrowLeft size={16} /></Link><Link to="/shop">{t('shop')} <ArrowRight size={16} /></Link></div>
    </article>;
  }
  return <div className="editorial-journal journal-index" dir={direction}>
    <SEO disabled={preview} title={t('content.journalTitle')} description={t('editorial.intro')} canonicalPath="/journal" />
    <header className="journal-masthead"><p className="journal-eyebrow">{t('content.journalEyebrow')}</p><h1>{t('content.journalTitle')}</h1><p>{t('editorial.intro')}</p></header>
    <div className="journal-discovery"><nav aria-label={t('category')}>{categories.map(value => <button type="button" key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{t(`content.category.${value}`, value)}</button>)}</nav>
      <label><Search size={18} aria-hidden="true" /><span className="sr-only">{t('content.searchArticles')}</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('content.searchArticles')} /></label></div>
    {featured && <section className="journal-feature"><Link to={`/journal/${featured.slug}`} className="journal-feature-image"><img src={featured.image} alt={featured.title} width={1200} height={760} onError={imageFailure} /></Link>
      <div><p className="journal-eyebrow">{t('editorial.featured')} · {featured.readTime}</p><h2><Link to={`/journal/${featured.slug}`} dir="auto">{featured.title}</Link></h2><p dir="auto">{featured.excerpt}</p>
        <Link to={`/journal/${featured.slug}`}>{t('editorial.read')} <ArrowRight size={16} /></Link></div></section>}
    <div className="journal-grid">{grid.map(entry => <article className="journal-card" key={entry.slug}><Link to={`/journal/${entry.slug}`} className="journal-card-image"><img src={entry.image} alt={entry.title} width={900} height={600} loading="lazy" decoding="async" onError={imageFailure} /></Link>
      <div><p className="journal-eyebrow">{t(`content.category.${entry.category}`, entry.category)} <span>· {entry.readTime}</span></p><h2><Link to={`/journal/${entry.slug}`} dir="auto">{entry.title}</Link></h2><p dir="auto">{entry.excerpt}</p><Link to={`/journal/${entry.slug}`}>{t('editorial.read')} <ArrowRight size={15} /></Link></div>
    </article>)}</div>
    {filtered.length === 0 && <section className="journal-empty"><BookOpen aria-hidden="true" /><h2>{t('editorial.noResults')}</h2><p>{t('editorial.noResultsCopy')}</p><button type="button" onClick={() => { setCategory('All'); setSearch(''); }}>{t('editorial.reset')}</button></section>}
  </div>;
}
