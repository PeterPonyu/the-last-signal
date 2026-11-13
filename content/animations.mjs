import { COMBAT } from './game.mjs';
const clip=(row,duration,loop=false)=>({row,duration,loop,frames:4});
export const ANIMATIONS={
  guideActions:{rows:3,columns:4,clips:{iria:clip(0,3.2,true),oren:clip(1,3.4,true),sera:clip(2,3.6,true)}},
  heroActions:{rows:3,columns:4,clips:{walk:clip(0,4/9,true),slash:clip(1,COMBAT.slash.duration),cast:clip(2,COMBAT.cast.duration),sunbreak:clip(2,COMBAT.sunbreak.duration)}},
  heroReactions:{rows:4,columns:4,clips:{idle:clip(0,1.6,true),dash:clip(1,COMBAT.dash.duration),hurt:clip(2,COMBAT.hurt.duration),death:clip(3,COMBAT.death.duration)}},
  companionActions:{rows:2,columns:4,clips:{walk:clip(0,0.5,true),cast:clip(1,COMBAT.allyCast.duration)}},
  companionSupport:{rows:3,columns:4,clips:{idle:clip(0,1.8,true),mend:clip(1,COMBAT.mend.duration),ward:clip(2,0.8)}},
  enemyActions:{rows:2,columns:4,clips:{walk:clip(0,0.6,true),attack:clip(1,0.7),hurt:clip(1,0.22),death:clip(1,COMBAT.death.duration)}},
  sentinelActions:{rows:4,columns:4,clips:{walk:clip(0,0.8,true),attack:clip(1,0.95),cast:clip(1,0.9),hurt:clip(2,0.5),death:clip(3,COMBAT.death.duration)}},
  cantorActions:{rows:4,columns:4,clips:{walk:clip(0,0.8,true),attack:clip(1,0.7),cast:{...clip(1,0.9),order:[0,1,3,2]},hurt:clip(2,0.22),death:clip(3,COMBAT.death.duration)}},
  solActions:{rows:3,columns:4,clips:{walk:clip(0,4/11,true),pounce:clip(1,0.55),ward:clip(2,0.8),idle:clip(2,1.8,true)}}
};
