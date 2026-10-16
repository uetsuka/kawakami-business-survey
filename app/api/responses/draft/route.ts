import {storeDraft,draftAllowed,draftCors} from '@/lib/draft-storage';
import {syncBusiness} from '@/lib/sheet-delivery';
export function OPTIONS(r:Request){return new Response(null,{status:draftAllowed(r,'business')?204:403,headers:{...draftCors(r,'business'),'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});}
export async function POST(r:Request){const response=await storeDraft(r,'business');if(response.ok){const p=await response.clone().json() as {saved?:boolean;id:string};if(p.saved)try{await syncBusiness(p.id);}catch{console.error('Business draft sheet sync pending');}}for(const[k,v]of Object.entries(draftCors(r,'business')))response.headers.set(k,v);return response;}
