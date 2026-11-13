import { COMBAT } from './game.mjs';
const clip=(row,duration,loop=false)=>({row,duration,loop,frames:4});
const painted=(row,duration,loop=false,order)=>({row,duration,loop,frames:order?.length||6,...(order?{order}:{})});
const release=(clip,at,frame=3)=>({...clip,releaseAt:at,releaseFrame:frame});
const partyHero={rows:7,columns:6,clips:{idle:painted(0,1.8,true),walk:painted(1,0.52,true),slash:release(painted(2,COMBAT.slash.duration,false,[0,2,3,4,5,5]),COMBAT.slash.impact/COMBAT.slash.duration,2),cast:painted(3,COMBAT.cast.duration,false,[3,4,5]),sunbreak:release(painted(3,COMBAT.sunbreak.duration),COMBAT.sunbreak.impact/COMBAT.sunbreak.duration),dash:painted(4,COMBAT.dash.duration),hurt:painted(5,COMBAT.hurt.duration),death:painted(6,COMBAT.death.duration)}};
const partyCompanion={rows:5,columns:6,clips:{idle:painted(0,1.8,true),walk:painted(1,0.55,true),cast:release(painted(2,COMBAT.allyCast.duration),COMBAT.allyCast.impact/COMBAT.allyCast.duration),mend:release(painted(3,COMBAT.mend.duration),COMBAT.mend.impact/COMBAT.mend.duration),ward:painted(4,0.8)}};
function castSheet(names){
 const clips={};for(const [row,name]of names.entries())for(const [action,duration,loop,order]of [['idle',1.8,true,[0]],['walk',0.64,true,[0,1,0,2]],['attack',0.7,false,[3,3,4,5]],['cast',0.9,false,[0,3,3,4,5,0]],['hurt',0.22,false,[6,5,0]],['death',0.8,false,[6,7,7,7]]]){const clip=painted(row,duration,loop,order);clips[name+'-'+action]=action==='cast'?release(clip,0.65):clip;}
 return {rows:names.length,columns:8,clips};
}
const bossSheet=()=>({rows:4,columns:6,clips:{idle:painted(0,2,true,[0,5]),walk:painted(0,0.9,true),attack:painted(1,0.9),cast:release(painted(2,0.9),0.65),hurt:painted(3,0.22,false,[0,0]),death:painted(3,0.8)}});
export const ANIMATIONS={
  guideActions:{rows:3,columns:4,clips:{iria:clip(0,3.2,true),oren:clip(1,3.4,true),sera:clip(2,3.6,true)}},
  heroActions:partyHero,heroReactions:partyHero,
  companionActions:partyCompanion,companionSupport:partyCompanion,
  solActions:{rows:4,columns:6,clips:{idle:painted(0,1.8,true),walk:painted(1,0.48,true),pounce:release(painted(2,0.55),0.6),ward:painted(3,0.8)}},
  commonCast:castSheet(['walker','runner','skirmisher','pack','sentinel','cantor']),
  gardenCast:castSheet(['sower','thornbound','tender']),
  causewayCast:castSheet(['chorister','processional','bellsmith']),
  courtCast:castSheet(['astral','justiciar','reaver']),
  rootBoss:bossSheet(),bellBoss:bossSheet(),crownBoss:bossSheet(),
  keepersCast:{rows:6,columns:6,clips:Object.fromEntries(['smith','keeper','engineer','courier','archivist','guard'].flatMap((name,row)=>[['idle',1.8,true,[0,1]],['walk',0.7,true,[2,0,3,0]],['speak',1.4,true,[0,4,4,0]],['work',1.6,true,[0,5,5,0]]].map(([clip,duration,loop,order])=>[name+'-'+clip,painted(row,duration,loop,order)])))},
  radiance:{rows:6,columns:6,clips:Object.fromEntries(['contact','blade','sun','mend','comet','hostile'].map((name,row)=>[name,painted(row,0.5)]))}
};
