import {COMBAT} from '../../content/game.mjs';
import {clamp} from '../game/geometry.mjs';
import {visibleAt} from './presentation.mjs';

const TAU=Math.PI*2;
export const ENERGY={gold:'#ffd476',white:'#fff5d3',pearl:'#d8edff',amber:'#ffba65',thorn:'#b2d988',chime:'#8de5e7',eclipse:'#d3acff',danger:'#ffae94'};
export function enemyEnergy(actor){return [ENERGY.thorn,ENERGY.chime,ENERGY.eclipse][actor.areaIndex||0];}
export function actionEnvelope(remaining,duration,impact=0){
  if(!(remaining>0)||!(duration>0))return {charge:0,release:0,progress:1};
  const elapsed=clamp(duration-remaining,0,duration),progress=elapsed/duration;
  return {progress,charge:elapsed<impact?elapsed/impact:0,release:elapsed>=impact?Math.pow(1-clamp((elapsed-impact)/(duration-impact),0,1),2):0};
}
export function halo(ctx,x,y,radius,color,alpha=1){
  if(radius<=0||alpha<=0)return;
  ctx.save();ctx.globalAlpha*=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,radius);
  g.addColorStop(0,color+'88');g.addColorStop(0.35,color+'33');g.addColorStop(1,color+'00');
  ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);ctx.restore();
}
export function star(ctx,x,y,size,color,rotation=0,slender=0.24){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle=color;ctx.beginPath();
  for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?size*slender:size;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(r,0);}
  ctx.closePath();ctx.fill();ctx.restore();
}
export function grain(ctx,x,y,size,color,rotation=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
  ctx.fillStyle=color+'18';ctx.beginPath();ctx.ellipse(0,0,size*1.65,size,0,0,TAU);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(size,0);ctx.quadraticCurveTo(0,-size*0.75,-size,0);ctx.quadraticCurveTo(0,size*0.75,size,0);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#584127bb';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle=ENERGY.white+'b3';ctx.beginPath();ctx.moveTo(size*0.65,0);ctx.lineTo(0,-size*0.28);ctx.lineTo(-size*0.5,0);ctx.closePath();ctx.fill();ctx.restore();
}
export function sparks(ctx,x,y,t,color,count=12,radius=65,angle=0,spread=TAU,reduced=false){
  const total=reduced?count:count*2,progress=clamp(t,0,1),travel=1-(1-progress)**2;
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.globalAlpha*=1-progress*(reduced?1:0.55);
  for(let i=0;i<total;i++){
    const lane=i%3,lead=i%5===0,a=angle+((i+0.5)/total-0.5)*spread+Math.sin(i*2.4)*progress*0.045;
    const d=reduced?(8+radius*progress)*(0.6+i%4*0.13):(20+radius*travel)*(0.5+lane*0.22);
    const x1=x+Math.cos(a)*d,y1=y+Math.sin(a)*d,length=reduced?4+11*progress:lead?10+12*progress:5+8*progress;
    ctx.save();ctx.globalAlpha*=reduced||lead?1:0.74;ctx.lineWidth=reduced?1.6:lead?2.4:1.4;
    ctx.beginPath();ctx.moveTo(x1-Math.cos(a)*length,y1-Math.sin(a)*length);ctx.lineTo(x1,y1);ctx.stroke();
    if(!reduced)grain(ctx,x1,y1,(lead?7+lane:4+lane*0.6)*(1-progress*0.25),lead&&color===ENERGY.gold?ENERGY.white:color,a+progress*0.25);
    else if(i%3===0)star(ctx,x1,y1,3.5,color,a);
    ctx.restore();
  }ctx.restore();
}
function arc(ctx,r,start,end,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.stroke();}
function sigil(ctx,r,rotation,color,kind='sun',reduced=false){
  ctx.save();ctx.rotate(rotation);ctx.strokeStyle=color;ctx.lineWidth=1.8;
  ctx.shadowColor='#17201fe6';ctx.shadowOffsetX=1;ctx.shadowOffsetY=1;
  const count=kind==='petal'?6:kind==='thorn'?5:8;
  for(let i=0;i<(reduced?4:count);i++){
    ctx.save();ctx.rotate(i*TAU/(reduced?4:count));ctx.beginPath();
    if(kind==='petal'){ctx.moveTo(r*0.35,0);ctx.quadraticCurveTo(r,-r*0.38,r*1.15,0);ctx.quadraticCurveTo(r,r*0.38,r*0.35,0);}
    else if(kind==='thorn'){ctx.moveTo(r*0.45,0);ctx.lineTo(r,-r*0.25);ctx.lineTo(r*0.8,0);ctx.lineTo(r*1.2,0.1*r);}
    else {ctx.moveTo(r*0.64,-r*0.12);ctx.lineTo(r,0);ctx.lineTo(r*0.64,r*0.12);}
    ctx.stroke();ctx.restore();
  }
  if(!reduced){arc(ctx,r*0.55,0,TAU,color,1);arc(ctx,r*0.83,0.15,1.25,color,2);arc(ctx,r*0.83,Math.PI+0.15,Math.PI+1.25,color,2);}
  ctx.restore();
}
function chargeMotes(ctx,t,r,color,reduced){
  if(reduced)return;
  for(let i=0;i<14;i++){const a=i*TAU/14+t*0.8,d=r*(1.5-t*0.75)*(0.85+i%3*0.12);grain(ctx,Math.cos(a)*d,Math.sin(a)*d,3.5+t*2+i%3,color,a);}
}

