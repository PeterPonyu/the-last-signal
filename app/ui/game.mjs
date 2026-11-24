import {CAMPAIGN,upgradeChoices} from '../../content/campaign.mjs';
import {readGuidance,saveGuidance,guidanceEnabled,completeGuidedRun,guidanceStep,campaignStep,guardState,CHAMPION_HINTS} from './guidance.mjs';
import {symbolSvg} from '../render/symbols.mjs';
import {createRun,update,requestAbility,chooseUpgrade,advanceArea,interact} from '../game/simulation.mjs';
import {JOURNEY,ENEMY_ROLES} from '../../content/journey.mjs';
import {nearbyInteraction,gatewayPrompt,objectiveText} from '../game/journey.mjs';
import {AREAS,DIFFICULTIES,COMBAT} from '../../content/game.mjs';
import {drawBattlefield} from '../render/renderer.mjs';
import {loadAssets,loadAreaAssets,INITIAL_ASSETS} from '../render/assets.mjs';
import {saveResult,readResults} from '../game/records.mjs';
import {createAudio} from '../audio/audio.mjs';
import {createFrameLoop} from './frame-loop.mjs';
import {computeView} from './viewport.mjs';
import {createControls} from './controls.mjs';
import {t,tr,language,setLanguage,detectLanguage,onLanguageChange,localiseContext} from '../i18n/index.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(id,value)=>{const element=$(id),next=String(value);if(element.textContent!==next)element.textContent=next;};
const property=(id,key,value)=>{const element=$(id);if(element[key]!==value)element[key]=value;};
const width=(id,value)=>{const element=$(id),next=`${Math.round(Math.max(0,Math.min(100,value))*1000)/1000}%`;if(element.style.width!==next)element.style.width=next;};
const withoutKey=label=>String(label).replace(/\s*·\s*F$/,'');
// "Step 2/5 · Choose a road" in the page language; the open gate (stage 5) needs no number.
const stepText=step=>step.stage<5?t('hud.stepOf',{n:step.number})+' · '+t('hud.stage'+step.stage):t('hud.stage5');
const stepList=()=>'<ol class="step-list">'+[0,1,2,3,4].map(i=>'<li>'+esc(t('hud.stage'+i))+'</li>').join('')+'</ol>';
// Key hints follow the active input: F on keyboards, LB on gamepads, none on touch.
const keyHint=label=>inputMode==='touch'?withoutKey(label):inputMode==='gamepad'?String(label).replace(/(\s·\s)F$/,'$1LB'):label;

const canvas=$('arena'),ctx=localiseContext(canvas.getContext('2d'),value=>keyHint(value)),stage=$('stage'),modal=$('modal');
const safeStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let images={},travelLoading=false,prefetchedArea=-1;
let guidance=readGuidance(safeStorage),guidanceVisible=guidanceEnabled(guidance),guideKey='',guidePinned=false,guideOpenUntil=0;
let run=null,accumulated=0,bannerUntil=0,savedMode=null,camera=null,selectedDifficulty='normal',renderElapsed=1/60;
let view=computeView(1200,680),reservedDirty=true,reserved=[],currentDialog=null,journalArea=0,returnTo=null;
const seenEnemies=new Set();
let autoPowers=true,music=false,effects=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,inputMode='desktop',stageSmall=false;
let audioStatus='';
const audioText=message=>{const key='audio.'+message,value=t(key);return value===key?message:value;};
const audio=createAudio(message=>{audioStatus=message;text('audio-status',audioText(message));});
const loop=createFrameLoop(frame);
const ABILITIES=[['slash','slash'],['dash','dash'],['pulse','pulse'],['sunbreak','sunbreak'],['solarLance','lance']];
const PAD_LABELS={slash:'A',dash:'B',pulse:'X',sunbreak:'Y',solarLance:'RB'},KEY_LABELS={slash:'J',dash:'␣',pulse:'E',sunbreak:'Q',solarLance:'R'};
const HELP_NOTES=['help.note1','help.note2','help.note3','help.note4','help.note5','help.note6','help.note7','help.note8'];
const SYMBOL_CARDS=['beacon','lantern','guide','gate','danger','hero','boss','scenery'];
const GUARD_LABELS={up:'hud.guard',enraged:'hud.enraged',exposed:'hud.exposed',down:'hud.guardDown'};

/* ---------- Language ---------- */
function applyStatic(){
  for(const element of document.querySelectorAll('[data-i18n]'))element.textContent=t(element.dataset.i18n);
  for(const element of document.querySelectorAll('[data-i18n-html]'))element.innerHTML=t(element.dataset.i18nHtml);
  for(const element of document.querySelectorAll('[data-i18n-aria]'))element.setAttribute('aria-label',t(element.dataset.i18nAria));
  document.title=t('page.title');document.querySelector('meta[name=description]')?.setAttribute('content',t('page.description'));
  for(const button of document.querySelectorAll('[data-lang]'))button.setAttribute('aria-pressed',String(button.dataset.lang===language()));
  if(audioStatus)text('audio-status',audioText(audioStatus));
  updateStartButton();updateFullscreenLabel();updateKeyLabels();
}
function chooseLanguage(next){
  if(next===language()||!setLanguage(next,safeStorage))return;
  applyStatic();guideKey='';$('route-progress').dataset.area='';
  if(modal.open&&currentDialog)currentDialog();
  if(run)render();
}
setLanguage(detectLanguage(safeStorage),null);
onLanguageChange(()=>{reservedDirty=true;});

