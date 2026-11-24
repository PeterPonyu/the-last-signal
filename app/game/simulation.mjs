import { WORLD, AREAS, DIFFICULTIES, ENEMIES, COMBAT } from '../../content/game.mjs';
import { clamp, distance, moveBody, clearPath, segmentCircleTime, navigationField } from './geometry.mjs';
import {JOURNEY,ENEMY_ROLES,REMAINS} from '../../content/journey.mjs';
import {CAMPAIGN} from '../../content/campaign.mjs';
import {ANSWER_THRESHOLDS} from '../../content/answers.mjs';
import {CURVE} from '../../content/curve.mjs';
import {createParty,placeParty,stepParty,partyMembers,partyTargets,hurtAlly} from './party.mjs';
import {startingSkills,knows,applyAnswer,giftsStep,giftsOnHit,giftsOnKill,giftDamageFactor} from './answers.mjs';
import {stepEnvironment,speedFactor,damageFactor,shotSpeedFactor,castFactor} from './environment.mjs';
import {rollAffixes,affixStep,affixDamageFactor,affixOnCast,affixOnDeath} from './affixes.mjs';
import {BOSSES,BOSS_RULES,HAZARD_FAMILIES} from '../../content/bosses.mjs';
import {createCampaignArea,creditDefeat,updateProgression,chooseRoute,campaignNotice,areaObstacles} from './progression.mjs';
import {directorStep} from './director.mjs';
import {nearbyInteraction} from './journey.mjs';
import {enemySteering,enemyTarget,targetNavigation,predictedTarget,hasAttackSlot,hasHazardEscape} from './enemy-ai.mjs';
import {resetAllyMotion,faceToward} from './ally-ai.mjs';
import {activeNpcs,hurtNpc,shieldNpc,updateNpcCombat} from './npc-ai.mjs';
export { WORLD, clamp };

