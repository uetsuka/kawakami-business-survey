import {env} from 'cloudflare:workers';
import {database} from './storage';

type Settings={SHEETS_WEBHOOK_URL?:string;SHEETS_SYNC_TOKEN?:string;ADMIN_EMAIL?:string};
export type SheetKind='consumer'|'business'|'enquiry';
type Job={id:string;payload:string;version:number;attempts:number};
export async function queueSheet(kind:SheetKind,id:string,version:number,cells:Record<string,unknown>){
 const payload=JSON.stringify({kind,id,version,cells});
 await database().prepare(`INSERT INTO sheet_jobs (id,payload,version,status,attempts,updated_at,lease_until) VALUES (?,?,?,'pending',0,?,0)
 ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=excluded.version,status='pending',updated_at=excluded.updated_at,lease_until=0
 WHERE excluded.version>sheet_jobs.version`).bind(`${kind}:${id}`,payload,version,Date.now()).run();
}
export async function deliverSheets(jobId?:string){
 const cfg=env as unknown as Settings;
 if(!cfg.SHEETS_WEBHOOK_URL||!cfg.SHEETS_SYNC_TOKEN)return {configured:false,synced:0,pending:true};
 const endpoint=new URL(cfg.SHEETS_WEBHOOK_URL);
 if(endpoint.protocol!=='https:'||endpoint.hostname!=='script.google.com'||!endpoint.pathname.endsWith('/exec'))throw new Error('Invalid Sheets endpoint');
 const jobs=await database().prepare(`SELECT id,payload,version,attempts FROM sheet_jobs WHERE status='pending' AND lease_until<? ${jobId?'AND id=?':''} ORDER BY updated_at LIMIT 5`).bind(Date.now(),...(jobId?[jobId]:[])).all<Job>();
 let synced=0;
 for(const job of jobs.results){
  const claim=await database().prepare("UPDATE sheet_jobs SET lease_until=?,attempts=attempts+1 WHERE id=? AND version=? AND status='pending' AND lease_until<?").bind(Date.now()+45000,job.id,job.version,Date.now()).run();
  if(!claim.meta.changes)continue;
  try{
   const p=JSON.parse(job.payload);
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,token:cfg.SHEETS_SYNC_TOKEN}),redirect:'follow',signal:AbortSignal.timeout(25000)});
   if(!r.ok)throw new Error(`Sheet receiver HTTP ${r.status}`);
   const data=await r.json() as {saved?:boolean;id?:string;notified?:boolean};
   if(data.saved!==true||data.id!==p.id)throw new Error('Sheet receiver did not confirm save');
   if(data.notified===false)throw new Error('Sheet saved; admin notification pending');
   await database().prepare("UPDATE sheet_jobs SET status='synced',last_error=NULL,lease_until=0,synced_at=? WHERE id=? AND version=?").bind(Date.now(),job.id,job.version).run();synced++;
  }catch(e){
   const delay=Math.min(300000,1000*2**Math.min(job.attempts,8));
   await database().prepare('UPDATE sheet_jobs SET last_error=?,lease_until=? WHERE id=? AND version=?').bind(e instanceof Error?e.message:'Sheet delivery failed',Date.now()+delay,job.id,job.version).run();
  }
 }
 const pending=await database().prepare("SELECT count(*) AS count FROM sheet_jobs WHERE status='pending'").first<{count:number}>();
 return {configured:true,synced,pending:!!pending?.count};
}


const businessKeys=['business','role','market','products','use','appeal','pack','volume','requirements','price','timing','followup'];
const businessHeaders=['Q1 業態','Q2 購買への関与','Q3 対象市場','Q4 関心商品','Q5 用途','Q6 魅力・価値','Q7 希望パック','Q8 月間想定量','Q9 仕入れ要件','Q10 価格検討方法','Q11 導入時期','Q12 フォロー希望'];
export async function syncBusiness(id:string,send=true){
 const r=await database().prepare('SELECT * FROM business_responses WHERE id=?').bind(id).first<Record<string,any>>();if(!r)return;
 const a=JSON.parse(r.answers);const cells:Record<string,unknown>={'回答ID':id,'回答日時（UTC）':new Date(r.created_at).toISOString(),'追加要件':r.notes,'会社名':r.company,'氏名':r.name,'メール':r.email,'同意':!!r.consent,'テスト回答':!!r.test};
 businessKeys.forEach((key,i)=>cells[businessHeaders[i]]=(a[key]||[]).join('; '));
 await queueSheet('business',id,r.created_at,cells);if(send)await deliverSheets('business:'+id);
}
export async function syncEnquiry(id:string,send=true){
 const r=await database().prepare('SELECT * FROM enquiries WHERE id=?').bind(id).first<Record<string,any>>();if(!r)return;
 const cells={'受付ID':id,'回答日時（UTC）':new Date(r.created_at).toISOString(),'会社名':r.company,'氏名':r.name,'メール':r.email,'国・地域':r.country,'業態':r.business,'関心商品':JSON.parse(r.products).join('; '),'用途・販売チャネル':r.use,'想定数量':r.volume,'希望時期':r.timeline,'問い合わせ内容':r.details,'同意':!!r.consent,'テスト回答':!!r.test};
 await queueSheet('enquiry',id,r.created_at,cells);if(send)await deliverSheets('enquiry:'+id);
}