// These layers read actor timers. They never create effects or advance simulation time.
export function drawActorEnergy(ctx,actor,kind,run,reduced,front=false){
  if(actor.hp<=0||actor.warning>0)return;
  const enemy=kind==='enemy',color=enemy?enemyEnergy(actor):kind==='companion'?ENERGY.pearl:kind==='sol'?ENERGY.amber:ENERGY.gold;
  const centerY=actor.y-(kind==='sol'?15:actor.boss?58:36);
  let envelope={charge:0,release:0},motif='sun',active=false;
  if(kind==='hero'){
    const key=actor.sunbreak>0?'sunbreak':actor.slash>0?'slash':actor.cast>0?'cast':null;
    if(key){envelope=actionEnvelope(actor[key],COMBAT[key].duration,COMBAT[key].impact);active=true;}
  }else if(kind==='companion'){
    const key=actor.mend>0?'mend':actor.cast>0?'allyCast':null;
    if(key){envelope=actionEnvelope(key==='mend'?actor.mend:actor.cast,COMBAT[key].duration,COMBAT[key].impact);active=true;motif='petal';}
  }else if(kind==='sol'&&actor.pounce>0){envelope=actionEnvelope(actor.pounce,0.55,0.33);active=true;}
  else if(enemy&&actor.spell>0){envelope=actionEnvelope(actor.spell,actor.spellDuration,actor.spellDuration*0.65);active=true;motif=actor.areaIndex===0?'thorn':actor.areaIndex===1?'petal':'sun';}
  const {charge,release}=envelope;
  ctx.save();ctx.translate(actor.x,centerY);
  if(!front){
    if(active){
      const strength=charge*0.7+release,r=actor.boss?80:kind==='hero'&&actor.sunbreak>0?52:kind==='sol'?28:42;
      if(!reduced)halo(ctx,0,0,r*1.9,color,strength*0.8);
      ctx.globalAlpha=reduced?0.55:0.3+strength*0.6;
      if(charge>0){sigil(ctx,r*(0.6+charge*0.4),reduced?0:charge*0.7,color,motif,reduced);chargeMotes(ctx,charge,r,color,reduced);}
      if(release>0){sigil(ctx,r*(1.4-release*0.4),0,color,motif,reduced);}
    }
    if(actor.ward>0&&!reduced){ctx.globalAlpha=Math.sin(Math.PI*clamp(actor.ward/0.8,0,1));sigil(ctx,kind==='sol'?38:48,0,color,'sun');}
    if(enemy&&actor.boss&&actor.phase===2){ctx.globalAlpha=reduced?0.35:0.65;sigil(ctx,96,0,color,'sun',reduced);}
    if(enemy&&actor.charge>0){
      ctx.rotate(Math.atan2(actor.chargeY,actor.chargeX));ctx.strokeStyle=ENERGY.danger;ctx.lineWidth=3;
      for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-75,side*22);ctx.quadraticCurveTo(-20,side*38,34,side*12);ctx.stroke();}
    }
    if(kind==='hero'&&actor.dash>0){
      ctx.rotate(Math.atan2(actor.faceY,actor.faceX));ctx.strokeStyle=ENERGY.gold;ctx.lineWidth=reduced?2:3;
      for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-68,side*22);ctx.quadraticCurveTo(-15,side*32,32,side*9);ctx.stroke();}
      if(!reduced){halo(ctx,-18,0,54,color,0.45);sparks(ctx,-25,0,1-actor.dash/COMBAT.dash.duration,color,6,55,Math.PI,0.7);}
    }
  }else{
    if(release>0&&!reduced){ctx.globalAlpha=release*0.7;star(ctx,(actor.faceX<0?-1:1)*28,-6,8+release*12,color,0.2);if(enemy)sparks(ctx,0,0,1-release,color,8,actor.boss?95:55);}
    if(enemy&&actor.attack>0){
      const t=1-actor.attack/actor.attackDuration;
      if(t>=0.5){const fade=(1-t)*2;ctx.rotate(Math.atan2(run.player.y-actor.y,run.player.x-actor.x));ctx.globalAlpha=fade;
        for(let i=0;i<(reduced?1:3);i++){ctx.save();ctx.translate(12+i*7,(i-1)*10);arc(ctx,actor.radius+19,-0.9+t*0.3,0.8+t*0.3,ENERGY.danger,2+fade*3);ctx.restore();}
        if(!reduced)sparks(ctx,actor.radius+12,0,(t-0.5)*2,ENERGY.danger,5,35,0,1.6);
      }
    }
    if(kind==='hero'&&actor.shield>0){
      ctx.strokeStyle=ENERGY.amber;ctx.lineWidth=2.3;ctx.globalAlpha=0.8;
      ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*TAU/6,x=Math.cos(a)*43,y=Math.sin(a)*54;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();
      if(!reduced){halo(ctx,0,0,66,ENERGY.amber,0.25);for(let i=0;i<3;i++)star(ctx,Math.cos(i*TAU/3)*40,Math.sin(i*TAU/3)*48,4,ENERGY.white);}
    }
    const hurt=kind==='hero'?actor.hurt:actor.hit;
    if(hurt>0&&!reduced){ctx.globalAlpha=Math.min(0.75,hurt*3);star(ctx,0,0,20,kind==='hero'?ENERGY.danger:ENERGY.white,0.35);}
  }
  ctx.restore();
}

