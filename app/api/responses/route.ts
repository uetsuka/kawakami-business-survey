import {syncBusiness} from '@/lib/sheet-delivery';
import {database} from '@/lib/storage';
import {questions,validAnswer} from '@/lib/questions';
import {enqueueMail,deliverMail} from '@/lib/mail-delivery';
import type {SurveyRecord} from '@/lib/survey-mail';
const pagesOrigin='https://uetsuka.github.io';
function allowedOrigin(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin||origin===pagesOrigin;}
function corsHeaders(request:Request):Record<string,string>{return request.headers.get('origin')===pagesOrigin?{'Access-Control-Allow-Origin':pagesOrigin,'Vary':'Origin'}:{};}
export function OPTIONS(request:Request){if(!allowedOrigin(request))return new Response(null,{status:403});return new Response(null,{status:204,headers:{...corsHeaders(request),'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});}
export async function POST(request:Request){const response=await saveResponse(request);for(const [key,value] of Object.entries(corsHeaders(request)))response.headers.set(key,value);return response;}
async function saveResponse(request:Request){
if(!allowedOrigin(request))return Response.json({error:'Not allowed'},{status:403});
if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'JSON required'},{status:415});
try{const body=await request.text();if(body.length>16000)return Response.json({error:'Too large'},{status:413});const p=JSON.parse(body);
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)||!p.answers||questions.some(q=>!validAnswer(q,p.answers[q.id]))||p.consent!==true||p.website)return Response.json({error:'Invalid response'},{status:400});
for(const [key,max] of [['notes',2000],['company',150],['name',100],['email',254]] as const){if(typeof p[key]!=='string'||p[key].length>max)return Response.json({error:'Invalid details'},{status:400});}
const followup=!p.answers.followup.includes('No follow-up needed');if(followup&&(!p.company.trim()||!p.name.trim()||!/^\S+@\S+\.\S+$/.test(p.email)))return Response.json({error:'Contact details required'},{status:400});
const clean=Object.fromEntries(questions.map(q=>[q.id,p.answers[q.id]]));await database().prepare(`INSERT INTO business_responses (id,created_at,answers,notes,company,name,email,consent,test,status,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'submitted',?) ON CONFLICT(id) DO UPDATE SET answers=excluded.answers,notes=excluded.notes,company=excluded.company,name=excluded.name,email=excluded.email,consent=excluded.consent,status='submitted',updated_at=excluded.updated_at WHERE business_responses.status='in_progress'`).bind(p.id,Date.now(),JSON.stringify(clean),p.notes,followup?p.company.trim():'',followup?p.name.trim():'',followup?p.email.trim():'',1,p.test===true?1:0,Date.now()).run();
// Read the original stored record, never a duplicate request's new recipient.
try{const record=await database().prepare('SELECT id,created_at,answers,notes,company,name,email FROM business_responses WHERE id=?').bind(p.id).first<SurveyRecord>();if(record){await enqueueMail(record);await deliverMail(record.id);}}catch{console.error('Business email queued delivery failed');}
try{await syncBusiness(p.id);}catch{console.error('Business sheet sync pending');}
return Response.json({saved:true,id:p.id},{status:201});
}catch(error){console.error('Business response save failed',error instanceof Error?error.message:'Unknown error');return Response.json({error:'Save unavailable'},{status:503});}}
