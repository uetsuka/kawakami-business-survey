const allowed=new Set(["responses","responses/draft"]);
export default async function handler(req,res){
 const url=new URL(req.url,'https://proxy.local');
 const path=url.searchParams.get('route')||url.pathname.replace(/^\/api\//,'');
 url.searchParams.delete('route');
 if(!allowed.has(path)||!["POST"].includes(req.method)){res.status(404).json({error:'Not found'});return;}
 const origin=req.headers.origin;
 const host=req.headers['x-forwarded-host']||req.headers.host;
 if(origin&&new URL(origin).host!==host){res.status(403).json({error:'Request not allowed'});return;}
 const body=['GET','HEAD'].includes(req.method)?undefined:JSON.stringify(req.body);
 if(body&&Buffer.byteLength(body)>65536){res.status(413).json({error:'Request too large'});return;}
 try{
  const upstream=await fetch("https://kawakami-business-survey.chiekouetsuka.chatgpt.site"+'/api/'+path+url.search,{method:req.method,headers:body?{'Content-Type':'application/json'}:{},body,signal:AbortSignal.timeout(25000),redirect:'error'});
  res.statusCode=upstream.status;
  for(const key of ['content-type','content-disposition','cache-control']){const value=upstream.headers.get(key);if(value)res.setHeader(key,value);}
  res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch{res.status(502).json({error:'Please try again.'});}
}
