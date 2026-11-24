// The hero's party: the Dawnweaver, Sol and recruited keepers. Owned by the party worker.
// The simulation calls stepParty once per tick with an api of engine functions
// (shoot, hit, heal, hurtFriendly, nearestTarget, random, spawn, safe, effect, event).
// Every ally has health, short hit invulnerability and shields; at 0 health it is downed and returns at half
// health on its own or sooner with Zeyu beside it. Allies FOLLOW in formation, ENGAGE Hollow near Zeyu by role
// inside a leash, and RETURN when the leash breaks or the fight goes quiet. Ground warnings are dodged.
import {AREAS,COMBAT,DIFFICULTIES} from '../../content/game.mjs';
import {CAMPAIGN,NPC_COMBAT} from '../../content/campaign.mjs';
import {PARTY,STANCES,RECRUIT_ROLES,ALLY_ROLES,RECRUIT_SKILLS} from '../../content/party.mjs';
import {clamp,distance,clearPath,moveBody} from './geometry.mjs';
import {areaObstacles} from './progression.mjs';
import {speedFactor} from './environment.mjs';
import {faceToward,moveAlly,formationTarget,alliedTarget,allyBodies,standingAllies,rolePick,fightSpot,separateAllies} from './ally-ai.mjs';
import {activeNpcs,shieldNpc,supportTarget,dodgeGoal} from './npc-ai.mjs';

const vitals=health=>({hp:health,maxHp:health,baseHp:health,invulnerable:0,hit:0,shield:0,shieldTime:0,quiet:0,resting:false,downed:false,downAge:0,revive:0,reviveIn:0,assisted:false,rise:0,deathAge:0,mode:'follow',calm:0,fit:''});
export function createParty(spawn=AREAS[0].spawn){
  const companion={id:'dawnweaver',ally:true,kind:'companion',x:spawn.x-50,y:spawn.y+60,faceX:1,moving:false,walkPhase:0,idlePhase:0,cast:0,casts:0,moonCast:false,mend:0,ward:0,targetId:null,fireClock:0.7,mendCooldown:14,nova:0,novaCooldown:5,...vitals(PARTY.health.companion)};
  const sol={id:'sol',ally:true,kind:'sol',active:false,x:spawn.x-80,y:spawn.y,faceX:1,moving:false,walkPhase:0,idlePhase:0,pounce:0,leapSpeed:0,ward:0,fireClock:1,wardCooldown:8,volley:0,volleyCooldown:4,targetId:null,...vitals(PARTY.health.sol)};
  return {companion,sol,members:[companion,sol]};
}
// Every ally that moves with the party, including recruits.
export function partyMembers(run){return allyBodies(run);}
// Allies that enemies, hazards and hostile bolts can currently hurt (standing, not downed; Sol once it has joined).
export function partyTargets(run){return standingAllies(run);}
// Display name and short role label of an ally (English source text; translated at display time).
export function allyName(ally){return ally?.name||(ally?.kind==='sol'?'Sol':ally?.kind==='companion'?'Dawnweaver':'Ally');}
export function allyRole(ally){return ally?.role||ALLY_ROLES[ally?.kind]||'';}

