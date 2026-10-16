import {storeDraft,draftAllowed,draftCors} from '@/lib/draft-storage';
import {syncEnquiry} from '@/lib/sheet-delivery';
export function OPTIONS(r:Request){return new Response(null,{status:draftAllowed(r,'enquiry')?204:403,headers:{...draftCors(r,'enquiry'),'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});}
export async function POST(r:Request){const response=await storeDraft(r,'enquiry');if(response.ok){const p=await response.clone().json() as {saved?:boolean;id:string};if(p.saved)try{await syncEnquiry(p.id);}catch{console.error('Enquiry draft sheet sync pending');}}for(const[k,v]of Object.entries(draftCors(r,'enquiry')))response.headers.set(k,v);return response;}
