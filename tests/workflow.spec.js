import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {seed}=require('../scripts/seed-demo.cjs');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,setDoc}=require('firebase/firestore');
async function login(page,name){
 await page.goto('/#account');await page.locator('#authform [name=email]').fill(name+'@example.test');await page.locator('#authform [name=password]').fill('Defense27!');await page.locator('#authform button[type=submit]').click();await expect(page.locator('#acct')).toContainText(name+'@example.test');
}
async function openRequest(page,code='1000000001'){
 await page.locator('#nav [data-tab=requests]').click();await page.locator(`[data-open="${code}"]`).click();
}
async function verifyTotal(page,total){
 const f=page.locator('[data-received]');await f.locator('[name=total]').fill(String(total));await f.locator('[name=verified]').check();await f.getByRole('button',{name:'Save verified total'}).click();await expect(page.locator('.detail-top')).toContainText(`${total} of 3 units verified received`);
}
let seededUsers;
test.beforeEach(async()=>{seededUsers=await seed();});
test('three-unit workflow, history, no-stock follow-up, and rejected unauthorized save',async({browser,page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let n=1;n<=3;n++){
  const context=await browser.newContext();const donor=await context.newPage();await login(donor,'donor'+n);await donor.locator('#nav [data-tab=inbox]').click();await donor.getByRole('button',{name:'Accept',exact:true}).click();await expect(donor.locator('.contact')).toContainText('You accepted');await context.close();
 }
 await login(page,'staff');await openRequest(page);await expect(page.locator('.detail-top')).toContainText('3 donor acceptances');await expect(page.locator('.detail-top')).toContainText('0 of 3 units verified received');
 page.on('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Record donation'}).first().click();await expect(page.locator('.detail-top')).toContainText('1 recorded donations');await expect(page.locator('.detail-top')).toContainText('0 of 3 units verified received');await expect(page.locator('.detail-top .status.fulfilled')).toHaveCount(0);
 await verifyTotal(page,2);await expect(page.locator('.detail-top')).toContainText('1 outstanding');
 await page.locator('[data-fulfill] [name=confirmed]').check();await page.getByRole('button',{name:'Confirm fulfillment'}).click();await expect(page.locator('[data-fulfill] [data-save-error]')).toContainText('full requested total');await expect(page.locator('.status.fulfilled')).toHaveCount(0);
 await verifyTotal(page,3);await expect(page.locator('.detail-top .status.fulfilled')).toHaveCount(0);
 await page.locator('[data-fulfill] [name=confirmed]').check();await page.getByRole('button',{name:'Confirm fulfillment'}).click();await expect(page.locator('.detail-top .status.fulfilled')).toHaveText('Fulfilled');
 await page.getByRole('button',{name:'Coordination',exact:true}).click();await expect(page.locator('[data-open="1000000001"]')).toHaveCount(0);await expect(page.locator('[data-open="1000000002"]')).toBeVisible();await expect(page.locator('main')).toContainText('no stock');
 await page.locator('[data-open="1000000002"]').click();const contact=page.locator('[data-contact]');await contact.locator('[name=result]').selectOption('awaiting reply');await contact.getByRole('button').click();await expect(page.locator('main')).toContainText('Latest contact: awaiting reply');
 // Revoke this account in the emulator while its browser still has stale staff UI.
 const env=await initializeTestEnvironment({projectId:'demo-bloodconnect-zc',firestore:{host:'127.0.0.1',port:8086}});
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'users',seededUsers.staff),{role:'user',email:'staff@example.test'}));
 const f=page.locator('[data-received]');await f.locator('[name=total]').fill('2');await f.locator('[name=verified]').check();await f.getByRole('button').click();await expect(f.locator('[data-save-error]')).toContainText('Not saved');await expect(page.locator('.detail-top')).toContainText('0 of 3 units verified received');
 await env.cleanup();
 const context=await browser.newContext();const donor=await context.newPage();await login(donor,'donor1');await donor.locator('#nav [data-tab=inbox]').click();await expect(donor.locator('main')).toContainText('My donation history');await expect(donor.locator('main')).toContainText('Donation date:');await expect(donor.locator('[data-received]')).toHaveCount(0);await context.close();expect(errors).toEqual([]);
});
test('stale received-total form rejects overwriting another staff save',async({browser,page})=>{
 await login(page,'staff');await openRequest(page);await page.locator('[data-received] [name=total]').fill('1');
 const context=await browser.newContext();const second=await context.newPage();await login(second,'staff');await openRequest(second);await verifyTotal(second,2);
 await page.locator('[data-received] [name=verified]').check();await page.locator('[data-received] button').click();await expect(page.locator('[data-received] [data-save-error]')).toContainText('Another staff member');await expect(second.locator('.detail-top')).toContainText('2 of 3 units verified received');await context.close();
});
test('request consent, unknown blood type, ID lookup, and staff screening remain functional',async({page,browser})=>{
 await login(page,'requester');await page.getByRole('button',{name:'Request blood',exact:true}).first().click();const f=page.locator('#reqform');
 await f.locator('[name=patientName]').fill('Fictitious Form Patient');await f.locator('[name=patientBirthdate]').fill('1990-01-01');await f.locator('[name=bloodType][value=unknown]').check();await f.locator('[name=units]').selectOption('3');await f.locator('[name=hospitalId]').selectOption('demo');await f.locator('[name=contactName]').fill('Fictitious Contact');await f.locator('[name=contactPhone]').fill('09000000000');await f.getByRole('button',{name:'Post request'}).click();await expect(page.locator('#reqerr')).toContainText('Tick all three');
 for(const name of ['agreeTerms','agreePrivacy','agreeWilling'])await f.locator(`[name=${name}]`).check();await f.getByRole('button',{name:'Post request'}).click();await expect(page.locator('.detail-top')).toContainText('Awaiting blood typing');await expect(page.locator('.detail-top')).toContainText('0 of 3');
 await page.getByRole('button',{name:'Home',exact:true}).click();await page.locator('[data-lookup] [name=code]').fill('1000000001');await page.locator('[data-lookup] button').click();await expect(page.locator('.detail-top')).toContainText('1000000001');
 const context=await browser.newContext();const staff=await context.newPage();await login(staff,'staff');await staff.getByRole('button',{name:'Donor screening',exact:true}).click();const sf=staff.locator('#scrform');for(const [key,value] of Object.entries({weightKg:'60',bpSys:'120',bpDia:'80',pulse:'70',temp:'36.5'}))await sf.locator(`[name=${key}]`).fill(value);await sf.getByRole('button',{name:'Save screening record'}).click();await expect(staff.locator('.hist tbody tr')).toHaveCount(1);await context.close();
});
test('account creation and consenting donor registration preserve owner linkage',async({page})=>{
 await page.goto('/#account');await page.getByRole('button',{name:'Create one',exact:true}).click();const auth=page.locator('#authform');await auth.locator('[name=email]').fill('newdonor@example.test');await auth.locator('[name=password]').fill('Defense27!');await auth.locator('[name=password2]').fill('Defense27!');await auth.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.locator('#acct')).toContainText('newdonor@example.test');
 await page.locator('#nav [data-tab=register]').click();const f=page.locator('#regform');await f.locator('[name=name]').fill('Fictitious New Donor');await f.locator('[name=birthdate]').fill('2000-01-01');await f.locator('[name=bloodType][value="A+"]').check();await f.locator('[name=phone]').fill('09000000000');await f.locator('[name=weight]').fill('60');await f.locator('[name=barangay]').selectOption('Baliwasan');
 await f.getByRole('button',{name:'Register as donor'}).click();await expect(page.locator('#regerr')).toContainText('Tick all three');for(const name of ['agreeTerms','agreePrivacy','agreeWilling'])await f.locator(`[name=${name}]`).check();await f.getByRole('button',{name:'Register as donor'}).click();await expect(page.locator('.profile')).toContainText('Donor 000');await expect(page.locator('main')).toContainText('My donation history');await expect(page.locator('main')).toContainText('My screening records');
});