// Ally health follows the difficulty and grows with every map; a change keeps the current share of health.
function fitHealth(run,ally){
  const key=run.difficulty+':'+run.areaIndex;
  if(ally.fit===key||!(ally.baseHp>0))return;
  const share=ally.maxHp>0?clamp(ally.hp/ally.maxHp,0,1):1;
  ally.maxHp=Math.round(ally.baseHp*(PARTY.difficulty[run.difficulty]??1)*(1+PARTY.perMap*run.areaIndex));
  ally.hp=ally.downed?0:ally.maxHp*share;ally.fit=key;
}
// Damage to an ally (already scaled by the map rule): shields soak first, then a short invulnerability.
export function hurtAlly(run,ally,amount,api){
  if(!ally?.ally||ally.downed||!(ally.hp>0)||ally.invulnerable>0||(ally.kind==='sol'&&!ally.active)||run.mode!=='running'||run.gateOpen)return;
  amount=Math.max(0,Number.isFinite(amount)?amount:0);
  const blocked=Math.min(ally.shield||0,amount);
  if(blocked>0){ally.shield-=blocked;amount-=blocked;run.effects.push({kind:'ward',x:ally.x,y:ally.y,age:0,life:0.3});}
  if(amount<=0){ally.invulnerable=0.2;return;}
  const damage=Math.min(ally.hp,amount);
  ally.hp-=damage;ally.invulnerable=PARTY.hitGuard;ally.hit=0.3;ally.quiet=0;
  run.stats.allyDamageTaken=(run.stats.allyDamageTaken||0)+damage;
  run.effects.push({kind:'damage',keeper:true,x:ally.x,y:ally.y-(ally.kind==='sol'?52:100),value:Math.ceil(damage),age:0,life:0.65});
  if(ally.hp<=1e-6)down(run,ally);
}
function down(run,ally){
  Object.assign(ally,{hp:0,downed:true,downAge:0,revive:0,reviveIn:PARTY.revive.alone,assisted:false,rise:0,shield:0,shieldTime:0,mode:'follow',calm:0,targetId:null,spot:null,moving:false,evading:false,evadeGoal:null,following:false,waypoint:null});
  for(const key of ['cast','mend','ward','nova','pounce','volley'])if(key in ally)ally[key]=0;
  run.stats.allyDowns=(run.stats.allyDowns||0)+1;
  run.effects.push({kind:'ally-down',x:ally.x,y:ally.y,ally:ally.kind,age:0,life:0.6});run.events.push('ally-down');
}
function raise(run,ally){
  const assisted=ally.assisted;
  Object.assign(ally,{downed:false,hp:ally.maxHp*PARTY.revive.health,revive:0,reviveIn:0,downAge:0,assisted:false,invulnerable:PARTY.revive.guard,rise:PARTY.revive.rise,calm:0,mode:distance(ally,run.player)<PARTY.regroup?'follow':'return'});
  run.stats.allyRevives=(run.stats.allyRevives||0)+1;
  run.effects.push({kind:'ally-up',x:ally.x,y:ally.y,ally:ally.kind,assisted,age:0,life:0.9});run.events.push('ally-up');
}
// Ticks protection and recovery. Returns true while the ally is out of action (downed, or rising again).
function recover(run,ally,dt){
  for(const key of ['invulnerable','hit','shieldTime','rise'])ally[key]=Math.max(0,(ally[key]||0)-dt);
  if(!(ally.shieldTime>0))ally.shield=0;
  if(!ally.downed){
    // Left alone for a few seconds, a hurt ally slowly recovers; a badly hurt one rests in the formation meanwhile.
    const {below,until,delay,rate}=PARTY.rest;
    ally.quiet=(ally.quiet||0)+dt;
    if(ally.quiet>=delay&&ally.hp<ally.maxHp)ally.hp=Math.min(ally.maxHp,ally.hp+ally.maxHp*rate*dt);
    if(ally.hp<ally.maxHp*below)ally.resting=true;else if(ally.hp>=ally.maxHp*until)ally.resting=false;
    return ally.rise>0;
  }
  // Time alone and time with Zeyu beside both fill the same revive; beside it fills over 3 s instead of 10 s.
  const {alone,assisted,reach}=PARTY.revive,beside=run.player.hp>0&&distance(ally,run.player)<reach,span=beside?assisted:alone;
  ally.downAge+=dt;ally.assisted=beside;ally.revive=Math.min(1,ally.revive+dt/span);ally.reviveIn=Math.max(0,(1-ally.revive)*span);
  if(ally.revive>=1-1e-9)raise(run,ally);
  return true;
}
function mendAlly(run,ally,amount){const healed=Math.max(0,Math.min(ally.maxHp-ally.hp,amount));ally.hp+=healed;run.stats.allyHealing=(run.stats.allyHealing||0)+healed;}
function shieldAlly(run,ally,amount,time){ally.shield=Math.max(ally.shield||0,amount);ally.shieldTime=Math.max(ally.shieldTime||0,time);run.effects.push({kind:'ward',x:ally.x,y:ally.y,age:0,life:0.6});}
// Heals any friend: Zeyu through the engine (so his health stays reconciled), allies and keepers directly.
function healFriend(run,friend,amount,api){
  if(friend===run.player)api.heal(amount);
  else if(friend.ally)mendAlly(run,friend,amount);
  else{const healed=Math.max(0,Math.min(friend.maxHp-friend.hp,amount));friend.hp+=healed;run.stats.npcHealing+=healed;}
  run.effects.push({kind:'mend',x:friend.x,y:friend.y,age:0,life:0.8});run.events.push('mend');
}

