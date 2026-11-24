// Map rules: each map's living rule with a hostile and a kind phase. Owned by the world-rules worker.
// speedFactor/damageFactor/shotSpeedFactor/castFactor are multipliers the simulation applies to every unit.
// The rule's state lives on the map's campaign (run.campaign.rule), so a new map or a new campaign starts
// fresh; it is plain data and changes only inside stepEnvironment. Unit placement and rule randomness use
// a seeded hash of the run seed, so the map rule never shifts the shared spawn stream.
import {RULES,RULE_LABELS} from '../../content/environment.mjs';
import {CAMPAIGN} from '../../content/campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {AREAS,WORLD,DIFFICULTIES,COMBAT} from '../../content/game.mjs';
import {HAZARD_FAMILIES} from '../../content/bosses.mjs';
import {distance,clamp} from './geometry.mjs';
import {areaObstacles} from './progression.mjs';
import {partyTargets} from './party.mjs';
import {activeNpcs} from './npc-ai.mjs';

const TAU=Math.PI*2;
// Seeded hash in [0,1): the same inputs always give the same value.
export function mix(...values){
  let h=0x811c9dc5;
  for(const value of values){h=Math.imul(h^(value>>>0),0x01000193);h^=h>>>15;h=Math.imul(h,0x2c1b3c6d);h^=h>>>12;h=Math.imul(h,0x297a2d39);h^=h>>>15;}
  return (h>>>0)/4294967296;
}
export function ruleOf(areaIndex){return RULES[areaIndex]||null;}
export function rulePhase(run){const def=RULES[run?.areaIndex];return def&&(run.campaign?.stage??0)>=def.flipStage?'kind':'hostile';}
// The live rule state of the current map, or null before its first step.
export function currentRule(run){const s=run?.campaign?.rule;return s&&s.areaIndex===run.areaIndex?s:null;}
export function friendly(run,body){return body===run.player||body?.ally===true||body?.homeX!==undefined||!!run.campaign?.npcs?.includes(body);}
// The unit (patch, column) whose ground holds this point, or null.
export function unitAt(s,point){
  if(!s||!point)return null;
  for(const u of s.units)if(u.radius>0&&Math.hypot(point.x-u.x,point.y-u.y)<u.radius)return u;
  return null;
}

/* ---------- Placement ---------- */
// Authored anchors are nudged outward in rings until they clear obstacles, objectives and each other.
export function placeUnits(run,def=RULES[run.areaIndex]){
  const u=def?.unit;if(!u?.anchors?.length)return [];
  const obstacles=areaObstacles(run),area=AREAS[run.areaIndex],campaign=CAMPAIGN[run.areaIndex],c=run.campaign;
  const keep=[area.spawn,campaign.hub,campaign.arena,JOURNEY[run.areaIndex].exit,JOURNEY[run.areaIndex].landmark,...area.beacons,...area.lanterns,...(c?.routes||[]).map(r=>({x:r.x,y:r.y})),...(c?.npcs?.[0]?[c.npcs[0]]:[])];
  const placed=[],margin=Math.max(60,u.radius+20);
  const clear=p=>p.x>=WORLD.left+margin&&p.x<=WORLD.right-margin&&p.y>=WORLD.top+margin&&p.y<=WORLD.bottom-margin
    &&obstacles.every(o=>distance(p,o)>=o.radius+u.clear)&&keep.every(k=>distance(p,k)>=u.avoid)&&placed.every(q=>distance(p,q)>=u.radius+q.radius+24);
  for(const [id,anchor] of u.anchors.entries()){
    let spot=clear(anchor)?{x:anchor.x,y:anchor.y}:null;
    for(let ring=1;ring<=9&&!spot;ring++)for(let k=0;k<12&&!spot;k++){const a=k*TAU/12+ring*0.37,p={x:anchor.x+Math.cos(a)*ring*30,y:anchor.y+Math.sin(a)*ring*30};if(clear(p))spot=p;}
    if(spot)placed.push({id,kind:u.kind,x:spot.x,y:spot.y,radius:u.radius,readyAt:0,next:0,rang:-99,burst:-99});
  }
  return placed;
}
function createRule(run){
  const def=RULES[run.areaIndex],units=placeUnits(run,def);
  const s={id:def.id,areaIndex:run.areaIndex,phase:rulePhase(run),flippedAt:null,age:0,draws:0,units,waves:[],echoes:[],pools:[],bursts:[],toll:0,nextToll:def.toll?.first??0,nextStar:def.star?.first??0,heroIn:-1,noticeAt:-99};
  if(def.vent)for(const v of units)v.next=def.vent.first+v.id*1.3+mix(run.initialSeed,run.areaIndex,v.id,7)*def.vent.jitter;
  return s;
}
function ruleState(run){
  if(!run.campaign||!RULES[run.areaIndex])return null;
  if(!currentRule(run))run.campaign.rule=createRule(run);
  return run.campaign.rule;
}
const draw=(run,s)=>mix(run.initialSeed,run.areaIndex,++s.draws);

