import { MAIN_NAV_ITEMS } from '../config/navigation';
import { validateProductMediaUrl } from './productMedia';
export const HOME_SECTIONS=['collections','showcase','occasions','care','reviews','faq'] as const;
export type HomeSectionId=typeof HOME_SECTIONS[number];
export interface LocalText { en:string; ur:string; ar:string }
export interface ContentArticle {slug:string;visible:boolean;title:LocalText;excerpt:LocalText;body:LocalText;image:string;category:string;publishedDate:string;relatedProductIds:string[]}
export interface StorefrontContent {
  version:1;
  hero:{enabled:boolean;heading:LocalText;accent:LocalText;description:LocalText;primaryLabel:LocalText;primaryPath:string;secondaryLabel:LocalText;secondaryPath:string;image:string;mobileImage:string};
  banner:{enabled:boolean;text:LocalText;linkLabel:LocalText;path:string};
  sections:{id:HomeSectionId;visible:boolean}[];
  navigation:{id:string;label:LocalText;path:string;visible:boolean}[];
  faqs:{id:string;visible:boolean;question:LocalText;answer:LocalText}[];
  articles:ContentArticle[];
  hiddenArticles:string[];
}
export const blankText=():LocalText=>({en:'',ur:'',ar:''});
export const DEFAULT_STOREFRONT_CONTENT:StorefrontContent={version:1,
  hero:{enabled:false,heading:blankText(),accent:blankText(),description:blankText(),primaryLabel:blankText(),primaryPath:'/shop/dry-fruits',secondaryLabel:blankText(),secondaryPath:'/gifting',image:'/images/generated/hero-dry-fruits-wide-v1.webp',mobileImage:'/images/generated/hero-dry-fruits-mobile-v1.webp'},
  banner:{enabled:false,text:blankText(),linkLabel:blankText(),path:''},
  sections:HOME_SECTIONS.map(id=>({id,visible:true})),navigation:[],articles:[],hiddenArticles:[],
  faqs:[
    {id:'delivery',visible:true,question:{en:'Where do you deliver?',ur:'ترسیل کہاں ہوتی ہے؟',ar:'أين تتوفر خدمة التوصيل؟'},answer:{en:'We deliver in Lahore and across Pakistan. Your checkout quote confirms the delivery charge for your address and selected items.',ur:'ہم لاہور اور پاکستان بھر میں ترسیل کرتے ہیں۔ چیک آؤٹ پر آپ کے پتے اور منتخب اشیا کے مطابق چارج دکھایا جاتا ہے۔',ar:'نوصل في لاهور وإلى أنحاء باكستان. يؤكد عرض الدفع رسوم التوصيل حسب عنوانك ومنتجاتك.'}},
    {id:'portions',visible:true,question:{en:'Can I choose the pack size?',ur:'کیا پیک کا سائز منتخب کر سکتا ہوں؟',ar:'هل يمكنني اختيار حجم العبوة؟'},answer:{en:'Choose from the available options on each product. Items with custom quantity controls show their allowed units, range and increments before you add them to your bag.',ur:'ہر آئٹم کے دستیاب اختیارات سے منتخب کریں۔ اپنی مقدار والے آئٹم پر اکائی، حدود اور وقفہ بیگ میں شامل کرنے سے پہلے دکھایا جاتا ہے۔',ar:'اختر من الخيارات المتاحة لكل منتج. تعرض المنتجات ذات الكمية المخصصة وحداتها وحدودها وزيادتها قبل الإضافة للسلة.'}},
    {id:'packaging',visible:true,question:{en:'How do celebration packaging orders work?',ur:'تقریبات کی پیکنگ کا آرڈر کیسے ہوتا ہے؟',ar:'كيف تعمل طلبات تغليف المناسبات؟'},answer:{en:'Review the saved option price, minimum quantity and preparation details on the product. Celebration packaging requires at least 10 calendar days of preparation. Unpriced or personalized requests are confirmed through an inquiry.',ur:'آئٹم پر محفوظ نرخ، کم از کم تعداد اور تیاری کی تفصیل دیکھیں۔ تقریبات کی پیکنگ کے لیے کم از کم ۱۰ دن درکار ہیں۔ غیر مقرر قیمت یا ذاتی ترتیب کے لیے انکوائری کریں۔',ar:'راجع سعر الخيار والحد الأدنى وتفاصيل التجهيز على المنتج. يتطلب تغليف المناسبات 10 أيام تقويمية على الأقل. تُؤكد الطلبات غير المسعرة أو المخصصة عبر الاستفسار.'}},
  ]};
