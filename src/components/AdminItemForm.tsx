import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCatalogRefresh } from '../contexts/CatalogContext';
import { adminRequest } from '../lib/adminClient';
import { uploadProductPhoto } from '../lib/productUploadClient';
import { emptyCommerce, legacyCommerceOptions, itemPayload, itemSlug, newItem, optionPrice, publishReadiness } from '../lib/adminItemForm';
import { DEFAULT_CATALOG_CONFIGURATION, type CatalogConfiguration } from '../lib/catalogConfiguration';
import { MEASUREMENT_UNITS, calculatedUnitPrice, type CommerceOption, type ProductCommerce } from '../lib/productCommerce';
import AdminDelimitedInput from './AdminDelimitedInput';
import { ItemField } from './AdminItemField';
import AdminCatalogConfiguration from './AdminCatalogConfiguration';
import AdminRecipeEditor from './AdminRecipeEditor';
import { validateRecipeIngredients, validateFilledRecipes } from '../lib/filledGiftPricing';
import type { Product } from '../types';
import '../styles/admin-item.css';

const ITEM_SECTIONS = ['identity','options','media','seo','recipe','logistics','private','review','configuration'] as const;

export default function AdminItemForm({product,onClose,onSaved,initialCategory}:{product?:Product|null;onClose:()=>void;onSaved?:(p:Product)=>void;initialCategory?:string}) {
  const {currentUser}=useAuth();const {t,language,isRtl}=useLanguage();const refresh=useCatalogRefresh();
  const [form,setForm]=useState<Record<string,any>>(()=>newItem(initialCategory));
  const [configuration,setConfiguration]=useState<CatalogConfiguration>(DEFAULT_CATALOG_CONFIGURATION);
  const [loading,setLoading]=useState(true);const [loadFailed,setLoadFailed]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [idEdited,setIdEdited]=useState(false);
  const [dirty,setDirty]=useState(false);const [commerceTouched,setCommerceTouched]=useState(!product);const [preview,setPreview]=useState(false);
  const [configurationDirty,setConfigurationDirty]=useState(false);const [configurationBusy,setConfigurationBusy]=useState(false);
  const blocked=busy||configurationBusy;const unsaved=dirty||configurationDirty;
  const root=useRef<HTMLDivElement>(null);const errorSummary=useRef<HTMLParagraphElement>(null);const abort=useRef(new AbortController());
  const itemDirtyRef=useRef(false);const configurationDirtyRef=useRef(false);const configurationBusyRef=useRef(false);
  const markConfigurationDirty=useCallback((value:boolean)=>{configurationDirtyRef.current=value;setConfigurationDirty(value);},[]);
  const markConfigurationBusy=useCallback((value:boolean)=>{configurationBusyRef.current=value;setConfigurationBusy(value);},[]);
  const busyRef=useRef(blocked);busyRef.current=blocked;
  const closeRef=useRef(onClose);closeRef.current=onClose;
  const close=()=>{if(!blocked&&(!unsaved||window.confirm(t('item.discard'))))onClose();};
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(itemDirtyRef.current||configurationDirtyRef.current||busyRef.current||configurationBusyRef.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[]);
  useEffect(()=>{if(error&&!blocked){errorSummary.current?.focus();errorSummary.current?.scrollIntoView({block:'nearest'});}},[error,blocked]);
  useEffect(()=>{
    const controller=new AbortController();abort.current=controller;let active=true;setLoading(true);setLoadFailed(false);
    (async()=>{
      if(!currentUser){setLoadFailed(true);setLoading(false);return;}
      try {
        const [settings,record]=await Promise.all([
          adminRequest<{configuration:CatalogConfiguration}>(()=>currentUser.getIdToken(),'/api/admin/catalog/configuration',{signal:controller.signal}),
          product?adminRequest<{product:Product}>(()=>currentUser.getIdToken(),`/api/admin/catalog/products/${encodeURIComponent(product.id)}`,{signal:controller.signal}):Promise.resolve(null),
        ]);
        if(!active)return;
        setConfiguration(settings.configuration);
        if(record){const p=structuredClone(record.product);p.prices={...Object.fromEntries((p.variants||[]).map(v=>[v.label,v.price])),...p.prices};if(p.commerce?.pricingMode==='calculated')for(const o of p.commerce.options){try{if(p.prices[o.label]!==undefined&&p.prices[o.label]!==calculatedUnitPrice(p.commerce,o.quantity,o.unit))o.override=true;}catch{/* Keep the saved configuration available for correction. */}}setForm({...p,prices:{...p.prices},seo:p.seo||{},attributes:p.attributes||[],galleryImages:p.galleryImages||[]});}
      } catch(e){if(active){setLoadFailed(true);setError((e as any).code||'REQUEST_FAILED');}}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;controller.abort();};
  },[currentUser,product]);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;const node=root.current;node?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();if(!busyRef.current&&!configurationBusyRef.current&&(!(itemDirtyRef.current||configurationDirtyRef.current)||window.confirm(t('item.discard'))))closeRef.current();}
      if(event.key==='Tab'&&node){const items=Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[href]')).filter(e=>e.getClientRects().length);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===node)){event.preventDefault();first?.focus();}}
    };
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus();};
  },[t]);
  const set=(key:string,value:any)=>{itemDirtyRef.current=true;setForm(v=>({...v,[key]:value}));setDirty(true);setNotice('');};
  const commerce=form.commerce as ProductCommerce|undefined;
  const setCommerce=(patch:Partial<ProductCommerce>)=>{set('commerce',{...commerce,...patch});setCommerceTouched(true);};
  const changeOption=(index:number,patch:Partial<CommerceOption>)=>{
    const options=commerce!.options.map((o,i)=>i===index?{...o,...patch}:o);
    if(patch.label!==undefined){const old=commerce!.options[index].label;setForm(v=>({...v,prices:{...v.prices,[patch.label!]:v.prices[old]}}));}
    setCommerce({options});
  };
  const field=(key:string,options:{required?:boolean;publish?:boolean;type?:string;label?:string;multiline?:boolean;value?:any;onChange?:(v:any)=>void;disabled?:boolean}={})=><ItemField key={key} label={options.label||t(`item.${key}`)} required={options.required} publish={options.publish}>{options.multiline?<textarea value={options.value??form[key]??''} onChange={e=>(options.onChange||((v)=>set(key,v)))(e.target.value)}/>:<input type={options.type||'text'} step={options.type==='number'?'any':undefined} disabled={options.disabled} value={options.value??form[key]??''} onChange={e=>{let value:any=e.target.value;if(options.type==='number')value=value===''?null:Number(value);(options.onChange||((v)=>set(key,v)))(value);}}/>}</ItemField>;
  const choices=(key:string,value:string,values:readonly string[],onChange:(v:string)=>void,required=true)=><ItemField label={t(`item.${key}`)} required={required}><select value={value} onChange={e=>onChange(e.target.value)}>{values.map(v=><option key={v} value={v}>{MEASUREMENT_UNITS.includes(v as any)?v:t(`item.${v}`)}</option>)}</select></ItemField>;
  const readiness=publishReadiness(form);
  const jumpToSection=(section:string)=>{
    if(!ITEM_SECTIONS.includes(section as typeof ITEM_SECTIONS[number]))return;
    const target=root.current?.querySelector<HTMLElement>(`#item-section-${section}`);if(!target)return;
    if(target instanceof HTMLDetailsElement)target.open=true;
    target.scrollIntoView({block:'start'});target.querySelector<HTMLElement>('h4,summary')?.focus({preventScroll:true});
  };
  const save=async(status:string)=>{
    if(!currentUser||loadFailed||blocked||configurationDirty)return;
    if(commerceTouched&&commerce?.options.some(o=>!o.label.trim()&&form.prices?.[o.label])){setError('OPTION_LABEL_REQUIRED');return;}
    if(form.recipeIngredients&&form.recipeIngredients.length>0){try{validateRecipeIngredients(form.recipeIngredients);}catch(e){setError((e as Error).message);return;}}
    if(form.filledRecipes&&Object.keys(form.filledRecipes).length>0){try{validateFilledRecipes(form.filledRecipes);}catch(e){setError((e as Error).message);return;}}
    setBusy(true);setError('');setNotice('');
    try {
      const body=itemPayload(form,status,commerceTouched,product);
      if(!body.id)body.id=itemSlug(body.name_en||'');
      const response=await adminRequest<{product:Product}>(()=>currentUser.getIdToken(),product?`/api/admin/catalog/products/${encodeURIComponent(product.id)}`:'/api/admin/catalog/products',{method:product?'PUT':'POST',body,signal:abort.current.signal});
      setForm(response.product);itemDirtyRef.current=false;setDirty(false);setCommerceTouched(false);setNotice('saved');await refresh();onSaved?.(response.product);
    }catch(e){setError((e as any).code||'REQUEST_FAILED');}finally{setBusy(false);}
  };
  return <div className="item-overlay"><div ref={root} tabIndex={-1} className="item-editor" role="dialog" aria-modal="true" aria-labelledby="item-editor-title" aria-busy={blocked} dir={isRtl?'rtl':'ltr'}>
    <header className="item-heading"><div><h3 id="item-editor-title">{t(product?'item.edit':'item.add')}</h3><p>{t('item.intro')}</p></div><button type="button" onClick={close} disabled={blocked} aria-label={t('item.close')}><X size={20}/></button></header>
    <nav className="item-section-nav" aria-label={t('item.goTo')}>
      <select aria-label={t('item.goTo')} value="" disabled={loading||loadFailed} onChange={event=>jumpToSection(event.target.value)}><option value="">{t('item.chooseSection')}</option>{ITEM_SECTIONS.map(section=><option key={section} value={section}>{t(`item.${section}`)}</option>)}</select>
      <div>{ITEM_SECTIONS.map(section=><button type="button" key={section} disabled={loading||loadFailed} aria-label={`${t('item.goTo')}: ${t(`item.${section}`)}`} aria-controls={`item-section-${section}`} onClick={()=>jumpToSection(section)}>{t(`item.${section}`)}</button>)}</div>
    </nav>
    <form className="item-scroll item-stack" id="admin-item-form" onSubmit={e=>{e.preventDefault();void save(product?form.status||'draft':'draft');}}>
      {loading?<p role="status">{t('item.loading')}</p>:<fieldset disabled={blocked||loadFailed} className="item-stack" style={{minWidth:0}}>
        {error&&<p ref={errorSummary} tabIndex={-1} role="alert" className="item-error">{t(error.includes('CONFLICT')?'item.conflict':`item.reason.${error}`,t('item.failed'))} <bdi>{error}</bdi></p>}
        <section id="item-section-identity" className="item-section item-stack"><h4 tabIndex={-1}>{t('item.identity')}</h4><div className="item-grid">
          {field('id',{required:true,disabled:!!product,onChange:v=>{setIdEdited(true);set('id',v);}})}
          <ItemField label={t('item.category')} publish><select value={form.category} onChange={e=>set('category',e.target.value)}>{!configuration.taxonomy.some(x=>x.id===form.category)&&<option>{form.category}</option>}{configuration.taxonomy.filter(x=>x.type!=='occasion').map(x=><option key={`${x.type}:${x.id}`} value={x.id}>{x[`name_${language}`]||x.name_en}{x.visible?'':` (${t('item.archived')})`}</option>)}</select></ItemField>
          <ItemField label={t('item.template')}><select value={form.templateId||''} onChange={e=>set('templateId',e.target.value)}><option value="">{t('item.none')}</option>{configuration.templates.filter(x=>!x.archived||x.id===form.templateId).map(x=><option key={x.id} value={x.id}>{x[`name_${language}`]||x.name_en}</option>)}</select></ItemField>
          <button type="button" disabled={!form.templateId} onClick={()=>{const selected=configuration.templates.find(x=>x.id===form.templateId);if(!selected)return;const c=commerce||{...emptyCommerce(),options:legacyCommerceOptions(form)};set('category',selected.defaultCategory);setCommerce({...c,kind:selected.kind,baseUnit:selected.defaultUnit});set('attributes',selected.attributes.map(a=>({...a,value:form.attributes?.find((x:any)=>x.key===a.key)?.value??''})));}}>{t('item.apply')}</button>
        </div><p className="item-hint">{t('item.templateHint')} {t('item.fallback')}</p>
        {(['en','ur','ar'] as const).map(lang=><details className="item-option" key={lang} open={lang==='en'}><summary>{lang.toUpperCase()} · {form[`name_${lang}`]?'✓':'—'}</summary><div className="item-stack" dir={lang==='en'?'ltr':'rtl'}>{field(`name_${lang}`,{label:t('item.name'),required:lang==='en',onChange:v=>{set(`name_${lang}`,v);if(lang==='en'&&!product&&!idEdited)set('id',itemSlug(v));}})}{field(`desc_${lang}`,{label:t('item.description'),publish:lang==='en',multiline:true})}{field(`origin_${lang}`,{label:t('item.origin')})}</div></details>)}
        </section>
        <section id="item-section-options" className="item-section item-stack"><h4 tabIndex={-1}>{t('item.options')}</h4>{!commerce?<p className="item-hint">{t('item.legacy')}</p>:<>
          <div className="item-grid">{choices('kind',commerce.kind,['food','liquid','packaging','gift'],v=>setCommerce({kind:v as any,quantityMode:'fixed',custom:null}))}{choices('pricingMode',commerce.pricingMode,['manual','calculated'],v=>setCommerce({pricingMode:v as any}))}{choices('quantityMode',commerce.quantityMode,commerce.kind==='packaging'||commerce.kind==='gift'?['fixed']:['fixed','custom','both'],v=>setCommerce({quantityMode:v as any,custom:v==='fixed'?null:commerce.custom||{unit:commerce.baseUnit,min:1,max:100,step:1,shippingWeightGPerUnit:null}}))}</div>
          {(commerce.pricingMode==='calculated'||commerce.quantityMode!=='fixed')&&<div className="item-grid">{field('baseQuantity',{publish:true,type:'number',value:commerce.baseQuantity??'',onChange:v=>setCommerce({baseQuantity:v})})}{choices('baseUnit',commerce.baseUnit,MEASUREMENT_UNITS,v=>setCommerce({baseUnit:v as any}))}{field('basePrice',{publish:true,type:'number',value:commerce.basePrice??'',onChange:v=>setCommerce({basePrice:v})})}</div>}
          {commerce.quantityMode!=='custom'&&<>{commerce.options.map((option,i)=><div className="item-option item-stack" key={i}><div className="item-grid">
            {field(`label-${i}`,{label:t('item.label'),required:true,value:option.label,onChange:v=>changeOption(i,{label:v})})}
            {field(`quantity-${i}`,{label:t('item.quantity'),required:true,type:'number',value:option.quantity??'',onChange:v=>changeOption(i,{quantity:v})})}
            {choices('unit',option.unit,MEASUREMENT_UNITS,v=>changeOption(i,{unit:v as any}))}
            {field(`price-${i}`,{label:t('item.price'),publish:true,type:'number',disabled:commerce.pricingMode==='calculated'&&!option.override,value:optionPrice(form,i)??'',onChange:v=>{set('prices',{...form.prices,[option.label]:v});setCommerceTouched(true);}})}
            {field(`shipping-${i}`,{label:t('item.shippingWeightG'),publish:['piece','pack'].includes(option.unit)||(['ml','L'].includes(option.unit)&&form.category!=='oils'),type:'number',value:option.shippingWeightG??'',onChange:v=>changeOption(i,{shippingWeightG:v})})}
            {field(`pieces-${i}`,{label:t('item.piecesPerPack'),type:'number',publish:commerce.kind==='packaging'&&option.unit==='pack',value:option.piecesPerPack??'',onChange:v=>changeOption(i,{piecesPerPack:v??undefined})})}
            {field(`moq-${i}`,{label:t('item.moqOverride'),type:'number',value:option.moqOverride??'',onChange:v=>changeOption(i,{moqOverride:v??undefined})})}
            {(['available','override'] as const).map(key=><ItemField label={t(`item.${key}`)} key={key}><input type="checkbox" checked={option[key]} onChange={e=>changeOption(i,{[key]:e.target.checked})}/></ItemField>)}
          </div><button type="button" onClick={()=>setCommerce({options:commerce.options.filter((_,index)=>index!==i)})}>{t('item.remove')}</button></div>)}
          <button type="button" disabled={commerce.options.length>=20} onClick={()=>setCommerce({options:[...commerce.options,{label:'',quantity:1,unit:commerce.baseUnit,override:false,available:true,shippingWeightG:null}]})}>{t('item.addOption')}</button></>}
          {commerce.custom&&<div className="item-grid">{choices('unit',commerce.custom.unit,['mg','g','kg','ml','L'],v=>setCommerce({custom:{...commerce.custom!,unit:v as any}}))}{(['min','max','step','shippingWeightGPerUnit'] as const).map(key=>field(key,{label:t(key==='shippingWeightGPerUnit'?'item.shippingBasis':`item.${key}`),required:key!=='shippingWeightGPerUnit',type:'number',value:commerce.custom![key]??'',onChange:v=>setCommerce({custom:{...commerce.custom!,[key]:v}})}))}</div>}
        </>}
        {!!form.attributes?.length&&<div className="item-grid">{form.attributes.map((a:any,i:number)=><ItemField key={a.key} label={a[`label_${language}`]||a.label_en} publish={a.required}>{a.type==='select'?<select value={a.value} onChange={e=>set('attributes',form.attributes.map((x:any,j:number)=>j===i?{...x,value:e.target.value}:x))}><option value="">{t('item.none')}</option>{a.options.map((x:string)=><option key={x}>{x}</option>)}</select>:<input type={a.type==='number'?'number':'text'} value={a.value} onChange={e=>set('attributes',form.attributes.map((x:any,j:number)=>j===i?{...x,value:a.type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value}:x))}/>}</ItemField>)}</div>}
        </section>
        <section id="item-section-media" className="item-section item-stack"><h4 tabIndex={-1}>{t('item.media')}</h4>{field('image',{publish:true})}<ItemField label={t('item.galleryImages')}><AdminDelimitedInput multiline value={form.galleryImages||[]} onChange={v=>set('galleryImages',v)}/></ItemField>
          <ItemField label={t('item.upload')}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(!file||!currentUser)return;setBusy(true);setError('');try{const url=await uploadProductPhoto(()=>currentUser.getIdToken(),file,abort.current.signal);if(!form.image)set('image',url);else set('galleryImages',[...form.galleryImages||[],url]);}catch(e){setError((e as any).code||'UPLOAD_FAILED');}finally{setBusy(false);}}}/></ItemField>
          <div className="flex flex-wrap gap-3">{[...new Set<string>([form.image,...form.galleryImages||[]].filter(Boolean))].map((url,i)=><div key={url} className="item-stack"><img src={url} alt={form.name_en||''} className="item-thumb"/>{i>0&&<button type="button" onClick={()=>{set('image',url);set('galleryImages',[form.image,...form.galleryImages||[]].filter((v:string)=>v&&v!==url));}}>{t('item.makeCover')}</button>}<button type="button" onClick={()=>{if(url===form.image){set('image',form.galleryImages?.[0]||'');set('galleryImages',(form.galleryImages||[]).slice(1));}else set('galleryImages',(form.galleryImages||[]).filter((v:string)=>v!==url));}}>{t('item.remove')}</button></div>)}</div>
        </section>
        <details id="item-section-seo" className="item-section"><summary>{t('item.seo')}</summary><div className="item-stack">{(['en','ur','ar'] as const).map(lang=><div key={lang} className="item-grid" dir={lang==='en'?'ltr':'rtl'}>{['title','description','imageAlt'].map(key=>field(`${key}_${lang}`,{label:`${t(key==='title'?'item.seoTitle':key==='description'?'item.seoDescription':'item.imageAlt')} · ${lang.toUpperCase()}`,value:form.seo?.[`${key}_${lang}`]||'',onChange:v=>set('seo',{...form.seo,[`${key}_${lang}`]:v})}))}</div>)}<ItemField label={t('item.keywords')}><AdminDelimitedInput value={form.keywords||[]} onChange={v=>set('keywords',v)}/></ItemField>{field('socialImage',{value:form.seo?.socialImage||'',onChange:v=>set('seo',{...form.seo,socialImage:v})})}</div></details>
        <details id="item-section-recipe" className="item-section"><summary>{t('item.recipe')}</summary>
          <AdminRecipeEditor
            disabled={blocked||loadFailed}
            recipeIngredients={form.recipeIngredients}
            filledRecipes={form.filledRecipes}
            recipe_en={form.recipe_en}
            recipe_ur={form.recipe_ur}
            recipe_ar={form.recipe_ar}
            variantOptions={commerce?.options.map(o=>o.label)||(form.prices?Object.keys(form.prices):[])}
            onChange={patch=>{
              itemDirtyRef.current=true;
              setDirty(true);
              setNotice('');
              setForm(v=>({...v,...patch}));
            }}
          />
        </details>
        <details id="item-section-logistics" className="item-section"><summary>{t('item.logistics')}</summary><div className="item-grid">{choices('orderMode',form.orderMode||'standard',['standard','inquiry_quote','both'],v=>set('orderMode',v))}
          {field('productFamily')}<ItemField label={t('item.packagingSubcategory')}><select value={form.packagingSubcategory||''} onChange={e=>set('packagingSubcategory',e.target.value||null)}><option value="">{t('item.none')}</option>{['tin','tabarruk','wedding','baby','acrylic'].map(x=><option value={x} key={x}>{t(`item.packaging.${x}`)}</option>)}</select></ItemField>
          {['preparationDays','shippingWeightG','displayOrder','wholesale','moqOverride'].map(key=>field(key,{type:'number',publish:key==='preparationDays'&&commerce?.kind==='packaging'}))}
          {['collections','occasions','inclusions','exclusions'].map(key=><ItemField key={key} label={t(`item.${key}`)}><AdminDelimitedInput multiline={key==='inclusions'||key==='exclusions'} value={form[key]||[]} onChange={v=>set(key,v)}/></ItemField>)}
          {['supported','allowMonogram','allowCardMessage','allowRibbonColor'].map(key=><ItemField key={key} label={t(`item.${key}`)}><input type="checkbox" checked={form.personalization?.[key]||false} onChange={e=>set('personalization',{...form.personalization,[key]:e.target.checked})}/></ItemField>)}
          {field('notes',{value:form.personalization?.notes||'',onChange:v=>set('personalization',{...form.personalization,notes:v})})}
        </div></details>
        <details id="item-section-private" className="item-section"><summary>{t('item.private')}</summary><div className="item-grid">{['supplierName','supplierItemUrl','internalNotes'].map(key=>field(key,{multiline:key==='internalNotes'}))}{['supplierCost','referencePrice','targetMarginPercent'].map(key=>field(key,{type:'number'}))}</div></details>
        <section id="item-section-review" className="item-section item-review item-stack"><h4 tabIndex={-1}>{t('item.review')}</h4><button type="button" aria-expanded={preview} onClick={()=>setPreview(v=>!v)}>{t('item.review')}</button><p className="item-hint">{readiness?t(`item.reason.${readiness}`,t('item.failed')):t('item.ready')}</p>{preview&&<><h4>{form[`name_${language}`]||form.name_en}</h4><p>{form[`desc_${language}`]||form.desc_en}</p><p>{form.category} · {form.id}</p>{commerce?.options.map((o,i)=><p key={i}><bdi>{o.label}: {optionPrice(form,i)??'—'} PKR</bdi></p>)}{form.recipeIngredients?.length>0&&<p><bdi>{t('item.recipe')}: {form.recipeIngredients.map((i:any)=>`${i.productId} (${i.grams}g)`).join(' + ')}</bdi></p>}<p>{t('item.fallback')}</p></>}</section>
        <AdminCatalogConfiguration key={configuration.revision} configuration={configuration} onDirtyChange={markConfigurationDirty} onBusyChange={markConfigurationBusy} onSave={async value=>{if(!currentUser)return;const res=await adminRequest<{configuration:CatalogConfiguration}>(()=>currentUser.getIdToken(),'/api/admin/catalog/configuration',{method:'PUT',body:{expectedRevision:configuration.revision,configuration:value},signal:abort.current.signal});await refresh();setConfiguration(res.configuration);}}/>
      </fieldset>}
    </form>
    {(notice||loadFailed)&&<p className="item-status" role={loadFailed?'alert':'status'}>{loadFailed?`${t('item.failed')} ${error}`:notice?t('item.saved'):''}</p>}
    <footer className="item-actions">{configurationDirty&&<p className="item-action-hint" role="status">{t('item.saveConfigurationFirst')}</p>}<button type="button" disabled={blocked||loading||loadFailed||configurationDirty} onClick={()=>void save('draft')}>{t('item.draft')}</button>{product&&<button type="submit" form="admin-item-form" disabled={blocked||loading||loadFailed||configurationDirty}>{t('item.save')}</button>}<button type="button" className="item-primary" disabled={blocked||loading||loadFailed||configurationDirty||!!readiness} onClick={()=>void save('published')}>{t(busy?'item.loading':'item.publish')}</button></footer>
  </div></div>;
}
