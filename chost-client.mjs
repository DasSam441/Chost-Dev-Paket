/* C-Host v2 browser client. No operator certificate or backend private key here.
 * Web Crypto: P-256 ECDH, RFC 7518 Concat KDF, RFC 7516 dir/A256GCM JWE.
 */
const utf8=new TextEncoder(),text=new TextDecoder('utf-8',{fatal:true});
const issuer='https://silentserver.eu/chost';
const keyUrl=issuer+'/api/v1/operators/key';
export function base64url(bytes){let raw='';for(const b of new Uint8Array(bytes))raw+=String.fromCharCode(b);return btoa(raw).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export function unbase64url(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]*$/.test(value)||value.length%4===1)throw Error('Ungültige Basis64url-Daten.');const raw=atob(value.replaceAll('-','+').replaceAll('_','/'));const out=Uint8Array.from(raw,c=>c.charCodeAt(0));if(base64url(out)!==value)throw Error('Nichtkanonische Basis64url-Daten.');return out;}
const hash=async value=>base64url(await crypto.subtle.digest('SHA-256',typeof value==='string'?utf8.encode(value):value));
function jwk(value){if(!value||Object.keys(value).sort().join(',')!=='crv,kty,x,y'||value.kty!=='EC'||value.crv!=='P-256'||unbase64url(value.x).length!==32||unbase64url(value.y).length!==32)throw Error('Ungültiger öffentlicher Schlüssel.');return {kty:'EC',crv:'P-256',x:value.x,y:value.y};}
const thumbprint=value=>hash(JSON.stringify({crv:'P-256',kty:'EC',x:value.x,y:value.y}));
function counter(value){if(typeof value!=='string'||!/^(0|[1-9][0-9]*)$/.test(value))throw Error('Ungültiger Zähler.');const n=BigInt(value);if(n>0xffffffffffffffffn)throw Error('Zähler erschöpft.');return n;}
async function verifyJws(compact,key,expectedType,kid){
 if(typeof compact!=='string'||compact.length>8192)throw Error('Ungültige Signaturdaten.');const parts=compact.split('.');if(parts.length!==3)throw Error('Ungültiges Signaturformat.');
 const header=JSON.parse(text.decode(unbase64url(parts[0]))),payload=JSON.parse(text.decode(unbase64url(parts[1])));
 if(header.alg!=='ES256'||header.typ!==expectedType||Object.keys(header).length!==3||(kid!==undefined&&header.kid!==kid))throw Error('Unzulässiger Signaturkopf.');
 const publicKey=jwk(key??header.jwk);const imported=await crypto.subtle.importKey('jwk',publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},imported,unbase64url(parts[2]),utf8.encode(parts[0]+'.'+parts[1])))throw Error('Signaturprüfung fehlgeschlagen.');
 return {header,payload,key:publicKey};
}
const hexId=value=>typeof value==='string'&&/^[0-9a-f]{32}$/.test(value);
const isFinalResult=record=>record?.type==='session'&&record.state==='finished';
const hasFields=(object,fields)=>object&&Object.keys(object).length===fields.length&&fields.every(field=>Object.hasOwn(object,field));

