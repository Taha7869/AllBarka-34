import type { NavItem } from '../config/navigation';
import { JOURNAL_ARTICLES,type JournalArticle } from '../data/articles';
import { contentText,type StorefrontContent } from './storefrontContent';
export function contentNavigation(items:NavItem[],content:StorefrontContent,language:'en'|'ur'|'ar'):NavItem[]{
  return items.flatMap(item=>{const override=content.navigation.find(entry=>entry.id===item.id);if(!override)return [item];if(!override.visible)return [];
    const label=contentText(override.label,language)||item.defaultLabel;
    return [{...item,path:override.path,labelKey:contentText(override.label,language)?`content.nav.${item.id}`:item.labelKey,defaultLabel:label,
      dropdownItems:override.path!==item.path?[{id:`content-${item.id}`,path:override.path,labelKey:`content.nav.${item.id}`,defaultLabel:label},...item.dropdownItems||[]]:item.dropdownItems}];});
}
export function contentJournal(content:StorefrontContent,language:'en'|'ur'|'ar'):JournalArticle[]{
  const hidden=new Set(content.hiddenArticles||[]);const entries=new Map(JOURNAL_ARTICLES.filter(x=>!hidden.has(x.slug)).map(x=>[x.slug,x]));
  for(const value of content.articles){if(!value.visible){entries.delete(value.slug);continue;}const body=contentText(value.body,language);entries.set(value.slug,{slug:value.slug,title:contentText(value.title,language),subtitle:contentText(value.excerpt,language),excerpt:contentText(value.excerpt,language),category:value.category as JournalArticle['category'],readTime:`${Math.max(1,Math.ceil(body.split(/\s+/).length/200))} min`,publishedDate:value.publishedDate,updatedDate:value.publishedDate,author:{name:'AllBarka',role:'Editorial'},image:value.image,tags:[],sections:[{heading:'',content:body.split(/\n+/).filter(Boolean)}],relatedProductIds:value.relatedProductIds});}
  return [...entries.values()];
}
