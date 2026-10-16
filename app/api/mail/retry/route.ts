import {deliverMail,mailSettings} from '@/lib/mail-delivery';
export async function POST(request:Request){
 const token=mailSettings().MAIL_RETRY_TOKEN;
 if(!token||request.headers.get('Authorization')!==`Bearer ${token}`)return Response.json({error:'Not allowed'},{status:403});
 return Response.json(await deliverMail());
}