/* ---------- Shared helpers ---------- */
function partyBodies(run){return [run.player,...partyTargets(run),...activeNpcs(run)];}
// Heals one friendly body: the hero through the engine (so healing is counted), allies and keepers directly.
function mendBody(run,body,amount,api){
  if(!(amount>0))return;
  if(body===run.player){api.heal(amount);return;}
  if(!(body.hp>0)||!Number.isFinite(body.maxHp)||body.downed)return;
  const healed=Math.max(0,Math.min(body.maxHp-body.hp,amount));body.hp+=healed;
  if(!body.ally&&healed>0)run.stats.npcHealing+=healed;
}
// Did a blade, burst or Dawn Pulse released this tick reach the unit? (Effects are born at age 0.)
function struck(run,unit,reach){
  const p=run.player;
  for(const fx of run.effects){
    if(fx.age!==0||!['slash','sunbreak','pulse'].includes(fx.kind))continue;
    const dx=unit.x-fx.x,dy=unit.y-fx.y,d=Math.hypot(dx,dy);
    if(fx.kind==='pulse'){if(d<210+reach)return true;continue;}
    const slash=fx.kind==='slash',range=slash?COMBAT.slash.range+(p.bladeRange||0)+(fx.combo===3?18:0):COMBAT.sunbreak.range,arc=slash?0.15:0.72;
    if(d<range+reach&&(d<1||(dx*Math.cos(fx.angle||0)+dy*Math.sin(fx.angle||0))/d>arc))return true;
  }
  return false;
}
function worldHazard(run,def,point,o){
  const warning=o.warning*(DIFFICULTIES[run.difficulty]||DIFFICULTIES.normal).warning;
  return {x:clamp(point.x,WORLD.left,WORLD.right),y:clamp(point.y,WORLD.top,WORLD.bottom),radius:o.radius,inner:0,kind:o.kind,family:HAZARD_FAMILIES[run.areaIndex]||'thorn',warning,total:warning,life:0.35,damage:o.damage,triggered:false,world:true,targets:o.targets,rule:def.id,unit:o.unit??null,phase:o.phase};
}
function burnFor(run,def,phase){const scale=(DIFFICULTIES[run.difficulty]||DIFFICULTIES.normal).damage;return phase==='kind'?def.kind.burn:def.hostile.burn*scale;}
function noticeHero(run,s,inside,name,api){
  const id=inside?inside.id:-1;
  if(id!==s.heroIn){s.heroIn=id;if(inside&&run.time-s.noticeAt>1.5){s.noticeAt=run.time;api.event(name);}}
}

