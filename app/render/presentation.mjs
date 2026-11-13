import {WORLD} from '../../content/game.mjs';
import {clamp,distance} from '../game/geometry.mjs';

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
export function actorMotion(actor,pose,reduced=false){
  if(reduced||pose.clip==='death')return {offsetX:0,offsetY:0,tilt:0,stretchX:1,stretchY:1};
  const stride=Math.sin((actor.walkPhase||0)*Math.PI/2),hurt=pose.clip==='hurt'?Math.sin(Math.PI*pose.progress):0;
  const pounce=pose.clip==='pounce'?Math.sin(Math.PI*pose.progress):0;
  const commit=['slash','sunbreak','attack'].includes(pose.clip)?Math.sin(Math.PI*pose.progress):0;
  const prepare=commit&&pose.progress<0.3?-Math.sin(pose.progress/0.3*Math.PI)*3:0;
  return {offsetX:-hurt*7+commit*5+prepare,offsetY:pose.clip==='walk'?-Math.abs(stride)*1.5:-pounce*10,tilt:hurt*-0.07+commit*0.055,stretchX:1+hurt*0.055,stretchY:1-hurt*0.05};
}
export function visibleAt(point,camera,padding=180){return point.x>camera.x-padding&&point.x<camera.x+camera.width+padding&&point.y>camera.y-padding&&point.y<camera.y+camera.height+padding;}
export function restorationAt(point,beacons){return beacons.reduce((warm,b)=>Math.max(warm,b.charge*clamp(1-distance(point,b)/240,0,1)),0);}
