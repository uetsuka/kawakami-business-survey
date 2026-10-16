'use client';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {installLeaveGuard} from './leave-guard';
export function useDraftAutosave(endpoint:string,id:MutableRefObject<string>,payload:Record<string,unknown>,active:boolean,hasInput:boolean){
 const [state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const current=useRef({endpoint,body:'',active:false}),revision=useRef(0);const serialized=JSON.stringify(payload);
 useEffect(()=>{
  current.current.active=active&&(hasInput||!!id.current);current.current.endpoint=endpoint;
  if(!active||(!hasInput&&!id.current))return;
  id.current ||=crypto.randomUUID();revision.current=Math.max(Date.now(),revision.current+1);
  const body=JSON.stringify({...JSON.parse(serialized),id:id.current,revision:revision.current});current.current.body=body;
  let disposed=false,retry:ReturnType<typeof setTimeout>|undefined;
  const save=async()=>{setState('saving');try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true});if(!r.ok)throw Error();if(!disposed)setState('saved');}catch{if(!disposed){setState('error');retry=setTimeout(save,5000);}}};
  const timer=setTimeout(save,700);return()=>{disposed=true;clearTimeout(timer);clearTimeout(retry);};
 },[endpoint,serialized,active,hasInput,id]);
 useEffect(()=>installLeaveGuard({active:()=>current.current.active,flush:()=>{const c=current.current;if(!c.active||!c.body)return;const blob=new Blob([c.body],{type:'application/json'});if(!navigator.sendBeacon(c.endpoint,blob))void fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:c.body,keepalive:true}).catch(()=>{});}}),[]);
 return state;
}
