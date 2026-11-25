import {test,expect} from '@playwright/test';
const requests={
 '1000000001':{code:'1000000001',ownerUid:'requester',bloodType:'A+',units:3,urgency:'Critical',createdAt:1,status:'open',notified:['0000000001'],responses:{'0000000001':'accepted'},donated:[],hospitalId:'demo'},
 '1000000002':{code:'1000000002',ownerUid:'requester',bloodType:null,units:3,urgency:'Urgent',createdAt:2,status:'typing'},
 '1000000003':{code:'1000000003',ownerUid:'requester',bloodType:null,units:3,urgency:'Scheduled',status:'cancelled'}
};
const raw={reqs:requests,reqPriv:{},donors:{'0000000001':{code:'0000000001',uid:'donor1',bloodType:'A+',available:true,btConfirmed:true,eligFrom:'2018-01-01',eligUntil:'2066-01-01',lastDonation:null}},priv:{'0000000001':{birthdate:'2000-01-01',weight:60,name:'Fictitious Donor',phone:'09000000000',barangay:'Fictitious'}},scr:{}};
for(const width of [360,390,768,1440])test(`light UI, forms and navigation at ${width}px (fictitious layout fixtures)`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:'dark'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:3003/#requests');await page.waitForFunction(()=>typeof window.setLayoutFixture==='function');
 const screens=['home','requests','request','register','screening','coordination','hospitals','rules','sms'];
 for(const tab of screens){
  await page.evaluate(({tab,raw})=>window.setLayoutFixture({user:{uid:'staff',email:'staff@example.test'},profile:{role:'staff'},raw,state:{viewAs:'staffhc',hospitals:[{id:'demo',name:'Fictitious Hospital with a long facility name for layout testing',kind:'Hospital',address:'Fictitious address',contact:'Demo only'}]},tab}),{tab,raw});
  await expect(page.locator('main')).not.toContainText('Loading BloodConnect');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(243, 245, 248)');
  if(width<=800){
   await expect(page.locator('#nav')).toBeHidden();
   await page.locator('#menuToggle').click();await expect(page.locator('#nav')).toBeVisible();
   expect(await page.locator('#nav').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBeTruthy();
   await page.locator(`#nav [data-tab=${tab}]`).click();
   await expect(page.locator('#menuToggle')).toHaveAttribute('aria-expanded','false');await expect(page.locator('#nav')).toBeHidden();
  }else{expect(await page.locator('#nav').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBeTruthy();}
  if(['home','request','screening','coordination'].includes(tab))await page.screenshot({path:`artifacts/${tab}-${width}.png`,fullPage:true});
 }
 if(width<=800){await page.locator('#menuToggle').click();await page.screenshot({path:`artifacts/menu-${width}.png`,fullPage:true});await page.keyboard.press('Escape');await expect(page.locator('#menuToggle')).toBeFocused();await expect(page.locator('#nav')).toBeHidden();}
 await page.evaluate(raw=>window.setLayoutFixture({user:{uid:'staff',email:'staff@example.test'},profile:{role:'staff'},raw,state:{viewAs:'staffhc'},tab:'requests',detail:'1000000001'}),raw);
 await expect(page.locator('[data-received]')).toBeVisible();await expect(page.locator('main')).toContainText('0 of 3 units verified received');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`artifacts/detail-${width}.png`,fullPage:true});
 await page.evaluate(raw=>window.setLayoutFixture({user:{uid:'staff',email:'staff@example.test'},profile:{role:'staff'},raw,state:{viewAs:'staffhc'},tab:'requests',detail:'1000000003'}),raw);
 await expect(page.locator('.detail-top')).toContainText('Cancelled');
 await page.evaluate(raw=>window.setLayoutFixture({user:{uid:'donor1',email:'donor1@example.test'},profile:{role:'user',donorCode:'0000000001'},raw,state:{viewAs:'0000000001'},tab:'inbox'}),raw);
 await expect(page.getByRole('heading',{name:'My donation history'})).toBeVisible();
 await expect(page.locator('nav')).not.toContainText('Coordination');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`artifacts/donor-${width}.png`,fullPage:true});
 await page.evaluate(()=>window.setLayoutFixture({user:{uid:'donor1',email:'donor1@example.test'},profile:null,raw:{},state:{viewAs:'staff'},tab:'register'}));
 await expect(page.getByRole('heading',{name:'Account temporarily unavailable'})).toBeVisible();
 await expect(page.locator('main')).not.toContainText('not registered');
 expect(errors).toEqual([]);
});
