import {drawCast,drawParty} from './cast.mjs';
import {drawCampaignTerrain,drawCampaignObjectives,campaignRoads} from './campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {corpseAppearance} from '../game/journey.mjs';
import {drawLandmark,drawGuide,drawGateway,drawGuideZone} from './journey.mjs';
import { WORLD, AREAS, DIFFICULTIES } from '../../content/game.mjs';
import { clamp, distance } from '../game/geometry.mjs';

import {renderPosition,followCamera,propAlpha,visibleAt} from './presentation.mjs';
import {drawWorld,drawAmbient,drawShadow,glow,drawKitSprite,kitSprite} from './world.mjs';
import {drawEffects} from './effects.mjs';
import {drawActorEnergy,drawProjectiles,drawHazardImpact,drawHazardAftermath,drawDefeatEnergy,enemyTelegraph,enemyTelegraphTop,ENERGY} from './combat-vfx.mjs';
import {canvasFont} from './typography.mjs';
import {drawSymbol} from './symbols.mjs';
import {markerLabel,drawObjectivePointer,drawDanger,drawDangerOutline} from './guidance.mjs';
import {placeMinimap} from './minimap-layout.mjs';
import {drawDecal,caption,drawGlyph,alpha as withAlpha,TONES,GROUND} from './decal.mjs';
import {drawEnvironmentGround,drawEnvironmentTop} from './environment-vfx.mjs';
import {drawAffixes} from './affix-vfx.mjs';
import {drawGiftEffects} from './gift-vfx.mjs';
import {drawRecruit,drawPartyGround,drawPartyBars} from './party-vfx.mjs';

const minimapCorners=new WeakMap();
const sceneryByArea=new WeakMap();
// Standing scenery joins the depth-sorted actors; extra footprint circles and flat ground decals
// (drawn under everything by drawWorld) are left out.
function sceneryFor(area){
  if(!sceneryByArea.has(area))sceneryByArea.set(area,[...area.obstacles.filter(o=>!o.part),...area.decorations.filter(d=>!kitSprite(area,d.type)?.flat)].map(o=>({...o,prop:true})));
  return sceneryByArea.get(area);
}
// World-true reach of map items (simulation radii): wells heal within 78, a lantern's burst
// cleanses within 170, a pickup is collected within 35.
export const ITEM_REACH={well:78,lantern:170,pickup:35};
// Captions sit under a decal; when a body stands on that spot they move above it instead.
export function placeCaption(label,blockers){
  const blocked=y=>blockers.some(a=>Math.abs(a.x-label.x)<label.half+(a.boss?145:55)&&y>a.y-(a.boss?250:125)&&y<a.y+45);
  for(const y of [label.y,...(label.above!==undefined?[label.above]:[])])if(!blocked(y))return y;
  return label.keep?label.y:null;
}

