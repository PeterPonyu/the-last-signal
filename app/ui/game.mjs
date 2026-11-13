import {CAMPAIGN,upgradeChoices,campaignMilestones} from '../../content/campaign.mjs';
import {readGuidance,saveGuidance,guidanceEnabled,completeGuidedRun,guidanceStep,INTRO_RUNS} from './guidance.mjs';
import {SYMBOLS,symbolSvg} from '../render/symbols.mjs';
import { createRun, update, requestAbility, chooseUpgrade, advanceArea, interact } from '../game/simulation.mjs';
import {JOURNEY,ENEMY_ROLES} from '../../content/journey.mjs';
import {nearbyInteraction,gatewayPrompt,objectiveText} from '../game/journey.mjs';
import { AREAS, DIFFICULTIES, ASSETS } from '../../content/game.mjs';
import { drawBattlefield } from '../render/renderer.mjs';
import { loadAssets,loadAreaAssets,INITIAL_ASSETS } from '../render/assets.mjs';
import { saveResult, readResults } from '../game/records.mjs';
import { createAudio } from '../audio/audio.mjs';
import { createFrameLoop } from './frame-loop.mjs';

const $ = id => document.getElementById(id);
const text = (id, value) => { const element=$(id),next=String(value);if(element.textContent!==next)element.textContent=next; };
const property = (id, key, value) => { const element=$(id);if(element[key]!==value)element[key]=value; };
const width = (id, value) => { const element=$(id),next=`${Math.round(Math.max(0,Math.min(100,value))*1000)/1000}%`;if(element.style.width!==next)element.style.width=next; };
const canvas = $('arena'), ctx = canvas.getContext('2d');
const modal = $('modal'), keys = new Set(), touchDirections = new Set(), touchPointers=new Map();
let images = {},travelLoading=false,prefetchedArea=-1;
const safeStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let guidance=readGuidance(safeStorage),guidanceVisible=guidanceEnabled(guidance),guideKey='';
let run = null, accumulated = 0, bannerUntil = 0, savedMode = null;
let camera = null, selectedDifficulty = 'normal';
let renderElapsed=1/60;
const seenEnemies=new Set();
let music = false, effects = false, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const audio = createAudio(message => $('audio-status').textContent = message);
const loop = createFrameLoop(frame);
function playSound(kind) { audio.sound(kind); }

function clearInput() { keys.clear(); touchDirections.clear(); touchPointers.clear();document.querySelectorAll('[data-direction]').forEach(b=>b.classList.remove('held')); if(run)run.inputBuffer=null; }
function closeDialog() {
  if (['upgrade','area-clear','victory','defeat'].includes(run?.mode)) return;
  modal.close();
  if (run && savedMode && run.mode === 'paused') run.mode = savedMode;
  savedMode = null; clearInput(); accumulated = 0;
  if (run?.mode === 'running') canvas.focus({preventScroll:true});
  loop.wake();
}

function dialog(kicker, title, body, actions, locked = false) {
  if (['running','ending'].includes(run?.mode)) { savedMode = run.mode; run.mode = 'paused'; }
  clearInput();
  $('modal-kicker').textContent = kicker; $('modal-title').textContent = title;
  $('modal-body').innerHTML = body;
  $('modal-actions').replaceChildren(); $('close-modal').hidden = locked;
  for (const action of actions) {
    const button = document.createElement('button');
    button.className = action.className || '';
    if (action.html) button.innerHTML = action.html; else button.textContent = action.label;
    button.addEventListener('click', action.action); $('modal-actions').append(button);
  }
  if (!modal.open) modal.showModal();
  loop.wake();
}

