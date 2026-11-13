import { WORLD, AREAS, DIFFICULTIES, ENEMIES, COMBAT } from '../../content/game.mjs';
import { clamp, distance, moveBody, clearPath, segmentCircleTime, navigationField, directionTo } from './geometry.mjs';
import {JOURNEY,ENEMY_ROLES,REMAINS} from '../../content/journey.mjs';
import {CAMPAIGN,UPGRADES,UPGRADE_THRESHOLDS,upgradeChoices} from '../../content/campaign.mjs';
import {createCampaignArea,creditDefeat,updateProgression,chooseRoute,campaignNotice,areaObstacles} from './progression.mjs';
import {directorStep} from './director.mjs';
import {nearbyInteraction} from './journey.mjs';
import {enemySteering,predictedTarget,hasAttackSlot,hasHazardEscape} from './enemy-ai.mjs';
export { WORLD, clamp };

export function createRun(seed = 7251, difficulty = 'normal') {
  if (!Object.hasOwn(DIFFICULTIES,difficulty)) difficulty = 'normal';
  const setting=DIFFICULTIES[difficulty];
  const run={mode:'running',difficulty,seed:seed>>>0,initialSeed:seed>>>0,time:0,areaTime:0,areaIndex:0,
    kills:0,level:1,nextId:1,spawnClock:2,fireClock:0,bossSpawned:false,ending:null,inputBuffer:null,
    upgrades:{},rewards:[],routeChoices:[],storyTokens:[],enemies:[],shots:[],hazards:[],pickups:[],effects:[],corpses:[],events:[],areaResults:[],
    stats:{damageTaken:0,hitsTaken:0,healing:0,spawned:0,meleeKills:0,allyKills:0,coverBlocks:0,beacons:0,peakEnemies:0,guardBreaks:0,shieldBlocked:0,solKills:0,lanterns:0,retiredEnemies:0,abilities:{slash:0,dash:0,pulse:0,sunbreak:0}},
    companion:{x:AREAS[0].spawn.x-50,y:AREAS[0].spawn.y+60,faceX:1,moving:false,walkPhase:0,idlePhase:0,cast:0,mend:0,ward:0,targetId:null,fireClock:0.7,mendCooldown:14},
    sol:{active:false,x:AREAS[0].spawn.x-80,y:AREAS[0].spawn.y,faceX:1,moving:false,walkPhase:0,idlePhase:0,pounce:0,ward:0,fireClock:1,wardCooldown:8,targetId:null},
    player:{...AREAS[0].spawn,vx:0,vy:0,hp:setting.health,maxHp:setting.health,speed:205,damage:25,bladePower:1,bladeRange:0,bladeArc:0,bladeCooldown:1,breakCooldown:1,fireInterval:0.42,fireRange:500,volley:false,finisher:false,armor:0,wardLevel:0,wardClock:18,mendBonus:0,mendInterval:18,dashInterval:2.5,faceX:1,faceY:0,
      dash:0,dashCooldown:0,pulseCooldown:0,invulnerable:0,moving:false,walkPhase:0,idlePhase:0,travelX:1,travelY:0,footClock:0,
      slash:0,slashCooldown:0,cast:0,sunbreak:0,sunbreakCooldown:0,hurt:0,deathAge:0,shield:0,shieldTime:0}
  };
  prepareArea(run);return run;
}
function prepareArea(run){
  run.beacons=AREAS[run.areaIndex].beacons.map(b=>({...b,charge:0,litAt:null}));
  run.lanterns=AREAS[run.areaIndex].lanterns.map((point,id)=>({...point,id,lit:false,litAt:null}));
  run.inputBuffer=null;run.gateOpen=false;run.npcMet=false;run.campaign=createCampaignArea(run);
  for(const actor of [run.player,run.companion,run.sol]){actor.previousX=actor.x;actor.previousY=actor.y;}
  run.navigation=navigationField(areaObstacles(run),run.player);run.navClock=0;
  run.areaStart={time:run.time,kills:run.kills,damage:run.stats.damageTaken};
}
export function advanceArea(run){
  if(run.mode!=='area-clear'||run.areaIndex>=AREAS.length-1)return false;
  run.areaIndex++;run.areaTime=0;run.spawnClock=2;run.bossSpawned=false;run.fireClock=0;run.ending=null;
  for(const key of ['enemies','shots','hazards','pickups','effects','corpses'])run[key]=[];
  const p=run.player;heal(run,35);
  Object.assign(p,{...AREAS[run.areaIndex].spawn,vx:0,vy:0,travelX:1,travelY:0,slash:0,cast:0,dash:0,sunbreak:0,hurt:0,shield:0,shieldTime:0,moving:false,
    dashCooldown:0,pulseCooldown:0,slashCooldown:0,sunbreakCooldown:0,invulnerable:1});
  Object.assign(run.companion,{x:p.x-50,y:p.y+60,cast:0,mend:0,ward:0,moving:false,fireClock:0.7,mendCooldown:8});
  Object.assign(run.sol,{active:true,x:p.x-80,y:p.y,pounce:0,ward:0,moving:false,fireClock:1,wardCooldown:8});
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
    return {kind:'dialogue',title:target.name+' · '+target.title,text:target.text+(run.rewards.length?' Your companions carry '+run.rewards.join(', ')+'.':'')};
  }
  if(!run.gateOpen)return {kind:'dialogue',title:story.exit.name,text:'The Choir still seals this road. Free the Hollow, resolve your chosen road and gathering, then defeat '+AREAS[run.areaIndex].boss+'. '+story.link};
  run.inputBuffer=null;run.mode=run.areaIndex===AREAS.length-1?'victory':'area-clear';
  return {kind:'travel'};
}
function random(run){run.seed=(Math.imul(run.seed,1664525)+1013904223)>>>0;return run.seed/4294967296;}
function heal(run,amount){const p=run.player;if(p.hp<=0)return;const healed=Math.max(0,Math.min(p.maxHp-p.hp,amount));p.hp+=healed;run.stats.healing+=healed;}
function beginEnding(run,nextMode){if(run.mode!=='running')return;run.mode='ending';run.inputBuffer=null;run.ending={nextMode,remaining:COMBAT.death.duration};run.player.moving=false;run.events.push(nextMode);}
function spawn(run,boss=false,forcedRole=null,lieutenant=false){
  const area=AREAS[run.areaIndex],setting=DIFFICULTIES[run.difficulty],p=run.player;
  const valid=q=>distance(q,p)>300&&(boss||Math.abs(q.x-p.x)>680||Math.abs(q.y-p.y)>440)&&!areaObstacles(run).some(o=>distance(q,o)<o.radius+45);
  let point=null;
  for(let attempt=0;attempt<20;attempt++){
    const jitter=random(run);const angle=!boss&&attempt<6?(run.campaign.entryAngle||0)+(jitter-0.5)*0.8+(run.campaign.groupType==='flank'&&run.campaign.spawnRemaining%2?Math.PI:0):jitter*Math.PI*2,spread=random(run)*120;
    const q={x:clamp(p.x+Math.cos(angle)*((boss?500:790)+spread),WORLD.left,WORLD.right),y:clamp(p.y+Math.sin(angle)*((boss?500:540)+spread),WORLD.top,WORLD.bottom)};
    if(valid(q)){point=q;break;}
  }
  if(!point)for(let y=Math.max(WORLD.top,p.y-850);y<=Math.min(WORLD.bottom,p.y+850)&&!point;y+=120)for(let x=Math.max(WORLD.left,p.x-1000);x<=Math.min(WORLD.right,p.x+1000);x+=120)if(valid({x,y})){point={x,y};break;}
  if(!point)return false;
  const type=boss?'boss':forcedRole||'walker',roleKey=Object.hasOwn(ENEMY_ROLES,type)?type:null,role=ENEMY_ROLES[roleKey],campaign=CAMPAIGN[run.areaIndex];
  const def=role||(boss?{health:campaign.bossHealth,speed:campaign.bossSpeed,radius:42,damage:20}:ENEMIES[type]);
  const hp=def.health*setting.enemyHealth*(boss?1:1+run.areaIndex*0.12+Math.min(run.campaign.stage,3)*0.12)*(lieutenant?3.2:1);
  run.enemies.push({id:run.nextId++,type:roleKey||type,areaIndex:run.areaIndex,role:roleKey,skill:role?.skill,guarded:role?!!role.guarded:type==='sentinel',ranged:!!role?.skill||type==='cantor',phase:1,phaseShift:0,phaseCasts:[0,0],bossKind:boss?campaign.bossKind:null,lieutenant,storyCredit:true,casts:0,...point,hp,maxHp:hp,radius:def.radius,speed:def.speed*setting.speed,boss,runner:role?.runner||(!role&&['runner','pack'].includes(type)),
    skin:role?.skin||(boss?(run.areaIndex===1?'cantor':'sentinel'):type==='cantor'||type==='sentinel'?type:'hollow'),
    damage:def.damage*setting.damage,hit:0,stagger:0,guardBroken:0,warning:1.2*setting.warning,
    attack:0,attackDuration:(type==='sentinel'?0.95:0.7)*setting.warning,attackCooldown:0,walkPhase:random(run)*4,moving:false,
    spell:0,spellDuration:0.9*setting.warning,spellCooldown:boss?2.8:1.4+random(run)*2.6,aimX:0,aimY:0,faceX:p.x>=point.x?1:-1,
    charge:0,chargeWarning:0,chargeCooldown:1.4+random(run)*3,chargeRecovery:0,chargeX:0,chargeY:0,steerSide:run.nextId%2?1:-1,stuckTime:0,intent:'arriving'});
  run.stats.spawned++;run.stats.peakEnemies=Math.max(run.stats.peakEnemies,run.enemies.length);
  if(boss)run.events.push('boss');return true;
}
function hurtPlayer(run,amount){
  const p=run.player;if(p.invulnerable>0||run.mode!=='running'||run.gateOpen)return;
  const blocked=Math.min(p.shield,amount);p.shield-=blocked;run.stats.shieldBlocked+=blocked;amount-=blocked;
  if(blocked){run.events.push('ward-hit');run.effects.push({kind:'ward',x:p.x,y:p.y,age:0,life:0.3});}
  if(amount<=0){p.invulnerable=0.2;return;}
  const damage=Math.min(p.hp,amount*(1-Math.min(0.35,p.armor||0)));p.hp-=damage;p.invulnerable=0.75;p.hurt=COMBAT.hurt.duration;
  p.slash=0;p.sunbreak=0;p.cast=0;run.stats.damageTaken+=damage;run.stats.hitsTaken++;run.events.push('hurt');
  run.effects.push({kind:'damage',x:p.x,y:p.y-55,value:Math.ceil(damage),age:0,life:0.6});
  if(p.hp<=0)beginEnding(run,'defeat');
}
function hit(run,enemy,damage,source='hero'){
  if(enemy.hp<=0||run.mode!=='running'||run.gateOpen||enemy.phaseShift>0)return;
  if((enemy.guarded||enemy.type==='sentinel')&&enemy.guardBroken<=0){
    if(source==='melee'||source==='sunbreak'||source==='pulse'){
      enemy.guardBroken=2.4;enemy.stagger=0.5;run.stats.guardBreaks++;run.events.push('guard-break');
      run.effects.push({kind:'guard-break',x:enemy.x,y:enemy.y,age:0,life:0.55});
    }else damage*=0.4;
  }
  if(run.player.finisher&&['melee','sunbreak'].includes(source)&&enemy.hp<enemy.maxHp/2)damage*=1.4;
  const nextHp=Math.max(0,enemy.hp-damage);
  if(enemy.boss&&enemy.bossKind&&enemy.phase===1&&nextHp<=enemy.maxHp/2){
    enemy.hp=enemy.maxHp/2;enemy.phase=2;enemy.phaseShift=1.1;enemy.spell=0;enemy.attack=0;enemy.spellCooldown=0.2;enemy.speed*=1.25;
    run.campaign.bossPhases.push(2);run.events.push('boss-phase');
  }else enemy.hp=nextHp;
  enemy.hit=0.22;
  if(!enemy.boss&&(source==='melee'||source==='sunbreak')){enemy.stagger=Math.max(enemy.stagger,0.25);enemy.attack=0;enemy.spell=0;enemy.charge=0;enemy.chargeWarning=0;enemy.chargeRecovery=0.4;enemy.attackCooldown=0.6;}
  run.effects.push({kind:'hit',x:enemy.x,y:enemy.y-25,age:0,life:0.18});
  if(enemy.hp>0)return;
  run.kills++;creditDefeat(run,enemy);if(source==='melee'||source==='sunbreak')run.stats.meleeKills++;if(source==='ally'||source==='sol')run.stats.allyKills++;if(source==='sol')run.stats.solKills++;
  run.corpses.push({...enemy,deathAge:0,life:(enemy.boss?REMAINS.bossHold:REMAINS.hold)+REMAINS.fade});run.corpses=run.corpses.slice(-REMAINS.limit);
  if(run.kills%7===0)run.pickups.push({x:enemy.x,y:enemy.y,life:22});
  if(enemy.boss){run.areaResults.push({area:AREAS[run.areaIndex].name,seconds:run.time-run.areaStart.time,kills:run.kills-run.areaStart.kills,damageTaken:run.stats.damageTaken-run.areaStart.damage,route:run.campaign.choice,defeats:run.campaign.defeats,milestones:[...run.campaign.milestones],eventComplete:run.campaign.event.complete,lieutenantDefeated:run.campaign.lieutenantDefeated,bossPhases:[...run.campaign.bossPhases],bossDistance:run.campaign.bossDistance,bossCasts:[...(enemy.phaseCasts||[])],npcs:run.campaign.npcs.filter(n=>n.met).map(n=>n.id)});run.gateOpen=true;run.storyTokens.push(JOURNEY[run.areaIndex].token);run.shots=[];run.hazards=[];run.enemies=[];run.events.push('gate-open');}
}
export function useAbility(run,name){
  if(run.mode!=='running')return false;
  const p=run.player;
  if(name==='slash'&&p.slashCooldown<=0&&p.dash<=0&&p.sunbreak<=0&&p.hurt<=0){run.inputBuffer=null;p.slash=COMBAT.slash.duration;p.slashCooldown=COMBAT.slash.cooldown*p.bladeCooldown;p.cast=0;run.stats.abilities.slash++;return true;}
  if(name==='sunbreak'&&p.sunbreakCooldown<=0&&p.dash<=0&&p.slash<=0&&p.hurt<=0){run.inputBuffer=null;p.sunbreak=COMBAT.sunbreak.duration;p.sunbreakCooldown=COMBAT.sunbreak.cooldown*p.breakCooldown;p.cast=0;run.stats.abilities.sunbreak++;return true;}
  if(name==='dash'&&p.dashCooldown<=0){run.inputBuffer=null;p.dash=COMBAT.dash.duration;p.dashCooldown=p.dashInterval;p.invulnerable=Math.max(p.invulnerable,0.35);p.hurt=0;p.slash=0;p.sunbreak=0;run.stats.abilities.dash++;run.events.push('dash');return true;}
  if(name==='pulse'&&p.pulseCooldown<=0){
    run.inputBuffer=null;p.pulseCooldown=8;p.cast=COMBAT.cast.duration;run.stats.abilities.pulse++;run.effects.push({kind:'pulse',x:p.x,y:p.y,age:0,life:0.7});
    for(const e of run.enemies)if(e.warning<=0&&distance(e,p)<210)hit(run,e,85+p.damage,'pulse');
    run.shots=run.shots.filter(s=>!s.hostile||distance(s,p)>210);for(const h of run.hazards)if(h.anchorHp>0&&distance(h,p)<210){h.anchorHp=0;h.life=0;}
    for(const lantern of run.lanterns)if(!lantern.lit&&distance(lantern,p)<210)igniteLantern(run,lantern);
    run.events.push('pulse');return true;
  }
  return false;
}