export async function verifyResult(record,deviceKey,{deviceId,bootId}={}){
 if(!isFinalResult(record)||!hexId(record.sessionId)||!hexId(record.id)||
    !Array.isArray(record.results)||record.results.length>16)throw Error('Ungültiges Abschlussergebnis.');
 if(counter(record.sequence)===0n)throw Error('Ungültige Ergebnisversion.');
 counter(record.clockMs);
 const key=jwk(deviceKey);
 const {payload}=await verifyJws(record.resultProof,key,'chost-result+jws',await thumbprint(key));
 if(!hasFields(payload,['version','deviceId','bootId','sessionId','id','sequence','clockMs','sha256'])||
    payload.version!==1||!hexId(payload.deviceId)||!hexId(payload.bootId)||
    (deviceId!==undefined&&payload.deviceId!==deviceId)||(bootId!==undefined&&payload.bootId!==bootId)||
    ['sessionId','id','sequence','clockMs'].some(field=>payload[field]!==record[field]))
  throw Error('Signatur gehört zu einem anderen Ergebnis.');
 const rows=record.results.map(row=>{
  if(!hasFields(row,['driver','position','laps','totalMs','bestMs','penaltyMs']))throw Error('Ungültige Ergebniszeile.');
  const driver=row.driver;
  if(!hasFields(driver,['id','name','mac','vehicleName','connected'])||
     !hexId(driver.id)||typeof driver.name!=='string'||typeof driver.vehicleName!=='string'||
     typeof driver.mac!=='string'||!/^[0-9A-F]{12}$/.test(driver.mac)||typeof driver.connected!=='boolean'||
     ![row.position,row.laps,row.totalMs,row.penaltyMs].every(Number.isSafeInteger)||
     !(row.bestMs===null||Number.isSafeInteger(row.bestMs)))throw Error('Ungültige Ergebniszeile.');
  return [[driver.id,driver.name,driver.mac,driver.vehicleName,driver.connected],
   row.position,row.laps,row.totalMs,row.bestMs,row.penaltyMs];
 });
 if(await hash(JSON.stringify(rows))!==payload.sha256)throw Error('Ergebnis-Prüfsumme stimmt nicht.');
 return payload;
}
function u32(value){const out=new Uint8Array(4);new DataView(out.buffer).setUint32(0,value,false);return out;}
function join(...parts){const out=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
function sized(value){const bytes=utf8.encode(value);return join(u32(bytes.length),bytes);}
export async function deriveKeys(privateKey,publicKey,nonce,deviceId,bootId,grant){
 const imported=await crypto.subtle.importKey('jwk',jwk(publicKey),{name:'ECDH',namedCurve:'P-256'},false,[]);
 const z=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:imported},privateKey,256));
 const partyV=deviceId+':'+bootId+':'+await hash(grant);const result={};
 for(const direction of ['request','response']){
  const bytes=await crypto.subtle.digest('SHA-256',join(u32(1),z,sized('A256GCM'),sized('chost-timing-v2:'+direction+':'+nonce),sized(partyV),u32(256)));
  result[direction]=await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,[direction==='request'?'encrypt':'decrypt']);
 }
 z.fill(0);return result;
}
function ivFor(sequence){const iv=new Uint8Array(12);new DataView(iv.buffer).setBigUint64(4,sequence,false);return iv;}
export async function encrypt(key,kid,sequence,plain,direction='request'){
 const header=base64url(utf8.encode(JSON.stringify({alg:'dir',enc:'A256GCM',kid,chost_seq:String(sequence),chost_direction:direction})));
 const iv=ivFor(sequence);const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:utf8.encode(header),tagLength:128},key,utf8.encode(JSON.stringify(plain))));
 return header+'..'+base64url(iv)+'.'+base64url(encrypted.subarray(0,-16))+'.'+base64url(encrypted.subarray(-16));
}
export async function decrypt(key,kid,sequence,compact,direction='response'){
 const p=compact.split('.');if(p.length!==5||p[1]!=='')throw Error('Ungültige verschlüsselte Antwort.');const h=JSON.parse(text.decode(unbase64url(p[0])));
 if(Object.keys(h).length!==5||h.alg!=='dir'||h.enc!=='A256GCM'||h.kid!==kid||h.chost_direction!==direction||counter(h.chost_seq)!==sequence||base64url(ivFor(sequence))!==p[2])throw Error('Antwort gehört nicht zu dieser Anfrage.');
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64url(p[2]),additionalData:utf8.encode(p[0]),tagLength:128},key,join(unbase64url(p[3]),unbase64url(p[4])));
 return JSON.parse(text.decode(plain));
}
export class ChostError extends Error{constructor(reply){super(reply.message??reply.error??'Anfrage fehlgeschlagen.');Object.assign(this,reply);}}
class StreamInterrupted extends Error {}
class ConsumerError extends Error {}
const resumeReasons=new Set(['live_cursor_expired','cursor_expired','recovery_unavailable','boot_changed']);
const timelineOperations=new Set(['snapshot','subscribe','history','recover']);

function pause(ms,signal){
 if(signal?.aborted)return Promise.resolve();
 return new Promise(resolve=>{
  const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',done);resolve();};
  const timer=setTimeout(done,ms);
  signal?.addEventListener('abort',done,{once:true});
 });
}

