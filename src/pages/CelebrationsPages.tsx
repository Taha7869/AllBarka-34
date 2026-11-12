import React from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SEO from '../components/SEO';
import ShopPage from './ShopPage';
import { useLanguage } from '../contexts/LanguageContext';
import { openOccasionInquiryModal } from '../components/OccasionInquiryModal';
import { normalizeOccasionSlug } from '../config/categories';
import {
  CELEBRATION_BRANCHES, PACKAGING_FORMATS,
  type CelebrationBranch, type CelebrationDesign, type CelebrationOccasion, type LegacyOccasionId, type Localized,
  designsForFormat, designsForOccasion, displayName, getBranch, getDesign, getFormat, getOccasion,
  isFormatPublished, isOccasionPublished, localized, occasionsInBranch, rangesInBranch,
  resolveFormatSlug, resolveOccasionRoute,
} from '../config/celebrations';

/**
 * Celebrations storefront pages: the occasions hub, one occasion, the packaging hub,
 * one packaging format and one design. All content comes from src/config/celebrations.ts.
 * Nothing here has a price; a design is chosen through the existing enquiry flow.
 */

const LEGACY: { id: LegacyOccasionId; key: string }[] = [
  { id: 'wedding', key: 'dest.occasions.wedding' },
  { id: 'umrah', key: 'dest.occasions.umrah' },
  { id: 'ramadan', key: 'dest.occasions.ramadan' },
  { id: 'birth', key: 'dest.occasions.birth' },
  { id: 'corporate', key: 'dest.occasions.corporate' },
];

/** Owner review switch: "?preview=concepts" shows unpublished designs on that page only. */
function usePreview() {
  const [params] = useSearchParams();
  return params.get('preview') === 'concepts';
}

function Shell({ children }: { children: React.ReactNode }) {
  const { isRtl } = useLanguage();
  return <div className="celeb" dir={isRtl ? 'rtl' : 'ltr'}><div className="celeb-inner">{children}</div></div>;
}

/** Signature name in the reader's language with the other script set beside it. */
function TwoScript({ value, as: Tag = 'span' }: { value: Localized; as?: 'span' | 'h1' | 'h2' }) {
  const { language } = useLanguage();
  const partner = language === 'en' ? value.ur : value.en;
  return (
    <Tag className="celeb-two-script">
      <span>{localized(value, language)}</span>
      {partner && partner !== localized(value, language) && (
        <span className={language === 'en' ? 'celeb-script-ur' : 'celeb-script-en'} lang={language === 'en' ? 'ur' : 'en'} aria-hidden="true">{partner}</span>
      )}
    </Tag>
  );
}

function PageHeader({ eyebrow, title, plain, lead, back }: { eyebrow: string; title: React.ReactNode; plain?: string; lead?: string; back?: { to: string; label: string } }) {
  return (
    <header className="celeb-header">
      {back && <Link to={back.to} className="celeb-back focus-ring">{back.label}</Link>}
      <p className="celeb-eyebrow">{eyebrow}</p>
      {title}
      {plain && <p className="celeb-plain">{plain}</p>}
      {lead && <p className="celeb-lead">{lead}</p>}
    </header>
  );
}

function ModeTabs({ active }: { active: 'occasion' | 'packaging' }) {
  const { t } = useLanguage();
  return (
    <nav className="celeb-tabs" aria-label={t('celeb.eyebrow')}>
      <Link to="/occasions" className="focus-ring" aria-current={active === 'occasion' ? 'page' : undefined}>{t('celeb.byOccasion')}</Link>
      <Link to="/packaging" className="focus-ring" aria-current={active === 'packaging' ? 'page' : undefined}>{t('celeb.byPackaging')}</Link>
    </nav>
  );
}

function PreviewNote() {
  const { t } = useLanguage();
  return <p className="celeb-preview-note" role="note">{t('celeb.previewNote')}</p>;
}

