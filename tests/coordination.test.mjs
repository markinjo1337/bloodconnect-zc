import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRequest,coordinationQueue,outstanding,validateReceivedTotal,validateFulfillment} from '../coordination.js';
const base={code:'1000000001',status:'open',bloodType:'A+',units:3,urgency:'Urgent',createdAt:1};
test('three acceptances and recorded donations never imply received units',()=>{
  const r=normalizeRequest({...base,responses:{a:'accepted',b:'accepted',c:'accepted'},donated:['a','b','c']});
  assert.equal(r.status,'open');assert.equal(r.verifiedReceivedUnits,0);assert.equal(outstanding(r),3);
  assert.throws(()=>validateFulfillment(r,true),/full requested total/);
});
test('two verified units leave one outstanding; explicit confirmation and known type required',()=>{
  const r=normalizeRequest({...base,verifiedReceivedUnits:2});
  assert.equal(outstanding(r),1);assert.throws(()=>validateFulfillment(r,true));
  r.verifiedReceivedUnits=3;assert.throws(()=>validateFulfillment(r,false),/Explicit/);
  assert.doesNotThrow(()=>validateFulfillment(r,true));
  assert.throws(()=>validateFulfillment({...r,bloodType:null},true),/blood type/);
  assert.throws(()=>validateFulfillment({...r,status:'cancelled'},true),/closed/);
});
test('cumulative totals validate integers and bounds, including corrections',()=>{
  for(const bad of [-1,4,1.5,NaN,Infinity]) assert.throws(()=>validateReceivedTotal(base,bad));
  for(const good of [0,1,2,3]) assert.doesNotThrow(()=>validateReceivedTotal(base,good));
});
test('old missing or null lists are safe and do not create received units',()=>{
  const r=normalizeRequest({...base,notified:null,responses:null,donated:['legacy']});
  assert.deepEqual(r.notified,[]);assert.deepEqual(r.responses,{});assert.equal(r.receiptRevision,0);assert.equal(r.verifiedReceivedUnits,0);
});
test('queue keeps no-stock/no-donor cases and sorts urgency then oldest first',()=>{
  const records=[{...base,code:'late',createdAt:5},{...base,code:'early',createdAt:1},{...base,code:'critical',urgency:'Critical',createdAt:9},{...base,code:'typing',status:'typing',bloodType:null,urgency:'Scheduled'},{...base,code:'closed',status:'fulfilled'}];
  assert.deepEqual(coordinationQueue(records).map(r=>r.code),['critical','early','late','typing']);
});