function setGuidanceMode(mode){
  guidance={...guidance,mode};guidanceVisible=guidanceEnabled(guidance);guideKey='';
  if(!guidanceVisible)$('banner').textContent='';
  const saved=saveGuidance(safeStorage,guidance);
  if($('guidance-save-note'))$('guidance-save-note').textContent=saved?'Your instruction preference is saved on this browser.':'Your preference applies to this session; browser storage is unavailable.';
  if($('guidance-setting'))$('guidance-setting').value=mode;
  renderGuidance();
  loop.wake();
}
function renderGuidance(){
  property('field-guide','hidden',!guidanceVisible);
  if($('battle-layout').classList.contains('with-guidance')!==guidanceVisible)$('battle-layout').classList.toggle('with-guidance',guidanceVisible);
  text('guidance-button',guidanceVisible?'Hide instructions':'Show instructions');
  if($('guidance-button').getAttribute('aria-pressed')!==String(guidanceVisible))$('guidance-button').setAttribute('aria-pressed',String(guidanceVisible));
  if(!run||!guidanceVisible)return;
  const step=guidanceStep(run),key=step.symbol+step.title;
  if(key===guideKey)return;guideKey=key;
  $('guidance-session').textContent=guidance.mode==='auto'?'Learning journey '+Math.min(guidance.completed+1,INTRO_RUNS)+' of '+INTRO_RUNS:'Field guide';
  $('guidance-symbol').innerHTML=symbolSvg(step.symbol);$('guidance-title').textContent=step.title;$('guidance-copy').textContent=step.text;
}
function showSymbols(){
  const cards=['beacon','lantern','guide','gate','danger','hero','boss','scenery'].map(kind=>'<li class="symbol-card"><div class="symbol-illustration symbol-'+kind+'">'+symbolSvg(kind)+'</div><div><h3>'+SYMBOLS[kind].name+'</h3><p>'+SYMBOLS[kind].description+'</p></div></li>').join('');
  dialog('FIELD GUIDE','Know the signs.', '<p>Match the illustration to the same symbol in the world. Shape and labels explain the action; color is an extra cue.</p><ul class="symbol-legend">'+cards+'</ul><p class="fine-print">Hide instructions removes the teaching panel, route pointer, and extended tips. Objective zones and enemy warnings remain visible.</p>',[{label:run?'Return to the journey':'Return to title',className:'primary',action:closeDialog}]);
}

