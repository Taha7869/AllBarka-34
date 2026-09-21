import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Clock, 
  Tag, 
  ArrowRight, 
  ArrowLeft, 
  Share2, 
  Sparkles, 
  ShoppingBag, 
  ShieldCheck, 
  Check, 
  Search 
} from 'lucide-react';
import { JOURNAL_ARTICLES, getArticleBySlug, JournalArticle } from '../data/articles';
import { PRODUCTS, getProductImage } from '../data/products';
import SEO from '../components/SEO';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function JournalPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen } = useCart();
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // If slug is present, render single article view
  const currentArticle = slug ? getArticleBySlug(slug) : undefined;

  const categories = ['All', 'Buying Guides', 'Storage & Care', 'Culinary & Pairings', 'Wellness & Science', 'Gifting'];

  const filteredArticles = useMemo(() => {
    return JOURNAL_ARTICLES.filter((article) => {
      const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleQuickAdd = (productId: string) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const defaultWeight = Object.keys(product.prices)[0] || '500g';
    const price = product.prices[defaultWeight] || 0;

    addToCart({
      id: `${product.id}-${defaultWeight}`,
      productId: product.id,
      name: product.name,
      slug: product.id,
      image: getProductImage(product),
      selectedWeight: defaultWeight,
      unitPrice: price,
      price: price,
      quantity: 1,
      wholesale: false,
    });

    setAddedProductId(productId);
    setTimeout(() => {
      setAddedProductId(null);
      setIsCartOpen(true);
    }, 400);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // ── DEDICATED ARTICLE VIEW ────────────────────────────────────────────────
  if (slug) {
    if (!currentArticle) {
      return (
        <div className="w-full min-h-[70vh] bg-[var(--color-base,#F6F1EA)] py-16 px-4 flex flex-col items-center justify-center text-center">
          <SEO title="Article Not Found" canonicalPath={`/journal/${slug}`} />
          <div className="w-16 h-16 rounded-full bg-[var(--color-gold,#C7982F)]/20 border border-[var(--color-gold,#C7982F)]/40 flex items-center justify-center text-[var(--color-gold,#C7982F)] mb-4">
            <BookOpen size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-ink,#29231D)] mb-2">
            Article Not Found
          </h1>
          <p className="text-sm text-[var(--color-ink,#29231D)]/70 max-w-md mb-6">
            We could not locate the requested Harvest Chronicle article. Explore our complete collection of storage guides, pairing notes, and culinary ideas.
          </p>
          <Link
            to="/journal"
            className="px-6 py-3 rounded-full bg-[var(--color-emerald,#042821)] text-[var(--color-surface,#FFFCF7)] text-xs font-bold uppercase tracking-wider hover:bg-[#03201A] transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            <span>Browse All Articles</span>
          </Link>
        </div>
      );
    }

    const relatedProducts = PRODUCTS.filter((p) =>
      currentArticle.relatedProductIds.includes(p.id)
    );

    return (
      <article className="w-full bg-[var(--color-base,#F6F1EA)] pt-6 sm:pt-10 pb-24 text-[var(--color-ink,#29231D)]">
        <SEO
          title={currentArticle.title}
          description={currentArticle.excerpt}
          canonicalPath={`/journal/${currentArticle.slug}`}
          type="article"
          image={currentArticle.image}
          structuredData={{
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: currentArticle.title,
            description: currentArticle.excerpt,
            image: `https://allbarka.com${currentArticle.image}`,
            datePublished: currentArticle.publishedDate,
            dateModified: currentArticle.updatedDate,
            author: {
              '@type': 'Person',
              name: currentArticle.author.name
            },
            publisher: {
              '@type': 'Organization',
              name: 'AllBarka Luxury Dry Fruits',
              logo: {
                '@type': 'ImageObject',
                url: 'https://allbarka.com/images/logo.png'
              }
            }
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link
              to="/journal"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink,#29231D)]/70 hover:text-[var(--color-gold,#C7982F)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to The Harvest Chronicle</span>
            </Link>

            <button
              onClick={handleShare}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-[var(--color-gold,#C7982F)]/30 hover:border-[var(--color-gold,#C7982F)] bg-[var(--color-surface,#FFFCF7)] transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check size={13} className="text-[#0E7A53]" />
                  <span className="text-[#0E7A53]">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 size={13} className="text-[var(--color-gold,#C7982F)]" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          {/* Article Header */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)]">
                {currentArticle.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink,#29231D)]/60">
                <Clock size={13} />
                <span>{currentArticle.readTime}</span>
              </div>
              <span className="text-xs text-[var(--color-ink,#29231D)]/40">•</span>
              <span className="text-xs text-[var(--color-ink,#29231D)]/60">{currentArticle.publishedDate}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[var(--color-emerald,#042821)] leading-[1.15]">
              {currentArticle.title}
            </h1>

            <p className="text-base sm:text-lg text-[var(--color-ink,#29231D)]/80 font-normal leading-relaxed border-l-2 border-[var(--color-gold,#C7982F)] pl-4 italic">
              {currentArticle.subtitle}
            </p>

            {/* Author Byline */}
            <div className="flex items-center gap-3 pt-2 text-xs text-[var(--color-ink,#29231D)]/70">
              <div className="w-8 h-8 rounded-full bg-[var(--color-gold,#C7982F)]/20 border border-[var(--color-gold,#C7982F)]/40 flex items-center justify-center font-bold text-[var(--color-gold,#C7982F)] text-[10px]">
                AB
              </div>
              <div>
                <p className="font-bold text-[var(--color-ink,#29231D)]">{currentArticle.author.name}</p>
                <p className="text-[11px] text-[var(--color-ink,#29231D)]/60">{currentArticle.author.role}</p>
              </div>
            </div>
          </header>

          {/* Hero Image */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden border border-[var(--color-gold,#C7982F)]/30 bg-[var(--color-surface,#FFFCF7)] shadow-sm">
            <img
              src={currentArticle.image}
              alt={currentArticle.title}
              width={960}
              height={960}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Sections */}
          <div className="rounded-3xl bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/25 p-6 sm:p-10 space-y-8 shadow-sm leading-relaxed">
            {currentArticle.sections.map((section, idx) => (
              <section key={idx} className="space-y-3.5">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--color-emerald,#042821)]">
                  {section.heading}
                </h2>
                {section.content.map((p, pIdx) => (
                  <p key={pIdx} className="text-sm sm:text-base text-[var(--color-ink,#29231D)]/85 leading-relaxed">
                    {p}
                  </p>
                ))}

                {section.callout && (
                  <div className="my-4 p-4 rounded-2xl bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-gold,#C7982F)]">
                      <Sparkles size={14} />
                      <span>{section.callout.title}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)] font-medium">
                      {section.callout.text}
                    </p>
                  </div>
                )}
              </section>
            ))}

            {/* Citations & Sources */}
            {currentArticle.sources && currentArticle.sources.length > 0 && (
              <div className="pt-6 border-t border-[var(--color-gold,#C7982F)]/20 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold,#C7982F)] block">
                  Reference Sources & Industry Standards
                </span>
                <ul className="text-xs text-[var(--color-ink,#29231D)]/60 space-y-1 list-disc list-inside">
                  {currentArticle.sources.map((s, sIdx) => (
                    <li key={sIdx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Related Products Strip */}
          {relatedProducts.length > 0 && (
            <div className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold,#C7982F)] block">
                    Featured In This Article
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-[var(--color-emerald,#042821)]">
                    Relevant Harvest Selections
                  </h3>
                </div>
                <Link
                  to="/shop"
                  className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold,#C7982F)] hover:underline inline-flex items-center gap-1"
                >
                  <span>View All Shop</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedProducts.map((p) => {
                  const firstPrice = Object.values(p.prices)[0] || p.price || 0;
                  const firstWeight = Object.keys(p.prices)[0] || '500g';
                  const isAdded = addedProductId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/25 flex flex-col justify-between space-y-3 shadow-xs hover:border-[var(--color-gold,#C7982F)] transition-all group"
                    >
                      <Link to={`/product/${p.id}`} className="space-y-2.5 block">
                        <div className="aspect-square rounded-xl overflow-hidden bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20 p-2">
                          <img
                            src={getProductImage(p)}
                            alt={t(`imageAlt.${p.id}`, p.name)}
                            width={960}
                            height={960}
                            className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <h4 className="text-xs font-bold font-serif text-[var(--color-ink,#29231D)] line-clamp-2">
                          {p.name}
                        </h4>
                        <p className="text-xs font-bold text-[var(--color-emerald,#042821)]">
                          Rs. {firstPrice.toLocaleString()} <span className="text-[10px] text-[var(--color-ink,#29231D)]/60 font-normal">({firstWeight})</span>
                        </p>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleQuickAdd(p.id)}
                        disabled={isAdded}
                        className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isAdded
                            ? 'bg-[var(--color-gold,#C7982F)] text-white'
                            : 'bg-[var(--color-emerald,#042821)] text-[var(--color-surface,#FFFCF7)] hover:bg-[#03201A]'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={13} />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={13} className="text-[var(--color-gold,#C7982F)]" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next/Previous Article Suggestion */}
          <div className="pt-8 border-t border-[var(--color-gold,#C7982F)]/25 flex items-center justify-between">
            <Link
              to="/journal"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] border border-[var(--color-gold,#C7982F)]/30 hover:border-[var(--color-gold,#C7982F)] transition-colors shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>More Articles</span>
            </Link>

            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--color-emerald,#042821)] text-[var(--color-surface,#FFFCF7)] hover:bg-[#03201A] transition-colors shadow-xs"
            >
              <span>Explore Boutique</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // ── JOURNAL OVERVIEW LIST VIEW ───────────────────────────────────────────
  const featuredArticle = JOURNAL_ARTICLES[0];
  const gridArticles = filteredArticles.filter(a => searchQuery.trim() ? true : a.slug !== featuredArticle.slug);

  return (
    <div className="w-full bg-[var(--color-base,#F6F1EA)] pt-6 sm:pt-10 pb-24 text-[var(--color-ink,#29231D)]">
      <SEO
        title="The Harvest Chronicle — Dry Fruit Storage, Nutrition & Culinary Guides"
        description="Comprehensive guides from AllBarka: choosing nut pack sizes, warm-climate storage science, Lahori tea-time pairings, allergen safety, and luxury gifting."
        canonicalPath="/journal"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Hero Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-gold,#C7982F)] block">
            AllBarka Editorial & Education
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[var(--color-emerald,#042821)]">
            The Harvest Chronicle
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)]/75 leading-relaxed">
            Practical buying guides, storage science for warm climates, culinary traditions, and ingredient disclosures to help you savor every harvest lot.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 border-y border-[var(--color-gold,#C7982F)]/25">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs'
                    : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-gold,#C7982F)]/15 border border-[var(--color-gold,#C7982F)]/25'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-4 py-2 rounded-full text-xs bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 focus:border-[var(--color-gold,#C7982F)] outline-hidden text-[var(--color-ink,#29231D)]"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--color-ink,#29231D)]/40" />
          </div>
        </div>

        {/* Featured Hero Article (if not searching) */}
        {!searchQuery.trim() && selectedCategory === 'All' && (
          <div className="rounded-3xl bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 overflow-hidden shadow-sm hover:border-[var(--color-gold,#C7982F)] transition-all group">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div className="lg:col-span-7 aspect-[16/10] lg:aspect-auto overflow-hidden bg-[var(--color-base,#F6F1EA)]">
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  width={960}
                  height={960}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
              </div>

              <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)]">
                      Featured Guide
                    </span>
                    <span className="text-xs text-[var(--color-ink,#29231D)]/60">{featuredArticle.readTime}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-emerald,#042821)] leading-tight group-hover:text-[var(--color-gold,#C7982F)] transition-colors">
                    <Link to={`/journal/${featuredArticle.slug}`}>
                      {featuredArticle.title}
                    </Link>
                  </h2>

                  <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)]/75 leading-relaxed">
                    {featuredArticle.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--color-gold,#C7982F)]/20 flex items-center justify-between">
                  <span className="text-xs text-[var(--color-ink,#29231D)]/60 font-medium">
                    {featuredArticle.publishedDate}
                  </span>
                  <Link
                    to={`/journal/${featuredArticle.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-emerald,#042821)] group-hover:text-[var(--color-gold,#C7982F)] transition-colors"
                  >
                    <span>Read Article</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {gridArticles.map((article) => (
            <div
              key={article.slug}
              className="rounded-3xl bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/25 overflow-hidden shadow-xs hover:border-[var(--color-gold,#C7982F)] hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <Link to={`/journal/${article.slug}`} className="block aspect-[16/10] overflow-hidden bg-[var(--color-base,#F6F1EA)]">
                  <img
                    src={article.image}
                    alt={article.title}
                    width={960}
                    height={960}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>

                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--color-ink,#29231D)]/60">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-base,#F6F1EA)] text-[var(--color-gold,#C7982F)] border border-[var(--color-gold,#C7982F)]/20">
                      {article.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{article.readTime}</span>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-emerald,#042821)] leading-snug group-hover:text-[var(--color-gold,#C7982F)] transition-colors">
                    <Link to={`/journal/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h3>

                  <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)]/70 line-clamp-3 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 border-t border-[var(--color-gold,#C7982F)]/15 flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-ink,#29231D)]/50">
                  {article.publishedDate}
                </span>
                <Link
                  to={`/journal/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-emerald,#042821)] group-hover:text-[var(--color-gold,#C7982F)] transition-colors"
                >
                  <span>Read</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredArticles.length === 0 && (
          <div className="py-16 text-center space-y-4">
            <BookOpen size={32} className="mx-auto text-[var(--color-gold,#C7982F)]" />
            <h3 className="text-lg font-serif font-bold text-[var(--color-ink,#29231D)]">
              No articles match your query
            </h3>
            <p className="text-xs text-[var(--color-ink,#29231D)]/70">
              Try searching with a different term or resetting the category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--color-emerald,#042821)] text-[var(--color-surface,#FFFCF7)]"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
