import {drawCast} from './cast.mjs';
import {drawCampaignTerrain,drawCampaignObjectives,campaignRoads} from './campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {corpseAppearance} from '../game/journey.mjs';
import {drawLandmark,drawGuide,drawGateway} from './journey.mjs';
import { WORLD, AREAS } from '../../content/game.mjs';
import { clamp, distance } from '../game/geometry.mjs';
import { heroPose, hollowPose, companionPose, solPose } from '../game/animation.mjs';

import { drawSprite } from './sprites.mjs';
import {renderPosition,followCamera,propAlpha,actorMotion,visibleAt} from './presentation.mjs';
import {drawWorld,drawAmbient,drawShadow,glow} from './world.mjs';
import {drawEffects} from './effects.mjs';
import {drawActorEnergy,drawProjectiles,drawHazardImpact,drawDefeatEnergy} from './combat-vfx.mjs';
import {canvasFont} from './typography.mjs';
import {drawSymbol} from './symbols.mjs';
import {markerLabel,drawObjectivePointer,drawDanger,drawDangerOutline} from './guidance.mjs';
import {placeMinimap} from './minimap-layout.mjs';

const minimapCorners=new WeakMap();
const sceneryByArea=new WeakMap();
function sceneryFor(area){
  if(!sceneryByArea.has(area))sceneryByArea.set(area,[...area.obstacles,...area.decorations].map(o=>({...o,prop:true})));
  return sceneryByArea.get(area);
}