/* ---------- Grasping Roots (Garden) ---------- */
function stepRoots(run,s,def,dt,api){
  noticeHero(run,s,unitAt(s,run.player),'rule-roots',api);
  if(s.phase==='hostile'){
    for(const e of run.enemies)if(e.hp>0&&!e.boss&&e.warning<=0&&e.hp<e.maxHp&&unitAt(s,e))e.hp=Math.min(e.maxHp,e.hp+(def.hostile.mend+e.maxHp*def.hostile.mendShare)*dt);
    return;
  }
  for(const body of partyBodies(run))if(unitAt(s,body))mendBody(run,body,(body===run.player?def.kind.hero:body.ally?def.kind.ally:def.kind.keeper)*dt,api);
}

/* ---------- The Echo (Causeway) ---------- */
function toll(run,s,def,x,y,reach,unit,api){
  s.toll++;s.waves.push({id:s.toll,x,y,r:0,reach,phase:s.phase,unit,born:run.time});api.event('rule-toll');
}
function echoTouch(run,s,def,body,wave){
  if(body.echoToll===wave.id||body.hp<=0)return;
  body.echoToll=wave.id;const friend=friendly(run,body);
  if(wave.phase==='hostile'){if(!friend)body.echoHaste=run.time+def.hostile.haste;return;}
  if(friend){body.echoQuick=run.time+def.kind.quick;return;}
  if(body.boss){body.echoDaze=run.time+def.kind.daze;return;}
  // A kind toll interrupts like a blade: wind-ups are lost and the Hollow reels.
  Object.assign(body,{stagger:Math.max(body.stagger||0,def.kind.stagger),attack:0,spell:0,charge:0,chargeWarning:0,attackKind:null});
  body.echoDaze=run.time+def.kind.stagger;
}
function stepEcho(run,s,def,dt,api){
  const bell=JOURNEY[run.areaIndex].landmark,t=def.toll;
  s.nextToll-=dt;
  if(s.nextToll<=0&&!run.gateOpen){
    s.nextToll=t.interval;toll(run,s,def,bell.x,bell.y,t.bellReach,null,api);
    for(const p of s.units)s.echoes.push({at:s.age+distance(bell,p)/t.speed,unit:p.id,id:s.toll});
  }
  // Each bell stone repeats the toll when its echo arrives; in the kind phase a blow rings it early.
  for(const echo of s.echoes)if(s.age>=echo.at){const p=s.units.find(u=>u.id===echo.unit);if(p){p.rang=run.time;s.waves.push({id:echo.id,x:p.x,y:p.y,r:0,reach:t.echoReach,phase:s.phase,unit:p.id,born:run.time});}}
  s.echoes=s.echoes.filter(echo=>s.age<echo.at);
  if(s.phase==='kind')for(const p of s.units)if(run.time>=p.readyAt&&struck(run,p,t.strikeReach)){p.readyAt=run.time+t.strikeCooldown;p.rang=run.time;toll(run,s,def,p.x,p.y,t.echoReach,p.id,api);}
  const bodies=[...partyBodies(run),...run.enemies.filter(e=>e.hp>0&&e.warning<=0)];
  for(const wave of s.waves){
    const before=wave.r;wave.r=Math.min(wave.reach,wave.r+t.speed*dt);
    if(before>=wave.reach)continue;
    for(const body of bodies){const d=distance(body,wave);if(d<wave.r&&d>=Math.min(before,wave.r)-1e-9)echoTouch(run,s,def,body,wave);}
  }
  // Waves fade for a moment after reaching their full reach.
  s.waves=s.waves.filter(wave=>wave.r<wave.reach||run.time-wave.born<wave.reach/t.speed+0.4);
}

/* ---------- Stillness (Court) ---------- */
function stepStill(run,s,def,dt,api){
  noticeHero(run,s,unitAt(s,run.player),'rule-still',api);
  if(s.phase!=='kind')return;
  // Light that passes through a column of remembered names strikes harder, once.
  for(const shot of run.shots)if(!shot.hostile&&!shot.named&&shot.life>0&&unitAt(s,shot)){shot.named=true;shot.damage*=def.kind.empower;}
}

