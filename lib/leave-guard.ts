type GuardOptions={active:()=>boolean;flush:()=>void};
export function installLeaveGuard({active,flush}:GuardOptions){
 let dialog:HTMLDialogElement|null=null,previous:HTMLElement|null=null,leaving=false;
 const beforeUnload=(event:BeforeUnloadEvent)=>{if(!active()||leaving)return;flush();event.preventDefault();event.returnValue='';};
 const hidden=()=>{if(document.visibilityState==='hidden'&&active())flush();};
 const pagehide=()=>{if(active())flush();};
 const click=(event:MouseEvent)=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!active())return;
  const link=(event.target as Element)?.closest?.('a');if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self')return;
  const destination=new URL(link.href,location.href);if(!['http:','https:'].includes(destination.protocol)||destination.origin===location.origin&&destination.pathname===location.pathname&&destination.search===location.search)return;
  event.preventDefault();event.stopImmediatePropagation();flush();if(dialog)return;
  previous=document.activeElement as HTMLElement;dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','leave-question');
  dialog.style.cssText='border:1px solid #b3945e;border-radius:12px;padding:28px;max-width:420px;width:calc(100% - 40px);background:#fffaf0;color:#291a13;box-shadow:0 14px 45px #0003;font:16px/1.6 system-ui';
  dialog.innerHTML='<h2 id="leave-question" style="font:600 24px/1.3 Georgia,serif;margin:0 0 14px">Leave before finishing?</h2><p style="margin:0 0 24px">Your response is not complete. We save your progress automatically, but your entries may not be available when you return. Would you like to leave?</p><div style="display:flex;gap:12px;justify-content:flex-end"><button type="button" data-stay style="padding:12px 20px;border:1px solid #8b6f48;border-radius:7px;background:transparent;color:#291a13;cursor:pointer">No — continue</button><button type="button" data-leave style="padding:12px 20px;border:1px solid #a53e20;border-radius:7px;background:#a53e20;color:white;cursor:pointer">Yes — leave</button></div>';
  const close=()=>{dialog?.close();dialog?.remove();dialog=null;previous?.focus();};
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.querySelector('[data-stay]')!.addEventListener('click',close);
  dialog.querySelector('[data-leave]')!.addEventListener('click',()=>{flush();leaving=true;close();location.assign(destination.href);});
  document.body.appendChild(dialog);dialog.showModal();(dialog.querySelector('[data-stay]')as HTMLElement).focus();
 };
 window.addEventListener('beforeunload',beforeUnload);window.addEventListener('pagehide',pagehide);document.addEventListener('visibilitychange',hidden);document.addEventListener('click',click,true);
 return()=>{window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('pagehide',pagehide);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('click',click,true);dialog?.remove();};
}