// FOLLOW -> ENGAGE when Hollow come near Zeyu; ENGAGE -> RETURN when the leash breaks, after a quiet spell, or
// when the ally is badly hurt (it rests in the formation); RETURN -> FOLLOW (or ENGAGE) once back beside Zeyu.
function updateMode(ally,fight,dt){
  const gap=distance(ally,fight.p);
  if(ally.mode==='return'){if(gap>=PARTY.regroup)return;ally.mode='follow';}
  if(gap>PARTY.leash){ally.mode='return';ally.calm=0;ally.spot=null;return;}
  if(ally.resting){if(ally.mode==='engage'){ally.mode=gap<PARTY.regroup?'follow':'return';ally.spot=null;}ally.calm=0;return;}
  if(fight.threatened){ally.mode='engage';ally.calm=0;return;}
  if(ally.mode==='engage'){ally.calm=(ally.calm||0)+dt;if(ally.calm>=PARTY.calm){ally.mode=gap<PARTY.regroup?'follow':'return';ally.spot=null;}}
}
function followPartyMember(run,body,side,speed,dt,radius,back=0){
  const obstacles=areaObstacles(run),gap=distance(body,run.player);
  moveAlly(body,formationTarget(run,side,radius,obstacles,back),obstacles,dt,{speed:speed*(1+clamp((gap-180)/500,0,0.6))*speedFactor(run,body),radius,start:30,stop:14,stride:body===run.sol?25:32});
}
// Engaged movement: hold a spot inside the role's range band around the focus. Casters also step away from
// Hollow that reach them. A chosen spot is kept until reached or until it no longer fits, so allies do not jitter.
function engageMove(run,ally,focus,band,stance,dt,obstacles,radius,stride){
  const p=run.player,leash=PARTY.leash-40,mid=(band[0]+band[1])/2,half=(band[1]-band[0])/2;
  const crowd=stance.behind?run.enemies.find(e=>e!==focus&&e.hp>0&&e.warning<=0&&distance(e,ally)<110):null;
  let spot=ally.spot;
  if(spot&&(crowd||Math.abs(distance(spot,focus)-mid)>half+24||distance(spot,p)>leash+24))spot=null;
  spot??=crowd?fightSpot(ally,crowd,p,[150,190],true,obstacles,leash):fightSpot(ally,focus,p,band,stance.behind,obstacles,leash);
  if(!spot){ally.spot=null;return;}
  moveAlly(ally,spot,obstacles,dt,{speed:stance.speed*speedFactor(run,ally),radius,start:24,stop:12,stride});
  ally.spot=ally.following?spot:null;
}
// Steps out of a ground warning that is about to land; returns true while evading.
function evade(run,ally,speed,obstacles,dt,radius){
  const escape=dodgeGoal(run,ally);ally.evading=!!escape;
  if(escape){ally.spot=null;moveAlly(ally,escape,obstacles,dt,{speed:speed*speedFactor(run,ally),radius,start:4,stop:3,stride:ally.kind==='sol'?25:32});}
  return !!escape;
}
const engaged=(ally,fight,range,heroWeight)=>ally.mode==='engage'?rolePick(fight.enemies,ally,fight.p,range,PARTY.engage+80,heroWeight,fight.obstacles,fight.protectedNpc):null;
const ready=ally=>!ally.evading&&ally.mode!=='return'&&(ally.mode==='engage'||!ally.rejoining);

