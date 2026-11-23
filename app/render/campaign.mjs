import {CAMPAIGN,campaignMilestones} from '../../content/campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {AREAS} from '../../content/game.mjs';
import {distance,clamp} from '../game/geometry.mjs';
import {visibleAt} from './presentation.mjs';
import {markerLabel} from './guidance.mjs';
import {drawSymbol} from './symbols.mjs';
import {canvasFont} from './typography.mjs';
import {glow} from './world.mjs';
import {drawWorldDetail} from './raster-details.mjs';

const roadsByCampaign=new WeakMap();
export function campaignRoads(run){
 if(roadsByCampaign.has(run.campaign))return roadsByCampaign.get(run.campaign);
 const def=CAMPAIGN[run.areaIndex],routes=run.campaign.routes,fork={x:1100,y:1280},exit=JOURNEY[run.areaIndex].exit;
 const roads=[[AREAS[run.areaIndex].spawn,fork],[fork,routes[0],def.hub],[fork,routes[1],def.hub],[routes[0],{x:2300,y:530},def.arena],[routes[1],{x:2540,y:1960},def.arena],[def.hub,def.arena,exit]];
 roadsByCampaign.set(run.campaign,roads);return roads;
}
export function drawCampaignTerrain(ctx,run,camera,reduced,images){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex],theme=AREAS[run.areaIndex].detailTheme,t=reduced?0:run.time;
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
  drawWorldDetail(ctx,images,7,0,78,156);
  ctx.restore();ctx.save();
 }
 for(const [index,r] of c.routes.entries()){
  if(!visibleAt(r,camera,420))continue;
  const warm=r.completed,ground=run.areaIndex===0?(index?'#3e643c66':'#424c3c88'):['#424c3c88','#2b485c77','#44324f77','#693e2877','#303d6577'][run.areaIndex];
  ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(r.x,r.y+25,270,190,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=warm?'#f0d28b99':'#a6a28866';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(r.x,r.y+25,245,172,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,x=r.x+Math.cos(a)*215,y=r.y+25+Math.sin(a)*148;
   drawWorldDetail(ctx,images,12+theme,x,y+14,28+(i%3)*8,warm?1:0.8);
  }
  ctx.font=canvasFont('label');ctx.textAlign='center';ctx.fillStyle='#eee0b7';ctx.fillText(r.name,r.x,r.y-190);
 }
 // Barricades are removed, never inserted around living actors.
 for(const b of c.barriers)if(visibleAt(b,camera))drawWorldDetail(ctx,images,15,b.x,b.y+22,120);
 ctx.restore();
}
export function drawCampaignObjectives(ctx,run,camera,reduced,scale,images){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex],p=run.player,t=reduced?0:run.time;
 for(const [index,r]of c.routes.entries()){
  if(!visibleAt(r,camera,180))continue;
  const active=r.status!=='locked',near=distance(p,r)<150;
  ctx.save();ctx.strokeStyle=r.completed?'#f4d492':active?r.color:'#8a8e7b66';ctx.lineWidth=3;ctx.setLineDash(active?[]:[8,10]);ctx.beginPath();ctx.ellipse(r.x,r.y+24,133,93,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  if(r.progress>0){ctx.lineWidth=7;ctx.beginPath();ctx.arc(r.x,r.y,115,-Math.PI/2,-Math.PI/2+r.progress*Math.PI*2);ctx.stroke();}
  drawSymbol(ctx,r.completed?'gate':'guide',r.x-75,r.y+42,25);
  if(near||!c.choice)markerLabel(ctx,'guide',r.completed?'Road '+(index?'B':'A')+' · Restored':active?(r.status==='recovering'?'Keeper returning · Mission reset':r.status==='retry'?'Restart mission · F':r.status==='active'?r.verb+' · '+Math.floor(r.progress*100)+'%':'Road '+(index?'B':'A')+' · '+(r.kind==='repair'?'Repair':'Rescue')+' · F'):'Free '+campaignMilestones(run.areaIndex,run.difficulty)[0]+' Hollow to open this road',r.x,r.y+150,scale);
  ctx.restore();
 }
 if(c.stage<2)return;
 const event=c.event;if(!visibleAt(event,camera,230))return;
 ctx.save();ctx.translate(event.x,event.y);glow(ctx,0,-25,130,event.complete?'#ffdc7e33':'#a2d6d722');
 ctx.strokeStyle='#e4c77b';ctx.lineWidth=3;if(!event.complete){ctx.beginPath();ctx.ellipse(0,20,165,105,0,0,Math.PI*2);ctx.stroke();}
 drawWorldDetail(ctx,images,AREAS[run.areaIndex].detailTheme*4+1,0,22+(reduced?0:Math.sin(t*3)*1.4),AREAS[run.areaIndex].detailTheme===2?155:135);
 if(!event.complete&&distance(p,event)>140)markerLabel(ctx,'scenery',def.event.name,0,-130,scale);
 ctx.font=canvasFont('small',scale);ctx.textAlign='center';ctx.fillStyle='#ffecc2';if(!event.complete)ctx.fillText(Math.floor(event.progress*100)+'% · Stay within the gold circle',0,145);ctx.restore();
}
