import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, UserCheck, UserMinus, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminLanguage } from '../hooks/useAdminLanguage';
import { adminRequest } from '../lib/adminClient';
import type { StaffMember } from '../lib/staffContracts';
import '../styles/staff.css';

export default function AdminStaffPanel() {
  const {currentUser}=useAuth();const {t,isRtl}=useAdminLanguage();
  const [members,setMembers]=useState<{uid:string;values:StaffMember[];truncated:boolean}|null>(null);
  const [email,setEmail]=useState('');const [candidate,setCandidate]=useState<{owner:string;value:StaffMember}|null>(null);
  const [revision,setRevision]=useState(0);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');const [saved,setSaved]=useState(false);const request=useRef<AbortController|null>(null);
  const owner=currentUser?.uid;
  useEffect(()=>{setEmail('');setCandidate(null);setBusy(false);},[owner]);
  const active=useRef(owner);active.current=owner;
  useEffect(()=>{
    const controller=new AbortController();setMembers(null);setCandidate(null);setError('');setLoading(true);
    if(!currentUser){setLoading(false);return;}
    adminRequest<{members:StaffMember[];truncated:boolean}>(()=>currentUser.getIdToken(),'/api/admin/staff',{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted)setMembers({uid:currentUser.uid,values:data.members,truncated:data.truncated});})
      .catch(e=>{if(!controller.signal.aborted)setError(e.code||'REQUEST_FAILED');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>{controller.abort();request.current?.abort();};
  },[currentUser,revision]);
  const lookup=async()=>{
    if(!currentUser||busy)return;const uid=currentUser.uid;const controller=new AbortController();request.current=controller;
    setBusy(true);setError('');setSaved(false);setCandidate(null);
    try{const data=await adminRequest<{member:StaffMember}>(()=>currentUser.getIdToken(),'/api/admin/staff/lookup',{method:'POST',body:{email},signal:controller.signal});if(active.current===uid)setCandidate({owner:uid,value:data.member});}
    catch(e){if(!controller.signal.aborted&&active.current===uid)setError((e as any).code||'REQUEST_FAILED');}
    finally{if(active.current===uid)setBusy(false);}
  };
  const change=async(member:StaffMember,enabled:boolean)=>{
    if(!currentUser||busy)return;const uid=currentUser.uid;const controller=new AbortController();request.current=controller;setBusy(true);setError('');setSaved(false);
    try{await adminRequest(()=>currentUser.getIdToken(),`/api/admin/staff/${encodeURIComponent(member.uid)}`,{method:'PUT',body:{enabled,expectedRevision:member.revision},signal:controller.signal});if(active.current===uid){setSaved(true);setCandidate(null);setRevision(v=>v+1);}}
    catch(e){if(!controller.signal.aborted&&active.current===uid)setError((e as any).code||'REQUEST_FAILED');}
    finally{if(active.current===uid)setBusy(false);}
  };
  const list=members?.uid===owner?members.values:[];const found=candidate?.owner===owner?candidate.value:null;
  return <section className="staff-team" dir={isRtl?'rtl':'ltr'}>
    <div className="staff-team-heading"><ShieldCheck size={24}/><div><h2>{t('staff.team')}</h2><p>{t('staff.teamHint')}</p></div></div>
    <form className="staff-lookup" onSubmit={e=>{e.preventDefault();void lookup();}}>
      <label className="admin-field"><span>{t('staff.email')} ({t('item.required')})</span><input type="email" required maxLength={254} value={email} disabled={busy} onChange={e=>{setEmail(e.target.value);setCandidate(null);}} dir="ltr" autoComplete="off"/></label>
      <button type="submit" className="admin-button admin-button-primary" disabled={busy||!currentUser}><Search size={16}/>{t('staff.lookup')}</button>
    </form>
    {error&&<p className="admin-notice admin-notice-error" role="alert">{t(`staff.error.${error}`,t('staff.error'))}</p>}
    {saved&&<p className="admin-notice" role="status">{t('staff.saved')}</p>}
    {found&&<section className="staff-account-review"><p className="admin-eyebrow">{t('staff.accountReview')}</p><h3>{found.displayName||found.email}</h3><p><bdi>{found.email}</bdi></p><small><bdi>{found.uid}</bdi></small><button type="button" className="admin-button admin-button-primary" disabled={busy} onClick={()=>void change(found,!found.enabled)}>{found.enabled?<UserMinus size={16}/>:<UserCheck size={16}/>} {t(found.enabled?'staff.revoke':'staff.grant')}</button></section>}
    <div className="staff-team-list"><header><h3>{t('staff.team')}</h3><button type="button" className="admin-button" disabled={busy||loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/>{t('admin.refresh')}</button></header>
      {loading?<p role="status">{t('admin.checking')}</p>:list.length===0?<p>{t('staff.noMembers')}</p>:list.map(member=><article key={member.uid}><div><strong dir="auto">{member.displayName||member.email}</strong><p><bdi>{member.email}</bdi></p><span className={`admin-badge ${member.enabled?'admin-badge-success':'admin-badge-muted'}`}>{t(member.enabled?'staff.active':'staff.inactive')}</span></div><button type="button" className="admin-button" disabled={busy} onClick={()=>void change(member,!member.enabled)}>{t(member.enabled?'staff.revoke':'staff.grant')}</button></article>)}
      {members?.truncated&&<p className="admin-notice">{t('staff.memberLimit')}</p>}
    </div>
  </section>;
}
