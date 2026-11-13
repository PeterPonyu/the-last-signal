import {canvasFont} from './typography.mjs';
import {drawSprite} from './sprites.mjs';
import {sampleClip} from '../game/animation.mjs';
import {visibleAt} from './presentation.mjs';
import {ENERGY,halo,star,sparks,grain} from './combat-vfx.mjs';
import {drawRadiance} from './raster-details.mjs';

const TAU=Math.PI*2;
export function ring(ctx,x,y,r,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);ctx.stroke();}
const groundKinds=new Set(['pulse','mend','impact','ward','step','restore','lantern','trail']);
export function effectLayer(kind){return groundKinds.has(kind)?'ground':'front';}
export function selectEffects(effects,camera,reduced,ground){
  const layer=ground?'ground':'front',limit=reduced?40:96,selected=[];
  for(let i=effects.length-1;i>=0&&selected.length<limit;i--){
    const fx=effects[i];
    if(fx.kind==='impact')continue; // Live hazards own their exact radius and safe center.
    if(effectLayer(fx.kind)!==layer||!visibleAt(fx,camera,310)||fx.age>=fx.life||fx.life<=0)continue;
    if(fx.kind==='trail'&&(reduced||i%3!==0)||fx.kind==='step'&&reduced)continue;
    selected.push(fx);
  }
  return selected.reverse();
}
function corona(ctx,r,t,color,reduced){
  const count=reduced?6:12;ctx.strokeStyle=color;ctx.lineWidth=2;
  for(let i=0;i<count;i++){
    ctx.save();ctx.rotate(i*TAU/count);ctx.beginPath();ctx.moveTo(r*0.62,0);
    ctx.quadraticCurveTo(r*0.83,-r*0.13,r,0);ctx.quadraticCurveTo(r*0.83,r*0.13,r*0.62,0);ctx.stroke();
    if(!reduced)star(ctx,r,0,3+4*(1-t),ENERGY.white);ctx.restore();
  }
}
function slash(ctx,t,reduced){
  const start=-1.25+t*0.6,end=1.15+t*0.6,r=90+18*t;
  if(!reduced)halo(ctx,58,0,88,ENERGY.gold,0.55);
  ctx.fillStyle=ENERGY.gold+'66';ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.arc(0,0,r-15*(1-t),end,start,true);ctx.closePath();ctx.fill();
  ctx.strokeStyle=ENERGY.white;ctx.lineWidth=3+5*(1-t);ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.stroke();
  if(!reduced){
    for(const offset of [-12,10]){ctx.strokeStyle=ENERGY.amber;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r+offset,start+0.25,end-0.2);ctx.stroke();}
    sparks(ctx,28,0,t,ENERGY.gold,10,85,0,2.5);star(ctx,Math.cos(end)*r,Math.sin(end)*r,17*(1-t)+3,ENERGY.white,end);
  }
}
function sunbreak(ctx,t,reduced){
  const reach=285,width=(reduced?15:24)*(1-t),g=ctx.createLinearGradient(0,0,reach,0);
  g.addColorStop(0,ENERGY.gold+'a8');g.addColorStop(0.3,ENERGY.gold+'77');g.addColorStop(1,ENERGY.amber+'00');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(-10,-width*0.5);ctx.quadraticCurveTo(80,-width*1.6,reach,0);ctx.quadraticCurveTo(80,width*1.6,-10,width*0.5);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#95602f88';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(reach,0);ctx.stroke();
  ctx.strokeStyle=ENERGY.white;ctx.lineWidth=2+2*(1-t);ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(reach,0);ctx.stroke();
  if(!reduced){
    halo(ctx,48,0,95,ENERGY.gold,0.4);star(ctx,42,0,24*(1-t)+5,ENERGY.white,0.3);
    for(const side of [-1,1]){ctx.strokeStyle=ENERGY.gold;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,side*12);ctx.bezierCurveTo(60,side*75*(1-t),140,side*45*(1-t),reach,0);ctx.stroke();}
    for(let i=0;i<2;i++){ctx.save();ctx.globalAlpha*=0.45;ctx.translate(100+i*85,0);ctx.scale(0.28,1);ring(ctx,0,0,(28+i*8)*(1-t),ENERGY.amber,1.5);ctx.restore();}
    sparks(ctx,38,0,t,ENERGY.gold,16,220,0,0.9);
  }
}
export function drawEffects(ctx,images,run,camera,reduced,ground,uiScale=1){
  const selected=selectEffects(run.effects,camera,reduced,ground),secondary=selected.filter(fx=>fx.kind==='hit'||fx.kind==='cover').length;
  const secondaryOpacity=Math.min(1,Math.sqrt(18/Math.max(1,secondary)));
  for(const fx of selected){
    const t=Math.max(0,fx.age/fx.life);ctx.save();ctx.globalAlpha=1-t;ctx.lineCap='round';
    if(fx.kind==='hit'||fx.kind==='cover')ctx.globalAlpha*=secondaryOpacity;
    if(['pulse','restore','lantern'].includes(fx.kind)){
      const radius=fx.kind==='restore'?230:fx.kind==='lantern'?170:210,r=radius*Math.sqrt(t);
      ctx.translate(fx.x,fx.y+22);ring(ctx,0,0,r,ENERGY.white,reduced?3:5*(1-t)+1);
      corona(ctx,r,t,ENERGY.gold,reduced);
      drawRadiance(ctx,images,'sun',0,0,radius*2.6,t,0,reduced?0.3:0.7);
      if(!reduced){halo(ctx,0,0,r+25,ENERGY.gold,0.3);ring(ctx,0,0,r*0.83,ENERGY.amber,1.5);sparks(ctx,0,0,t,ENERGY.gold,fx.kind==='lantern'?12:18,radius*0.7);}
    }else if(fx.kind==='slash'){
      drawRadiance(ctx,images,'blade',fx.x+Math.cos(fx.angle)*65,fx.y-16+Math.sin(fx.angle)*65,240,t,fx.angle,reduced?0.4:0.9);
      ctx.translate(fx.x,fx.y-16);ctx.rotate(fx.angle);slash(ctx,t,reduced);
    }else if(fx.kind==='sunbreak'){
      drawRadiance(ctx,images,'sun',fx.x+Math.cos(fx.angle)*130,fx.y-22+Math.sin(fx.angle)*130,350,t,fx.angle,reduced?0.35:0.85);
      ctx.translate(fx.x,fx.y-22);ctx.rotate(fx.angle);sunbreak(ctx,t,reduced);
    }else if(fx.kind==='mend'){
      drawRadiance(ctx,images,fx.hostile?'hostile':'mend',fx.x,fx.y-35,190,t,0,reduced?0.4:0.9);
      ctx.translate(fx.x,fx.y);ctx.save();ctx.scale(1,0.5);ring(ctx,0,30,35+40*t,ENERGY.pearl,3);corona(ctx,44+22*t,t,ENERGY.pearl,reduced);ctx.restore();
      if(!reduced){halo(ctx,0,-20,60,ENERGY.pearl,0.5);for(let i=0;i<18;i++)grain(ctx,Math.sin(i*7.2)*45,12-t*(60+i*4),4.5+i%3,ENERGY.pearl,i+t);}
    }else if(fx.kind==='ward'){
      ring(ctx,fx.x,fx.y-14,36+18*t,ENERGY.amber,reduced?2:4);
      if(!reduced)sparks(ctx,fx.x,fx.y-14,t,ENERGY.white,10,65);
    }else if(fx.kind==='trail'){
      drawSprite(ctx,images,sampleClip('heroReactions','dash',0.08),fx.x,fx.y,98,fx.faceX,(1-t)*0.27);
      ctx.strokeStyle=ENERGY.gold+'99';ctx.lineWidth=2;
      for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(fx.x-fx.faceX*45,fx.y-20+side*15);ctx.lineTo(fx.x,fx.y-20+side*10);ctx.stroke();}
    }else if(fx.kind==='step'){
      ctx.strokeStyle='#d8c19777';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(fx.x,fx.y,5+12*t,2+5*t,0,0,TAU);ctx.stroke();
    }else if(fx.kind==='guard-break'){
      ring(ctx,fx.x,fx.y,25+45*t,ENERGY.gold,3);
      if(!reduced){sparks(ctx,fx.x,fx.y-25,t,ENERGY.amber,12,85);star(ctx,fx.x,fx.y-25,25*(1-t),ENERGY.white,Math.PI/4);}
      ctx.fillStyle=ENERGY.white;ctx.font=canvasFont('small',uiScale);ctx.textAlign='center';ctx.strokeStyle='#17110f';ctx.lineWidth=4;ctx.strokeText('Guard broken',fx.x,fx.y-65-20*t);ctx.fillText('Guard broken',fx.x,fx.y-65-20*t);
    }else if(fx.kind==='contact'){
      const color=fx.hostile?ENERGY.eclipse:fx.blocked?'#bcc4c2':fx.source==='ally'?ENERGY.pearl:ENERGY.gold;
      drawRadiance(ctx,images,fx.hostile?'hostile':fx.source==='sol'?'comet':'contact',fx.x,fx.y,fx.blocked?76:125,t,fx.angle,reduced?0.5:0.95);
      if(!reduced)sparks(ctx,fx.x,fx.y,t,color,8,fx.blocked?35:58,fx.angle,Math.PI*1.25);
    }else if(fx.kind==='muzzle'){
      drawRadiance(ctx,images,fx.hostile?'hostile':fx.source==='sol'?'comet':fx.source==='ally'?'mend':'contact',fx.x+Math.cos(fx.angle)*22,fx.y+Math.sin(fx.angle)*22,fx.source==='hero'?70:95,t,fx.angle,reduced?0.4:0.8);
    }else if(fx.kind==='hit'||fx.kind==='cover'){
      const color=fx.hostile?ENERGY.chime:ENERGY.gold;
      sparks(ctx,fx.x,fx.y,t,color,reduced?3:fx.kind==='cover'?7:9,fx.kind==='cover'?30:44,0,TAU,reduced);
      if(!reduced){halo(ctx,fx.x,fx.y,36*(1-t),color,0.65);star(ctx,fx.x,fx.y,(fx.kind==='cover'?11:20)*(1-t),ENERGY.white,0.45);}
    }else if(fx.kind==='outgoing'){
      const text=(fx.absorbed?'Guard ':'')+'−'+fx.value;
      ctx.fillStyle=fx.absorbed?'#bed5d8':fx.source==='ally'?'#e1efff':'#ffe6a5';ctx.font=canvasFont('small',uiScale);ctx.textAlign='center';ctx.strokeStyle='#201b20';ctx.lineWidth=3;ctx.strokeText(text,fx.x,fx.y-30*t);ctx.fillText(text,fx.x,fx.y-30*t);
    }else if(fx.kind==='damage'){
      const y=fx.y-(fx.keeper?40*uiScale:0)-25*t;
      ctx.fillStyle='#ffd2ba';ctx.font=canvasFont('number',uiScale);ctx.textAlign='center';ctx.strokeStyle='#291b1a';ctx.lineWidth=4;ctx.strokeText('−'+fx.value,fx.x,y);ctx.fillText('−'+fx.value,fx.x,y);
    }
    ctx.restore();
  }
}
