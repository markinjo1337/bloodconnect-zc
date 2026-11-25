const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc,getDoc,getDocs,collection,query,where,writeBatch,serverTimestamp}=require('firebase/firestore');
let env;
const code='1000000001',dcode='0000000001';
const request=()=>({code,ownerUid:'requester',bloodType:'A+',units:3,urgency:'Urgent',status:'open',notified:[dcode,'0000000002','0000000003'],responses:{},donated:[],createdAt:1});
const db=(uid)=>env.authenticatedContext(uid).firestore();
const ref=(client,col='requests',id=code)=>doc(client,col,id);
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-bloodconnect-rules',firestore:{host:'127.0.0.1',port:8086,rules:fs.readFileSync('firestore.rules','utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{const f=c.firestore();await Promise.all([
setDoc(doc(f,'users','staff'),{role:'staff'}),setDoc(doc(f,'users','requester'),{role:'user'}),setDoc(doc(f,'users','outsider'),{role:'user'}),
...[1,2,3].flatMap(n=>[setDoc(doc(f,'users','donor'+n),{role:'user',donorCode:'000000000'+n}),setDoc(doc(f,'donors','000000000'+n),{code:'000000000'+n,uid:'donor'+n,bloodType:'A+',btConfirmed:true})]),
setDoc(ref(f),request()),setDoc(ref(f,'requestsPrivate'),{ownerUid:'requester',patientName:'Fictitious Patient'}),setDoc(ref(f,'donorsPrivate',dcode),{uid:'donor1',name:'Fictitious Donor'})]);});});
const receipt=(total,revision=1)=>({verifiedReceivedUnits:total,receiptRevision:revision,receiptVerifiedBy:'staff',receiptVerifiedAt:serverTimestamp()});
const fulfilled=()=>({status:'fulfilled',fulfillmentConfirmed:true,fulfilledBy:'staff',fulfilledAt:serverTimestamp()});
async function donation(client,actor='staff'){const b=writeBatch(client);b.set(ref(client,'donations',code+'_'+dcode),{requestCode:code,donorCode:dcode,ownerUid:'donor1',staffUid:actor,recordedAt:serverTimestamp(),donatedOn:'2026-11-25',facility:'Fictitious Facility'});b.update(ref(client),{donated:[dcode]});return b.commit();}
test('three-unit scenario enforced by real Firestore rules',async()=>{
  const staff=db('staff');
  for(let n=1;n<=3;n++)await assertSucceeds(updateDoc(ref(db('donor'+n)),{['responses.000000000'+n]:'accepted'}));
  assert.equal((await getDoc(ref(staff))).data().status,'open');
  await assertSucceeds(donation(staff));
  let r=(await getDoc(ref(staff))).data();assert.equal(r.status,'open');assert.equal(r.verifiedReceivedUnits,undefined);
  await assertSucceeds(updateDoc(ref(staff),receipt(2)));assert.equal(3-(await getDoc(ref(staff))).data().verifiedReceivedUnits,1);
  await assertFails(updateDoc(ref(staff),fulfilled()));
  await assertSucceeds(updateDoc(ref(staff),receipt(3,2)));
  await assertFails(updateDoc(ref(staff),{status:'fulfilled'}));
  await assertSucceeds(updateDoc(ref(staff),fulfilled()));
  assert.equal((await getDoc(ref(staff))).data().status,'fulfilled');
});
test('nonstaff cannot write received totals, contact reports, donations, screening, or fulfillment',async()=>{
  // Otherwise-valid writes: failure must come from authorization, not malformed data or incomplete units.
  await updateDoc(ref(db('donor1')),{'responses.0000000001':'accepted'});
  await updateDoc(ref(db('staff')),receipt(3));
  for(const uid of ['requester','donor1','outsider']){const c=db(uid);
    await assertFails(updateDoc(ref(c),{...receipt(2,2),receiptVerifiedBy:uid}));
    await assertFails(updateDoc(ref(c),{...fulfilled(),fulfilledBy:uid}));
    await assertFails(setDoc(ref(c,'coordination'),{requestCode:code,facility:'Fictitious',result:'no stock',contactedAt:serverTimestamp(),staffUid:uid,revision:1}));
    await assertFails(donation(c,uid));
    await assertFails(setDoc(ref(c,'screenings','fake'),{ownerUid:'donor1',donorCode:dcode,staffUid:uid}));
    await assertFails(updateDoc(doc(c,'users',uid),{role:'staff'}));
  }
});
test('no stock keeps request open; contact metadata is staff only',async()=>{
  const c=db('staff');await assertSucceeds(setDoc(ref(c,'coordination'),{requestCode:code,facility:'Fictitious',result:'no stock',contactedAt:serverTimestamp(),staffUid:'staff',revision:1}));
  assert.equal((await getDoc(ref(c))).data().status,'open');
  await assertFails(getDoc(ref(db('requester'),'coordination')));
  await assertFails(setDoc(ref(c,'coordination'),{requestCode:code,facility:'Fictitious',result:'live stock',contactedAt:serverTimestamp(),staffUid:'staff',revision:2}));
});
test('legacy donation counts, unknown type, fractional totals, stale revisions, and forged timestamps cannot fulfill',async()=>{
  const c=db('staff');await env.withSecurityRulesDisabled(async x=>updateDoc(ref(x.firestore()),{donated:['a','b','c']}));
  await assertFails(updateDoc(ref(c),fulfilled()));
  await assertFails(updateDoc(ref(c),receipt(2.5)));await assertFails(updateDoc(ref(c),receipt(4)));await assertFails(updateDoc(ref(c),receipt(-1)));
  await assertFails(updateDoc(ref(c),{...receipt(3),receiptVerifiedAt:new Date(1)}));
  await assertSucceeds(updateDoc(ref(c),receipt(3)));await assertFails(updateDoc(ref(c),receipt(2,1)));
  await env.withSecurityRulesDisabled(async x=>updateDoc(ref(x.firestore()),{bloodType:null,status:'typing'}));
  await assertFails(updateDoc(ref(c),fulfilled()));
});
test('donation is immutable and owner history/private records are protected',async()=>{
  const c=db('staff');await updateDoc(ref(db('donor1')),{'responses.0000000001':'accepted'});await donation(c);
  await assertFails(donation(c));
  await assertSucceeds(getDoc(ref(db('donor1'),'donations',code+'_'+dcode)));
  await assertFails(getDoc(ref(db('donor2'),'donations',code+'_'+dcode)));
  await assertSucceeds(getDocs(query(collection(db('donor1'),'donations'),where('ownerUid','==','donor1'))));
  await assertFails(getDocs(collection(db('donor1'),'donations')));
  await assertSucceeds(getDoc(ref(db('requester'),'requestsPrivate')));
  await assertFails(getDoc(ref(db('donor1'),'requestsPrivate')));
  await assertSucceeds(getDoc(ref(db('donor1'),'donorsPrivate',dcode)));
  await assertFails(getDoc(ref(db('outsider'),'donorsPrivate',dcode)));
});
test('cannot impersonate another donor or inject arbitrary response states',async()=>{
  await assertFails(updateDoc(ref(db('donor1')),{'responses.0000000002':'accepted'}));
  await assertFails(updateDoc(ref(db('donor1')),{'responses.0000000001':'donated'}));
  await assertFails(updateDoc(ref(db('outsider')),{responses:{[dcode]:'accepted'}}));
  await assertFails(setDoc(doc(db('attacker'),'users','attacker'),{role:'user',donorCode:dcode}));
});
test('request creation must have consent and no preloaded received units',async()=>{
  const c=db('requester');const r={...request(),code:'1000000099',donated:[],responses:{}};
  const b=writeBatch(c);b.set(ref(c,'requests',r.code),r);b.set(ref(c,'requestsPrivate',r.code),{ownerUid:'requester',consent:true,consentAt:Date.now()});await assertSucceeds(b.commit());
  await assertFails(setDoc(ref(c,'requests','1000000088'),{...r,code:'1000000088',verifiedReceivedUnits:3}));
  await assertFails(setDoc(ref(c,'requests','1000000077'),{...r,code:'1000000077'}));
});
test('staff cannot combine receipt update and fulfillment to bypass separate confirmation',async()=>{
  await assertFails(updateDoc(ref(db('staff')),{...receipt(3),...fulfilled()}));
});