/* ---------- Layout: the battlefield always fills the play area ---------- */
function measureView(){
  const box=stage.getBoundingClientRect();if(!box.width||!box.height)return;
  view=computeView(box.width,box.height,devicePixelRatio||1,inputMode==='touch'?1.6e6:2.6e6);
  stageSmall=box.width<760||box.height<430;reservedDirty=true;
}
function measureReserved(){
  // Page overlays that sit on top of the battlefield; the minimap avoids these corners.
  const box=stage.getBoundingClientRect(),scaleX=view.width/box.width,scaleY=view.height/box.height,list=[];
  const add=element=>{if(!element||element.hidden||element.offsetParent===null)return;const r=element.getBoundingClientRect();if(!r.width||!r.height)return;
    list.push({left:(r.left-box.left)*scaleX,top:(r.top-box.top)*scaleY,right:(r.right-box.left)*scaleX,bottom:(r.bottom-box.top)*scaleY});};
  add(document.querySelector('.vitals'));add(document.querySelector('.tally'));add($('field-guide'));add($('boss-hud'));
  for(const toast of document.querySelectorAll('.toast'))if(toast.textContent)add(toast);
  if(inputMode==='touch'&&!document.body.classList.contains('portrait')){add($('stick'));add(document.querySelector('.pad'));add($('touch-interact'));}
  reserved=list;reservedDirty=false;
  // Top corners start just below the HUD row; very small play areas get a smaller map.
  const hud=document.querySelector('.vitals').getBoundingClientRect();
  view.minimapTop=hud.height?(hud.bottom-box.top)*scaleY+12:undefined;
  view.minimapSize=box.height<300?0.7:box.height<420?0.85:1;
}
function updateOrientation(){
  const portrait=innerHeight>innerWidth;
  if(document.body.classList.contains('portrait')!==portrait){document.body.classList.toggle('portrait',portrait);reservedDirty=true;}
}
new ResizeObserver(()=>{measureView();if(run)loop.wake();}).observe(stage);
addEventListener('resize',()=>{updateOrientation();measureView();if(run)loop.wake();});
updateOrientation();

/* ---------- Controls ---------- */
function isMenuOpen(){return modal.open||!run;}
function nearestEnemyAim(range=420){
  if(!run)return null;const p=run.player;let best=null,bestDistance=range;
  for(const e of run.enemies){if(e.hp<=0||e.warning>0)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bestDistance){best=e;bestDistance=d;}}
  return best?{x:best.x-p.x,y:best.y-p.y}:null;
}
function ability(name,aim){
  if(run?.mode!=='running')return;
  if(name==='pulse'){requestAbility(run,'pulse');return;}
  const direction=aim||(name==='dash'?controls.movement():null)||controls.aim()||(inputMode!=='desktop'&&name!=='dash'?nearestEnemyAim(name==='solarLance'?COMBAT.solarLance.range:420):null);
  requestAbility(run,name,direction&&(direction.x||direction.y)?direction:null);
}
const menuFocusables=()=>{
  const container=modal.open?modal:$('landing');
  return [...container.querySelectorAll('button:not([disabled]):not([hidden]),select,input:not([type=hidden])')].filter(el=>el.offsetParent!==null&&!el.closest('[hidden]'));
};
const menu={
  move(direction){
    const active=document.activeElement;
    if(active?.tagName==='SELECT'&&['left','right'].includes(direction)){active.selectedIndex=Math.max(0,Math.min(active.options.length-1,active.selectedIndex+(direction==='right'?1:-1)));active.dispatchEvent(new Event('change',{bubbles:true}));return;}
    if(active?.type==='radio'&&['left','right'].includes(direction)){const group=[...document.querySelectorAll(`input[name="${active.name}"]`)],next=group[(group.indexOf(active)+(direction==='right'?1:group.length-1))%group.length];next.checked=true;next.focus();next.dispatchEvent(new Event('change',{bubbles:true}));return;}
    const items=menuFocusables();if(!items.length)return;
    const index=items.indexOf(active),step=['up','left'].includes(direction)?-1:1;
    items[index<0?0:(index+step+items.length)%items.length].focus();
  },
  activate(){
    const active=document.activeElement,items=menuFocusables();
    if(active&&items.includes(active)){if(active.type==='checkbox'||active.type==='radio'){active.click();}else active.click();return;}
    (modal.open?modal.querySelector('.primary'):$('start'))?.click();
  },
  back(){if(modal.open)closeDialog();}
};
const controls=createControls({touch:$('touch-controls'),stickZone:$('stick-zone'),stick:$('stick'),events:{
  isPlaying:()=>run?.mode==='running'&&!modal.open,
  isMenuOpen,
  ability:name=>ability(name),
  interact:()=>interactNearby(),
  pause:()=>pause(),
  menu,
  notice:kind=>{if(run)announce(t(kind==='gamepad'?'ann.gamepad':'ann.gamepadLost'),3);},
  mode:next=>{
    inputMode=next;measureView();reservedDirty=true;updateKeyLabels();
    if(run)loop.wake();
  }
}});
inputMode=controls.mode;
function updateKeyLabels(){
  for(const [name] of ABILITIES){const key=document.querySelector(`.ability[data-ability="${name}"] kbd`);if(key)key.textContent=inputMode==='gamepad'?PAD_LABELS[name]:name==='dash'?t('help.dash.k'):KEY_LABELS[name];}
  const interactKey=document.querySelector('#interact-button kbd');if(interactKey)interactKey.textContent=inputMode==='gamepad'?'LB':'F';
}