export class ContentError extends Error {constructor(public code:string,public status=400){super(code);}}
const fail=(code:string):never=>{throw new ContentError(code);};
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const bool=(v:unknown):boolean=>typeof v==='boolean'?v:fail('INVALID_CONTENT_BOOLEAN');
const text=(v:unknown,max:number):string=>typeof v==='string'&&v.length<=max?v.trim():fail('INVALID_CONTENT_TEXT');
const local=(v:unknown,max:number):LocalText=>{if(!object(v))return fail('INVALID_CONTENT_TRANSLATION');return {en:text(v.en??'',max),ur:text(v.ur??'',max),ar:text(v.ar??'',max)};};
const id=(v:unknown):string=>typeof v==='string'&&/^[a-z][a-z0-9_-]{1,79}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v)?v:fail('INVALID_CONTENT_ID');
export function contentDestination(value:unknown,optional=false):string {
  const path=text(value,700);if(!path&&optional)return '';
  if(!path.startsWith('/')||path.startsWith('//')||/[\\\s\u0000-\u001f\u007f]/.test(path))return fail('INVALID_CONTENT_DESTINATION');
  let url:URL;let pathname:string;
  try{url=new URL(path,'https://allbarka.com');pathname=decodeURIComponent(url.pathname);}catch{return fail('INVALID_CONTENT_DESTINATION');}
  if(url.origin!=='https://allbarka.com'||url.pathname!==path.split(/[?#]/)[0]||!/^\/(?:|shop(?:\/[a-z0-9_-]+)?|category\/[a-z0-9_-]+|product\/[a-z0-9_-]+|gifting|wholesale|occasions(?:\/[a-z0-9_-]+)?|journal(?:\/[a-z0-9_-]+)?|faq|story|contact|pages\/[a-z0-9_-]+|policies(?:\/[a-z0-9_-]+)?)$/.test(pathname)||!/^#[a-zA-Z0-9_-]*$|^$/.test(url.hash))return fail('INVALID_CONTENT_DESTINATION');
  for(const[key,value]of url.searchParams)if(!['category','occasion','search','filter','view','sort'].includes(key)||value.length>200)return fail('INVALID_CONTENT_DESTINATION');
  return path;
}
export const contentText=(value:LocalText,language:'en'|'ur'|'ar')=>value[language]||value.en;
export function validateStorefrontContent(value:unknown,publish=false):StorefrontContent {
  if(!object(value)||value.version!==1||!object(value.hero)||!object(value.banner))return fail('INVALID_STOREFRONT_CONTENT');
  const h=value.hero,b=value.banner;
  let hero:StorefrontContent['hero'];
  try{hero={enabled:bool(h.enabled),heading:local(h.heading,180),accent:local(h.accent,100),description:local(h.description,1200),primaryLabel:local(h.primaryLabel,80),primaryPath:contentDestination(h.primaryPath),secondaryLabel:local(h.secondaryLabel,80),secondaryPath:contentDestination(h.secondaryPath),image:validateProductMediaUrl(h.image,'image'),mobileImage:validateProductMediaUrl(h.mobileImage,'image')};}catch(error){throw new ContentError(error instanceof ContentError?error.code:'INVALID_CONTENT_MEDIA');}
  const banner={enabled:bool(b.enabled),text:local(b.text,400),linkLabel:local(b.linkLabel,80),path:contentDestination(b.path,true)};
  if(publish&&hero.enabled&&(!hero.heading.en||!hero.description.en||!hero.primaryLabel.en||!hero.secondaryLabel.en))return fail('CONTENT_HERO_REQUIRED');
  if(publish&&banner.enabled&&(!banner.text.en||(banner.path&&!banner.linkLabel.en)))return fail('CONTENT_BANNER_REQUIRED');
  if(!Array.isArray(value.sections)||value.sections.length!==HOME_SECTIONS.length)return fail('INVALID_HOME_SECTIONS');
  const seen=new Set<string>();
  const sections=value.sections.map((entry:any)=>{if(!object(entry)||!HOME_SECTIONS.includes(entry.id)||seen.has(entry.id))return fail('INVALID_HOME_SECTIONS');seen.add(entry.id);return {id:entry.id as HomeSectionId,visible:bool(entry.visible)};});
  const array=(v:any,max:number)=>Array.isArray(v)&&v.length<=max?v:fail('INVALID_CONTENT_LIST');
  const navigation=array(value.navigation,MAIN_NAV_ITEMS.length).map(entry=>{if(!object(entry)||!MAIN_NAV_ITEMS.some(x=>x.id===entry.id)||seen.has(`nav:${entry.id}`))return fail('INVALID_CONTENT_NAVIGATION');seen.add(`nav:${entry.id}`);return {id:entry.id,label:local(entry.label,80),path:contentDestination(entry.path),visible:bool(entry.visible)};});
  const faqs=array(value.faqs,30).map(entry=>{if(!object(entry))return fail('INVALID_CONTENT_FAQ');const key=id(entry.id);if(seen.has(`faq:${key}`))return fail('INVALID_CONTENT_FAQ');seen.add(`faq:${key}`);const result={id:key,visible:bool(entry.visible),question:local(entry.question,300),answer:local(entry.answer,4000)};if(publish&&result.visible&&(!result.question.en||!result.answer.en))return fail('CONTENT_FAQ_REQUIRED');return result;});
  const categories=['Storage & Care','Culinary & Pairings','Gifting','Wellness & Science','Buying Guides'];
  const articles=array(value.articles,30).map(entry=>{if(!object(entry))return fail('INVALID_CONTENT_ARTICLE');const slug=id(entry.slug);if(seen.has(`article:${slug}`))return fail('INVALID_CONTENT_ARTICLE');seen.add(`article:${slug}`);let image:string;try{image=validateProductMediaUrl(entry.image,'image');}catch{return fail('INVALID_CONTENT_MEDIA');}
    if(!categories.includes(entry.category)||!/^\d{4}-\d{2}-\d{2}$/.test(entry.publishedDate)||!Number.isFinite(Date.parse(entry.publishedDate))||new Date(entry.publishedDate).toISOString().slice(0,10)!==entry.publishedDate)return fail('INVALID_CONTENT_ARTICLE');
    const relatedProductIds=array(entry.relatedProductIds,12).map((v:any)=>text(v,80));if(relatedProductIds.some((v:string)=>!/^[-a-z0-9_]{2,80}$/.test(v)))return fail('INVALID_CONTENT_ARTICLE');
    const result={slug,visible:bool(entry.visible),title:local(entry.title,200),excerpt:local(entry.excerpt,1500),body:local(entry.body,20000),image,category:entry.category,publishedDate:entry.publishedDate,relatedProductIds};
    if(publish&&result.visible&&(!result.title.en||!result.excerpt.en||!result.body.en))return fail('CONTENT_ARTICLE_REQUIRED');return result;
  });
  const result:StorefrontContent={version:1,hero,banner,sections,navigation,faqs,articles,hiddenArticles:[]};
  if(new TextEncoder().encode(JSON.stringify(result)).length>100000)return fail('CONTENT_TOO_LARGE');
  return result;
}
export function publicStorefrontContent(value:StorefrontContent):StorefrontContent {
  return {...value,faqs:value.faqs.filter(x=>x.visible),articles:value.articles.filter(x=>x.visible),hiddenArticles:value.articles.filter(x=>!x.visible).map(x=>x.slug)};
}

export function validatePublicStorefrontContent(value:unknown):StorefrontContent {
  const parsed=validateStorefrontContent(value,true);const hidden=object(value)?value.hiddenArticles:[];
  if(!Array.isArray(hidden)||hidden.length>30||hidden.some(x=>typeof x!=='string'||!/^[a-z][a-z0-9_-]{1,79}$/.test(x)))throw new ContentError('INVALID_STOREFRONT_CONTENT');
  return {...parsed,hiddenArticles:[...new Set(hidden)]};
}