async function deliver(handler,value){
 try{await handler(value);}catch(cause){throw new ConsumerError('Zeitnahme konnte Daten nicht übernehmen.',{cause});}
}

export class ChostClient {
 constructor({host,issueGrant,approveDevice,deviceKeyId,password,origin,clientId,generation,storage,fetch:fetcher=globalThis.fetch,issuerKey}){
  const address=new URL(host.includes('://')?host:'http://'+host);if(!['http:','https:'].includes(address.protocol)||address.username||address.password||address.search||address.hash||!['','/'].includes(address.pathname))throw Error('Ungültige Hostadresse.');
  this.base=address.origin+'/timing/v2/';this.issueGrant=issueGrant;this.approveDevice=approveDevice;this.expectedDevice=deviceKeyId;this.password=password;this.origin=origin??globalThis.location?.origin;this.fetch=fetcher;this.issuerKey=issuerKey;
  if(!this.origin?.startsWith('https://'))throw Error('Die Zeitnahme muss über eine sichere Webseite laufen.');
  try{this.storage=storage??globalThis.sessionStorage;}catch{this.storage=null;}
  this.storageKey='chost-v2:'+address.origin;let saved;try{saved=JSON.parse(this.storage?.getItem(this.storageKey)??'null');}catch{}
  this.clientId=clientId??saved?.clientId??crypto.randomUUID().replaceAll('-','');this.generation=String(generation??saved?.generation??0);this.expectedDevice??=saved?.deviceKeyId;
  if(!/^[0-9a-f]{32}$/.test(this.clientId))throw Error('Ungültige Browserkennung.');counter(this.generation);
  this.sequence=0n;this.pending=null;this.tail=Promise.resolve();
 }
 async raw(path,body,contentType='application/json'){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await this.fetch(this.base+path,{method:body===undefined?'GET':'POST',body,headers:body===undefined?{}:{'Content-Type':contentType},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal,targetAddressSpace:'local'});
   const value=await response.text();if(value.length>70000)throw Error('Antwort zu groß.');
   if(!response.ok){let error;try{error=JSON.parse(value);}catch{error={error:'http_error',status:response.status};}throw new ChostError({...error,status:response.status});}return value;
  }finally{clearTimeout(timer);}
 }
 async connect({permissions=['timing.read'],sessionSeconds=3600,actor}={}){
  if(typeof this.issueGrant!=='function')throw Error('Das Betreiberbackend ist nicht angebunden.');
  this.generation=String(counter(this.generation)+1n);
  this.info=JSON.parse(await this.raw('info'));
  const controlAvailable=permissions.includes('race.control')&&(this.info.roomControlAvailable||this.info.operatingModeControlAvailable);
  if(!this.info.available&&!controlAvailable)throw new ChostError({error:this.info.error??'host_unavailable'});
  const wire=JSON.parse(await this.raw('challenge'));const signed=await verifyJws(wire.challenge,undefined,'chost-challenge+jwt');const challenge=signed.payload;
  if(challenge.version!==2||await thumbprint(signed.key)!==challenge.deviceKeyId)throw Error('Ungültige Geräteidentität.');
  if(this.expectedDevice&&this.expectedDevice!==challenge.deviceKeyId)throw Error('Der Geräteschlüssel hat sich geändert. Bitte den ESP32 prüfen.');
  if(!this.expectedDevice){if(typeof this.approveDevice!=='function'||!await this.approveDevice({name:challenge.name,deviceId:challenge.deviceId,deviceKeyId:challenge.deviceKeyId}))throw Error('Gerät noch nicht bestätigt.');this.expectedDevice=challenge.deviceKeyId;}
  try{this.storage?.setItem(this.storageKey,JSON.stringify({clientId:this.clientId,generation:this.generation,deviceKeyId:this.expectedDevice}));}catch{}
  const ephemeral=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);const exported=await crypto.subtle.exportKey('jwk',ephemeral.publicKey);const browserKey=jwk({kty:exported.kty,crv:exported.crv,x:exported.x,y:exported.y});
  const issued=await this.issueGrant({schema:1,challenge:wire.challenge,browserKey,origin:this.origin,permissions,sessionSeconds,actor});
  const root=this.issuerKey??await (await this.fetch(keyUrl,{credentials:'omit',cache:'no-store',redirect:'error'})).json();
  if(root.schema!==1||root.issuer!==issuer)throw Error('Ungültiger Freigabedienst.');
  const verified=await verifyJws(issued.grant,root.jwk,'chost-grant+jwt',root.kid),grant=verified.payload;
  if(grant.iss!==issuer||grant.aud!=='chost-timing-v2'||grant.deviceId!==challenge.deviceId||grant.deviceKeyId!==challenge.deviceKeyId||grant.bootId!==challenge.bootId||grant.nonce!==challenge.nonce||grant.origin!==this.origin||grant.challengeHash!==await hash(wire.challenge)||JSON.stringify(jwk(grant.browserKey))!==JSON.stringify(browserKey)||!/^[0-9a-f]{32}$/.test(grant.jti))throw Error('Freigabe gehört nicht zu dieser Verbindung.');
  const utc=Math.floor(Date.now()/1000);if(!Number.isSafeInteger(grant.iat)||!Number.isSafeInteger(grant.exp)||grant.exp<=grant.iat||grant.exp-grant.iat>60||grant.iat>utc+30||grant.exp<utc-30)throw Error('Freigabe abgelaufen.');
  if(!Array.isArray(grant.permissions)||!grant.permissions.includes('timing.read')||grant.permissions.some(p=>!['timing.read','race.control'].includes(p)))throw Error('Ungültige Berechtigungen.');
  this.keys=await deriveKeys(ephemeral.privateKey,challenge.ephemeralKey,challenge.nonce,challenge.deviceId,challenge.bootId,issued.grant);this.id=grant.jti;this.permissions=grant.permissions;
  const plain={clientId:this.clientId,connectionGeneration:this.generation};if(this.info.authentication==='password'){if(typeof this.password!=='function')throw Error('Hostkennwort erforderlich.');plain.password=await this.password();}
  const proof=await encrypt(this.keys.request,this.id,0n,plain);delete plain.password;
  const reply=await decrypt(this.keys.response,this.id,0n,await this.raw('connect',JSON.stringify({grant:issued.grant,proof})));
  if(reply.status!==200)throw new ChostError(reply);this.sequence=0n;this.pending=null;this.bootId=challenge.bootId;
  this.deviceIdentity={deviceId:challenge.deviceId,publicKey:signed.key};
  this.reconnectOptions={permissions:[...permissions],sessionSeconds,actor};
  return {...reply,deviceKeyId:this.expectedDevice};
 }
 request(operation,argumentsValue={}){
  const work=async()=>{
   if(!this.keys)throw Error('Noch nicht verbunden.');
   if(this.pending)throw Error('Die letzte Anfrage hat noch keine bestätigte Antwort. retryPending() verwenden.');
   const sequence=this.sequence+1n;if(sequence>0xffffffffffffffffn)throw Error('Neue Sitzung erforderlich.');
    this.pending={sequence,operation,frame:await encrypt(this.keys.request,this.id,sequence,{operation,arguments:argumentsValue})};return this.retryPending();
  };
  const promise=this.tail.then(work);this.tail=promise.catch(()=>{});return promise;
 }
 retryPending(){
  if(this.retrying)return this.retrying;
  this.retrying=this.retryPendingOnce().finally(()=>{this.retrying=null;});return this.retrying;
 }
 async retryPendingOnce(){
  const pending=this.pending;if(!pending)throw Error('Keine wartende Anfrage.');
  let last;for(let attempt=0;attempt<4;++attempt){
   try{
    const reply=await decrypt(this.keys.response,this.id,pending.sequence,await this.raw('rpc',pending.frame,'application/jose'));
    this.sequence=pending.sequence;this.pending=null;if(reply.status!==200)throw new ChostError(reply);return reply;
   }catch(error){if(!this.pending)throw error;last=error;if(error instanceof ChostError&&error.status!==503)break;await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));}
  }throw last;
 }
 operatingMode(){return this.request('operating-mode',{action:'status'});}
 setOperatingMode(mode){return this.request('operating-mode',{action:'set',mode});}
 roomStatus(){return this.request('room',{action:'status'});}
 createRoom(){return this.request('room',{action:'create'});}
 joinRoom(invitation){return this.request('room',{action:'join',invitation});}
 leaveRoom(){return this.request('room',{action:'leave'});}
 state(){return this.request('director');}
 snapshot(){return this.request('snapshot');}
 events(cursor,limit=16,positionRevision){
  const args={bootId:this.bootId,cursor,limit};
  if(positionRevision!==undefined)args.positionRevision=positionRevision;
  return this.request('events',args);
 }
 verifyResult(record,{bootId}={}){
  if(!this.deviceIdentity)throw Error('Zuerst den Geräteschlüssel bestätigen.');
  return verifyResult(record,this.deviceIdentity.publicKey,{deviceId:this.deviceIdentity.deviceId,bootId});
 }
 async verifyLiveResults(records,bootId){
  const proofRequired=this.info?.features?.includes('signed-results-v1');
  for(const record of records){
   if(isFinalResult(record)&&(proofRequired||Object.hasOwn(record,'resultProof')))await this.verifyResult(record,{bootId});
  }
 }
 async *subscribe(cursor,{positionRevision,signal}={}){
  if(signal?.aborted)return;
  if(!this.info?.features?.includes('event-stream-v1'))throw new ChostError({error:'stream_not_supported'});
  const bootId=this.bootId;
  const args={bootId,cursor};
  if(positionRevision!==undefined)args.positionRevision=positionRevision;
  const registration=await this.request('subscribe',args);
  const {subscription,streamKey}=registration;
  const bytes=unbase64url(streamKey);
  if(unbase64url(subscription).length!==16||bytes.length!==32)throw Error('Ungültiger Ereigniskanal.');
  const key=await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
  bytes.fill(0);
  const proof=await encrypt(key,subscription,0n,{action:'open'},'stream-open');
  const controller=new AbortController(),abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  let reader;
  const timed=async action=>{
   const timer=setTimeout(abort,25000);
   try{return await action();}finally{clearTimeout(timer);}
  };
  try{
   const response=await timed(()=>this.fetch(this.base+'stream',{
    method:'POST',body:JSON.stringify({subscription,proof}),
    headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',
    redirect:'error',signal:controller.signal,targetAddressSpace:'local'
   }));
   if(!response.ok){
    let error;
    try{error=(await timed(()=>response.json())).error;}catch{}
    throw new ChostError({error:error??'http_error',status:response.status});
   }
   if(response.headers.get('Content-Type')!=='application/x-chost-stream'||!response.body)throw Error('Ungültige Antwort für den Ereigniskanal.');
   reader=response.body.getReader();
   const decoder=new TextDecoder('utf-8',{fatal:true});
   let buffer='',sequence=0n;
   while(!signal?.aborted){
    const {done,value}=await timed(()=>reader.read());
    if(done)throw new StreamInterrupted('Ereigniskanal geschlossen.');
    buffer+=decoder.decode(value,{stream:true});
    let end;
    while(!signal?.aborted&&(end=buffer.indexOf('\n'))>=0){
     if(end>70000)throw Error('Ereignisrahmen zu groß.');
     const frame=buffer.slice(0,end);
     buffer=buffer.slice(end+1);
     const batch=await decrypt(key,subscription,++sequence,frame,'stream');
     if(batch.protocol!=='chost-timing'||batch.version!==2||batch.bootId!==bootId)throw Error('Ereignis gehört zu einer anderen Sitzung.');
     if(batch.kind==='end')throw new ChostError(batch);
     if(batch.status!==200)throw Error('Ungültiger Ereignisstatus.');
     if(batch.kind==='heartbeat')continue;
     if(batch.kind!=='events'||!Array.isArray(batch.events)||!/^\d+:\d+$/.test(batch.cursor))throw Error('Ungültige Ereignisdaten.');
     await this.verifyLiveResults(batch.events.map(event=>event.record),bootId);
     yield batch;
    }
    if(buffer.length>70000)throw Error('Ereignisrahmen zu groß.');
   }
  }catch(error){
   if(signal?.aborted)return;
   if(controller.signal.aborted)throw new StreamInterrupted('Ereigniskanal antwortet nicht.');
   throw error;
  }finally{
   abort();
   if(reader)await reader.cancel().catch(()=>{});
   signal?.removeEventListener('abort',abort);
  }
 }
 async recoverStreamRecords(previous,snapshot,onBatch,signal){
  let after=counter(previous.cursor.split(':')[0]);
  const target=counter(snapshot.cursor.split(':')[0]);
  let sessionId;
  while(after<target&&!signal?.aborted){
   let page;
   const args={after:String(after),limit:'8'};
   try{
    page=sessionId
     ?await this.request('recover',{...args,sessionId})
     :await this.request('history',{...args,bootId:snapshot.bootId});
   }catch(error){
    if(!sessionId&&error.error==='cursor_expired'&&error.sessionId){sessionId=error.sessionId;continue;}
    if(error.error==='recovery_unavailable'||error.error==='client_upgrade_required')return false;
    throw error;
   }
   if(page.bootId!==snapshot.bootId)return false;
   const records=page.events.filter(record=>counter(record.sequence)<=target);
   let latest=after;
   for(const record of records)if(counter(record.sequence)!==++latest)return false;
   if(latest===after)return false;
   await this.verifyLiveResults(records,page.bootId);
   await deliver(onBatch,{bootId:page.bootId,recovered:true,events:records.map(record=>({source:'durable',record}))});
   after=latest;
   if(sessionId&&!page.more)sessionId=undefined;
  }
  return after===target;
 }
 async followEvents({onSnapshot,onBatch,onGap,signal,resume}={}){
  if(!this.reconnectOptions)throw Error('Zuerst mit dem C-Host verbinden.');
  if([onSnapshot,onBatch,onGap].some(handler=>typeof handler!=='function'))throw TypeError('onSnapshot, onBatch und onGap sind erforderlich.');
  let state=resume,gap,reconnect=false,delay=250;
  while(!signal?.aborted){
   try{
    if(reconnect){
     const opened=this.tail.then(()=>this.connect(this.reconnectOptions));
     this.tail=opened.catch(()=>{});
     await opened;
     reconnect=false;
    }
    if(!state||gap||state.bootId!==this.bootId){
     const snapshot=await this.snapshot();
     if(state){
      const sameBoot=state.bootId===snapshot.bootId;
      const recovered=sameBoot&&await this.recoverStreamRecords(state,snapshot,onBatch,signal);
      if(signal?.aborted)return;
      await deliver(onGap,{reason:sameBoot?gap:'boot_changed',from:state,snapshot,durableRecovered:recovered});
     }
     if(signal?.aborted)return;
     await deliver(onSnapshot,snapshot);
     state={bootId:snapshot.bootId,cursor:snapshot.cursor,positionRevision:snapshot.positionRevision};
     gap=undefined;
    }
    for await(const batch of this.subscribe(state.cursor,{positionRevision:state.positionRevision,signal})){
     await deliver(onBatch,batch);
     state={bootId:batch.bootId,cursor:batch.cursor,positionRevision:batch.positionRevision};
     delay=250;
    }
   }catch(error){
    if(signal?.aborted)return;
    if(error instanceof ConsumerError)throw error.cause;
    if(resumeReasons.has(error.error)){gap=error.error;if(gap==='boot_changed')reconnect=true;continue;}
    const interrupted=error instanceof StreamInterrupted||error instanceof TypeError||error.name==='AbortError';
    const expired=error.error==='authentication_required'||error.error==='token_expired'||error.error==='sequence_conflict';
    if(!interrupted&&!expired&&!['stream_unavailable','busy','rate_limited','issuer_unavailable'].includes(error.error)&&
     ![429,502,503,504].includes(error.status))throw error;
    if(expired||timelineOperations.has(this.pending?.operation))reconnect=true;
    await pause(delay,signal);
    delay=Math.min(delay*2,4000);
   }
  }
 }
 acquire(){return this.request('control',{action:'acquire'});}
 release(){return this.request('control',{action:'release'});}
 configure(configuration,revision,{defer=false}={}){return this.request('control',{action:'configure',configuration,expectedRevision:revision,defer});}
 ready(ready,revision,sessionId){return this.request('control',{action:'ready',ready,expectedRevision:revision,sessionId});}
 finish(revision,sessionId){return this.request('control',{action:'finish',expectedRevision:revision,sessionId});}
}
