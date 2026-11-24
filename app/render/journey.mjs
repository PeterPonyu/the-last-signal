import {drawCast} from './cast.mjs';
import {drawWorldDetail} from './raster-details.mjs';
import {canvasFont} from './typography.mjs';
import {markerLabel} from './guidance.mjs';
import {AREAS} from '../../content/game.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {nearbyInteraction,gatewayPrompt} from '../game/journey.mjs';
import {visibleAt} from './presentation.mjs';
import {distance} from '../game/geometry.mjs';
import {glow} from './world.mjs';
import {drawDecal,caption,drawGlyph,lightPillar,alpha,TONES,GROUND} from './decal.mjs';

const TAU=Math.PI*2;
// F reaches guides and the gateway within 120 world units (nearbyInteraction).
export const REACH=120;
function label(ctx,text,x,y,role='small',scale=1){
  ctx.font=canvasFont(role,scale);ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#171a18';ctx.fillStyle='#fff0c6';ctx.strokeText(text,x,y);ctx.fillText(text,x,y);
}
export function landmarkMotion(kind,time,reduced=false){
  const t=reduced?0:time;
  return {hand:t*Math.PI/15,slowHand:t*Math.PI/180,swing:Math.sin(t*1.7)*0.17,orbit:t*0.38,kind};
}
export function drawLandmark(ctx,run,camera,reduced,images){
  const landmark=JOURNEY[run.areaIndex].landmark,m=landmarkMotion(landmark.kind,run.time,reduced);
  if(!visibleAt(landmark,camera,240))return;
  const index=AREAS[run.areaIndex].detailTheme*4;
  drawWorldDetail(ctx,images,index,landmark.x,landmark.y+25,190,1,landmark.kind==='bell'?m.swing*0.25:0);
  if(landmark.kind==='clock'){
    ctx.save();ctx.translate(landmark.x,landmark.y-80);ctx.strokeStyle='#ffe4a0';ctx.lineWidth=3;
    for(const [angle,length]of [[m.hand,27],[m.slowHand,18]]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(angle)*length,Math.sin(angle)*length);ctx.stroke();}ctx.restore();
  }
  if(landmark.kind==='sun')glow(ctx,landmark.x,landmark.y-85,40,'#ffdf7c44');
}
// Ground highlight for a guide you can talk to: the true reach of F, brighter once inside it.
export function drawGuideZone(ctx,run,npc,reduced,scale=1){
  if(npc.state==='active'||npc.state==='captured'||run.campaign.routes.some(r=>r.npc===npc.id))return;
  const d=distance(run.player,npc),fade=Math.max(0,Math.min(1,(REACH+70-d)/70));if(fade<=0)return;
  drawDecal(ctx,npc.x,npc.y+GROUND,REACH,TONES.guide,{strength:0.9,alpha:fade,glint:d<REACH,reduced,time:run.time,scale});
}
export function drawGuide(ctx,images,run,reduced,guidance=true,scale=1,npc=run.campaign.npcs[0]){
  const near=nearbyInteraction(run)?.id===npc.id;
  ctx.save();
  const route=run.campaign.routes.find(r=>r.npc===npc.id);
  const working=route?.kind==='repair'&&route.status==='active'&&distance(run.player,route)<135&&!npc.evading;
  drawCast(ctx,images,{...npc,npc:true,met:npc.met&&near,working},run.time,reduced,npc.state==='captured'?0.35:1);
  if(npc.state==='active'){
    const width=100*scale,y=npc.y-110,h=7*scale;
    ctx.fillStyle='#101b1ee8';ctx.fillRect(npc.x-width/2-2,y-2,width+4,h+4);
    ctx.fillStyle=npc.hp<npc.maxHp*0.3?'#ffad81':'#95e4d0';ctx.fillRect(npc.x-width/2,y,width*npc.hp/npc.maxHp,h);
    // A ward shows as an amber cap over the health bar instead of an outline box.
    if(npc.shield>0){ctx.fillStyle='#ffd27acc';ctx.fillRect(npc.x-width/2,y-3*scale,width*Math.min(1,npc.shield/24),2.5*scale);}
    label(ctx,'Protect '+npc.name,npc.x,y-8*scale,'small',scale);
  }else if(npc.state==='captured')markerLabel(ctx,'guide',npc.name+' · Captured',npc.x,npc.y-112,scale);
  else if(route?.status==='retry')markerLabel(ctx,'guide','Restart mission · F',npc.x,npc.y-112,scale);
  else if(near||npc.id===run.campaign.npcs[0].id)markerLabel(ctx,'guide',guidance&&near?'Speak to '+npc.name+' · F':npc.name,npc.x,npc.y-112,scale);
  ctx.restore();
}
const openedAt=new WeakMap();
// Seconds since this map's gateway opened, measured on the run clock (renderer memory only).
export function gateOpenAge(run){
  if(!run.gateOpen)return null;
  const key=run.campaign||run;if(!openedAt.has(key)||openedAt.get(key)>run.time)openedAt.set(key,run.time);
  return run.time-openedAt.get(key);
}
export function drawGateway(ctx,run,camera,reduced,guidance=true,scale=1,images,labels=null){
  const gate=JOURNEY[run.areaIndex].exit;if(!visibleAt(gate,camera,260))return;
  const open=run.gateOpen,showLabels=open||!run.bossSpawned,t=reduced?0:run.time,age=gateOpenAge(run),near=distance(run.player,gate)<REACH;
  const tone=open?TONES.open:TONES.sealed,gy=gate.y+GROUND;
  drawDecal(ctx,gate.x,gy,REACH,tone,{strength:open||near?1:0.7,glint:open,icon:'gate',reduced,time:t,scale});
  ctx.save();ctx.translate(gate.x,gate.y);glow(ctx,0,-40,150,open?'#ffcd6a66':'#8cb5ac1c');
  drawWorldDetail(ctx,images,open?AREAS[run.areaIndex].detailTheme:AREAS[run.areaIndex].detailTheme*4+2,0,28,200,1,0,open?'openGate':'worldDetails');
  if(open){
    ctx.fillStyle='#e4bc6024';ctx.beginPath();ctx.ellipse(0,-45,59,86,0,0,TAU);ctx.fill();
    if(!reduced){ctx.beginPath();for(let i=0;i<12;i++){const y=15-((t*23+i*13)%150);ctx.rect(Math.sin(i*8.3)*48,y,3,5);}ctx.fillStyle='#ffe3a1aa';ctx.fill();}
    if(age!==null&&age<1.2)gateBurst(ctx,age/1.2,reduced);
  }
  ctx.restore();
  if(showLabels){
    const y=gy+REACH+30*scale,say=(text,dy)=>labels?labels.push({text,x:gate.x,y:y+dy,above:gy-REACH-200-dy,tone,keep:true}):caption(ctx,text,gate.x,y+dy,tone,scale);
    say(gatewayPrompt(run),0);
    if(guidance&&!open)say('Defeat the Warden',22*scale);
  }
}
// Gate opening (Tier L): gather into the arch, release a column and a ground wave, embers settle.
function gateBurst(ctx,t,reduced){
  const release=Math.min(1,t/0.35),after=Math.max(0,(t-0.35)/0.65),fade=1-after;
  lightPillar(ctx,0,28,60*release+10,280*release,'#fff6c8','#ffd476',0.75*fade);
  const r=40+190*Math.sqrt(t),g=ctx.createRadialGradient(0,GROUND,Math.max(0,r-26),0,GROUND,r);
  g.addColorStop(0,alpha('#ffd476',0));g.addColorStop(0.75,alpha('#fff2a0',0.55*fade));g.addColorStop(1,alpha('#fff2a0',0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,GROUND,r,0,TAU);ctx.fill();
  if(reduced)return;
  for(let i=0;i<14;i++){const a=i*TAU/14,d=60+150*Math.sqrt(t)*(0.6+(i%3)*0.2);drawGlyph(ctx,'cosmos',Math.cos(a)*d,GROUND-40*t-Math.abs(Math.sin(a))*30,a,5*fade+1,alpha('#fff2a0',0.9*fade));}
}