/* ---------- Dialogs ---------- */
function clearInput(){controls.clear();if(run)run.inputBuffer=null;}
function closeDialog(){
  if(['upgrade','area-clear','victory','defeat'].includes(run?.mode))return;
  if(returnTo&&run&&modal.open){const target=returnTo;returnTo=null;show(target);return;}
  returnTo=null;modal.close();currentDialog=null;
  if(run&&savedMode&&run.mode==='paused')run.mode=savedMode;
  savedMode=null;clearInput();accumulated=0;
  if(run?.mode==='running')canvas.focus({preventScroll:true});
  loop.wake();
}
function dialog(kicker,title,body,actions,{locked=false,wide=false}={}){
  if(['running','ending'].includes(run?.mode)){savedMode=run.mode;run.mode='paused';}
  clearInput();
  modal.classList.toggle('wide',wide);
  $('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-body').innerHTML=body;
  $('modal-actions').replaceChildren();$('close-modal').hidden=locked;
  for(const action of actions){
    const button=document.createElement('button');button.type='button';button.className=action.className||'quiet';
    if(action.html)button.innerHTML=action.html;else button.textContent=action.label;
    button.addEventListener('click',action.action);$('modal-actions').append(button);
  }
  if(!modal.open)modal.showModal();
  const first=modal.querySelector('.modal-actions .primary')||modal.querySelector('.modal-actions button');
  if(inputMode!=='touch')first?.focus({preventScroll:true});
  loop.wake();
}
function show(builder){currentDialog=builder;builder();}
function settingsMarkup(){
  return '<div class="settings">'+
    '<label class="toggle"><input id="auto-powers-setting" type="checkbox"> '+esc(t('settings.autoPowers'))+'</label>'+
    '<label class="toggle"><input id="music-setting" type="checkbox"> '+esc(t('settings.music'))+'</label>'+
    '<label class="toggle"><input id="sound-setting" type="checkbox"> '+esc(t('settings.sound'))+'</label>'+
    '<label class="toggle"><input id="effects-setting" type="checkbox"> '+esc(t('settings.reduced'))+'</label>'+
    '<label class="select">'+esc(t('settings.guidance'))+'<select id="guidance-setting"><option value="auto">'+esc(t('settings.guidance.auto'))+'</option><option value="on">'+esc(t('settings.guidance.on'))+'</option><option value="off">'+esc(t('settings.guidance.off'))+'</option></select></label>'+
    '<label class="select">'+esc(t('lang.label'))+'<select id="language-setting"><option value="en" lang="en">English</option><option value="zh" lang="zh-CN">中文</option></select></label>'+
  '</div><p id="guidance-save-note" class="fine-print"></p>';
}
function wireSettings(){
  $('auto-powers-setting').checked=autoPowers;$('auto-powers-setting').onchange=e=>{autoPowers=e.target.checked;if(run)run.autoPowers=autoPowers;};
  $('music-setting').checked=music;$('sound-setting').checked=effects;$('effects-setting').checked=reduced;
  $('music-setting').onchange=async e=>{music=await audio.setMusic(e.target.checked);if($('music-setting'))$('music-setting').checked=music;};
  $('sound-setting').onchange=async e=>{effects=await audio.setEffects(e.target.checked);if($('sound-setting'))$('sound-setting').checked=effects;audio.sound('upgrade');};
  $('effects-setting').onchange=e=>{reduced=e.target.checked;loop.wake();};
  $('guidance-setting').value=guidance.mode;$('guidance-setting').onchange=e=>setGuidanceMode(e.target.value);
  $('language-setting').value=language();$('language-setting').onchange=e=>chooseLanguage(e.target.value);
}
function setGuidanceMode(mode){
  guidance={...guidance,mode};guidanceVisible=guidanceEnabled(guidance);guideKey='';reservedDirty=true;
  const saved=saveGuidance(safeStorage,guidance);
  if($('guidance-save-note'))$('guidance-save-note').textContent=t(saved?'settings.saved':'settings.notSaved');
  if($('guidance-setting'))$('guidance-setting').value=mode;
  renderGuidance();loop.wake();
}

