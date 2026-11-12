/* Offline typography controls, scoped to Pakainin ang mga Alaga. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), store = window.ARAL_STORAGE;
  const KEY = 'avPetFeedingFontsV1';
  const families = {
    modern: {name:'ARALVERSE Modern', css:"'AV Modern UI','Segoe UI',sans-serif"},
    century: {name:'Century Gothic', css:"'Century Gothic','AV Modern UI',sans-serif"},
    arial: {name:'Arial', css:'Arial,sans-serif'},
    verdana: {name:'Verdana', css:'Verdana,sans-serif'},
    tahoma: {name:'Tahoma', css:'Tahoma,sans-serif'},
    comic: {name:'Comic Sans MS', css:"'Comic Sans MS','AV Modern UI',sans-serif"},
    trebuchet: {name:'Trebuchet MS', css:"'Trebuchet MS','AV Modern UI',sans-serif"},
  };
  const defaults = {family:'modern', title:32, question:36, answer:28, label:18, weight:800, color:'#093f43'};
  const bounds = {title:[18,64], question:[20,72], answer:[16,56], label:[12,30]};
  function normalize(input) {
    const data = input && typeof input === 'object' ? input : {}, result = {...defaults};
    if (Object.hasOwn(families, data.family)) result.family = data.family;
    for (const [key,[min,max]] of Object.entries(bounds)) {
      const value = Number(data[key]);
      if (Number.isFinite(value)) result[key] = Math.round(Math.max(min,Math.min(max,value)));
    }
    if ([400,600,800].includes(Number(data.weight))) result.weight = Number(data.weight);
    if (/^#[0-9a-f]{6}$/i.test(data.color)) result.color = data.color;
    return result;
  }
  let saved;
  try { saved = normalize(JSON.parse(store.getItem(KEY))); } catch (_) { saved = {...defaults}; }
  const dialog = $('petFontDialog'); let committed = false, saving = false;
  function apply(data) {
    const root = document.documentElement.style;
    root.setProperty('--pet-font', families[data.family].css);
    for (const key of Object.keys(bounds)) root.setProperty('--pet-'+key+'-size', data[key]+'px');
    root.setProperty('--pet-text-weight', String(data.weight));root.setProperty('--pet-text-color', data.color);
  }
  function fill(data) {
    for (const key of Object.keys(defaults)) $('petFont-'+key).value = String(data[key]);
    apply(data);
  }
  function readForm() { return normalize(Object.fromEntries(Object.keys(defaults).map(key=>[key,$('petFont-'+key).value]))); }
  for (const [key,family] of Object.entries(families)) {
    const option=document.createElement('option');option.value=key;option.textContent=family.name;$('petFont-family').append(option);
  }
  for (const button of document.querySelectorAll('[data-pet-fonts]')) button.onclick = () => {
    if (dialog.open) return;
    committed=false;fill(saved);$('petFontStatus').textContent='';
    window.AVPetFontSession1583?.begin();dialog.showModal();$('petFont-family').focus();
  };
  $('petFontForm').addEventListener('input',()=>apply(readForm()));
  $('petFontReset').onclick=()=>fill(defaults);
  $('petFontCancel').onclick=()=>{if(!saving)dialog.close()};
  dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault()});
  dialog.addEventListener('close',()=>{if(!committed)apply(saved);window.AVPetFontSession1583?.end()});
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  dialog.addEventListener('keyup',event=>event.stopPropagation());
  $('petFontForm').onsubmit=async event=>{
    event.preventDefault();if(saving||!event.target.reportValidity())return;
    saving=true;const previous=store.getItem(KEY), next=readForm(), text=JSON.stringify(next);
    for(const button of dialog.querySelectorAll('button'))button.disabled=true;
    try {
      store.setItem(KEY,text);if(store.getItem(KEY)!==text)throw Error('Hindi na-save ang font.');
      const result = await window.parent.mathAPangDesktop?.saveNow?.();
      if (result?.ok === false) throw Error(result.error || 'Hindi na-save ang font sa device.');
      saved=next;apply(saved);committed=true;dialog.close();
    }catch(error){
      try{if(previous===null)store.removeItem(KEY);else store.setItem(KEY,previous)}catch(_){}
      $('petFontStatus').textContent=error.message||'Hindi na-save ang font. Subukan muli.';
    }finally{saving=false;for(const button of dialog.querySelectorAll('button'))button.disabled=false}
  };
  apply(saved);
})();
