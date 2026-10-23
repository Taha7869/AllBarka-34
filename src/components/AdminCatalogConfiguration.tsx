import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { CatalogConfiguration } from '../lib/catalogConfiguration';
import { MEASUREMENT_UNITS } from '../lib/productCommerce';
import AdminDelimitedInput from './AdminDelimitedInput';
import { ItemField } from './AdminItemField';
export default function AdminCatalogConfiguration({configuration,onSave}:{configuration:CatalogConfiguration;onSave:(value:CatalogConfiguration)=>Promise<void>}) {
  const {t}=useLanguage();
  const [value,setValue]=useState(()=>structuredClone(configuration));
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const change=(family:'templates'|'taxonomy',index:number,patch:Record<string,unknown>)=>setValue(v=>({...v,[family]:v[family].map((entry,i)=>i===index?{...entry,...patch}:entry)}));
  return <details className="item-section"><summary>{t('item.configuration')}</summary>
    <div className="item-stack">
      {(['taxonomy','templates'] as const).map(family=><div key={family} className="item-stack">
        <h4>{t(family==='taxonomy'?'item.category':'item.template')}</h4>
        {value[family].map((entry,index)=><details key={`${family}-${index}`} className="item-option"><summary>{entry.name_en || t('item.add')}</summary><div className="item-grid">
          <ItemField label={t('item.id')} required><input value={entry.id} disabled={configuration[family].some(old=>old.id===entry.id)} onChange={e=>change(family,index,{id:e.target.value})}/></ItemField>
          {(['en','ur','ar'] as const).map(lang=><ItemField key={lang} label={`${t('item.name')} · ${lang.toUpperCase()}`} required={lang==='en'}><input dir={lang==='en'?'ltr':'rtl'} value={entry[`name_${lang}`]} onChange={e=>change(family,index,{[`name_${lang}`]:e.target.value})}/></ItemField>)}
          {'type' in entry?<>
            <ItemField label={t('item.type')} required><select value={entry.type} disabled={configuration.taxonomy.some(old=>old.id===entry.id)} onChange={e=>change(family,index,{type:e.target.value})}>{['category','collection','occasion'].map(x=><option key={x} value={x}>{t(`item.${x==='category'?'categoryType':x}`)}</option>)}</select></ItemField>
            {(['en','ur','ar'] as const).map(lang=><ItemField key={lang} label={`${t('item.description')} · ${lang.toUpperCase()}`}><textarea dir={lang==='en'?'ltr':'rtl'} value={entry[`description_${lang}`]} onChange={e=>change(family,index,{[`description_${lang}`]:e.target.value})}/></ItemField>)}
            <ItemField label={t('item.visible')}><input type="checkbox" checked={entry.visible} onChange={e=>change(family,index,{visible:e.target.checked})}/></ItemField>
          </>:<>
            <ItemField label={t('item.kind')} required><select value={entry.kind} onChange={e=>change(family,index,{kind:e.target.value})}>{['food','liquid','packaging','gift'].map(x=><option key={x} value={x}>{t(`item.${x}`)}</option>)}</select></ItemField>
            <ItemField label={t('item.category')} required><input value={entry.defaultCategory} onChange={e=>change(family,index,{defaultCategory:e.target.value})}/></ItemField>
            <ItemField label={t('item.unit')} required><select value={entry.defaultUnit} onChange={e=>change(family,index,{defaultUnit:e.target.value})}>{MEASUREMENT_UNITS.map(x=><option key={x} value={x}>{t(`item.${x}`,x)}</option>)}</select></ItemField>
            <ItemField label={t('item.archived')}><input type="checkbox" checked={entry.archived} onChange={e=>change(family,index,{archived:e.target.checked})}/></ItemField>
            <div className="item-wide item-stack"><h5>{t('item.attributes')}</h5>{entry.attributes.map((attribute,i)=><div className="item-grid item-option" key={i}>
              {['key','label_en','label_ur','label_ar'].map(key=><ItemField key={key} label={key==='key'?t('item.id'):`${t('item.name')} · ${key.slice(-2).toUpperCase()}`} required={key==='key'||key==='label_en'}><input value={(attribute as any)[key]} onChange={e=>change(family,index,{attributes:entry.attributes.map((a,j)=>j===i?{...a,[key]:e.target.value}:a)})}/></ItemField>)}
              <ItemField label={t('item.type')} required><select value={attribute.type} onChange={e=>change(family,index,{attributes:entry.attributes.map((a,j)=>j===i?{...a,type:e.target.value}:a)})}>{['text','number','select'].map(x=><option key={x} value={x}>{t(`item.${x}`,x)}</option>)}</select></ItemField>
              <ItemField label={t('item.options')}><AdminDelimitedInput value={attribute.options} onChange={v=>change(family,index,{attributes:entry.attributes.map((a,j)=>j===i?{...a,options:v}:a)})}/></ItemField>
              <ItemField label={t('item.required')}><input type="checkbox" checked={attribute.required} onChange={e=>change(family,index,{attributes:entry.attributes.map((a,j)=>j===i?{...a,required:e.target.checked}:a)})}/></ItemField>
              <button type="button" onClick={()=>change(family,index,{attributes:entry.attributes.filter((_,j)=>j!==i)})}>{t('item.remove')}</button>
            </div>)}<button type="button" disabled={entry.attributes.length>=24} onClick={()=>change(family,index,{attributes:[...entry.attributes,{key:'',label_en:'',label_ur:'',label_ar:'',type:'text',required:false,options:[]}]})}>{t('item.add')}</button></div>
          </>}
        </div></details>)}
        <button type="button" disabled={value[family].length>=(family==='templates'?50:150)} onClick={()=>setValue(v=>({...v,[family]:[...v[family],family==='taxonomy'?{id:'',type:'category',name_en:'',name_ur:'',name_ar:'',description_en:'',description_ur:'',description_ar:'',visible:true}:{id:'',name_en:'',name_ur:'',name_ar:'',kind:'food',defaultCategory:'dry-fruits',defaultUnit:'g',archived:false,attributes:[]}]}))}>{t(family==='taxonomy'?'item.addTaxonomy':'item.addTemplate')}</button>
      </div>)}
      {error&&<p role="alert">{t('item.failed')} <bdi>{error}</bdi></p>}
      <button type="button" disabled={saving} onClick={async()=>{setSaving(true);setError('');try{await onSave(value);}catch(e){setError((e as any).code||'REQUEST_FAILED');}finally{setSaving(false);}}}>{t(saving?'item.loading':'item.save')}</button>
    </div>
  </details>;
}