function showStart(){
  const previous=readResults(safeStorage).map(r=>tr(DIFFICULTIES[r.difficulty].label)+': '+t('start.maps',{areas:r.areas,total:AREAS.length})+' · '+formatTime(r.seconds)+(r.won?' · '+t('start.complete'):'')).join(' / ');
  dialog(t('start.kicker'),t('start.title'),
    '<p>'+esc(t('start.goal'))+'</p>'+stepList()+
    '<fieldset class="difficulty-options">'+Object.entries(DIFFICULTIES).map(([id,d])=>'<label><input type="radio" name="difficulty" value="'+id+'"'+(id===selectedDifficulty?' checked':'')+'><strong>'+esc(tr(d.name))+' <small>'+esc(tr(d.label))+'</small></strong><span>'+esc(tr(d.description))+'</span></label>').join('')+'</fieldset>'+
    (previous?'<p class="fine-print">'+esc(t('start.last'))+' — '+esc(previous)+'</p>':'')+settingsMarkup(),
    [{label:t('start.begin'),className:'primary',action:()=>{selectedDifficulty=modal.querySelector('[name="difficulty"]:checked')?.value||'normal';startRun();}}]);
  for(const radio of modal.querySelectorAll('[name="difficulty"]'))radio.onchange=()=>{selectedDifficulty=radio.value;};
  wireSettings();
}
function showHelp(){
  const icon=name=>'<span class="mini-icon" aria-hidden="true">'+symbolSvg(name)+'</span>';
  const row=(action,k,touch,pad)=>'<tr><td>'+esc(action)+'</td><td class="col-k">'+esc(k)+'</td><td class="col-t">'+(touch.startsWith('<')?touch:esc(touch))+'</td><td class="col-g">'+esc(pad)+'</td></tr>';
  const body='<table class="controls-table"><thead><tr><th>'+esc(t('help.action'))+'</th><th class="col-k">'+esc(t('help.keyboard'))+'</th><th class="col-t">'+esc(t('help.touch'))+'</th><th class="col-g">'+esc(t('help.gamepad'))+'</th></tr></thead><tbody>'+
    row(t('help.move'),t('help.move.k'),t('help.move.t'),t('help.move.g'))+
    row(t('ab.slash'),t('help.slash.k'),icon('slash'),'A')+
    row(t('ab.dash'),t('help.dash.k'),icon('dash'),'B')+
    row(t('ab.pulse'),'E',icon('pulse'),'X')+
    row(t('ab.sunbreak'),'Q',icon('sunbreak'),'Y')+
    row(t('ab.solarLance'),t('help.lance.k'),icon('lance'),'RB / RT')+
    row(t('help.interact'),'F',t('help.interact.t'),'LB')+
    row(t('help.pause'),t('help.pause.k'),'☰','Start')+
  '</tbody></table><p class="steps-intro">'+esc(t('help.steps'))+'</p>'+stepList()+
    '<ul class="notes">'+HELP_NOTES.map(key=>'<li>'+esc(t(key))+'</li>').join('')+'</ul>';
  dialog(t('help.kicker'),t('help.title'),body,[{label:t('guide.symbols'),action:()=>show(showSymbols)},{label:t('help.ok'),className:'primary',action:closeDialog}],{wide:true});
}
function showSymbols(){
  const cards=SYMBOL_CARDS.map(kind=>'<li class="symbol-card"><div class="symbol-illustration symbol-'+kind+'">'+symbolSvg(kind)+'</div><div><h3>'+esc(t('sym.'+kind+'.name'))+'</h3><p>'+esc(t('sym.'+kind+'.text'))+'</p></div></li>').join('');
  dialog(t('sym.kicker'),t('sym.title'),'<p>'+esc(t('sym.intro'))+'</p><ul class="symbol-legend">'+cards+'</ul><p class="fine-print">'+esc(t('sym.note'))+'</p>',[{label:t('common.back'),className:'primary',action:closeDialog}],{wide:true});
}
function showWorld(){dialog(t('world.kicker'),t('world.title'),t('world.body'),[{label:t('common.back'),className:'primary',action:closeDialog}]);}
function showCompanions(){
  const panel=(image,alt,name,body)=>'<div class="character-panel">'+(image?'<img src="'+image+'" alt="'+esc(alt)+'">':'<div></div>')+'<div><h3>'+esc(name)+'</h3><p>'+esc(body)+'</p></div></div>';
  dialog(t('comp.kicker'),t('comp.title'),panel('assets/zeyu-golden.png',t('comp.zeyu.name'),t('comp.zeyu.name'),t('comp.zeyu.text'))+panel('assets/dawnweaver.png',t('comp.dawn.name'),t('comp.dawn.name'),t('comp.dawn.text'))+panel('',t('comp.sol.name'),t('comp.sol.name'),t('comp.sol.text')),
    [{label:t('common.back'),className:'primary',action:closeDialog}]);
}
// Only ever pauses: blur and tab switches call this too, so it must never resume the game.
// Closing the menu is handled by the dialog itself (Esc, the close button, gamepad B or Start).
function pause(){
  if(!run||!['running','ending'].includes(run.mode)||modal.open)return;
  show(pauseMenu);
}
function pauseMenu(){
  returnTo=null;const area=AREAS[run.areaIndex];
  dialog(t('pause.kicker',{chapter:area.chapter}),tr(area.name),'<p class="pause-step"><strong>'+esc(stepText(campaignStep(run)))+'</strong><span>'+esc(keyHint(tr(objectiveText(run))))+'</span></p>'+settingsMarkup()+(audioStatus?'<p class="fine-print">'+esc(audioText(audioStatus))+'</p>':''),[
    {label:t('pause.resume'),className:'primary',action:closeDialog},
    {label:t('pause.journal'),action:()=>{returnTo=pauseMenu;show(journal);}},{label:t('pause.controls'),action:()=>{returnTo=pauseMenu;show(showHelp);}},{label:t('pause.symbols'),action:()=>{returnTo=pauseMenu;show(showSymbols);}},
    {label:t('pause.restart'),action:startRun},{label:t('pause.quit'),action:home}
  ]);wireSettings();
}
function upgrade(){
  currentDialog=upgrade;
  dialog(t('up.kicker'),t('up.title'),'<p>'+esc(t('up.hint'))+'</p><div class="upgrade-row" id="upgrade-row"></div>',[],{locked:true});
  const row=$('upgrade-row');
  upgradeChoices(run).forEach((card,index)=>{const button=document.createElement('button');button.type='button';button.className='upgrade-card';
    button.innerHTML='<strong>'+(index+1)+' · '+esc(tr(card.name))+'</strong><small>'+esc(tr(card.family))+'</small><small>'+esc(tr(card.text))+'</small>';
    button.onclick=()=>selectUpgrade(card.id);row.append(button);});
  if(inputMode!=='touch')row.firstElementChild?.focus({preventScroll:true});
}
function selectUpgrade(choice){
  if(!chooseUpgrade(run,choice))return;
  modal.close();currentDialog=null;savedMode=null;clearInput();accumulated=0;canvas.focus({preventScroll:true});loop.wake();
}
function routeClear(){
  currentDialog=routeClear;
  const area=AREAS[run.areaIndex],result=run.areaResults.at(-1),story=JOURNEY[run.areaIndex],next=AREAS[run.areaIndex+1];
  dialog(t('clear.kicker',{chapter:area.chapter}),t('clear.title',{area:tr(area.name)}),
    '<p>'+esc(tr(area.outro))+'</p><p><strong>'+esc(t('clear.token',{token:tr(story.token)}))+'</strong> '+esc(tr(story.link))+'</p><p class="fine-print">'+esc(t('clear.stats',{kills:result.kills,time:formatTime(result.seconds),damage:Math.round(result.damageTaken)}))+'<br>'+esc(t('clear.heal'))+'</p>',
    [{label:t('clear.continue',{next:tr(next.name)}),className:'primary',action:async()=>{
      if(travelLoading)return;travelLoading=true;const button=$('modal-actions').querySelector('button');button.disabled=true;button.textContent=t('clear.loading');
      try{await loadAreaAssets(images,run.areaIndex+1);}catch{travelLoading=false;button.disabled=false;button.textContent=t('clear.retry');return;}
      travelLoading=false;if(!advanceArea(run))return;modal.close();currentDialog=null;savedMode=null;clearInput();accumulated=0;canvas.focus({preventScroll:true});announceArea();loop.wake();
    }}],{locked:true});
}
let lastRecordSaved=true;
function finish(){
  currentDialog=finishDialog;
  const won=run.mode==='victory';
  if(!run.recorded){
    const record={version:1,won,difficulty:run.difficulty,seed:run.initialSeed,seconds:run.time,kills:run.kills,areas:run.areaResults.length,stats:run.stats};
    lastRecordSaved=saveResult(safeStorage,record);guidance=completeGuidedRun(guidance);saveGuidance(safeStorage,guidance);run.recorded=true;
  }
  finishDialog();
}
function finishDialog(){
  const won=run.mode==='victory';
  const stats='<div class="result-grid"><span><b>'+run.kills+'</b>'+esc(t('end.freed'))+'</span><span><b>'+run.areaResults.length+'/'+AREAS.length+'</b>'+esc(t('end.areas'))+'</span><span><b>'+run.stats.hitsTaken+'</b>'+esc(t('end.hits'))+'</span><span><b>'+formatTime(run.time)+'</b>'+esc(t('end.time'))+'</span></div>';
  dialog(t(won?'end.win.kicker':'end.lose.kicker'),t(won?'end.win.title':'end.lose.title'),
    '<p>'+esc(won?tr(AREAS.at(-1).outro):t('end.lose.tip'))+'</p>'+stats+'<p class="fine-print">'+esc(tr(DIFFICULTIES[run.difficulty].name))+' · '+esc(tr(DIFFICULTIES[run.difficulty].label))+' — '+esc(t(lastRecordSaved?'end.saved':'end.notSaved'))+'</p>',
    [{label:t('end.again'),className:'primary',action:startRun},{label:t('end.change'),action:()=>{home();show(showStart);}}],{locked:true});
}
function interactNearby(){
  if(modal.open||!run||run.mode!=='running')return;
  // A chosen road speaks through the story line, so it needs no second banner.
  const result=interact(run);if(!result||result.kind==='route')return;
  if(result.kind==='dialogue'){
    const builder=()=>dialog(t('npc.kicker'),tr(result.title),'<p>'+esc(tr(result.text))+'</p><p class="fine-print">'+esc(t('npc.next',{action:keyHint(tr(objectiveText(run)))}))+'</p>',[{label:t('npc.continue'),className:'primary',action:closeDialog}]);
    show(builder);
  }
}
function journal(){
  const index=Math.max(0,Math.min(AREAS.length-1,journalArea)),story=JOURNEY[index],area=AREAS[index];
  const tabs='<div class="chips" role="group">'+AREAS.map((a,i)=>'<button type="button" data-area="'+i+'" aria-pressed="'+(i===index)+'">'+a.chapter+' · '+esc(tr(a.name))+'</button>').join('')+'</div>';
  const runInfo=run?'<p class="fine-print"><strong>'+esc(t('journal.roads'))+':</strong> '+esc(run.routeChoices.map((id,i)=>tr(CAMPAIGN[i].routes.find(r=>r.id===id)?.name||id)).join(' → ')||t('journal.none'))+' · <strong>'+esc(t('journal.gifts'))+':</strong> '+esc(run.storyTokens.map(tr).join(' · ')||t('journal.firstLight'))+'</p>':'';
  const chapter='<section class="journal-chapter"><p>'+esc(tr(story.link))+'</p><p><strong>'+esc(t('journal.guide'))+':</strong> '+esc(tr(story.npc.name))+' · '+esc(tr(story.npc.title))+' · <strong>'+esc(t('journal.exit'))+':</strong> '+esc(tr(story.exit.name))+' → '+esc(tr(story.exit.destination))+'</p>'+
    story.roles.map(key=>{const e=ENEMY_ROLES[key];return '<h3>'+esc(tr(e.name))+' <small>'+esc(tr(e.tier))+'</small></h3><p>'+esc(tr(e.lore))+'</p><p class="counter">'+esc(tr(e.hint))+'</p>';}).join('')+
    '<h3>'+esc(tr(CAMPAIGN[index].champion.name))+' <small>'+esc(t('journal.champion'))+'</small></h3><p>'+esc(tr(CAMPAIGN[index].champion.lore))+'</p><p class="counter">'+esc(tr(CHAMPION_HINTS[CAMPAIGN[index].champion.id]))+'</p>'+
    '<h3>'+esc(tr(area.boss))+' <small>'+esc(t('journal.warden'))+'</small></h3><p>'+esc(tr(story.bossLore))+'</p><p class="counter">'+esc(tr(story.bossHint))+'</p></section>';
  currentDialog=journal;
  dialog(t('journal.kicker'),t('journal.title'),runInfo+tabs+chapter,[{label:t(run&&!returnTo?'journal.back':'common.back'),className:'primary',action:closeDialog}],{wide:true});
  for(const button of modal.querySelectorAll('[data-area]'))button.onclick=()=>{journalArea=Number(button.dataset.area);journal();modal.querySelector(`[data-area="${journalArea}"]`)?.focus({preventScroll:true});};
}

