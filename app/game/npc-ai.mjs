import {NPC_COMBAT} from '../../content/campaign.mjs';
import {WORLD} from '../../content/game.mjs';
import {distance,clearPath,clamp} from './geometry.mjs';
import {areaObstacles,failRoute} from './progression.mjs';
import {alliedTarget,faceToward,moveAlly,standingAllies} from './ally-ai.mjs';

export const activeNpcs=run=>run.campaign.npcs.filter(n=>n.state==='active'&&n.hp>0);

export function hurtNpc(run,npc,amount){
 if(npc.state!=='active'||npc.hp<=0||npc.invulnerable>0||run.mode!=='running'||run.gateOpen)return;
 const blocked=Math.min(npc.shield||0,amount);npc.shield-=blocked;amount-=blocked;
 if(blocked)run.effects.push({kind:'ward',x:npc.x,y:npc.y,age:0,life:0.35});
 const damage=Math.min(npc.hp,Math.max(0,amount));npc.hp-=damage;npc.invulnerable=0.75;npc.hit=0.3;run.stats.npcDamageTaken+=damage;
 if(damage>0)run.effects.push({kind:'damage',keeper:true,x:npc.x,y:npc.y-110,value:Math.ceil(damage),age:0,life:0.65});
 if(npc.hp===0)failRoute(run,npc);
}

export function shieldNpc(run,npc,amount=24){
 if(npc.state!=='active'||npc.hp<=0)return;
 npc.shield=Math.max(npc.shield,amount);npc.shieldTime=4;
 run.effects.push({kind:'ward',x:npc.x,y:npc.y,age:0,life:0.6});
}

// The most hurt friend within range. Zeyu and active keepers come first whenever one is below `limit` of its
// health; only when none is does a fellow ally below 60 % get the support (a downed ally returns on its own).
export function supportTarget(run,body,range=400,limit=1){
 const obstacles=areaObstacles(run),share=t=>t.body.hp/t.body.maxHp;
 const pick=list=>list.filter(t=>distance(t.body,body)<range&&clearPath(body,t.body,obstacles,3)).sort((a,b)=>share(a)-share(b))[0]||null;
 return pick([{id:'hero',body:run.player},...activeNpcs(run).map(n=>({id:n.id,body:n}))].filter(t=>t.body.hp<t.body.maxHp*limit))
  ||pick(standingAllies(run).filter(a=>a!==body&&a.hp<a.maxHp*0.6).map(a=>({id:a.id,body:a})));
}

// Ground warnings that can hurt friends; a map rule's marks that strike only Hollow are no danger.
const harmful=h=>h.life>0&&!h.triggered&&h.targets!=='enemies';
// A safe point to step to while a ground warning is about to land under `body` (keepers and allies).
export function dodgeGoal(run,body){
 const near=(point,h,margin)=>distance(point,h)<h.radius+margin&&distance(point,h)>=Math.max(0,(h.inner||0)-margin);
 const danger=point=>run.hazards.some(h=>harmful(h)&&h.warning<1.4&&near(point,h,24));
 // Keepers hold their escape spot until the strike has passed; an ally that reached it fights on as soon as
 // no pending mark lies close by, instead of waiting out the whole timer while the party moves on.
 if(body.evadeGoal&&run.time<body.evadeUntil&&(!body.ally||distance(body,body.evadeGoal)>6||run.hazards.some(h=>harmful(h)&&near(body,h,64))))return body.evadeGoal;
 body.evadeGoal=null;
 if(!danger(body))return null;
 const obstacles=areaObstacles(run),candidates=[];
 for(const radius of [70,130,190])for(let i=0;i<12;i++){
  const angle=i*Math.PI/6,p={x:clamp(body.x+Math.cos(angle)*radius,WORLD.left,WORLD.right),y:clamp(body.y+Math.sin(angle)*radius,WORLD.top,WORLD.bottom)};
  if(!danger(p)&&clearPath(body,p,obstacles,22))candidates.push(p);
 }
 body.evadeGoal=candidates.sort((a,b)=>distance(body,a)+distance(run.player,a)*0.25-distance(body,b)-distance(run.player,b)*0.25)[0]||null;
 body.evadeUntil=run.time+Math.min(2,Math.max(0,...run.hazards.filter(h=>harmful(h)&&distance(body,h)<h.radius+24).map(h=>h.warning+h.life+0.15)));
 return body.evadeGoal;
}

export function updateNpcCombat(run,dt,shoot){
 for(const npc of activeNpcs(run)){
  const profile=NPC_COMBAT[npc.body];
  for(const key of ['invulnerable','hit','shieldTime','fireClock'])npc[key]=Math.max(0,npc[key]-dt);
  if(npc.shieldTime===0)npc.shield=0;
  const before=npc.cast;npc.cast=Math.max(0,npc.cast-dt);
  if(before>0.28&&npc.cast<=0.28){
   const target=run.enemies.find(e=>e.id===npc.targetId&&e.hp>0);
   if(target&&clearPath(npc,target,areaObstacles(run),3)){shoot(run,npc,target,profile.damage,'npc');run.stats.npcCasts++;}
  }
  const escape=dodgeGoal(run,npc);npc.evading=!!escape;
  if(escape){npc.cast=0;moveAlly(npc,escape,areaObstacles(run),dt,{speed:155,start:4,stop:3});continue;}
  if(npc.cast>0||npc.fireClock>0)continue;
  const target=alliedTarget(run.enemies,npc,profile.range,areaObstacles(run),npc);
  if(target){npc.cast=0.6;npc.targetId=target.id;npc.fireClock=profile.interval;npc.moving=false;faceToward(npc,target.x-npc.x,target.y-npc.y);}
 }
}
