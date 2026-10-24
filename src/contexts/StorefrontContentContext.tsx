import {createContext,useContext,useEffect,useRef,useState,useCallback,type ReactNode} from 'react';
import {DEFAULT_STOREFRONT_CONTENT,validatePublicStorefrontContent,type StorefrontContent} from '../lib/storefrontContent';
import {apiUrl} from '../lib/apiUrl';
const Context=createContext({content:DEFAULT_STOREFRONT_CONTENT,loading:false,refresh:async()=>{}});
export function StorefrontContentProvider({children,initialContent}:{children:ReactNode;initialContent?:StorefrontContent}){
  const[content,setContent]=useState(initialContent||DEFAULT_STOREFRONT_CONTENT);const[loading,setLoading]=useState(!initialContent);const active=useRef(false);const pending=useRef<AbortController|null>(null);
  const refresh=useCallback(async()=>{if(pending.current)return;const controller=new AbortController();pending.current=controller;const timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(apiUrl('/api/storefront-content'),{signal:controller.signal,credentials:'omit',cache:'no-store'});if(!response.ok)return;const data=await response.json();if(active.current&&!controller.signal.aborted&&data.content?.version===1&&Array.isArray(data.content.sections))setContent(validatePublicStorefrontContent(data.content));}catch{/* Existing published/default presentation remains available. */}finally{if(active.current)setLoading(false);clearTimeout(timer);if(pending.current===controller)pending.current=null;}},[]);
  useEffect(()=>{active.current=true;if(initialContent){setContent(initialContent);setLoading(false);}else void refresh();const focus=()=>{if(!document.hidden&&!initialContent)void refresh();};const timer=setInterval(focus,60000);window.addEventListener('focus',focus);return()=>{active.current=false;pending.current?.abort();clearInterval(timer);window.removeEventListener('focus',focus);};},[refresh,initialContent]);
  return <Context.Provider value={{content,loading,refresh}}>{children}</Context.Provider>;
}
export const useStorefrontContent=()=>useContext(Context).content;
export const useStorefrontContentRefresh=()=>useContext(Context).refresh;

export const useStorefrontContentLoading=()=>useContext(Context).loading;