test('coordination saves preserve other drafts and their original revision',async({page})=>{
 await login(page,'staff');await openRequest(page);
 const received=page.locator('[data-received]');
 await received.locator('[name=total]').fill('2');await received.locator('[name=verified]').check();
 await page.locator('[data-fulfill] [name=confirmed]').check();
 const contact=page.locator('[data-contact]');await contact.locator('[name=facility]').fill('Fictitious Draft Facility');await contact.locator('[name=result]').selectOption('awaiting reply');await contact.getByRole('button').click();
 await expect(page.locator('main')).toContainText('Latest contact: awaiting reply');
 await expect(received.locator('[name=total]')).toHaveValue('2');await expect(received.locator('[name=verified]')).toBeChecked();await expect(page.locator('[data-fulfill] [name=confirmed]')).toBeChecked();
 await contact.locator('[name=facility]').fill('Fictitious Unsaved Facility');
 await received.getByRole('button').click();await expect(page.locator('.detail-top')).toContainText('2 of 3 units verified received');
 await expect(contact.locator('[name=facility]')).toHaveValue('Fictitious Unsaved Facility');
 await expect(page.locator('[data-fulfill] [name=confirmed]')).toBeChecked();
 await contact.getByRole('button').click();await expect(page.locator('[data-contact] [data-save-error]')).toHaveText('');
});

test('staff blood typing sends individually validated donor alerts',async({page})=>{
 await login(page,'staff');await openRequest(page,'1000000003');
 await page.locator('[name=setbt][value="A+"]').check();await page.locator('[data-settype]').click();
 await expect(page.locator('.rows .row')).toHaveCount(3);
 await expect(page.locator('main')).not.toContainText('Not saved:');
 await expect(page.locator('.detail-top')).toContainText('0 donor acceptances');
});
