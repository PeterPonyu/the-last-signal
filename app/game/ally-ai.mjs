import {WORLD} from '../../content/game.mjs';
import {clamp,distance,clearPath,moveBody,navigationField,navigationWaypoint,CELL} from './geometry.mjs';

const routes=new WeakMap();
export function resetAllyMotion(body){
 body.following=false;body.waypoint=null;body.moving=false;body.vx=0;body.vy=0;body.evading=false;body.evadeGoal=null;routes.delete(body);
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
 const key=Math.floor(target.x/CELL)+':'+Math.floor(target.y/CELL);
 let route=routes.get(body);
 if(!route||route.obstacles!==obstacles||route.key!==key){
  route={obstacles,key,field:navigationField(obstacles,target)};routes.set(body,route);body.waypoint=null;
 }
 let point;
 if(clearPath(body,target,obstacles,radius+8)){point=target;body.waypoint=null;}
 else{
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

export function formationTarget(run,side,radius,obstacles){
 const p=run.player,angle=run.formationAngle||0,tx=Math.cos(angle),ty=Math.sin(angle);
 const at=(back,lateral)=>({x:clamp(p.x-tx*back-ty*lateral,WORLD.left,WORLD.right),y:clamp(p.y-ty*back+tx*lateral,WORLD.top,WORLD.bottom)});
 // Each candidate belongs to this ally's side, avoiding a shared fallback slot.
 const candidates=[at(72,side),at(30,side*1.5),at(-35,side),at(110,side*1.5),at(0,0)];
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
