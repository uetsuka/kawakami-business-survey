import {env} from 'cloudflare:workers';
import {database} from './storage';
import {surveyMessages,type SurveyRecord} from './survey-mail';
type Settings={ADMIN_EMAIL?:string;RESEND_API_KEY?:string;MAIL_FROM?:string;MAIL_RETRY_TOKEN?:string};
export function mailSettings(){return env as unknown as Settings;}
async function prepare(){await database().prepare(`CREATE TABLE IF NOT EXISTS business_mail_jobs (id TEXT PRIMARY KEY,response_id TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at INTEGER NOT NULL,provider_id TEXT,last_error TEXT,lease_until INTEGER NOT NULL DEFAULT 0)`).run();}
export async function enqueueMail(r:SurveyRecord){
 await prepare();
 for(const m of surveyMessages(r,mailSettings().ADMIN_EMAIL||'chiekouetsuka@outlook.jp')){
  await database().prepare('INSERT INTO business_mail_jobs (id,response_id,kind,payload,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(`${r.id}:${m.kind}`,r.id,m.kind,JSON.stringify(m),Date.now()).run();
 }
}
export async function deliverMail(responseId?:string){
 const cfg=mailSettings();
 if(!cfg.RESEND_API_KEY||!cfg.MAIL_FROM)return {configured:false,sent:0};
 await prepare();
 const jobs=await database().prepare(`SELECT id,payload,created_at FROM business_mail_jobs WHERE status='pending' AND lease_until < ? ${responseId?'AND response_id=?':''} ORDER BY created_at LIMIT 10`).bind(Date.now(),...(responseId?[responseId]:[])).all<{id:string;payload:string;created_at:number}>();
 let sent=0;
 for(const job of jobs.results){
  // Provider deduplication lasts 24 hours. Hold ambiguous old jobs for review.
  if(Date.now()-job.created_at>23*60*60*1000){await database().prepare("UPDATE business_mail_jobs SET status='review',last_error='Review before retry after 23 hours' WHERE id=? AND status='pending'").bind(job.id).run();continue;}
  const claim=await database().prepare("UPDATE business_mail_jobs SET lease_until=? WHERE id=? AND status='pending' AND lease_until<?").bind(Date.now()+60000,job.id,Date.now()).run();
  if(!claim.meta.changes)continue;
  try{
   const m=JSON.parse(job.payload);
   const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${cfg.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`business-survey/${job.id}`},body:JSON.stringify({from:cfg.MAIL_FROM,to:[m.to],reply_to:cfg.ADMIN_EMAIL||'chiekouetsuka@outlook.jp',subject:m.subject,text:m.text}),signal:AbortSignal.timeout(10000)});
   if(!result.ok)throw new Error(`Email provider HTTP ${result.status}`);
   const data=await result.json() as {id?:string};if(!data.id)throw new Error('Missing email receipt');
   await database().prepare("UPDATE business_mail_jobs SET status='sent',provider_id=?,last_error=NULL,lease_until=0 WHERE id=?").bind(data.id,job.id).run();sent++;
  }catch(e){await database().prepare('UPDATE business_mail_jobs SET last_error=?,lease_until=? WHERE id=?').bind(e instanceof Error?e.message:'Delivery failed',Date.now()+60000,job.id).run();}
 }
 return {configured:true,sent};
}
