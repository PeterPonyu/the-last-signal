import {clamp,distance} from '../game/geometry.mjs';
import {journeyTarget} from '../game/journey.mjs';
import {drawSymbol,SYMBOLS} from './symbols.mjs';
import {canvasFont} from './typography.mjs';
import {dangerGround,dangerTop,hazardShape,caption,TONES} from './decal.mjs';

export function markerLabel(ctx,kind,text,x,y,scale=1){
  ctx.save();ctx.font=canvasFont('label',scale);ctx.textAlign='left';ctx.textBaseline='middle';
  const width=ctx.measureText(text).width+44*scale,height=30*scale;
  ctx.fillStyle='#161b1aee';ctx.strokeStyle=SYMBOLS[kind].color;ctx.lineWidth=1.2*scale;
  ctx.beginPath();ctx.roundRect(x-width/2,y-height/2,width,height,5*scale);ctx.fill();ctx.stroke();
  drawSymbol(ctx,kind,x-width/2+17*scale,y,20*scale);ctx.fillStyle='#fff4dc';ctx.fillText(text,x-width/2+33*scale,y+scale);ctx.restore();
}
// Off-screen pointers name the same five steps the HUD and field guide use.
export function pointerName(target,stage=0){
  if(target.kind==='route')return target.label;
  if(target.kind==='event')return 'Gathering';
  if(target.kind==='npc')return 'Speak';
  if(target.kind==='gate')return 'Gate';
  if(target.kind==='boss')return target.rank==='champion'?'Champion':target.rank==='warden'?'Warden':'Counterattack';
  return stage>=3?'Counterattack':'Free the Hollow';
}
// Pointer labels keep out of page overlays (touch buttons, the field-guide card): reserved are
// screen rectangles {left,top,right,bottom} in view units. The label slides vertically, then
// horizontally, to the nearest free spot inside the screen margins.
export function avoidReserved(box,reserved,bounds){
  const hits=r=>box.x-box.half<r.right&&box.x+box.half>r.left&&box.y-box.h/2<r.bottom&&box.y+box.h/2>r.top;
  if(!reserved.some(hits))return {x:box.x,y:box.y};
  const fits=(x,y)=>x-box.half>=bounds.left&&x+box.half<=bounds.right&&y-box.h/2>=bounds.top&&y+box.h/2<=bounds.bottom&&!reserved.some(r=>x-box.half<r.right&&x+box.half>r.left&&y-box.h/2<r.bottom&&y+box.h/2>r.top);
  const options=[];
  for(const r of reserved){options.push({x:box.x,y:r.top-box.h/2-6},{x:box.x,y:r.bottom+box.h/2+6},{x:r.left-box.half-6,y:box.y},{x:r.right+box.half+6,y:box.y});}
  const free=options.filter(o=>fits(o.x,o.y)).sort((a,b)=>Math.hypot(a.x-box.x,a.y-box.y)-Math.hypot(b.x-box.x,b.y-box.y));
  return free[0]||{x:box.x,y:box.y};
}
export function drawObjectivePointer(ctx,run,camera,width,height,scale,reserved=[]){
  const targets=run.campaign.stage===1&&!run.campaign.choice?run.campaign.routes.map((r,i)=>({...r,kind:'route',label:'Road '+(i?'B':'A')})):[journeyTarget(run)];
  for(const target of targets){if(!target)continue;
  const x=target.x-camera.x,y=target.y-camera.y;
  if(target.kind==='boss'&&x+145>0&&x-145<width&&y+35>0&&y-250<height)continue;
  if(x>=45&&x<=width-45&&y>=100&&y<=height-45)continue;
  const kind=['npc','route'].includes(target.kind)?'guide':target.kind==='boss'?'boss':target.kind==='gate'?'gate':target.kind==='event'?'event':'slash';
  const named={...target,label:target.kind==='route'&&!/^Road [AB]$/.test(target.label||'')?'Keeper':target.label,rank:target.boss?target.bossRank:null};
  const text=pointerName(named,run.campaign.stage)+' · '+Math.round(distance(target,run.player)/10)+'m';
  ctx.font=canvasFont('label',scale);
  const half=(ctx.measureText(text).width+44*scale)/2;
  const placed=avoidReserved({x:clamp(x,half+16,width-half-16),y:clamp(y,145*scale,height-160*scale),half,h:30*scale},reserved,{left:16,top:8,right:width-16,bottom:height-8}),px=placed.x,py=placed.y;
  const angle=Math.atan2(y-py,x-px),radius=half+15*scale;
  ctx.save();ctx.translate(px,py);ctx.rotate(angle);ctx.fillStyle=SYMBOLS[kind].color;ctx.strokeStyle='#161b1aee';ctx.lineWidth=2*scale;ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(radius-6*scale,-8*scale);ctx.lineTo(radius+6*scale,0);ctx.lineTo(radius-6*scale,8*scale);ctx.lineTo(radius-2*scale,0);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();
  markerLabel(ctx,kind,text,px,py,scale);
  }
}
// Danger zones in two passes: the ground layer (tint, timing fill, family band, kind detail)
// under actors, and the boundary and small icon above them so bodies never hide an edge.
// o: {areaIndex,time,reduced,hazards,owner}
export function drawDanger(ctx,h,scale=1,o={}){dangerGround(ctx,h,{...o,scale});}
export function drawDangerOutline(ctx,h,scale=1,o={}){
  dangerTop(ctx,h,{...o,scale});
  if(h.anchorHp>0&&!h.triggered){const {x,y}=hazardShape(h);caption(ctx,'Break the anchor',x,y-84,TONES.danger,scale);}
}