export function drawProjectiles(ctx,shots,camera,reduced,areaIndex=0){
  for(const shot of shots){
    if(!visibleAt(shot,camera,100))continue;
    const color=shot.hostile?enemyEnergy({areaIndex}):shot.source==='ally'?ENERGY.pearl:shot.source==='sol'?ENERGY.amber:ENERGY.gold;
    ctx.save();ctx.translate(shot.x,shot.y-20);ctx.rotate(Math.atan2(shot.vy,shot.vx));
    const length=shot.hostile?29:shot.ally?37:48;
    if(!reduced){
      const g=ctx.createLinearGradient(-length,0,8,0);g.addColorStop(0,color+'00');g.addColorStop(1,color+'bb');ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(-length,0);ctx.quadraticCurveTo(-12,-8,8,0);ctx.quadraticCurveTo(-12,8,-length,0);ctx.fill();
      halo(ctx,0,0,shot.hostile?18:14,color,0.65);
      ctx.strokeStyle=color+'99';ctx.lineWidth=1;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-length*0.8,side*5);ctx.lineTo(-10,side*3);ctx.stroke();}
      for(let i=0;i<4;i++)grain(ctx,-length*(0.35+i*0.23),Math.sin(i*4.7+shot.x*0.012+shot.y*0.008)*(3+i*1.5),4.5-i*0.65,color,i);
      if(shot.hostile){
        ctx.strokeStyle=color;ctx.lineWidth=1.5;
        if(areaIndex===1){ctx.beginPath();ctx.ellipse(-5,0,4,10,0,0,TAU);ctx.stroke();}
        else if(areaIndex===2){star(ctx,-8,0,10,color,Math.PI/4);}
        else {for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-17,side*9);ctx.lineTo(-7,0);ctx.stroke();}}
      }
    }
    ctx.strokeStyle=color;ctx.lineWidth=shot.hostile?3:2;ctx.beginPath();ctx.moveTo(-length*0.55,0);ctx.lineTo(6,0);ctx.stroke();
    ctx.fillStyle=shot.hostile?color:ENERGY.white;ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-3,-(shot.hostile?6:3));ctx.lineTo(-7,0);ctx.lineTo(-3,shot.hostile?6:3);ctx.closePath();ctx.fill();
    if(shot.hostile){ctx.strokeStyle='#172123';ctx.lineWidth=2;ctx.stroke();}ctx.restore();
  }
}

