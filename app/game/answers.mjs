// Answers of the Light: skills known, offers, applying a chosen card, and passive gifts.
// Owned by the answers worker. The simulation calls the gift hooks with an api of engine functions.
// Gift state lives in run.gifts (plain data, reset per map); per-Hollow gift marks live on the
// enemy (giftBurn, giftOrbitAt, giftEmberAt). Hits from gifts use the source 'gift' (ranged
// against guards) except blades, which strike as 'gift-blade' (they break guards but never stagger); skill evolutions keep their skill's source.
import {COMBAT} from '../../content/game.mjs';
import {upgradeChoices,knowsSkill} from '../../content/answers.mjs';
import {distance,clearPath,segmentCircleTime} from './geometry.mjs';
import {areaObstacles} from './progression.mjs';

export const SKILLS=['slash','dash','pulse','sunbreak','solarLance'];
// Zeyu starts every journey with Sunblade, Dash and Sunshard (automatic); the rest are answers.
export const LEARNED_SKILLS=['pulse','sunbreak','solarLance'];
export function startingSkills(){return Object.fromEntries(SKILLS.map(name=>[name,!LEARNED_SKILLS.includes(name)]));}
// Synthetic test runs without a skill table know every skill.
export function knows(run,name){return knowsSkill(run,name);}
export function answerChoices(run){return upgradeChoices(run);}
export function giftLevel(run,id){return run?.upgrades?.[id]||0;}

// Tuning shared by the simulation and the gift visuals (world units and seconds).
export const ORBIT={radius:78,speed:3.4,reach:16,every:0.8};
export const COMET={interval:6,reach:560,delay:0.65,radius:85,damage:70,scale:1.6,splash:0.5};
export const EMBER={spacing:26,radius:30,life:2.2,every:0.4,cap:30};
export const BLOOM={chance:[0,0.2,0.32],heal:[0,10,14],life:12,reach:40,cap:10};
const WIDE_DAWN={from:210,reach:295};
const CHAIN={reach:240,share:0.6,fade:0.8};
export const BURN={every:0.5,life:3};
const SCAR={ahead:150,radius:115,life:3,every:0.5};
const LINE={width:30,life:2.5,every:0.5};
const PRISM={spread:0.3,range:520,share:0.6};
const AFTERSHOCK={delay:0.35,share:0.6};

// One free reroll per map. run.answers = {rerolls (all so far), rerollMap (map of the last reroll),
// avoid ({level,ids}: the offer the reroll replaced)}.
export function canReroll(run){return run?.mode==='upgrade'&&(run.answers?.rerollMap??-1)!==run.areaIndex&&answerChoices(run).length>0;}
export function rerollAnswers(run,api){
  if(!canReroll(run))return false;
  const ids=answerChoices(run).map(card=>card.id),answers=run.answers||(run.answers={rerolls:0,rerollMap:-1,avoid:null});
  answers.rerolls=(answers.rerolls||0)+1;answers.rerollMap=run.areaIndex;answers.avoid={level:run.level,ids};run.offer=null;
  emit(run,api,'reroll');return true;
}

