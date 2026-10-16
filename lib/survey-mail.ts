import {questions} from './questions';

export type SurveyRecord={id:string;created_at:number;answers:string;notes:string;company:string;name:string;email:string};
export function surveyMessages(r:SurveyRecord,admin:string){
 const answers=JSON.parse(r.answers) as Record<string,string[]>;
 const summary=questions.map((q,i)=>`${i+1}. ${q.title}\n${(answers[q.id]||[]).join('; ')}`).join('\n\n');
 const details=`Reference: ${r.id}\nSubmitted: ${new Date(r.created_at).toISOString()}\nCompany: ${r.company||'Not provided'}\nName: ${r.name||'Not provided'}\nEmail: ${r.email||'Not provided'}\n\n${summary}\n\nAdditional requirements:\n${r.notes||'None'}`;
 const followup=!answers.followup?.includes('No follow-up needed');
 const customer=`Dear ${r.name||'Business Partner'},\n\nThank you for taking the time to complete the Kawakami Foods business survey. We appreciate your interest in our Okinawan tofu and your insights into the Singapore market.\n\nYour feedback will help us understand the needs of retailers, restaurants, distributors and corporate buyers.\n\n${followup?'We have recorded your follow-up preferences. Our project team will review your request and contact you using the details you provided.':'Thank you for sharing your perspective. No sales follow-up has been requested.'}\n\nA copy of your responses is included below for your records.\n\n${details}\n\nExplore our products:\nhttps://kawakami-b2b-wf-preview.chiekouetsuka.chatgpt.site/#products\n\nThank you again for your time and consideration.\n\nKind regards,\nKawakami Foods Project Team\n\nThis email confirms your survey submission; it does not confirm an order or quotation.`;
 return [{kind:'admin',to:admin,subject:'Kawakami Foods | New business survey response',text:`A new business survey response has been received.\n\n${details}`},...(r.email?[{kind:'respondent',to:r.email,subject:'Thank you for your feedback | Kawakami Foods Business Survey',text:customer}]:[])];
}
