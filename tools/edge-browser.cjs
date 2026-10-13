const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const primaryFlow=async(page,outDir)=>{
 const errors=[],checks=[],scores={};page.on('pageerror',e=>errors.push(e.message));
 const ok=(v,l)=>{if(!v)throw Error(l);checks.push(l);};
 const plans={
 foundations:[[7,0],[6,2],[2,2],[3,2],[11,2],[8,1],[13,2],[17,0],[19,2],[22,2],[18,1],[16,0],[15,0],[0,2],[10,1],null,[4,1],null,[9,2],[20,0]],
 garden:[[13,0],[7,2],[14,2],[19,2],[8,2],[18,1],[17,2],[11,0],[15,2],[6,2],[10,1],[0,1],[16,0],[21,0],[20,1],[22,0],[2,1],null,[3,2],[23,0]],
 transit:[[7,0],[6,2],[2,2],[3,2],[11,2],[8,1],[13,2],[17,0],[16,0],[22,1],[18,0],[20,1],[15,2],[19,0],[14,2],[21,1],null,null,[0,2],[23,0]]};
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#scenario').selectOption('foundations');await page.locator('#seed').fill('lesson');await page.locator('#apply-seed').click();
 const first=await page.locator('#city-name').innerText();
 await page.locator('#seed').fill('잘못된코드');await page.locator('#apply-seed').click();
 ok((await page.locator('#notice').innerText()).includes('도전 코드')&&await page.locator('#city-name').innerText()===first,'invalid code preserves city');
 await page.locator('#seed').fill('lesson');await page.locator('#apply-seed').click();
 await page.locator('#offers button').first().click();
 await page.locator('#city button').nth(7).focus();
 const preview=await page.locator('#preview').innerText();await page.mouse.move(0,0);
 ok(await page.locator('#preview').innerText()===preview&&preview.includes('정산 후'),'keyboard preview persists after pointer leave');
 for(const scenario of ['foundations','garden','transit']){
   await page.locator('#scenario').selectOption(scenario);await page.locator('#seed').fill('lesson');await page.locator('#apply-seed').click();
   const details=page.locator('details').filter({has:page.getByText('계획 비교 과제',{exact:true})});if(await details.getAttribute('open')===null)await details.locator('summary').click();
   ok((await page.locator('#planning-challenge').innerText()).length>50,scenario+' challenge selected');
   for(let turn=0;turn<20;turn++){
     const move=plans[scenario][turn];
     if(move){await page.locator('#offers button').nth(move[1]).click();await page.locator('#city button').nth(move[0]).click();}
     else await page.locator('#pass').click();
     if(scenario==='garden'&&turn===10){
       const budget=await page.locator('#budget').innerText();
       ok((await page.locator('#event-status').innerText()).startsWith('적용 중'),'turn 11 heat event active');
       await page.reload();await page.locator('#resume').click();
       ok(await page.locator('#budget').innerText()===budget,'mid-city reload replay exact');
       await page.getByText('계획 비교 과제',{exact:true}).click();
       for(const width of [1440,390,320]){
         await page.setViewportSize({width,height:width===1440?1000:844});
         ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'garden mid no overflow '+width);
         await page.screenshot({path:outDir+'/garden-turn11-'+width+'.png',fullPage:true});
       }
       await page.setViewportSize({width:1440,height:1000});
     }
   }
   const result=await page.locator('#endgame h2').innerText();
   ok(result.includes('임무 성공'),scenario+' UI victory');scores[scenario]=result;
   await page.screenshot({path:outDir+'/'+scenario+'-victory.png',fullPage:true});
 }
 ok((await page.locator('#record-summary').innerText()).includes('캠페인 3/3'),'all three achievements durable');
 await page.reload();ok((await page.locator('#record-summary').innerText()).includes('캠페인 3/3'),'reload campaign preserved');
 await page.locator('#scenario').selectOption('foundations');await page.locator('#seed').fill('lesson');await page.locator('#apply-seed').click();
 for(let turn=0;turn<20;turn++)await page.locator('#pass').click();
 ok((await page.locator('#endgame h2').innerText()).includes('미달'),'empty city loses');
 ok((await page.locator('#record-summary').innerText()).includes('캠페인 3/3'),'loss preserves achievements');
 for(const width of [390,320]){await page.setViewportSize({width,height:844});ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'loss no overflow '+width);}
 await page.screenshot({path:outDir+'/empty-city-failure-320.png',fullPage:true});
 ok(errors.length===0,'no observed page errors');
 return {checks:checks.length,errors,scores,selectors:['#planning-challenge','#scenario','#offers button','#city button','#resume'],screenshots:['garden-turn11-1440.png','garden-turn11-390.png','garden-turn11-320.png','foundations-victory.png','garden-victory.png','transit-victory.png','empty-city-failure-320.png']};
};
async function audit(page,outDir){
  await fs.mkdir(outDir,{recursive:true});
  const additions=[];
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  const logs=[];page.on('console',message=>{if(['warning','error'].includes(message.type()))logs.push(message.type()+': '+message.text());});
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.evaluate(()=>scrollTo(0,0));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'startup horizontal fit '+width);
    await page.screenshot({path:outDir+'/startup-'+width+'.png'});
  }
  await page.setViewportSize({width:1440,height:1000});

  await page.locator('#seed').fill('lesson');await page.locator('#apply-seed').click();
  await page.evaluate(()=>{window.edgeOldPlot=document.querySelectorAll('#city button')[7];});
  await page.locator('#new-city').click();
  const turn=await page.locator('#turn').innerText();
  await page.evaluate(()=>window.edgeOldPlot.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  assert.equal(await page.locator('#turn').innerText(),turn,'detached click fixture cannot build in replacement city');
  await page.locator('#pass').click();
  const record=await page.evaluate(()=>localStorage.getItem('pocket-city-v1'));
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#new-city').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('pocket-city-v1')),record,'cancel preserves replay');
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#clear').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('pocket-city-v1')),record,'cancel preserves records');
  page.once('dialog',dialog=>dialog.accept());await page.locator('#new-city').click();
  additions.push('detached click fixture, real new-city cancel, real erase cancel');

  const primary=await primaryFlow(page,outDir);

  
  const privateKey='pocket-city-v1';
  const durableBefore=await page.evaluate(k=>localStorage.getItem(k),privateKey);
  const summaryBefore=await page.evaluate(()=>localStorage.getItem('web-lab-progress-v1'));
  await page.evaluate(k=>{window.edgeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===k)throw new DOMException('fixture quota','QuotaExceededError');return window.edgeSet.call(this,key,value);};},privateKey);
  try{

  await page.locator('#new-city').click();
  await page.locator('#pass').click();
  assert.match(await page.locator('#notice').innerText(),/저장할 수 없습니다/);

    assert.equal(await page.evaluate(k=>localStorage.getItem(k),privateKey),durableBefore,'quota preserves durable private data');
    assert.equal(await page.evaluate(()=>localStorage.getItem('web-lab-progress-v1')),summaryBefore,'quota does not publish');
  }finally{await page.evaluate(()=>{Storage.prototype.setItem=window.edgeSet;delete window.edgeSet;});}
  const peer={completed:2,total:9,updatedAt:'2026-10-13T00:00:00.000Z'};
  await page.evaluate(entry=>{
    const raw=localStorage.getItem('web-lab-progress-v1');
    const value=raw?JSON.parse(raw):{version:1,apps:{}};
    value.apps['echo-vault']=entry;
    localStorage.setItem('web-lab-progress-v1',JSON.stringify(value));
    localStorage.setItem('edge-peer-private','keep');
  },peer);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#clear').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('edge-peer-private')),'keep','own erase retains peer private key');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('web-lab-progress-v1')).apps['echo-vault']),peer,'own erase retains peer aggregate');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),privateKey),null,'own erase removes own private key');
  additions.push('Storage.setItem quota fixture, readback preservation, actual own erase retaining peer fixture');

  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.locator('#city').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'final horizontal fit '+width);
    await page.screenshot({path:outDir+'/final-viewport-'+width+'.png'});
  }
  assert.deepEqual(logs,[],'observed console errors/warnings');
  assert.deepEqual(pageErrors,[],'all-flow page errors');
  const report={primary,additions,logs,pageErrors,fixtureBoundary:'Synthetic IME/detached event/File.text timing are failure injections; normal controls use Playwright input. Headless Chrome viewport emulation is not a physical phone.'};
  await fs.writeFile(outDir+'/browser-report.json',JSON.stringify(report,null,2),'utf8');
  return report;
}
module.exports=audit;
if(require.main===module)(async()=>{
  const url=process.argv[2],target=new URL(url);if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||!target.port)throw Error('Supply own loopback URL');
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||path.resolve(__dirname,'../../output/playwright/implement-20261012/node_modules/playwright'));
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--mute-audio']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  try{const page=await context.newPage();await page.goto(url);const result=await audit(page,path.resolve(__dirname,'../.qa/output/playwright/edge-20261013'));console.log(JSON.stringify(result,null,2));}
  finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