function emit(run,api,name){if(api?.event)api.event(name);else run.events?.push(name);}
function effect(run,api,fx){if(api?.effect)api.effect(fx);else run.effects?.push(fx);}
// Gift sounds are spaced so a crowd of hits plays one voice, not a stack.
function sound(run,api,g,name,gap){if(run.time-(g.sounds[name]??-Infinity)<gap)return;g.sounds[name]=run.time;emit(run,api,name);}
function hash(...values){
  let h=0x9e3779b9;
  for(const value of values){h=Math.imul(h^(value>>>0),0x85ebca6b)>>>0;h^=h>>>13;h=Math.imul(h,0xc2b2ae35)>>>0;h^=h>>>16;}
  return (h>>>0)/4294967296;
}
function freshState(run){
  return {area:run.areaIndex,cometClock:COMET.interval,comets:[],embers:[],petals:[],zones:[],queue:[],dashHits:[],emberGap:0,
    pulseCd:0,dashCd:0,sounds:{},dealt:{}};
}
// Gift state for the current map; ground marks, petals and pending strikes do not travel.
export function giftState(run){
  let g=run.gifts;
  if(!g||typeof g!=='object'){g=run.gifts=freshState(run);return g;}
  if(g.area!==run.areaIndex)Object.assign(g,{area:run.areaIndex,comets:[],embers:[],petals:[],zones:[],queue:[],dashHits:[],emberGap:0,pulseCd:0,dashCd:0,cometClock:Math.min(g.cometClock??COMET.interval,COMET.interval)});
  return g;
}
// Every gift hit goes through the engine's hit(); the damage it really dealt is kept per gift.
function strike(run,api,g,id,enemy,amount,source){
  if(!(amount>0)||enemy.hp<=0)return;
  const before=enemy.hp;api.hit(enemy,amount,source);
  g.dealt[id]=(g.dealt[id]||0)+Math.max(0,before-enemy.hp);
}
const live=e=>e.hp>0&&!(e.warning>0);
function inCone(origin,angle,e,range,arc){
  const ex=e.x-origin.x,ey=e.y-origin.y,d=Math.hypot(ex,ey);
  return d<range&&(d<1||(ex*Math.cos(angle)+ey*Math.sin(angle))/d>arc);
}
function segmentDistance(z,e){
  const dx=z.x2-z.x,dy=z.y2-z.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((e.x-z.x)*dx+(e.y-z.y)*dy)/length)):0;
  return Math.hypot(e.x-(z.x+dx*t),e.y-(z.y+dy*t));
}

export function applyAnswer(run,choice,api){
  const card=answerChoices(run).find(c=>c.id===choice);if(!card)return false;
  const p=run.player;run.upgrades||={};run.upgrades[choice]=(run.upgrades[choice]||0)+1;
  if(choice==='radiance')p.damage*=1.28;
  if(choice==='resolve'){p.maxHp+=20;api.heal(45);}
  if(choice==='stride'){p.speed=Math.min(285,p.speed*1.1);p.dashInterval*=0.85;}
  if(choice==='volley')p.volley=true;
  if(choice==='focus')p.fireRange+=90;
  if(choice==='tempo')p.fireInterval*=0.88;
  if(choice==='edge')p.bladePower+=0.25;
  if(choice==='cleave'){p.bladeRange+=24;p.bladeArc+=0.18;}
  if(choice==='flow'){p.bladeCooldown*=0.85;p.breakCooldown*=0.88;}
  if(choice==='finisher')p.finisher=true;
  if(choice==='ward')p.wardLevel++;
  if(choice==='mend'){p.mendBonus+=8;p.mendInterval-=3;}
  if(card.skill){
    if(p.skills)p.skills[card.skill]=true;
    emit(run,api,'skill-learned');effect(run,api,{kind:'gift-learn',skill:card.skill,x:p.x,y:p.y,age:0,life:1.1});
  }
  // The first comet answers soon after the call is learned.
  if(choice==='comet'){const g=giftState(run);g.cometClock=Math.min(g.cometClock,2);}
  return true;
}

