import {CAMPAIGN,campaignMilestones} from '../../content/campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {AREAS} from '../../content/game.mjs';
import {distance,clamp} from '../game/geometry.mjs';
import {visibleAt} from './presentation.mjs';
import {markerLabel} from './guidance.mjs';
import {drawSymbol} from './symbols.mjs';
import {canvasFont} from './typography.mjs';
import {glow} from './world.mjs';

const roadsByCampaign=new WeakMap();
export function campaignRoads(run){
 if(roadsByCampaign.has(run.campaign))return roadsByCampaign.get(run.campaign);
 const def=CAMPAIGN[run.areaIndex],routes=run.campaign.routes,fork={x:1100,y:1280},exit=JOURNEY[run.areaIndex].exit;
 const roads=[[AREAS[run.areaIndex].spawn,fork],[fork,routes[0],def.hub],[fork,routes[1],def.hub],[routes[0],{x:2300,y:530},def.arena],[routes[1],{x:2540,y:1960},def.arena],[def.hub,def.arena,exit]];
 roadsByCampaign.set(run.campaign,roads);return roads;
}
export function drawCampaignTerrain(ctx,run,camera,reduced){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex],t=reduced?0:run.time;
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 for(const road of campaignRoads(run))for(const [width,color]of [[132,'#20232148'],[108,'#cbb98a32'],[3,'#f1d08770']]){
  ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();road.forEach((p,i)=>i?ctx.lineTo(p.x,p.y+22):ctx.moveTo(p.x,p.y+22));ctx.stroke();
 }
 if(run.areaIndex===0){
  ctx.lineWidth=26;ctx.strokeStyle='#284e4d77';ctx.beginPath();ctx.moveTo(1260,180);ctx.bezierCurveTo(1100,700,1540,1500,1260,2230);ctx.stroke();
  ctx.lineWidth=3;ctx.strokeStyle=c.stage>=2?'#c5dcd38c':'#698e8655';ctx.stroke();
  for(let i=0;i<32;i++){const y=200+i*65,x=1295+Math.sin(y/500)*70;ctx.strokeStyle='#bdd2b044';ctx.beginPath();ctx.moveTo(x-10,y+(t*8%40));ctx.lineTo(x+8,y+(t*8%40));ctx.stroke();}
 }else{
  const x=1930,y=1230;ctx.translate(x,y);ctx.rotate(run.areaIndex===1?(c.stage>=2?0:-0.38):Math.sin(t*0.25)*0.09);
  for(let i=-5;i<=5;i++){ctx.fillStyle=i%2?'#61594e':'#8b7b60';ctx.fillRect(i*28,-78,24,156);ctx.strokeStyle='#d2b87977';ctx.strokeRect(i*28,-78,24,156);}
  ctx.restore();ctx.save();
 }
 for(const [index,r] of c.routes.entries()){
  if(!visibleAt(r,camera,420))continue;
  const warm=r.completed,ground=run.areaIndex===0?(index?'#3e643c66':'#424c3c88'):run.areaIndex===1?'#2b485c77':'#44324f77';
  ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(r.x,r.y+25,270,190,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=warm?'#f0d28b99':'#a6a28866';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(r.x,r.y+25,245,172,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,x=r.x+Math.cos(a)*215,y=r.y+25+Math.sin(a)*148;
   if(run.areaIndex===0&&index===1){ctx.fillStyle=warm?'#9da65e':'#40573a';ctx.beginPath();ctx.ellipse(x,y,20,12,0,0,Math.PI*2);ctx.fill();if(warm){ctx.fillStyle='#ffe1a0';ctx.fillRect(x-3,y-5,6,6);}}
   else {ctx.fillStyle=warm?'#d5b779':'#77736b';ctx.fillRect(x-7,y-7,14,14);ctx.strokeStyle='#e5c58277';ctx.strokeRect(x-9,y-9,18,18);}
  }
  ctx.font=canvasFont('label');ctx.textAlign='center';ctx.fillStyle='#eee0b7';ctx.fillText(r.name,r.x,r.y-190);
 }
 // Barricades are removed, never inserted around living actors.
 for(const b of c.barriers){if(!visibleAt(b,camera))continue;ctx.strokeStyle=run.areaIndex===0?'#746b3f':'#9a8867';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(b.x-35,b.y+22);ctx.quadraticCurveTo(b.x+30,b.y-100,b.x+35,b.y+22);ctx.stroke();ctx.strokeStyle='#dfc88077';ctx.lineWidth=3;ctx.stroke();}
 ctx.restore();
}
export function drawCampaignObjectives(ctx,run,camera,reduced,scale){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex],p=run.player,t=reduced?0:run.time;
 for(const [index,r]of c.routes.entries()){
  if(!visibleAt(r,camera,180))continue;
  const active=r.status!=='locked',near=distance(p,r)<150;
  ctx.save();ctx.strokeStyle=r.completed?'#f4d492':active?r.color:'#8a8e7b66';ctx.lineWidth=3;ctx.setLineDash(active?[]:[8,10]);ctx.beginPath();ctx.ellipse(r.x,r.y+24,133,93,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  if(r.progress>0){ctx.lineWidth=7;ctx.beginPath();ctx.arc(r.x,r.y,115,-Math.PI/2,-Math.PI/2+r.progress*Math.PI*2);ctx.stroke();}
  drawSymbol(ctx,r.completed?'gate':'guide',r.x-75,r.y+42,25);
  if(near||!c.choice)markerLabel(ctx,'guide',r.completed?'Road '+(index?'B':'A')+' · Restored':active?(r.status==='active'?r.verb+' · '+Math.floor(r.progress*100)+'%':'Road '+(index?'B':'A')+' · '+(r.kind==='repair'?'Repair':'Rescue')+' · F'):'Free '+campaignMilestones(run.areaIndex,run.difficulty)[0]+' Hollow to open this road',r.x,r.y+150,scale);
  ctx.restore();
 }
 if(c.stage<2)return;
 const event=c.event;if(!visibleAt(event,camera,230))return;
 ctx.save();ctx.translate(event.x,event.y);glow(ctx,0,-25,130,event.complete?'#ffdc7e33':'#a2d6d722');
 ctx.strokeStyle='#e4c77b';ctx.lineWidth=3;if(!event.complete){ctx.beginPath();ctx.ellipse(0,20,165,105,0,0,Math.PI*2);ctx.stroke();}
 if(def.event.kind==='convoy'){
  ctx.fillStyle='#463c31';ctx.fillRect(-56,-37,112,44);ctx.strokeStyle='#b89d68';ctx.strokeRect(-56,-37,112,44);
  for(const x of [-42,42]){ctx.fillStyle='#514536';ctx.beginPath();ctx.arc(x,8,17,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#efcf84';ctx.stroke();ctx.save();ctx.translate(x,8);ctx.rotate(t);ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(15,0);ctx.moveTo(0,-15);ctx.lineTo(0,15);ctx.stroke();ctx.restore();}
  if(run.areaIndex===0){ctx.save();ctx.translate(0,-58);ctx.rotate(t*0.55);for(let i=0;i<12;i++){ctx.rotate(Math.PI/6);ctx.fillStyle='#d9b96d';ctx.fillRect(-5,-39,10,17);}ctx.fillStyle='#f6db95';ctx.beginPath();ctx.arc(0,0,27,0,Math.PI*2);ctx.fill();ctx.fillStyle='#786041';ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.restore();}
  else{ctx.fillStyle='#d5b477';ctx.beginPath();ctx.moveTo(-18,-89);ctx.quadraticCurveTo(-30,-70,-30,-48);ctx.lineTo(30,-48);ctx.quadraticCurveTo(30,-70,18,-89);ctx.closePath();ctx.fill();ctx.stroke();}
 }else{
  for(let i=0;i<3;i++){ctx.save();ctx.rotate(t*0.3+i*Math.PI/3);ctx.beginPath();ctx.ellipse(0,-25,88,36,0,0,Math.PI*2);ctx.stroke();ctx.restore();}glow(ctx,0,-25,45,'#ffe5a688');
 }
 if(!event.complete&&distance(p,event)>140)markerLabel(ctx,'scenery',def.event.name,0,-130,scale);
 ctx.font=canvasFont('small',scale);ctx.textAlign='center';ctx.fillStyle='#ffecc2';if(!event.complete)ctx.fillText(Math.floor(event.progress*100)+'% · Stay within the gold circle',0,145);ctx.restore();
}
