import { ANIMATIONS } from '../../content/animations.mjs';
import { COMBAT } from '../../content/game.mjs';
export function sampleClip(asset,clip,elapsed,duration){
  const sheet=ANIMATIONS[asset],definition=sheet?.clips[clip];
  if(!definition)throw new Error('Unknown animation: '+asset+'/'+clip);
  const span=duration||definition.duration,phase=Math.max(0,Number.isFinite(elapsed)?elapsed:0)/span;
  const progress=definition.loop?phase%1:Math.min(1,phase);
  const frame=definition.releaseAt===undefined?progress*definition.frames:
    progress<definition.releaseAt?progress/definition.releaseAt*definition.releaseFrame:
    definition.releaseFrame+(progress-definition.releaseAt)/(1-definition.releaseAt)*(definition.frames-definition.releaseFrame);
  const index=Math.min(definition.frames-1,Math.floor(frame));
  return {asset,clip,row:definition.row,column:definition.order?.[index]??index,progress};
}
const timed=(asset,clip,remaining,duration)=>sampleClip(asset,clip,duration-remaining,duration);
export function heroPose(p){
  if(p.hp<=0)return sampleClip('heroReactions','death',p.deathAge);
  if(p.hurt>0)return timed('heroReactions','hurt',p.hurt,COMBAT.hurt.duration);
  if(p.dash>0)return timed('heroReactions','dash',p.dash,COMBAT.dash.duration);
  if(p.solarLance>0)return timed('heroActions','solarLance',p.solarLance,COMBAT.solarLance.duration);
  if(p.sunbreak>0)return timed('heroActions','sunbreak',p.sunbreak,COMBAT.sunbreak.duration);
  if(p.slash>0)return timed('heroActions','slash',p.slash,COMBAT.slash.duration);
  if(p.cast>0)return timed('heroActions','cast',p.cast,COMBAT.cast.duration);
  if(p.moving)return sampleClip('heroActions','walk',p.walkPhase/9);
  return sampleClip('heroReactions','idle',p.idlePhase);
}
export function hollowPose(e){return castPose(e,0);}
export function companionPose(c){
  if(c.nova>0)return timed('companionSupport','lunarNova',c.nova,COMBAT.lunarNova.duration);
  if(c.mend>0)return timed('companionSupport','mend',c.mend,COMBAT.mend.duration);
  if(c.ward>0)return timed('companionSupport','ward',c.ward,0.8);
  if(c.cast>0)return timed('companionActions','cast',c.cast,COMBAT.allyCast.duration);
  if(c.moving)return sampleClip('companionActions','walk',c.walkPhase/8);
  return sampleClip('companionSupport','idle',c.idlePhase);
}
export function solPose(s){
  if(s.volley>0)return timed('solActions','solVolley',s.volley,COMBAT.solVolley.duration);
  if(s.ward>0)return timed('solActions','ward',s.ward,0.8);
  if(s.pounce>0)return timed('solActions','pounce',s.pounce,0.55);
  if(s.moving)return sampleClip('solActions','walk',s.walkPhase/11);
  return sampleClip('solActions','idle',s.idlePhase);
}

const regional={sower:'gardenCast',thornbound:'gardenCast',tender:'gardenCast',chorister:'causewayCast',processional:'causewayCast',bellsmith:'causewayCast',astral:'courtCast',justiciar:'courtCast',reaver:'courtCast',cinder:'foundryCast',emberguard:'foundryCast',kilnkeeper:'foundryCast',lenswalker:'observatoryCast',voidlancer:'observatoryCast',astromancer:'observatoryCast'};
const guideClips={iria:'iria',oren:'oren',sera:'sera',asha:'iria',lyra:'sera'};
const keepers=new Set(['smith','keeper','engineer','courier','archivist','guard']);
export function castPose(actor,time){
 const boss=actor.bossRank==='champion'?null:actor.bossKind,name=actor.role||actor.type||(actor.skin==='cantor'?'cantor':actor.skin==='sentinel'?'sentinel':'walker');
 if(actor.npc||actor.body){
  if(!keepers.has(actor.body))return sampleClip('guideActions',guideClips[actor.id],time);
  if(actor.cast>0)return timed('keepersCast',actor.body+'-cast',actor.cast,0.6);
  const action=actor.moving?'walk':actor.working?'work':actor.met?'speak':'idle';
  return sampleClip('keepersCast',actor.body+'-'+action,actor.moving?(actor.walkPhase||0)/4:time);
 }
 const asset=boss?boss+'Boss':regional[name]||'commonCast',prefix=boss?'':name+'-';
 let action='idle',elapsed=time,duration;
 if(actor.hp<=0){action='death';elapsed=actor.deathAge||0;}
 else if(actor.attack>0){action='attack';duration=actor.attackDuration;elapsed=duration-actor.attack;}
 else if(actor.spell>0){action='cast';duration=actor.spellDuration;elapsed=duration-actor.spell;}
 else if(actor.chargeWarning>0){action='attack';elapsed=0.12;}
 else if(actor.charge>0){action='attack';elapsed=0.38;}
 else if((actor.hit>0||actor.stagger>0)&&!boss){action='hurt';duration=Math.max(0.22,actor.stagger||0);elapsed=duration-Math.max(actor.hit||0,actor.stagger||0);}
 else if(actor.moving){action='walk';elapsed=(actor.walkPhase||0)*0.16;}
 return {...sampleClip(asset,prefix+action,elapsed,duration),clip:action};
}