/* ---------- Furnace Heat (Foundry) ---------- */
function erupt(run,s,def,vent,warning,api){
  const phase=s.phase,targets=phase==='kind'?'enemies':'all';
  const h=worldHazard(run,def,vent,{radius:def.vent.radius,warning,kind:'vent',damage:burnFor(run,def,phase),targets,unit:vent.id,phase});
  if(targets!=='enemies'&&!api.safe(h))return false;
  run.hazards.push(h);return true;
}
function stepHeat(run,s,def,dt,api){
  const v=def.vent,p=run.player;
  const pending=run.hazards.filter(h=>h.rule==='heat'&&!h.triggered),busy=id=>pending.some(h=>h.unit===id);
  for(const vent of s.units){
    vent.next-=dt;
    if(s.phase==='kind'&&run.time>=vent.readyAt&&!busy(vent.id)&&struck(run,vent,v.strikeReach)){
      if(erupt(run,s,def,vent,v.strikeWarning,api)){vent.readyAt=run.time+v.strikeCooldown;vent.next=Math.max(vent.next,v.period*0.5);continue;}
    }
    if(vent.next>0||busy(vent.id))continue;
    if(run.gateOpen||distance(vent,p)>v.reach||pending.length>=v.pending){vent.next=1+draw(run,s)*2;continue;}
    if(erupt(run,s,def,vent,v.warning,api)){pending.push(run.hazards.at(-1));vent.next=v.period+draw(run,s)*v.jitter;}
    else vent.next=1.5;
  }
  // A burst warms the party in the kind phase.
  for(const h of run.hazards)if(h.rule==='heat'&&h.triggered&&!h.resolved){
    h.resolved=true;const vent=s.units.find(u=>u.id===h.unit);if(vent)vent.burst=run.time;
    s.bursts.push({x:h.x,y:h.y,radius:h.radius,at:run.time,phase:h.targets==='enemies'?'kind':'hostile',kind:'vent'});api.event('rule-vent');
    if(h.targets==='enemies')for(const body of partyBodies(run))if(distance(body,h)<h.radius*1.15)mendBody(run,body,body===run.player?def.kind.hero:body.ally?def.kind.ally:def.kind.keeper,api);
  }
}

/* ---------- Falling Stars (Observatory) ---------- */
function starTarget(run,def){
  const p=run.player,live=run.enemies.filter(e=>e.hp>0&&e.warning<=0&&distance(e,p)<def.star.reach);
  let best=null,score=-1;
  for(const e of live){const near=live.filter(o=>distance(o,e)<def.star.cluster).length-distance(e,p)/10000;if(near>score){score=near;best=e;}}
  return best;
}
function stepStars(run,s,def,dt,api){
  const st=def.star,p=run.player;
  s.nextStar-=dt;
  if(s.nextStar<=0&&!run.gateOpen){
    if(s.phase==='hostile'){
      const a=draw(run,s)*TAU,r=Math.sqrt(draw(run,s))*st.scatter;
      const h=worldHazard(run,def,{x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r},{radius:st.radius,warning:st.warning,kind:'star',damage:burnFor(run,def,'hostile'),targets:'all',phase:'hostile'});
      if(api.safe(h)){run.hazards.push(h);s.nextStar=st.hostileEvery;}else s.nextStar=0.6;
    }else{
      const target=starTarget(run,def);
      if(target){run.hazards.push(worldHazard(run,def,target,{radius:st.radius+6,warning:st.warning,kind:'star',damage:burnFor(run,def,'kind'),targets:'enemies',phase:'kind'}));s.nextStar=st.kindEvery;}
      else s.nextStar=0.8;
    }
  }
  for(const h of run.hazards)if(h.rule==='stars'&&h.triggered&&!h.resolved){
    h.resolved=true;const kind=h.targets==='enemies';
    s.bursts.push({x:h.x,y:h.y,radius:h.radius,at:run.time,phase:kind?'kind':'hostile',kind:'star'});api.event('rule-star');
    if(kind)s.pools.push({x:h.x,y:h.y,radius:def.kind.pool,born:run.time,until:run.time+def.kind.poolLife});
  }
  // Fallen starlight mends the party standing in it.
  s.pools=s.pools.filter(pool=>run.time<pool.until&&!run.gateOpen);
  for(const pool of s.pools)for(const body of partyBodies(run))if(distance(body,pool)<pool.radius)mendBody(run,body,(body===run.player?def.kind.hero:body.ally?def.kind.ally:def.kind.keeper)*dt,api);
}