/* ---------- Skill evolutions: they read the hero's own releases this tick ---------- */
function onPulse(run,api,g,at){
  const p=run.player;
  if(giftLevel(run,'wide-dawn')){
    for(const e of run.enemies){const d=distance(e,at);if(live(e)&&d>=WIDE_DAWN.from&&d<WIDE_DAWN.reach)strike(run,api,g,'wide-dawn',e,85+p.damage,'pulse');}
    run.shots=run.shots.filter(s=>!s.hostile||distance(s,at)>WIDE_DAWN.reach);
    effect(run,api,{kind:'gift-wave',x:at.x,y:at.y,from:WIDE_DAWN.from,radius:WIDE_DAWN.reach,age:0,life:0.8});
  }
  if(giftLevel(run,'dawn-aegis')){p.shield=Math.max(p.shield||0,30);p.shieldTime=Math.max(p.shieldTime||0,6);emit(run,api,'ward');}
}
function onSunbreak(run,api,g,fx){
  const p=run.player,angle=fx.angle??Math.atan2(p.faceY||0,p.faceX||1);
  if(giftLevel(run,'aftershock'))g.queue.push({kind:'aftershock',at:run.time+AFTERSHOCK.delay,x:fx.x,y:fx.y,angle,damage:(65+p.damage*1.2)*p.bladePower*AFTERSHOCK.share});
  if(giftLevel(run,'sunscar'))g.zones.push({kind:'scar',x:fx.x+Math.cos(angle)*SCAR.ahead,y:fx.y+Math.sin(angle)*SCAR.ahead,r:SCAR.radius,age:0,life:SCAR.life,clock:SCAR.every,damage:6+p.damage*0.25});
}
function beamTip(origin,angle,range,obstacles){
  const bx=origin.x+Math.cos(angle)*range,by=origin.y+Math.sin(angle)*range;
  let stop=1;for(const o of obstacles){const t=segmentCircleTime(origin.x,origin.y,bx,by,o.x,o.y,o.radius+4);if(t!==null)stop=Math.min(stop,t);}
  return {x:origin.x+(bx-origin.x)*stop,y:origin.y+(by-origin.y)*stop,reach:range*stop};
}
function onLance(run,api,g,fx){
  const p=run.player,obstacles=areaObstacles(run),origin={x:fx.x,y:fx.y},angle=fx.angle??0,reach=Number.isFinite(fx.reach)?fx.reach:COMBAT.solarLance.range;
  const main={x:origin.x+Math.cos(angle)*reach,y:origin.y+Math.sin(angle)*reach};
  if(giftLevel(run,'prism')){
    // Side beams spare the Hollow the main beam already crossed.
    const crossed=new Set(run.enemies.filter(e=>segmentCircleTime(origin.x,origin.y,main.x,main.y,e.x,e.y,e.radius+24)!==null).map(e=>e.id));
    for(const side of [-1,1]){
      const a=angle+side*PRISM.spread,tip=beamTip(origin,a,PRISM.range,obstacles);
      for(const e of run.enemies)if(live(e)&&!crossed.has(e.id)&&segmentCircleTime(origin.x,origin.y,tip.x,tip.y,e.x,e.y,e.radius+20)!==null&&clearPath(origin,e,obstacles,0)){crossed.add(e.id);strike(run,api,g,'prism',e,(80+p.damage*0.8)*PRISM.share,'sunbreak');}
      effect(run,api,{kind:'gift-prism',x:origin.x,y:origin.y,angle:a,reach:tip.reach,age:0,life:0.5});
    }
  }
  if(giftLevel(run,'searing-line'))g.zones.push({kind:'line',x:origin.x,y:origin.y,x2:main.x,y2:main.y,r:LINE.width,age:0,life:LINE.life,clock:LINE.every,damage:6+p.damage*0.2});
}
function onFinisher(run,api,fx){
  const p=run.player,a=fx.angle??Math.atan2(p.faceY||0,p.faceX||1);
  api.shoot(p,{x:p.x+Math.cos(a)*100,y:p.y+Math.sin(a)*100},(30+p.damage*0.8)*p.bladePower,'gift',false,0,{pierce:4,hitIds:[],wave:true});
}
// The hero's skill releases are found by their fresh effects (age 0 this tick) at the hero's side;
// Dawn Pulse is confirmed by its cooldown restarting, so no other caster's burst can trigger it.
function readReleases(run,api,g){
  const p=run.player,near=fx=>Math.hypot(fx.x-p.x,fx.y-p.y)<60;
  const fresh=run.effects.filter(fx=>fx.age===0&&!fx.giftSeen&&['pulse','sunbreak','solar-lance','slash'].includes(fx.kind));
  if((p.pulseCooldown||0)>g.pulseCd+1e-9){
    const burst=fresh.filter(fx=>fx.kind==='pulse').sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    if(burst)burst.giftSeen=true;
    onPulse(run,api,g,burst?{x:burst.x,y:burst.y}:{x:p.x,y:p.y});
  }
  for(const fx of fresh){
    if(fx.giftSeen||fx.kind==='pulse'||!near(fx))continue;
    fx.giftSeen=true;
    if(fx.kind==='sunbreak')onSunbreak(run,api,g,fx);
    else if(fx.kind==='solar-lance')onLance(run,api,g,fx);
    else if(fx.kind==='slash'&&fx.combo===3&&giftLevel(run,'crescent'))onFinisher(run,api,fx);
  }
}