// view (optional): {width,height} in world units shown on screen, scale = backing pixels per
// world unit, cssWidth = displayed width in CSS pixels. Without it the legacy fixed view is used.
export function drawBattlefield(ctx, canvas, images, run, reduced, previousCamera=null, elapsed=1/60, alpha=1, guidance=true, cameraTarget=null, view=null) {
  const area=AREAS[run.areaIndex];
  let viewWidth,viewHeight,uiScale;
  if(view){
    viewWidth=view.width;viewHeight=view.height;
    const pixelWidth=Math.max(1,Math.round(viewWidth*view.scale)),pixelHeight=Math.max(1,Math.round(viewHeight*view.scale));
    if(canvas.width!==pixelWidth)canvas.width=pixelWidth;
    if(canvas.height!==pixelHeight)canvas.height=pixelHeight;
    ctx.setTransform(pixelWidth/viewWidth,0,0,pixelHeight/viewHeight,0,0);
    uiScale=Math.max(1,viewWidth/(view.cssWidth||viewWidth));
  }else{
    viewWidth=matchMedia('(max-width:750px)').matches?680:1200;viewHeight=680;
    if(canvas.width!==viewWidth)canvas.width=viewWidth;
    uiScale=Math.max(1,viewWidth/(canvas.clientWidth||viewWidth));
  }
  const player=renderPosition(run.player,alpha),companion=renderPosition(run.companion,alpha),sol=renderPosition(run.sol,alpha);
  const camera=followCamera(previousCamera,cameraTarget||player,viewWidth,viewHeight,elapsed,run.areaIndex,reduced);
  const party=[player,companion,...(sol.active?[sol]:[]),...run.campaign.npcs.filter(n=>n.state==='active').map(n=>renderPosition(n,alpha))],labels=[];
  const time=reduced?0:run.time,danger={areaIndex:run.areaIndex,time:run.time,reduced,hazards:run.hazards};
  // Poses, smoothing and procedural motion live in cast.mjs; the renderer only orders layers.
  const drawActor=(e,opacity=1)=>{
    const kind=e.hero?'hero':e.companion?'companion':e.sol?'sol':'enemy';
    drawActorEnergy(ctx,e,kind,run,reduced,false);
    if(kind==='enemy')drawCast(ctx,images,e,run.time,reduced,opacity);
    else drawParty(ctx,images,e,kind,run.time,reduced,opacity);
    drawActorEnergy(ctx,e,kind,run,reduced,true);
  };
  const sprite=(image,rows,pose,x,y,height,baseline,face=1,alpha=1)=>{
    const sw=image.width/4,sh=image.height/rows,w=height*sw/sh;
    ctx.save();ctx.translate(x,y);ctx.scale(face,1);ctx.globalAlpha=alpha;
    ctx.drawImage(image,pose.column*sw,pose.row*sh,sw,sh,-w/2,24-baseline*height,w,height);ctx.restore();
  };
  // Map scenery comes from the map's own kit (named types); wells, lanterns and pickups share the
  // battlefield props atlas (numbered types).
  const prop=(p,opacity=1)=>typeof p.type==='string'?drawKitSprite(ctx,images,area,p.type,p.x,p.y,{opacity,time,reduced}):sprite(images.props,2,{row:Math.floor(p.type/4),column:p.type%4},p.x,p.y,p.height,0.91,1,opacity);
  ctx.clearRect(0,0,viewWidth,viewHeight);ctx.save();ctx.translate(-camera.x,-camera.y);
  drawWorld(ctx,images,area,run,camera,reduced);
  drawCampaignTerrain(ctx,run,camera,reduced,images);
  drawEnvironmentGround(ctx,run,camera,reduced,uiScale);
  drawLandmark(ctx,run,camera,reduced,images);
  drawCampaignObjectives(ctx,run,camera,reduced,uiScale,images,labels);
  drawGateway(ctx,run,camera,reduced,guidance,uiScale,images,labels);
  for(const n of run.campaign.npcs)if(visibleAt(n,camera,140))drawGuideZone(ctx,run,n,reduced,uiScale);
  // Recovery wells: mint while waiting, filling from the centre as you stand, gold once restored.
  for(const b of run.beacons){
    if(!visibleAt(b,camera,ITEM_REACH.well+60))continue;
    const near=distance(b,run.player)<ITEM_REACH.well,done=b.charge===1,y=b.y+GROUND,tone=done?TONES.restored:TONES.recovery;
    drawDecal(ctx,b.x,y,ITEM_REACH.well,tone,{progress:!done&&b.charge>0?b.charge:null,icon:'beacon',glint:near&&!done,strength:done?0.8:1,reduced,time,scale:uiScale});
    if((guidance&&run.npcMet)||near){const text=done?'Restored':b.charge>0?Math.round(b.charge*100)+'%':'Stand 3s';labels.push({text,x:b.x,y:y+ITEM_REACH.well+30*uiScale,above:y-ITEM_REACH.well-26*uiScale,tone,keep:near});}
  }
  // A lantern's cleansing reach shows when it matters: Hollow inside its reach while you are near
  // enough to strike it, or (with the field guide on) when its guide hint is showing.
  for(const l of run.lanterns){
    if(l.lit||!visibleAt(l,camera,ITEM_REACH.lantern))continue;
    const d=distance(l,player),reach=ITEM_REACH.lantern,threatened=run.enemies.some(e=>e.hp>0&&!(e.warning>0)&&distance(e,l)<reach);
    const fade=Math.max(threatened?clamp((reach+120-d)/70,0,1):0,guidance?clamp((145-d)/40,0,1):0);if(fade<=0)continue;
    drawDecal(ctx,l.x,l.y+GROUND,reach,TONES.lantern,{strength:0.85,alpha:fade,icon:'lantern',glint:d<reach,reduced,time,scale:uiScale});
    if(guidance&&run.npcMet&&fade>0.6)labels.push({text:'Strike to cleanse',x:l.x,y:l.y+GROUND+reach+30*uiScale,above:l.y+GROUND-reach-24*uiScale,tone:TONES.lantern});
  }
  drawEffects(ctx,images,run,camera,reduced,true,uiScale);
  drawGiftEffects(ctx,images,run,camera,reduced,true,uiScale);
  drawPartyGround(ctx,run,camera,reduced,uiScale,alpha);
  drawHazardAftermath(ctx,run,camera,reduced);
  const owners=new Map(run.enemies.map(e=>[e.id,e]));
  for(const h of run.hazards){if(h.world)continue;drawHazardImpact(ctx,h,reduced,run);drawDanger(ctx,h,uiScale,{...danger,owner:owners.get(h.owner)});}
  // Enemy wind-ups are ground telegraphs: portals, wedges, lanes and channels, all filling to strike.
  const setting=DIFFICULTIES[run.difficulty]||DIFFICULTIES.normal;
  const focusOf=e=>e.focusId&&e.focusId!=='hero'?run.campaign.npcs.find(n=>n.id===e.focusId)||(run.party||[]).find(a=>a.id===e.focusId)||player:player;
  for(const e of run.enemies)if(e.hp>0&&visibleAt(e,camera,260))enemyTelegraph(ctx,e,run,{reduced,time:run.time,warningScale:setting.warning,target:focusOf(e)});
  // Pickups: a small mint decal at the true pickup reach, a gem shimmer, and a blink before they fade.
  for(const item of run.pickups){
    if(!visibleAt(item,camera,60))continue;
    const blink=item.life<4&&!reduced?0.55+0.45*Math.cos(run.time*Math.PI*(item.life<1.5?8:4)):1;
    ctx.save();ctx.globalAlpha=blink;
    drawDecal(ctx,item.x,item.y+GROUND,ITEM_REACH.pickup,TONES.recovery,{strength:0.85,reduced,time});
    prop({...item,type:5,height:56},blink);
    if(!reduced){const s=(run.time*1.7+item.x*0.01)%1.6;if(s<0.35)drawGlyph(ctx,'cosmos',item.x+9,item.y-30,s*2,9*Math.sin(Math.PI*s/0.35),withAlpha('#effff6',0.95));}
    ctx.restore();
  }
  for(const e of run.corpses){if(!visibleAt(e,camera))continue;const remains=corpseAppearance(e);drawShadow(ctx,e,e.boss?145:94,remains.opacity);drawCast(ctx,images,e,run.time,reduced,remains.opacity);drawDefeatEnergy(ctx,e,reduced);}
  const actors=sceneryFor(area).filter(e=>visibleAt(e,camera));
  for(const o of run.lanterns)if(visibleAt(o,camera))actors.push({...o,prop:true,lantern:true,type:7,height:100});
  for(const b of run.beacons)if(visibleAt(b,camera))actors.push({...b,prop:true,type:4,height:94});
  for(const e of run.enemies)if(e.hp>0&&visibleAt(e,camera,200)){const posed=renderPosition(e,alpha);if(visibleAt(posed,camera))actors.push(posed);}
  for(const n of run.campaign.npcs)if(visibleAt(n,camera))actors.push({...renderPosition(n,alpha),npc:true});
  for(const e of [{...player,hero:true},{...companion,companion:true},...(sol.active?[{...sol,sol:true}]:[])])if(visibleAt(e,camera))actors.push(e);
  for(const ally of run.party||[])if(ally.kind==='recruit'&&visibleAt(ally,camera))actors.push({...renderPosition(ally,alpha),recruit:true});
  actors.sort((a,b)=>a.y-b.y);
  for(const e of actors){
    drawShadow(ctx,e,e.prop?e.height:e.sol?54:e.boss?145:96,e.state==='captured'?0.3:e.hp<=0?Math.max(0,1-e.deathAge/0.8):e.warning>0?0:1);
    if(e.npc){drawGuide(ctx,images,run,reduced,guidance,uiScale,e);continue;}
    if(e.prop){prop(e,propAlpha(e.reach>e.radius?{...e,radius:e.reach}:e,party));
      if(e.lantern)glow(ctx,e.x,e.y-34,(e.lit?65:38)+(reduced?0:Math.sin(run.time*4+e.id)*3),e.lit?'#ffe7a355':'#e3bd6333');
      // A restored well's basin holds a small steady light (Tier S, no ring).
      if(e.charge===1){glow(ctx,e.x,e.y-44,30,'#fff1b888');drawGlyph(ctx,'cosmos',e.x,e.y-44,reduced?0:run.time*0.8,8,'#fff6d6');}
      continue;}
    if(e.hero){drawSymbol(ctx,'hero',e.x,e.y+28,25);drawActor(e,e.invulnerable>0?0.85:1);}
    else if(e.recruit){drawRecruit(ctx,images,e,run,reduced,uiScale);}
    else if(e.companion){drawActor(e);}
    else if(e.sol){drawActor(e);}
    else{
      // Arriving enemies stay unhittable inside their portal; the body fades in as the portal fills.
      if(e.warning>0){const total=1.2*setting.warning,p=clamp(1-e.warning/total,0,1);if(p>0.72)drawActor(e,(p-0.72)/0.28*0.7);continue;}
      drawAffixes(ctx,e,run,reduced,false);
      drawActor(e,e.hp<=0?Math.max(0.1,1-e.deathAge/0.8):1);
      if(e.hp<=0)continue;
      drawAffixes(ctx,e,run,reduced,true);
      if((e.guarded||e.type==='sentinel')&&e.guardBroken<=0)drawSymbol(ctx,'shield',e.x+27,e.y-40,23);

      if(e.type==='cantor')drawSymbol(ctx,'bell',e.x,e.y-102,25);
      if(e.boss)drawSymbol(ctx,'boss',e.x,e.y-(e.bossRank==='champion'?168:224),28);
      if(e.hp<e.maxHp&&!e.boss){ctx.fillStyle='#100e0e';ctx.fillRect(e.x-17,e.y-(e.lieutenant?120:100),34,4);ctx.fillStyle='#a9dfcd';ctx.fillRect(e.x-17,e.y-(e.lieutenant?120:100),34*e.hp/e.maxHp,4);}
    }
  }
  drawProjectiles(ctx,run.shots,camera,reduced,run.areaIndex);
  drawEffects(ctx,images,run,camera,reduced,false,uiScale);
  drawGiftEffects(ctx,images,run,camera,reduced,false,uiScale);
  drawEnvironmentTop(ctx,run,camera,reduced,uiScale);
  drawAmbient(ctx,run,camera,reduced);
  for(const h of run.hazards)if(!h.world)drawDangerOutline(ctx,h,uiScale,danger);
  for(const e of run.enemies)if(e.hp>0&&e.attack>0&&visibleAt(e,camera,120))enemyTelegraphTop(ctx,e,run,{reduced,time:run.time,target:focusOf(e)});
  drawPartyBars(ctx,run,camera,uiScale,alpha,reduced);
  const blockers=[...party,...run.enemies.filter(e=>e.hp>0)];
  for(const label of labels){
    ctx.font=canvasFont('label',uiScale);const half=(ctx.measureText(label.text).width+(label.tone?16:44)*uiScale)/2;
    const placed={...label,half},y=placeCaption(placed,blockers);
    if(y===null||run.hazards.some(h=>!h.triggered&&distance({x:label.x,y},h)<h.radius+half*0.5))continue;
    if(label.tone)caption(ctx,label.text,label.x,y,label.tone,uiScale);else markerLabel(ctx,label.kind,label.text,label.x,y,uiScale);
  }
  ctx.restore();
  const vignette=ctx.createRadialGradient(viewWidth/2,viewHeight/2,viewHeight*0.3,viewWidth/2,viewHeight/2,viewWidth*0.68);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,run.player.hurt>0?'#75291945':'#10111830');ctx.fillStyle=vignette;ctx.fillRect(0,0,viewWidth,viewHeight);
  if(guidance)drawObjectivePointer(ctx,run,camera,viewWidth,viewHeight,uiScale,view?.reserved||[]);
  const previous=minimapCorners.get(canvas);
  const corner=previous?.areaIndex===run.areaIndex&&previous?.width===viewWidth?previous.corner:null;
  const minimap=placeMinimap(run,camera,viewWidth,viewHeight,uiScale,corner,view?.reserved||[],{top:view?.minimapTop,size:view?.minimapSize});
  if(!minimap)return camera;
  minimapCorners.set(canvas,{areaIndex:run.areaIndex,width:viewWidth,corner:minimap.corner});
  const {x:mx,y:my,width:mw,height:mh}=minimap;
  ctx.fillStyle='#0c1417dc';ctx.fillRect(mx,my,mw,mh);ctx.strokeStyle='#d3b67b88';ctx.lineWidth=1;ctx.strokeRect(mx,my,mw,mh);
  const dot=(e,color,r)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(mx+e.x/WORLD.width*mw,my+e.y/WORLD.height*mh,r,0,Math.PI*2);ctx.fill();};
  ctx.strokeStyle='#c5ae7666';ctx.lineWidth=1;for(const road of campaignRoads(run)){ctx.beginPath();road.forEach((p,i)=>{const x=mx+p.x/WORLD.width*mw,y=my+p.y/WORLD.height*mh;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
  run.beacons.forEach(b=>dot(b,b.charge===1?TONES.restored.ink:TONES.recovery.ink,4));run.enemies.filter(e=>e.boss).forEach(e=>dot(e,ENERGY.danger,5));
  drawSymbol(ctx,'hero',mx+run.player.x/WORLD.width*mw,my+run.player.y/WORLD.height*mh,12*uiScale);
  run.campaign.npcs.forEach(n=>dot(n,'#becfff',3));dot(run.campaign.event,'#f3cf7c',4);const exit=JOURNEY[run.areaIndex].exit;drawSymbol(ctx,'gate',mx+exit.x/WORLD.width*mw,my+exit.y/WORLD.height*mh,12*uiScale,run.gateOpen?'#fff2a0':'#a0a99c');
  ctx.font=canvasFont('map',uiScale);ctx.textAlign='center';ctx.fillStyle='#fff1c0';run.campaign.routes.forEach((r,i)=>ctx.fillText(i?'B':'A',mx+r.x/WORLD.width*mw,my+r.y/WORLD.height*mh-7));

  ctx.strokeStyle='#ffffff66';ctx.strokeRect(mx+camera.x/WORLD.width*mw,my+camera.y/WORLD.height*mh,viewWidth/WORLD.width*mw,viewHeight/WORLD.height*mh);
  return camera;
}