export function createRun(seed = 7251, difficulty = 'normal') {
  if (!Object.hasOwn(DIFFICULTIES,difficulty)) difficulty = 'normal';
  const setting=DIFFICULTIES[difficulty],party=createParty(AREAS[0].spawn);
  const run={mode:'running',difficulty,seed:seed>>>0,initialSeed:seed>>>0,time:0,areaTime:0,areaIndex:0,
    kills:0,level:1,nextId:1,spawnClock:2,fireClock:0,bossSpawned:false,ending:null,inputBuffer:null,autoPowers:false,formationAngle:0,
    upgrades:{},rewards:[],routeChoices:[],storyTokens:[],enemies:[],shots:[],hazards:[],pickups:[],effects:[],corpses:[],events:[],areaResults:[],
    stats:{damageTaken:0,hitsTaken:0,healing:0,spawned:0,meleeKills:0,allyKills:0,coverBlocks:0,beacons:0,peakEnemies:0,guardBreaks:0,shieldBlocked:0,solKills:0,lanterns:0,retiredEnemies:0,projectileHits:0,projectileDamage:0,allyCasts:0,solCasts:0,npcDefeats:0,npcDamageTaken:0,npcCasts:0,npcKills:0,npcHealing:0,abilities:{slash:0,dash:0,pulse:0,sunbreak:0,solarLance:0,lunarNova:0,solVolley:0}},
    companion:party.companion,sol:party.sol,party:party.members,
    player:{...AREAS[0].spawn,skills:startingSkills(),vx:0,vy:0,hp:setting.health,maxHp:setting.health,speed:205,damage:25,bladePower:1,bladeRange:0,bladeArc:0,bladeCooldown:1,breakCooldown:1,fireInterval:0.42,fireRange:500,volley:false,finisher:false,armor:0,wardLevel:0,wardClock:18,mendBonus:0,mendInterval:18,dashInterval:2.5,faceX:1,faceY:0,
      dash:0,dashCooldown:0,pulseCooldown:0,invulnerable:0,moving:false,walkPhase:0,idlePhase:0,travelX:1,travelY:0,footClock:0,
      slash:0,slashCooldown:0,combo:0,comboWindow:0,cast:0,sunbreak:0,sunbreakCooldown:0,solarLance:0,solarLanceCooldown:0,hurt:0,deathAge:0,shield:0,shieldTime:0}
  };
  prepareArea(run);return run;
}
function prepareArea(run){
  run.beacons=AREAS[run.areaIndex].beacons.map(b=>({...b,charge:0,litAt:null}));
  run.lanterns=AREAS[run.areaIndex].lanterns.map((point,id)=>({...point,id,lit:false,litAt:null}));
  run.inputBuffer=null;run.gateOpen=false;run.npcMet=false;run.campaign=createCampaignArea(run);
  run.formationAngle=0;
  for(const actor of [run.player,...partyMembers(run),...run.campaign.npcs])resetAllyMotion(actor);
  run.navigation=navigationField(areaObstacles(run),run.player);run.navClock=0;
  run.areaStart={time:run.time,kills:run.kills,damage:run.stats.damageTaken};
}
export function advanceArea(run){
  if(run.mode!=='area-clear'||run.areaIndex>=AREAS.length-1)return false;
  run.areaIndex++;run.areaTime=0;run.spawnClock=2;run.bossSpawned=false;run.fireClock=0;run.ending=null;
  for(const key of ['enemies','shots','hazards','pickups','effects','corpses'])run[key]=[];
  const p=run.player;heal(run,35);
  Object.assign(p,{...AREAS[run.areaIndex].spawn,vx:0,vy:0,travelX:1,travelY:0,slash:0,combo:0,comboWindow:0,cast:0,dash:0,sunbreak:0,solarLance:0,hurt:0,shield:0,shieldTime:0,moving:false,
    dashCooldown:0,pulseCooldown:0,slashCooldown:0,sunbreakCooldown:0,solarLanceCooldown:0,invulnerable:1});
  placeParty(run);
  prepareArea(run);run.mode='running';run.events.push('area');return true;
}
export function interact(run){
  if(run.mode!=='running')return null;
  const target=nearbyInteraction(run),story=JOURNEY[run.areaIndex];
  if(!target)return null;
  if(target.kind==='route'){
    const accepted=chooseRoute(run,target.id);return accepted?{kind:'route',title:target.name,text:run.campaign.notice}:null;
  }
  if(target.kind==='npc'){
    const npc=run.campaign.npcs.find(n=>n.id===target.id);if(npc)npc.met=true;
    if(target.id===run.campaign.npcs[0].id)run.npcMet=true;
    return {kind:'dialogue',title:target.name+' · '+target.title,text:target.text};
  }
  if(!run.gateOpen)return {kind:'dialogue',title:story.exit.name,text:'Sealed. Defeat '+AREAS[run.areaIndex].boss+' to open it.'};
  run.inputBuffer=null;run.mode=run.areaIndex===AREAS.length-1?'victory':'area-clear';
  return {kind:'travel'};
}
function random(run){run.seed=(Math.imul(run.seed,1664525)+1013904223)>>>0;return run.seed/4294967296;}
// Engine functions handed to the feature modules (party, answers, map rules, enemy gifts).
const apis=new WeakMap();
function api(run){
  let a=apis.get(run);if(a)return a;
  a={shoot:(body,target,damage,source,hostile,angleOffset,extra)=>shoot(run,body,target,damage,source,hostile,angleOffset,extra),
    hit:(enemy,damage,source)=>hit(run,enemy,damage,source),heal:amount=>heal(run,amount),hurtFriendly:(target,amount)=>hurtFriendly(run,target,amount),
    nearestTarget:(body,range)=>nearestTarget(run,body,range),random:()=>random(run),spawn:(...args)=>spawn(run,...args),
    safe:hazard=>hasHazardEscape(run.player,run.hazards,hazard,areaObstacles(run)),effect:fx=>run.effects.push(fx),event:name=>run.events.push(name)};
  apis.set(run,a);return a;
}
// Every friendly body that enemy attacks, hazards and hostile bolts can reach.
function friendlies(run){return [run.player,...activeNpcs(run),...partyTargets(run)];}
function heal(run,amount){const p=run.player;if(p.hp<=0)return;const healed=Math.max(0,Math.min(p.maxHp-p.hp,amount));p.hp+=healed;run.stats.healing+=healed;}
function beginEnding(run,nextMode){if(run.mode!=='running')return;run.mode='ending';run.inputBuffer=null;run.ending={nextMode,remaining:COMBAT.death.duration};run.player.moving=false;run.events.push(nextMode);}
function spawn(run,boss=false,forcedRole=null,lieutenant=false,bossRank='warden',at=null){
  const area=AREAS[run.areaIndex],setting=DIFFICULTIES[run.difficulty],p=run.player;
  const valid=q=>distance(q,p)>300&&(boss||Math.abs(q.x-p.x)>680||Math.abs(q.y-p.y)>440)&&!areaObstacles(run).some(o=>distance(q,o)<o.radius+45);
  let point=at;
  for(let attempt=0;attempt<20&&!point;attempt++){
    const jitter=random(run);const angle=!boss&&attempt<6?(run.campaign.entryAngle||0)+(jitter-0.5)*0.8+(run.campaign.groupType==='flank'&&run.campaign.spawnRemaining%2?Math.PI:0):jitter*Math.PI*2,spread=random(run)*120;
    const q={x:clamp(p.x+Math.cos(angle)*((boss?500:790)+spread),WORLD.left,WORLD.right),y:clamp(p.y+Math.sin(angle)*((boss?500:540)+spread),WORLD.top,WORLD.bottom)};
    if(valid(q)){point=q;break;}
  }
  if(!point)for(let y=Math.max(WORLD.top,p.y-850);y<=Math.min(WORLD.bottom,p.y+850)&&!point;y+=120)for(let x=Math.max(WORLD.left,p.x-1000);x<=Math.min(WORLD.right,p.x+1000);x+=120)if(valid({x,y})){point={x,y};break;}
  if(!point)return false;
  const type=boss&&bossRank!=='champion'?'boss':forcedRole||'walker',roleKey=Object.hasOwn(ENEMY_ROLES,type)?type:null,role=ENEMY_ROLES[roleKey],campaign=CAMPAIGN[run.areaIndex];
  const champion=boss&&bossRank==='champion'?campaign.champion:null,plan=BOSSES[run.areaIndex];
  const def=boss?{health:champion?plan.champion.health:plan.warden.health,speed:champion?.speed||plan.warden.speed,radius:champion?32:42,damage:champion?17:20}:role||ENEMIES[type];
  const hp=def.health*(boss?(bossRank==='champion'?setting.championHealth:Math.max(1,setting.enemyHealth)):setting.enemyHealth)*(boss?1:CURVE.health[run.areaIndex]+Math.min(run.campaign.stage,3)*CURVE.stageHealth)*(lieutenant?3.2:1);
  const guard=boss&&!champion?Math.round(plan.warden.guard*BOSS_RULES.guardScale[run.difficulty]):0,attackDuration=(type==='sentinel'?0.95:0.7)*setting.warning;
  const enemy={id:run.nextId++,type:roleKey||type,areaIndex:run.areaIndex,role:roleKey,skill:role?.skill,guarded:role?!!role.guarded:type==='sentinel',ranged:!!role?.skill||type==='cantor',phase:1,phaseShift:0,phaseCasts:[0,0],phaseOpener:!!boss,bossKind:boss?campaign.bossKind:null,bossRank:boss?bossRank:null,encounterKind:boss?bossRank:null,encounterId:boss?(champion?.id||campaign.id+'-warden'):null,bossName:boss?(champion?.name||area.boss):null,encounterPhases:boss?[1]:[],distanceTravelled:0,lieutenant,storyCredit:true,casts:0,...point,hp,maxHp:hp,radius:def.radius,speed:def.speed*setting.speed,boss,runner:role?.runner||(!role&&['runner','pack'].includes(type)),
    skin:role?.skin||(boss?(run.areaIndex===1?'cantor':'sentinel'):type==='cantor'||type==='sentinel'?type:'hollow'),
    damage:def.damage*(boss?BOSS_RULES.damageScale[run.difficulty]*CURVE.bossDamage[run.areaIndex]**CURVE.growth[run.difficulty]:setting.damage*CURVE.damage[run.areaIndex]**CURVE.growth[run.difficulty]),hit:0,stagger:0,guardBroken:0,warning:1.2*setting.warning,summoned:!!at,
    guardMax:guard,guardHp:guard,guardUp:guard>0,exposed:0,exposedFor:0,guardRegrow:0,guardTime:0,enraged:false,slamCooldown:3,closeTime:0,queue:[],rotation:[0,0],
    attack:0,attackKind:null,attackDuration,baseAttackDuration:attackDuration,attackCooldown:0,walkPhase:random(run)*4,moving:false,
    spell:0,spellDuration:0.9*setting.warning,spellCooldown:boss?0.45:1.4+random(run)*2.6,aimX:0,aimY:0,faceX:p.x>=point.x?1:-1,
    charge:0,chargeWarning:0,chargeCooldown:1.4+random(run)*3,chargeRecovery:0,chargeX:0,chargeY:0,focusId:'hero',steerSide:run.nextId%2?1:-1,stuckTime:0,intent:'arriving'};
  run.enemies.push(enemy);rollAffixes(run,enemy,api(run));
  run.stats.spawned++;run.stats.peakEnemies=Math.max(run.stats.peakEnemies,run.enemies.length);
  if(boss)run.events.push('boss');return true;
}
function hurtPlayer(run,amount){
  const p=run.player;if(p.invulnerable>0||run.mode!=='running'||run.gateOpen)return;
  const blocked=Math.min(p.shield,amount);p.shield-=blocked;run.stats.shieldBlocked+=blocked;amount-=blocked;
  if(blocked){run.events.push('ward-hit');run.effects.push({kind:'ward',x:p.x,y:p.y,age:0,life:0.3});}
  if(amount<=0){p.invulnerable=0.2;return;}
  const damage=Math.min(p.hp,amount*(1-Math.min(0.35,p.armor||0)));p.hp-=damage;p.invulnerable=0.75;p.hurt=COMBAT.hurt.duration;
  p.slash=0;p.sunbreak=0;p.solarLance=0;p.cast=0;p.combo=0;p.comboWindow=0;run.stats.damageTaken+=damage;run.stats.hitsTaken++;run.events.push('hurt');
  run.effects.push({kind:'damage',x:p.x,y:p.y-55,value:Math.ceil(damage),age:0,life:0.6});
  if(p.hp<=0)beginEnding(run,'defeat');
}
function hurtFriendly(run,target,amount){
  if(!target)return;amount*=damageFactor(run,target);
  if(target===run.player)hurtPlayer(run,amount);else if(target.ally)hurtAlly(run,target,amount,api(run));else hurtNpc(run,target,amount);
}
// Same-source hits on one target landing within 0.35 s of a number's start add into it, so
// steady fire shows one number per shot pair instead of a stack; every number keeps its
// normal lifetime. A boss's numbers rotate through three columns.
function damageNumber(run,enemy,value,absorbed,source,y){
  const recent=run.effects.find(f=>f.kind==='outgoing'&&f.target===enemy.id&&f.absorbed===absorbed&&f.source===source&&f.age<0.35);
  if(recent){recent.value+=Math.ceil(value);return;}
  if(enemy.boss)enemy.numberSlot=((enemy.numberSlot||0)+1)%3;
  run.effects.push({kind:'outgoing',target:enemy.id,x:enemy.x+(enemy.boss?((enemy.numberSlot||0)-1)*46:0),y,value:Math.ceil(value),absorbed,source,age:0,life:0.65});
}
// Blades and bursts break guards; gift blades ('gift-blade') break them too but never stagger.
const BREAKERS=new Set(['melee','sunbreak','pulse','gift-blade']);
function hit(run,enemy,damage,source='hero'){
  if(enemy.hp<=0||run.mode!=='running'||run.gateOpen||enemy.phaseShift>0||enemy.openerGuard)return;
  damage*=damageFactor(run,enemy)*affixDamageFactor(run,enemy,source)*giftDamageFactor(run,source);
  const beforeHp=enemy.hp,absorbed=(enemy.guarded||enemy.type==='sentinel')&&enemy.guardBroken<=0&&!BREAKERS.has(source);
  if((enemy.guarded||enemy.type==='sentinel')&&enemy.guardBroken<=0){
    if(BREAKERS.has(source)){
      enemy.guardBroken=2.4;if(source!=='gift-blade')enemy.stagger=0.5;run.stats.guardBreaks++;run.events.push('guard-break');
      run.effects.push({kind:'guard-break',x:enemy.x,y:enemy.y,age:0,life:0.55});
    }else damage*=0.4;
  }
  if(run.player.finisher&&['melee','sunbreak'].includes(source)&&enemy.hp<enemy.maxHp/2)damage*=1.4;
  let shielded=absorbed,breaking=false;
  // A Warden's guard soaks blades and bursts first; ranged light only chips through it.
  // The blow that breaks it carries its remainder through as exposed damage.
  if(enemy.guardMax>0){
    if(enemy.guardUp){
      if(BREAKERS.has(source)){
        const chip=Math.min(enemy.guardHp,damage);enemy.guardHp-=chip;damage-=chip;
        if(chip>0)damageNumber(run,enemy,chip,true,source,enemy.y-200);
        if(enemy.guardHp<=0){breaking=true;damage*=BOSS_RULES.exposedBonus;}else shielded=true;
      }else{damage*=BOSS_RULES.guardRanged;shielded=true;}
    }else if(enemy.exposed>0)damage*=BOSS_RULES.exposedBonus;
  }
  const nextHp=Math.max(0,enemy.hp-damage),phaseBefore=enemy.phase;
  if(enemy.boss&&enemy.bossKind&&enemy.phase===1&&nextHp<=enemy.maxHp/2){
    enemy.hp=enemy.maxHp/2;enemy.phase=2;enemy.phaseShift=1.1;enemy.spell=0;enemy.attack=0;enemy.spellCooldown=0.2;enemy.speed*=1.25;enemy.phaseOpener=true;
    enemy.encounterPhases||=[1];enemy.encounterPhases.push(2);if(enemy.bossRank!=='champion')run.campaign.bossPhases.push(2);run.events.push('boss-phase');
    // The new phase restores the guard and cancels a slam that had not landed yet.
    if(enemy.guardMax>0){Object.assign(enemy,{guardUp:true,guardHp:enemy.guardMax,exposed:0,guardRegrow:0,guardTime:0,enraged:false,queue:[],attackKind:null,attackDuration:enemy.baseAttackDuration||enemy.attackDuration});run.hazards=run.hazards.filter(h=>h.owner!==enemy.id||h.triggered||h.kind!=='slam');summonAdds(run,enemy);}
  }else enemy.hp=nextHp;
  // A break that also crosses half health is absorbed by the phase change, which restores the guard.
  if(breaking&&enemy.phase===phaseBefore&&enemy.hp>0)exposeBoss(run,enemy);
  enemy.hit=0.22;
  if(!enemy.boss&&(source==='melee'||source==='sunbreak')){enemy.stagger=Math.max(enemy.stagger,0.25);enemy.attack=0;enemy.spell=0;enemy.charge=0;enemy.chargeWarning=0;enemy.chargeRecovery=0.4;enemy.attackCooldown=0.6;}
  const dealt=beforeHp-enemy.hp;
  if(dealt>0&&['hero','melee','sunbreak','pulse'].includes(source))enemy.provokedUntil=run.time+2;
  run.effects.push({kind:'hit',x:enemy.x,y:enemy.y-32,age:0,life:0.34,source,absorbed:shielded,value:Math.ceil(dealt)});
  if(dealt>0)damageNumber(run,enemy,dealt,shielded,source,enemy.y-(enemy.boss?232:enemy.lieutenant?140:118));
  if(['hero','ally','sol','npc'].includes(source)){run.stats.projectileHits++;run.stats.projectileDamage+=dealt;}
  // A defeat is awarded exactly once, before gifts react, so a gift that strikes again cannot repeat it.
  if(enemy.hp>0||enemy.defeated){if(dealt>0&&enemy.hp>0)giftsOnHit(run,enemy,source,dealt,api(run));return;}
  enemy.defeated=true;
  run.kills++;creditDefeat(run,enemy);giftsOnKill(run,enemy,source,api(run));affixOnDeath(run,enemy,api(run));if(source==='melee'||source==='sunbreak')run.stats.meleeKills++;if(source==='ally'||source==='sol')run.stats.allyKills++;if(source==='sol')run.stats.solKills++;
  if(source==='npc')run.stats.npcKills++;
  run.corpses.push({...enemy,deathAge:0,life:(enemy.boss?REMAINS.bossHold:REMAINS.hold)+REMAINS.fade});run.corpses=run.corpses.slice(-REMAINS.limit);
  if(run.kills%7===0)run.pickups.push({x:enemy.x,y:enemy.y,life:22});
  if(enemy.boss){
    const c=run.campaign;
    c.bossEncounters.push({id:enemy.encounterId||CAMPAIGN[run.areaIndex].id+'-warden',name:enemy.bossName||AREAS[run.areaIndex].boss,kind:enemy.bossRank||'warden',phases:[...(enemy.encounterPhases||c.bossPhases)],distance:enemy.distanceTravelled||c.bossDistance,casts:[...(enemy.phaseCasts||[])]});
    if(enemy.bossRank==='champion'){
      c.championDefeated=true;heal(run,18);campaignNotice(run,enemy.bossName+' is freed.');run.events.push('champion-defeated');
    }else{
      run.areaResults.push({area:AREAS[run.areaIndex].name,seconds:run.time-run.areaStart.time,kills:run.kills-run.areaStart.kills,damageTaken:run.stats.damageTaken-run.areaStart.damage,route:c.choice,routeCompleted:!!c.routes.find(r=>r.id===c.choice)?.completed,routeFailures:c.routes.reduce((sum,r)=>sum+r.failures,0),defeats:c.defeats,milestones:[...c.milestones],eventComplete:c.event.complete,lieutenantDefeated:c.lieutenantDefeated,championDefeated:c.championDefeated,bossEncounters:[...c.bossEncounters],bossPhases:[...c.bossPhases],bossDistance:enemy.distanceTravelled||c.bossDistance,bossCasts:[...(enemy.phaseCasts||[])],npcs:c.npcs.filter(n=>n.met).map(n=>n.id)});
      run.gateOpen=true;run.storyTokens.push(JOURNEY[run.areaIndex].token);run.shots=[];run.hazards=[];run.enemies=[];run.events.push('gate-open');
    }
  }
  if(dealt>0)giftsOnHit(run,enemy,source,dealt,api(run));
}
export function useAbility(run,name){
  if(run.mode!=='running'||!knows(run,name))return false;
  const p=run.player;
  if(name==='solarLance'&&p.solarLanceCooldown<=0&&p.dash<=0&&p.slash<=0&&p.sunbreak<=0&&p.hurt<=0){run.inputBuffer=null;p.solarLance=COMBAT.solarLance.duration;p.solarLanceCooldown=COMBAT.solarLance.cooldown;p.cast=0;run.stats.abilities.solarLance++;return true;}
  // Sunblade strikes chained inside the window build a three-hit combo; the third is the finisher.
  if(name==='slash'&&p.solarLance<=0&&p.slashCooldown<=0&&p.dash<=0&&p.sunbreak<=0&&p.hurt<=0){run.inputBuffer=null;p.combo=p.comboWindow>0&&p.combo>0&&p.combo<3?p.combo+1:1;p.comboWindow=0;p.slash=COMBAT.slash.duration;p.slashCooldown=COMBAT.slash.cooldown*p.bladeCooldown;p.cast=0;run.stats.abilities.slash++;return true;}
  if(name==='sunbreak'&&p.solarLance<=0&&p.sunbreakCooldown<=0&&p.dash<=0&&p.slash<=0&&p.hurt<=0){run.inputBuffer=null;p.sunbreak=COMBAT.sunbreak.duration;p.sunbreakCooldown=COMBAT.sunbreak.cooldown*p.breakCooldown;p.cast=0;run.stats.abilities.sunbreak++;return true;}
  if(name==='dash'&&p.dashCooldown<=0){run.inputBuffer=null;p.dash=COMBAT.dash.duration;p.dashCooldown=p.dashInterval;p.invulnerable=Math.max(p.invulnerable,0.35);p.hurt=0;p.slash=0;p.sunbreak=0;p.solarLance=0;run.stats.abilities.dash++;run.events.push('dash');return true;}
  if(name==='pulse'&&p.pulseCooldown<=0){
    run.inputBuffer=null;p.pulseCooldown=8;p.cast=COMBAT.cast.duration;run.stats.abilities.pulse++;run.effects.push({kind:'pulse',x:p.x,y:p.y,age:0,life:0.7});
    for(const npc of activeNpcs(run))if(distance(npc,p)<210&&clearPath(p,npc,areaObstacles(run),3))shieldNpc(run,npc);
    for(const e of run.enemies)if(e.warning<=0&&distance(e,p)<210)hit(run,e,85+p.damage,'pulse');
    run.shots=run.shots.filter(s=>!s.hostile||distance(s,p)>210);for(const h of run.hazards)if(h.anchorHp>0&&distance(h,p)<210){h.anchorHp=0;h.life=0;}
    for(const lantern of run.lanterns)if(!lantern.lit&&distance(lantern,p)<210)igniteLantern(run,lantern);
    run.events.push('pulse');return true;
  }
  return false;
}

