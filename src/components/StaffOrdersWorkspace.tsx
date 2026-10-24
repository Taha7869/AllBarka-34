import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Eye, LockKeyhole, Package, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminLanguage } from '../hooks/useAdminLanguage';
import { staffRequest } from '../lib/adminClient';
import type { StaffLedger, StaffOrder } from '../lib/staffContracts';
import { formatAdminCurrency, formatAdminDate } from '../lib/adminPresentation';
import AdminWorkspaceDialog from './AdminWorkspaceDialog';
import SEO from './SEO';
import { PRODUCTS } from '../data/products';
import { getLocalized } from '../utils/localize';
import '../styles/admin.css';
import '../styles/staff.css';
const statuses=['ORDER_RECEIVED','CONFIRMED','PREPARING','DISPATCHED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','QUOTE_REQUESTED'];

export default function StaffOrdersWorkspace() {
  const {currentUser,loading:authLoading}=useAuth();const {t,language,setLanguage,isRtl}=useAdminLanguage();
  const [ledger,setLedger]=useState<{owner:string;data:StaffLedger}|null>(null);const [detail,setDetail]=useState<{owner:string;data:StaffOrder}|null>(null);
  const [selected,setSelected]=useState<string|null>(null);const [status,setStatus]=useState('ALL');const [range,setRange]=useState('30d');
  const [searchDraft,setSearchDraft]=useState('');const [search,setSearch]=useState('');const [page,setPage]=useState(1);
  const [revision,setRevision]=useState(0);const [loading,setLoading]=useState(true);const [detailLoading,setDetailLoading]=useState(false);const [error,setError]=useState('');
  const owner=currentUser?.uid;
  useEffect(()=>{
    const focus=()=>{if(!document.hidden)setRevision(v=>v+1);};const timer=setInterval(focus,30000);window.addEventListener('focus',focus);
    return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();setError('');setLoading(true);
    if(!currentUser){setLedger(null);setDetail(null);setSelected(null);setLoading(false);return;}
    const query=new URLSearchParams({page:String(page),limit:'20',status,range,search});
    staffRequest<StaffLedger>(()=>currentUser.getIdToken(),`/api/staff/orders?${query}`,{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted)setLedger({owner:currentUser.uid,data});})
      .catch(e=>{if(!controller.signal.aborted){setError(e.code||'REQUEST_FAILED');setLedger(null);setDetail(null);setSelected(null);}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[currentUser,page,status,range,search,revision]);
  useEffect(()=>{
    const controller=new AbortController();setDetail(null);setDetailLoading(!!selected);
    if(!currentUser||!selected)return;
    staffRequest<{order:StaffOrder}>(()=>currentUser.getIdToken(),`/api/staff/orders/${encodeURIComponent(selected)}`,{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted)setDetail({owner:currentUser.uid,data:data.order});})
      .catch(e=>{if(!controller.signal.aborted){setError(e.code||'REQUEST_FAILED');setDetail(null);if(['STAFF_ACCESS_DENIED','UNAUTHORIZED','AUTHENTICATION_REQUIRED'].includes(e.code)){setLedger(null);setSelected(null);}}})
      .finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});
    return()=>controller.abort();
  },[currentUser,selected,revision]);
  const rows=ledger?.owner===owner?ledger.data:null;const order=detail?.owner===owner?detail.data:null;
  const languageChoice=<label className="admin-language"><span className="sr-only">{t('language')}</span><select aria-label={t('language')} value={language} onChange={e=>setLanguage(e.target.value as any)}><option value="en">English</option><option value="ur">اردو</option><option value="ar">العربية</option></select></label>;
  const restricted=!currentUser||['STAFF_ACCESS_DENIED','FORBIDDEN_ADMIN','UNAUTHORIZED','AUTHENTICATION_REQUIRED'].includes(error);
  if(authLoading)return <div className="admin-access"><p role="status">{t('admin.checking')}</p></div>;
  if(restricted)return <div className="admin-access" dir={isRtl?'rtl':'ltr'}><SEO title={t('staff.workspace')}/><section className="admin-access-card"><LockKeyhole size={28}/><p className="admin-eyebrow">AllBarka</p><h1>{t('staff.workspace')}</h1><h2>{t(currentUser?'staff.restricted':'admin.signIn')}</h2><p>{t('staff.accessHint')}</p><div className="staff-toolbar">{languageChoice}<button className="admin-button admin-button-primary" type="button" onClick={()=>currentUser?setRevision(v=>v+1):window.dispatchEvent(new CustomEvent('open-auth-modal',{detail:{mode:'signin'}}))}>{t(currentUser?'admin.retry':'admin.signIn')}</button><Link className="admin-button" to="/">{t('admin.returnStore')}</Link></div></section></div>;
  return <main className="staff-workspace" dir={isRtl?'rtl':'ltr'}><SEO title={t('staff.workspace')}/>
    <header className="staff-masthead"><div className="staff-masthead-copy"><p className="staff-kicker">{t('staff.eyebrow')}</p><h1>{t('staff.title')}</h1><p>{t('staff.hint')}</p><span className="staff-permission"><ShieldCheck size={15}/>{t('staff.readOnly')}</span></div><div className="staff-header-tools">{languageChoice}<Link to="/" className="staff-store-link">{t('admin.returnStore')}<ArrowRight size={15}/></Link></div></header>
    <section className="staff-ledger" aria-label={t('admin.orders')}><div className="staff-ledger-heading"><div><p className="admin-eyebrow">{t('staff.workspace')}</p><h2>{t('admin.orders')}</h2></div><button className="admin-button" type="button" disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/>{t('admin.refresh')}</button></div>
      <div className="staff-filters"><form className="staff-search" onSubmit={e=>{e.preventDefault();setSearch(searchDraft.trim());setPage(1);}}><label><span className="sr-only">{t('staff.search')}</span><input type="search" maxLength={120} value={searchDraft} onChange={e=>setSearchDraft(e.target.value)} placeholder={t('admin.searchHint')}/></label><button className="admin-icon-button" type="submit" aria-label={t('staff.search')}><Search size={17}/></button></form>
        <label className="admin-filter"><span>{t('staff.filter')}</span><select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="ALL">{t('admin.all')}</option>{statuses.map(s=><option key={s} value={s}>{t(`admin.status.${s}`)}</option>)}</select></label>
        <label className="admin-filter"><span>{t('admin.range')}</span><select value={range} onChange={e=>{setRange(e.target.value);setPage(1);}}>{['all','today','7d','30d'].map(s=><option key={s} value={s}>{t(s==='all'?'admin.all':s==='today'?'admin.today':s==='7d'?'admin.sevenDays':'admin.thirtyDays')}</option>)}</select></label>
      </div>
      {error&&<p className="admin-notice admin-notice-error" role="alert">{t('staff.error')}</p>}
      {rows?.truncated&&<p className="admin-notice">{t('staff.limited')}</p>}
      {loading&&<p className="staff-loading" role="status">{t('staff.loading')}</p>}
      {!loading&&rows?.orders.length===0&&<div className="staff-empty"><Package size={28}/><p>{t('staff.empty')}</p></div>}
      <div className="staff-order-list">{rows?.orders.map(item=><article key={item.orderId} className="staff-order-row"><div className="staff-order-id"><span className="admin-eyebrow">{t('admin.table.order')}</span><strong><bdi>{item.orderId}</bdi></strong><time>{formatAdminDate(item.createdAt,language)}</time></div><div><strong>{item.customer.name}</strong><p>{item.customer.city}</p></div><div><span className="admin-badge admin-badge-pending">{t(`admin.status.${item.status}`,item.status)}</span><p>{t(`admin.payment.${item.paymentStatus}`,item.paymentStatus)}</p></div><bdi className="staff-order-total">{item.isQuoteRequest?t('admin.status.QUOTE_REQUESTED'):formatAdminCurrency(item.totals.total)}</bdi><button type="button" className="admin-button" onClick={()=>setSelected(item.orderId)}><Eye size={16}/>{t('staff.details')}</button></article>)}</div>
      {rows&&<footer className="staff-pagination"><p>{t('staff.page')} <bdi>{rows.page}{rows.totalPages?` / ${rows.totalPages}`:''}</bdi></p><div><button type="button" className="admin-icon-button" aria-label={t('admin.previous')} disabled={loading||page<=1} onClick={()=>setPage(v=>v-1)}><ChevronLeft size={18}/></button><button type="button" className="admin-icon-button" aria-label={t('admin.next')} disabled={loading||!rows.hasMore} onClick={()=>setPage(v=>v+1)}><ChevronRight size={18}/></button></div></footer>}
    </section>
    {selected&&<AdminWorkspaceDialog title={selected} onClose={()=>setSelected(null)}><div className="staff-order-detail" dir={isRtl?'rtl':'ltr'}>{detailLoading?<p role="status">{t('staff.loading')}</p>:order?<><span className="staff-read-note"><ShieldCheck size={15}/>{t('staff.readOnly')}</span><div className="staff-detail-grid"><section><h3>{t('admin.detail.customer')}</h3><strong>{order.customer.name}</strong><p><bdi>{order.customer.phone}</bdi></p><p>{order.customer.address}</p><p>{order.customer.city}</p></section><section><h3>{t('admin.detail.delivery')}</h3><p>{order.deliveryDate||'—'}</p><p>{order.customer.deliverySlot}</p><p>{order.customer.instructions}</p></section></div><section><h3>{t('admin.table.items')}</h3>{order.items.map((item,index)=><article className="staff-detail-item" key={index}><div><strong>{item.name}</strong><p><bdi>{item.selectedWeight} × {item.quantity}</bdi></p>{item.hamper&&<><ul>{item.hamper.selections.map(id=><li key={id}>{getLocalized(PRODUCTS.find(p=>p.id===id),'name',language)||id}</li>)}</ul><p>{item.hamper.recipientName}</p><p>{item.hamper.giftMessage}</p></>}</div><bdi>{order.isQuoteRequest?'—':formatAdminCurrency(item.price*item.quantity)}</bdi></article>)}</section>{(order.gifting.giftMessage||order.gifting.giftWrapping)&&<section><h3>{t('staff.gift')}</h3><p>{order.gifting.giftWrapping?t('giftWrapping'):''}</p><p>{order.gifting.giftMessage}</p></section>}<section className="staff-detail-total"><span>{t('admin.table.total')}</span><strong><bdi>{order.isQuoteRequest?t('admin.status.QUOTE_REQUESTED'):formatAdminCurrency(order.totals.total)}</bdi></strong></section></>:<p role="alert">{t('staff.error')}</p>}</div></AdminWorkspaceDialog>}
  </main>;
}
