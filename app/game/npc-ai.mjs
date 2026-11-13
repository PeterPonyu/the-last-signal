import {NPC_COMBAT} from '../../content/campaign.mjs';
import {WORLD} from '../../content/game.mjs';
import {distance,clearPath,clamp} from './geometry.mjs';
import {areaObstacles,failRoute} from './progression.mjs';
import {alliedTarget,faceToward,moveAlly} from './ally-ai.mjs';

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

export function supportTarget(run,body,range=400){
 const targets=[{id:'hero',body:run.player},...activeNpcs(run).map(n=>({id:n.id,body:n}))];
 return targets.filter(t=>t.body.hp<t.body.maxHp&&distance(t.body,body)<range&&clearPath(body,t.body,areaObstacles(run),3)).sort((a,b)=>a.body.hp/a.body.maxHp-b.body.hp/b.body.maxHp)[0]||null;
}

function dodgeGoal(run,npc){
 if(npc.evadeGoal&&run.time<npc.evadeUntil)return npc.evadeGoal;
 npc.evadeGoal=null;
 const danger=point=>run.hazards.some(h=>h.life>0&&!h.triggered&&h.warning<1.4&&distance(point,h)<h.radius+24&&distance(point,h)>=Math.max(0,(h.inner||0)-24));
 if(!danger(npc))return null;
 const obstacles=areaObstacles(run),candidates=[];
 for(const radius of [70,130,190])for(let i=0;i<12;i++){
  const angle=i*Math.PI/6,p={x:clamp(npc.x+Math.cos(angle)*radius,WORLD.left,WORLD.right),y:clamp(npc.y+Math.sin(angle)*radius,WORLD.top,WORLD.bottom)};
  if(!danger(p)&&clearPath(npc,p,obstacles,22))candidates.push(p);
 }
 npc.evadeGoal=candidates.sort((a,b)=>distance(npc,a)+distance(run.player,a)*0.25-distance(npc,b)-distance(run.player,b)*0.25)[0]||null;
 npc.evadeUntil=run.time+Math.min(2,Math.max(0,...run.hazards.filter(h=>h.life>0&&!h.triggered&&distance(npc,h)<h.radius+24).map(h=>h.warning+h.life+0.15)));
 return npc.evadeGoal;
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
