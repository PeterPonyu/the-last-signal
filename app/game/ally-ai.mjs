import {WORLD} from '../../content/game.mjs';
import {clamp,distance,clearPath,moveBody,navigationField,navigationWaypoint,CELL} from './geometry.mjs';

const routes=new WeakMap();
// Allies keep this much room around Zeyu and around each other.
export const PERSONAL=60,SPACING=40;
export function resetAllyMotion(body){
 body.following=false;body.waypoint=null;body.moving=false;body.vx=0;body.vy=0;body.evading=false;body.evadeGoal=null;if(body.spot)body.spot=null;routes.delete(body);
 body.previousX=body.x;body.previousY=body.y;
}
export function faceToward(body,dx,dy){
 if(Math.abs(dx)>Math.max(2,Math.abs(dy)*0.18))body.faceX=dx<0?-1:1;
}
export function moveAlly(body,target,obstacles,dt,{speed=210,radius=16,start=28,stop=12,stride=32}={}){
 body.radius=radius;body.moving=false;body.vx=0;body.vy=0;
 const gap=distance(body,target);
 if(gap<=(body.following?stop:start)&&clearPath(body,target,obstacles,radius)){
  body.following=false;body.waypoint=null;return;
 }
 body.following=true;
 let point;
 if(clearPath(body,target,obstacles,radius+8)){point=target;body.waypoint=null;}
 else{
  // The navigation field is only needed when scenery blocks the straight line; it is cached per target cell.
  const key=Math.floor(target.x/CELL)+':'+Math.floor(target.y/CELL);
  let route=routes.get(body);
  if(!route||route.obstacles!==obstacles||route.key!==key){
   route={obstacles,key,field:navigationField(obstacles,target)};routes.set(body,route);body.waypoint=null;
  }
  if(body.waypoint&&(distance(body,body.waypoint)<5||!clearPath(body,body.waypoint,obstacles,radius)))body.waypoint=null;
  body.waypoint??=navigationWaypoint(body,target,obstacles,route.field);
  point=body.waypoint;
 }
 if(!point)return;
 const d=distance(body,point);if(d<0.01)return;
 const remaining=point===target?Math.max(0,d-stop):d;
 const step=Math.min(speed*dt,remaining),before={x:body.x,y:body.y};
 moveBody(body,(point.x-body.x)/d*step,(point.y-body.y)/d*step,obstacles,radius);
 const dx=body.x-before.x,dy=body.y-before.y,moved=Math.hypot(dx,dy);
 body.moving=moved>0.01;body.vx=dt>0?dx/dt:0;body.vy=dt>0?dy/dt:0;
 if(body.moving){faceToward(body,body.vx,body.vy);body.walkPhase=(body.walkPhase||0)+moved/stride;}
}

// `back` pushes the slot further behind Zeyu (recruits walk in rows behind the Dawnweaver and Sol).
export function formationTarget(run,side,radius,obstacles,back=0){
 const p=run.player,angle=run.formationAngle||0,tx=Math.cos(angle),ty=Math.sin(angle);
 const at=(behind,lateral)=>({x:clamp(p.x-tx*behind-ty*lateral,WORLD.left,WORLD.right),y:clamp(p.y-ty*behind+tx*lateral,WORLD.top,WORLD.bottom)});
 // Each candidate belongs to this ally's side, avoiding a shared fallback slot.
 const candidates=[at(72+back,side),at(30+back,side*1.5),at(-35+back,side),at(110+back,side*1.5),at(0,0)];
 return candidates.find(point=>!obstacles.some(o=>distance(point,o)<o.radius+radius+12))||p;
}

export function alliedTarget(enemies,body,range,obstacles,protectedNpc=null){
 let best=null,score=Infinity;
 for(const enemy of enemies){
  const gap=distance(body,enemy);
  if(enemy.hp<=0||enemy.warning>0||gap>range||!clearPath(body,enemy,obstacles,3))continue;
  const threatens=protectedNpc&&distance(enemy,protectedNpc)<200;
  const value=gap-(threatens?170:0)-(enemy.id===body.targetId?55:0);
  if(value<score){best=enemy;score=value;}
 }
 return best;
}

