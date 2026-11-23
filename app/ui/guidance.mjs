import {JOURNEY} from '../../content/journey.mjs';
import {AREAS} from '../../content/game.mjs';
import {distance} from '../game/geometry.mjs';

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
export function guidanceStep(run){
  const story=JOURNEY[run.areaIndex];
  if(run.gateOpen)return {symbol:'gate',title:run.areaIndex===AREAS.length-1?'Release the dawn':'Take the open road',text:'Follow the doorway marker to '+story.exit.name+'. Walk close, then press F or tap '+(run.areaIndex===AREAS.length-1?'Release the dawn to finish your journey.':'Enter gateway to travel to '+story.exit.destination+'.')};
  if(run.hazards.some(h=>h.warning>0&&distance(h,run.player)<h.radius+150))return {symbol:'danger',title:'Leave the marked ground',text:'Striped ground marks an incoming attack. Move outside the band before it strikes. An unmarked center is safe from a ring attack.'};
  if(run.lanterns.some(l=>!l.lit&&distance(l,run.player)<145))return {symbol:'lantern',title:'Strike a sun lantern',text:'The diamond and blade mark a combat tool. Aim Sunblade at the lantern, or use a power nearby, to release one cleansing burst.'};
  const boss=run.enemies.find(e=>e.boss&&e.hp>0);
  if(boss?.bossRank==='champion')return {symbol:'boss',title:'Defeat '+boss.bossName,text:'This roaming champion contests the gathering. Read its warnings, strike between casts, and defeat both phases. The final Warden still waits beyond the counterattack.'};
  if(run.bossSpawned)return {symbol:'boss',title:'Face '+AREAS[run.areaIndex].boss,text:'The crown marks the Warden. Avoid striped warnings and strike between attacks. Defeating the Warden opens your exit.'};
  const c=run.campaign;
  if(c.stage===0)return {symbol:'boss',title:'Free the Hollow',text:'Defeats fill the liberation bar. At the first milestone, two roads open. Story messages appear above the battlefield; conversations are optional.'};
  if(!c.choice)return {symbol:'guide',title:'Choose Road A or Road B',text:'The minimap marks two different encounters. Follow either road to its keeper and press F. You can still help the other keeper later for an extra benefit.'};
  const route=c.routes.find(r=>r.id===c.choice);
  if(!route.completed){
    if(route.status==='recovering'||route.status==='retry')return {symbol:'guide',title:'Recover your keeper',text:'The captured keeper returns to their starting road after three seconds. Go back and press F to restart that mission. Your other progress and gifts remain.'};
    return {symbol:'shield',title:'Protect your keeper',text:(route.kind==='repair'?'Stay near the work circle.':'Stay close as the keeper walks to the gathering.')+' Keepers fight, dodge warnings, and can be defeated. E shields them nearby; Dawnweaver heals the most wounded ally. Attack raiders to draw their attention.'};
  }
  if(!c.event.complete&&c.stage>=2)return {symbol:'scenery',title:'Help the gathering',text:'Stay inside the gold circle around the moving mechanism or orrery. Defeats continue to reveal the counterattack and its keeper.'};
  return {symbol:'boss',title:'Break the counterattack',text:'Defeat the roaming champion, free more Hollow and defeat the marked keeper. The mobile Warden arrives when the district’s final milestone is reached.'};
}
