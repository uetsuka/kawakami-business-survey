import {database} from '@/lib/storage';
import {syncEnquiry} from '@/lib/sheet-delivery';
const origins=new Set(['https://uetsuka.github.io','https://kawakami-b2b-wf-preview.chiekouetsuka.chatgpt.site']);
const businesses=new Set(['Importer/distributor','Wholesaler','Retailer','Restaurant','Hotel/catering','Other']);
const products=new Set(['Shima Tofu','Yushi Tofu','Atsuage','Silken & Soft Tofu','Jimami Tofu','Aburaage','Dried Okara','Okara Spoon']);
function allowed(r:Request){const o=r.headers.get('origin');return !o||o===new URL(r.url).origin||origins.has(o);}
function cors(r:Request){const o=r.headers.get('origin');return o&&origins.has(o)?{'Access-Control-Allow-Origin':o,'Vary':'Origin'}:{};}
export function OPTIONS(r:Request){return new Response(null,{status:allowed(r)?204:403,headers:{...cors(r),'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});}
export async function POST(r:Request){const response=await save(r);for(const [k,v]of Object.entries(cors(r)))response.headers.set(k,v);return response;}
async function save(r:Request){
 if(!allowed(r))return Response.json({error:'Not allowed'},{status:403});
 if(!r.headers.get('content-type')?.includes('application/json'))return Response.json({error:'JSON required'},{status:415});
 try{
  const raw=await r.text();if(raw.length>12000)return Response.json({error:'Please shorten your message.'},{status:413});const p=JSON.parse(raw);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)||p.consent!==true||p.website||!businesses.has(p.business))return Response.json({error:'Please complete the required fields.'},{status:400});
  for(const [key,max]of [['company',150],['name',100],['email',254],['country',100],['use',300],['volume',200],['timeline',200],['details',3000]]as const){if(typeof p[key]!=='string'||p[key].length>max)return Response.json({error:'Please check your details.'},{status:400});}
  if(!p.company.trim()||!p.name.trim()||!p.country.trim()||!/^\S+@\S+\.\S+$/.test(p.email)||!Array.isArray(p.products)||p.products.length>8||new Set(p.products).size!==p.products.length||p.products.some((v:unknown)=>typeof v!=='string'||!products.has(v)))return Response.json({error:'Please check your contact details and product selection.'},{status:400});
  await database().prepare('INSERT INTO enquiries (id,created_at,company,name,email,country,business,products,use,volume,timeline,details,consent,test) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(p.id,Date.now(),p.company.trim(),p.name.trim(),p.email.trim(),p.country.trim(),p.business,JSON.stringify(p.products),p.use,p.volume,p.timeline,p.details,1,p.test===true?1:0).run();
  try{await syncEnquiry(p.id);}catch{console.error('Enquiry sheet sync pending');}
  return Response.json({saved:true,id:p.id},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'We could not save your enquiry. Your details are still on this page; please try again.'},{status:503});}
}