// A gentle push apart for allies standing inside Zeyu's personal space or on each other (never through scenery).
// Downed and rising allies stay where they lie, and Sol is left alone in mid-leap.
export function separateAllies(run,allies,dt,obstacles){
 const p=run.player,free=allies.filter(a=>a?.ally&&(a.kind!=='sol'||a.active)&&!a.downed&&!(a.rise>0)&&!(a.pounce>0.22));
 const push=(a,dx,dy,amount)=>{if(amount>0)moveBody(a,dx*amount,dy*amount,obstacles,a.radius||16);};
 for(const a of free){const d=distance(a,p);if(d<PERSONAL-12)push(a,d?(a.x-p.x)/d:-1,d?(a.y-p.y)/d:0,Math.min(PERSONAL-12-d,90*dt));}
 for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++){
  const a=free[i],b=free[j],d=distance(a,b);if(d>=SPACING)continue;
  const x=d?(a.x-b.x)/d:1,y=d?(a.y-b.y)/d:0,step=Math.min(SPACING-d,90*dt)/2;push(a,x,y,step);push(b,-x,-y,step);
 }
}
// Every ally of the party (Dawnweaver, Sol, recruits), and those that can fight and be hurt right now.
export function allyBodies(run){return run.party||[run.companion,run.sol].filter(Boolean);}
export function standingAllies(run){return allyBodies(run).filter(a=>a?.ally&&!a.downed&&a.hp>0&&(a.kind!=='sol'||a.active));}

// An engaged ally's target: `heroWeight` blends its own distance with the Hollow's distance to Zeyu, so casters
// guard Zeyu while strikers take what is near them. Hollow menacing the escorted keeper or this ally come first.
export function rolePick(enemies,body,hero,range,reach,heroWeight,obstacles,protectedNpc=null){
 let best=null,score=Infinity;
 for(const enemy of enemies){
  if(enemy.hp<=0||enemy.warning>0)continue;
  const gap=distance(body,enemy),near=distance(enemy,hero);
  if(gap>range||near>reach||!clearPath(body,enemy,obstacles,3))continue;
  const threatens=protectedNpc&&distance(enemy,protectedNpc)<200;
  const value=gap*(1-heroWeight)+near*heroWeight-(threatens?170:0)-(enemy.id===body.targetId?55:0)-(enemy.focusId===body.id?70:0);
  if(value<score){best=enemy;score=value;}
 }
 return best;
}

// Where an engaged ally should stand against `target`: inside its range band, inside the leash, and (`behind`)
// toward Zeyu's side of the fight, no nearer the target than Zeyu while the band allows. Returns null while the
// current spot already works (with a little tolerance), so a settled ally holds instead of shuffling.
export function fightSpot(body,target,hero,[near,far],behind,obstacles,leash){
 const d=distance(body,target),gap=distance(body,hero),h=distance(hero,target),ahead=behind&&d<Math.min(far,h)-30;
 if(d>=near-10&&d<=far+10&&!ahead&&gap<=leash&&clearPath(body,target,obstacles,3))return null;
 let ux=(body.x-target.x)/(d||1),uy=(body.y-target.y)/(d||1);
 if(!d){ux=hero.x>=target.x?1:-1;uy=0;}
 if((behind||!clearPath(body,target,obstacles,3))&&h>1){
  const bx=ux+(hero.x-target.x)/h,by=uy+(hero.y-target.y)/h,length=Math.hypot(bx,by);if(length>1e-3){ux=bx/length;uy=by/length;}
 }
 const want=behind?clamp(h+60,near,far):(near+far)/2;
 let spot={x:target.x+ux*want,y:target.y+uy*want};
 const off=distance(spot,hero);
 if(off>leash)spot={x:hero.x+(spot.x-hero.x)/off*leash,y:hero.y+(spot.y-hero.y)/off*leash};
 // Never on top of Zeyu: a spot inside his personal space swings around the target (same range) toward the
 // ally's side until it clears him; failing that, it slides straight out from him.
 else if(off<PERSONAL){
  const r=distance(spot,target),base=Math.atan2(spot.y-target.y,spot.x-target.x);
  const side=(hero.x-target.x)*(body.y-target.y)-(hero.y-target.y)*(body.x-target.x)>=0?1:-1;
  let clear=null;
  for(let k=1;k<=10&&!clear;k++){const a=base+side*k*0.06,c={x:target.x+Math.cos(a)*r,y:target.y+Math.sin(a)*r};if(distance(c,hero)>=PERSONAL)clear=c;}
  if(!clear){const from=off>1?spot:body,length=distance(from,hero),ox=length>1?(from.x-hero.x)/length:-1,oy=length>1?(from.y-hero.y)/length:0;clear={x:hero.x+ox*PERSONAL,y:hero.y+oy*PERSONAL};}
  spot=clear;
 }
 spot.x=clamp(spot.x,WORLD.left,WORLD.right);spot.y=clamp(spot.y,WORLD.top,WORLD.bottom);
 // Never aim into scenery: a spot inside a prop steps out along that prop's normal.
 for(const o of obstacles){
  const dd=distance(spot,o),limit=o.radius+(body.radius||16)+8;
  if(dd<limit)spot={x:clamp(o.x+(dd?(spot.x-o.x)/dd:1)*limit,WORLD.left,WORLD.right),y:clamp(o.y+(dd?(spot.y-o.y)/dd:0)*limit,WORLD.top,WORLD.bottom)};
 }
 return spot;
}
