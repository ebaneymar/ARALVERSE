/* ARALVERSE 1.5.81: native, device-bound seven-day trial and activation. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const desktop=window.mathAPangDesktop,api=desktop?.activation;
 let status={state:'checking',canPlay:false,activated:false,message:'Checking activation…',deviceCode:''};
 let dialog,release=null,checking=null,busy=false,restoreFocus=null;
 const gameVisible=()=>!!$('gameShell')&&getComputedStyle($('gameShell')).display!=='none';
 const updaterVisible=()=>$('mqUpdateOverlay')?.classList.contains('show');
 const label=()=>status.activated?'Activated · this device':status.state==='trial'?'Free trial · '+status.remainingDays+' day'+(status.remainingDays===1?'':'s')+' left':status.state==='checking'?'Checking activation…':'Activation required';
 function paint(){
  for(const node of document.querySelectorAll('[data-av-activation-status]'))node.textContent=label();
  if(!dialog)return;
  $('avActDevice1581').value=status.deviceCode||'';
  $('avActState1581').textContent=status.activated?'ARALVERSE is activated':status.state==='trial'?'Your 7-day trial is active':'Activate ARALVERSE';
  $('avActMessage1581').textContent=status.activated?'Permanent activation for this device. Your key remains valid through future updates.':status.message;
  $('avActMessage1581').dataset.error=String(!status.canPlay&&status.state!=='checking');
  $('avActTrial1581').textContent=status.state==='trial'?'Trial ends '+new Date(status.trialEndsAt).toLocaleString():status.activated?'Thank you for activating ARALVERSE.':'Your saved players, photos and progress stay on this device.';
  $('avActClose1581').disabled=!status.canPlay&&gameVisible();
  $('avActSubmit1581').disabled=busy||status.activated||!api;
  $('avActCopy1581').disabled=!status.deviceCode;
  $('avActKey1581').disabled=status.activated||!api;
 }
 function resume(){if(release){const end=release;release=null;end()}}
 function pause(){
  if(release||!gameVisible())return;
  try{const engine=window.AVLayoutEditor1580?.get();if(engine?.active)engine.finish(false);release=engine?.pause()||null}catch(_){}
 }
 async function refresh(){
  if(checking)return checking;
  checking=(async()=>{
   try{status=api?await api.status():{state:'desktop_required',canPlay:false,activated:false,deviceCode:'',message:'Open ARALVERSE.exe to use your device trial or activation key.'}}
   catch(_){status={state:'unavailable',canPlay:false,activated:false,deviceCode:'',message:'Activation could not be checked. Restart ARALVERSE and try again.'}}
   paint();
   if(status.canPlay){if(!dialog?.open&&!updaterVisible())resume()}
   else if(gameVisible()&&!updaterVisible()){pause();if(!dialog.open)await open(false)}
   return status;
  })();
  try{return await checking}finally{checking=null}
 }
 async function open(check=true){
  if(check)await refresh();
  if(dialog.open){paint();return}
  restoreFocus=document.activeElement;
  window.closeDisplaySettings?.();$('avHomeMoreDialog')?.close?.();pause();
  try{const child=$('gameFrame')?.contentDocument;if(child?.fullscreenElement)await child.exitFullscreen()}catch(_){}
  paint();dialog.showModal();
  (status.activated?$('avActClose1581'):$('avActKey1581')).focus({preventScroll:true});
 }
 function addEntries(){
  const update=$('avImageUpdate');
  if(update&&!$('avActivationSettings1581')){
   const button=document.createElement('button');button.type='button';button.id='avActivationSettings1581';button.className='av-settings-action';
   button.innerHTML='<span class="av-row-icon" aria-hidden="true">🔑</span><span class="av-row-copy"><strong>Activation Key</strong><small data-av-activation-status></small></span><span class="av-row-arrow" aria-hidden="true">›</span>';
   button.addEventListener('click',()=>open());update.after(button);
  }
  const homeUpdate=$('mqHomeUpdateBtn');
  if(homeUpdate&&!$('avActivationHome1581')){
   const button=document.createElement('button');button.type='button';button.id='avActivationHome1581';button.className='mq-home-btn';
   button.innerHTML='<span class="mq-home-btn-icon">🔑</span><span><strong>ACTIVATION KEY</strong><small data-av-activation-status></small></span>';
   button.addEventListener('click',()=>open());homeUpdate.after(button);
  }
  paint();
 }
 function mount(){
  const style=document.createElement('style');style.id='av-activation-style1581';
  style.textContent=`
   html body #avActivationDialog1581{width:min(650px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;margin:auto!important;padding:25px!important;border:3px solid #b99a51!important;border-radius:22px!important;background:linear-gradient(145deg,#fffdf2,#fff3d7)!important;color:#183e54!important;box-sizing:border-box!important;overflow:auto!important;font-family:'Segoe UI',Arial,sans-serif!important;box-shadow:0 20px 80px #05274780!important;text-align:left!important;}
   html body #avActivationDialog1581::backdrop{background:#082c45c2!important;backdrop-filter:blur(3px)!important;}
   html body #avActivationDialog1581 *{box-sizing:border-box!important;font-family:'Segoe UI',Arial,sans-serif!important;letter-spacing:normal!important;text-shadow:none!important;}
   html body #avActivationDialog1581 h2{font-size:29px!important;line-height:1.2!important;color:#15435d!important;margin:5px 0 13px!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;}
   html body #avActivationDialog1581 p{font-size:14px!important;line-height:1.5!important;margin:8px 0!important;color:#4b6673!important;}
   html body #avActivationDialog1581 label{display:block!important;font-size:15px!important;font-weight:700!important;color:#214c60!important;margin:19px 0 7px!important;}
   html body #avActivationDialog1581 input,html body #avActivationDialog1581 textarea{width:100%!important;max-width:100%!important;min-width:0!important;padding:12px!important;border:1px solid #a8c5d0!important;border-radius:9px!important;background:white!important;color:#123e55!important;font-family:Consolas,monospace!important;font-size:14px!important;line-height:1.4!important;box-shadow:none!important;}
   html body #avActivationDialog1581 input{min-height:45px!important;}
   html body #avActivationDialog1581 textarea{min-height:116px!important;resize:vertical!important;overflow-wrap:anywhere!important;}
   html body #avActivationDialog1581 button{min-height:42px!important;padding:10px 14px!important;border:1px solid #a9c5cf!important;border-radius:9px!important;background:#e8f1f5!important;color:#214c61!important;font-size:14px!important;font-weight:700!important;line-height:1.3!important;cursor:pointer!important;box-shadow:none!important;white-space:normal!important;}
   html body #avActivationDialog1581 button:disabled{opacity:.45!important;cursor:default!important;}
   html body #avActivationDialog1581 #avActSubmit1581{display:block!important;width:100%!important;margin-top:12px!important;background:#087d85!important;border-color:#087d85!important;color:white!important;}
   html body #avActivationDialog1581 .av-act-copy{display:flex!important;gap:8px!important;align-items:center!important;}
   html body #avActivationDialog1581 .av-act-copy input{flex:1!important;}
   html body #avActivationDialog1581 .av-act-copy button{flex:none!important;}
   html body #avActivationDialog1581 .av-act-actions{display:flex!important;flex-wrap:wrap!important;gap:8px!important;margin-top:20px!important;border-top:1px solid #e1d4ad!important;padding-top:15px!important;}
   html body #avActivationDialog1581 #avActClose1581{margin-left:auto!important;}
   html body #avActivationDialog1581 [role=status]{padding:12px!important;border-radius:9px!important;background:#e7f3e9!important;color:#295940!important;}
   html body #avActivationDialog1581 [role=status][data-error=true]{background:#fff0db!important;color:#8a5520!important;}
   html body #avActivationDialog1581 :is(input,textarea,button):focus-visible{outline:3px solid #eead22!important;outline-offset:2px!important;}
   html body #avActivationBadge1581{position:fixed!important;left:14px!important;bottom:12px!important;z-index:45!important;max-width:calc(100vw - 28px)!important;min-height:32px!important;padding:7px 13px!important;border:1px solid #e4cb83!important;border-radius:99px!important;background:#153f51f0!important;color:#fff4cb!important;font-family:'Segoe UI',Arial,sans-serif!important;font-size:12px!important;font-weight:700!important;line-height:1.25!important;cursor:pointer!important;box-shadow:0 3px 12px #15384a55!important;}
  `;
  document.head.append(style);
  dialog=document.createElement('dialog');dialog.id='avActivationDialog1581';dialog.setAttribute('aria-labelledby','avActState1581');
  dialog.innerHTML='<p>ARALVERSE · DEVICE ACTIVATION</p><h2 id="avActState1581">Activate ARALVERSE</h2><p id="avActMessage1581" role="status" aria-live="polite"></p><p id="avActTrial1581"></p><label for="avActDevice1581">Your device code</label><div class="av-act-copy"><input id="avActDevice1581" readonly spellcheck="false" aria-label="Your device code"><button id="avActCopy1581" type="button">Copy code</button></div><p>Share this code with your ARALVERSE provider to request a key for this device.</p><label for="avActKey1581">Activation key</label><textarea id="avActKey1581" spellcheck="false" autocomplete="off" placeholder="Paste your activation key here"></textarea><button id="avActSubmit1581" type="button">Activate this device</button><div class="av-act-actions"><button id="avActUpdate1581" type="button">Check for Updates</button><button id="avActData1581" type="button">Open Saved Data</button><button id="avActExit1581" type="button">Exit</button><button id="avActClose1581" type="button">Close</button></div>';
  document.body.append(dialog);
  const badge=document.createElement('button');badge.id='avActivationBadge1581';badge.type='button';badge.setAttribute('data-av-activation-status','');badge.addEventListener('click',()=>open());document.body.append(badge);
  $('avActSubmit1581').onclick=async()=>{
   const key=$('avActKey1581').value.trim();if(!key){$('avActMessage1581').textContent='Paste your activation key first.';$('avActMessage1581').dataset.error='true';return}
   busy=true;paint();$('avActSubmit1581').textContent='Activating…';
   try{const result=await api.activate(key);if(result.status)status=result.status;paint();if(result.ok){$('avActKey1581').value='';$('avActClose1581').focus()}else{$('avActMessage1581').textContent=result.error||'Activation failed. Check your key and try again.';$('avActMessage1581').dataset.error='true'}}
   catch(_){$('avActMessage1581').textContent='Activation could not be completed. Restart ARALVERSE and try again.';$('avActMessage1581').dataset.error='true'}
   finally{busy=false;$('avActSubmit1581').textContent='Activate this device';$('avActSubmit1581').disabled=status.activated||!api}
  };
  $('avActCopy1581').onclick=async()=>{try{await api.copyDeviceCode();$('avActMessage1581').textContent='Device code copied. Share it with your ARALVERSE provider to request a key.'}catch(_){$('avActDevice1581').select();$('avActMessage1581').textContent='Select the device code and press Ctrl+C to copy it.'}};
  $('avActClose1581').onclick=()=>dialog.close();
  $('avActUpdate1581').onclick=()=>{dialog.close();$('mqHomeUpdateBtn')?.click()};
  $('avActData1581').onclick=()=>desktop?.openDataFolder?.();
  $('avActExit1581').onclick=()=>desktop?.exit?.();
  dialog.addEventListener('cancel',e=>{if(!status.canPlay&&gameVisible())e.preventDefault()});
  dialog.addEventListener('close',()=>{if(status.canPlay)resume();restoreFocus?.focus?.({preventScroll:true});restoreFocus=null});
  for(const type of ['keydown','keyup'])dialog.addEventListener(type,e=>e.stopPropagation());
 }
 function boot(){
  mount();addEntries();
  const launch=window.launchGame;
  window.launchGame=function(){const args=arguments,self=this;return refresh().then(current=>{if(!current.canPlay)return open(false);return launch.apply(self,args)})};
  new MutationObserver(()=>{if(!$('avActivationSettings1581')||!$('avActivationHome1581'))addEntries()}).observe(document.body,{subtree:true,childList:true});
  if($('mqUpdateOverlay'))new MutationObserver(()=>{
   if(updaterVisible()||dialog.open)return;
   if(status.canPlay)resume();else if(gameVisible())open(false);
  }).observe($('mqUpdateOverlay'),{attributes:true,attributeFilter:['class']});
  setInterval(refresh,15000);window.addEventListener('focus',refresh);
  window.AVActivation1581=Object.freeze({open,refresh,getStatus:()=>({...status})});
  refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