export function drawBattlefield(ctx, canvas, images, run, reduced, previousCamera=null, elapsed=1/60, alpha=1, guidance=true, cameraTarget=null) {
  const area=AREAS[run.areaIndex], viewWidth=matchMedia('(max-width:750px)').matches?680:1200, viewHeight=680;
  if(canvas.width!==viewWidth)canvas.width=viewWidth;
  const uiScale=Math.max(1,viewWidth/(canvas.clientWidth||viewWidth));
  const player=renderPosition(run.player,alpha),companion=renderPosition(run.companion,alpha),sol=renderPosition(run.sol,alpha);
  const camera=followCamera(previousCamera,cameraTarget||player,viewWidth,viewHeight,elapsed,run.areaIndex,reduced);
  const party=[player,companion,...(sol.active?[sol]:[]),...run.campaign.npcs.filter(n=>n.state==='active').map(n=>renderPosition(n,alpha))],labels=[];
  const drawActor=(e,pose,height,opacity=1)=>{
    const kind=e.hero?'hero':e.companion?'companion':e.sol?'sol':'enemy';
    drawActorEnergy(ctx,e,kind,run,reduced,false);
    if(kind==='enemy')drawCast(ctx,images,e,run.time,reduced,opacity);
    else drawSprite(ctx,images,pose,e.x,e.y,height,e.faceX,opacity,actorMotion(e,pose,reduced));
    drawActorEnergy(ctx,e,kind,run,reduced,true);
  };
  const ring=(x,y,r,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();};
  const sprite=(image,rows,pose,x,y,height,baseline,face=1,alpha=1)=>{
    const sw=image.width/4,sh=image.height/rows,w=height*sw/sh;
    ctx.save();ctx.translate(x,y);ctx.scale(face,1);ctx.globalAlpha=alpha;
    ctx.drawImage(image,pose.column*sw,pose.row*sh,sw,sh,-w/2,24-baseline*height,w,height);ctx.restore();
  };
  const prop=(p,opacity=1)=>sprite(images.props,2,{row:Math.floor(p.type/4),column:p.type%4},p.x,p.y,p.height,0.91,1,opacity);
  ctx.clearRect(0,0,viewWidth,viewHeight);ctx.save();ctx.translate(-camera.x,-camera.y);
  drawWorld(ctx,images,area,run,camera,reduced);
  drawCampaignTerrain(ctx,run,camera,reduced,images);
  drawLandmark(ctx,run,camera,reduced,images);
  drawCampaignObjectives(ctx,run,camera,reduced,uiScale,images);
  drawGateway(ctx,run,camera,reduced,guidance,uiScale,images);
  for(const [index,b] of run.beacons.entries()){
    const near=distance(b,run.player)<78;
    ctx.fillStyle=b.charge===1?'#f9c65a24':'#07181555';ctx.beginPath();ctx.arc(b.x,b.y+22,78,0,Math.PI*2);ctx.fill();
    ring(b.x,b.y+22,78,b.charge===1?'#ffdc7b':'#f5db9bcc',3);
    if(b.charge>0){ctx.strokeStyle='#ffe6a0';ctx.lineWidth=6;ctx.beginPath();ctx.arc(b.x,b.y+22,78,-Math.PI/2,-Math.PI/2+b.charge*Math.PI*2);ctx.stroke();}
    if(visibleAt(b,camera,100)){
      drawSymbol(ctx,'beacon',b.x,b.y+48,26);
      if((guidance&&run.npcMet)||near){
        const text='Recovery well '+(index+1)+(b.charge===1?' · Restored':near?' · '+Math.round(b.charge*100)+'%':' · Stand 3s');
        ctx.font=canvasFont('label',uiScale);const half=(ctx.measureText(text).width+44*uiScale)/2;
        if(b.y+150>camera.y+35&&b.y+150<camera.y+viewHeight-25)labels.push({kind:'beacon',text,x:clamp(b.x,camera.x+half+8,camera.x+viewWidth-half-8),y:b.y+150});
      }
    }
  }
  drawEffects(ctx,images,run,camera,reduced,true,uiScale);
  for(const h of run.hazards){drawHazardImpact(ctx,h,reduced);drawDanger(ctx,h,uiScale);}
  for(const item of run.pickups)prop({...item,type:5,height:56});
  for(const e of run.corpses){if(!visibleAt(e,camera))continue;const remains=corpseAppearance(e);drawShadow(ctx,e,e.boss?145:94,remains.opacity);drawCast(ctx,images,e,run.time,reduced,remains.opacity);drawDefeatEnergy(ctx,e,reduced);}
  const actors=sceneryFor(area).filter(e=>visibleAt(e,camera));
  for(const o of run.lanterns)if(visibleAt(o,camera))actors.push({...o,prop:true,lantern:true,type:7,height:100});
  for(const b of run.beacons)if(visibleAt(b,camera))actors.push({...b,prop:true,type:4,height:94});
  for(const e of run.enemies)if(e.hp>0&&visibleAt(e,camera,200)){const posed=renderPosition(e,alpha);if(visibleAt(posed,camera))actors.push(posed);}
  for(const n of run.campaign.npcs)if(visibleAt(n,camera))actors.push({...renderPosition(n,alpha),npc:true});
  for(const e of [{...player,hero:true},{...companion,companion:true},...(sol.active?[{...sol,sol:true}]:[])])if(visibleAt(e,camera))actors.push(e);
  actors.sort((a,b)=>a.y-b.y);
  for(const e of actors){
    drawShadow(ctx,e,e.prop?e.height:e.sol?54:e.boss?145:96,e.state==='captured'?0.3:e.hp<=0?Math.max(0,1-e.deathAge/0.8):1);
    if(e.npc){drawGuide(ctx,images,run,reduced,guidance,uiScale,e);continue;}
    if(e.prop){prop(e,propAlpha(e,party));
      if(e.lantern){
        glow(ctx,e.x,e.y-34,(e.lit?65:38)+(reduced?0:Math.sin(run.time*4+e.id)*3),e.lit?'#ffe7a355':'#e3bd6333');
        if(!e.lit){drawSymbol(ctx,'lantern',e.x,e.y-91,26);if(guidance&&run.npcMet&&distance(e,player)<145)labels.push({kind:'lantern',text:'Strike · Cleansing burst',x:e.x,y:e.y-130});}
      }
      if(e.charge===1){ring(e.x,e.y-44,16,'#ffdf83',4);ctx.fillStyle='#fff5b7';ctx.beginPath();ctx.arc(e.x,e.y-44,7,0,Math.PI*2);ctx.fill();}continue;}
    if(e.hero){drawSymbol(ctx,'hero',e.x,e.y+28,25);drawActor(e,heroPose(e),98,e.invulnerable>0?0.85:1);}
    else if(e.companion){drawActor(e,companionPose(e),96);}
    else if(e.sol){drawActor(e,solPose(e),54);}
    else{
      if(e.warning>0){ring(e.x,e.y,20+e.warning*12,'#ffae9c',3);drawSymbol(ctx,'danger',e.x,e.y-22,22);continue;}
      if(e.attack>e.attackDuration/2)ring(e.x,e.y+15,e.radius+18,'#ffae80',3);
      if(e.chargeWarning>0){ctx.strokeStyle='#ffb277';ctx.lineWidth=6;ctx.setLineDash([12,8]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+e.chargeX*180,e.y+e.chargeY*180);ctx.stroke();ctx.setLineDash([]);}
      if(e.spell>0){ring(e.x,e.y,40,'#9cffe9',3);ctx.setLineDash([7,9]);ctx.strokeStyle='#a8f0e7aa';ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.aimX,e.aimY);ctx.stroke();ctx.setLineDash([]);}
      drawActor(e,hollowPose(e),e.boss?145:e.runner?76:e.type==='sentinel'?106:94,e.hp<=0?Math.max(0.1,1-e.deathAge/0.8):e.hit>0?0.8:1);
      if(e.hp<=0)continue;
      if((e.guarded||e.type==='sentinel')&&e.guardBroken<=0)drawSymbol(ctx,'shield',e.x+27,e.y-40,23);

      if(e.type==='cantor')drawSymbol(ctx,'bell',e.x,e.y-102,25);
      if(e.boss)drawSymbol(ctx,'boss',e.x,e.y-(e.bossRank==='champion'?168:224),28);
      if(e.hp<e.maxHp&&!e.boss){ctx.fillStyle='#100e0e';ctx.fillRect(e.x-17,e.y-(e.lieutenant?120:100),34,4);ctx.fillStyle='#a9dfcd';ctx.fillRect(e.x-17,e.y-(e.lieutenant?120:100),34*e.hp/e.maxHp,4);}
    }
  }
  drawProjectiles(ctx,run.shots,camera,reduced,run.areaIndex);
  drawEffects(ctx,images,run,camera,reduced,false,uiScale);
  drawAmbient(ctx,run,camera,reduced);
  for(const h of run.hazards)drawDangerOutline(ctx,h,uiScale);
  for(const label of labels){ctx.font=canvasFont('label',uiScale);const half=(ctx.measureText(label.text).width+44*uiScale)/2;const blocked=[...party,...run.enemies.filter(e=>e.hp>0)].some(a=>Math.abs(a.x-label.x)<half+(a.boss?145:55)&&label.y>a.y-(a.boss?250:125)&&label.y<a.y+45)||run.hazards.some(h=>distance(label,h)<h.radius+half);if(!blocked)markerLabel(ctx,label.kind,label.text,label.x,label.y,uiScale);}
  ctx.restore();
  const vignette=ctx.createRadialGradient(viewWidth/2,viewHeight/2,viewHeight*0.3,viewWidth/2,viewHeight/2,viewWidth*0.68);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,run.player.hurt>0?'#75291945':'#10111830');ctx.fillStyle=vignette;ctx.fillRect(0,0,viewWidth,viewHeight);
  if(guidance)drawObjectivePointer(ctx,run,camera,viewWidth,viewHeight,uiScale);
  const previous=minimapCorners.get(canvas);
  const corner=previous?.areaIndex===run.areaIndex&&previous?.width===viewWidth?previous.corner:null;
  const minimap=placeMinimap(run,camera,viewWidth,viewHeight,uiScale,corner);
  if(!minimap)return camera;
  minimapCorners.set(canvas,{areaIndex:run.areaIndex,width:viewWidth,corner:minimap.corner});
  const {x:mx,y:my,width:mw,height:mh}=minimap;
  ctx.fillStyle='#0c1417dc';ctx.fillRect(mx,my,mw,mh);ctx.strokeStyle='#d3b67b88';ctx.lineWidth=1;ctx.strokeRect(mx,my,mw,mh);
  const dot=(e,color,r)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(mx+e.x/WORLD.width*mw,my+e.y/WORLD.height*mh,r,0,Math.PI*2);ctx.fill();};
  ctx.strokeStyle='#c5ae7666';ctx.lineWidth=1;for(const road of campaignRoads(run)){ctx.beginPath();road.forEach((p,i)=>{const x=mx+p.x/WORLD.width*mw,y=my+p.y/WORLD.height*mh;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
  run.beacons.forEach(b=>dot(b,b.charge===1?'#ffe0a2':'#c0b491',4));run.enemies.filter(e=>e.boss).forEach(e=>dot(e,'#ed8d78',5));
  drawSymbol(ctx,'hero',mx+run.player.x/WORLD.width*mw,my+run.player.y/WORLD.height*mh,12*uiScale);
  run.campaign.npcs.forEach(n=>dot(n,'#becfff',3));dot(run.campaign.event,'#f3cf7c',4);const exit=JOURNEY[run.areaIndex].exit;drawSymbol(ctx,'gate',mx+exit.x/WORLD.width*mw,my+exit.y/WORLD.height*mh,12*uiScale,run.gateOpen?'#fff2a0':'#a0a99c');
  ctx.font=canvasFont('map',uiScale);ctx.textAlign='center';ctx.fillStyle='#fff1c0';run.campaign.routes.forEach((r,i)=>ctx.fillText(i?'B':'A',mx+r.x/WORLD.width*mw,my+r.y/WORLD.height*mh-7));

  ctx.strokeStyle='#ffffff66';ctx.strokeRect(mx+camera.x/WORLD.width*mw,my+camera.y/WORLD.height*mh,viewWidth/WORLD.width*mw,viewHeight/WORLD.height*mh);
  return camera;
}
