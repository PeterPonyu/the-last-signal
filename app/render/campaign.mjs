import {CAMPAIGN,campaignMilestones} from '../../content/campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {AREAS} from '../../content/game.mjs';
import {distance} from '../game/geometry.mjs';
import {visibleAt} from './presentation.mjs';
import {glow,drawPiece,kitOf} from './world.mjs';
import {drawDecal,caption,TONES,GROUND} from './decal.mjs';

// World-true radii from the simulation: F reaches a site within 120, a repair holds within 135,
// an escort keeper walks while you stay within 240, a gathering holds within 155 and a convoy
// rolls while you stay within 230.
export const ZONES={site:120,repair:135,escort:240,gathering:155,convoy:230};
const roadsByCampaign=new WeakMap();
export function campaignRoads(run){
 if(roadsByCampaign.has(run.campaign))return roadsByCampaign.get(run.campaign);
 const def=CAMPAIGN[run.areaIndex],routes=run.campaign.routes,fork={x:1100,y:1280},exit=JOURNEY[run.areaIndex].exit;
 const roads=[[AREAS[run.areaIndex].spawn,fork],[fork,routes[0],def.hub],[fork,routes[1],def.hub],[routes[0],{x:2300,y:530},def.arena],[routes[1],{x:2540,y:1960},def.arena],[def.hub,def.arena,exit]];
 roadsByCampaign.set(run.campaign,roads);return roads;
}
export function drawCampaignTerrain(ctx,run,camera,reduced,images){
 const c=run.campaign,t=reduced?0:run.time;
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 // Worn roads: feathered edges instead of hard bands, no painted centre line.
 for(const road of campaignRoads(run))for(const [width,color]of [[144,'#181a181a'],[128,'#1d201e2a'],[112,'#cbb98a1c'],[96,'#d8c69424']]){
  ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();road.forEach((p,i)=>i?ctx.lineTo(p.x,p.y+GROUND):ctx.moveTo(p.x,p.y+GROUND));ctx.stroke();
 }
 if(run.areaIndex===0){
  ctx.lineWidth=26;ctx.strokeStyle='#284e4d77';ctx.beginPath();ctx.moveTo(1260,180);ctx.bezierCurveTo(1100,700,1540,1500,1260,2230);ctx.stroke();
  ctx.lineWidth=3;ctx.strokeStyle=c.stage>=2?'#c5dcd38c':'#698e8655';ctx.stroke();
  for(let i=0;i<32;i++){const y=200+i*65,x=1295+Math.sin(y/500)*70;ctx.strokeStyle='#bdd2b044';ctx.beginPath();ctx.moveTo(x-10,y+(t*8%40));ctx.lineTo(x+8,y+(t*8%40));ctx.stroke();}
 }else{
  // The map's crossing piece between the fork and the hub (the Causeway's turning bridge settles once
  // Maelin's road is done; the other crossings sway on their turntables).
  const x=1930,y=1230,crossing=kitOf(AREAS[run.areaIndex])?.pieces.crossing;
  if(crossing&&visibleAt({x,y},camera,200)){ctx.translate(x,y);ctx.rotate(run.areaIndex===1?(c.stage>=2?0:-0.38):Math.sin(t*0.25)*0.09);
   drawPiece(ctx,images,AREAS[run.areaIndex],'crossing',0,(crossing.height||156)/2,crossing.height||156,{time:run.time,reduced});}
  ctx.restore();ctx.save();
 }
 // Each road site is framed by its map's plants on a true circle just outside the zone rim.
 for(const r of c.routes){
  if(!visibleAt(r,camera,420))continue;
  for(let i=0;i<12;i++){const a=i*Math.PI/6+0.26,x=r.x+Math.cos(a)*172,y=r.y+GROUND+Math.sin(a)*172;drawPiece(ctx,images,AREAS[run.areaIndex],'foliage',x,y+14,26+(i%3)*7,{opacity:r.completed?1:0.8,variant:i});}
 }
 // Barricades are removed, never inserted around living actors.
 const barrier=kitOf(AREAS[run.areaIndex])?.pieces.barrier;
 for(const b of c.barriers)if(visibleAt(b,camera))drawPiece(ctx,images,AREAS[run.areaIndex],'barrier',b.x,b.y+22,barrier?.height||120,{time:run.time,reduced});
 ctx.restore();
}
// Captions go to `labels` when given (drawn above actors by the renderer), else straight away.
// `above` is where the caption moves when a body stands on its usual spot; prompts are kept.
function say(ctx,labels,text,x,y,tone,scale,above,keep=false){if(labels)labels.push({text,x,y,above,tone,keep});else caption(ctx,text,x,y,tone,scale);}
export function routeZone(run,r,index){
 const c=run.campaign,road='Road '+(index?'B':'A'),npc=c.npcs.find(n=>n.id===r.npc);
 if(r.completed)return {radius:ZONES.site,tone:'objective',strength:0.55,text:'Restored'};
 if(r.status==='locked'){const need=Math.max(0,campaignMilestones(run.areaIndex,run.difficulty)[0]-c.defeats);return {radius:ZONES.site,tone:'locked',strength:0.75,text:need>0?'Free '+need+' more':road};}
 if(r.status==='recovering')return {radius:ZONES.site,tone:'locked',strength:0.75,text:'Keeper returning'};
 if(r.status==='retry')return {radius:ZONES.site,tone:'objective',icon:'guide',glint:true,text:'Restart mission · F'};
 if(r.status==='active'&&r.kind==='repair')return {radius:ZONES.repair,tone:'objective',icon:'guide',glint:true,progress:r.progress,text:'Hold · '+Math.floor(r.progress*100)+'%'};
 if(r.status==='active')return {radius:ZONES.site,tone:'objective',strength:0.5,text:null,escort:npc};
 return {radius:ZONES.site,tone:'objective',icon:'guide',glint:true,text:road+' · F'};
}
export function drawCampaignObjectives(ctx,run,camera,reduced,scale,images,labels=null){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex],p=run.player,t=reduced?0:run.time;
 for(const [index,r]of c.routes.entries()){
  const zone=routeZone(run,r,index),escort=zone.escort;
  if(escort&&escort.state==='active'&&visibleAt(escort,camera,ZONES.escort)){
   // The escort keeper only walks while you stay inside this circle.
   const ex=escort.x,ey=escort.y+GROUND;
   drawDecal(ctx,ex,ey,ZONES.escort,TONES.guide,{strength:0.7,progress:r.progress,reduced,time:t,scale});
   say(ctx,labels,'Escort · '+Math.floor(r.progress*100)+'%',ex,ey+ZONES.escort+16*scale,TONES.guide,scale,ey-ZONES.escort-16*scale);
  }
  if(!visibleAt(r,camera,zone.radius+60))continue;
  const x=r.x,y=r.y+GROUND;
  drawDecal(ctx,x,y,zone.radius,TONES[zone.tone],{strength:zone.strength??1,progress:zone.progress??null,icon:zone.icon,glint:zone.glint,reduced,time:t,scale});
  if(zone.text&&(distance(p,r)<zone.radius+110||!c.choice))say(ctx,labels,zone.text,x,y+zone.radius+(zone.icon?30:16)*scale,TONES[zone.tone],scale,y-zone.radius-24*scale,/· F$/.test(zone.text));
 }
 if(c.stage<2)return;
 const event=c.event,radius=def.event.kind==='convoy'?ZONES.convoy:ZONES.gathering;if(!visibleAt(event,camera,radius+60))return;
 const x=event.x,y=event.y+GROUND;
 if(!event.complete){
  drawDecal(ctx,x,y,radius,TONES.objective,{progress:event.progress,icon:'event',glint:true,reduced,time:t,scale});
  say(ctx,labels,(def.event.kind==='convoy'?'Escort · ':'Hold · ')+Math.floor(event.progress*100)+'%',x,y+radius+30*scale,TONES.objective,scale,y-radius-24*scale,true);
 }
 ctx.save();ctx.translate(event.x,event.y);glow(ctx,0,-25,130,event.complete?'#ffdc7e33':'#a2d6d722');
 const piece=kitOf(AREAS[run.areaIndex])?.pieces.event;
 drawPiece(ctx,images,AREAS[run.areaIndex],'event',0,22+(reduced?0:Math.sin(t*3)*1.4),piece?.height||135,{time:run.time,reduced});
 ctx.restore();
}
