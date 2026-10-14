import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CANONICAL_CATEGORIES } from '../config/categories';

interface MenuItem { id: string; label: string; path: string; dropdownItems?: { id: string; label: string; path: string }[] }
interface BubbleMenuProps { items?: MenuItem[]; activeItem?: string; onItemClick?: (item: { id: string; label: string; path: string }) => void; className?: string }
export default function BubbleMenu({ items, activeItem = 'Home', onItemClick, className = '' }: BubbleMenuProps) {
  const { t, isRtl } = useLanguage(); const [open, setOpen] = useState<string | null>(null); const toggles = useRef(new Map<string, HTMLButtonElement>());
  const defaults: MenuItem[] = [{ id: 'Home', label: t('home'), path: '/' }, { id: 'Shop', label: t('shop'), path: '/shop', dropdownItems: [{ id: 'all', label: t('allProducts'), path: '/shop' }, ...Object.keys(CANONICAL_CATEGORIES).map(id => ({ id, label: t(`shop.${id}`), path: `/shop/${id}` }))] },
    { id: 'Herbs & Spices', label: t('catalog.navHerbs'), path: '/shop/herbs-spices' }, { id: 'Gift Boxes', label: t('giftBoxes'), path: '/gifting' }, { id: 'Journal', label: t('journal'), path: '/journal' }, { id: 'Contact', label: t('contact'), path: '/pages/contact' }];
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, item: MenuItem | NonNullable<MenuItem['dropdownItems']>[number]) => {
    setOpen(null); if (onItemClick && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onItemClick(item); }
  };
  return <nav aria-label={t('nav.main')} dir={isRtl ? 'rtl' : 'ltr'} className={`pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--color-border-accent)] bg-[var(--color-surface)]/95 px-2 py-1 shadow-sm ${className}`}>
    {(items?.length ? items : defaults).map(item => {
      const active = activeItem === item.id || activeItem === item.label; const expanded = open === item.id; const panelId = `navigation-collections-${item.id.replace(/\W/g, '-')}`;
      return <div key={item.id} className={`relative items-center ${item.id === 'Herbs & Spices' ? 'hidden 2xl:flex' : 'flex'}`} onMouseEnter={() => item.dropdownItems && setOpen(item.id)} onMouseLeave={event => { if (!event.currentTarget.contains(document.activeElement)) setOpen(null); }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(null); }} onKeyDown={event => {
        if (event.key === 'Escape' && expanded) { event.preventDefault(); setOpen(null); toggles.current.get(item.id)?.focus(); }
        if (event.key === 'ArrowDown' && event.target === toggles.current.get(item.id)) { event.preventDefault(); setOpen(item.id); requestAnimationFrame(() => document.getElementById(panelId)?.querySelector<HTMLAnchorElement>('a')?.focus()); }
      }}>
        <Link to={item.path} data-nav-path={item.path} aria-current={active ? 'page' : undefined} onClick={event => navigate(event, item)} className={`focus-ring relative inline-flex min-h-11 items-center rounded-full px-2.5 text-[11px] font-medium uppercase tracking-[0.05em] transition-colors ${active ? 'bg-[var(--color-gold)]/15 font-semibold text-[var(--color-ink)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-gold)]/10 hover:text-[var(--color-ink)]'}`}>{item.label}</Link>
        {item.dropdownItems && <><button ref={node => { if (node) toggles.current.set(item.id, node); else toggles.current.delete(item.id); }} type="button" aria-label={t('experience.nav.collections')} aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? null : item.id)} className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-full text-[var(--color-accent-text)]"><ChevronDown size={14} aria-hidden="true" /></button>{expanded && <div id={panelId} className="absolute start-0 top-full z-50 flex min-w-[230px] flex-col rounded-2xl border border-[var(--color-border-accent)] bg-[var(--color-surface)] p-2 shadow-xl"><span className="px-3 py-2 text-xs font-semibold text-[var(--color-accent-text)]">{t('nav.browse')}</span>{item.dropdownItems.map(child => <Link key={child.id} to={child.path} onClick={event => navigate(event, child)} className="focus-ring flex min-h-11 items-center rounded-lg px-3 text-sm text-[var(--color-ink)] hover:bg-[var(--color-gold)]/10">{child.label}</Link>)}</div>}</>}
      </div>;
    })}
  </nav>;
}