function startRun() {
  modal.close(); savedMode = null; seenEnemies.clear(); run = createRun(Date.now(), selectedDifficulty); camera=null; clearInput();
  guidanceVisible=guidanceEnabled(guidance);guideKey='';
  document.body.classList.add('playing');$('landing').hidden = true; $('game').hidden = false; $('status').textContent = '';
  accumulated = 0; canvas.focus({preventScroll:true});
  $('banner').textContent='';window.scrollTo({top:0,behavior:'instant'});
  loop.stop();loop.wake();
}
function announce(text, seconds = 4) { $('banner').textContent = text; bannerUntil = run.time + seconds; }
function home() {
  run = null; modal.close(); savedMode = null; clearInput();
  loop.stop();audio.sync(null);
  document.body.classList.remove('playing');$('game').hidden = true; $('landing').hidden = false; $('start').focus();
}
function settingsMarkup() {
  return '<div class="settings"><label><input id="music-setting" type="checkbox"> Adaptive music</label><label><input id="sound-setting" type="checkbox"> Sound effects</label><label><input id="effects-setting" type="checkbox"> Reduced effects</label></div><label class="guidance-setting" for="guidance-setting">Field instructions<select id="guidance-setting"><option value="auto">First 3 finished runs</option><option value="on">Always show</option><option value="off">Off</option></select></label><p id="guidance-save-note" class="fine-print">You can reopen the illustrated symbol guide at any time.</p><p id="settings-note" class="fine-print">Original live score · headphones welcome</p>';
}
function wireSettings() {
  $('music-setting').checked=music;$('sound-setting').checked=effects;$('effects-setting').checked=reduced;
  $('music-setting').onchange=async e=>{music=await audio.setMusic(e.target.checked);if($('music-setting'))$('music-setting').checked=music;};
  $('sound-setting').onchange=async e=>{effects=await audio.setEffects(e.target.checked);if($('sound-setting'))$('sound-setting').checked=effects;playSound('upgrade');};
  $('effects-setting').onchange=e=>{reduced=e.target.checked;loop.wake();};
  $('guidance-setting').value=guidance.mode;$('guidance-setting').onchange=e=>setGuidanceMode(e.target.value);
}
function pause() {
  if(!run || !['running','ending'].includes(run.mode))return;
  dialog('TAKE A BREATH', 'The light can wait.', '<p>Your journey is paused, including enemy warnings, healing, and music.</p>'+settingsMarkup(), [
    {label:'Resume the journey',className:'primary',action:closeDialog},
    {label:'Restart this difficulty',action:startRun},{label:'Return to title',action:home}
  ]);wireSettings();
}
function routeClear() {
  const area=AREAS[run.areaIndex],result=run.areaResults.at(-1);
  dialog('AREA '+area.chapter+' · RECLAIMED',area.name+' remembers dawn.',
    '<p>'+area.outro+'</p><p><strong>'+JOURNEY[run.areaIndex].token+' recovered.</strong> '+JOURNEY[run.areaIndex].link+'</p><p>'+result.kills+' Hollow cleared · '+formatTime(result.seconds)+' · '+Math.round(result.damageTaken)+' damage taken.</p><p>You recover up to 35 health before the next area.</p>',
    [{label:'Continue to '+AREAS[run.areaIndex+1].name+' →',className:'primary',action:async()=>{
      if(travelLoading)return;travelLoading=true;const button=$('modal-actions').querySelector('button');button.disabled=true;button.textContent='Preparing the next road…';
      try{await loadAreaAssets(images,run.areaIndex+1);}catch{travelLoading=false;button.disabled=false;button.textContent='Connection interrupted · Retry travel';return;}
      travelLoading=false;if(!advanceArea(run))return;modal.close();savedMode=null;clearInput();accumulated=0;canvas.focus({preventScroll:true});announce(CAMPAIGN[run.areaIndex].messages[0],8);loop.wake();
    }}],true);
}

function upgrade() {
  dialog('A SPARK BECOMES A CHOICE', 'How will you answer?', '<p>Build a path through Sunblade, Sunshard and protective dawn. Your choices remain with you across all three maps.</p>', upgradeChoices(run).map((card,index)=>({html:'<strong>'+(index+1)+' · '+card.name+'</strong><small>'+card.family+'<br>'+card.text+'</small>',className:'upgrade-card',action:()=>selectUpgrade(card.id)})),true);
}

function selectUpgrade(choice) {
  if (!chooseUpgrade(run, choice)) return;
  modal.close(); savedMode = null; clearInput(); accumulated = 0; canvas.focus({preventScroll:true});
  loop.wake();
}

function finish() {
  const won=run.mode==='victory',setting=DIFFICULTIES[run.difficulty];
  const record={version:1,won,difficulty:run.difficulty,seed:run.initialSeed,seconds:run.time,kills:run.kills,areas:run.areaResults.length,stats:run.stats};
  const resultSaved=saveResult(safeStorage,record);
  guidance=completeGuidedRun(guidance);saveGuidance(safeStorage,guidance);
  const stats='<div class="result-grid"><span><b>'+run.kills+'</b>Hollow cleared</span><span><b>'+run.areaResults.length+'/3</b>Areas reclaimed</span><span><b>'+run.stats.hitsTaken+'</b>Hits taken</span><span><b>'+run.stats.coverBlocks+'</b>Bolts stopped by cover</span></div>';
  dialog(won?'THE FIRST ROAD · COMPLETE':'COURAGE CAN BEGIN AGAIN',won?'The dawn belongs to everyone.':'Your story is still unwritten.',
    '<p>'+ (won?AREAS[2].outro:'Return to the light. Use stone as cover, move out of marked ground, and interrupt close attacks with Sunblade.')+'</p>'+stats+
    '<p>'+setting.name+' · '+setting.label+' · '+formatTime(run.time)+' · '+run.stats.meleeKills+' blade / Sunbreak defeats · '+run.stats.allyKills+' companion defeats · '+run.stats.guardBreaks+' guards broken · '+Math.round(run.stats.shieldBlocked)+' damage warded · '+run.stats.lanterns+' sun lanterns kindled.</p><p class="fine-print">'+(resultSaved?'Your last result is saved on this browser for each difficulty.':'This browser could not save your result.')+' The full six-chapter campaign remains future content.</p>',
    [{label:won?'Begin another journey':'Rise again',className:'primary',action:startRun},{label:'Choose another difficulty',action:()=>{home();showStart();}}],true);
}

