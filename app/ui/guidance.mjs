import {JOURNEY} from '../../content/journey.mjs';
import {knows} from '../game/answers.mjs';
import {AREAS} from '../../content/game.mjs';
import {CAMPAIGN,campaignMilestones} from '../../content/campaign.mjs';
import {distance} from '../game/geometry.mjs';
import {allyName} from '../game/party.mjs';
import {partyAllies} from './hud-view.mjs';

const key='last-signal-guidance-v1';
export const INTRO_RUNS=3;
export function readGuidance(storage){
  try{
    const value=JSON.parse(storage.getItem(key));
    if(value?.version===1&&['auto','on','off'].includes(value.mode)&&Number.isInteger(value.completed)&&value.completed>=0&&value.completed<=999)return value;
  }catch{}
  return {version:1,mode:'auto',completed:0};
}
export function saveGuidance(storage,value){try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function guidanceEnabled(value){return value.mode==='on'||value.mode==='auto'&&value.completed<INTRO_RUNS;}
export function completeGuidedRun(value){return {...value,completed:Math.min(999,value.completed+1)};}

// Every map runs the same five steps (run.campaign.stage 0..4); stage 5 is the open gate.
export const STEP_NAMES=['Free the Hollow','Choose a road','The gathering','Counterattack','The Warden','Gate open'];
// One line per champion: how to break it, then what its second phase adds.
export const CHAMPION_HINTS={
  'briar-regent':'Break its guard, then dodge root lines. Phase 2: ring and leading marks.',
  'march-without-end':'Sidestep its rush; stand inside resonance rings. Phase 2: chasing and leading marks.',
  'nameless-judge':'Break its guard; leave the cross diagonally. Phase 2: crown burst, leading marks.',
  'ash-marshal':'Break its guard, sidestep the rush, get behind the fan. Phase 2: leading marks.',
  'horizon-eater':'Sidestep the rush; outrun its afterimages. Phase 2: leading and chasing marks.'
};

// The step a map is on and the progress of its single next action, in the same
// priority order as the objective line (src/game/progression.mjs campaignObjective).
export function campaignStep(run){
  const c=run.campaign,stage=run.gateOpen?5:Math.min(4,c.stage);
  const milestones=campaignMilestones(run.areaIndex,run.difficulty),next=milestones.find(n=>n>c.defeats)||milestones.at(-1);
  const kills={kind:'kills',value:Math.min(c.defeats,next),max:next,missing:Math.max(0,next-c.defeats)};
  const route=c.routes.find(r=>r.id===c.choice);
  let progress=null;
  if(run.gateOpen||c.stage>0&&!route)progress=null;
  else if(c.stage===0)progress=kills;
  else if(!route.completed)progress=route.status==='active'?{kind:'percent',value:route.progress,max:1}:null;
  else if(run.enemies.some(e=>e.boss&&e.hp>0))progress=null;
  else if(c.stage>=2&&!c.event.complete)progress={kind:'percent',value:c.event.progress,max:1};
  else if(run.bossSpawned||c.stage>=3&&!c.lieutenantDefeated)progress=null;
  else progress=kills;
  return {stage,number:Math.min(stage+1,5),name:STEP_NAMES[stage],progress};
}
export const stepLabel=step=>step.stage<5?'Step '+step.number+'/5 · '+step.name:step.name;

// A Warden guard as the boss bar shows it: up, enraged (up for too long), exposed
// (broken: the bar drains) or down (regrowing, empty). Fields are read defensively.
export function guardState(boss){
  const max=Number(boss?.guardMax)||0;if(max<=0)return null;
  const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
  if(boss.exposed>0)return {state:'exposed',fill:clamp(boss.exposed/(boss.exposedFor||boss.exposed))};
  if(boss.guardUp)return {state:boss.enraged?'enraged':'up',fill:clamp(boss.guardHp/max)};
  return {state:'down',fill:0};
}

// Inside the struck band of a warning (a ring's hollow center is safe).
const struck=(h,p)=>{const d=distance(h,p);return d<h.radius&&!(h.inner>0&&d<h.inner);};
// The nearest fallen ally, while one is down.
export function fallenAlly(run){
  let best=null,bestDistance=Infinity;
  for(const ally of partyAllies(run)){if(!ally.downed)continue;const d=Number.isFinite(ally.x)?distance(ally,run.player):Infinity;if(!best||d<bestDistance){best=ally;bestDistance=d;}}
  return best;
}
// A card part is English content text (translated by tr) or a page string {key,vars} (translated by t).
export function guidanceStep(run){
  const story=JOURNEY[run.areaIndex],last=run.areaIndex===AREAS.length-1,c=run.campaign,step=campaignStep(run),kicker=stepLabel(step);
  if(run.gateOpen)return {symbol:'gate',kicker:STEP_NAMES[5],title:last?'Release the dawn · F':'Enter the gate · F',text:'Walk to '+story.exit.name+(last?' to finish your journey.':' to travel to '+story.exit.destination+'.')};
  if(run.hazards.some(h=>h.targets!=='enemies'&&h.warning>0&&struck(h,run.player)))return {symbol:'danger',kicker:'Danger',title:'Leave the marked ground',text:'Get out before the fill reaches the edge. Gaps and ring centers are safe.'};
  if(run.lanterns.some(l=>!l.lit&&distance(l,run.player)<145))return {symbol:'lantern',kicker:'Tool',title:'Strike the sun lantern',text:'Hit it with Sunblade or a power for one cleansing burst.'};
  const fallen=fallenAlly(run);
  if(fallen)return {symbol:'party',kicker:{key:'guide.party'},title:{key:'guide.revive',vars:{name:allyName(fallen)}},text:{key:'guide.reviveText'}};
  const boss=run.enemies.find(e=>e.boss&&e.hp>0);
  if(boss?.bossRank==='champion')return {symbol:'boss',kicker:'Champion',title:boss.bossName,text:CHAMPION_HINTS[CAMPAIGN[run.areaIndex].champion.id]};
  if(run.bossSpawned){
    const guard=guardState(boss);
    if(guard?.state==='exposed')return {symbol:'boss',kicker:'Warden',title:'Strike now',text:'Its guard is broken: +50% damage for a few seconds.'};
    if(guard?.state==='enraged')return {symbol:'boss',kicker:'Warden',title:'Break the guard now',text:'Enraged: faster attacks and harder hits until its guard breaks.'};
    // Advice names only what Zeyu can already do: blades always, powers once learned.
    if(guard?.state==='up')return {symbol:'boss',kicker:'Warden',title:'Break the guard',text:['pulse','sunbreak','solarLance'].some(name=>knows(run,name))?'Use Sunblade and your powers. Break it quickly or it enrages.':'Strike it with Sunblade. Break it quickly or it enrages.'};
    return {symbol:'boss',kicker:'Warden',title:AREAS[run.areaIndex].boss,text:story.bossHint};
  }
  if(c.stage===0)return {symbol:'boss',kicker:'Step '+step.number+'/5',title:'Free the Hollow',text:'Every Hollow you defeat is freed. Free '+campaignMilestones(run.areaIndex,run.difficulty)[0]+' to open two roads.'};
  if(!c.choice)return {symbol:'guide',kicker,title:'Road A or B',text:'Each road has a keeper to protect. You can do the other later.'};
  const route=c.routes.find(r=>r.id===c.choice);
  if(!route.completed){
    if(route.status==='recovering'||route.status==='retry')return {symbol:'guide',kicker,title:'Recover your keeper',text:'Captured keepers go back to their road. Restart the mission there.'};
    return {symbol:'shield',kicker,title:'Protect your keeper',text:(route.kind==='repair'?'Stay inside the work circle.':'Stay close while they walk.')+(knows(run,'pulse')?' Dawn Pulse shields nearby keepers.':'')};
  }
  if(c.stage>=2&&!c.event.complete)return {symbol:'scenery',kicker,title:'Hold the gold circle',text:'Stay in the gold circle. It only advances while you are near.'};
  if(c.stage>=3&&!c.lieutenantDefeated)return {symbol:'boss',kicker,title:'Defeat the leader',text:'Defeat the counterattack leader. Then the Warden arrives.'};
  return {symbol:'boss',kicker,title:'Free the Hollow',text:'Free more Hollow to start the next step. The top bar counts them.'};
}
