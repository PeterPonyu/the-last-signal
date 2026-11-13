import {clamp,distance} from '../game/geometry.mjs';
import {journeyTarget} from '../game/journey.mjs';
import {drawSymbol,SYMBOLS} from './symbols.mjs';
import {canvasFont} from './typography.mjs';

export function markerLabel(ctx,kind,text,x,y,scale=1){
  ctx.save();ctx.font=canvasFont('label',scale);ctx.textAlign='left';ctx.textBaseline='middle';
  const width=ctx.measureText(text).width+44*scale,height=30*scale;
  ctx.fillStyle='#161b1aee';ctx.strokeStyle=SYMBOLS[kind].color;ctx.lineWidth=1.2*scale;
  ctx.beginPath();ctx.roundRect(x-width/2,y-height/2,width,height,5*scale);ctx.fill();ctx.stroke();
  drawSymbol(ctx,kind,x-width/2+17*scale,y,20*scale);ctx.fillStyle='#fff4dc';ctx.fillText(text,x-width/2+33*scale,y+scale);ctx.restore();
}
export function drawObjectivePointer(ctx,run,camera,width,height,scale){
  const targets=run.campaign.stage===1&&!run.campaign.choice?run.campaign.routes.map((r,i)=>({...r,kind:'route',label:'Road '+(i?'B':'A')})):[journeyTarget(run)];
  for(const target of targets){if(!target)continue;
  const x=target.x-camera.x,y=target.y-camera.y;
  if(target.kind==='boss'&&x+145>0&&x-145<width&&y+35>0&&y-250<height)continue;
  if(x>=45&&x<=width-45&&y>=100&&y<=height-45)continue;
  const kind=['npc','route'].includes(target.kind)?'guide':target.kind==='boss'?'boss':target.kind==='gate'?'gate':'beacon';
  const text=(target.kind==='route'?target.label+' · ':target.kind==='event'?'Gathering · ':target.kind==='battle'?'Encounter · ':kind==='guide'?'Speak · ':kind==='gate'?'Exit · ':kind==='boss'?'Warden · ':'Beacon · ')+Math.round(distance(target,run.player)/10)+'m';
  ctx.font=canvasFont('label',scale);
  const half=(ctx.measureText(text).width+44*scale)/2;
  const px=clamp(x,half+16,width-half-16),py=clamp(y,145*scale,height-160*scale);
  const angle=Math.atan2(y-py,x-px),radius=half+15*scale;
  ctx.save();ctx.translate(px,py);ctx.rotate(angle);ctx.strokeStyle=SYMBOLS[kind].color;ctx.lineWidth=3*scale;
  ctx.beginPath();ctx.moveTo(radius-8,-7*scale);ctx.lineTo(radius+2,0);ctx.lineTo(radius-8,7*scale);ctx.stroke();ctx.restore();
  markerLabel(ctx,kind,text,px,py,scale);
  }
}
export function drawDanger(ctx,h,scale=1){
  ctx.save();ctx.beginPath();ctx.arc(h.x,h.y,h.radius,0,Math.PI*2);
  if(h.inner){ctx.moveTo(h.x+h.inner,h.y);ctx.arc(h.x,h.y,h.inner,0,Math.PI*2,true);}
  ctx.fillStyle=h.warning>0?'#d75f4838':'#e9815740';ctx.fill('evenodd');
  ctx.save();ctx.clip('evenodd');ctx.strokeStyle=h.warning>0?'#ffa48677':'#ffa48633';ctx.lineWidth=2;
  for(let offset=-h.radius*2;offset<h.radius*2;offset+=20){ctx.beginPath();ctx.moveTo(h.x-h.radius,h.y+offset);ctx.lineTo(h.x+h.radius,h.y+offset+h.radius*2);ctx.stroke();}ctx.restore();
  ctx.restore();drawDangerOutline(ctx,h,scale);if(h.anchorHp>0){ctx.save();ctx.fillStyle='#bda584';ctx.strokeStyle='#ffbd9e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(h.x,h.y-66);ctx.lineTo(h.x+17,h.y-40);ctx.lineTo(h.x,h.y);ctx.lineTo(h.x-17,h.y-40);ctx.closePath();ctx.fill();ctx.stroke();ctx.font=canvasFont('small',scale);ctx.fillStyle='#fff2d2';ctx.textAlign='center';ctx.fillText('Break the anchor',h.x,h.y-78);ctx.restore();}
}
export function drawDangerOutline(ctx,h,scale=1){
  ctx.save();ctx.beginPath();ctx.arc(h.x,h.y,h.radius,0,Math.PI*2);if(h.inner){ctx.moveTo(h.x+h.inner,h.y);ctx.arc(h.x,h.y,h.inner,0,Math.PI*2,true);}
  ctx.strokeStyle='#38212299';ctx.lineWidth=4;ctx.stroke();
  ctx.strokeStyle='#ffb49c';ctx.lineWidth=2.5;ctx.setLineDash([9,6]);ctx.stroke();ctx.setLineDash([]);
  const y=h.y-(h.inner?(h.radius+h.inner)/2:0);
  ctx.fillStyle='#281c1ee6';ctx.beginPath();ctx.roundRect(h.x-15*scale,y-15*scale,30*scale,30*scale,6*scale);ctx.fill();
  drawSymbol(ctx,'danger',h.x,y,22*scale);ctx.restore();
}