function stepCompanion(run,dt,api,fight){
  const ally=run.companion,p=run.player,setting=DIFFICULTIES[run.difficulty]||DIFFICULTIES.normal,{obstacles,npcs,protectedNpc}=fight;
  const castBefore=ally.cast,mendBefore=ally.mend,novaBefore=ally.nova||0;
  for(const key of ['cast','mend','ward','mendCooldown','nova','novaCooldown'])ally[key]=Math.max(0,(ally[key]||0)-dt);
  ally.fireClock-=dt;ally.idlePhase+=dt;
  if(recover(run,ally,dt)){ally.moving=false;return;}
  if(castBefore>COMBAT.allyCast.duration-COMBAT.allyCast.impact&&ally.cast<=COMBAT.allyCast.duration-COMBAT.allyCast.impact){
    // Every third Dawnweaver bolt is a moonlance that pierces up to two more Hollow.
    const target=run.enemies.find(e=>e.id===ally.targetId&&e.hp>0);if(target&&clearPath(ally,target,obstacles,3)){const moon=!!ally.moonCast;api.shoot(ally,target,(21+run.areaIndex*5)*0.75*(moon?1.6:1),'ally',false,0,moon?{moon:true,pierce:2,hitIds:[]}:null);ally.casts=(ally.casts||0)+1;run.stats.allyCasts++;}
  }
  if(mendBefore>COMBAT.mend.duration-COMBAT.mend.impact&&ally.mend<=COMBAT.mend.duration-COMBAT.mend.impact){
    const recipient=ally.mendTargetId==='hero'||!ally.mendTargetId?p:npcs.find(n=>n.id===ally.mendTargetId)||standingAllies(run).find(a=>a.id===ally.mendTargetId);
    if(recipient&&distance(ally,recipient)<400&&clearPath(ally,recipient,obstacles,3)){
      const amount=setting.heal+p.mendBonus;healFriend(run,recipient,amount,api);
      // The mend's light spills onto allies standing beside the one she mends (half strength).
      for(const friend of standingAllies(run))if(friend!==recipient&&distance(friend,recipient)<PARTY.mendSpill)mendAlly(run,friend,amount*0.5);
    }
  }
  if(novaBefore>COMBAT.lunarNova.duration-COMBAT.lunarNova.impact&&ally.nova<=COMBAT.lunarNova.duration-COMBAT.lunarNova.impact){
    for(const e of run.enemies)if(e.hp>0&&e.warning<=0&&distance(e,ally)<COMBAT.lunarNova.range&&clearPath(ally,e,obstacles,3))api.hit(e,42+p.damage*0.35,'ally');
    run.shots=run.shots.filter(s=>!s.hostile||distance(s,ally)>COMBAT.lunarNova.range);
    run.effects.push({kind:'lunar-nova',x:ally.x,y:ally.y,age:0,life:0.8});run.events.push('lunar-nova');
  }
  ally.moving=false;
  updateMode(ally,fight,dt);
  if(evade(run,ally,STANCES.companion.speed,obstacles,dt,16)){ally.cast=0;ally.mend=0;ally.nova=0;return;}
  const focus=engaged(ally,fight,520,STANCES.companion.heroWeight);
  if(ally.cast<=0&&ally.mend<=0&&ally.nova<=0){
    if(focus)engageMove(run,ally,focus,STANCES.companion.band,STANCES.companion,dt,obstacles,16,32);
    else followPartyMember(run,ally,48,255,dt,16);
  }
  const free=ally.cast<=0&&ally.mend<=0&&ally.nova<=0&&ready(ally);
  const mend=ally.mendCooldown<=0?supportTarget(run,ally):null;
  if(mend&&free){ally.mend=COMBAT.mend.duration;ally.mendTargetId=mend.id;ally.mendCooldown=p.mendInterval;ally.moving=false;}
  else if(run.areaIndex>=1&&ally.novaCooldown<=0&&free&&api.nearestTarget(ally,COMBAT.lunarNova.range)){ally.nova=COMBAT.lunarNova.duration;ally.novaCooldown=COMBAT.lunarNova.cooldown;ally.moving=false;run.stats.abilities.lunarNova++;}
  else if(ally.fireClock<=0&&free){
    const target=ally.mode==='engage'?(focus&&distance(focus,ally)<=480?focus:engaged(ally,fight,480,STANCES.companion.heroWeight)):alliedTarget(run.enemies,ally,480,obstacles,protectedNpc);
    if(target){ally.cast=COMBAT.allyCast.duration;ally.moonCast=((ally.casts||0)+1)%3===0;ally.fireClock=0.9;ally.targetId=target.id;ally.moving=false;ally.spot=null;faceToward(ally,target.x-ally.x,target.y-ally.y);}
  }
}

