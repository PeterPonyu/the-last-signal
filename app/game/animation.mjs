import { ANIMATIONS } from '../../content/animations.mjs';
import { COMBAT } from '../../content/game.mjs';
export function sampleClip(asset,clip,elapsed,duration){
  const sheet=ANIMATIONS[asset],definition=sheet?.clips[clip];
  if(!definition)throw new Error('Unknown animation: '+asset+'/'+clip);
  const span=duration||definition.duration,phase=Math.max(0,Number.isFinite(elapsed)?elapsed:0)/span;
  const progress=definition.loop?phase%1:Math.min(1,phase);
  const index=Math.min(definition.frames-1,Math.floor(progress*definition.frames));
  return {asset,clip,row:definition.row,column:definition.order?.[index]??index,progress};
}
const timed=(asset,clip,remaining,duration)=>sampleClip(asset,clip,duration-remaining,duration);
export function heroPose(p){
  if(p.hp<=0)return sampleClip('heroReactions','death',p.deathAge);
  if(p.hurt>0)return timed('heroReactions','hurt',p.hurt,COMBAT.hurt.duration);
  if(p.dash>0)return timed('heroReactions','dash',p.dash,COMBAT.dash.duration);
  if(p.sunbreak>0)return timed('heroActions','sunbreak',p.sunbreak,COMBAT.sunbreak.duration);
  if(p.slash>0)return timed('heroActions','slash',p.slash,COMBAT.slash.duration);
  if(p.cast>0)return timed('heroActions','cast',p.cast,COMBAT.cast.duration);
  if(p.moving)return sampleClip('heroActions','walk',p.walkPhase/9);
  return sampleClip('heroReactions','idle',p.idlePhase);
}
export function hollowPose(e){
  const asset=e.skin==='sentinel'?'sentinelActions':e.skin==='cantor'?'cantorActions':'enemyActions';
  if(e.hp<=0)return sampleClip(asset,'death',e.deathAge);
  if(e.stagger>0||e.hit>0)return timed(asset,'hurt',Math.max(e.stagger||0,e.hit||0),asset==='sentinelActions'?0.5:0.22);
  if(e.attack>0)return timed(asset,'attack',e.attack,e.attackDuration);
  if(e.spell>0)return timed(asset,asset==='enemyActions'?'attack':'cast',e.spell,e.spellDuration);
  if(e.chargeWarning>0)return sampleClip(asset,'attack',0);
  if(e.charge>0)return sampleClip(asset,'attack',0.35);
  return sampleClip(asset,'walk',e.moving===false?0:e.walkPhase*(ANIMATIONS[asset].clips.walk.duration/4));
}
export function companionPose(c){
  if(c.mend>0)return timed('companionSupport','mend',c.mend,COMBAT.mend.duration);
  if(c.ward>0)return timed('companionSupport','ward',c.ward,0.8);
  if(c.cast>0)return timed('companionActions','cast',c.cast,COMBAT.allyCast.duration);
  if(c.moving)return sampleClip('companionActions','walk',c.walkPhase/8);
  return sampleClip('companionSupport','idle',c.idlePhase);
}
export function solPose(s){
  if(s.ward>0)return timed('solActions','ward',s.ward,0.8);
  if(s.pounce>0)return timed('solActions','pounce',s.pounce,0.55);
  if(s.moving)return sampleClip('solActions','walk',s.walkPhase/11);
  return sampleClip('solActions','idle',s.idlePhase);
}