const ABILITIES=['slash','sunbreak','dash','pulse','solarLance'];
function applyAim(run,name,aim){
  if(!aim||!Number.isFinite(aim.x)||!Number.isFinite(aim.y))return;
  const length=Math.hypot(aim.x,aim.y);if(length>0&&(name!=='pulse')){run.player.faceX=aim.x/length;run.player.faceY=aim.y/length;}
}
export function requestAbility(run,name,aim){
  if(run.mode!=='running'||!ABILITIES.includes(name)||!knows(run,name))return false;
  if(useAbility(run,name)){applyAim(run,name,aim);return true;}
  const p=run.player,cooldown=p[name+'Cooldown'];
  if(cooldown>0.14)return false;
  run.inputBuffer={name,aim:aim?{x:aim.x,y:aim.y}:null,remaining:0.14};return true;
}
function igniteLantern(run,lantern){
  if(lantern.lit||run.mode!=='running')return;
  lantern.lit=true;lantern.litAt=run.time;run.stats.lanterns++;run.events.push('lantern');
  run.effects.push({kind:'lantern',x:lantern.x,y:lantern.y,age:0,life:0.75});
  run.shots=run.shots.filter(s=>!s.hostile||distance(s,lantern)>170);
  for(const e of run.enemies)if(e.hp>0&&e.warning<=0&&distance(e,lantern)<170)hit(run,e,70,'pulse');
}
function separateEnemies(run,dt){
  const enemies=run.enemies.filter(e=>e.hp>0&&e.warning<=0),obstacles=areaObstacles(run);
  const mobile=e=>e.attack<=0&&e.spell<=0&&e.charge<=0&&e.chargeWarning<=0&&e.stagger<=0;
  for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
    const a=enemies[i],b=enemies[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),limit=(a.radius+b.radius)*0.85;
    if(d>=limit)continue;
    const ma=mobile(a),mb=mobile(b);if(!ma&&!mb)continue;
    const x=d?dx/d:(a.id<b.id?1:-1),y=d?dy/d:0,push=Math.min(limit-d,80*dt)/(ma&&mb?2:1);
    if(ma)moveBody(a,-x*push,-y*push,obstacles,a.radius);if(mb)moveBody(b,x*push,y*push,obstacles,b.radius);
  }
}
export function chooseUpgrade(run,choice){
  if(run.mode!=='upgrade'||!applyAnswer(run,choice,api(run)))return false;
  run.inputBuffer=null;run.level++;run.mode='running';run.events.push('upgrade');return true;
}
function nearestTarget(run,body,range){
  let target=null,best=range;const obstacles=areaObstacles(run);
  for(const e of run.enemies){const d=distance(e,body);if(e.hp>0&&e.warning<=0&&d<best&&clearPath(body,e,obstacles,3)){target=e;best=d;}}
  return target;
}
function shoot(run,body,target,damage,source='hero',hostile=false,angleOffset=0,extra=null){
  const angle=Math.atan2(target.y-body.y,target.x-body.x)+angleOffset,speed=hostile?(body.boss?BOSS_RULES.boltSpeed:225):source==='hero'?650:480;
  run.shots.push({x:body.x,y:body.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:hostile?4:1.15,damage,source,ally:source==='ally'||source==='sol',hostile,...extra});
  run.effects.push({kind:'muzzle',x:body.x,y:body.y-32,angle,source,hostile,moon:!!extra?.moon,age:0,life:0.25});
}
// Every ground warning records its full duration and map family so its fill reads the same
// everywhere; a new mark is declined when it would leave the hero no reachable safe ground.
function placeHazard(run,e,point,radius,delay=0,inner=0,kind='rootfall'){
  const warning=(1.05+delay)*DIFFICULTIES[run.difficulty].warning;
  const hazard={x:clamp(point.x,WORLD.left,WORLD.right),y:clamp(point.y,WORLD.top,WORLD.bottom),radius,inner,kind,family:HAZARD_FAMILIES[run.areaIndex]||'thorn',warning,total:warning,life:0.35,damage:power(e),triggered:false,owner:e.id};
  if(hasHazardEscape(run.player,run.hazards,hazard,areaObstacles(run)))run.hazards.push(hazard);return hazard;
}
function chaseTarget(run,e){return (e.focusId&&e.focusId!=='hero'&&[...activeNpcs(run),...partyTargets(run)].find(n=>n.id===e.focusId))||run.player;}
function power(e){return e.damage*(e.enraged?BOSS_RULES.enrage.damage:1);}
// Queued follow-ups: chasing marks land where the target stands at that moment, and a
// second radial burst fills the gaps of the first.
function runQueue(run,e){
  const due=e.queue.filter(q=>run.time>=q.at);if(!due.length)return;
  e.queue=e.queue.filter(q=>run.time<q.at);
  for(const q of due){
    if(q.step==='chase')placeHazard(run,e,chaseTarget(run,e),BOSS_RULES.chase.radius*(e.bossRank==='champion'?0.85:1),0,0,'chase');
    if(q.step==='twin')for(let i=0;i<q.count;i++)shoot(run,e,{x:e.aimX,y:e.aimY},power(e),'enemy',true,(i+0.5)*Math.PI*2/q.count);
  }
}
function exposeBoss(run,e){
  Object.assign(e,{guardUp:false,guardHp:0,exposedFor:BOSS_RULES.exposed[run.difficulty],guardRegrow:0,guardTime:0,enraged:false,spell:0,attack:0,attackKind:null,attackDuration:e.baseAttackDuration||e.attackDuration,charge:0,chargeWarning:0,closeTime:0,queue:[]});
  e.exposed=e.exposedFor;run.hazards=run.hazards.filter(h=>h.owner!==e.id||h.triggered||h.kind!=='slam');
  run.stats.guardBreaks++;run.events.push('boss-exposed');run.effects.push({kind:'guard-break',x:e.x,y:e.y-60,age:0,life:0.75,boss:true});
}
function tickGuard(run,e,dt){
  if(e.exposed>0){e.exposed=Math.max(0,e.exposed-dt);if(e.exposed===0)e.guardRegrow=BOSS_RULES.regrow[run.difficulty];return;}
  if(!e.guardUp&&e.guardRegrow>0){e.guardRegrow=Math.max(0,e.guardRegrow-dt);if(e.guardRegrow===0){e.guardUp=true;e.guardHp=e.guardMax;e.guardTime=0;run.events.push('boss-guard');}}
  if(e.guardUp&&e.warning<=0&&e.phaseShift<=0){e.guardTime=(e.guardTime||0)+dt;if(!e.enraged&&e.guardTime>=BOSS_RULES.enrage.after[run.difficulty]){e.enraged=true;run.events.push('boss-enraged');}}
}
function beginSlam(run,e){
  const rule=BOSS_RULES.slam,windup=rule.windup*DIFFICULTIES[run.difficulty].warning,warning=windup*0.8;
  Object.assign(e,{attackKind:'slam',attackDuration:windup,attack:windup,slamCooldown:rule.cooldown,closeTime:0,intent:'slam'});
  // The slam lands at four fifths of the wind-up, when the painted strike reaches the ground.
  run.hazards.push({x:e.x,y:e.y,radius:rule.radius,inner:0,kind:'slam',family:HAZARD_FAMILIES[run.areaIndex]||'thorn',warning,total:warning,life:0.35,damage:power(e)*rule.damage,triggered:false,owner:e.id});
}
function summonAdds(run,e){
  const role=BOSSES[run.areaIndex]?.warden.summon;if(!role||e.bossRank==='champion')return;
  let made=0;const toward=Math.atan2(run.player.y-e.y,run.player.x-e.x);
  for(const side of [-1,1]){
    if(run.enemies.length>=BOSS_RULES.summonLimit)break;
    for(const reach of [140,180,105]){
      const at={x:clamp(e.x+Math.cos(toward+side*1.9)*reach,WORLD.left,WORLD.right),y:clamp(e.y+Math.sin(toward+side*1.9)*reach,WORLD.top,WORLD.bottom)};
      if(areaObstacles(run).some(o=>distance(at,o)<o.radius+30))continue;
      if(spawn(run,false,role,false,'warden',at))made++;break;
    }
  }
  if(made)run.events.push('boss-summon');
}
function castEnemySpell(run,e){
  const aim={x:e.aimX,y:e.aimY},champion=e.bossRank==='champion',size=r=>champion?r*0.85:r;
  if(e.boss&&e.bossKind)e.phaseCasts[(e.castPhase||e.phase)-1]++;
  e.openerGuard=false;
  const mark=(point,radius=70,delay=0,inner=0,kind=e.castSkill||e.skill||'rootfall')=>placeHazard(run,e,point,radius,delay,inner,kind);
  const fan=count=>{for(let i=0;i<count;i++)shoot(run,e,aim,power(e),'enemy',true,(i-(count-1)/2)*0.26);};
  const radial=count=>{for(let i=0;i<count;i++)shoot(run,e,aim,power(e),'enemy',true,i*Math.PI*2/count);};
  const skill=e.castSkill||e.skill||(e.boss?BOSSES[run.areaIndex].warden.phases[0][0]:'bolt');
  e.queue||=[];
  if(skill==='nurture'){
    const support=COMBAT.nurture;
    for(const ally of run.enemies)if(!ally.boss&&ally!==e&&ally.hp>0&&ally.hp<ally.maxHp&&run.time>=(ally.nurtureUntil||0)&&distance(e,ally)<support.range){
      ally.hp=Math.min(ally.maxHp,ally.hp+support.amount);ally.nurtureUntil=run.time+support.recipientCooldown;
    }
    run.effects.push({kind:'mend',x:e.x,y:e.y,age:0,life:0.8,hostile:true});mark(aim,58,0.25);
  }
  if(skill==='forge'){const anchor=mark(aim,165,1.4,90);anchor.anchorHp=40;}
  if(skill==='afterimage')for(let i=0;i<3;i++)mark({x:aim.x+(i-1)*105,y:aim.y+(i-1)*55},48,i*0.32);
  if(skill==='meteor')for(let i=0;i<3;i++)mark({x:aim.x+Math.cos(i*2.1)*110,y:aim.y+Math.sin(i*2.1)*110},e.boss?85:58,i*0.3);
  if(skill==='sweep')fan(e.boss?7:5);
  if(skill==='seeker'){for(const offset of [-0.13,0,0.13])shoot(run,e,aim,power(e)*0.8,'enemy',true,offset);}
  if(skill==='bolt')shoot(run,e,aim,power(e),'enemy',true);
  if(skill==='rootfall')mark(aim,e.boss?95:62);
  if(skill==='fan')fan(e.boss?(champion?4:e.phase===2?7:5):3);
  if(skill==='chase'){const rule=BOSS_RULES.chase;mark(chaseTarget(run,e),size(rule.radius),0,0,'chase');for(let i=1;i<(champion?3:rule.steps);i++)e.queue.push({at:run.time+rule.interval*i,step:'chase'});}
  if(skill==='rays'){const spokes=champion?5:6,base=Math.atan2(aim.y-e.y,aim.x-e.x);for(let s=0;s<spokes;s++){const a=base+s*Math.PI*2/spokes;for(let k=0;k<3;k++)mark({x:e.x+Math.cos(a)*(95+k*95),y:e.y+Math.sin(a)*(95+k*95)},size(46),k*0.2,0,'ray');}}
  if(skill==='ripple')for(const [inner,outer,delay] of [[0,95,0],[155,235,0.4],[295,375,0.8]])mark({x:e.x,y:e.y},outer,delay,inner,'ripple');
  // Leading marks fall where a steady runner will be; stopping or turning escapes them.
  if(skill==='lead'){const target=chaseTarget(run,e),warning=DIFFICULTIES[run.difficulty].warning;for(const [ahead,delay] of [[0.75,0],[1.15,0.15],[1.55,0.3]])mark(predictedTarget(target,(ahead+delay)*warning),size(BOSS_RULES.lead.radius),delay,0,'lead');}
  if(skill==='twin'){const count=e.phase===2?12:10;radial(count);e.queue.push({at:run.time+0.45,step:'twin',count});}
  if(skill==='radial')radial(e.boss?(e.phase===2?10:8):6);
  if(skill==='rootline'){
    const d=distance(e,aim)||1,dx=(aim.x-e.x)/d,dy=(aim.y-e.y)/d;
    for(let i=-1;i<=1;i++)mark({x:aim.x+dx*i*95,y:aim.y+dy*i*95},62,(i+1)*0.22);
  }
  if(skill==='ring')mark(aim,155,0.2,85);
  if(skill==='resonance')for(const side of [-1,1])mark({x:aim.x+side*110,y:aim.y},100,0.15,50);
  if(skill==='cross')for(const [dx,dy]of [[0,0],[-135,0],[135,0],[0,-135],[0,135]])mark({x:aim.x+dx,y:aim.y+dy},65,0.25);
  if(skill==='crown'){radial(e.phase===2?12:10);mark(aim,e.phase===2?150:95,0.25,e.phase===2?75:0);}
  affixOnCast(run,e,api(run));
}
function commitSpell(run,e,target){
  const phase=e.boss&&e.hp<=e.maxHp/2?2:1;
  if(e.boss&&phase!==e.phase){e.phase=phase;run.events.push('boss-phase');}
  // Each phase walks its own authored rotation from the start, so a new phase opens with its signature skill.
  const plan=e.boss?BOSSES[run.areaIndex]?.[e.bossRank==='champion'?'champion':'warden']:null,rotation=plan?.phases[phase-1];
  if(rotation){const steps=e.rotation||=[0,0];e.castSkill=rotation[steps[phase-1]++%rotation.length];}
  else e.castSkill=e.skill||'bolt';
  e.castPhase=phase;
  run.campaign.heavyClock=run.difficulty==='hard'?0.32:0.55;
  e.casts=(e.casts||0)+1;e.intent='cast';e.spell=e.spellDuration;e.aimX=target.x;e.aimY=target.y;
  const cadence=BOSS_RULES.cadence[run.difficulty]*(phase===2?BOSS_RULES.phaseCadence:1)*(e.enraged?BOSS_RULES.enrage.cadence:1);
  e.spellCooldown=plan?(plan.cooldown[0]+random(run)*(plan.cooldown[1]-plan.cooldown[0]))*cadence:(e.role?5.5:4)+random(run)*1.2;
}
function updateEnemies(run,dt){
  const p=run.player,setting=DIFFICULTIES[run.difficulty],npcs=activeNpcs(run),allies=partyTargets(run),obstacles=areaObstacles(run);
  for(const e of run.enemies){
    if(e.hp<=0)continue;
    e.moving=false;
    for(const key of ['hit','warning','attackCooldown','stagger','guardBroken','chargeCooldown','chargeRecovery','phaseShift'])e[key]=Math.max(0,(e[key]||0)-dt);
    affixStep(run,e,dt,api(run));if(run.mode!=='running')return;
    if(e.guardMax>0)tickGuard(run,e,dt);
    if(e.queue?.length)runQueue(run,e);
    if(e.warning>0||e.stagger>0||e.chargeRecovery>0||e.phaseShift>0||e.exposed>0)continue;
    const target=enemyTarget(e,p,npcs,run.enemies,run.time,run.difficulty,allies),dist=target?distance(e,target):Infinity;
    if(target)faceToward(e,target.x-e.x,target.y-e.y);
    // A Warden answers anyone who lingers in its reach with a telegraphed slam.
    if(e.guardMax>0&&target){
      e.slamCooldown=Math.max(0,(e.slamCooldown||0)-dt);e.closeTime=dist<BOSS_RULES.slam.reach+e.radius?(e.closeTime||0)+dt:Math.max(0,(e.closeTime||0)-dt);
      if(e.closeTime>=BOSS_RULES.slam.hold&&e.slamCooldown<=0&&e.attack<=0&&e.spell<=0&&e.charge<=0&&e.chargeWarning<=0&&!e.phaseOpener&&!e.openerGuard){beginSlam(run,e);continue;}
    }
    if(e.openerGuard&&e.spell<=0)e.openerGuard=false;
    if(e.phaseOpener&&target&&e.spell<=0){e.phaseOpener=false;commitSpell(run,e,target);e.openerGuard=true;continue;}
    if(e.chargeWarning>0){e.chargeWarning=Math.max(0,e.chargeWarning-dt);if(e.chargeWarning===0)e.charge=COMBAT.charge.duration;continue;}
    if(e.charge>0){
      e.charge=Math.max(0,e.charge-dt);const before={x:e.x,y:e.y};
      moveBody(e,e.chargeX*340*dt,e.chargeY*340*dt,areaObstacles(run),e.radius);e.moving=true;e.walkPhase+=dt*18;
      for(const body of [p,...npcs,...allies])if(segmentCircleTime(before.x,before.y,e.x,e.y,body.x,body.y,e.radius+18)!==null)hurtFriendly(run,body,e.damage*1.3);
      if(distance(before,e)<340*dt*0.45||e.charge===0){e.charge=0;e.chargeRecovery=COMBAT.charge.recovery;}
      if(run.mode!=='running')return;continue;
    }
    if(e.attack>0){
      const before=e.attack;e.attack=Math.max(0,e.attack-dt);
      if(e.attackKind!=='slam'&&before>e.attackDuration/2&&e.attack<=e.attackDuration/2&&dist<e.radius+34&&clearPath(e,target,obstacles,0))hurtFriendly(run,target,e.damage);
      if(e.attack===0&&e.attackKind){e.attackKind=null;e.attackDuration=e.baseAttackDuration||e.attackDuration;}
      if(run.mode!=='running')return;continue;
    }
    if(e.spell>0){
      const before=e.spell;e.spell=Math.max(0,e.spell-dt);const release=(e.spellDuration||0.9)*0.35;
      if(before>release&&e.spell<=release)castEnemySpell(run,e);continue;
    }
    if(!target)continue;
    // A Warden's plain swipe is slower than a Hollow's: its slam already punishes standing close.
    if(dist<e.radius+30&&e.attackCooldown<=0){e.attack=e.attackDuration;e.attackCooldown=e.guardMax>0?1.9:1.25;continue;}
    if((e.runner||e.bossKind==='root'&&e.phase===2)&&run.campaign.heavyClock<=0&&e.chargeCooldown<=0&&dist>100&&dist<330&&clearPath(e,target,obstacles,e.radius)&&hasAttackSlot(run.enemies,e,run.difficulty,'charge')){
      const lead=predictedTarget(target,0.15),aim=clearPath(e,lead,obstacles,e.radius)?lead:target,d=distance(e,aim)||1;
      run.campaign.heavyClock=0.55;e.intent='charge';e.chargeWarning=COMBAT.charge.windup*setting.warning;e.chargeCooldown=4.2+random(run)*2;e.chargeX=(aim.x-e.x)/d;e.chargeY=(aim.y-e.y)/d;e.aimX=aim.x;e.aimY=aim.y;continue;
    }
    e.spellCooldown-=dt*castFactor(run,e);
    if(run.campaign.heavyClock<=0&&(e.boss||e.ranged||e.type==='cantor')&&e.spellCooldown<=0&&dist<580&&clearPath(e,target,obstacles,3)&&hasAttackSlot(run.enemies,e,run.difficulty,'spell')){commitSpell(run,e,target);continue;}
    if(dist>e.radius+15){
      const dir=enemySteering(e,target,obstacles,target===p?run.navigation:targetNavigation(target,obstacles)),before={x:e.x,y:e.y};e.intent=dir.intent;
      const pace=e.speed*dt*speedFactor(run,e);moveBody(e,dir.x*pace,dir.y*pace,areaObstacles(run),e.radius);const moved=distance(before,e);e.moving=moved>0.01;
      if(e.moving)e.walkPhase+=moved/6;
      if(e.boss){e.distanceTravelled=(e.distanceTravelled||0)+moved;if(e.bossRank!=='champion')run.campaign.bossDistance+=moved;}
      e.stuckTime=moved<e.speed*dt*0.2?(e.stuckTime||0)+dt:0;
      if(e.stuckTime>0.6){e.steerSide=-(e.steerSide||1);e.stuckTime=0;}
    }
  }
}
function updateProjectiles(run,dt){
  const p=run.player,obstacles=areaObstacles(run);
  for(const shot of run.shots){
    if(shot.life<=0)continue;
    const travel=Math.min(dt,shot.life),pace=travel*shotSpeedFactor(run,shot),ax=shot.x,ay=shot.y,bx=ax+shot.vx*pace,by=ay+shot.vy*pace;
    let nearest=Infinity,collision=null;
    for(const o of obstacles){const t=segmentCircleTime(ax,ay,bx,by,o.x,o.y,o.radius+3);if(t!==null&&t<nearest){nearest=t;collision={kind:'cover'};}}
    if(shot.hostile){for(const body of friendlies(run)){const t=segmentCircleTime(ax,ay,bx,by,body.x,body.y,22);if(t!==null&&t<nearest){nearest=t;collision={kind:'friendly',body};}}}
    else for(const e of run.enemies)if(e.hp>0&&e.warning<=0&&!shot.hitIds?.includes(e.id)){const t=segmentCircleTime(ax,ay,bx,by,e.x,e.y,e.radius+7);if(t!==null&&t<nearest){nearest=t;collision={kind:'enemy',enemy:e};}}
    if(!shot.hostile)for(const h of run.hazards)if(h.anchorHp>0&&h.life>0){const t=segmentCircleTime(ax,ay,bx,by,h.x,h.y,24);if(t!==null&&t<nearest){nearest=t;collision={kind:'anchor',anchor:h};}}
    shot.x=ax+(bx-ax)*(collision?nearest:1);shot.y=ay+(by-ay)*(collision?nearest:1);shot.life-=dt;
    if(collision){
      if(collision.kind==='enemy'&&shot.pierce>0){shot.pierce--;shot.hitIds.push(collision.enemy.id);}else shot.life=0;
      run.effects.push({kind:'contact',x:shot.x,y:shot.y-20,angle:Math.atan2(shot.vy,shot.vx),source:shot.source,hostile:shot.hostile,moon:!!shot.moon,blocked:collision.kind==='cover'||collision.enemy?.phaseShift>0,age:0,life:0.42});
      if(collision.kind==='cover'){if(shot.hostile)run.stats.coverBlocks++;run.effects.push({kind:'cover',x:shot.x,y:shot.y-20,age:0,life:0.38,hostile:shot.hostile});}
      else if(collision.kind==='anchor'){collision.anchor.anchorHp=Math.max(0,collision.anchor.anchorHp-shot.damage);if(!collision.anchor.anchorHp){collision.anchor.life=0;run.effects.push({kind:'guard-break',x:shot.x,y:shot.y,age:0,life:0.55});}}
      else if(collision.kind==='friendly')hurtFriendly(run,collision.body,shot.damage);
      else hit(run,collision.enemy,shot.damage,shot.source||(shot.ally?'ally':'hero'));
    }
    if(run.mode!=='running')break;
  }
  run.shots=run.shots.filter(s=>s.life>0);
}
function ageVisuals(run,dt){
  for(const fx of run.effects)fx.age+=dt;run.effects=run.effects.filter(e=>e.age<e.life).slice(-160);
  for(const e of run.corpses){e.deathAge+=dt;e.life-=dt;}run.corpses=run.corpses.filter(e=>e.life>0);
}
export function useAutoPowers(run){
  const p=run.player;
  if(!run.autoPowers||run.mode!=='running'||run.gateOpen||run.inputBuffer||p.hurt>0||p.dash>0||p.slash>0||p.sunbreak>0||p.solarLance>0||p.cast>0)return;
  const distant=nearestTarget(run,p,COMBAT.solarLance.range);
  // Automatic powers only reach for skills Zeyu has learned; otherwise the blade keeps swinging.
  if(distant&&knows(run,'solarLance')&&p.solarLanceCooldown<=0&&(distant.boss||distance(distant,p)>200)){requestAbility(run,'solarLance',{x:distant.x-p.x,y:distant.y-p.y});return;}
  const target=nearestTarget(run,p,COMBAT.sunbreak.range);if(!target)return;
  const nearby=run.enemies.filter(e=>e.hp>0&&e.warning<=0&&distance(e,p)<200);
  if(knows(run,'pulse')&&p.pulseCooldown<=0&&(nearby.length>=3||nearby.some(e=>e.boss&&distance(e,p)<150))){useAbility(run,'pulse');return;}
  const aim={x:target.x-p.x,y:target.y-p.y};
  if(knows(run,'sunbreak')&&p.sunbreakCooldown<=0&&(target.boss||target.lieutenant||nearby.length>=2)){requestAbility(run,'sunbreak',aim);return;}
  if(p.slashCooldown<=0&&distance(target,p)<COMBAT.slash.range+p.bladeRange)requestAbility(run,'slash',aim);
}
export function update(run,input,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>0.1)throw new RangeError('Simulation step must be finite and between 0 and 0.1 seconds');
  if(run.mode==='ending'){
    run.ending.remaining=Math.max(0,run.ending.remaining-dt);if(run.player.hp<=0)run.player.deathAge+=dt;ageVisuals(run,dt);
    if(run.ending.remaining===0)run.mode=run.ending.nextMode;return;
  }
  if(run.mode!=='running')return;
  const p=run.player,area=AREAS[run.areaIndex],setting=DIFFICULTIES[run.difficulty];
  useAutoPowers(run);
  for(const actor of [p,...partyMembers(run),...run.enemies,...run.campaign.npcs]){actor.previousX=actor.x;actor.previousY=actor.y;}
  run.time+=dt;run.areaTime+=dt;p.wardClock-=dt;if(p.wardLevel&&p.wardClock<=0){p.shield=Math.max(p.shield,22*p.wardLevel);p.shieldTime=Math.max(p.shieldTime,8);p.wardClock=18;run.events.push('ward');}if(run.rewards.includes('grove'))heal(run,dt*0.35);run.navClock-=dt;p.idlePhase+=dt;
  if(run.navClock<=0){run.navigation=navigationField(areaObstacles(run),p);run.navClock=0.4;}
  const previousSlash=p.slash,previousBreak=p.sunbreak,previousLance=p.solarLance;
  for(const key of ['dash','dashCooldown','pulseCooldown','invulnerable','slash','slashCooldown','comboWindow','cast','sunbreak','sunbreakCooldown','solarLance','solarLanceCooldown','hurt','shieldTime'])p[key]=Math.max(0,(p[key]||0)-dt);
  if(previousSlash>0&&p.slash===0&&p.combo>0)p.comboWindow=p.combo<3?0.5:0;
  if(p.shieldTime===0)p.shield=0;
  if(run.inputBuffer){const pending=run.inputBuffer;if(useAbility(run,pending.name))applyAim(run,pending.name,pending.aim);else{pending.remaining-=dt;if(pending.remaining<=0)run.inputBuffer=null;}}
  let dx=Number.isFinite(input.x)?input.x:0,dy=Number.isFinite(input.y)?input.y:0;const length=Math.hypot(dx,dy);
  if(length>0){dx/=length;dy/=length;if(p.dash<=0&&p.slash<=0&&p.sunbreak<=0&&p.solarLance<=0){p.faceX=dx;p.faceY=dy;}}
  if(p.dash>0){dx=p.faceX*4.3;dy=p.faceY*4.3;}
  const slow=p.sunbreak>0||p.solarLance>0?0.45:p.hurt>0?0.65:1,before={x:p.x,y:p.y};
  const stride=p.speed*dt*slow*speedFactor(run,p);moveBody(p,dx*stride,dy*stride,areaObstacles(run));p.vx=(p.x-before.x)/dt;p.vy=(p.y-before.y)/dt;p.moving=distance(before,p)>0.01;if(p.moving){const moved=distance(before,p);p.walkPhase+=moved/23;p.travelX=(p.x-before.x)/moved;p.travelY=(p.y-before.y)/moved;p.footClock-=dt;if(p.footClock<=0){run.effects.push({kind:'step',x:p.x,y:p.y+22,age:0,life:0.38});p.footClock=0.16;}}
  if(p.moving){const angle=Math.atan2(p.travelY,p.travelX),delta=Math.atan2(Math.sin(angle-run.formationAngle),Math.cos(angle-run.formationAngle));run.formationAngle+=clamp(delta,-3.5*dt,3.5*dt);}
  if(p.dash>0)run.effects.push({kind:'trail',x:p.x,y:p.y,faceX:p.faceX,age:0,life:0.28});
  if(previousLance>COMBAT.solarLance.duration-COMBAT.solarLance.impact&&p.solarLance<=COMBAT.solarLance.duration-COMBAT.solarLance.impact){
    const range=COMBAT.solarLance.range,bx=p.x+p.faceX*range,by=p.y+p.faceY*range,obstacles=areaObstacles(run);
    let stop=1;for(const o of obstacles){const t=segmentCircleTime(p.x,p.y,bx,by,o.x,o.y,o.radius+4);if(t!==null)stop=Math.min(stop,t);}
    const tip={x:p.x+(bx-p.x)*stop,y:p.y+(by-p.y)*stop};
    for(const e of run.enemies)if(e.hp>0&&e.warning<=0&&segmentCircleTime(p.x,p.y,tip.x,tip.y,e.x,e.y,e.radius+24)!==null&&clearPath(p,e,obstacles,0))hit(run,e,80+p.damage*0.8,'sunbreak');
    run.effects.push({kind:'solar-lance',x:p.x,y:p.y,angle:Math.atan2(p.faceY,p.faceX),reach:range*stop,age:0,life:0.55});run.events.push('solar-lance');
  }
  for(const [name,previous] of [['slash',previousSlash],['sunbreak',previousBreak]]){
    const attack=COMBAT[name];if(previous>attack.duration-attack.impact&&p[name]<=attack.duration-attack.impact){
      const finisher=name==='slash'&&p.combo===3,reach=attack.range+(name==='slash'?p.bladeRange+(finisher?18:0):0),push=name==='slash'?(finisher?46:26):55;
      run.effects.push({kind:name,x:p.x,y:p.y,angle:Math.atan2(p.faceY,p.faceX),combo:name==='slash'?p.combo:undefined,age:0,life:name==='slash'?(finisher?0.34:0.27):0.45});run.events.push(finisher?'slash-finisher':name);
      for(const e of run.enemies){const ex=e.x-p.x,ey=e.y-p.y,d=Math.hypot(ex,ey),arc=name==='slash'?0.15-p.bladeArc-(finisher?0.2:0):0.72;
        if(e.hp>0&&e.warning<=0&&d<reach&&(d<1||(ex*p.faceX+ey*p.faceY)/d>arc)&&clearPath(p,e,areaObstacles(run),0)){
          hit(run,e,(name==='slash'?(45+p.damage*0.8)*(finisher?1.5:1):65+p.damage*1.2)*p.bladePower,name==='slash'?'melee':'sunbreak');
          if(d>0&&!e.boss)moveBody(e,ex/d*push,ey/d*push,areaObstacles(run),e.radius);
        }
      }
      for(const h of run.hazards){if(!h.anchorHp)continue;const hx=h.x-p.x,hy=h.y-p.y,d=Math.hypot(hx,hy);if(d<attack.range+p.bladeRange&&(d<1||(hx*p.faceX+hy*p.faceY)/d>0.15)&&clearPath(p,h,areaObstacles(run),0)){h.anchorHp=0;h.life=0;run.effects.push({kind:'guard-break',x:h.x,y:h.y,age:0,life:0.55});}}
      for(const lantern of run.lanterns){const lx=lantern.x-p.x,ly=lantern.y-p.y,d=Math.hypot(lx,ly);if(!lantern.lit&&d<attack.range+(name==='slash'?p.bladeRange:0)&&(d<1||(lx*p.faceX+ly*p.faceY)/d>(name==='slash'?0.15:0.72))&&clearPath(p,lantern,areaObstacles(run),0))igniteLantern(run,lantern);}
      if(run.mode!=='running')return;
    }
  }
  for(const b of run.beacons)if(b.charge<1&&distance(b,p)<78){b.charge=Math.min(1,b.charge+dt/3);if(b.charge===1){b.litAt=run.time;run.effects.push({kind:'restore',x:b.x,y:b.y,age:0,life:1.2});run.stats.beacons++;heal(run,10);run.events.push('beacon');}}
  const npcs=activeNpcs(run),retained=run.enemies.filter(e=>e.boss||e.lieutenant||distance(e,p)<1550||npcs.some(n=>distance(e,n)<650));run.stats.retiredEnemies+=run.enemies.length-retained.length;run.enemies=retained;
  updateNpcCombat(run,dt,shoot);
  updateProgression(run,dt);
  stepEnvironment(run,dt,api(run));if(run.mode!=='running')return;
  directorStep(run,dt,(boss,role,lieutenant,rank)=>{const created=spawn(run,boss,role,lieutenant,rank);if(created&&boss&&rank!=='champion')run.campaign.bossPhases.push(1);return created;},()=>random(run));
  updateEnemies(run,dt);if(run.mode!=='running')return;separateEnemies(run,dt);
  // A hazard strikes friends by default; map-rule hazards may strike Hollow ('enemies') or everyone ('all').
  for(const h of run.hazards){if(h.life<=0)continue;h.warning=Math.max(0,h.warning-dt);if(h.warning===0){if(!h.triggered){h.triggered=true;
    if(h.targets!=='enemies')for(const body of friendlies(run))if(distance(h,body)<h.radius&&distance(h,body)>=(h.inner||0))hurtFriendly(run,body,h.damage);
    if(h.targets==='enemies'||h.targets==='all')for(const e of run.enemies)if(e.hp>0&&e.warning<=0&&distance(h,e)<h.radius+e.radius*0.5&&distance(h,e)>=(h.inner||0))hit(run,e,h.damage,'world');
    run.effects.push({kind:'impact',x:h.x,y:h.y,age:0,life:0.4,world:!!h.world});if(run.mode!=='running')return;}h.life-=dt;}}
  if(run.mode!=='running')return;run.hazards=run.hazards.filter(h=>h.life>0);
  run.fireClock-=dt;
  if(run.fireClock<=0&&p.slash<=0&&p.sunbreak<=0&&p.solarLance<=0&&p.hurt<=0){const target=nearestTarget(run,p,p.fireRange);if(target){shoot(run,p,target,p.damage);if(p.volley)shoot(run,p,target,p.damage*0.55,'hero',false,0.12);run.fireClock=p.fireInterval;if(!p.moving)p.cast=COMBAT.cast.duration;if(!p.moving){const d=distance(target,p)||1;p.faceX=(target.x-p.x)/d;p.faceY=(target.y-p.y)/d;}}}
  giftsStep(run,dt,api(run));stepParty(run,dt,api(run));updateProjectiles(run,dt);if(run.mode!=='running')return;
  for(const item of run.pickups){item.life-=dt;if(item.life>0&&distance(item,p)<35){heal(run,14);item.life=0;run.events.push('mend');}}
  run.pickups=run.pickups.filter(i=>i.life>0);run.enemies=run.enemies.filter(e=>e.hp>0);ageVisuals(run,dt);
  if(!run.gateOpen&&run.level<=ANSWER_THRESHOLDS.length&&run.kills>=ANSWER_THRESHOLDS[run.level-1])run.mode='upgrade';
}
