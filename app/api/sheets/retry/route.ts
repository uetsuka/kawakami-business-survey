import {env} from 'cloudflare:workers';
import {database} from '@/lib/storage';
import {deliverSheets,syncBusiness,syncEnquiry} from '@/lib/sheet-delivery';
export async function POST(request:Request){
 const cfg=env as unknown as {SHEETS_SYNC_TOKEN?:string};
 if(!cfg.SHEETS_SYNC_TOKEN||request.headers.get('authorization')!=='Bearer '+cfg.SHEETS_SYNC_TOKEN)return Response.json({error:'Not authorized'},{status:401});
 try{
 const raw=await request.text();if(raw.length>1024)return Response.json({error:'Too large'},{status:413});
 const p=raw?JSON.parse(raw):{};
 if(p.id!==undefined&&!/^[0-9a-f-]{36}$/i.test(p.id))return Response.json({error:'Invalid id'},{status:400});
 if(p.id&&p.kind==='business')await syncBusiness(p.id,false);if(p.id&&p.kind==='enquiry')await syncEnquiry(p.id,false);
 if(p.backfill===true){for(const [table,sync]of [['business_responses',syncBusiness],['enquiries',syncEnquiry]]as const){const records=await database().prepare('SELECT id FROM '+table+' ORDER BY created_at LIMIT 50 OFFSET ?').bind(Math.max(0,Math.min(100000,Number(p.offset)||0))).all<{id:string}>();for(const r of records.results)await sync(r.id,false);}}
 const delivery=p.statusOnly===true?null:await deliverSheets();
 const jobs=await database().prepare('SELECT id,status,version,attempts,last_error,synced_at FROM sheet_jobs '+(p.id?'WHERE id IN (?,?)':'ORDER BY updated_at DESC LIMIT 20')).bind(...(p.id?['business:'+p.id,'enquiry:'+p.id]:[])).all();
 const business=await database().prepare('SELECT count(*) AS total,sum(test=1) AS test FROM business_responses').first();const enquiries=await database().prepare('SELECT count(*) AS total,sum(test=1) AS test FROM enquiries').first();const counts={business,enquiries};
 return Response.json({delivery,counts,jobs:jobs.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Sheet retry failed',e instanceof Error?e.message:'Unknown error');return Response.json({error:'Retry failed'},{status:503});}
}