function stepSol(run,dt,api,fight){
  const sol=run.sol,ally=run.companion,p=run.player,{obstacles,protectedNpc}=fight;if(!sol.active)return;
  const before=sol.pounce,volleyBefore=sol.volley||0;for(const key of ['pounce','ward','wardCooldown','volley','volleyCooldown'])sol[key]=Math.max(0,(sol[key]||0)-dt);sol.fireClock-=dt;sol.idlePhase+=dt;
  if(recover(run,sol,dt)){sol.moving=false;return;}
  // Sol leaps at its prey during the pounce and bites on landing; out of reach, it falls back to a spark.
  const prey=before>0?run.enemies.find(e=>e.id===sol.targetId&&e.hp>0):null;
  if(prey&&sol.pounce>0.22&&sol.leapSpeed>0){const d=distance(sol,prey)||1,step=Math.min(Math.max(0,d-prey.radius-16),sol.leapSpeed*dt);if(step>0.2)moveBody(sol,(prey.x-sol.x)/d*step,(prey.y-sol.y)/d*step,obstacles,13);}
  if(before>0.22&&sol.pounce<=0.22&&prey){
    if(distance(sol,prey)<prey.radius+44&&clearPath(sol,prey,obstacles,0)){api.hit(prey,19*1.2/1.65*1.1,'sol');run.effects.push({kind:'sol-bite',x:prey.x,y:prey.y-24,angle:Math.atan2(prey.y-sol.y,prey.x-sol.x),age:0,life:0.32});run.stats.solCasts++;}
    else if(clearPath(sol,prey,obstacles,3)){api.shoot(sol,prey,19*1.2/1.65,'sol');run.stats.solCasts++;}
  }
  if(volleyBefore>COMBAT.solVolley.duration-COMBAT.solVolley.impact&&sol.volley<=COMBAT.solVolley.duration-COMBAT.solVolley.impact){
    const targets=run.enemies.filter(e=>e.hp>0&&e.warning<=0&&distance(e,sol)<COMBAT.solVolley.range&&clearPath(sol,e,obstacles,3)).sort((a,b)=>distance(a,sol)-distance(b,sol)).slice(0,3);
    for(const target of targets){api.shoot(sol,target,32+p.damage*0.22,'sol');run.stats.solCasts++;}
    run.effects.push({kind:'sol-volley',x:sol.x,y:sol.y,age:0,life:0.5});run.events.push('sol-volley');
  }
  sol.moving=false;
  updateMode(sol,fight,dt);
  // Airborne, Sol finishes its leap; on the ground it steps out of a landing warning.
  if(!(sol.pounce>0.22)&&evade(run,sol,STANCES.sol.speed,obstacles,dt,13)){sol.pounce=0;sol.volley=0;sol.ward=0;return;}
  const focus=engaged(sol,fight,520,STANCES.sol.heroWeight);
  if(sol.pounce<=0&&sol.ward<=0&&sol.volley<=0){
    if(focus)engageMove(run,sol,focus,STANCES.sol.band,STANCES.sol,dt,obstacles,13,25);
    else followPartyMember(run,sol,-48,280,dt,13);
  }
  const free=sol.pounce<=0&&sol.ward<=0&&sol.volley<=0&&ready(sol);
  const ward=sol.wardCooldown<=0?supportTarget(run,sol,300,0.75):null;
  if(ward&&ward.body.hp<ward.body.maxHp*0.75&&!(ward.body.shield>0)&&free){
    sol.ward=0.8;sol.wardCooldown=18;sol.moving=false;
    if(ward.body===p){p.shield=18;p.shieldTime=6;}else if(ward.body.ally)shieldAlly(run,ward.body,20,6);else shieldNpc(run,ward.body,24);
    if(!ally.downed)ally.ward=0.8;run.events.push('ward');
  }
  else if(run.areaIndex>=2&&sol.volleyCooldown<=0&&free&&api.nearestTarget(sol,COMBAT.solVolley.range)){sol.volley=COMBAT.solVolley.duration;sol.volleyCooldown=COMBAT.solVolley.cooldown;sol.moving=false;run.stats.abilities.solVolley++;}
  else if(sol.fireClock<=0&&free){
    const target=sol.mode==='engage'?(focus&&distance(focus,sol)<=350?focus:engaged(sol,fight,350,STANCES.sol.heroWeight)):alliedTarget(run.enemies,sol,350,obstacles,protectedNpc);
    if(target){sol.pounce=0.55;sol.leapSpeed=Math.min(170,Math.max(0,distance(sol,target)-target.radius-16))/0.33;sol.fireClock=1.2;sol.targetId=target.id;sol.moving=false;sol.spot=null;faceToward(sol,target.x-sol.x,target.y-sol.y);}
  }
}

