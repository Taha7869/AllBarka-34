import type { Product } from '../types';
import type { ProductCommerce, CommerceOption } from './productCommerce';
import { calculatedUnitPrice, prepareCommercePrices } from './productCommerce';
import { validateDynamicProduct } from './catalogSchema';

export const emptyCommerce = (): ProductCommerce => ({version:1,kind:'food',pricingMode:'manual',quantityMode:'fixed',baseQuantity:null,baseUnit:'g',basePrice:null,options:[],custom:null});
export const newItem = (category='dry-fruits'): Record<string,any> => ({id:'',name_en:'',name_ur:'',name_ar:'',desc_en:'',desc_ur:'',desc_ar:'',category,status:'draft',orderMode:'standard',active:false,prices:{},commerce:emptyCommerce(),attributes:[],seo:{},galleryImages:[],stock:9999});
export function itemSlug(name: string): string { return name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80); }
export function optionPrice(product: Record<string,any>, index: number): number | null {
  const c=product.commerce as ProductCommerce, o=c.options[index];
  try { return c.pricingMode==='calculated' && !o.override ? calculatedUnitPrice(c,o.quantity,o.unit) : product.prices[o.label] ?? null; } catch { return null; }
}
export function itemPayload(form: Record<string,any>, status: string, commerceTouched: boolean, existing?: Product | null): Record<string,any> {
  const body:Record<string,any> = {...form,status,active:status==='published',quoteOnly:form.orderMode==='inquiry_quote'};
  delete body.revision;delete body.adminRevision;delete body.catalogRevision;delete body.schemaVersion;delete body.variants;
  if (existing) body.expectedRevision=Number(form.adminRevision ?? form.revision ?? 0);
  if (existing && (!form.commerce || !commerceTouched)) { delete body.commerce;delete body.prices;delete body.shippingWeights; }
  return body;
}
export function publishReadiness(form: Record<string,any>): string | null {
  try { validateDynamicProduct(prepareCommercePrices({...form,status:'published',active:true,quoteOnly:form.orderMode==='inquiry_quote'})); return null; }
  catch (error) { return (error as any).code || (error as Error).message; }
}

/** Recognize explicit legacy quantities only. Unknown labels require explicit pack review. */
export function legacyCommerceOptions(product:Record<string,any>):CommerceOption[] {
  const variants=Array.isArray(product.variants)&&product.variants.length?product.variants:Object.entries(product.prices||{}).map(([label,price])=>({label,price}));
  return variants.map((variant:any)=>{
    const match=/^(\d+(?:\.\d+)?)\s*(mg|kg|g|ml|l|pcs?|pieces?|packs?)$/i.exec(variant.label);
    const token=match?.[2].toLowerCase();
    const unit:CommerceOption['unit']=!token?'pack':token.startsWith('pc')||token.startsWith('piece')?'piece':token.startsWith('pack')?'pack':token==='l'?'L':token as CommerceOption['unit'];
    return {label:variant.label,quantity:match?Number(match[1]):1,unit,override:true,available:variant.available!==false,
      shippingWeightG:variant.weightGrams??product.shippingWeights?.[variant.label]??null,...(variant.moqOverride?{moqOverride:variant.moqOverride}:{})};
  });
}
