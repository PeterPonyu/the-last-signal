// Enemy gifts (affixes) granted per map and stage. Owned by the world-rules worker.
// One gift per Hollow, rolled once at spawn from a seeded hash of the run seed and the enemy id (so
// gifts never shift the shared spawn stream). Per-gift state lives on the enemy as affix* fields.
import {AFFIXES,MAP_AFFIXES,SHARED_AFFIXES,AFFIX_CHANCE,BOSS_AFFIXES} from '../../content/affixes.mjs';
import {DIFFICULTIES,WORLD} from '../../content/game.mjs';
import {ENEMY_ROLES} from '../../content/journey.mjs';
import {HAZARD_FAMILIES} from '../../content/bosses.mjs';
import {distance,clamp} from './geometry.mjs';
import {areaObstacles} from './progression.mjs';
import {partyTargets} from './party.mjs';
import {activeNpcs} from './npc-ai.mjs';
import {mix} from './environment.mjs';

const TAU=Math.PI*2,SHARDS=new Set(['hero','ally','sol','npc']),RANGED=new Set([...SHARDS,'world']);
// Run-wide memory of gifts: which ids the hero has seen (one 'affix' event each) and the newest one.
export function affixLog(run){return run.affixLog||={seen:[],latest:null,splitting:false};}
export function affixName(id){return AFFIXES[id]?.name||id;}
export function affixHint(id){return AFFIXES[id]?.hint||'';}
// "Thorned Thorn Sower": the gift's prefix before the bearer's name (English; translated at display time).
export function affixTitle(enemy){
  const base=enemy?.bossName||ENEMY_ROLES[enemy?.role]?.name||'Hollow';
  return enemy?.affix&&AFFIXES[enemy.affix]?affixName(enemy.affix)+' '+base:base;
}
export function affixEligible(id,e){
  const only=AFFIXES[id]?.only;
  if(only==='casters')return !!(e.ranged||e.skill||e.type==='cantor');
  if(only==='unguarded')return !(e.guarded||e.type==='sentinel');
  if(only==='firstborn')return !(e.summoned||e.type==='pack'||e.lieutenant||e.boss);
  return true;
}
// The chance that an ordinary Hollow spawned now carries a gift.
export function affixChance(run){
  const map=run.areaIndex,stage=Math.min(4,run.campaign?.stage||0);
  if(stage<(AFFIX_CHANCE.start[map]??0))return 0;
  return Math.min(0.85,((AFFIX_CHANCE.base[map]??0)+(AFFIX_CHANCE.perStage[map]??0)*stage)*(AFFIX_CHANCE.difficulty[run.difficulty]??1));
}
// Gives one enemy one gift and applies its at-spawn changes (also used by the review harness and tests).
export function grantAffix(run,e,id){
  if(!AFFIXES[id]||e.affix)return false;
  grant(run,e,id);return true;
}
function grant(run,e,id){
  const a=AFFIXES[id],roll=mix(run.initialSeed,e.id,run.areaIndex,4);
  e.affix=id;e.affixClock=0;
  if(id==='rooted')e.speed*=a.speed;
  if(id==='hastened')e.speed*=e.boss?a.bossSpeed:a.speed;
  if(id==='forged'){e.guarded=true;e.maxHp*=a.health;e.hp*=a.health;}
  if(id==='stalwart'){e.maxHp*=a.health;e.hp*=a.health;e.radius*=a.radius;e.speed*=a.speed;}
  if(id==='nameless')e.affixClock=a.first+roll*2;
  if(id==='molten')e.affixClock=a.first+roll;
  if(id==='starbound')e.affixClock=a.first+roll*2;
}
export function rollAffixes(run,enemy,api){
  const log=affixLog(run);
  if(log.splitting||enemy.affix||!run.campaign)return;
  const map=run.areaIndex,own=MAP_AFFIXES[map]||[],roll=k=>mix(run.initialSeed,enemy.id,map,k);
  if(enemy.boss){
    const chance=(BOSS_AFFIXES[enemy.bossRank==='champion'?'champion':'warden']||[])[map]||0;
    const pool=[...new Set([...own,'hastened'])].filter(id=>BOSS_AFFIXES.safe.includes(id)&&affixEligible(id,enemy));
    if(pool.length&&roll(1)<chance)grant(run,enemy,pool[Math.floor(roll(2)*pool.length)]);
    return;
  }
  if(roll(1)>=affixChance(run))return;
  const mine=own.filter(id=>affixEligible(id,enemy)),shared=SHARED_AFFIXES.filter(id=>affixEligible(id,enemy));
  const pool=mine.length&&(roll(2)<AFFIX_CHANCE.signature||!shared.length)?mine:shared;
  if(pool.length)grant(run,enemy,pool[Math.floor(roll(3)*pool.length)]);
}