// Recruits walk in two rows behind the Dawnweaver and Sol.
const slotOf=ally=>({side:(ally.slot%2?-1:1)*(84+16*Math.floor(ally.slot/2)),back:58+72*Math.floor(ally.slot/2)});
// A recruit's cast: an ordinary bolt, and every third cast its keeper's signature skill.
function releaseRecruit(run,ally,api,obstacles){
  const target=run.enemies.find(e=>e.id===ally.targetId&&e.hp>0),power=ally.power*(1+PARTY.recruitPower*run.areaIndex),skill=RECRUIT_SKILLS[ally.skill];
  ally.casts=(ally.casts||0)+1;
  const signature=ally.casts%3===0;
  if(signature&&(ally.skill==='heal'||ally.skill==='shield')){
    const friend=ally.skill==='heal'?supportTarget(run,ally,ally.range):supportTarget(run,ally,260,0.75);
    if(friend&&ally.skill==='heal'){healFriend(run,friend.body,skill.amount,api);run.stats.recruitCasts=(run.stats.recruitCasts||0)+1;return;}
    if(friend&&!(friend.body.shield>0)){
      const body=friend.body;
      if(body===run.player){body.shield=Math.max(body.shield,skill.amount);body.shieldTime=Math.max(body.shieldTime,skill.time);run.effects.push({kind:'ward',x:body.x,y:body.y,age:0,life:0.6});}
      else if(body.ally)shieldAlly(run,body,skill.amount,skill.time);else shieldNpc(run,body,skill.amount);
      run.events.push('ward');run.stats.recruitCasts=(run.stats.recruitCasts||0)+1;return;
    }
  }
  if(!target||!clearPath(ally,target,obstacles,3))return;
  run.stats.recruitCasts=(run.stats.recruitCasts||0)+1;
  if(!signature||ally.skill==='heal'||ally.skill==='shield'){api.shoot(ally,target,power,'npc');return;}
  if(ally.skill==='burst'){
    // Forge sparks burst on the target and scorch Hollow standing beside it.
    api.hit(target,power,'npc');
    for(const e of run.enemies)if(e!==target&&e.hp>0&&e.warning<=0&&distance(e,target)<skill.radius)api.hit(e,power*skill.share,'npc');
    run.effects.push({kind:'ally-burst',x:target.x,y:target.y,radius:skill.radius,age:0,life:0.45});run.events.push('recruit-skill');
  }else if(ally.skill==='pierce')api.shoot(ally,target,power*skill.power,'npc',false,0,{pierce:skill.through,hitIds:[]});
  else if(ally.skill==='fan'){for(const offset of [-skill.spread,0,skill.spread])api.shoot(ally,target,power*skill.share,'npc',false,offset);}
  else if(ally.skill==='twin'){
    const second=run.enemies.find(e=>e!==target&&e.hp>0&&e.warning<=0&&distance(e,ally)<=ally.range&&clearPath(ally,e,obstacles,3));
    api.shoot(ally,target,power*skill.share,'npc');api.shoot(ally,second||target,power*skill.share,'npc',false,second?0:0.12);
  }
}
function stepRecruit(run,ally,dt,api,fight){
  const p=run.player,{obstacles,protectedNpc}=fight,stance=STANCES[ally.stance]||STANCES.back,band=[stance.band[0]*ally.range,stance.band[1]*ally.range];
  const before=ally.cast;ally.cast=Math.max(0,ally.cast-dt);ally.fireClock-=dt;ally.idlePhase+=dt;
  if(recover(run,ally,dt)){ally.moving=false;return;}
  // Keeper casts last 0.6 s and release when 0.28 s remain, matching the painted keeper cast.
  if(before>0.28&&ally.cast<=0.28)releaseRecruit(run,ally,api,obstacles);
  ally.moving=false;
  updateMode(ally,fight,dt);
  if(evade(run,ally,stance.speed,obstacles,dt,16)){ally.cast=0;return;}
  const focus=engaged(ally,fight,Math.max(520,ally.range+120),stance.heroWeight);
  if(ally.cast<=0){
    if(focus)engageMove(run,ally,focus,band,stance,dt,obstacles,16,32);
    else{const slot=slotOf(ally);followPartyMember(run,ally,slot.side,stance.speed,dt,16,slot.back);}
  }
  if(ally.cast<=0&&ally.fireClock<=0&&ready(ally)){
    const target=ally.mode==='engage'?(focus&&distance(focus,ally)<=ally.range?focus:engaged(ally,fight,ally.range,stance.heroWeight)):alliedTarget(run.enemies,ally,ally.range,obstacles,protectedNpc);
    if(target){ally.cast=0.6;ally.targetId=target.id;ally.fireClock=ally.interval;ally.moving=false;ally.spot=null;faceToward(ally,target.x-ally.x,target.y-ally.y);}
  }
}