const STEPS={roots:stepRoots,echo:stepEcho,still:stepStill,heat:stepHeat,stars:stepStars};
export function stepEnvironment(run,dt,api){
  const s=ruleState(run);if(!s)return;
  const def=RULES[run.areaIndex];s.age+=dt;
  const phase=rulePhase(run);
  if(phase!==s.phase){
    s.phase=phase;
    if(phase==='kind'){
      s.flippedAt=run.time;api.event('rule-flip');
      // Strikes already falling change sides with the rule.
      for(const h of run.hazards)if(h.world&&!h.triggered&&h.targets!=='enemies'){h.targets='enemies';h.phase='kind';h.damage=def.kind?.burn??h.damage;}
    }
  }
  s.bursts=s.bursts.filter(b=>run.time-b.at<1.4);
  STEPS[def.id]?.(run,s,def,dt,api);
}

/* ---------- Multipliers read by the simulation ---------- */
export function speedFactor(run,body){
  const s=currentRule(run);if(!s||!body)return 1;
  const def=RULES[run.areaIndex];
  if(s.id==='roots'){
    if(!unitAt(s,body))return 1;
    if(s.phase==='hostile')return body.boss?def.hostile.bossSlow:def.hostile.slow;
    return friendly(run,body)?def.kind.slow:body.boss?def.kind.bossHold:def.kind.hold;
  }
  if(s.id==='echo'){
    if(friendly(run,body))return body.echoQuick>run.time?def.kind.speed:1;
    return body.echoHaste>run.time?(body.boss?def.hostile.bossSpeed:def.hostile.speed):1;
  }
  return 1;
}
export function damageFactor(run,target){
  const s=currentRule(run);if(!s||!target||s.id!=='still'||s.phase!=='kind'||!unitAt(s,target))return 1;
  const def=RULES[run.areaIndex];
  return friendly(run,target)?def.kind.guard:target.boss?1:def.kind.exposed;
}
export function shotSpeedFactor(run,shot){
  const s=currentRule(run);if(!s||!shot||s.id!=='still'||!unitAt(s,shot))return 1;
  const def=RULES[run.areaIndex];
  return shot.hostile?def.shots.hostile:s.phase==='hostile'?def.shots.friendly:1;
}
export function castFactor(run,enemy){
  const s=currentRule(run);if(!s||!enemy)return 1;
  const def=RULES[run.areaIndex];
  if(s.id==='still'&&s.phase==='hostile'&&unitAt(s,enemy))return enemy.boss?def.hostile.bossCast:def.hostile.cast;
  if(s.id==='echo'){
    if(enemy.echoHaste>run.time)return enemy.boss?def.hostile.bossCast:def.hostile.cast;
    if(enemy.boss&&enemy.echoDaze>run.time)return def.kind.bossCast;
  }
  return 1;
}
// The current map rule for the HUD: {id,name,phase:'hostile'|'kind',label,text,icon,flipStage,flip} or null.
export function ruleStatus(run){
  const def=RULES[run?.areaIndex];if(!def)return null;
  const phase=rulePhase(run);
  return {id:def.id,name:def.name,phase,label:RULE_LABELS[phase],text:def.text[phase],icon:def.icon,flipStage:def.flipStage,flip:def.flip};
}