function interactNearby(){
  if(modal.open||!run)return;
  const result=interact(run);if(!result)return;
  if(result.kind==='route'){announce(result.text,8);return;}
  if(result.kind==='dialogue'){dialog('A VOICE ON THE ROAD',result.title,'<p>'+result.text+'</p><p class="fine-print">The journey pauses while you speak. Road A and Road B offer different encounters. Stay near a repair, escort or gathering to help. The arch opens after the Warden falls.</p>',[{label:'Follow the road',className:'primary',action:closeDialog}]);}
}
function journal(){
  const body=JOURNEY.map((story,i)=>'<section class="journal-chapter"><p class="eyebrow">'+AREAS[i].chapter+' · '+AREAS[i].name+'</p><p>'+story.link+'</p><p><strong>'+story.npc.name+' · '+story.npc.title+'</strong><br>Defeat Hollow to awaken the two roads, complete a gathering and face the counterattack keeper. Exit: '+story.exit.name+' → '+story.exit.destination+'.</p>'+story.roles.map(key=>{const e=ENEMY_ROLES[key];return '<h3>'+e.name+' <small>'+e.tier+'</small></h3><p>'+e.lore+'</p><p class="counter">'+e.hint+'</p>';}).join('')+'<h3>'+AREAS[i].boss+' <small>Warden</small></h3><p>'+story.bossLore+'</p><p class="counter">'+story.bossHint+'</p></section>').join('');
  dialog('TIME → VOICE → A SHARED DAWN','The road and its keepers.',(run?'<p><strong>Chosen roads:</strong> '+(run.routeChoices.map((id,i)=>CAMPAIGN[i].routes.find(r=>r.id===id)?.name||id).join(' → ')||'Your first choice is ahead')+'</p><p><strong>Keepers:</strong> '+run.campaign.npcs.map(n=>n.name+' · '+n.title).join('; ')+'</p><p>Gifts carried: '+(run.storyTokens.join(' · ')||'The first light')+'.</p>':'')+body,[{label:'Return to the journey',className:'primary',action:closeDialog}]);
}
function ability(name,aim) { if(run)requestAbility(run,name,aim); }
function formatTime(time) { const s = Math.floor(time); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

function render() {
  if(!run)return;
  camera=drawBattlefield(ctx,canvas,images,run,reduced,camera,['running','ending'].includes(run.mode)?renderElapsed:0,run.mode==='running'?accumulated*60:1,guidanceVisible);
  renderGuidance();
  const area=AREAS[run.areaIndex];
  text('area-label','AREA '+area.chapter+' · '+area.name.toUpperCase());
  text('difficulty-label',DIFFICULTIES[run.difficulty].name+' · '+DIFFICULTIES[run.difficulty].label);
  text('objective',objectiveText(run));
  const campaign=run.campaign,milestones=campaignMilestones(run.areaIndex,run.difficulty),next=milestones.find(n=>n>campaign.defeats)||milestones.at(-1);
  text('campaign-stage',['Discovery','Two roads','The gathering','Counterattack','The Warden','Reclaimed'][campaign.stage]);
  text('campaign-count',campaign.defeats+' / '+next+' freed');property('campaign-meter','max',milestones.at(-1));property('campaign-meter','value',Math.min(campaign.defeats,milestones.at(-1)));
  text('story-line',run.time<campaign.noticeUntil?campaign.notice:'');
  if(campaign.stage>=3&&run.areaIndex<2&&prefetchedArea!==run.areaIndex+1){prefetchedArea=run.areaIndex+1;loadAreaAssets(images,prefetchedArea).catch(()=>{});}

  const interaction=nearbyInteraction(run);property('interact-button','disabled',run.mode!=='running'||!interaction);
  text('interact-button',interaction?.kind==='route'?'Choose'+' '+interaction.name+' · F':interaction?.kind==='npc'?'Speak to '+interaction.name+' · F':interaction?.kind==='gate'?(run.gateOpen?gatewayPrompt(run):'Inspect seal · F'):'Approach a keeper, road or gateway · F');
  if($('route-progress').dataset.area!==String(run.areaIndex)){ $('route-progress').dataset.area=String(run.areaIndex);$('route-progress').innerHTML=AREAS.map((a,i)=>'<span class="'+(i===run.areaIndex?'current':i<run.areaIndex?'complete':'')+'">'+(i<run.areaIndex?'✓':a.chapter)+' <span>'+a.name+'</span></span>').join(''); }
  const p=run.player;
  text('health-number',`${Math.ceil(p.hp)} / ${p.maxHp}`);
  width('health-fill',p.hp/p.maxHp*100);
  text('run-time',formatTime(run.time));text('kills',run.kills);
  text('dash-cooldown',p.dashCooldown>0?`${p.dashCooldown.toFixed(1)}s`:'Ready · Space');
  text('pulse-cooldown',p.pulseCooldown>0?`${p.pulseCooldown.toFixed(1)}s`:'Ready · E');
  text('slash-cooldown',p.slashCooldown>0?`${p.slashCooldown.toFixed(1)}s`:'Ready · J / click');
  text('sunbreak-cooldown',p.sunbreakCooldown>0?`${p.sunbreakCooldown.toFixed(1)}s`:'Ready · Q');
  property('sunbreak-button','disabled',run.mode!=='running'||p.sunbreakCooldown>0.14||p.dash>0.14||p.slash>0.14);
  text('party-status',p.shield>0?'Dawn ward · '+Math.ceil(p.shield)+' protection':run.sol.active?'Sol · At your side':'Sol awaits beyond the garden');
  property('slash-button','disabled',run.mode!=='running'||p.slashCooldown>0.14||p.dash>0.14||p.sunbreak>0.14);
  property('dash-button','disabled',run.mode!=='running'||p.dashCooldown>0);
  property('pulse-button','disabled',run.mode!=='running'||p.pulseCooldown>0);
  text('companion-status',run.companion.mend>0?'Dawnweaver · Mending':run.companion.cast>0?'Dawnweaver · Weaving light':`Dawnweaver · Mend ${run.companion.mendCooldown>0?Math.ceil(run.companion.mendCooldown)+'s':'ready'}`);
  const boss=run.enemies.find(e=>e.boss&&e.hp>0);
  property('boss-hud','hidden',!boss);
  if(boss)text('boss-name',area.boss+(boss.phase===2?' · UNBOUND':''));
  if(boss)width('boss-fill',boss.hp/boss.maxHp*100);
  if(run.time>bannerUntil)text('banner','');
}

function frame(elapsed) {
  renderElapsed=elapsed;
  if(['running','ending'].includes(run?.mode)) {
    accumulated+=elapsed;
    while(accumulated>=1/60&&['running','ending'].includes(run.mode)) {
      const x=Number(keys.has('KeyD')||keys.has('ArrowRight')||touchDirections.has('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||touchDirections.has('left'));
      const y=Number(keys.has('KeyS')||keys.has('ArrowDown')||touchDirections.has('down'))-Number(keys.has('KeyW')||keys.has('ArrowUp')||touchDirections.has('up'));
      update(run,{x,y},1/60);accumulated-=1/60;
    }
  } else accumulated=0;
  if(run) {
    for(const event of run.events) {
      playSound(event);
      if(event==='gate-open')announce(JOURNEY[run.areaIndex].token+' recovered. Enter the open gateway at '+JOURNEY[run.areaIndex].exit.name+'.',10);
      if(event==='boss-phase')announce(AREAS[run.areaIndex].boss+' breaks its restraint. Watch for a new pattern.',5);
      if(event==='boss')announce(AREAS[run.areaIndex].boss+' enters the reclaimed road.');
      if(event==='beacon')announce('A recovery well restores light. The road remains yours to choose.',3);
      if(event==='lantern')announce('The sun lantern answers. Its light clears nearby threats.',3);
    }
    run.events.length=0;
    if(run.mode==='running'){
      const specialist=run.enemies.find(e=>e.role&&!seenEnemies.has(e.role));
      if(specialist&&guidanceVisible){seenEnemies.add(specialist.role);const role=ENEMY_ROLES[specialist.role];announce(role.name+' · '+role.hint,6);}
      const newcomer=run.enemies.find(e=>['runner','sentinel','cantor'].includes(e.type)&&!seenEnemies.has(e.type));
      if(newcomer&&guidanceVisible){seenEnemies.add(newcomer.type);announce({runner:'Echo Runners commit to a marked charge. Step aside, or interrupt with Sunblade.',sentinel:'A Sentinel guards against bolts. Sunblade, Sunbreak, or Dawn Pulse breaks its shield.',cantor:'Cantors ring their bells before firing. Move across their aim, or shelter behind stone.'}[newcomer.type],5);}
    }
    if(!modal.open&&run.mode==='upgrade')upgrade();
    if(!modal.open&&run.mode==='area-clear')routeClear();
    if(!modal.open&&['victory','defeat'].includes(run.mode))finish();
    render();
  }
  audio.sync(run);
  return ['running','ending'].includes(run?.mode);
}

function showStart() {
  const previous=readResults(safeStorage).map(r=>DIFFICULTIES[r.difficulty].label+': '+r.areas+'/3 areas · '+formatTime(r.seconds)+(r.won?' · Complete':' · Try again')).join(' / ');
  dialog('THE FIRST ROAD · THREE AREAS','Choose how you face the world.',
    '<p>Defeat the Hollow to awaken changing encounters. At the first milestone, choose Road A or B by reaching its keeper and pressing F. Repair a mechanism or escort someone to safety, resolve the gathering, then defeat the counterattack keeper and mobile Warden. Choices carry benefits into the next map. Follow the open doorway and press F to travel.</p><p>Recovery wells are optional. Stay in their gold circle for three seconds to heal. The camera follows Zeyu, and the minimap shows both roads and your gathering.</p>'+
    (previous?'<p class="fine-print">Last journeys — '+previous+'</p>':'')+'<fieldset class="difficulty-options"><legend>Your challenge</legend>'+Object.entries(DIFFICULTIES).map(([id,d])=>'<label><input type="radio" name="difficulty" value="'+id+'" '+(id===selectedDifficulty?'checked':'')+'><span><strong>'+d.name+' <small>'+d.label+'</small></strong><span>'+d.description+'</span></span></label>').join('')+'</fieldset>'+
    '<p class="fine-print">WASD / arrows move · F speaks / enters gateways · J / click swings · Space dashes · E pulses · Q releases Sunbreak. Automatic ranged fire. Aim for a 15–20 minute journey; skilled builds can finish sooner.</p>'+settingsMarkup(),
    [{label:'Begin the journey →',className:'primary',action:()=>{selectedDifficulty=document.querySelector('[name="difficulty"]:checked').value;startRun();}}]);wireSettings();
}
$('start').onclick=showStart;
$('hide-guidance').onclick=()=>setGuidanceMode('off');
$('guidance-button').onclick=()=>setGuidanceMode(guidanceVisible?'off':'on');
$('symbols-button').onclick=showSymbols;$('guide-legend-button').onclick=showSymbols;
for(const name of ['sunbreak','slash','dash','pulse'])$(name+'-button').querySelector('.ability-symbol').innerHTML=symbolSvg(name);
$('pause-button').onclick=pause;$('interact-button').onclick=interactNearby;$('journal-button').onclick=journal;$('dash-button').onclick=()=>ability('dash');$('pulse-button').onclick=()=>ability('pulse');
$('slash-button').onclick=()=>ability('slash');$('sunbreak-button').onclick=()=>ability('sunbreak');
canvas.addEventListener('click',e=>{
  if(run?.mode!=='running'||!camera)return;
  const bounds=canvas.getBoundingClientRect(),dx=(e.clientX-bounds.left)/bounds.width*canvas.width+camera.x-run.player.x,dy=(e.clientY-bounds.top)/bounds.height*canvas.height+camera.y-run.player.y,d=Math.hypot(dx,dy);
  ability('slash',d>1?{x:dx/d,y:dy/d}:null);canvas.focus({preventScroll:true});
});
$('close-modal').onclick=closeDialog;
modal.addEventListener('cancel',e=>{e.preventDefault();if(!['upgrade','area-clear','victory','defeat'].includes(run?.mode))closeDialog();});
$('world-button').onclick=()=>dialog('A WORLD HELD IN STILLNESS', 'The golden rebellion.', '<p>The sun has become a black disk. An ancient Choir promises perfect peace by taking away the will to choose. Its Hollow repeat their last instruction forever.</p><p>Zeyu carries a fragment of living gold. The Ashen Gate is his first stand. Beyond it lie the City of Echoes, the Refusing Forest, the Mirror Foundry, the Starless Sea, and the Hollow Sun.</p><p><em>What is a destination worth if reaching it means taking choice away from everyone else?</em></p><p>This original fiction is planned as a six-chapter adventure. The current playable route crosses the Sunken Garden, Echo Causeway, and Hollow Sun Court. The wider six-chapter campaign remains planned.</p>',[{label:'Return',className:'primary',action:closeDialog}]);
$('character-button').onclick=()=>dialog('THREE LIGHTS · ONE ROAD', 'The people who choose.', '<div class="character-panel"><img src="assets/zeyu-golden.png" alt="Zeyu in golden armor"><div><h3>Zeyu · The Vanguard</h3><p>A familiar face reimagined in ivory and gold. He opens a path with Sunblade, strikes at range with Sunshard, and turns resolve into a burst of dawn.</p></div></div><div class="character-panel"><img src="assets/dawnweaver.png" alt="The Dawnweaver with dark hair, gold armor and a radiant staff"><div><h3>The Dawnweaver</h3><p>A companion inspired by your supplied portrait. She follows Zeyu, casts golden light threads at the Hollow, and restores health when her mend is ready; healing is stronger on Easy.</p><p><em>“A road is worth making when someone can walk it beside you.”</em></p><p>Dawnweaver is a working title for this original character.</p></div></div><div class="character-panel"><div><h3>Sol · The Smallest Sun</h3><p>A mechanical fox awakened by the restored Living Mainspring. Sol joins on the causeway, fires pouncing light strikes, and grants a short ward when Zeyu is badly hurt.</p><p><em>Even the smallest light chooses a direction.</em></p></div></div>',[{label:'Return',className:'primary',action:closeDialog}]);
$('controls-button').onclick=()=>dialog('YOUR FIRST STAND', 'A little light goes a long way.', '<ul><li>WASD or arrow keys: move. The camera follows Zeyu across the expanded districts and stops at the outer world boundary. The minimap marks Road A, Road B, your gathering and visible area.</li><li>Sunshard fires automatically at nearby enemies. Runners flank and telegraph a committed charge. Cantors retreat and strafe to find clear shots; stone cover blocks their line of sight.</li><li>J or click the arena: Sunblade. A directional sword strike with a short wind-up. Clicking aims the swing.</li><li>Space: Resolute Step. Brief invulnerability; 2.5-second cooldown.</li><li>Q: Sunbreak. A committed forward burst. Breaks Sentinel guards; 10-second cooldown. Dash can cancel its wind-up.</li><li>E: Dawn Pulse. Clear nearby enemies; 8-second cooldown.</li><li>The Dawnweaver follows, attacks at range, and heals every 18 seconds when needed. Healing strength follows the selected difficulty.</li><li>Escape or P: pause and sound/effects settings.</li><li>Sol joins after the garden. His pouncing light strikes help at range; a short ward protects you when badly hurt.</li><li>Sentinels resist ranged fire until Sunblade, Sunbreak, or Dawn Pulse breaks their guard. Runners telegraph their charge; step aside or interrupt.</li><li>Strike a sun lantern with Sunblade, Sunbreak, or Dawn Pulse to unleash a single cleansing burst. Restored recovery wells return flowers and warmth around them.</li><li>Twelve upgrade milestones offer three build families. Powers have clear rank limits; your build persists across maps.</li><li>F or the interaction button: speak to a guide, inspect a sealed arch, or enter an opened gateway. The illustrated marker follows your current objective; the minimap marks each exit. Instructions appear for your first three finished runs. Hide them at any time, or change this in pause settings.</li><li>Defeats awaken routes and encounters. Choose a road with F, stay near your repair or escort, then help the central gathering. Beat the counterattack keeper and mobile Warden. Enter the open arch with F. Recovery wells are optional.</li><li>The Journal explains each map’s story, specialists, and two-phase Warden. Fallen enemies stay for 18 seconds, then fade; Wardens stay for 30 seconds. At most 48 remains are kept for performance.</li></ul><p>On touchscreens, hold the direction buttons and tap the four ability buttons. The last result for each difficulty is saved locally. An active journey is not saved.</p>',[{label:'See illustrated symbols',action:showSymbols},{label:'Understood',className:'primary',action:closeDialog}]);

document.addEventListener('keydown',e=>{
  if(modal.open){if(run?.mode==='upgrade'&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();selectUpgrade(upgradeChoices(run)[Number(e.code.slice(-1))-1]?.id);}return;}
  if(!run)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(['Escape','KeyP'].includes(e.code)&&!e.repeat){e.preventDefault();pause();return;}
  if(run.mode!=='running')return;
  keys.add(e.code);
  if(!e.repeat&&e.code==='Space'){const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),y=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));ability('dash',{x,y});}
  if(!e.repeat&&e.code==='KeyF'){e.preventDefault();interactNearby();return;}
  if(!e.repeat&&e.code==='KeyE')ability('pulse');
  if(!e.repeat&&e.code==='KeyJ')ability('slash');
  if(!e.repeat&&e.code==='KeyQ')ability('sunbreak');
});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const button of document.querySelectorAll('[data-direction]')) {
  const syncDirections=()=>{touchDirections.clear();for(const direction of touchPointers.values())touchDirections.add(direction);document.querySelectorAll('[data-direction]').forEach(b=>b.classList.toggle('held',touchDirections.has(b.dataset.direction)));};
  button.addEventListener('pointerdown',e=>{if(run?.mode!=='running')return;e.preventDefault();button.setPointerCapture(e.pointerId);touchPointers.set(e.pointerId,button.dataset.direction);syncDirections();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>{touchPointers.delete(e.pointerId);syncDirections();});
}
window.addEventListener('blur',()=>{clearInput();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
window.addEventListener('resize',()=>{if(run)loop.wake();});

try {
  images=await loadAssets((count,total)=>$('status').textContent=`Preparing characters and garden · ${count} / ${total}`,fetch,Image,INITIAL_ASSETS);
  $('start').disabled=false;$('start').textContent='Begin the first road →';
  $('status').textContent='';
} catch {
  $('status').textContent='The art could not load. Reload this page to try again.';
  $('start').textContent='Reload to restore the light';$('start').disabled=false;$('start').onclick=()=>location.reload();
}