function EnquiryActions({ branch, primary = 'celeb.requestAction', secondary }: { branch?: CelebrationBranch; primary?: string; secondary?: string }) {
  const { t } = useLanguage();
  const event = branch?.inquiryEvent;
  return (
    <div className="celeb-actions">
      {event
        ? <button type="button" className="celeb-button focus-ring" onClick={() => openOccasionInquiryModal(event)}>{t(primary)}</button>
        : <Link to="/contact" className="celeb-button focus-ring">{t(primary === 'celeb.requestAction' ? 'celeb.contactAction' : primary)}</Link>}
      {secondary && (event
        ? <button type="button" className="celeb-button celeb-button-quiet focus-ring" onClick={() => openOccasionInquiryModal(event)}>{t(secondary)}</button>
        : <Link to="/contact" className="celeb-button celeb-button-quiet focus-ring">{t(secondary)}</Link>)}
    </div>
  );
}

function RequestPanel({ title, branch }: { title: string; branch?: CelebrationBranch }) {
  const { t } = useLanguage();
  return (
    <section className="celeb-request">
      <h2>{title}</h2>
      <p>{t('celeb.requestCopy')}</p>
      <EnquiryActions branch={branch} />
      {branch?.legacyOccasion && (
        <Link to={`/occasions?occasion=${branch.legacyOccasion}`} className="celeb-text-link focus-ring">
          {t('celeb.readyRange')} <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

function DesignArt({ design }: { design: CelebrationDesign }) {
  const { t } = useLanguage();
  if (design.image) return <img src={design.image} alt={design.name} width={1280} height={1600} loading="lazy" decoding="async" />;
  return (
    <div className="celeb-art-pending" role="img" aria-label={`${design.name}: ${t('celeb.imagePending')}`}>
      <div className="celeb-art-swatches" aria-hidden="true">{design.palette.map(colour => <span key={colour.hex} style={{ background: colour.hex }} />)}</div>
      <span>{t('celeb.imagePending')}</span>
    </div>
  );
}

function DesignCard({ design, preview }: { design: CelebrationDesign; preview: boolean }) {
  const { t, language } = useLanguage();
  const to = `/designs/${design.slug}${preview ? '?preview=concepts' : ''}`;
  return (
    <article className="celeb-design-card">
      <Link to={to} className="celeb-design-media focus-ring" aria-label={`${t('celeb.viewDesign')}: ${design.name}`}>
        <DesignArt design={design} />
        {!design.publishApproved && <span className="celeb-flag">{t('celeb.notPublished')}</span>}
      </Link>
      <div className="celeb-design-body">
        <h3><Link to={to} className="focus-ring">{design.name}</Link></h3>
        <p className="celeb-chips">{design.formats.map(slug => getFormat(slug)).filter(Boolean).map(format => <span key={format!.slug}>{localized(format!.plain, language)}</span>)}</p>
        {design.status === 'concept' && <p className="celeb-concept">{t('celeb.concept')}</p>}
      </div>
    </article>
  );
}

/* ── /occasions ─────────────────────────────────────────────────────────── */

function OccasionLink({ occasion }: { occasion: CelebrationOccasion }) {
  const { t, language } = useLanguage();
  const ready = isOccasionPublished(occasion.slug);
  return (
    <li>
      <Link to={`/occasions/${occasion.slug}`} className="celeb-occasion focus-ring">
        <span className="celeb-occasion-name">{localized(occasion.signature, language)}</span>
        <span className="celeb-occasion-plain">{localized(occasion.plain, language)}</span>
        <span className={`celeb-state${ready ? ' is-ready' : ''}`}>{t(ready ? 'celeb.designsReady' : 'celeb.request')}</span>
      </Link>
    </li>
  );
}

export function CelebrationsHubPage() {
  const { t, language } = useLanguage();
  return (
    <Shell>
      <SEO title={t('celeb.hubTitle')} description={t('celeb.hubLead')} canonicalPath="/occasions" />
      <PageHeader eyebrow={t('celeb.eyebrow')} title={<h1 className="celeb-title">{t('celeb.hubTitle')}</h1>} lead={t('celeb.hubLead')} />
      <ModeTabs active="occasion" />

      <section className="celeb-ready" aria-labelledby="celeb-ready-title">
        <div><h2 id="celeb-ready-title">{t('celeb.readyNow')}</h2><p>{t('celeb.readyNowLead')}</p></div>
        <ul>{LEGACY.map(item => <li key={item.id}><Link to={`/occasions?occasion=${item.id}`} className="focus-ring">{t(item.key)} <ArrowUpRight size={14} aria-hidden="true" /></Link></li>)}</ul>
      </section>

      <nav className="celeb-jump" aria-label={t('celeb.jump')}>
        {CELEBRATION_BRANCHES.map(branch => <a key={branch.slug} href={`#${branch.slug}`} className="focus-ring">{localized(branch.plain, language)}</a>)}
      </nav>

      {CELEBRATION_BRANCHES.map(branch => {
        const occasions = occasionsInBranch(branch.slug);
        const ranges = rangesInBranch(branch.slug);
        return (
          <section key={branch.slug} id={branch.slug} className="celeb-branch" aria-labelledby={`${branch.slug}-title`}>
            <div className="celeb-branch-head">
              <h2 id={`${branch.slug}-title`}><TwoScript value={branch.signature} /></h2>
              <p>{localized(branch.plain, language)}</p>
            </div>
            <div className="celeb-branch-body">
              {occasions.length > 0 && <ul className="celeb-occasions">{occasions.map(occasion => <OccasionLink key={occasion.slug} occasion={occasion} />)}</ul>}
              {branch.slug === 'event-accessories' && (
                <ul className="celeb-occasions">
                  {PACKAGING_FORMATS.filter(format => format.group === 'accessory').map(format => (
                    <li key={format.slug}><Link to={`/packaging/${format.slug}`} className="celeb-occasion focus-ring"><span className="celeb-occasion-name">{localized(format.plain, language)}</span></Link></li>
                  ))}
                </ul>
              )}
              {ranges.length > 0 && (
                <p className="celeb-ranges"><strong>{t('celeb.ranges')}</strong>{ranges.map(range => <span key={range.slug}>{localized(range.plain, language)}</span>)}</p>
              )}
            </div>
          </section>
        );
      })}
    </Shell>
  );
}

/** "/occasions": the hub, unless the address carries the existing listing's filters. */
export function OccasionsIndexRoute() {
  const [params] = useSearchParams();
  if (params.has('occasion') || params.has('category') || params.has('filter')) return <ShopPage />;
  return <CelebrationsHubPage />;
}

/* ── /occasions/:occasion ───────────────────────────────────────────────── */

function OccasionHeader({ occasion, branch }: { occasion: CelebrationOccasion; branch?: CelebrationBranch }) {
  const { t, language } = useLanguage();
  return (
    <PageHeader
      back={{ to: `/occasions#${occasion.branch}`, label: t('celeb.backHub') }}
      eyebrow={branch ? localized(branch.plain, language) : t('celeb.eyebrow')}
      title={<TwoScript as="h1" value={occasion.signature} />}
      plain={localized(occasion.plain, language)}
    />
  );
}

export function OccasionRoute() {
  const { occasion: raw = '' } = useParams<{ occasion: string }>();
  const { t, language } = useLanguage();
  const preview = usePreview();
  const location = useLocation();
  const route = resolveOccasionRoute(raw, normalizeOccasionSlug(raw), preview);

  if (route.kind === 'unknown') return <ShopPage />;

  if (route.kind === 'legacy') {
    return (
      <>
        {route.occasion && (
          <aside className="celeb-context" dir={language === 'en' ? 'ltr' : 'rtl'}>
            <p><strong>{displayName(route.occasion, language)}</strong> {t('celeb.contextNote')}</p>
            <EnquiryActions branch={getBranch(route.occasion.branch)} />
          </aside>
        )}
        <ShopPage />
      </>
    );
  }

  if (route.redirectTo) return <Navigate to={`${route.redirectTo}${location.search}`} replace />;

  const { occasion } = route;
  const branch = getBranch(occasion.branch);
  const title = displayName(occasion, language);

  if (route.kind === 'request') {
    return (
      <Shell>
        <SEO title={title} description={t('celeb.requestCopy')} canonicalPath={`/occasions/${occasion.slug}`} noindex />
        <OccasionHeader occasion={occasion} branch={branch} />
        <RequestPanel title={t('celeb.requestTitle')} branch={branch} />
      </Shell>
    );
  }

  const designs = designsForOccasion(occasion.slug, preview);
  const published = isOccasionPublished(occasion.slug);
  return (
    <Shell>
      <SEO title={title} description={t('celeb.hubLead')} canonicalPath={`/occasions/${occasion.slug}`} noindex={!published} />
      <OccasionHeader occasion={occasion} branch={branch} />
      {!published && <PreviewNote />}
      <section aria-labelledby="celeb-designs-title">
        <h2 id="celeb-designs-title" className="celeb-section-title">{t('celeb.designs')}</h2>
        <div className="celeb-design-grid">{designs.map(design => <DesignCard key={design.slug} design={design} preview={preview} />)}</div>
      </section>
      <section className="celeb-request is-compact">
        <h2>{t('celeb.custom')}</h2>
        <p>{t('celeb.requestCopy')}</p>
        <EnquiryActions branch={branch} />
      </section>
    </Shell>
  );
}

/* ── /packaging and /packaging/:format ──────────────────────────────────── */

export function PackagingHubPage() {
  const { t, language } = useLanguage();
  const group = (kind: 'packaging' | 'accessory', titleKey: string) => (
    <section className="celeb-branch" aria-labelledby={`celeb-${kind}`}>
      <div className="celeb-branch-head"><h2 id={`celeb-${kind}`}>{t(titleKey)}</h2></div>
      <div className="celeb-branch-body">
        <ul className="celeb-occasions">
          {PACKAGING_FORMATS.filter(format => format.group === kind).map(format => {
            const ready = isFormatPublished(format.slug);
            return (
              <li key={format.slug}>
                <Link to={`/packaging/${format.slug}`} className="celeb-occasion focus-ring">
                  <span className="celeb-occasion-name">{localized(format.plain, language)}</span>
                  <span className={`celeb-state${ready ? ' is-ready' : ''}`}>{t(ready ? 'celeb.designsReady' : 'celeb.request')}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
  return (
    <Shell>
      <SEO title={t('celeb.packTitle')} description={t('celeb.packLead')} canonicalPath="/packaging" />
      <PageHeader eyebrow={t('celeb.eyebrow')} title={<h1 className="celeb-title">{t('celeb.packTitle')}</h1>} lead={t('celeb.packLead')} />
      <ModeTabs active="packaging" />
      {group('packaging', 'celeb.packaging')}
      {group('accessory', 'celeb.accessories')}
    </Shell>
  );
}

export function PackagingFormatPage() {
  const { format: raw = '' } = useParams<{ format: string }>();
  const { t, language } = useLanguage();
  const preview = usePreview();
  const location = useLocation();
  const resolved = resolveFormatSlug(raw);
  if (!resolved) return <Navigate to="/packaging" replace />;
  if (resolved.viaAlias) return <Navigate to={`/packaging/${resolved.slug}${location.search}`} replace />;
  const format = getFormat(resolved.slug)!;
  const name = localized(format.plain, language);
  const designs = designsForFormat(format.slug, preview);
  const published = isFormatPublished(format.slug);
  return (
    <Shell>
      <SEO title={name} description={t('celeb.packLead')} canonicalPath={`/packaging/${format.slug}`} noindex={!published} />
      <PageHeader back={{ to: '/packaging', label: t('celeb.backPackaging') }} eyebrow={t(format.group === 'packaging' ? 'celeb.packaging' : 'celeb.accessories')} title={<h1 className="celeb-title">{name}</h1>} />
      {designs.length === 0 ? <RequestPanel title={t('celeb.formatRequestTitle')} /> : (
        <>
          {!published && <PreviewNote />}
          <section aria-labelledby="celeb-designs-title">
            <h2 id="celeb-designs-title" className="celeb-section-title">{t('celeb.designsIn')}</h2>
            <div className="celeb-design-grid">{designs.map(design => <DesignCard key={design.slug} design={design} preview={preview} />)}</div>
          </section>
        </>
      )}
    </Shell>
  );
}

/* ── /designs/:design ───────────────────────────────────────────────────── */

export function DesignPage() {
  const { design: raw = '' } = useParams<{ design: string }>();
  const { t, language } = useLanguage();
  const preview = usePreview();
  const design = getDesign(raw);
  if (!design) return <Navigate to="/occasions" replace />;
  const branch = getBranch(design.branch);
  const occasion = design.occasion ? getOccasion(design.occasion) : undefined;
  const visible = design.publishApproved || preview;

  if (!visible) {
    return (
      <Shell>
        <SEO title={design.name} description={t('celeb.requestCopy')} canonicalPath={`/designs/${design.slug}`} noindex />
        <PageHeader back={{ to: '/occasions', label: t('celeb.backHub') }} eyebrow={t('celeb.eyebrow')} title={<h1 className="celeb-title">{design.name}</h1>} />
        <RequestPanel title={t('celeb.requestTitle')} branch={branch} />
      </Shell>
    );
  }

  return (
    <Shell>
      <SEO title={design.name} description={t('celeb.concept')} canonicalPath={`/designs/${design.slug}`} noindex={!design.publishApproved} image={design.image || undefined} />
      {!design.publishApproved && <PreviewNote />}
      <div className="celeb-design-detail">
        <figure className="celeb-design-figure">
          <DesignArt design={design} />
          {design.status === 'concept' && <figcaption>{t('celeb.concept')}</figcaption>}
        </figure>
        <div className="celeb-design-info">
          <PageHeader
            back={occasion ? { to: `/occasions/${occasion.slug}${preview ? '?preview=concepts' : ''}`, label: localized(occasion.plain, language) } : { to: '/packaging', label: t('celeb.backPackaging') }}
            eyebrow={branch ? localized(branch.plain, language) : t('celeb.eyebrow')}
            title={<h1 className="celeb-title">{design.name}</h1>}
          />
          <dl className="celeb-facts">
            {occasion && <><dt>{t('celeb.designFor')}</dt><dd>{displayName(occasion, language)}</dd></>}
            <dt>{t('celeb.availableIn')}</dt>
            <dd className="celeb-chips">{design.formats.map(slug => getFormat(slug)).filter(Boolean).map(format => <Link key={format!.slug} to={`/packaging/${format!.slug}`} className="focus-ring">{localized(format!.plain, language)}</Link>)}</dd>
            <dt>{t('celeb.finishes')}</dt>
            <dd className="celeb-chips">{design.finishes.map(finish => <span key={finish}>{t(`celeb.finish.${finish}`)}</span>)}</dd>
            <dt>{t('celeb.palette')}</dt>
            <dd className="celeb-palette">{design.palette.map(colour => <span key={colour.hex}><i style={{ background: colour.hex }} aria-hidden="true" />{colour.name}</span>)}</dd>
          </dl>
          <EnquiryActions branch={branch} primary="celeb.select" secondary="celeb.personalise" />
        </div>
      </div>
    </Shell>
  );
}
