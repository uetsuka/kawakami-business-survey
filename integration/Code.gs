const TARGET_SPREADSHEET = '1cefLWDCCha8r3bOM9a0md-pMNnSPQevjaPilA26IVGs';
const TARGET_TABS = {consumer:'消費者アンケート回答',business:'法人アンケート回答',enquiry:'問い合わせ'};
const DEFAULT_ADMIN = 'chiekouetsuka@outlook.jp';

function doGet() { return json_({service:'Kawakami response receiver',version:1}); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 60000) return json_({saved:false,error:'Invalid request'});
    const p = JSON.parse(raw);
    const configured = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
    if (!configured || !same_(String(p.token || ''), configured)) return json_({saved:false,error:'Not authorized'});
    if (!TARGET_TABS[p.kind] || !/^[0-9a-f-]{36}$/i.test(p.id) || !Number.isSafeInteger(p.version) || p.version < 1 || !p.cells || typeof p.cells !== 'object' || Array.isArray(p.cells)) return json_({saved:false,error:'Invalid record'});
    lock.waitLock(20000);
    const ss = SpreadsheetApp.openById(TARGET_SPREADSHEET);
    const sheet = ss.getSheetByName(TARGET_TABS[p.kind]);
    if (!sheet) throw new Error('Target tab missing');
    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const idColumn = headers.indexOf(p.kind === 'enquiry' ? '受付ID' : '回答ID');
    const versionColumn = headers.indexOf('同期バージョン');
    const noticeColumn = headers.indexOf('管理者通知');
    const syncColumn = headers.indexOf('シート同期日時（UTC）');
    if (idColumn < 0 || versionColumn < 0 || noticeColumn < 0 || syncColumn < 0) throw new Error('Required columns missing');
    if (Object.keys(p.cells).some(k=>headers.indexOf(k)<0)) throw new Error('Unexpected field');
    const last = sheet.getLastRow();
    const hit = last > 1 ? sheet.getRange(2,idColumn+1,last-1,1).createTextFinder(p.id).matchEntireCell(true).findNext() : null;
    const rowNumber = hit ? hit.getRow() : Math.max(last+1,2);
    if (rowNumber > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(),100);
    const previous = hit ? sheet.getRange(rowNumber,1,1,headers.length).getValues()[0] : headers.map(()=> '');
    const oldVersion = Number(previous[versionColumn] || 0);
    if (oldVersion > p.version) return json_({saved:true,id:p.id,stale:true,notified:previous[noticeColumn]==='送信済み'});
    const row = previous.slice();
    if (oldVersion < p.version || !hit) {
      headers.forEach((header,i)=>{if(Object.prototype.hasOwnProperty.call(p.cells,header)) row[i] = safe_(p.cells[header]);});
      row[idColumn] = p.id;
      row[versionColumn] = p.version;
      row[syncColumn] = new Date().toISOString();
    }
    const submitted = p.kind !== 'consumer' || p.cells['回答状態'] === 'submitted';
    if (submitted && !row[noticeColumn]) row[noticeColumn] = '送信待ち';
    sheet.getRange(rowNumber,1,1,headers.length).setValues([row]);
    SpreadsheetApp.flush();
    if (submitted && row[noticeColumn] !== '送信済み') {
      try {
        const admin = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || DEFAULT_ADMIN;
        const test = p.cells['テスト回答'] === true || p.cells['テスト回答'] === 'TRUE';
        const subject = (test?'[TEST] ':'')+'川上食品｜'+TARGET_TABS[p.kind]+'を受け付けました';
        const body = headers.map((h,i)=>h+': '+String(row[i] || '')).join('\n')+'\n\n確認先:\n'+ss.getUrl();
        MailApp.sendEmail({to:admin,subject:subject,body:body});
        sheet.getRange(rowNumber,noticeColumn+1).setValue('送信済み');
        row[noticeColumn]='送信済み';
      } catch (mailError) {
        sheet.getRange(rowNumber,noticeColumn+1).setValue('送信待ち');
        console.error('Admin notification pending');
      }
    }
    return json_({saved:true,id:p.id,row:rowNumber,notified:!submitted || row[noticeColumn]==='送信済み'});
  } catch (error) {
    console.error('Receiver failed: '+error.message);
    return json_({saved:false,error:'Please retry later'});
  } finally { if(lock.hasLock()) lock.releaseLock(); }
}

function same_(a,b) { let n=a.length^b.length;for(let i=0;i<b.length;i++)n|=(a.charCodeAt(i)||0)^b.charCodeAt(i);return n===0; }
function safe_(value) { if(typeof value==='boolean'||typeof value==='number')return value;const s=String(value==null?'':value).slice(0,10000);return /^[=+\-@]/.test(s)?"'"+s:s; }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