/* ---------- Passive gifts ---------- */
// Blade positions follow the clock, so the simulation and the renderer agree on them.
export function orbitBlades(run){
  const level=giftLevel(run,'orbit');if(!level||!run.player)return [];
  const p=run.player,count=level+1,base=(run.time||0)*ORBIT.speed;
  return Array.from({length:count},(_,i)=>{const a=base+i*Math.PI*2/count;return {x:p.x+Math.cos(a)*ORBIT.radius,y:p.y+Math.sin(a)*ORBIT.radius,angle:a};});
}
function stepOrbit(run,api,g){
  const level=giftLevel(run,'orbit');if(!level)return;
  const p=run.player,blades=orbitBlades(run),obstacles=areaObstacles(run),damage=(8+p.damage*0.3)*p.bladePower*(level>1?1.2:1);
  for(const e of run.enemies){
    if(!live(e)||run.time-(e.giftOrbitAt??-Infinity)<ORBIT.every)continue;
    const blade=blades.find(b=>distance(b,e)<e.radius+ORBIT.reach);
    if(!blade||!clearPath(p,e,obstacles,0))continue;
    e.giftOrbitAt=run.time;
    effect(run,api,{kind:'gift-orbit',x:e.x,y:e.y,angle:blade.angle+Math.PI/2,age:0,life:0.28});
    strike(run,api,g,'orbit',e,damage,'gift-blade');sound(run,api,g,'gift-orbit',0.3);
  }
}
function stepDash(run,api,g){
  const p=run.player;
  if((p.dashCooldown||0)>g.dashCd+1e-9){g.dashHits=[];g.emberGap=EMBER.spacing;}
  if(!(p.dash>0))return;
  const ax=Number.isFinite(p.previousX)?p.previousX:p.x,ay=Number.isFinite(p.previousY)?p.previousY:p.y,length=Math.hypot(p.x-ax,p.y-ay);
  if(giftLevel(run,'ember-step')){
    // Embers fall every few steps along the dash, from where it started.
    let along=EMBER.spacing-g.emberGap;
    for(;along<=length;along+=EMBER.spacing){const k=length?along/length:0;g.embers.push({x:ax+(p.x-ax)*k,y:ay+(p.y-ay)*k,age:0,life:EMBER.life});}
    g.emberGap=length-(along-EMBER.spacing);
    if(g.embers.length>EMBER.cap)g.embers.splice(0,g.embers.length-EMBER.cap);
  }
  if(giftLevel(run,'mirage')){
    const angle=Math.atan2(p.y-ay,p.x-ax);
    for(const e of run.enemies){
      if(!live(e)||g.dashHits.includes(e.id)||segmentCircleTime(ax,ay,p.x,p.y,e.x,e.y,e.radius+26)===null)continue;
      g.dashHits.push(e.id);effect(run,api,{kind:'gift-cut',x:e.x,y:e.y,angle,age:0,life:0.28});
      strike(run,api,g,'mirage',e,(25+p.damage*0.8)*p.bladePower,'gift-blade');
    }
  }
}
function stepEmbers(run,api,g,dt){
  for(const ember of g.embers)ember.age+=dt;
  g.embers=g.embers.filter(ember=>ember.age<ember.life);
  if(!g.embers.length)return;
  const damage=5+run.player.damage*0.2;
  for(const e of run.enemies){
    if(!live(e)||run.time-(e.giftEmberAt??-Infinity)<EMBER.every)continue;
    if(!g.embers.some(ember=>distance(ember,e)<EMBER.radius+e.radius*0.6))continue;
    e.giftEmberAt=run.time;strike(run,api,g,'ember-step',e,damage,'gift');
  }
}
// The strongest Hollow near Zeyu: most health left, ties to the earliest arrival.
function strongest(run){
  let best=null;
  for(const e of run.enemies)if(live(e)&&distance(e,run.player)<COMET.reach&&(!best||e.hp>best.hp||e.hp===best.hp&&e.id<best.id))best=e;
  return best;
}
function stepComets(run,api,g,dt){
  if(giftLevel(run,'comet')){
    g.cometClock-=dt;
    if(g.cometClock<=0){const target=strongest(run);if(target){g.comets.push({x:target.x,y:target.y,targetId:target.id,age:0,delay:COMET.delay});g.cometClock=COMET.interval;}else g.cometClock=0;}
  }
  const p=run.player,landed=[];
  for(const comet of g.comets){
    comet.age+=dt;
    // The mark follows its Hollow, then holds still for the last quarter so the strike reads.
    const target=run.enemies.find(e=>e.id===comet.targetId&&e.hp>0);
    if(target&&comet.age<comet.delay*0.75){comet.x=target.x;comet.y=target.y;}
    if(comet.age<comet.delay)continue;
    landed.push(comet);
    const damage=COMET.damage+p.damage*COMET.scale;
    for(const e of [...run.enemies])if(live(e)&&distance(e,comet)<COMET.radius+e.radius*0.5)strike(run,api,g,'comet',e,damage*(e.id===comet.targetId?1:COMET.splash),'gift');
    effect(run,api,{kind:'gift-comet',x:comet.x,y:comet.y,age:0,life:0.9});emit(run,api,'gift-comet');
  }
  if(landed.length)g.comets=g.comets.filter(comet=>!landed.includes(comet));
}
function stepZones(run,api,g,dt){
  for(const zone of g.zones){
    zone.age+=dt;zone.clock-=dt;
    if(zone.clock>0||zone.age>zone.life)continue;
    zone.clock+=zone.kind==='scar'?SCAR.every:LINE.every;
    const id=zone.kind==='scar'?'sunscar':'searing-line';
    for(const e of [...run.enemies]){
      if(!live(e))continue;
      const inside=zone.kind==='scar'?distance(e,zone)<zone.r+e.radius*0.5:segmentDistance(zone,e)<zone.r+e.radius*0.5;
      if(inside)strike(run,api,g,id,e,zone.damage,'gift');
    }
  }
  g.zones=g.zones.filter(zone=>zone.age<zone.life);
}
function stepQueue(run,api,g){
  const due=g.queue.filter(q=>run.time>=q.at);if(!due.length)return;
  g.queue=g.queue.filter(q=>run.time<q.at);
  const obstacles=areaObstacles(run);
  for(const q of due){
    for(const e of [...run.enemies])if(live(e)&&inCone(q,q.angle,e,COMBAT.sunbreak.range,0.72)&&clearPath(q,e,obstacles,0))strike(run,api,g,'aftershock',e,q.damage,'sunbreak');
    effect(run,api,{kind:'gift-aftershock',x:q.x,y:q.y,angle:q.angle,age:0,life:0.5});emit(run,api,'sunbreak');
  }
}
function stepBurns(run,api,g){
  for(const e of [...run.enemies]){
    const burn=e.giftBurn;if(!burn)continue;
    if(e.hp<=0||run.time>=burn.until+1e-9){e.giftBurn=null;continue;}
    if(run.time+1e-9>=burn.next){burn.next+=BURN.every;strike(run,api,g,burn.id||'fox-fire',e,burn.dps*BURN.every,'gift');}
  }
}
function stepPetals(run,api,g,dt){
  const p=run.player;
  for(const petal of g.petals){
    petal.age+=dt;
    if(petal.age<petal.life&&p.hp>0&&distance(petal,p)<BLOOM.reach){
      petal.age=petal.life;api.heal(petal.heal);
      effect(run,api,{kind:'gift-bloom',x:p.x,y:p.y,age:0,life:0.6});emit(run,api,'gift-bloom');
    }
  }
  g.petals=g.petals.filter(petal=>petal.age<petal.life);
}
const COOLDOWNS=['slashCooldown','dashCooldown','pulseCooldown','sunbreakCooldown','solarLanceCooldown'];
export function giftsStep(run,dt,api){
  if(run.mode!=='running'||!run.player)return;
  const g=giftState(run),p=run.player;
  readReleases(run,api,g);
  stepDash(run,api,g);
  stepOrbit(run,api,g);
  stepComets(run,api,g,dt);
  stepZones(run,api,g,dt);
  stepEmbers(run,api,g,dt);
  stepBurns(run,api,g);
  stepQueue(run,api,g);
  stepPetals(run,api,g,dt);
  if(giftLevel(run,'ascendant'))for(const key of COOLDOWNS)if(p[key]>0)p[key]=Math.max(0,p[key]-dt*0.25);
  g.pulseCd=p.pulseCooldown||0;g.dashCd=p.dashCooldown||0;
}

