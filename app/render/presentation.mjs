import {WORLD} from '../../content/game.mjs';
import {clamp,distance} from '../game/geometry.mjs';
import {poseMotion} from './motion.mjs';

export function renderPosition(body,alpha=1){
  const t=clamp(alpha,0,1);
  return {...body,x:Number.isFinite(body.previousX)?body.previousX+(body.x-body.previousX)*t:body.x,y:Number.isFinite(body.previousY)?body.previousY+(body.y-body.previousY)*t:body.y};
}
export function followCamera(previous,player,width,height,dt,areaIndex,reduced=false){
  const lead=player.moving&&!reduced?55:0;
  const target={x:clamp(player.x-width/2+(player.travelX||0)*lead,0,Math.max(0,WORLD.width-width)),y:clamp(player.y-height/2+(player.travelY||0)*lead,0,Math.max(0,WORLD.height-height))};
  if(!previous||previous.areaIndex!==areaIndex||previous.width!==width||previous.height!==height)return {...target,areaIndex,width,height};
  const blend=1-Math.exp(-Math.max(0,Math.min(dt,0.1))*12);
  return {x:previous.x+(target.x-previous.x)*blend,y:previous.y+(target.y-previous.y)*blend,areaIndex,width,height};
}
export function propAlpha(prop,party){
  const halfWidth=Math.max(prop.radius||0,prop.height*0.26);
  return party.some(actor=>actor.hp!==0&&actor.y<prop.y&&actor.y>prop.y-prop.height*0.8&&Math.abs(actor.x-prop.x)<halfWidth+16)?0.32:1;
}
// Stateless motion for one pose (studios and any caller without render memory); drawParty/drawCast use the
// remembered, smoothed motion instead. Offsets stay within the legacy bounds.
export function actorMotion(actor,pose,reduced=false){
  const m=poseMotion(actor,pose,reduced);
  if(!reduced){m.offsetX=clamp(m.offsetX,-8,8);m.offsetY=clamp(m.offsetY,-10,10);m.tilt=clamp(m.tilt,-0.08,0.08);}
  return m;
}
export function visibleAt(point,camera,padding=180){return point.x>camera.x-padding&&point.x<camera.x+camera.width+padding&&point.y>camera.y-padding&&point.y<camera.y+camera.height+padding;}
export function restorationAt(point,beacons){return beacons.reduce((warm,b)=>Math.max(warm,b.charge*clamp(1-distance(point,b)/240,0,1)),0);}
