const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,setDoc}=require('firebase/firestore');
async function seed(){
 const projectId='demo-bloodconnect-zc';
 const response=await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`,{method:'DELETE'});if(!response.ok)throw Error('Local Auth emulator unavailable');
 const users={};
 for(const name of ['staff','requester','donor1','donor2','donor3','outsider']){
   const res=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:name+'@example.test',password:'Defense27!',returnSecureToken:true})});
   const data=await res.json();if(!res.ok)throw Error(JSON.stringify(data));users[name]=data.localId;
 }
 const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8086}});
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();const writes=[];
  for(const [name,uid] of Object.entries(users)) writes.push(setDoc(doc(db,'users',uid),{role:name==='staff'?'staff':'user',email:name+'@example.test',...(name.startsWith('donor')?{donorCode:'000000000'+name.slice(-1)}:{})}));
  for(let n=1;n<=3;n++){
   const code='000000000'+n,uid=users['donor'+n];
   writes.push(setDoc(doc(db,'donors',code),{code,uid,bloodType:'A+',btConfirmed:true,available:true,eligFrom:'2018-01-01',eligUntil:'2066-01-01',hold:false,lastDonation:null,donorType:'first',createdAt:Date.now()}));
   writes.push(setDoc(doc(db,'donorsPrivate',code),{uid,_code:code,name:'Fictitious Donor '+n,phone:'09000000000',email:'donor'+n+'@example.test',birthdate:'2000-01-01',weight:60,barangay:'Fictitious Barangay',consent:true,consentAt:Date.now()}));
  }
  writes.push(setDoc(doc(db,'hospitals','demo'),{name:'Fictitious ZC Demo Facility',kind:'Hospital',address:'Demo only — not a real facility',contact:'Demo only',order:0}));
  for(const [code,bloodType,urgency,offset] of [['1000000001','A+','Critical',0],['1000000002','O-','Urgent',-1000],['1000000003',null,'Scheduled',-2000]]){
   writes.push(setDoc(doc(db,'requests',code),{code,ownerUid:users.requester,bloodType,units:3,urgency,status:bloodType?'open':'typing',notified:code==='1000000001'?['0000000001','0000000002','0000000003']:[],responses:{},donated:[],hospitalId:'demo',hospitalOther:'',createdAt:Date.now()+offset}));
   writes.push(setDoc(doc(db,'requestsPrivate',code),{_code:code,ownerUid:users.requester,patientName:'Fictitious Patient',patientBirthdate:'1990-01-01',contactName:'Fictitious Requester',contactPhone:'09000000000',contactEmail:'requester@example.test',note:'Fictitious defense scenario',consent:true,consentAt:Date.now()}));
  }
  writes.push(setDoc(doc(db,'coordination','1000000002'),{requestCode:'1000000002',facility:'Fictitious ZC Demo Facility',result:'no stock',contactedAt:new Date(),staffUid:users.staff,revision:1}));
  await Promise.all(writes);
 });await env.cleanup();console.log('Seeded fictitious local accounts and three requests. Password: Defense27!');return users;
}
module.exports={seed};if(require.main===module)seed().catch(err=>{console.error(err);process.exitCode=1;});