/* ---------- Hit and defeat hooks ---------- */
// Allied hit sources: the Dawnweaver ('ally'), Sol ('sol'), recruits and keepers ('npc').
const ALLY_SOURCES=['ally','sol','npc'];
// Kindred Light: allied hits land 30% harder (applied inside the hit, before guards and the kill check).
export function giftDamageFactor(run,source){return ALLY_SOURCES.includes(source)&&giftLevel(run,'kindred')?1.3:1;}
// Gift hits never start further gift hits: the guard stops every chain after one hop of hooks.
let depth=0;
function chainFrom(run,api,g,id,from,amount,jumps,ally){
  const obstacles=areaObstacles(run),visited=[from.id];let at=from;
  for(let jump=0;jump<jumps;jump++){
    let next=null,best=CHAIN.reach;
    for(const e of run.enemies){if(!live(e)||visited.includes(e.id))continue;const d=distance(at,e);if(d<best&&clearPath(at,e,obstacles,3)){best=d;next=e;}}
    if(!next)break;
    visited.push(next.id);
    effect(run,api,{kind:'gift-chain',x:at.x,y:at.y,tx:next.x,ty:next.y,ally,age:0,life:0.3});
    strike(run,api,g,id,next,amount,'gift');
    at={id:next.id,x:next.x,y:next.y};amount*=CHAIN.fade;
  }
  if(visited.length>1)sound(run,api,g,'gift-chain',0.12);
}
export function giftsOnHit(run,enemy,source,dealt,api){
  if(depth>0||!run?.player||!enemy)return;
  depth++;
  try{
    const g=giftState(run),p=run.player;
    if(source==='hero'&&giftLevel(run,'chain'))chainFrom(run,api,g,'chain',enemy,p.damage*CHAIN.share,giftLevel(run,'chain'),false);
    if((source==='ally'||source==='npc')&&giftLevel(run,'starthread'))chainFrom(run,api,g,'starthread',enemy,Math.max(dealt,8)*CHAIN.share,1,true);
    if(source==='sol'&&giftLevel(run,'fox-fire')&&enemy.hp>0){
      const burn=enemy.giftBurn;
      enemy.giftBurn={id:'fox-fire',until:run.time+BURN.life,next:burn?burn.next:run.time+BURN.every,dps:6+p.damage*0.24};
    }
  }finally{depth--;}
}
export function giftsOnKill(run,enemy,source,api){
  if(!run?.player||!enemy)return;
  const g=giftState(run),p=run.player;
  const bloom=giftLevel(run,'bloom');
  if(bloom&&(enemy.boss||hash(run.initialSeed??0,enemy.id??0,0xb1005)<BLOOM.chance[Math.min(bloom,2)])){
    g.petals.push({x:enemy.x,y:enemy.y,age:0,life:BLOOM.life,heal:BLOOM.heal[Math.min(bloom,2)]});
    if(g.petals.length>BLOOM.cap)g.petals.splice(0,g.petals.length-BLOOM.cap);
  }
  if(giftLevel(run,'halo')){p.shield=Math.max(p.shield||0,Math.min(40,(p.shield||0)+4));p.shieldTime=Math.max(p.shieldTime||0,6);}
  if(source==='hero'&&giftLevel(run,'split')&&!run.gateOpen){
    // Three shards leave the fallen Hollow, aimed at the nearest others, or fanned out ahead.
    const obstacles=areaObstacles(run),heading=Math.atan2(enemy.y-p.y,enemy.x-p.x);
    const targets=run.enemies.filter(e=>live(e)&&e!==enemy&&distance(e,enemy)<320&&clearPath(enemy,e,obstacles,3)).sort((a,b)=>distance(a,enemy)-distance(b,enemy)||a.id-b.id).slice(0,3);
    for(let i=0;i<3;i++){
      const a=heading+(i-1)*2*Math.PI/3,aim=targets[i]||{x:enemy.x+Math.cos(a)*100,y:enemy.y+Math.sin(a)*100};
      api.shoot(enemy,aim,p.damage*0.5,'gift',false,0,{split:true});
    }
    effect(run,api,{kind:'gift-split',x:enemy.x,y:enemy.y,age:0,life:0.3});
  }
}