const ABILITIES=['slash','sunbreak','dash','pulse'];
function applyAim(run,name,aim){
  if(!aim||!Number.isFinite(aim.x)||!Number.isFinite(aim.y))return;
  const length=Math.hypot(aim.x,aim.y);if(length>0&&(name!=='pulse')){run.player.faceX=aim.x/length;run.player.faceY=aim.y/length;}
}
export function requestAbility(run,name,aim){
  if(run.mode!=='running'||!ABILITIES.includes(name))return false;
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
function followPartyMember(run,body,side,speed,dt,radius){
  const p=run.player,obstacles=areaObstacles(run),tx=p.travelX??1,ty=p.travelY??0;
  let target={x:clamp(p.x-tx*72-ty*side,WORLD.left,WORLD.right),y:clamp(p.y-ty*72+tx*side,WORLD.top,WORLD.bottom)};
  if(obstacles.some(o=>distance(target,o)<o.radius+radius+4))target=p;
  const gap=distance(body,target);body.moving=gap>18;
  if(!body.moving)return;
  const dir=directionTo(body,target,obstacles,run.navigation),step=Math.min(speed*dt,Math.max(0,gap-12));
  const before={x:body.x,y:body.y};moveBody(body,dir.x*step,dir.y*step,obstacles,radius);
  const moved=distance(body,before);body.moving=moved>0.01;if(body.moving){body.faceX=dir.x>=0?1:-1;body.walkPhase+=moved/(body===run.sol?25:32);}
}

export function chooseUpgrade(run,choice){
  const card=upgradeChoices(run).find(c=>c.id===choice);
  if(run.mode!=='upgrade'||!card)return false;
  const p=run.player;run.upgrades[choice]=(run.upgrades[choice]||0)+1;
  if(choice==='radiance')p.damage*=1.28;
  if(choice==='resolve'){p.maxHp+=20;heal(run,45);}
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
  run.inputBuffer=null;run.level++;run.mode='running';run.events.push('upgrade');return true;
}
function nearestTarget(run,body,range){
  let target=null,best=range;const obstacles=areaObstacles(run);
  for(const e of run.enemies){const d=distance(e,body);if(e.hp>0&&e.warning<=0&&d<best&&clearPath(body,e,obstacles,3)){target=e;best=d;}}
  return target;
}
function shoot(run,body,target,damage,source='hero',hostile=false,angleOffset=0){
  const angle=Math.atan2(target.y-body.y,target.x-body.x)+angleOffset,speed=hostile?225:source==='hero'?650:480;
  run.shots.push({x:body.x,y:body.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:hostile?4:1.15,damage,source,ally:source==='ally'||source==='sol',hostile});
}
function castEnemySpell(run,e){
  const setting=DIFFICULTIES[run.difficulty],aim={x:e.aimX,y:e.aimY};
  const mark=(point,radius=70,delay=0,inner=0)=>{const hazard={x:clamp(point.x,WORLD.left,WORLD.right),y:clamp(point.y,WORLD.top,WORLD.bottom),radius,inner,kind:e.castSkill||e.skill||'rootfall',warning:(1.05+delay)*setting.warning,life:0.35,damage:e.damage,triggered:false};if(hasHazardEscape(run.player,run.hazards,hazard,areaObstacles(run)))run.hazards.push(hazard);return hazard;};
  const fan=count=>{for(let i=0;i<count;i++)shoot(run,e,aim,e.damage,'enemy',true,(i-(count-1)/2)*0.26);};
  const radial=count=>{for(let i=0;i<count;i++)shoot(run,e,aim,e.damage,'enemy',true,i*Math.PI*2/count);};
  const skill=e.castSkill||e.skill||(e.boss?['rootfall','fan','crown'][run.areaIndex]:'bolt');
  if(skill==='nurture'){
    for(const ally of run.enemies)if(!ally.boss&&ally!==e&&distance(e,ally)<230)ally.hp=Math.min(ally.maxHp,ally.hp+18);
    run.effects.push({kind:'mend',x:e.x,y:e.y,age:0,life:0.8,hostile:true});mark(aim,58,0.25);
  }
  if(skill==='forge'){const anchor=mark(aim,165,1.4,90);anchor.anchorHp=40;}
  if(skill==='afterimage')for(let i=0;i<3;i++)mark({x:aim.x+(i-1)*105,y:aim.y+(i-1)*55},48,i*0.32);
  if(skill==='bolt')shoot(run,e,aim,e.damage,'enemy',true);
  if(skill==='rootfall')mark(aim,e.boss?95:62);
  if(skill==='fan')fan(e.boss&&e.phase===2?5:3);
  if(skill==='radial')radial(6);
  if(skill==='rootline'){
    const d=distance(e,aim)||1,dx=(aim.x-e.x)/d,dy=(aim.y-e.y)/d;
    for(let i=-1;i<=1;i++)mark({x:aim.x+dx*i*95,y:aim.y+dy*i*95},62,(i+1)*0.22);
  }
  if(skill==='ring')mark(aim,155,0.2,85);
  if(skill==='resonance')for(const side of [-1,1])mark({x:aim.x+side*110,y:aim.y},100,0.15,50);
  if(skill==='cross')for(const [dx,dy]of [[0,0],[-135,0],[135,0],[0,-135],[0,135]])mark({x:aim.x+dx,y:aim.y+dy},65,0.25);
  if(skill==='crown'){radial(e.phase===2?12:10);mark(aim,e.phase===2?150:95,0.25,e.phase===2?75:0);}
}
function commitSpell(run,e){
  const phase=e.boss&&e.hp<=e.maxHp/2?2:1;
  if(e.boss&&phase!==e.phase){e.phase=phase;run.events.push('boss-phase');}
  const count=e.casts||0;
  e.castSkill=e.skill||(e.boss?(phase===1?['rootfall','fan','crown'][run.areaIndex]:[['rootline','ring'],['fan','resonance'],['cross','crown']][run.areaIndex][count%2]):'bolt');
  if(e.boss&&e.bossKind)e.phaseCasts[phase-1]++;
  run.campaign.heavyClock=run.difficulty==='hard'?0.32:0.55;
  e.casts=count+1;e.intent='cast';e.spell=e.spellDuration;e.aimX=run.player.x;e.aimY=run.player.y;
  e.spellCooldown=(e.boss?4.4:e.role?5.5:4)+random(run)*1.2;
}
function updateEnemies(run,dt){
  const p=run.player,area=AREAS[run.areaIndex],setting=DIFFICULTIES[run.difficulty];
  for(const e of run.enemies){
    if(e.hp<=0)continue;
    e.moving=false;
    for(const key of ['hit','warning','attackCooldown','stagger','guardBroken','chargeCooldown','chargeRecovery','phaseShift'])e[key]=Math.max(0,(e[key]||0)-dt);
    if(e.warning>0||e.stagger>0||e.chargeRecovery>0||e.phaseShift>0)continue;
    const dist=distance(e,p);e.faceX=p.x>=e.x?1:-1;
    if(e.chargeWarning>0){e.chargeWarning=Math.max(0,e.chargeWarning-dt);if(e.chargeWarning===0)e.charge=COMBAT.charge.duration;continue;}
    if(e.charge>0){
      e.charge=Math.max(0,e.charge-dt);const before={x:e.x,y:e.y};
      moveBody(e,e.chargeX*340*dt,e.chargeY*340*dt,areaObstacles(run),e.radius);e.moving=true;e.walkPhase+=dt*18;
      if(segmentCircleTime(before.x,before.y,e.x,e.y,p.x,p.y,e.radius+18)!==null)hurtPlayer(run,e.damage*1.3);
      if(distance(before,e)<340*dt*0.45||e.charge===0){e.charge=0;e.chargeRecovery=COMBAT.charge.recovery;}
      if(run.mode!=='running')return;continue;
    }
    if(e.attack>0){
      const before=e.attack;e.attack=Math.max(0,e.attack-dt);
      if(before>e.attackDuration/2&&e.attack<=e.attackDuration/2&&dist<e.radius+34&&clearPath(e,p,areaObstacles(run),0))hurtPlayer(run,e.damage);
      if(run.mode!=='running')return;continue;
    }
    if(e.spell>0){
      const before=e.spell;e.spell=Math.max(0,e.spell-dt);const release=(e.spellDuration||0.9)*0.35;
      if(before>release&&e.spell<=release)castEnemySpell(run,e);continue;
    }
    if(dist<e.radius+30&&e.attackCooldown<=0){e.attack=e.attackDuration;e.attackCooldown=1.25;continue;}
    if((e.runner||e.bossKind==='root'&&e.phase===2)&&run.campaign.heavyClock<=0&&e.chargeCooldown<=0&&dist>100&&dist<330&&clearPath(e,p,areaObstacles(run),e.radius)&&hasAttackSlot(run.enemies,e,run.difficulty,'charge')){
      const lead=predictedTarget(p,0.15),aim=clearPath(e,lead,areaObstacles(run),e.radius)?lead:p,d=distance(e,aim)||1;
      run.campaign.heavyClock=0.55;e.intent='charge';e.chargeWarning=COMBAT.charge.windup*setting.warning;e.chargeCooldown=4.2+random(run)*2;e.chargeX=(aim.x-e.x)/d;e.chargeY=(aim.y-e.y)/d;e.aimX=aim.x;e.aimY=aim.y;continue;
    }
    e.spellCooldown-=dt;
    if(run.campaign.heavyClock<=0&&(e.boss||e.ranged||e.type==='cantor')&&e.spellCooldown<=0&&dist<580&&clearPath(e,p,areaObstacles(run),3)&&hasAttackSlot(run.enemies,e,run.difficulty,'spell')){commitSpell(run,e);continue;}
    if(dist>e.radius+15){
      const dir=enemySteering(e,p,areaObstacles(run),run.navigation),before={x:e.x,y:e.y};e.intent=dir.intent;
      moveBody(e,dir.x*e.speed*dt,dir.y*e.speed*dt,areaObstacles(run),e.radius);const moved=distance(before,e);e.moving=moved>0.01;
      if(e.moving)e.walkPhase+=moved/6;
      if(e.boss)run.campaign.bossDistance+=moved;
      e.stuckTime=moved<e.speed*dt*0.2?(e.stuckTime||0)+dt:0;
      if(e.stuckTime>0.6){e.steerSide=-(e.steerSide||1);e.stuckTime=0;}
    }
  }
}
function updateParty(run,dt){
  const p=run.player,area=AREAS[run.areaIndex],setting=DIFFICULTIES[run.difficulty],ally=run.companion;
  const castBefore=ally.cast,mendBefore=ally.mend;
  for(const key of ['cast','mend','ward','mendCooldown'])ally[key]=Math.max(0,(ally[key]||0)-dt);
  ally.fireClock-=dt;ally.idlePhase+=dt;
  if(castBefore>COMBAT.allyCast.duration-COMBAT.allyCast.impact&&ally.cast<=COMBAT.allyCast.duration-COMBAT.allyCast.impact){
    const target=run.enemies.find(e=>e.id===ally.targetId&&e.hp>0);if(target&&clearPath(ally,target,areaObstacles(run),3))shoot(run,ally,target,21+run.areaIndex*5,'ally');
  }
  if(mendBefore>COMBAT.mend.duration-COMBAT.mend.impact&&ally.mend<=COMBAT.mend.duration-COMBAT.mend.impact){heal(run,setting.heal+p.mendBonus);run.effects.push({kind:'mend',x:p.x,y:p.y,age:0,life:0.8});run.events.push('mend');}
  ally.moving=false;
  if(ally.cast<=0&&ally.mend<=0)followPartyMember(run,ally,48,255,dt,16);
  if(ally.mendCooldown<=0&&p.hp<p.maxHp&&ally.cast<=0){ally.mend=COMBAT.mend.duration;ally.mendCooldown=p.mendInterval;ally.moving=false;}
  else if(ally.fireClock<=0&&ally.cast<=0&&ally.mend<=0){const target=nearestTarget(run,ally,480);if(target){ally.cast=COMBAT.allyCast.duration;ally.fireClock=1.2;ally.targetId=target.id;ally.faceX=target.x>=ally.x?1:-1;}}
  const sol=run.sol;if(!sol.active)return;
  const before=sol.pounce;for(const key of ['pounce','ward','wardCooldown'])sol[key]=Math.max(0,sol[key]-dt);sol.fireClock-=dt;sol.idlePhase+=dt;
  if(before>0.22&&sol.pounce<=0.22){const target=run.enemies.find(e=>e.id===sol.targetId&&e.hp>0);if(target&&clearPath(sol,target,areaObstacles(run),3))shoot(run,sol,target,19,'sol');}
  sol.moving=false;
  if(sol.pounce<=0&&sol.ward<=0)followPartyMember(run,sol,-48,280,dt,13);
  if(sol.wardCooldown<=0&&p.hp<p.maxHp*0.75&&p.shield<=0){sol.ward=0.8;sol.wardCooldown=18;p.shield=18;p.shieldTime=6;ally.ward=0.8;run.events.push('ward');}
  else if(sol.fireClock<=0&&sol.pounce<=0&&sol.ward<=0){const target=nearestTarget(run,sol,350);if(target){sol.pounce=0.55;sol.fireClock=1.65;sol.targetId=target.id;sol.faceX=target.x>=sol.x?1:-1;}}
}
function updateProjectiles(run,dt){
  const p=run.player,obstacles=areaObstacles(run);
  for(const shot of run.shots){
    if(shot.life<=0)continue;
    const travel=Math.min(dt,shot.life),ax=shot.x,ay=shot.y,bx=ax+shot.vx*travel,by=ay+shot.vy*travel;
    let nearest=Infinity,collision=null;
    for(const o of obstacles){const t=segmentCircleTime(ax,ay,bx,by,o.x,o.y,o.radius+3);if(t!==null&&t<nearest){nearest=t;collision={kind:'cover'};}}
    if(shot.hostile){const t=segmentCircleTime(ax,ay,bx,by,p.x,p.y,22);if(t!==null&&t<nearest){nearest=t;collision={kind:'player'};}}
    else for(const e of run.enemies)if(e.hp>0&&e.warning<=0){const t=segmentCircleTime(ax,ay,bx,by,e.x,e.y,e.radius+7);if(t!==null&&t<nearest){nearest=t;collision={kind:'enemy',enemy:e};}}
    if(!shot.hostile)for(const h of run.hazards)if(h.anchorHp>0&&h.life>0){const t=segmentCircleTime(ax,ay,bx,by,h.x,h.y,24);if(t!==null&&t<nearest){nearest=t;collision={kind:'anchor',anchor:h};}}
    shot.x=ax+(bx-ax)*(collision?nearest:1);shot.y=ay+(by-ay)*(collision?nearest:1);shot.life-=dt;
    if(collision){shot.life=0;if(collision.kind==='cover'){if(shot.hostile)run.stats.coverBlocks++;run.effects.push({kind:'cover',x:shot.x,y:shot.y,age:0,life:0.28,hostile:shot.hostile});}else if(collision.kind==='anchor'){collision.anchor.anchorHp=Math.max(0,collision.anchor.anchorHp-shot.damage);if(!collision.anchor.anchorHp)collision.anchor.life=0;}else if(collision.kind==='player')hurtPlayer(run,shot.damage);else hit(run,collision.enemy,shot.damage,shot.source||(shot.ally?'ally':'hero'));}
    if(run.mode!=='running')break;
  }
  run.shots=run.shots.filter(s=>s.life>0);
}
function ageVisuals(run,dt){
  for(const fx of run.effects)fx.age+=dt;run.effects=run.effects.filter(e=>e.age<e.life).slice(-160);
  for(const e of run.corpses){e.deathAge+=dt;e.life-=dt;}run.corpses=run.corpses.filter(e=>e.life>0);
}
export function update(run,input,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>0.1)throw new RangeError('Simulation step must be finite and between 0 and 0.1 seconds');
  if(run.mode==='ending'){
    run.ending.remaining=Math.max(0,run.ending.remaining-dt);if(run.player.hp<=0)run.player.deathAge+=dt;ageVisuals(run,dt);
    if(run.ending.remaining===0)run.mode=run.ending.nextMode;return;
  }
  if(run.mode!=='running')return;
  const p=run.player,area=AREAS[run.areaIndex],setting=DIFFICULTIES[run.difficulty];
  for(const actor of [p,run.companion,run.sol,...run.enemies]){actor.previousX=actor.x;actor.previousY=actor.y;}
  run.time+=dt;run.areaTime+=dt;p.wardClock-=dt;if(p.wardLevel&&p.wardClock<=0){p.shield=22*p.wardLevel;p.shieldTime=8;p.wardClock=18;run.events.push('ward');}if(run.rewards.includes('grove'))heal(run,dt*0.35);run.navClock-=dt;p.idlePhase+=dt;
  if(run.navClock<=0){run.navigation=navigationField(areaObstacles(run),p);run.navClock=0.4;}
  const previousSlash=p.slash,previousBreak=p.sunbreak;
  for(const key of ['dash','dashCooldown','pulseCooldown','invulnerable','slash','slashCooldown','cast','sunbreak','sunbreakCooldown','hurt','shieldTime'])p[key]=Math.max(0,p[key]-dt);
  if(p.shieldTime===0)p.shield=0;
  if(run.inputBuffer){const pending=run.inputBuffer;if(useAbility(run,pending.name))applyAim(run,pending.name,pending.aim);else{pending.remaining-=dt;if(pending.remaining<=0)run.inputBuffer=null;}}
  let dx=Number.isFinite(input.x)?input.x:0,dy=Number.isFinite(input.y)?input.y:0;const length=Math.hypot(dx,dy);
  if(length>0){dx/=length;dy/=length;if(p.dash<=0&&p.slash<=0&&p.sunbreak<=0){p.faceX=dx;p.faceY=dy;}}
  if(p.dash>0){dx=p.faceX*4.3;dy=p.faceY*4.3;}
  const slow=p.sunbreak>0?0.45:p.hurt>0?0.65:1,before={x:p.x,y:p.y};
  moveBody(p,dx*p.speed*dt*slow,dy*p.speed*dt*slow,areaObstacles(run));p.vx=(p.x-before.x)/dt;p.vy=(p.y-before.y)/dt;p.moving=distance(before,p)>0.01;if(p.moving){const moved=distance(before,p);p.walkPhase+=moved/23;p.travelX=(p.x-before.x)/moved;p.travelY=(p.y-before.y)/moved;p.footClock-=dt;if(p.footClock<=0){run.effects.push({kind:'step',x:p.x,y:p.y+22,age:0,life:0.38});p.footClock=0.16;}}
  if(p.dash>0)run.effects.push({kind:'trail',x:p.x,y:p.y,faceX:p.faceX,age:0,life:0.28});
  for(const [name,previous] of [['slash',previousSlash],['sunbreak',previousBreak]]){
    const attack=COMBAT[name];if(previous>attack.duration-attack.impact&&p[name]<=attack.duration-attack.impact){
      run.effects.push({kind:name,x:p.x,y:p.y,angle:Math.atan2(p.faceY,p.faceX),age:0,life:name==='slash'?0.27:0.45});run.events.push(name);
      for(const e of run.enemies){const ex=e.x-p.x,ey=e.y-p.y,d=Math.hypot(ex,ey),arc=name==='slash'?0.15-p.bladeArc:0.72;
        if(e.hp>0&&e.warning<=0&&d<attack.range+(name==='slash'?p.bladeRange:0)&&(d<1||(ex*p.faceX+ey*p.faceY)/d>arc)&&clearPath(p,e,areaObstacles(run),0)){
          hit(run,e,(name==='slash'?45+p.damage*0.8:65+p.damage*1.2)*p.bladePower,name==='slash'?'melee':'sunbreak');
          if(d>0&&!e.boss)moveBody(e,ex/d*(name==='slash'?26:55),ey/d*(name==='slash'?26:55),areaObstacles(run),e.radius);
        }
      }
      for(const h of run.hazards){if(!h.anchorHp)continue;const hx=h.x-p.x,hy=h.y-p.y,d=Math.hypot(hx,hy);if(d<attack.range+p.bladeRange&&(d<1||(hx*p.faceX+hy*p.faceY)/d>0.15)&&clearPath(p,h,areaObstacles(run),0)){h.anchorHp=0;h.life=0;run.effects.push({kind:'guard-break',x:h.x,y:h.y,age:0,life:0.55});}}
      for(const lantern of run.lanterns){const lx=lantern.x-p.x,ly=lantern.y-p.y,d=Math.hypot(lx,ly);if(!lantern.lit&&d<attack.range+(name==='slash'?p.bladeRange:0)&&(d<1||(lx*p.faceX+ly*p.faceY)/d>(name==='slash'?0.15:0.72))&&clearPath(p,lantern,areaObstacles(run),0))igniteLantern(run,lantern);}
      if(run.mode!=='running')return;
    }
  }
  for(const b of run.beacons)if(b.charge<1&&distance(b,p)<78){b.charge=Math.min(1,b.charge+dt/3);if(b.charge===1){b.litAt=run.time;run.effects.push({kind:'restore',x:b.x,y:b.y,age:0,life:1.2});run.stats.beacons++;heal(run,10);run.events.push('beacon');}}
  const retained=run.enemies.filter(e=>e.boss||e.lieutenant||distance(e,p)<1550);run.stats.retiredEnemies+=run.enemies.length-retained.length;run.enemies=retained;
  updateProgression(run,dt);
  directorStep(run,dt,(boss,role,lieutenant)=>{const created=spawn(run,boss,role,lieutenant);if(created&&boss)run.campaign.bossPhases.push(1);return created;},()=>random(run));
  updateEnemies(run,dt);if(run.mode!=='running')return;separateEnemies(run,dt);
  for(const h of run.hazards){if(h.life<=0)continue;h.warning=Math.max(0,h.warning-dt);if(h.warning===0){if(!h.triggered){h.triggered=true;if(distance(h,p)<h.radius&&distance(h,p)>=(h.inner||0))hurtPlayer(run,h.damage);run.effects.push({kind:'impact',x:h.x,y:h.y,age:0,life:0.4});}h.life-=dt;}}
  if(run.mode!=='running')return;run.hazards=run.hazards.filter(h=>h.life>0);
  run.fireClock-=dt;
  if(run.fireClock<=0&&p.slash<=0&&p.sunbreak<=0&&p.hurt<=0){const target=nearestTarget(run,p,p.fireRange);if(target){shoot(run,p,target,p.damage);if(p.volley)shoot(run,p,target,p.damage*0.55,'hero',false,0.12);run.fireClock=p.fireInterval;if(!p.moving)p.cast=COMBAT.cast.duration;if(!p.moving){const d=distance(target,p)||1;p.faceX=(target.x-p.x)/d;p.faceY=(target.y-p.y)/d;}}}
  updateParty(run,dt);updateProjectiles(run,dt);if(run.mode!=='running')return;
  for(const item of run.pickups){item.life-=dt;if(item.life>0&&distance(item,p)<35){heal(run,14);item.life=0;run.events.push('mend');}}
  run.pickups=run.pickups.filter(i=>i.life>0);run.enemies=run.enemies.filter(e=>e.hp>0);ageVisuals(run,dt);
  if(!run.gateOpen&&run.level<=UPGRADE_THRESHOLDS.length&&run.kills>=UPGRADE_THRESHOLDS[run.level-1])run.mode='upgrade';
}