// The keeper whose road Zeyu completed on the map just left joins the party (run.areaIndex has advanced).
function recruitFromLastMap(run){
  const from=run.areaIndex-1,def=CAMPAIGN[from];if(!def)return null;
  const road=def.routes.find(r=>r.id===run.routeChoices?.[from]);if(!road)return null;
  const done=run.campaign?.areaIndex===from?!!run.campaign.routes.find(r=>r.id===road.id)?.completed:!!run.areaResults?.find(r=>r.area===AREAS[from].name)?.routeCompleted;
  const keeper=def.npcs.find(n=>n.id===road.npc),profile=NPC_COMBAT[keeper?.body],role=RECRUIT_ROLES[keeper?.body];
  if(!done||!profile||!role)return null;
  const id='recruit-'+keeper.id,party=allyBodies(run);
  if(party.some(a=>a.id===id))return null;
  const recruit={id,ally:true,kind:'recruit',keeperId:keeper.id,name:keeper.name,title:keeper.title,body:keeper.body,role:role.role,stance:role.stance,skill:role.skill,skillName:profile.skill,color:road.color,
    range:profile.range,interval:profile.interval,power:profile.damage,joinedArea:run.areaIndex,slot:party.filter(a=>a.kind==='recruit').length,
    x:run.player.x,y:run.player.y,faceX:1,moving:false,walkPhase:0,idlePhase:0,cast:0,casts:0,fireClock:1,targetId:null,...vitals(profile.health)};
  if(!run.party)run.party=party;
  run.party.push(recruit);
  run.stats.recruits=(run.stats.recruits||0)+1;run.events.push('recruit');
  return recruit;
}
// Places the party beside the hero at the start of a new map, fully rested; a newly freed keeper joins.
export function placeParty(run){
  const p=run.player,joined=recruitFromLastMap(run),start={player:p,formationAngle:0},obstacles=AREAS[run.areaIndex].obstacles;
  Object.assign(run.companion,{x:p.x-50,y:p.y+60,cast:0,mend:0,ward:0,moving:false,fireClock:0.7,mendCooldown:8,nova:0,novaCooldown:3});
  Object.assign(run.sol,{active:true,x:p.x-80,y:p.y,pounce:0,ward:0,moving:false,fireClock:1,wardCooldown:8,volley:0,volleyCooldown:3});
  for(const ally of allyBodies(run)){
    if(ally.kind==='recruit'){const slot=slotOf(ally),at=formationTarget(start,slot.side,16,obstacles,slot.back);Object.assign(ally,{x:at.x,y:at.y,cast:0,fireClock:1+0.25*ally.slot,moving:false});}
    Object.assign(ally,{downed:false,downAge:0,revive:0,reviveIn:0,assisted:false,rise:0,invulnerable:0,hit:0,shield:0,shieldTime:0,quiet:0,resting:false,mode:'follow',calm:0,targetId:null,evading:false,evadeGoal:null,spot:null,rejoining:false,fit:''});
    fitHealth(run,ally);ally.hp=ally.maxHp;
  }
  if(joined)run.effects.push({kind:'recruit-join',x:joined.x,y:joined.y,id:joined.id,age:0,life:1.1});
}
export function stepParty(run,dt,api){
  const p=run.player,obstacles=areaObstacles(run),npcs=activeNpcs(run),allies=allyBodies(run);
  const protectedNpc=npcs.sort((a,b)=>distance(a,p)-distance(b,p))[0];
  const fight={p,obstacles,npcs,protectedNpc,enemies:run.enemies,threatened:run.enemies.some(e=>e.hp>0&&e.warning<=0&&distance(e,p)<PARTY.engage)};
  for(const body of allies){
    fitHealth(run,body);
    const gap=distance(body,p);if(gap>230)body.rejoining=true;else if(gap<115)body.rejoining=false;
  }
  stepCompanion(run,dt,api,fight);
  stepSol(run,dt,api,fight);
  for(const ally of allies)if(ally.kind==='recruit')stepRecruit(run,ally,dt,api,fight);
  separateAllies(run,allies,dt,obstacles);
}
// The toast line for a keeper joining (English source text; translated at display time).
export function joinText(ally){return allyName(ally)+' joins the party';}
