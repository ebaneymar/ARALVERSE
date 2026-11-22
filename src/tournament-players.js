(() => {
  'use strict';
  const portraits=window.AVTournamentPortraits1594, art=window.AVTournamentArt1594;
  const $=id=>document.getElementById(id);
  const key=id=>'avTournamentAppearance1594:'+id;
  const current=new WeakMap(), hashes=new Map();
  const nameMeasure=document.createElement('canvas').getContext('2d');
  nameMeasure.font='900 100px "Segoe UI", Arial, sans-serif';
  const notes={missing:'Magdagdag ng larawan sa roster.',pending:'Inihahanda ang mukha…',manual:'Iayos ang mukha sa roster.',multiple:'Piliin ang mukha sa roster.',ready:''};
  const labels=['matang nasa kaliwa ng larawan','matang nasa kanan ng larawan','dulo ng ilong','gitna ng bibig','ibabang dulo ng baba'];
  const uniforms={male:{label:'Lalaki',symbol:'♂',look:'white'},female:{label:'Babae',symbol:'♀',look:'skirt'}};
  let dialog, draft, pack=[];
  function hash(text) {
    let n=2166136261;
    for(let i=0;i<text.length;i++) n=Math.imul(n^text.charCodeAt(i),16777619);
    return n>>>0;
  }
  function fingerprint(url) {
    if(!hashes.has(url)){
      if(hashes.size>=24) hashes.delete(hashes.keys().next().value);
      hashes.set(url,url.length+'-'+hash(url));
    }
    return hashes.get(url);
  }
  function rosterPhoto(person) {
    const src=mqBattleImage(mqLiveRosterEntry(person)||person);
    if(/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(src)) return src;
    if(/^(?:blob:|(?:\.\/)?assets\/)/.test(src) && !/placeholder/i.test(src)) return src;
    return '';
  }
  function settings(id) {
    let saved={};
    try { saved=JSON.parse(ARAL_STORAGE.getItem(key(id)))||{}; } catch {}
    return {gender:Object.hasOwn(uniforms,saved.gender)?saved.gender:null,look:['white','teal','yellow','skirt'].includes(saved.look)?saved.look:'white',source:saved.source,pins:saved.pins,placement:portraits.placement(saved.placement)};
  }
  async function saveSettings(id,prefs) {
    const value=JSON.stringify(prefs);ARAL_STORAGE.setItem(key(id),value);
    if(ARAL_STORAGE.getItem(key(id))!==value)throw Error('Hindi na-save ang pagpili para sa manlalarong ito.');
    await window.parent.mathAPangDesktop?.saveNow?.();
  }
  function showGender(group,value) {
    for(const b of group.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.gender===value));
  }
  function genderPicker(value,name,choose) {
    const group=document.createElement('div');group.className='av-gender-picker';
    group.setAttribute('role','group');group.setAttribute('aria-label','Kasarian · '+name);
    group.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();});
    for(const [gender,choice] of Object.entries(uniforms)){
      const b=document.createElement('button');b.type='button';b.dataset.gender=gender;
      b.setAttribute('aria-label',choice.label+' · '+name);
      const symbol=document.createElement('span');symbol.setAttribute('aria-hidden','true');symbol.textContent=choice.symbol;
      b.append(symbol,document.createTextNode(' '+choice.label));
      b.onclick=e=>{e.stopPropagation();choose(gender,group);};group.append(b);
    }
    showGender(group,value);return group;
  }
  async function resolveFit(photo,url,prefs) {
    if(prefs.source===fingerprint(url)&&portraits.validPins(prefs.pins)) {
      return {state:'ready',pins:prefs.pins,points:portraits.fromPins(prefs.pins,photo.w,photo.h)};
    }
    return portraits.fit(photo);
  }
  function paint(side,person) {
    if(!person) return;
    const img=$(side+'Photo'),name=mqBattleLabel(person,side),url=rosterPhoto(person),prefs=settings(person.id);
    const skin=window.AVTournamentSkins.equipped(person.id);
    const previous=current.get(img),saved=JSON.stringify([prefs,skin?.id]);
    const meter=$(side+'Hp').parentElement;
    meter.setAttribute('role','meter');
    meter.setAttribute('aria-label','HP · '+name);
    meter.setAttribute('aria-valuemin','0');
    meter.setAttribute('aria-valuemax','100');
    meter.setAttribute('aria-valuenow',String(Math.max(0,Math.min(100,Number(person.hp)||0))));
    const nameEl=$(side+'Name'),choice=uniforms[prefs.gender];
    if(nameEl.dataset.measuredName!==name){
      nameEl.dataset.measuredName=name;
      const width=nameMeasure.measureText(name.toUpperCase()).width;
      nameEl.style.setProperty('--av-name-em',String(Math.max(1,width/100)));
    }
    if(choice){nameEl.dataset.gender=prefs.gender;nameEl.title=name+' · '+choice.label;}
    else{delete nameEl.dataset.gender;nameEl.title=name;}
    img.alt=skin?name+' · '+skin.name:'Tauhan ni '+name;
    if(previous?.url===url && previous.id===person.id && previous.saved===saved) return;
    const request={url,id:person.id,saved};current.set(img,request);
    img.dataset.avLayoutObject=side==='blue'?'Blue player character':'Red player character';
    $(side+'Side').dataset.avLayoutObject=side==='blue'?'Blue player':'Red player';
    img.dataset.playerId=String(person.id);
    let note=$(side+'FaceNote1594');
    if(!note){note=document.createElement('small');note.id=side+'FaceNote1594';note.className='av-face-note';$(side+'Side').append(note);}
    function status(state){img.dataset.faceState=state;note.textContent=notes[state];note.hidden=!notes[state];}
    if(skin){
      img.dataset.skin=skin.id;
      img.src=window.AVTournamentSkins.image(skin,prefs.gender);
      status('ready');
      return;
    }
    delete img.dataset.skin;
    status(url?'pending':'missing');
    img.src=art[prefs.look]||art.teal;
    if(!url) return;
    (async()=>{
      const source=await portraits.photo(url),fit=await resolveFit(source,url,prefs);
      if(current.get(img)!==request) return;
      if(fit.state!=='ready'){status(fit.state);return;}
      const sprite=await portraits.render(prefs.look,side,source,fit.points,prefs.source===fingerprint(url)?prefs.placement:null);
      if(current.get(img)===request){img.src=sprite;status('ready');}
    })().catch(()=>{if(current.get(img)===request) status('manual');});
  }
  function mountDialog() {
    dialog=document.createElement('dialog');dialog.id='avFaceDialog1594';dialog.setAttribute('aria-labelledby','avFaceTitle');
    dialog.innerHTML=`<h2 id="avFaceTitle"></h2>
    <div class="av-fit-grid"><section class="av-fit-source"><h3>Larawan sa roster</h3>
      <canvas id="avFaceSource" tabindex="0" aria-label="Larawan ng manlalaro" aria-describedby="avFaceStatus"></canvas>
      <div class="av-fit-actions"><button type="button" id="avFaceManual">Ilagay ang 5 punto</button><button type="button" id="avFaceAuto">Awtomatiko</button></div>
    </section><section class="av-fit-result"><h3>Tauhan sa laro</h3><div class="av-fit-images"><img id="avFacePreview" alt="Buong tauhan"><canvas width="180" height="196" id="avFaceZoom" aria-label="Pinalaking mukha"></canvas></div>
      <div id="avFaceGender"></div><label for="avFaceLook">Kasuotan</label><select id="avFaceLook"><option value="white">Polo at shorts · puti</option><option value="skirt">Unipormeng pambabae · blusa at palda</option><option value="teal">Berde · polo</option><option value="yellow">Dilaw · sandalyas</option></select>
    </section></div>
    <details id="avPlacement"><summary>Ayusin ang laki at puwesto ng ulo</summary>
      <div class="av-fit-sliders">
        <label>Laki <output id="avSizeValue"></output><input id="avHeadSize" type="range" min="90" max="112" step="1"></label>
        <label>Kaliwa / kanan <output id="avXValue"></output><input id="avHeadX" type="range" min="-10" max="10" step="1"></label>
        <label>Taas / baba <output id="avYValue"></output><input id="avHeadY" type="range" min="-8" max="8" step="1"></label>
      </div><button type="button" id="avResetPlacement">Ibalik ang puwesto</button>
    </details>
    <p role="status" id="avFaceStatus"></p>
    <details id="avPackPanel"><summary>Mga larawan ng klase</summary><button id="avPackOpen" type="button">Buksan ang photo pack</button>
    <input id="avPackFile" type="file" accept=".json,application/json" hidden><div id="avPackGrid"></div></details>
    <footer class="av-fit-actions"><button type="button" id="avFaceCancel">Kanselahin</button><button type="button" id="avFaceSave">I-save</button></footer>`;
    document.body.append(dialog);
    let previewTimer;
    for(const axis of ['Size','X','Y']){
      $('avHead'+axis).oninput=e=>{
        if(!draft)return;
        draft.placement[axis.toLowerCase()]=Number(e.target.value);
        updatePlacementControls();
        clearTimeout(previewTimer);
        const job=draft;previewTimer=setTimeout(()=>{if(draft===job)preview();},65);
      };
    }
    $('avResetPlacement').onclick=()=>{draft.placement=portraits.placement(null);updatePlacementControls();preview();};
    $('avFaceLook').onchange=()=>{draft.look=$('avFaceLook').value;preview();};
    $('avFaceCancel').onclick=()=>{if(!draft?.saving)dialog.close();};
    dialog.addEventListener('cancel',e=>{if(draft?.saving)e.preventDefault();});
    dialog.addEventListener('close',()=>{draft=null;});
    $('avFaceManual').onclick=()=>{
      if(!draft?.photo) return;
      draft.marking=true;draft.pins=[];draft.cursor=[.4,.42];preview();$('avFaceSource').focus();
    };
    $('avFaceAuto').onclick=()=>{if(draft){draft.marking=false;draft.pins=null;preview();}};
    const source=$('avFaceSource');
    source.onclick=e=>{if(!draft?.marking)return;const r=source.getBoundingClientRect();mark([(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]);};
    source.onkeydown=e=>{
      if(!draft?.marking) return;
      if(e.key==='Enter'||e.key===' '){e.preventDefault();mark(draft.cursor);return;}
      const step=e.shiftKey ? .025 : .005,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
      if(delta){e.preventDefault();draft.cursor=draft.cursor.map((v,i)=>Math.min(1,Math.max(0,v+delta[i])));drawSource(draft.pins);}
    };
    $('avPackOpen').onclick=()=>$('avPackFile').click();
    $('avPackFile').onchange=async e=>{
      const job=draft,file=e.target.files[0];e.target.value='';
      if(!file||!job)return;
      try{
        if(file.size>16*1024*1024) throw Error();
        const data=JSON.parse(await file.text());
        if(data.format!=='ARALVERSE_CLASS_PHOTOS'||data.version!==1||!Array.isArray(data.photos)||!data.photos.length||data.photos.length>100)throw Error();
        const next=data.photos.map((p,i)=>{
          if(!p||typeof p.image!=='string'||p.image.length>2e6||!/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+=*$/i.test(p.image))throw Error();
          return {label:String(p.label||('Larawan '+(i+1))).slice(0,60),image:p.image};
        });
        if(draft!==job)return;pack=next;showPack();
        $('avFaceStatus').textContent='Piliin ang larawan ni '+job.name+'.';
      }catch{if(draft===job)$('avFaceStatus').textContent='Hindi mabasa ang photo pack. Pumili ng ARALVERSE class photos JSON.';}
    };
    $('avFaceSave').onclick=save;
  }
  function updatePlacementControls() {
    for(const axis of ['Size','X','Y']){
      const n=draft.placement[axis.toLowerCase()];
      $('avHead'+axis).value=String(n);
      $('av'+axis+'Value').textContent=axis==='Size'?n+'%':String(n);
    }
  }
  function showPack() {
    const grid=$('avPackGrid');grid.replaceChildren();
    for(const entry of pack){
      const b=document.createElement('button'),img=new Image(),caption=document.createElement('span');
      b.type='button';b.setAttribute('aria-pressed',String(entry.image===draft.url));
      img.src=entry.image;img.alt='';caption.textContent=entry.label;b.append(img,caption);
      b.onclick=()=>{if(draft.url!==entry.image){draft.placement=portraits.placement(null);updatePlacementControls();}draft.url=entry.image;draft.pins=null;draft.marking=false;draft.photo=null;showPack();preview();};
      grid.append(b);
    }
  }
  function mark(point) {
    if(!draft?.marking)return;
    draft.pins.push(point.slice());draft.cursor=point.slice();
    if(draft.pins.length===5){
      if(!portraits.validPins(draft.pins)){draft.pins=[];$('avFaceStatus').textContent='Suriin ang pagkakasunod. Unahin ang matang nasa kaliwa ng larawan.';drawSource([]);return;}
      draft.marking=false;
    }
    preview();
  }
  function drawSource(points) {
    const c=$('avFaceSource'),p=draft?.photo;
    c.hidden=!p;if(!p)return;
    c.width=p.w;c.height=p.h;const ctx=c.getContext('2d');ctx.drawImage(p.el,0,0);
    const radius=Math.max(3,Math.min(p.w,p.h)*.014);
    for(const [index,point] of (points||[]).entries()){
      const x=point[0]*p.w,y=point[1]*p.h;
      ctx.fillStyle='#007962';ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,radius*.25);
      ctx.beginPath();ctx.arc(x,y,radius,0,2*Math.PI);ctx.fill();ctx.stroke();
      ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+radius*1.6+'px sans-serif';ctx.fillText(String(index+1),x,y);
    }
    if(draft.marking&&c===document.activeElement){
      const [x,y]=draft.cursor;ctx.beginPath();ctx.strokeStyle='#ffcb3b';ctx.lineWidth=2;ctx.arc(x*p.w,y*p.h,radius*1.5,0,2*Math.PI);ctx.stroke();
    }
  }
  async function preview() {
    const job=draft,sequence=++job.sequence,img=$('avFacePreview'),status=$('avFaceStatus'),zoom=$('avFaceZoom');
    const live=()=>draft===job&&sequence===job.sequence;
    const showState=state=>{img.dataset.faceState=state;status.textContent=notes[state]||'';};
    img.src=art[job.look]||art.teal;zoom.hidden=true;showState(job.url?'pending':'missing');
    $('avFaceSave').disabled=job.marking||job.saving;$('avFaceManual').disabled=true;$('avFaceAuto').disabled=true;drawSource(null);
    if(!job.url)return;
    try{
      const pic=await portraits.photo(job.url);if(!live())return;
      job.photo=pic;$('avFaceManual').disabled=false;$('avFaceAuto').disabled=false;
      drawSource(job.pins);
      if(job.marking){status.textContent='Punto '+(job.pins.length+1)+' / 5. Pindutin ang '+labels[job.pins.length]+'. Maaari ring gamitin ang mga arrow at Enter.';return;}
      const fit=job.pins?{state:'ready',pins:job.pins,points:portraits.fromPins(job.pins,pic.w,pic.h)}:await portraits.fit(pic);
      if(!live())return;
      drawSource(fit.pins);
      if(fit.state!=='ready'){showState(fit.state);status.textContent=fit.state==='multiple'?'May ilang mukha sa larawan. Piliin ang tamang mag-aaral gamit ang 5 punto.':'Pindutin ang “Ilagay ang 5 punto” upang ihanay ang mukha.';return;}
      const result=await portraits.render(job.look,'red',pic,fit.points,job.placement);if(!live())return;
      img.src=result;await img.decode();if(!live())return;
      showState('ready');status.textContent=job.pins?'Nakaayos ang limang punto.':'Awtomatikong naihanay ang mukha.';
      zoom.hidden=false;zoom.getContext('2d').drawImage(img,76,12,158,172,0,0,zoom.width,zoom.height);
    }catch{if(live()){showState('manual');status.textContent='Hindi mabasa ang larawan. Pumili ng ibang larawan sa roster.';}}
  }
  function open(person) {
    if(!dialog)mountDialog();
    const url=rosterPhoto(person),prefs=settings(person.id);
    draft={id:person.id,name:mqBattleLabel(person),original:url,url,look:prefs.look,gender:prefs.gender,placement:portraits.placement(url&&prefs.source===fingerprint(url)?prefs.placement:null),photo:null,sequence:0,marking:false,saving:false,
      pins:url&&prefs.source===fingerprint(url)&&portraits.validPins(prefs.pins)?prefs.pins:null};
    $('avFaceTitle').textContent='Iayos ang mukha · '+draft.name;
    $('avFaceGender').replaceChildren(genderPicker(draft.gender,draft.name,(gender,group)=>{
      draft.gender=gender;draft.look=uniforms[gender].look;
      showGender(group,gender);$('avFaceLook').value=draft.look;preview();
    }));
    updatePlacementControls();$('avPlacement').open=false;
    $('avFaceLook').value=draft.look;$('avPackPanel').open=false;showPack();dialog.showModal();preview();
  }
  async function save() {
    const job=draft;if(!job||job.marking||job.saving)return;
    job.saving=true;$('avFaceSave').disabled=true;
    try{
      const person=roster.find(p=>String(p.id)===String(job.id));
      if(!person||rosterPhoto(person)!==job.original)throw Error('Nagbago ang larawan sa roster. Buksan muli ang manlalaro.');
      if(job.url!==job.original){
        const r=await fetch('/api/roster/update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:String(job.id),image:job.url})});
        if(!r.ok||!(await r.json()).ok)throw Error('Hindi na-save ang larawan sa roster.');
        await window.mqDiskLoadTournamentRoster();
        if(rosterPhoto(roster.find(p=>String(p.id)===String(job.id)))!==job.url)throw Error('Hindi na-save ang larawan sa roster.');
        job.original=job.url;
      }
      const prefs={look:job.look,gender:job.gender};
      if(job.url){prefs.source=fingerprint(job.url);prefs.placement=job.placement;if(job.pins)prefs.pins=job.pins;}
      await saveSettings(job.id,prefs);
      const card=[...$('tournamentRoster').querySelectorAll('.t-player-card')].find(c=>c.dataset.studentId===String(job.id));
      if(card){const group=card.querySelector('.av-gender-picker');if(group)showGender(group,job.gender);}
      if(draft===job)dialog.close();
    }catch(e){if(draft===job)$('avFaceStatus').textContent=e.message;}
    finally{if(draft===job){job.saving=false;$('avFaceSave').disabled=false;}}
  }
  function install() {
    const host=$('tournamentRoster');if(!host)return;
    const arena=$('arena'),heading=$('battle').querySelector('.av-match-heading1567');
    if(heading){
      arena.append(heading);
      const placeBanners=()=>{
        for(const id of ['mqGrandFinalBanner','mqEventBanner']){
          const banner=$(id);
          if(!banner||banner.parentElement===heading)continue;
          heading.insertBefore(banner,$('turn'));
          if(id==='mqEventBanner' && typeof mqCurrentMatchEvent!=='undefined'){
            banner.classList.toggle('av-hide-classic1567',mqCurrentMatchEvent==='classic');
          }
        }
      };
      // Finals and event banners can be created after the first match update.
      new MutationObserver(placeBanners).observe(document.body,{childList:true});placeBanners();
    }
    for(const team of ['blue','red']){
      const label=team==='blue'?'Blue':'Red';
      const side=$(team+'Side');
      side.querySelector('.av-team-label1567').dataset.avLayoutObject=label+' team tab';
      $(team+'Name').dataset.avLayoutObject=label+' player name';
      const meter=$(team+'Hp').parentElement;
      meter.dataset.avLayoutObject=label+' HP bar';
      // Keep the existing live elements and their saved selectors in place.
      const plate=document.createElement('span');
      plate.id=team+'Nameplate';plate.className='av-nameplate';plate.setAttribute('aria-hidden','true');
      plate.dataset.avLayoutObject=label+' nameplate background';side.append(plate);
      for(const part of [plate,meter,$(team+'Name'),side.querySelector('.av-team-label1567')]){
        part.dataset.avLayoutLink=team+'-nameplate';
      }
      const stats=$(team+'Stats1567');
      stats.dataset.avLayoutObject=label+' player stats';
      stats.setAttribute('role','group');
      stats.setAttribute('aria-label',label+' player rewards');
    }
    const bolt=$('arena').querySelector('.av-battle-vs1567');
    if(bolt){
      const path=bolt.querySelector('path'),letters=bolt.querySelector('text');
      path.setAttribute('d','M74 3 19 76h29l-12 55 60-82H67Z');
      path.setAttribute('stroke','#a65d05');path.setAttribute('fill','#ffcd35');
      letters.setAttribute('font-size','45');letters.setAttribute('y','83');
      letters.setAttribute('fill','#104a89');letters.setAttribute('stroke','#fff0a6');letters.setAttribute('stroke-width','4');
    }
    function decorate(){
      host.querySelectorAll('.t-player-card').forEach((card,i)=>{
        if(card.querySelector('.av-face-fit'))return;
        const person=roster.find(p=>String(p.id)===card.dataset.studentId)||roster[i];if(!person)return;
        const button=document.createElement('button');button.type='button';button.className='av-face-fit';button.textContent='Iayos ang mukha';
        button.setAttribute('aria-label','Iayos ang mukha · '+mqBattleLabel(person));
        button.onclick=e=>{e.stopPropagation();open(person);};
        const picker=genderPicker(settings(person.id).gender,mqBattleLabel(person),async(gender,group)=>{
          const prefs=settings(person.id);prefs.gender=gender;prefs.look=uniforms[gender].look;
          try{
            await saveSettings(person.id,prefs);
            showGender(group,settings(person.id).gender);
          }catch(error){showGender(group,settings(person.id).gender);window.alert(error.message);}
        });
        const skins=window.AVTournamentSkins.rosterButton(person,()=>settings(person.id).gender);
        card.append(picker,button,skins);
      });
    }
    new MutationObserver(decorate).observe(host,{childList:true});decorate();
  }
  window.AVTournamentPlayers1594={paint};
  document.addEventListener('DOMContentLoaded',install,{once:true});
})();
