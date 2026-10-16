import {database} from './storage';
import {questions,validAnswer} from './questions';
const businesses=new Set(['Importer/distributor','Wholesaler','Retailer','Restaurant','Hotel/catering','Other']);
const products=new Set(['Shima Tofu','Yushi Tofu','Atsuage','Silken & Soft Tofu','Jimami Tofu','Aburaage','Dried Okara','Okara Spoon']);
export const enquiryOrigins=new Set(['https://uetsuka.github.io','https://kawakami-b2b-wf-preview.chiekouetsuka.chatgpt.site']);
export function draftAllowed(r:Request,kind:'business'|'enquiry'){const o=r.headers.get('origin');return !o||o===new URL(r.url).origin||o==='https://uetsuka.github.io'||kind==='enquiry'&&enquiryOrigins.has(o);}
export function draftCors(r:Request,kind:'business'|'enquiry'):Record<string,string>{const o=r.headers.get('origin');return o&&draftAllowed(r,kind)?{'Access-Control-Allow-Origin':o,'Vary':'Origin'}:{};}
export async function storeDraft(r:Request,kind:'business'|'enquiry'){
 if(!draftAllowed(r,kind))return Response.json({error:'Not allowed'},{status:403});
 if(!r.headers.get('content-type')?.includes('application/json'))return Response.json({error:'JSON required'},{status:415});
 try{
  const raw=await r.text();if(raw.length>16000)return Response.json({error:'Too large'},{status:413});const p=JSON.parse(raw);
  if(typeof p.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)||!Number.isSafeInteger(p.revision)||p.revision<1||p.website||typeof p.consent!=='boolean')return Response.json({error:'Invalid draft'},{status:400});
  const now=Date.now();
  const limits=kind==='business'?{notes:2000,company:150,name:100,email:254}:{company:150,name:100,email:254,country:100,business:100,use:300,volume:200,timeline:200,details:3000};
  for(const [key,max]of Object.entries(limits))if(typeof p[key]!=='string'||p[key].length>max)return Response.json({error:'Invalid details'},{status:400});
  if(kind==='business'){
   if(!p.answers||typeof p.answers!=='object'||Array.isArray(p.answers)||Object.entries(p.answers).some(([key,v])=>{const q=questions.find(q=>q.id===key);return !q||!(Array.isArray(v)&&v.length===0)&&!validAnswer(q,v);}))return Response.json({error:'Invalid answers'},{status:400});
   const clean=Object.fromEntries(questions.filter(q=>validAnswer(q,p.answers[q.id])).map(q=>[q.id,p.answers[q.id]]));
   if(!Object.keys(clean).length&&!p.notes.trim()&&!p.company.trim()&&!p.name.trim()&&!p.email.trim()&&!await database().prepare('SELECT id FROM business_responses WHERE id=?').bind(p.id).first())return Response.json({saved:false,empty:true});
   await database().prepare(`INSERT INTO business_responses (id,created_at,answers,notes,company,name,email,consent,test,status,updated_at,revision) VALUES (?,?,?,?,?,?,?,?,?,'in_progress',?,?) ON CONFLICT(id) DO UPDATE SET answers=excluded.answers,notes=excluded.notes,company=excluded.company,name=excluded.name,email=excluded.email,consent=excluded.consent,updated_at=excluded.updated_at,revision=excluded.revision WHERE business_responses.status='in_progress' AND excluded.revision>business_responses.revision`).bind(p.id,now,JSON.stringify(clean),p.notes,p.company,p.name,p.email,p.consent?1:0,p.test===true?1:0,now,p.revision).run();
  }else{
   if(p.business&&!businesses.has(p.business)||!Array.isArray(p.products)||p.products.length>8||new Set(p.products).size!==p.products.length||p.products.some((v:unknown)=>typeof v!=='string'||!products.has(v)))return Response.json({error:'Invalid selection'},{status:400});
   if(!p.products.length&&!['company','name','email','business','use','volume','timeline','details'].some(k=>p[k].trim())&&!await database().prepare('SELECT id FROM enquiries WHERE id=?').bind(p.id).first())return Response.json({saved:false,empty:true});
   await database().prepare(`INSERT INTO enquiries (id,created_at,company,name,email,country,business,products,use,volume,timeline,details,consent,test,status,updated_at,revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'in_progress',?,?) ON CONFLICT(id) DO UPDATE SET company=excluded.company,name=excluded.name,email=excluded.email,country=excluded.country,business=excluded.business,products=excluded.products,use=excluded.use,volume=excluded.volume,timeline=excluded.timeline,details=excluded.details,consent=excluded.consent,updated_at=excluded.updated_at,revision=excluded.revision WHERE enquiries.status='in_progress' AND excluded.revision>enquiries.revision`).bind(p.id,now,p.company,p.name,p.email,p.country,p.business,JSON.stringify(p.products),p.use,p.volume,p.timeline,p.details,p.consent?1:0,p.test===true?1:0,now,p.revision).run();
  }
  return Response.json({saved:true,id:p.id,revision:p.revision},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not save progress'},{status:503});}
}