export function drawHazardImpact(ctx,h,reduced){
  if(!h.triggered)return;
  const t=clamp(1-h.life/0.35,0,1),family=['rootfall','rootline','ring'].includes(h.kind)?'thorn':['resonance','fan'].includes(h.kind)?'chime':'eclipse',color=ENERGY[family];
  ctx.save();ctx.translate(h.x,h.y);ctx.globalAlpha=(1-t)*(reduced?0.5:0.9);
  // Both the light and the shards are clipped to the actual hazardous band.
  ctx.beginPath();ctx.arc(0,0,h.radius,0,TAU);if(h.inner){ctx.moveTo(h.inner,0);ctx.arc(0,0,h.inner,0,TAU,true);}ctx.clip('evenodd');
  if(!reduced)halo(ctx,0,0,h.radius*1.4,color,0.7);
  if(family==='chime')for(let i=0;i<3;i++){const r=(h.inner||0)+(h.radius-(h.inner||0))*(0.2+i*0.25);arc(ctx,r,0.12+t,Math.PI-0.12+t,color,reduced?2:4);arc(ctx,r,Math.PI+0.12+t,TAU-0.12+t,color,reduced?2:4);}
  const count=reduced?6:24;
  for(let i=0;i<count;i++){
    const a=i*TAU/count,r=(h.inner||0)+(h.radius-(h.inner||0))*(0.35+(i%3)*0.19);
    ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r);ctx.rotate(a);ctx.strokeStyle=color;ctx.fillStyle=color+'55';ctx.lineWidth=2;
    if(family==='eclipse'){ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(0,-(8+(1-t)*18));ctx.lineTo(12,0);ctx.lineTo(0,8);ctx.closePath();ctx.fill();ctx.stroke();}
    else if(family==='chime'){ctx.beginPath();ctx.moveTo(-3,-9);ctx.lineTo(-3,9);ctx.moveTo(3,-5);ctx.lineTo(3,5);ctx.stroke();}
    else {ctx.beginPath();ctx.moveTo(-6,8);ctx.lineTo((1-t)*32,-9);ctx.lineTo(4,-4);ctx.lineTo(-6,8);ctx.fill();ctx.stroke();}
    if(!reduced)grain(ctx,8+t*12,-8,5+i%4,color,a+t);
    ctx.restore();
  }
  ctx.restore();
}

export function drawDefeatEnergy(ctx,corpse,reduced){
  if(reduced||corpse.deathAge>0.85)return;
  const t=clamp(corpse.deathAge/0.85,0,1),color=enemyEnergy(corpse);
  ctx.save();ctx.globalAlpha=1-t;const count=corpse.boss?28:12;
  for(let i=0;i<count;i++){const x=corpse.x+Math.sin(i*9.3)*(16+t*45),y=corpse.y-15-t*(40+i%4*17);grain(ctx,x,y,(1-t*0.4)*(4+i%4),color,i+t);}
  if(corpse.boss)halo(ctx,corpse.x,corpse.y-24,90+t*60,color,(1-t)*0.6);ctx.restore();
}
