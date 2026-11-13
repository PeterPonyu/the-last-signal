import {drawCast} from './cast.mjs';
import {drawWorldDetail} from './raster-details.mjs';
import {canvasFont} from './typography.mjs';
import {markerLabel} from './guidance.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {nearbyInteraction,gatewayPrompt} from '../game/journey.mjs';
import {visibleAt} from './presentation.mjs';
import {distance} from '../game/geometry.mjs';
import {glow} from './world.mjs';

function label(ctx,text,x,y,role='small'){
  ctx.font=canvasFont(role);ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#171a18';ctx.fillStyle='#fff0c6';ctx.strokeText(text,x,y);ctx.fillText(text,x,y);
}
export function landmarkMotion(kind,time,reduced=false){
  const t=reduced?0:time;
  return {hand:t*Math.PI/15,slowHand:t*Math.PI/180,swing:Math.sin(t*1.7)*0.17,orbit:t*0.38,kind};
}
export function drawLandmark(ctx,run,camera,reduced,images){
  const landmark=JOURNEY[run.areaIndex].landmark,m=landmarkMotion(landmark.kind,run.time,reduced);
  if(!visibleAt(landmark,camera,240))return;
  const index=run.areaIndex*4;
  drawWorldDetail(ctx,images,index,landmark.x,landmark.y+25,190,1,landmark.kind==='bell'?m.swing*0.25:0);
  if(landmark.kind==='clock'){
    ctx.save();ctx.translate(landmark.x,landmark.y-80);ctx.strokeStyle='#ffe4a0';ctx.lineWidth=3;
    for(const [angle,length]of [[m.hand,27],[m.slowHand,18]]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(angle)*length,Math.sin(angle)*length);ctx.stroke();}ctx.restore();
  }
  if(landmark.kind==='sun')glow(ctx,landmark.x,landmark.y-85,40,'#ffdf7c44');
}
export function drawGuide(ctx,images,run,reduced,guidance=true,scale=1,npc=run.campaign.npcs[0]){
  const near=nearbyInteraction(run)?.id===npc.id;
  ctx.save();glow(ctx,npc.x,npc.y-24,72,near?'#e3c67844':'#d5dab41c');
  const route=run.campaign.routes.find(r=>r.npc===npc.id);
  const working=route?.kind==='repair'&&route.status==='active'&&distance(run.player,route)<135;
  drawCast(ctx,images,{...npc,npc:true,met:npc.met&&near,working},run.time,reduced);
  if(near||npc.id===run.campaign.npcs[0].id)markerLabel(ctx,'guide',guidance&&near?'Speak to '+npc.name+' · F':npc.name,npc.x,npc.y-112,scale);
  ctx.restore();
}
export function drawGateway(ctx,run,camera,reduced,guidance=true,scale=1,images){
  const gate=JOURNEY[run.areaIndex].exit;if(!visibleAt(gate,camera,230))return;
  const open=run.gateOpen,showLabels=open||!run.bossSpawned,t=reduced?0:run.time;
  ctx.save();ctx.translate(gate.x,gate.y);glow(ctx,0,-40,150,open?'#ffcd6a66':'#8cb5ac22');
  drawWorldDetail(ctx,images,open?run.areaIndex:run.areaIndex*4+2,0,28,200,1,0,open?'openGate':'worldDetails');
  if(open){
    ctx.fillStyle='#e4bc6024';ctx.beginPath();ctx.ellipse(0,-45,59,86,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<12;i++){const y=15-((t*23+i*13)%150);ctx.globalAlpha=0.25+0.5*Math.sin((15-y)/150*Math.PI);ctx.fillStyle='#ffe3a1';ctx.fillRect(Math.sin(i*8.3)*48,y,3,5);}ctx.globalAlpha=1;
    ctx.strokeStyle='#ffe8af';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,-38);ctx.lineTo(17,-38);ctx.lineTo(5,-50);ctx.moveTo(17,-38);ctx.lineTo(5,-26);ctx.stroke();
  }else{ctx.strokeStyle='#83b4aa';ctx.lineWidth=3;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-58,-80+i*28);ctx.lineTo(58,-80+i*28);ctx.stroke();}if(showLabels)label(ctx,'Sealed',0,-26,'small');}
  if(showLabels){
    label(ctx,gate.name,0,-172,'label');
    markerLabel(ctx,'gate',gatewayPrompt(run),0,62,scale);
    if(guidance&&!open)label(ctx,'Resolve the gathering, then defeat the Warden',0,106,'small');
  }
  ctx.restore();
}
