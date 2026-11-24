import { COMBAT } from './game.mjs';
const clip=(row,duration,loop=false)=>({row,duration,loop,frames:4});
const painted=(row,duration,loop=false,order)=>({row,duration,loop,frames:order?.length||6,...(order?{order}:{})});
const release=(clip,at,frame=3)=>({...clip,releaseAt:at,releaseFrame:frame});
// Ping-pong over a painted row (0..5..1): idles breathe through every frame and never snap from the last back to the first.
const sway=(row,duration)=>({...painted(row,duration,true),pingpong:true});
// Sunblade combo: an overhead cut, a rising return swing played back from the follow-through, and a finisher that
// holds the full wind-up until the impact and lingers on the strike.
const blade=order=>release(painted(2,COMBAT.slash.duration,false,order),COMBAT.slash.impact/COMBAT.slash.duration,2);
const partyHero={rows:7,columns:6,clips:{idle:sway(0,3),walk:painted(1,0.52,true),slash:blade([0,2,3,4,5,5]),slashReturn:blade([4,4,3,2,1,0]),slashFinisher:blade([2,2,3,3,4,5]),
  // Sunshard is instant: release, follow-through, then the next shard gathers in the hand (the held firing stance).
  cast:painted(3,COMBAT.cast.duration,false,[3,3,4,4,2,2]),
  sunbreak:release(painted(3,COMBAT.sunbreak.duration,false,[1,2,2,3,4,5]),COMBAT.sunbreak.impact/COMBAT.sunbreak.duration),solarLance:release(painted(3,COMBAT.solarLance.duration,false,[1,2,2,3,3,4]),COMBAT.solarLance.impact/COMBAT.solarLance.duration),
  dash:painted(4,COMBAT.dash.duration,false,[2,3,3,4]),hurt:painted(5,COMBAT.hurt.duration,false,[2,2,3,4]),death:painted(6,COMBAT.death.duration)}};
const partyCompanion={rows:5,columns:6,clips:{idle:sway(0,3.2),walk:painted(1,0.55,true),cast:release(painted(2,COMBAT.allyCast.duration,false,[1,1,2,3,4,5]),COMBAT.allyCast.impact/COMBAT.allyCast.duration),
  // Every third bolt is a piercing moonlance: the staff thrust holds its glowing release longer.
  moonCast:release(painted(2,COMBAT.allyCast.duration,false,[1,1,2,3,3,4]),COMBAT.allyCast.impact/COMBAT.allyCast.duration),mend:release(painted(3,COMBAT.mend.duration,false,[1,1,2,3,4,5]),COMBAT.mend.impact/COMBAT.mend.duration),lunarNova:release(painted(4,COMBAT.lunarNova.duration,false,[1,2,2,3,4,5]),COMBAT.lunarNova.impact/COMBAT.lunarNova.duration),ward:painted(4,0.8,false,[1,2,3,3,4,5]),
  // Downed: the standing frame, laid on its back by the render layer and desaturated.
  downed:painted(0,1,true,[0])}};
// Enemy rows: 0 stance, 1-2 steps, 3 wind-up, 4 strike, 5 recover, 6 recoil, 7 lying. `fall` names the side the lying
// frame's head lies on (1 ahead of the facing, -1 behind), so the death topple rotates toward the painted body.
function castSheet(names,backward=[]){
 const clips={};
 for(const [row,name]of names.entries())for(const [action,duration,loop,order]of [['idle',3,true,[0,0,1,0,0,2]],['walk',0.64,true,[0,1,0,2]],['attack',0.7,false,[3,3,3,4,5,5]],['cast',0.9,false,[3,3,3,4,5,5]],['hurt',0.32,false,[6,6,5,0]],['exposed',1.2,true,[6,6,5,5]],['death',0.8,false,[6,6,6,6,7,7,7,7]]]){
  const clip=painted(row,duration,loop,order);clips[name+'-'+action]=action==='cast'?release(clip,0.65):action==='death'?{...clip,fall:backward.includes(name)?-1:1}:clip;
 }
 return {rows:names.length,columns:8,clips};
}
// Boss rows: 0 idle/stride, 1 attack, 2 cast, 3 hurt then death. The slam lands at four fifths of its wind-up.
const bossSheet=()=>({rows:4,columns:6,clips:{idle:sway(0,3.4),walk:painted(0,0.9,true),attack:painted(1,0.9,false,[1,2,2,3,4,5]),slam:release(painted(1,1.2,false,[1,2,2,3,4]),0.8),cast:release(painted(2,0.9),0.65),hurt:painted(3,0.22,false,[0,0]),exposed:painted(3,1.4,true,[1,2,2,2,1,1]),death:painted(3,1.1)}});
export const ANIMATIONS={
  guideActions:{rows:3,columns:4,clips:{iria:clip(0,3.2,true),oren:clip(1,3.4,true),sera:clip(2,3.6,true)}},
  heroActions:partyHero,heroReactions:partyHero,
  companionActions:partyCompanion,companionSupport:partyCompanion,
  // Sol downed: the low pounce crouch, flattened onto its belly by the render layer.
  solActions:{rows:4,columns:6,clips:{idle:sway(0,3),walk:painted(1,0.48,true),pounce:release(painted(2,0.55,false,[1,2,2,3,4,5]),0.6),solVolley:release(painted(3,COMBAT.solVolley.duration,false,[1,2,2,3,4,5]),COMBAT.solVolley.impact/COMBAT.solVolley.duration),ward:painted(3,0.8,false,[1,2,3,3,4,5]),downed:painted(2,1,true,[0])}},
  commonCast:castSheet(['walker','runner','skirmisher','pack','sentinel','cantor']),
  gardenCast:castSheet(['sower','thornbound','tender']),
  causewayCast:castSheet(['chorister','processional','bellsmith']),
  courtCast:castSheet(['astral','justiciar','reaver']),
  foundryCast:castSheet(['cinder','emberguard','kilnkeeper'],['cinder','emberguard','kilnkeeper']),
  observatoryCast:castSheet(['lenswalker','voidlancer','astromancer'],['lenswalker','voidlancer','astromancer']),
  rootBoss:bossSheet(),bellBoss:bossSheet(),crownBoss:bossSheet(),furnaceBoss:bossSheet(),constellationBoss:bossSheet(),
  keepersCast:{rows:6,columns:6,clips:Object.fromEntries(
    // A downed recruit lies on its back: the stance frame, laid down by the render layer.
    ['smith','keeper','engineer','courier','archivist','guard'].flatMap((name,row)=>[['idle',1.8,true,[0,1]],['walk',0.7,true,[2,0,3,0]],['speak',1.4,true,[0,4,4,0]],['work',1.6,true,[0,5,5,0]],['cast',0.6,false,[0,5,4,0]],['downed',1,true,[0]]].map(([clip,duration,loop,order])=>[name+'-'+clip,{...painted(row,duration,loop,order),...(clip==='cast'?{releaseAt:0.32/0.6,releaseFrame:2}:{})}]))
  )},
  radiance:{rows:6,columns:6,clips:Object.fromEntries(['contact','blade','sun','mend','comet','hostile'].map((name,row)=>[name,painted(row,0.5)]))}
};
