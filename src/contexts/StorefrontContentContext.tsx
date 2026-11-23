import {createContext,useContext,useEffect,useRef,useState,useCallback,type ReactNode} from 'react';
import {DEFAULT_STOREFRONT_CONTENT,validatePublicStorefrontContent,type StorefrontContent} from '../lib/storefrontContent';
import {sanitizePublishedReviews,type PublishedPatronReview} from '../lib/publishedReviews';
import {apiUrl} from '../lib/apiUrl';

const EMPTY_REVIEWS: PublishedPatronReview[] = [];

const Context=createContext<{
  content: StorefrontContent;
  publishedReviews: PublishedPatronReview[];
  loading: boolean;
  refresh: () => Promise<void>;
}>({
  content: DEFAULT_STOREFRONT_CONTENT,
  publishedReviews: EMPTY_REVIEWS,
  loading: false,
  refresh: async()=>{},
});

export function StorefrontContentProvider({
  children,
  initialContent,
  initialPublishedReviews,
}:{
  children: ReactNode;
  initialContent?: StorefrontContent;
  initialPublishedReviews?: PublishedPatronReview[];
}){
  const[content,setContent]=useState(initialContent||DEFAULT_STOREFRONT_CONTENT);
  const[publishedReviews,setPublishedReviews]=useState<PublishedPatronReview[]>(
    () => (initialPublishedReviews ? sanitizePublishedReviews(initialPublishedReviews) : EMPTY_REVIEWS),
  );
  const[loading,setLoading]=useState(!initialContent);
  const active=useRef(false);
  const pending=useRef<AbortController|null>(null);

  const refresh=useCallback(async()=>{
    if(pending.current)return;
    const controller=new AbortController();
    pending.current=controller;
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(apiUrl('/api/storefront-content'),{signal:controller.signal,credentials:'omit',cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      if(active.current&&!controller.signal.aborted){
        if(data.content?.version===1&&Array.isArray(data.content.sections)){
          setContent(validatePublicStorefrontContent(data.content));
        }
        if(Array.isArray(data.publishedReviews)){
          setPublishedReviews(sanitizePublishedReviews(data.publishedReviews));
        }
      }
    }catch{
      /* Existing published/default presentation remains available. */
    }finally{
      if(active.current)setLoading(false);
      clearTimeout(timer);
      if(pending.current===controller)pending.current=null;
    }
  },[]);

  useEffect(()=>{
    active.current=true;
    if(initialContent){
      setContent(initialContent);
      setLoading(false);
    }else void refresh();
    if(initialPublishedReviews){
      setPublishedReviews(sanitizePublishedReviews(initialPublishedReviews));
    }
    const focus=()=>{if(!document.hidden&&!initialContent)void refresh();};
    const timer=setInterval(focus,60000);
    window.addEventListener('focus',focus);
    return()=>{active.current=false;pending.current?.abort();clearInterval(timer);window.removeEventListener('focus',focus);};
  },[refresh,initialContent,initialPublishedReviews]);

  return <Context.Provider value={{content,publishedReviews,loading,refresh}}>{children}</Context.Provider>;
}

export const useStorefrontContent=()=>useContext(Context).content;
export const usePublishedReviews=()=>useContext(Context).publishedReviews;
export const useStorefrontContentRefresh=()=>useContext(Context).refresh;
export const useStorefrontContentLoading=()=>useContext(Context).loading;