/* ---------- Per-tick behaviour ---------- */
const busy=e=>e.warning>0||e.stagger>0||e.phaseShift>0||e.exposed>0||e.chargeRecovery>0;
function focusOf(run,e){
  if(e.focusId&&e.focusId!=='hero')return [...activeNpcs(run),...partyTargets(run)].find(n=>n.id===e.focusId)||run.player;
  return run.player;
}
function mark(run,e,point,a,kind,radius,api){
  const warning=a.warning*(DIFFICULTIES[run.difficulty]||DIFFICULTIES.normal).warning;
  const h={x:clamp(point.x,WORLD.left,WORLD.right),y:clamp(point.y,WORLD.top,WORLD.bottom),radius,inner:0,kind,family:HAZARD_FAMILIES[run.areaIndex]||'thorn',warning,total:warning,life:0.35,damage:e.damage*a.damage,triggered:false,owner:e.id,affix:e.affix};
  if(!api.safe(h))return false;
  run.hazards.push(h);return true;
}
function clearAt(run,p,radius){return p.x>=WORLD.left+20&&p.x<=WORLD.right-20&&p.y>=WORLD.top+20&&p.y<=WORLD.bottom-20&&!areaObstacles(run).some(o=>distance(p,o)<o.radius+radius+6);}
const clocks=(e,dt,share)=>{
  e.spellCooldown=(e.spellCooldown||0)-dt*share;
  for(const key of ['attackCooldown','chargeCooldown'])e[key]=Math.max(0,(e[key]||0)-dt*share);
};
const STEPS={
  rooted(run,e,a,dt){
    const moved=Math.hypot(e.x-(e.affixX??e.x),e.y-(e.affixY??e.y));e.affixX=e.x;e.affixY=e.y;
    e.affixStill=moved<0.5?(e.affixStill||0)+dt:0;
    if(e.affixStill>=a.still&&!e.boss&&e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*a.mend*dt);
  },
  echoing(run,e,a,dt,api){
    const echo=e.affixEcho;if(!echo||run.time<echo.at)return;
    e.affixEcho=null;if(e.exposed>0||e.phaseShift>0||e.stagger>0)return;
    mark(run,e,echo,a,'echo',e.boss?a.bossRadius:a.radius,api);
  },
  hastened(run,e,a,dt){if(!e.boss)clocks(e,dt,a.clocks);},
  nameless(run,e,a,dt){
    const blink=e.affixBlink;
    if(blink){if(run.time>=blink.at){e.affixBlink=null;e.x=blink.x;e.y=blink.y;e.previousX=blink.x;e.previousY=blink.y;e.affixClock=a.every;}return;}
    e.affixClock-=dt;
    if(e.affixClock>0||busy(e)||e.attack>0||e.spell>0||e.charge>0||e.chargeWarning>0)return;
    const target=focusOf(run,e),d=distance(e,target);
    if(d>a.reach){e.affixClock=0.6;return;}
    // Fade out, then step in beside the target, on a side, never inside scenery.
    const away=Math.atan2(e.y-target.y,e.x-target.x),side=e.id%2?1:-1;
    let spot=null;
    for(const turn of [side,-side])for(const reach of [a.far,a.near]){if(spot)break;const angle=away+turn*Math.PI/2,p={x:target.x+Math.cos(angle)*reach,y:target.y+Math.sin(angle)*reach};if(clearAt(run,p,e.radius||18))spot=p;}
    if(!spot){e.affixClock=1;return;}
    e.phaseShift=a.fade;e.affixBlink={x:spot.x,y:spot.y,fromX:e.x,fromY:e.y,at:run.time+a.fade};
  },
  judged(run,e,a,dt,api){
    e.affixClock=Math.max(0,e.affixClock-dt);
    if(!(e.affixReturn>0)||e.affixClock>0||busy(e))return;
    const source=e.affixReturnSource,targets=source==='npc'?activeNpcs(run):source==='ally'||source==='sol'?partyTargets(run):[];
    const target=targets.sort((p,q)=>distance(p,e)-distance(q,e))[0]||run.player;
    e.affixReturn--;e.affixClock=a.every;api.shoot(e,target,e.damage*a.damage,'enemy',true,0,{verdict:true});
  },
  molten(run,e,a,dt,api){
    e.affixClock-=dt;if(e.affixClock>0||busy(e))return;
    const last=e.affixDrop;
    if(distance(e,run.player)>a.reach||(last&&Math.hypot(e.x-last.x,e.y-last.y)<30)){e.affixClock=0.5;return;}
    e.affixClock=a.every;
    if(mark(run,e,e,a,'molten',a.radius,api))e.affixDrop={x:e.x,y:e.y};
  },
  starbound(run,e,a,dt,api){
    e.affixClock-=dt;if(e.affixClock>0||busy(e)||e.spell>0)return;
    const target=focusOf(run,e);
    if(distance(e,target)>a.reach){e.affixClock=0.6;return;}
    e.affixClock=e.boss?a.bossEvery:a.every;
    if(mark(run,e,target,a,'starcall',a.radius,api))e.affixCall=run.time;
  },
  frenzied(run,e,a,dt){
    if(!e.affixFrenzy&&e.hp<e.maxHp*a.below){e.affixFrenzy=true;e.speed*=a.speed;}
    if(e.affixFrenzy)clocks(e,dt,a.clocks);
  }
};
export function affixStep(run,enemy,dt,api){
  const a=AFFIXES[enemy.affix];if(!a||enemy.hp<=0||enemy.warning>0)return;
  const log=affixLog(run);
  if(!log.seen.includes(enemy.affix)&&distance(enemy,run.player)<760){log.seen.push(enemy.affix);log.latest=enemy.affix;api.event('affix');}
  STEPS[enemy.affix]?.(run,enemy,a,dt,api);
}
// Multiplies damage the enemy takes. Judged also notes each shard that reached it, to answer with a bolt.
export function affixDamageFactor(run,enemy,source){
  let factor=1;
  if(enemy.affix==='rooted'&&RANGED.has(source))factor*=AFFIXES.rooted.ranged;
  if(enemy.affix==='judged'&&SHARDS.has(source)){enemy.affixReturn=Math.min(2,(enemy.affixReturn||0)+1);enemy.affixReturnSource=source;}
  // An Eclipsed Hollow shields the Hollow around it (never itself, never a boss).
  if(!enemy.boss&&enemy.affix!=='eclipsed'){
    const reach=AFFIXES.eclipsed.reach;
    for(const other of run.enemies)if(other!==enemy&&other.affix==='eclipsed'&&other.hp>0&&!(other.warning>0)&&distance(other,enemy)<reach){factor*=AFFIXES.eclipsed.guard;break;}
  }
  return factor;
}
export function affixOnCast(run,enemy,api){
  if(enemy.affix==='echoing')enemy.affixEcho={x:enemy.aimX,y:enemy.aimY,at:run.time+AFFIXES.echoing.delay};
}
export function affixOnDeath(run,enemy,api){
  const a=AFFIXES[enemy.affix];if(!a)return;
  if(enemy.affix==='thorned'){
    for(let i=0;i<a.bolts;i++)api.shoot(enemy,{x:enemy.x+1,y:enemy.y},enemy.damage*a.damage,'enemy',true,i*TAU/a.bolts+0.26,{thorn:true});
  }
  if(enemy.affix==='splitting'&&run.enemies.length<58){
    const log=affixLog(run);
    for(const side of [-1,1]){
      // Burst out to either side; when scenery is in the way, turn around it, else rise where it fell.
      const base=side>0?0:Math.PI,around=[0,0.8,-0.8,1.6,-1.6].map(turn=>({x:enemy.x+Math.cos(base+turn)*a.spread,y:enemy.y+Math.sin(base+turn)*a.spread*0.6}));
      const at=around.find(p=>clearAt(run,p,14))||(clearAt(run,enemy,6)?{x:enemy.x,y:enemy.y}:null);if(!at)continue;
      log.splitting=true;let made=false;
      try{made=api.spawn(false,a.role,false,'warden',at);}finally{log.splitting=false;}
      // Split bodies burst straight out and grant no story progress.
      if(made){const child=run.enemies.at(-1);child.warning=a.arrive;child.storyCredit=false;child.splitFrom=enemy.id;}
    }
  }
}