/* ---------- Run lifecycle ---------- */
function startRun(){
  modal.close();currentDialog=null;savedMode=null;seenEnemies.clear();
  run=createRun(Date.now(),selectedDifficulty);run.autoPowers=autoPowers;camera=null;clearInput();prefetchedArea=-1;journalArea=0;
  guidanceVisible=guidanceEnabled(guidance);guideKey='';
  document.body.classList.add('playing');$('landing').hidden=true;$('game').hidden=false;$('status').textContent='';
  updateOrientation();measureView();reservedDirty=true;showRotateHint();
  accumulated=0;canvas.focus({preventScroll:true});text('banner','');bannerQueue.length=0;bannerUntil=0;announceArea();
  loop.stop();loop.wake();
}
// Banners stay up for at least BANNER_MIN seconds; later ones wait in a short queue (and
// expire there), so a step change is not replaced by the boss that arrives in the same moment.
// Urgent banners (a guard breaking, an enrage) show at once: their window is only seconds long.
const BANNER_MIN=2.4,BANNER_STALE=6,bannerQueue=[];let bannerShownAt=0;
function showBanner(message,seconds){if(!$('banner').textContent)reservedDirty=true;text('banner',message);bannerShownAt=run?.time||0;bannerUntil=bannerShownAt+seconds;}
function announce(message,seconds=4,urgent=false){
  const now=run?.time||0,current=$('banner').textContent;
  if(!urgent&&current&&now<bannerUntil&&now-bannerShownAt<BANNER_MIN){
    if(current!==message&&!bannerQueue.some(item=>item.message===message)){bannerQueue.push({message,seconds,at:now});if(bannerQueue.length>3)bannerQueue.shift();}
    return;
  }
  showBanner(message,seconds);
}
function nextBanner(){
  while(bannerQueue.length&&run.time-bannerQueue[0].at>BANNER_STALE)bannerQueue.shift();
  const next=bannerQueue.shift();if(next)showBanner(next.message,next.seconds);return !!next;
}
function announceArea(){const area=AREAS[run.areaIndex];announce(t('ann.area',{chapter:area.chapter,name:tr(area.name)}),4);}
const activeBossName=()=>tr(run.enemies.find(e=>e.boss&&e.hp>0)?.bossName||AREAS[run.areaIndex].boss);
function home(){
  run=null;modal.close();currentDialog=null;savedMode=null;clearInput();bannerQueue.length=0;
  loop.stop();audio.sync(null);
  document.body.classList.remove('playing');$('game').hidden=true;$('landing').hidden=false;$('start').focus({preventScroll:true});
}
function formatTime(time){const s=Math.floor(time);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
let rotateTimer=0;
function showRotateHint(){
  clearTimeout(rotateTimer);
  const show=inputMode==='touch'&&innerHeight>innerWidth&&Math.min(innerWidth,innerHeight)<600;
  $('rotate-hint').hidden=!show;reservedDirty=true;if(show)rotateTimer=setTimeout(()=>{$('rotate-hint').hidden=true;reservedDirty=true;},5000);
}
addEventListener('orientationchange',()=>setTimeout(()=>{updateOrientation();measureView();showRotateHint();if(run)loop.wake();},150));

/* ---------- HUD ---------- */
function renderGuidance(){
  property('field-guide','hidden',!guidanceVisible);
  if(!run||!guidanceVisible)return;
  const step=guidanceStep(run),key=step.symbol+step.kicker+step.title+language()+inputMode;
  if(key!==guideKey){
    guideKey=key;guidePinned=false;guideOpenUntil=stageSmall?0:run.time+7;reservedDirty=true;
    text('guidance-session',step.kicker?tr(step.kicker):t('guide.field'));
    $('guidance-symbol').innerHTML=symbolSvg(step.symbol);text('guidance-title',keyHint(tr(step.title)));text('guidance-copy',tr(step.text));
  }
  const collapsed=stageSmall&&!guidePinned&&run.time>guideOpenUntil;
  if($('field-guide').classList.contains('collapsed')!==collapsed){$('field-guide').classList.toggle('collapsed',collapsed);reservedDirty=true;}
}
const cooldownCache=new Map();
function setCooldown(name,remaining,full,disabled){
  const fraction=Math.max(0,Math.min(1,full>0?remaining/full:0)),rounded=Math.round(fraction*50)/50;
  for(const element of document.querySelectorAll(`[data-ability="${name}"]`)){
    const previous=cooldownCache.get(element);
    if(previous!==rounded){element.style.setProperty('--cd',rounded);cooldownCache.set(element,rounded);}
    if(element.disabled!==disabled&&element.classList.contains('ability'))element.disabled=disabled;
  }
}
function interactionLabel(){
  const interaction=nearbyInteraction(run);
  if(!interaction)return {label:t('act.none'),available:false};
  if(interaction.kind==='route')return {label:t(interaction.status==='retry'?'act.restart':'act.choose',{name:tr(interaction.name)}),available:true};
  if(interaction.kind==='npc')return {label:t('act.talk',{name:tr(interaction.name)}),available:true};
  return {label:run.gateOpen?withoutKey(tr(gatewayPrompt(run))):t('act.seal'),available:true};
}
function render(){
  if(!run)return;
  if(reservedDirty)measureReserved();
  view.reserved=reserved;
  camera=drawBattlefield(ctx,canvas,images,run,reduced,camera,['running','ending'].includes(run.mode)?renderElapsed:0,run.mode==='running'?accumulated*60:1,guidanceVisible,null,view);
  renderGuidance();
  // Step N/5 with its name and pips, then the one next action and its progress.
  const area=AREAS[run.areaIndex],campaign=run.campaign,step=campaignStep(run),done=step.progress;
  text('area-label',tr(area.name));
  text('step-number',step.stage<5?t('hud.stepOf',{n:step.number}):'');text('campaign-stage',t('hud.stage'+step.stage));
  const pips=$('step-pips');if(pips.dataset.stage!==String(step.stage)){pips.dataset.stage=step.stage;[...pips.children].forEach((pip,i)=>{pip.className=i<step.stage?'done':i===step.stage?'now':'';});}
  text('objective',keyHint(tr(objectiveText(run))));
  property('campaign-progress','hidden',!done);
  if(done){property('campaign-meter','max',done.max);property('campaign-meter','value',done.value);text('campaign-count',done.kind==='kills'?t('hud.count',{n:done.value,m:done.max}):'');}
  // After the Warden falls the progression repeats its arrival line; the gate banner speaks instead.
  const stale=run.gateOpen&&campaign.notice===CAMPAIGN[run.areaIndex].messages[4];
  const storyText=run.time<campaign.noticeUntil&&!stale?tr(campaign.notice):'';
  if(!!storyText!==!!$('story-line').textContent)reservedDirty=true;
  text('story-line',storyText);
  if(campaign.stage>=3&&run.areaIndex<AREAS.length-1&&prefetchedArea!==run.areaIndex+1){prefetchedArea=run.areaIndex+1;loadAreaAssets(images,prefetchedArea).catch(()=>{});}
  const progress=$('route-progress'),progressKey=run.areaIndex+':'+language();
  if(progress.dataset.area!==progressKey){progress.dataset.area=progressKey;progress.innerHTML=AREAS.map((a,i)=>'<li class="'+(i===run.areaIndex?'current':i<run.areaIndex?'complete':'')+'" title="'+esc(tr(a.name))+'">'+(i<run.areaIndex?'✓':a.chapter)+'</li>').join('');}
  const {label,available}=interactionLabel(),canInteract=available&&run.mode==='running';
  property('interact-button','disabled',!canInteract);
  const interactLabel=document.querySelector('#interact-button .interact-label');if(interactLabel.textContent!==label)interactLabel.textContent=label;
  const touchInteract=$('touch-interact');if(touchInteract.disabled!==!canInteract){touchInteract.disabled=!canInteract;reservedDirty=true;}
  const touchLabel=touchInteract.querySelector('.t-label');if(touchLabel.textContent!==label)touchLabel.textContent=label;
  const p=run.player;
  text('health-number',`${Math.ceil(p.hp)} / ${p.maxHp}`);width('health-fill',p.hp/p.maxHp*100);
  text('run-time',formatTime(run.time));text('kills',run.kills);
  const busy=run.mode!=='running',cooldownText=remaining=>remaining>0?t('hud.seconds',{n:remaining.toFixed(1)}):t('hud.ready');
  text('slash-cooldown',cooldownText(p.slashCooldown));text('dash-cooldown',cooldownText(p.dashCooldown));text('pulse-cooldown',cooldownText(p.pulseCooldown));
  text('sunbreak-cooldown',cooldownText(p.sunbreakCooldown));text('lance-cooldown',cooldownText(p.solarLanceCooldown));
  setCooldown('slash',p.slashCooldown,COMBAT.slash.cooldown*p.bladeCooldown,busy);
  setCooldown('dash',p.dashCooldown,p.dashInterval||COMBAT.dash.cooldown,busy);
  setCooldown('pulse',p.pulseCooldown,8,busy);
  setCooldown('sunbreak',p.sunbreakCooldown,COMBAT.sunbreak.cooldown*p.breakCooldown,busy);
  setCooldown('solarLance',p.solarLanceCooldown,COMBAT.solarLance.cooldown,busy);
  text('party-status',p.shield>0?t('hud.ward',{n:Math.ceil(p.shield)}):run.sol.volley>0?t('hud.solVolley'):run.sol.active?t('hud.solActive'):t('hud.solWaiting'));
  const c=run.companion;
  text('companion-status',c.nova>0?t('hud.dawnNova'):c.mend>0?t('hud.dawnMending'):c.cast>0?t('hud.dawnWeaving'):c.mendCooldown>0?t('hud.dawnMendIn',{n:Math.ceil(c.mendCooldown)}):t('hud.dawnMendReady'));
  const boss=run.enemies.find(e=>e.boss&&e.hp>0);
  if($('boss-hud').hidden!==!boss){$('boss-hud').hidden=!boss;reservedDirty=true;}
  if(boss){
    text('boss-name',tr(boss.bossName||area.boss)+' · '+t(boss.bossRank==='champion'?'hud.champion':'hud.warden')+(boss.phase===2?' · '+t('hud.phase2'):''));width('boss-fill',boss.hp/boss.maxHp*100);
    const guard=guardState(boss),row=$('boss-guard');
    if(row.hidden!==!guard){row.hidden=!guard;reservedDirty=true;}
    if(guard){if(row.dataset.state!==guard.state)row.dataset.state=guard.state;text('guard-label',t(GUARD_LABELS[guard.state]));width('guard-fill',guard.fill*100);}
  }
  const queued=bannerQueue.length>0&&(run.time>=bannerUntil||run.time-bannerShownAt>=BANNER_MIN)&&nextBanner();
  if(!queued&&run.time>bannerUntil&&$('banner').textContent){text('banner','');reservedDirty=true;}
}

function frame(elapsed){
  renderElapsed=elapsed;
  if(['running','ending'].includes(run?.mode)){
    accumulated+=elapsed;
    while(accumulated>=1/60&&['running','ending'].includes(run.mode)){
      if(run.mode==='running'&&controls.attackHeld())ability('slash');
      update(run,controls.movement(),1/60);accumulated-=1/60;
    }
  }else accumulated=0;
  if(run){
    for(const event of run.events){
      audio.sound(event);
      if(event==='gate-open')announce(t('ann.gate',{token:tr(JOURNEY[run.areaIndex].token)}),8);
      if(event==='stage'&&run.campaign.stage<5)announce(t('ann.step',{n:run.campaign.stage+1,name:t('hud.stage'+run.campaign.stage)}),4);
      if(event==='boss-phase')announce(t('ann.phase',{name:tr(run.enemies.find(e=>e.boss&&e.phaseShift>0)?.bossName||AREAS[run.areaIndex].boss)}),4);
      if(event==='boss'){const arriving=run.enemies.find(e=>e.boss&&e.warning>0),guarded=arriving?.guardMax>0;announce(t(guarded?'ann.bossGuard':'ann.boss',{name:tr(arriving?.bossName||AREAS[run.areaIndex].boss)}));}
      if(event==='boss-exposed')announce(t('ann.exposed'),3,true);
      if(event==='boss-guard')announce(t('ann.guardBack'),3,true);
      if(event==='boss-enraged')announce(t('ann.enraged',{name:activeBossName()}),4,true);
      if(event==='boss-summon')announce(t('ann.summon',{name:activeBossName()}),3);
      if(event==='beacon')announce(t('ann.beacon'),3);
      if(event==='lantern')announce(t('ann.lantern'),3);
    }
    run.events.length=0;
    if(run.mode==='running'&&guidanceVisible){
      const specialist=run.enemies.find(e=>e.role&&!e.boss&&!seenEnemies.has(e.role));
      if(specialist){seenEnemies.add(specialist.role);const role=ENEMY_ROLES[specialist.role];announce(tr(role.name)+' · '+tr(role.hint),6);}
      const newcomer=run.enemies.find(e=>['runner','sentinel','cantor'].includes(e.type)&&!seenEnemies.has(e.type));
      if(newcomer){seenEnemies.add(newcomer.type);announce(t('ann.'+newcomer.type),5);}
    }
    if(!modal.open&&run.mode==='upgrade')upgrade();
    if(!modal.open&&run.mode==='area-clear')routeClear();
    if(!modal.open&&['victory','defeat'].includes(run.mode))finish();
    render();
  }
  audio.sync(run);
  return ['running','ending'].includes(run?.mode);
}

/* ---------- Wiring ---------- */
for(const [name,icon] of ABILITIES)for(const symbol of document.querySelectorAll(`[data-ability="${name}"] .ability-symbol`))symbol.innerHTML=symbolSvg(icon);
for(const button of document.querySelectorAll('.actionbar [data-ability]'))button.addEventListener('click',()=>{ability(button.dataset.ability);canvas.focus({preventScroll:true});});
$('start').onclick=()=>show(showStart);
$('controls-button').onclick=()=>show(showHelp);$('world-button').onclick=()=>show(showWorld);$('character-button').onclick=()=>show(showCompanions);
$('pause-button').onclick=()=>pause();$('interact-button').onclick=()=>{interactNearby();canvas.focus({preventScroll:true});};$('touch-interact').onclick=()=>interactNearby();
$('hide-guidance').onclick=e=>{e.stopPropagation();setGuidanceMode('off');};
$('guide-legend-button').onclick=e=>{e.stopPropagation();show(showSymbols);};
$('field-guide').addEventListener('click',()=>{if(!stageSmall||!run)return;guidePinned=$('field-guide').classList.contains('collapsed');if(!guidePinned)guideOpenUntil=0;reservedDirty=true;renderGuidance();});
for(const button of document.querySelectorAll('[data-lang]'))button.onclick=()=>chooseLanguage(button.dataset.lang);
$('close-modal').onclick=closeDialog;
modal.addEventListener('cancel',e=>{e.preventDefault();if(!['upgrade','area-clear','victory','defeat'].includes(run?.mode))closeDialog();});
modal.addEventListener('close',()=>{
  if(modal.open)return;
  // A locked dialog (upgrade, travel, result) closed by the browser is shown again by the next frame.
  if(['upgrade','area-clear','victory','defeat'].includes(run?.mode)){loop.wake();return;}
  currentDialog=null;returnTo=null;
  // A menu closed without closeDialog() must not leave the journey frozen.
  if(run?.mode==='paused'&&savedMode){run.mode=savedMode;savedMode=null;clearInput();accumulated=0;loop.wake();}
});

function aimFromPointer(e){
  const bounds=canvas.getBoundingClientRect(),dx=(e.clientX-bounds.left)/bounds.width*view.width+camera.x-run.player.x,dy=(e.clientY-bounds.top)/bounds.height*view.height+camera.y-run.player.y,d=Math.hypot(dx,dy);
  return d>1?{x:dx/d,y:dy/d}:null;
}
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||run?.mode!=='running'||!camera)return;
  if(e.button===0){ability('slash',aimFromPointer(e));canvas.focus({preventScroll:true});}
  if(e.button===2){e.preventDefault();ability('solarLance',aimFromPointer(e));}
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>{if(document.body.classList.contains('playing'))e.preventDefault();});

