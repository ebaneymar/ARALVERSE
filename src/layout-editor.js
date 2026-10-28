/* ARALVERSE 1.5.80 — device-local game layout editor. */
(() => {
  'use strict';
  const STORAGE_KEY = 'avManualLayouts1580';
  const ENGINES = new WeakMap();
  const copy = value => JSON.parse(JSON.stringify(value));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const storage = window.ARAL_STORAGE || window.localStorage;
  const CSS_TEXT = `
    html body .avle-ui,html body .avle-ui *{box-sizing:border-box!important;font-family:'Segoe UI',Arial,sans-serif!important;letter-spacing:normal!important;text-shadow:none!important;animation:none!important;}
    html body .avle-toolbar{position:fixed!important;z-index:2147483647!important;width:310px!important;max-width:calc(100vw - 16px)!important;max-height:calc(100vh - 16px)!important;overflow:auto!important;margin:0!important;padding:0!important;background:#f5fafc!important;border:2px solid #2e91a2!important;border-radius:16px!important;color:#163b4f!important;box-shadow:0 12px 42px #001d4166!important;text-align:left!important;font-size:14px!important;line-height:1.35!important;}
    html body .avle-toolbar header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;background:#123f55!important;color:white!important;padding:12px 14px!important;cursor:move!important;touch-action:none!important;}
    html body .avle-toolbar header strong{font-size:16px!important;color:white!important;}
    html body .avle-toolbar .avle-content{padding:12px!important;display:grid!important;gap:10px!important;}
    html body .avle-toolbar p{margin:0!important;font-size:13px!important;color:#4e6876!important;line-height:1.4!important;}
    html body .avle-toolbar label{display:block!important;font-size:12px!important;font-weight:700!important;color:#254b5f!important;}
    html body .avle-toolbar select,html body .avle-toolbar input[type=number]{display:block!important;width:100%!important;min-width:0!important;min-height:36px!important;height:36px!important;margin:4px 0 0!important;padding:6px 8px!important;border:1px solid #a8c7d3!important;border-radius:7px!important;background:white!important;color:#12374c!important;font-size:14px!important;box-shadow:none!important;}
    html body .avle-toolbar .avle-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;}
    html body .avle-toolbar .avle-actions{display:flex!important;flex-wrap:wrap!important;gap:6px!important;}
    html body .avle-toolbar button,html body .avle-entry{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-width:0!important;min-height:35px!important;height:auto!important;padding:7px 10px!important;border:1px solid #99bdcf!important;border-radius:8px!important;background:#e7f1f7!important;color:#19465b!important;font-size:13px!important;font-weight:700!important;line-height:1.25!important;cursor:pointer!important;white-space:normal!important;box-shadow:none!important;margin:0!important;}
    html body .avle-toolbar button:disabled{opacity:.45!important;cursor:default!important;}
    html body .avle-toolbar button[data-action=save]{flex:1!important;background:#067f82!important;border-color:#067f82!important;color:white!important;}
    html body .avle-toolbar button[data-action=cancel]{flex:1!important;}
    html body .avle-toolbar button:focus-visible,html body .avle-toolbar input:focus-visible,html body .avle-toolbar select:focus-visible{outline:3px solid #e8a523!important;outline-offset:2px!important;}
    html body .avle-toolbar header button{color:white!important;background:#ffffff18!important;border-color:#ffffff55!important;min-height:28px!important;padding:3px 8px!important;}
    html body .avle-toolbar .avle-check{display:flex!important;align-items:center!important;gap:7px!important;}
    html body .avle-toolbar input[type=checkbox]{width:16px!important;height:16px!important;margin:0!important;accent-color:#087f8c!important;}
    html body .avle-status{min-height:34px!important;padding:8px!important;background:#e4f3f4!important;border-radius:8px!important;font-size:12px!important;color:#235666!important;}
    html body .avle-status[data-error=true]{color:#9a2431!important;background:#ffedf0!important;}
    html body .avle-outline{position:fixed!important;z-index:2147483646!important;pointer-events:none!important;box-sizing:border-box!important;border:2px solid #0ab3cb!important;background:#17bad014!important;margin:0!important;padding:0!important;transform:none!important;translate:none!important;box-shadow:0 0 0 1px #fff!important;}
    html body .avle-outline[hidden]{display:none!important;}
    html body .avle-handle{position:absolute!important;display:block!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;padding:0!important;margin:0!important;background:#fff!important;border:2px solid #008da9!important;border-radius:3px!important;pointer-events:auto!important;touch-action:none!important;box-shadow:0 1px 5px #001b4933!important;}
    html body .avle-handle[data-dir=nw]{left:-8px!important;top:-8px!important;cursor:nwse-resize!important;}
    html body .avle-handle[data-dir=n]{left:calc(50% - 7px)!important;top:-8px!important;cursor:ns-resize!important;}
    html body .avle-handle[data-dir=ne]{right:-8px!important;top:-8px!important;cursor:nesw-resize!important;}
    html body .avle-handle[data-dir=e]{right:-8px!important;top:calc(50% - 7px)!important;cursor:ew-resize!important;}
    html body .avle-handle[data-dir=se]{right:-8px!important;bottom:-8px!important;cursor:nwse-resize!important;}
    html body .avle-handle[data-dir=s]{left:calc(50% - 7px)!important;bottom:-8px!important;cursor:ns-resize!important;}
    html body .avle-handle[data-dir=sw]{left:-8px!important;bottom:-8px!important;cursor:nesw-resize!important;}
    html body .avle-handle[data-dir=w]{left:-8px!important;top:calc(50% - 7px)!important;cursor:ew-resize!important;}
    html body.avle-editing1580,html body.avle-editing1580 *{animation-play-state:paused!important;transition:none!important;}
    html body.avle-editing1580 :is(#pause,#pauseOverlay,.pause-overlay){visibility:hidden!important;pointer-events:none!important;}
    html body.avle-editing1580 :is(button,img,input,select,.side,.combatant,.guardian-card,.qa,.question-area,.question-box,.active-student){cursor:move!important;}
    html body.avle-editing1580{user-select:none!important;}
    html body .avle-settings-row{display:block!important;margin:14px 0!important;padding:14px!important;border:1px solid #a8cad4!important;border-radius:12px!important;background:#edf7fa!important;color:#194459!important;text-align:left!important;font-family:'Segoe UI',Arial,sans-serif!important;}
    html body .avle-settings-row strong{display:block!important;font-size:17px!important;color:#194459!important;}
    html body .avle-settings-row p{font-size:13px!important;color:#486a79!important;line-height:1.4!important;margin:6px 0 10px!important;}
  `;
  const CANDIDATES = [
    '#fullscreen-wrapper', '.battle-panel', '.battlePanel', '.panel', '.wrap', '.arena',
    '#blueSide', '#redSide', '.combatant', '.guardian-card', '.active-student', '.boss',
    '.player-card', '.t-player-card', '.team-hud', '.pilot-chip', '.teamBox', '.team-box',
    '.fighters', '.fighter', '.battle-grid', '.boss-stage', '.boss-head', '.monster', '.versus',
    '.av-match-heading1567', '#mqGrandFinalBanner', '#turn', '#turnTitle', '#turnBanner',
    '.qa', '.qa-panel', '.question-area', '.question-box', '#question', '#questionText',
    '#questionPrompt', '#display', '#equation', '#roles', '.question-text',
    '.answers', '.answer-row', '.choices', '.difficulty-grid', '.skills-panel',
    '.hud', '.hudBox', '.hud-box', '.hpShell', '.hp-shell', '.hp-track', '.hpText', '.hp-text',
    '.timerRow', '.timer-shell', '.timerShell', '.timer-bar-wrap', '.timer',
    '.name', '.combatant-name', '.bench', '.reward-strip', '.av-battle-stats1567',
    '.av-battle-vs1567', '.av-vs-stack1577', '#battleMsg', '#message', '.participants',
    'button', 'input:not([type=hidden])', 'select', 'textarea', 'img',
    'h1', 'h2', 'h3', '.boss-title', '.boss-points', '.turn-title', 'canvas', 'svg', 'div[id]', 'span[id]'
  ].join(',');
  const CARDS = '#blueSide,#redSide,.combatant,.guardian-card,.active-student,.player-card,.t-player-card,.team-hud,.pilot-chip,.teamBox';
  const PROPERTIES = ['translate','width','height','min-width','max-width','min-height','max-height','box-sizing','flex-basis','flex-shrink','overflow'];
  const NAMES = {
    'fullscreen-wrapper':'Game area', blueSide:'Blue player card', redSide:'Red player card',
    blueGuardian:'Blue Guardian card',redGuardian:'Red Guardian card',buddyCombatant:'Your character card',
    enemyCombatant:'Enemy card', arena:'Battle arena', question:'Question text',questionText:'Question text',
    questionPrompt:'Question text',display:'Question illustration',equation:'Question illustration',answers:'Answer buttons',
    bluePhoto:'Blue player photo',redPhoto:'Red player photo',mqGrandFinalBanner:'Grand finals banner',
    turn:'Turn badge', turnTitle:'Turn title',turnBanner:'Turn banner',studentPhoto:'Player photo'
  };
  function installStyle(doc) {
    if(doc.getElementById('avle-style1580'))return;
    const style=doc.createElement('style');style.id='avle-style1580';style.textContent=CSS_TEXT;doc.head.append(style);
  }
  function loadAll(){try{const v=JSON.parse(storage.getItem(STORAGE_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(_){return {}}}
  function sanitize(value){
    const out={fullWidth:value?.fullWidth===true,items:{}};
    for(const [selector,v]of Object.entries(value?.items||{}).slice(0,500)){
      if(!selector||selector.length>1200||!v||typeof v!=='object')continue;
      const item={dx:clamp(finite(v.dx),-3,3),dy:clamp(finite(v.dy),-10,10)};
      if(Number.isFinite(v.w))item.w=clamp(v.w,.008,2);
      if(Number.isFinite(v.h))item.h=clamp(v.h,.008,10);
      out.items[selector]=item;
    }
    return out;
  }
  class LayoutEditor {
    constructor(doc,mode){
      this.doc=doc;this.win=doc.defaultView;this.mode=mode;this.base=new Map();this.overflowBase=new Map();
      this.active=false;this.screen='';this.layout={fullWidth:false,items:{}};this.raf=0;this.drag=null;this.selection=null;
      installStyle(doc);
      this.observer=new this.win.MutationObserver(()=>this.schedule());
      this.observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
      this.win.addEventListener('resize',()=>{if(this.active){this.positionToolbar();this.updateOutline()}this.schedule()});
      this.win.addEventListener('scroll',()=>this.updateOutline(),true);
      this.win.addEventListener('pagehide',()=>{this.finish(false)});
      doc.addEventListener('fullscreenchange',()=>{if(this.active){(doc.fullscreenElement||doc.body).append(this.toolbar,this.outline);this.positionToolbar()}this.addEntries()});
      this.schedule();
    }
    currentScreen(){
      const el=this.doc.querySelector('.screen.active,section.active,#battleScreen.active');
      return el?.id||'game';
    }
    key(){return this.mode+':'+this.screen}
    visible(el){
      if(!el||!el.isConnected||el.closest('.avle-ui,.avle-settings-row,.avle-frame-entry,dialog,[role=dialog],#pause,#pauseOverlay'))return false;
      // Resize a bar's shell; its live fill must keep representing HP or time.
      if(el.matches('#blueHp,#redHp,#hpFill,#buddyHpBar,#enemyHpBar,#timerBar,.hp,.hp-bar,.hp-fill,.timerBar,.timer-bar'))return false;
      const r=el.getBoundingClientRect(),s=this.win.getComputedStyle(el);
      return r.width>=8&&r.height>=8&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&!!el.getClientRects().length;
    }
    candidates(){return [...this.doc.querySelectorAll(CANDIDATES)].filter(el=>this.visible(el))}
    selector(el){
      const esc=this.win.CSS.escape;
      if(el.id&&this.doc.querySelectorAll('#'+esc(el.id)).length===1)return '#'+esc(el.id);
      if(el.matches('.t-player-card[data-student-id]'))return '.t-player-card[data-student-id="'+esc(el.dataset.studentId)+'"]';
      const parts=[];let node=el;
      while(node&&node!==this.doc.body){
        if(node.id){parts.unshift('#'+esc(node.id));break}
        const siblings=[...node.parentElement.children].filter(n=>n.tagName===node.tagName&&!n.classList.contains('avle-ui'));
        parts.unshift(node.tagName.toLowerCase()+':nth-of-type('+(siblings.indexOf(node)+1)+')');node=node.parentElement;
      }
      return parts.join(' > ');
    }
    name(el){
      if(NAMES[el.id])return NAMES[el.id];
      if(el.matches('.qa,.qa-panel,.question-area,.question-box'))return 'Question box';
      if(el.matches('.hpShell,.hp-shell,.hp-track'))return 'HP bar';
      if(el.matches('.photo,img'))return (el.alt||el.id||'Image').replace(/([a-z])([A-Z])/g,'$1 $2').slice(0,50);
      if(el.matches('button'))return 'Button · '+(el.textContent.trim().replace(/\s+/g,' ').slice(0,40)||el.id||'Action');
      if(el.matches(CARDS))return 'Player card · '+(el.querySelector('.name,strong,b')?.textContent.trim().slice(0,28)||el.id||'Player');
      return (el.id||el.classList[0]||el.tagName.toLowerCase()).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ').slice(0,55);
    }
    remember(el){
      if(!this.base.has(el))this.base.set(el,Object.fromEntries(PROPERTIES.map(p=>[p,[el.style.getPropertyValue(p),el.style.getPropertyPriority(p)]])));
    }
    restore(el,values){for(const[p,[v,priority]]of Object.entries(values)){if(v)el.style.setProperty(p,v,priority);else el.style.removeProperty(p)}}
    clearApplied(){
      for(const[el,v]of this.base)this.restore(el,v);this.base.clear();
      for(const[el,v]of this.overflowBase)this.restore(el,v);this.overflowBase.clear();
    }
    apply(){
      this.clearApplied();
      if(this.layout.fullWidth){
        const root=this.doc.getElementById(this.screen)||this.doc.querySelector('.screen.active')||this.doc.body;
        const panel=root.querySelector('#fullscreen-wrapper,.battle-panel,.battlePanel,.panel,.wrap')||root;
        this.remember(panel);
        panel.style.setProperty('width','calc(100vw - 20px)','important');panel.style.setProperty('max-width','none','important');
        panel.style.setProperty('box-sizing','border-box','important');
      }
      for(const[selector,item]of Object.entries(this.layout.items)){
        let el;try{el=this.doc.querySelector(selector)}catch(_){continue}
        if(!el||el.closest('.avle-ui'))continue;
        this.remember(el);
        el.style.setProperty('translate',item.dx*100+'vw '+item.dy*100+'vh','important');
        el.style.setProperty('box-sizing','border-box','important');
        if(item.w!==undefined){for(const[p,v]of [['width',item.w*100+'vw'],['min-width','0'],['max-width','none'],['flex-basis','auto'],['flex-shrink','0']])el.style.setProperty(p,v,'important')}
        if(item.h!==undefined){for(const[p,v]of [['height',item.h*100+'vh'],['min-height','0'],['max-height','none']])el.style.setProperty(p,v,'important')}
        for(let parent=el.parentElement;parent&&parent!==this.doc.body;parent=parent.parentElement){
          if(!this.overflowBase.has(parent))this.overflowBase.set(parent,{overflow:[parent.style.getPropertyValue('overflow'),parent.style.getPropertyPriority('overflow')]});
          parent.style.setProperty('overflow','visible','important');
        }
      }
      this.updateOutline();
    }
    schedule(){
      if(this.raf)return;
      this.raf=this.win.requestAnimationFrame(()=>{this.raf=0;
        const next=this.currentScreen();
        if(next!==this.screen){if(this.active)this.finish(false);this.screen=next;this.layout=sanitize(loadAll()[this.key()])}
        this.apply();this.addEntries();if(this.active)this.refreshList();
      });
    }
    addEntries(){
      if(this.doc.fullscreenElement){
        for(const bar of this.doc.querySelectorAll('#top-stats-bar .actions,#top-stats-bar .hud-actions,.battle-center-hud,.boss-head')){
          if(bar.querySelector('.avle-frame-entry'))continue;
          const button=this.doc.createElement('button');button.type='button';button.className='avle-entry avle-frame-entry';button.textContent='✥ LAYOUT';button.addEventListener('click',()=>this.start());bar.append(button);
        }
      }else this.doc.querySelectorAll('.avle-frame-entry').forEach(button=>button.remove());
      for(const host of this.doc.querySelectorAll('#avtdLocalControls1557')){
        if(host.querySelector('.avle-entry'))continue;
        const button=this.doc.createElement('button');button.type='button';button.className='avle-entry';button.textContent='✥ EDIT LAYOUT · move & resize';
        button.addEventListener('click',()=>{const dialog=host.closest('dialog');dialog?.querySelector('[data-cancel]')?.click();this.start()});host.append(button);
      }
    }
    pause(){
      const w=this.win;
      if(w.AVLayoutSession1580){w.AVLayoutSession1580.begin();return()=>w.AVLayoutSession1580.end()}
      if(w.AVTournamentDisplay1557){w.AVTournamentDisplay1557.begin();return()=>w.AVTournamentDisplay1557.end()}
      const active=this.doc.querySelector('#battle.active,#game.active');
      const wasPaused=!!this.doc.querySelector('#pause.show,#pauseOverlay.show');
      if(active&&!wasPaused&&typeof w.togglePause==='function'){
        w.togglePause();return()=>{if(active.classList.contains('active')&&this.doc.querySelector('#pause.show,#pauseOverlay.show'))w.togglePause()};
      }
      return()=>{};
    }
    start(){
      if(this.active)return;
      this.screen=this.currentScreen();this.layout=sanitize(loadAll()[this.key()]);this.before=copy(this.layout);this.undoStack=[];this.redoStack=[];
      this.restoreFocus=this.doc.activeElement;this.release=this.pause();this.active=true;
      this.doc.body.classList.add('avle-editing1580');this.mount();this.apply();this.refreshList();
      const first=this.candidates().find(x=>x.id==='blueSide')||this.candidates().find(x=>x.matches('.qa,.question-area,.question-box'))||this.candidates()[0];
      if(first)this.select(first);this.status('Grab a box to move it. Drag a corner or edge to resize.');
      this.capture=e=>this.onCapture(e);
      for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click','dblclick','contextmenu','keydown','keyup','dragstart'])this.doc.addEventListener(type,this.capture,true);
      this.toolbar.querySelector('select').focus({preventScroll:true});
    }
    mount(){
      const d=this.doc;
      this.toolbar=d.createElement('aside');this.toolbar.className='avle-ui avle-toolbar';this.toolbar.setAttribute('aria-label','Game layout editor');
      this.toolbar.innerHTML=`<header><strong>✥ Edit layout</strong><button type="button" data-action="minimize" aria-label="Collapse layout editor">−</button></header><div class="avle-content"><p>Move player cards, boxes, pictures and buttons. Changes apply to this screen.</p><label>Selected object<select aria-label="Selected object"></select></label><label class="avle-check"><input type="checkbox" data-detail> Select small parts inside player cards</label><div class="avle-grid"><label>Left (X)<input type="number" data-field="x" step="1" aria-label="Left position"></label><label>Top (Y)<input type="number" data-field="y" step="1" aria-label="Top position"></label><label>Width<input type="number" data-field="w" min="16" step="1" aria-label="Object width"></label><label>Height<input type="number" data-field="h" min="16" step="1" aria-label="Object height"></label></div><p>Values are in pixels. Arrow keys move; Shift + arrows move 10 pixels.</p><label class="avle-check"><input type="checkbox" data-wide> Use full width · reduce side gaps</label><div class="avle-actions"><button type="button" data-action="parent">Select parent</button><button type="button" data-action="reset">Reset object</button><button type="button" data-action="undo">Undo</button><button type="button" data-action="redo">Redo</button><button type="button" data-action="resetAll">Reset this screen</button></div><div class="avle-status" role="status" aria-live="polite"></div><div class="avle-actions"><button type="button" data-action="save">Save layout</button><button type="button" data-action="cancel">Cancel</button></div></div>`;
      this.outline=d.createElement('div');this.outline.className='avle-ui avle-outline';this.outline.hidden=true;
      for(const dir of ['nw','n','ne','e','se','s','sw','w']){const h=d.createElement('button');h.type='button';h.className='avle-handle';h.dataset.dir=dir;h.setAttribute('aria-label','Resize '+dir);this.outline.append(h)}
      (d.fullscreenElement||d.body).append(this.toolbar,this.outline);
      this.toolbar.style.setProperty('left',Math.max(8,this.win.innerWidth-326)+'px','important');this.toolbar.style.setProperty('top','16px','important');
      this.toolbar.querySelector('select').onchange=e=>{try{this.select(d.querySelector(e.target.value))}catch(_){}};
      this.toolbar.querySelector('[data-wide]').checked=this.layout.fullWidth;
      this.toolbar.querySelector('[data-wide]').onchange=e=>{this.checkpoint();this.layout.fullWidth=e.target.checked;this.apply();this.status('Preview updated. Save layout to keep it.')};
      this.toolbar.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action)this.action(action)});
      this.toolbar.addEventListener('change',e=>{const field=e.target.dataset.field;if(field)this.numeric(field,Number(e.target.value))});
      for(const type of ['keydown','keyup'])this.toolbar.addEventListener(type,e=>e.stopPropagation());
      this.toolbar.querySelector('header').addEventListener('pointerdown',e=>{
        if(e.target.closest('button'))return;e.preventDefault();const r=this.toolbar.getBoundingClientRect();
        this.drag={toolbar:true,pointer:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};this.toolbar.setPointerCapture(e.pointerId);
      });
      this.toolbar.addEventListener('pointermove',e=>{if(!this.drag?.toolbar)return;const g=this.drag;this.toolbar.style.setProperty('left',clamp(g.left+e.clientX-g.x,0,Math.max(0,this.win.innerWidth-this.toolbar.offsetWidth))+'px','important');this.toolbar.style.setProperty('top',clamp(g.top+e.clientY-g.y,0,Math.max(0,this.win.innerHeight-this.toolbar.offsetHeight))+'px','important')});
      const stop=()=>{if(this.drag?.toolbar)this.drag=null};this.toolbar.addEventListener('pointerup',stop);this.toolbar.addEventListener('pointercancel',stop);
    }
    positionToolbar(){if(!this.toolbar)return;const r=this.toolbar.getBoundingClientRect();this.toolbar.style.setProperty('left',clamp(r.left,0,Math.max(0,this.win.innerWidth-r.width))+'px','important');this.toolbar.style.setProperty('top',clamp(r.top,0,Math.max(0,this.win.innerHeight-r.height))+'px','important')}
    refreshList(){
      if(!this.toolbar)return;
      const list=this.candidates(),signature=list.map(x=>this.selector(x)).join('|');
      if(signature===this.listSignature)return;this.listSignature=signature;
      const select=this.toolbar.querySelector('select'),value=this.selection?this.selector(this.selection):select.value;select.replaceChildren();
      for(const el of list){const option=this.doc.createElement('option');option.value=this.selector(el);option.textContent=this.name(el);select.append(option)}
      if([...select.options].some(x=>x.value===value))select.value=value;
    }
    select(el){if(!el||!this.visible(el))return;this.selection=el;this.refreshList();this.toolbar.querySelector('select').value=this.selector(el);this.updateOutline();this.status(this.name(el)+' selected. Drag it or use the controls.')}
    status(message,error=false){const node=this.toolbar?.querySelector('.avle-status');if(node){node.textContent=message;node.dataset.error=String(error)}}
    updateOutline(){
      if(!this.active||!this.outline)return;
      if(!this.selection?.isConnected||!this.visible(this.selection)){this.outline.hidden=true;return}
      const r=this.selection.getBoundingClientRect();this.outline.hidden=false;
      for(const[p,v]of Object.entries({left:r.left,top:r.top,width:r.width,height:r.height}))this.outline.style.setProperty(p,v+'px','important');
      const values={x:r.left+this.win.scrollX,y:r.top+this.win.scrollY,w:r.width,h:r.height};
      for(const field of this.toolbar.querySelectorAll('[data-field]'))if(this.doc.activeElement!==field)field.value=Math.round(values[field.dataset.field]);
      this.toolbar.querySelector('[data-action=undo]').disabled=!this.undoStack?.length;this.toolbar.querySelector('[data-action=redo]').disabled=!this.redoStack?.length;
    }
    checkpoint(){this.undoStack.push(copy(this.layout));if(this.undoStack.length>80)this.undoStack.shift();this.redoStack=[]}
    entry(){const selector=this.selector(this.selection);return this.layout.items[selector]||(this.layout.items[selector]={dx:0,dy:0})}
    anchor(left,top){
      if(!this.selection)return;
      const r=this.selection.getBoundingClientRect(),item=this.entry();
      const dx=left-r.left,dy=top-r.top;
      if(Math.abs(dx)>.2||Math.abs(dy)>.2){item.dx+=dx/this.win.innerWidth;item.dy+=dy/this.win.innerHeight;this.apply()}
    }
    numeric(field,value){
      if(!this.selection||!Number.isFinite(value))return;this.checkpoint();const r=this.selection.getBoundingClientRect(),item=this.entry();
      if(field==='x')item.dx+=(value-r.left-this.win.scrollX)/this.win.innerWidth;
      if(field==='y')item.dy+=(value-r.top-this.win.scrollY)/this.win.innerHeight;
      if(field==='w')item.w=clamp(value,16,this.win.innerWidth*2)/this.win.innerWidth;
      if(field==='h')item.h=clamp(value,16,this.win.innerHeight*10)/this.win.innerHeight;
      this.apply();
      this.anchor(field==='x'?value-this.win.scrollX:r.left,field==='y'?value-this.win.scrollY:r.top);
      this.status('Preview updated. Save layout to keep it.');
    }
    onCapture(e){
      if(!this.active)return;
      const toolbar=e.target.closest?.('.avle-toolbar'),handle=e.target.closest?.('.avle-handle');
      if(toolbar)return;
      if((e.type==='pointermove'||e.type==='pointerup'||e.type==='pointercancel')&&this.drag?.toolbar)return;
      if(e.type==='keydown'||e.type==='keyup'){
        e.stopImmediatePropagation();
        if(e.type==='keyup')return;
        if(e.key==='Escape'){e.preventDefault();this.finish(false);return}
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();this.action(e.shiftKey?'redo':'undo');return}
        if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&this.selection){
          e.preventDefault();const h=handle?.dataset.dir;
          if(h){const r=this.selection.getBoundingClientRect();const step=e.shiftKey?10:1;this.numeric(e.key==='ArrowLeft'||e.key==='ArrowRight'?'w':'h',(e.key==='ArrowLeft'||e.key==='ArrowRight'?r.width:r.height)+(['ArrowRight','ArrowDown'].includes(e.key)?step:-step))}
          else{this.checkpoint();const item=this.entry(),step=e.shiftKey?10:1;item.dx+=({'ArrowLeft':-step,'ArrowRight':step}[e.key]||0)/this.win.innerWidth;item.dy+=({'ArrowUp':-step,'ArrowDown':step}[e.key]||0)/this.win.innerHeight;this.apply()}
        }
        return;
      }
      if(e.type==='pointermove'&&this.drag&&!this.drag.toolbar){
        e.preventDefault();e.stopImmediatePropagation();this.move(e);return;
      }
      if(e.type==='pointerup'||e.type==='pointercancel'){
        if(this.drag&&!this.drag.toolbar){e.preventDefault();e.stopImmediatePropagation();try{this.doc.documentElement.releasePointerCapture(e.pointerId)}catch(_){}this.drag=null;this.refreshList();this.updateOutline()}return;
      }
      if(e.type!=='pointerdown'){if(['click','dblclick','contextmenu','dragstart'].includes(e.type)){e.preventDefault();e.stopImmediatePropagation()}return}
      if(e.button!==0)return;
      e.preventDefault();e.stopImmediatePropagation();
      let target;
      if(handle)target=this.selection;
      else{
        target=e.target.closest?.(CANDIDATES);
        if(!this.toolbar.querySelector('[data-detail]').checked){const card=e.target.closest?.(CARDS);if(card)target=card}
      }
      if(!target||!this.visible(target))return;
      this.select(target);this.checkpoint();const r=target.getBoundingClientRect();
      this.drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,rect:r,initial:copy(this.entry()),dir:handle?.dataset.dir||'',moved:false};
      this.doc.activeElement?.blur?.();this.doc.documentElement.setPointerCapture(e.pointerId);
    }
    move(e){
      const g=this.drag;if(e.pointerId!==g.pointer)return;
      let dx=e.clientX-g.x,dy=e.clientY-g.y;if(e.shiftKey){dx=Math.round(dx/10)*10;dy=Math.round(dy/10)*10}
      const item=this.entry(),vw=this.win.innerWidth,vh=this.win.innerHeight,r=g.rect;
      if(!g.dir){
        dx=clamp(dx,-r.left,Math.max(0,vw-r.width)-r.left);
        dy=Math.max(-r.top-this.win.scrollY,dy);
        item.dx=g.initial.dx+dx/vw;item.dy=g.initial.dy+dy/vh;
      }else{
        if(g.dir.includes('e'))item.w=clamp(r.width+dx,16,vw*2)/vw;
        if(g.dir.includes('s'))item.h=clamp(r.height+dy,16,vh*10)/vh;
        if(g.dir.includes('w')){const width=clamp(r.width-dx,16,vw*2);item.w=width/vw;item.dx=g.initial.dx+(r.width-width)/vw}
        if(g.dir.includes('n')){const height=clamp(r.height-dy,16,vh*10);item.h=height/vh;item.dy=g.initial.dy+(r.height-height)/vh}
      }
      this.apply();
      this.anchor(r.left+(g.dir.includes('w')?r.width-item.w*vw:!g.dir?dx:0),r.top+(g.dir.includes('n')?r.height-item.h*vh:!g.dir?dy:0));
      g.moved=true;
    }
    action(action){
      if(action==='save')return this.finish(true);
      if(action==='cancel')return this.finish(false);
      if(action==='minimize'){const content=this.toolbar.querySelector('.avle-content');content.hidden=!content.hidden;content.style.setProperty('display',content.hidden?'none':'grid','important');this.toolbar.querySelector('[data-action=minimize]').textContent=content.hidden?'+':'−';this.positionToolbar();return}
      if(action==='parent'){const p=this.selection?.parentElement?.closest(CANDIDATES);if(p)this.select(p);return}
      if(action==='undo'&&this.undoStack.length){this.redoStack.push(copy(this.layout));this.layout=this.undoStack.pop()}
      if(action==='redo'&&this.redoStack.length){this.undoStack.push(copy(this.layout));this.layout=this.redoStack.pop()}
      if(action==='reset'&&this.selection){this.checkpoint();delete this.layout.items[this.selector(this.selection)]}
      if(action==='resetAll'){this.checkpoint();this.layout={fullWidth:false,items:{}}}
      this.toolbar.querySelector('[data-wide]').checked=this.layout.fullWidth;this.apply();this.status('Preview updated. Save layout to keep it.');
    }
    finish(save){
      if(!this.active)return true;
      if(save){
        try{const data=loadAll();data[this.key()]=sanitize(this.layout);const text=JSON.stringify(data);storage.setItem(STORAGE_KEY,text);if(storage.getItem(STORAGE_KEY)!==text)throw Error('Storage unavailable')}
        catch(_){this.status('Could not save. Your preview is still open. Try again or Cancel.',true);return false}
      }else this.layout=copy(this.before);
      this.active=false;
      if(this.drag&&!this.drag.toolbar)try{this.doc.documentElement.releasePointerCapture(this.drag.pointer)}catch(_){}
      this.drag=null;this.doc.body.classList.remove('avle-editing1580');
      for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click','dblclick','contextmenu','keydown','keyup','dragstart'])this.doc.removeEventListener(type,this.capture,true);
      this.toolbar?.remove();this.outline?.remove();this.toolbar=null;this.outline=null;this.selection=null;this.listSignature='';
      this.apply();this.release?.();this.release=null;this.restoreFocus?.focus?.({preventScroll:true});return true;
    }
  }
  function frameEngine(){
    const frame=document.getElementById('gameFrame');if(!frame?.contentDocument?.body||document.getElementById('gameShell')?.style.display==='none')return null;
    let engine=ENGINES.get(frame.contentDocument);
    if(!engine){engine=new LayoutEditor(frame.contentDocument,frame.avLayoutMode1580||'multiplayer');ENGINES.set(frame.contentDocument,engine);frame.contentWindow.AVLayoutEditor1580=engine}
    return engine;
  }
  function open(){
    const engine=frameEngine();
    if(!engine){const notice=document.getElementById('avSettingsNotice');if(notice){notice.hidden=false;notice.textContent='Start a game first. Then choose Display → Edit layout, or use the Layout button in the game toolbar.'}else window.alert('Start a game, then choose Display → Edit layout.');return false}
    window.closeDisplaySettings?.();document.getElementById('avHomeMoreDialog')?.close?.();engine.start();return true;
  }
  function addShellEntries(){
    const card=document.querySelector('#displaySettingsOverlay .display-settings-card');
    if(card&&!card.querySelector('.avle-settings-row')){
      const section=document.createElement('section');section.className='avle-settings-row';section.innerHTML='<strong>✥ Move & resize game objects</strong><p>Drag player cards, question boxes, answer buttons and pictures. Resize with handles or set exact width and height. Each screen has its own saved layout.</p><button type="button" class="avle-entry">EDIT LAYOUT</button>';
      section.querySelector('button').onclick=open;card.querySelector('.settings-actions').before(section);
    }
    const rows=document.querySelector('#avSettings-general .av-settings-rows');
    if(rows&&!rows.querySelector('[data-avle-home]')){
      const button=document.createElement('button');button.type='button';button.dataset.avleHome='';button.className='av-settings-action';button.innerHTML='<span class="av-row-icon" aria-hidden="true">✥</span><span class="av-row-copy"><strong>Move & Resize Objects</strong><small>Player cards, boxes and buttons · open a game to edit its layout</small></span><span class="av-row-arrow" aria-hidden="true">›</span>';button.onclick=open;rows.insertBefore(button,document.getElementById('avPortalSettings'));
    }
    const display=document.getElementById('displayBtn');
    if(display&&!document.getElementById('avleLauncher1580')){const button=document.createElement('button');button.type='button';button.id='avleLauncher1580';button.textContent='✥ LAYOUT';button.title='Move and resize game objects';button.onclick=open;display.after(button)}
  }
  function boot(){
    installStyle(document);addShellEntries();
    const launch=window.launchGame;
    if(typeof launch==='function')window.launchGame=function(mode){ENGINES.get(document.getElementById('gameFrame')?.contentDocument)?.finish(false);document.getElementById('gameFrame').avLayoutMode1580=mode;return launch.apply(this,arguments)};
    const frame=document.getElementById('gameFrame');frame?.addEventListener('load',()=>{frameEngine();addShellEntries()});
    new MutationObserver(()=>addShellEntries()).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('storage',()=>{const e=frameEngine();if(e&&!e.active){e.layout=sanitize(loadAll()[e.key()]);e.schedule()}});
    window.AVLayoutEditor1580=Object.freeze({open,get:frameEngine,storageKey:STORAGE_KEY});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
