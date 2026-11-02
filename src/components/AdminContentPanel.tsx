import {useEffect,useState,useRef} from 'react';
import {createPortal} from 'react-dom';
import {ArrowDown,ArrowUp,Eye,Save,Upload,RotateCcw,Monitor,Smartphone,Tablet,History,X,Lock,BookOpen,Compass,HelpCircle,Home} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {useAdminLanguage} from '../hooks/useAdminLanguage';
import {useStorefrontContentRefresh,StorefrontContentProvider} from '../contexts/StorefrontContentContext';
import {adminRequest} from '../lib/adminClient';
import {blankText,contentText,type StorefrontContent,type LocalText} from '../lib/storefrontContent';
import {contentJournal} from '../lib/contentPresentation';
import {MAIN_NAV_ITEMS} from '../config/navigation';
import {JOURNAL_ARTICLES} from '../data/articles';
import {getKarachiTime} from '../lib/deliveryCalendar';
import {ItemField} from './AdminItemField';
import AdminDelimitedInput from './AdminDelimitedInput';
import FAQSection from './FAQSection';
import StorefrontBanner from './StorefrontBanner';
import '../styles/premium-content.css';
type Bundle={revision:number;liveRevision:number;draft:StorefrontContent;live:StorefrontContent};
function StorefrontPreviewViewport({
  device,
  children,
}: {
  device: 'desktop' | 'tablet' | 'mobile';
  children: React.ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head><body class="bg-[#FAF9F5] text-[#120F17] antialiased m-0 p-3 font-sans"><div id="preview-mount"></div></body></html>');
    doc.close();

    // Copy host stylesheets and style elements into iframe head so responsive utility classes & custom CSS apply
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
      doc.head.appendChild(node.cloneNode(true));
    });

    const root = doc.getElementById('preview-mount');
    if (root) setMountNode(root);
  }, []);

  const targetWidth = device === 'mobile' ? '390px' : device === 'tablet' ? '768px' : '100%';

  return (
    <iframe
      ref={iframeRef}
      title="Storefront Studio Preview"
      className="preview-storefront-iframe block mx-auto border-none transition-all duration-300 w-full"
      style={{
        width: targetWidth,
        maxWidth: targetWidth,
        minHeight: '620px',
        height: '100%',
      }}
    >
      {mountNode ? createPortal(children, mountNode) : null}
    </iframe>
  );
}