const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
function updateFullscreenLabel(){
  const button=$('fullscreen-button');if(!button)return;
  button.hidden=!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
  button.setAttribute('aria-label',t(fullscreenElement()?'top.exitFullscreen':'top.fullscreen'));
}
$('fullscreen-button').onclick=async()=>{
  try{
    if(fullscreenElement())await (document.exitFullscreen||document.webkitExitFullscreen).call(document);
    else await (document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen).call(document.documentElement,{navigationUI:'hide'});
  }catch{}
  updateFullscreenLabel();
};
document.addEventListener('fullscreenchange',()=>{updateFullscreenLabel();measureView();if(run)loop.wake();});
document.addEventListener('webkitfullscreenchange',()=>{updateFullscreenLabel();measureView();});

document.addEventListener('keydown',e=>{
  if(modal.open){
    if(run?.mode==='upgrade'&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();selectUpgrade(upgradeChoices(run)[Number(e.code.slice(-1))-1]?.id);}
    return;
  }
  if(!run)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(['Escape','KeyP'].includes(e.code)&&!e.repeat){e.preventDefault();pause();return;}
  if(run.mode!=='running'||e.repeat)return;
  if(e.code==='Space')ability('dash',controls.keyboardDirection());
  if(e.code==='KeyF'){e.preventDefault();interactNearby();return;}
  if(e.code==='KeyE')ability('pulse');
  if(e.code==='KeyJ')ability('slash');
  if(e.code==='KeyQ')ability('sunbreak');
  if(e.code==='KeyR')ability('solarLance');
});
addEventListener('blur',()=>{clearInput();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});

/* ---------- Start-up ---------- */
let loadState={done:false,failed:false,count:0,total:INITIAL_ASSETS.length};
function updateStartButton(){
  const start=$('start');
  if(loadState.failed){start.textContent=t('landing.reload');$('status').textContent=t('landing.loadError');return;}
  start.textContent=loadState.done?t('landing.play'):t('landing.loading',{n:loadState.count,total:loadState.total});
}
applyStatic();
try{
  images=await loadAssets((count,total)=>{loadState={...loadState,count,total};updateStartButton();},fetch,Image,INITIAL_ASSETS);
  loadState={...loadState,done:true};$('start').disabled=false;updateStartButton();
}catch{
  loadState={...loadState,failed:true};$('start').disabled=false;updateStartButton();$('start').onclick=()=>location.reload();
}