export default function AdminContentPanel({onDirtyChange}:{onDirtyChange?:(dirty:boolean)=>void}={}){
  const {currentUser}=useAuth();const {t,language,isRtl}=useAdminLanguage();const refresh=useStorefrontContentRefresh();
  const [bundle,setBundle]=useState<Bundle|null>(null);const [draft,setDraft]=useState<StorefrontContent|null>(null);
  const [owner,setOwner]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [dirty,setDirty]=useState(false);const [preview,setPreview]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [previewDevice,setPreviewDevice]=useState<'desktop'|'tablet'|'mobile'>('desktop');const [previewVersion,setPreviewVersion]=useState<'draft'|'live'>('draft');const [previewSurface,setPreviewSurface]=useState<'home'|'journal'|'faq'>('home');
  const [historyModal,setHistoryModal]=useState(false);const [historyList,setHistoryList]=useState<any[]>([]);const [historyLoading,setHistoryLoading]=useState(false);
  useEffect(()=>{const controller=new AbortController();setBundle(null);setDraft(null);setLoading(true);if(!currentUser){setLoading(false);return;}adminRequest<Bundle>(()=>currentUser.getIdToken(),'/api/admin/storefront-content',{signal:controller.signal}).then(value=>{if(!controller.signal.aborted){setOwner(currentUser.uid);setBundle(value);setDraft(value.draft);setDirty(false);}}).catch(e=>{if(!controller.signal.aborted)setError(e.code||'REQUEST_FAILED');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[currentUser]);
  useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};const leave=(event:MouseEvent)=>{const anchor=(event.target as Element)?.closest?.('a[href]');if(anchor&&!anchor.getAttribute('href')?.startsWith('#')&&!window.confirm(t('item.discard'))){event.preventDefault();event.stopPropagation();}};window.addEventListener('beforeunload',warn);document.addEventListener('click',leave,true);return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',leave,true);};},[dirty,t]);
  const edit=(change:(value:StorefrontContent)=>void)=>{if(!draft)return;const copy=structuredClone(draft);change(copy);setDraft(copy);setDirty(true);setNotice('');};
  const localFields=(value:LocalText,onChange:(next:LocalText)=>void,label:string,multiline=false,required=false)=><div className="content-language-grid">{(['en','ur','ar']as const).map(lang=><ItemField key={lang} label={`${label} · ${lang.toUpperCase()}`} publish={required&&lang==='en'}>{multiline?<textarea dir={lang==='en'?'ltr':'rtl'} value={value[lang]} onChange={e=>onChange({...value,[lang]:e.target.value})}/>:<input dir={lang==='en'?'ltr':'rtl'} value={value[lang]} onChange={e=>onChange({...value,[lang]:e.target.value})}/>}</ItemField>)}</div>;
  const save=async(action:'draft'|'publish')=>{
    if(!currentUser||!bundle||!draft||busy||owner!==currentUser.uid)return;setBusy(true);setError('');
    try{const result=await adminRequest<Bundle>(()=>currentUser.getIdToken(),`/api/admin/storefront-content/${action}`,{method:'POST',body:{expectedRevision:bundle.revision,...(action==='draft'?{content:draft}:{})}});setBundle(result);setDraft(result.draft);setDirty(false);setNotice(action==='draft'?'content.saved':'content.published');if(action==='publish')await refresh();}catch(e){setError((e as any).code||'REQUEST_FAILED');}finally{setBusy(false);}
  };
  const restore=async()=>{
    if(!currentUser||!bundle||busy||owner!==currentUser.uid)return;
    if(!window.confirm(t('content.confirmRestoreLive','Restore draft from current live published version? Any unsaved edits will be discarded.')))return;
    setBusy(true);setError('');
    try{const result=await adminRequest<Bundle>(()=>currentUser.getIdToken(),'/api/admin/storefront-content/restore',{method:'POST',body:{expectedRevision:bundle.revision,target:'live'}});setBundle(result);setDraft(result.draft);setDirty(false);setNotice('content.restored');}catch(e){setError((e as any).code||'REQUEST_FAILED');}finally{setBusy(false);}
  };
  const openHistory=async()=>{
    if(!currentUser)return;
    setHistoryModal(true);setHistoryLoading(true);
    try{
      const data=await adminRequest<{history:any[]}>(()=>currentUser.getIdToken(),'/api/admin/storefront-content/history');
      setHistoryList(data.history||[]);
    }catch{setHistoryList([]);}finally{setHistoryLoading(false);}
  };
  const restoreRevision=async(auditId:string,revNum:number)=>{
    if(!currentUser||!bundle||busy||owner!==currentUser.uid)return;
    if(!window.confirm(`Restore historical revision #${revNum} into a new draft? Any unsaved edits will be discarded.`))return;
    setBusy(true);setError('');
    try{
      const result=await adminRequest<Bundle>(()=>currentUser.getIdToken(),'/api/admin/storefront-content/restore',{method:'POST',body:{expectedRevision:bundle.revision,auditId}});
      setBundle(result);setDraft(result.draft);setDirty(false);setNotice(`content.restoredRev`);setHistoryModal(false);
    }catch(e:any){setError(e.code||'REQUEST_FAILED');}finally{setBusy(false);}
  };
  if(loading)return <p role="status">{t('admin.checking')}</p>;
  if(!draft||!bundle||owner!==currentUser?.uid)return <p role="alert" className="admin-notice">{t('content.error')}</p>;
  return <section className="content-admin" dir={isRtl?'rtl':'ltr'}><header className="content-studio-heading"><div><p className="admin-eyebrow">AllBarka</p><h2>{t('content.title')}</h2><p>{t('content.hint')}</p></div><span>{t('content.liveRevision')} <bdi>{bundle.liveRevision}</bdi></span></header>
    {error&&<p className="admin-notice admin-notice-error" role="alert">{t(`content.error.${error}`,t('content.error'))} <bdi>{error}</bdi></p>}{notice&&<p className="admin-notice" role="status">{t(notice)}</p>}
    <fieldset disabled={busy} className="content-editor-sections">
      <details open className="content-editor-section"><summary>{t('content.hero')}</summary><ItemField label={t('content.custom')}><input type="checkbox" checked={draft.hero.enabled} onChange={e=>edit(v=>{v.hero.enabled=e.target.checked;})}/></ItemField>
        {(['heading','accent','description','primaryLabel','secondaryLabel']as const).map(key=><div key={key}>{localFields(draft.hero[key],value=>edit(v=>{v.hero[key]=value;}),t(`content.${key}`),key==='description',draft.hero.enabled&&key!=='accent')}</div>)}
        <div className="content-two-grid">{(['primaryPath','secondaryPath','image','mobileImage']as const).map(key=><ItemField key={key} label={t(`content.${key}`)} publish><input value={draft.hero[key]} onChange={e=>edit(v=>{v.hero[key]=e.target.value;})} dir="ltr"/></ItemField>)}</div>
      </details>
      <details className="content-editor-section"><summary>{t('content.banner')}</summary><ItemField label={t('content.visible')}><input type="checkbox" checked={draft.banner.enabled} onChange={e=>edit(v=>{v.banner.enabled=e.target.checked;})}/></ItemField>{localFields(draft.banner.text,value=>edit(v=>{v.banner.text=value;}),t('content.text'),false,draft.banner.enabled)}{localFields(draft.banner.linkLabel,value=>edit(v=>{v.banner.linkLabel=value;}),t('content.linkLabel'),false,draft.banner.enabled&&!!draft.banner.path)}<ItemField label={t('content.path')}><input value={draft.banner.path} onChange={e=>edit(v=>{v.banner.path=e.target.value;})} dir="ltr"/></ItemField></details>
      <details className="content-editor-section"><summary>{t('content.sections')}</summary>{draft.sections.map((section,index)=><div className="content-order-row" key={section.id}><ItemField label={t(`content.${section.id}`)}><input type="checkbox" checked={section.visible} onChange={e=>edit(v=>{v.sections[index].visible=e.target.checked;})}/></ItemField><div>{([-1,1]as const).map(direction=><button type="button" key={direction} className="admin-icon-button" aria-label={`${t(direction<0?'content.up':'content.down')} ${t(`content.${section.id}`)}`} disabled={index+direction<0||index+direction>=draft.sections.length} onClick={()=>edit(v=>{[v.sections[index],v.sections[index+direction]]=[v.sections[index+direction],v.sections[index]];})}>{direction<0?<ArrowUp size={16}/>:<ArrowDown size={16}/>}</button>)}</div></div>)}</details>
      <details className="content-editor-section"><summary>{t('content.navigation')}</summary>{MAIN_NAV_ITEMS.map(item=>{const entry=draft.navigation.find(x=>x.id===item.id)||{id:item.id,label:blankText(),path:item.path,visible:true};const change=(patch:Partial<typeof entry>)=>edit(v=>{v.navigation=[...v.navigation.filter(x=>x.id!==item.id),{...entry,...patch}];});return <div className="content-entry" key={item.id}><h3>{t(item.labelKey,item.defaultLabel)}</h3><ItemField label={t('content.visible')}><input type="checkbox" checked={entry.visible} onChange={e=>change({visible:e.target.checked})}/></ItemField>{localFields(entry.label,value=>change({label:value}),t('content.label'))}<ItemField label={t('content.path')} publish><input value={entry.path} dir="ltr" onChange={e=>change({path:e.target.value})}/></ItemField></div>;})}</details>
      <details className="content-editor-section"><summary>{t('content.faq')}</summary>{draft.faqs.map((entry,index)=><div className="content-entry" key={entry.id}><ItemField label={t('content.visible')}><input type="checkbox" checked={entry.visible} onChange={e=>edit(v=>{v.faqs[index].visible=e.target.checked;})}/></ItemField>{localFields(entry.question,value=>edit(v=>{v.faqs[index].question=value;}),t('content.question'),false,entry.visible)}{localFields(entry.answer,value=>edit(v=>{v.faqs[index].answer=value;}),t('content.answer'),true,entry.visible)}<button type="button" className="admin-button" onClick={()=>edit(v=>{v.faqs.splice(index,1);})}>{t('content.remove')}</button></div>)}<button type="button" className="admin-button" disabled={draft.faqs.length>=30} onClick={()=>edit(v=>{v.faqs.push({id:`faq-${Date.now().toString(36)}-${v.faqs.length}`,visible:true,question:blankText(),answer:blankText()});})}>{t('content.addFaq')}</button></details>
      <details className="content-editor-section"><summary>{t('content.journal')}</summary><ItemField label={t('content.importArticle')}><select value="" onChange={e=>{const entry=JOURNAL_ARTICLES.find(x=>x.slug===e.target.value);if(!entry||draft.articles.some(x=>x.slug===entry.slug))return;edit(v=>{v.articles.push({slug:entry.slug,visible:true,title:{en:entry.title,ur:'',ar:''},excerpt:{en:entry.excerpt,ur:'',ar:''},body:{en:entry.sections.map(x=>[x.heading,...x.content,x.callout?.title,x.callout?.text].filter(Boolean).join('\n')).join('\n\n'),ur:'',ar:''},image:entry.image,category:entry.category,publishedDate:entry.publishedDate.slice(0,10),relatedProductIds:entry.relatedProductIds});});}}><option value="">{t('item.none')}</option>{JOURNAL_ARTICLES.filter(x=>!draft.articles.some(a=>a.slug===x.slug)).map(x=><option key={x.slug} value={x.slug}>{x.title}</option>)}</select></ItemField>
        {draft.articles.map((entry,index)=><details className="content-entry" key={index}><summary>{contentText(entry.title,language)||t('content.addArticle')}</summary><ItemField label={t('content.visible')}><input type="checkbox" checked={entry.visible} onChange={e=>edit(v=>{v.articles[index].visible=e.target.checked;})}/></ItemField><ItemField label={t('content.slug')} required><input value={entry.slug} disabled={bundle.draft.articles.some(x=>x.slug===entry.slug)} onChange={e=>edit(v=>{v.articles[index].slug=e.target.value;})} dir="ltr"/></ItemField>{(['title','excerpt','body']as const).map(key=><div key={key}>{localFields(entry[key],value=>edit(v=>{v.articles[index][key]=value;}),t(key==='title'?'item.name':`content.${key}`),key!=='title',entry.visible)}</div>)}<div className="content-two-grid"><ItemField label={t('content.articleImage')} publish><input value={entry.image} dir="ltr" onChange={e=>edit(v=>{v.articles[index].image=e.target.value;})}/></ItemField><ItemField label={t('content.date')} required><input type="date" value={entry.publishedDate} onChange={e=>edit(v=>{v.articles[index].publishedDate=e.target.value;})}/></ItemField><ItemField label={t('content.category')} required><select value={entry.category} onChange={e=>edit(v=>{v.articles[index].category=e.target.value;})}>{['Storage & Care','Culinary & Pairings','Gifting','Wellness & Science','Buying Guides'].map(x=><option value={x} key={x}>{t(`content.category.${x}`,x)}</option>)}</select></ItemField><ItemField label={t('content.related')}><AdminDelimitedInput value={entry.relatedProductIds} onChange={value=>edit(v=>{v.articles[index].relatedProductIds=value;})}/></ItemField></div></details>)}
        <button type="button" className="admin-button" disabled={draft.articles.length>=30} onClick={()=>edit(v=>{v.articles.push({slug:'',visible:false,title:blankText(),excerpt:blankText(),body:blankText(),image:'/images/product-placeholder.svg',category:'Buying Guides',publishedDate:getKarachiTime().isoDateStr,relatedProductIds:[]});})}>{t('content.addArticle')}</button>
      </details>
    </fieldset>
    {preview&&<section className="content-draft-preview space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-100 dark:bg-zinc-800 rounded-xl border border-neutral-300 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <p className="admin-eyebrow m-0 font-bold">{t('content.draftOnly')}</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-semibold">
            {previewVersion==='draft'?`Draft Rev ${bundle.revision}`:`Live Rev ${bundle.liveRevision}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Surface Switcher */}
          <div className="preview-surface-tabs flex items-center gap-1 bg-white dark:bg-zinc-700 p-0.5 rounded-lg border border-neutral-200 dark:border-zinc-600">
            <button type="button" data-surface="home" className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${previewSurface==='home'?'bg-[#043327] text-white':'text-neutral-600 dark:text-neutral-300'}`} onClick={()=>setPreviewSurface('home')}><Home size={13}/>Homepage</button>
            <button type="button" data-surface="journal" className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${previewSurface==='journal'?'bg-[#043327] text-white':'text-neutral-600 dark:text-neutral-300'}`} onClick={()=>setPreviewSurface('journal')}><BookOpen size={13}/>Journal</button>
            <button type="button" data-surface="faq" className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${previewSurface==='faq'?'bg-[#043327] text-white':'text-neutral-600 dark:text-neutral-300'}`} onClick={()=>setPreviewSurface('faq')}><HelpCircle size={13}/>FAQ</button>
          </div>
          {/* Viewport Device Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-700 p-0.5 rounded-lg border border-neutral-200 dark:border-zinc-600">
            <button type="button" className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${previewDevice==='desktop'?'bg-[#043327] text-white':'text-neutral-600 dark:text-neutral-300'}`} onClick={()=>setPreviewDevice('desktop')}><Monitor size={14}/>Desktop</button>
            <button type="button" className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${previewDevice==='tablet'?'bg-[#043327] text-white':'text-neutral-600 dark:text-neutral-300'}`} onClick={()=>setPreviewDevice('tablet')}><Tablet size={14}/>Tablet</button>
            <button type="button" className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 ${previewDevice==='mobile'?'bg-[#043327] text-white':'text-neutral-600 dark:text-neutral-300'}`} onClick={()=>setPreviewDevice('mobile')}><Smartphone size={14}/>Mobile</button>
          </div>
          {/* Version Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-700 p-0.5 rounded-lg border border-neutral-200 dark:border-zinc-600">
            <button type="button" className={`px-2 py-1 text-xs font-semibold rounded ${previewVersion==='draft'?'bg-[#043327] text-white':'text-neutral-600 dark:text-neutral-300'}`} onClick={()=>setPreviewVersion('draft')}>Draft</button>
            <button type="button" className={`px-2 py-1 text-xs font-semibold rounded ${previewVersion==='live'?'bg-[#043327] text-white':'text-neutral-600 dark:text-neutral-300'}`} onClick={()=>setPreviewVersion('live')}>Live</button>
          </div>
        </div>
      </div>
      {/* Viewport Frame with Responsive Width and Breakpoints */}
      <div
        className={`preview-viewport-container mx-auto transition-all duration-200 ${
          previewDevice==='mobile'
            ? 'w-[390px] max-w-[390px] border-4 border-neutral-700 rounded-[28px] p-2 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden'
            : previewDevice==='tablet'
            ? 'w-[768px] max-w-[768px] border-2 border-neutral-600 rounded-2xl p-3 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden'
            : 'w-full rounded-xl border border-neutral-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900'
        }`}
        data-viewport-device={previewDevice}
        data-viewport-width={previewDevice==='mobile'?'390':previewDevice==='tablet'?'768':'1440'}
      >
        <div className="text-[10px] text-neutral-400 font-mono mb-2 pb-1.5 border-b border-neutral-100 dark:border-zinc-800 flex items-center justify-between">
          <span>Viewport: {previewDevice==='mobile'?'390px (Mobile Portrait)':previewDevice==='tablet'?'768px (Tablet)':`Full Width (Desktop)`}</span>
          <span className="capitalize">Surface: {previewSurface}</span>
        </div>
        {/* Synchronized hero preview node in host document for document.querySelector queries */}
        <div className="content-hero-preview sr-only" aria-hidden="true" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          <h3>{(previewVersion==='draft'?draft:bundle.live).hero.enabled?contentText((previewVersion==='draft'?draft:bundle.live).hero.heading,language):t('table.heading')} <em>{(previewVersion==='draft'?draft:bundle.live).hero.enabled?contentText((previewVersion==='draft'?draft:bundle.live).hero.accent,language):t('table.accent')}</em></h3>
          <p>{(previewVersion==='draft'?draft:bundle.live).hero.enabled?contentText((previewVersion==='draft'?draft:bundle.live).hero.description,language):t('table.description')}</p>
        </div>

        <StorefrontPreviewViewport device={previewDevice}>
          <StorefrontContentProvider initialContent={previewVersion==='draft'?draft:bundle.live}>
          {previewSurface==='home'&&(
            <div className="preview-surface-home space-y-4">
              <StorefrontBanner/>
              <div className="content-hero-preview">
                <img src={(previewVersion==='draft'?draft:bundle.live).hero.enabled?(previewVersion==='draft'?draft:bundle.live).hero.image:'/images/dryfruit_flatlay_hero.webp'} alt=""/>
                <div>
                  <h3>{(previewVersion==='draft'?draft:bundle.live).hero.enabled?contentText((previewVersion==='draft'?draft:bundle.live).hero.heading,language):t('table.heading')} <em>{(previewVersion==='draft'?draft:bundle.live).hero.enabled?contentText((previewVersion==='draft'?draft:bundle.live).hero.accent,language):t('table.accent')}</em></h3>
                  <p>{(previewVersion==='draft'?draft:bundle.live).hero.enabled?contentText((previewVersion==='draft'?draft:bundle.live).hero.description,language):t('table.description')}</p>
                </div>
              </div>
              <FAQSection/>
            </div>
          )}
          {previewSurface==='journal'&&(
            <div className="preview-surface-journal p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-zinc-700 pb-3">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#043327] dark:text-emerald-400">AllBarka Editorial Journal</h2>
                  <p className="text-xs text-neutral-500">Authentic harvest stories and connoisseur guides.</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-semibold">
                  {contentJournal(previewVersion==='draft'?draft:bundle.live, language).length} Articles
                </span>
              </div>
              {contentJournal(previewVersion==='draft'?draft:bundle.live, language).length===0?(
                <p className="p-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-zinc-700 rounded-xl">No published articles in this collection.</p>
              ):(
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {contentJournal(previewVersion==='draft'?draft:bundle.live, language).map(art=>(
                    <article key={art.slug} className="p-3.5 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-50 dark:bg-zinc-800/60 space-y-2">
                      <img src={art.image} alt={art.title} className="w-full h-32 object-cover rounded-lg" onError={e=>{(e.currentTarget as HTMLImageElement).src='/images/product-placeholder.svg';}}/>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">{art.category}</span>
                        <span>{art.publishedDate}</span>
                      </div>
                      <h4 className="font-serif font-bold text-sm text-[#120F17] dark:text-[#FAF9F5] line-clamp-1">{art.title}</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">{art.excerpt}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
          {previewSurface==='faq'&&(
            <div className="preview-surface-faq p-4 space-y-3">
              <div className="border-b border-neutral-200 dark:border-zinc-700 pb-3">
                <h2 className="font-serif font-bold text-lg text-[#043327] dark:text-emerald-400">Frequently Asked Questions</h2>
                <p className="text-xs text-neutral-500">Concierge answers on orders, packaging and authenticity.</p>
              </div>
              <FAQSection/>
            </div>
          )}
        </StorefrontContentProvider>
        </StorefrontPreviewViewport>
      </div>
    </section>}
    {historyModal&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-[#D4AF37]/30 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <header className="p-4 border-b border-neutral-200 dark:border-zinc-700 flex items-center justify-between">
          <h3 className="font-serif font-bold text-sm text-[#043327] dark:text-emerald-400 flex items-center gap-2"><History size={16}/>{t('content.revisionHistory','Storefront Revision History')}</h3>
          <button type="button" onClick={()=>setHistoryModal(false)} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800"><X size={18}/></button>
        </header>
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {historyLoading?<p className="text-xs text-neutral-400 text-center py-4">{t('admin.checking')}</p>:historyList.length===0?<p className="text-xs text-neutral-400 text-center py-4">{t('admin.noAudits','No historical revisions found.')}</p>:historyList.map(item=>(
            <div key={item.id} className="p-3 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-50 dark:bg-zinc-800/60 flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-[#120F17] dark:text-[#FAF9F5]">Revision #{item.revision} · <span className="font-normal text-neutral-500">{item.action}</span></p>
                <p className="text-[10px] text-neutral-400">{new Date(item.updatedAt).toLocaleString()}</p>
              </div>
              <button type="button" className="admin-button shrink-0 text-xs py-1 px-3" disabled={busy} onClick={()=>restoreRevision(item.id,item.revision)}>
                <RotateCcw size={13}/>{t('content.restoreDraft','Restore to Draft')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>}
    <footer className="content-studio-actions"><button type="button" className="admin-button" onClick={()=>setPreview(v=>!v)}><Eye size={16}/>{t('content.preview')}</button><button type="button" className="admin-button" disabled={busy} onClick={openHistory}><History size={16}/>{t('content.history','History')}</button><button type="button" className="admin-button" disabled={busy||(!dirty&&bundle.revision===bundle.liveRevision)} onClick={restore}><RotateCcw size={16}/>{t('content.restoreLive','Restore live to draft')}</button><button type="button" className="admin-button" disabled={busy} onClick={()=>void save('draft')}><Save size={16}/>{t('content.saveDraft')}</button><button type="button" className="admin-button admin-button-primary" disabled={busy||dirty} onClick={()=>void save('publish')}><Upload size={16}/>{t('content.publish')}</button>{dirty&&<p>{t('content.unsaved')}</p>}</footer>
  </section>;
}
