import {COMBAT} from '../../content/game.mjs';
import {clamp} from '../game/geometry.mjs';
import {visibleAt} from './presentation.mjs';
import {ACCENT,FAMILIES,DANGER,TONES,GROUND,alpha,glyph,glyphRing,drawGlyph,drawDecal,drawPortal,drawWedge,wedgeRim,drawLane,drawChannel,lightPillar,hazardShape,hazardFamily,fillProgress,meleeWindup,spellWindup,strikePulse} from './decal.mjs';

const TAU=Math.PI*2;
// Friendly shape languages: Zeyu gold blade arcs and sun rays, Dawnweaver pearl petals and moon
// crescents, Sol amber comets and sparks. Map accents only ever decorate enemy work.
export const ENERGY={gold:'#ffd476',white:'#fff5d3',pearl:'#d8edff',amber:'#ffba65',...ACCENT,danger:DANGER.light};
export function enemyEnergy(actor){return ACCENT[FAMILIES[actor.areaIndex||0]]||ACCENT.thorn;}
export function enemyFamily(actor,areaIndex=0){return FAMILIES[actor?.areaIndex??areaIndex]||FAMILIES[areaIndex]||'thorn';}
export function actionEnvelope(remaining,duration,impact=0){
  if(!(remaining>0)||!(duration>0))return {charge:0,release:0,progress:1};
  const elapsed=clamp(duration-remaining,0,duration),progress=elapsed/duration;
  return {progress,charge:elapsed<impact?elapsed/impact:0,release:elapsed>=impact?Math.pow(1-clamp((elapsed-impact)/(duration-impact),0,1),2):0};
}
const ease=t=>1-(1-clamp(t,0,1))**3;
export function halo(ctx,x,y,radius,color,strength=1){
  if(radius<=0||strength<=0)return;
  const g=ctx.createRadialGradient(x,y,0,x,y,radius);
  g.addColorStop(0,alpha(color,0.53*strength));g.addColorStop(0.35,alpha(color,0.2*strength));g.addColorStop(1,alpha(color,0));
  ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
}
export function star(ctx,x,y,size,color,rotation=0,slender=0.24){
  ctx.beginPath();
  for(let i=0;i<8;i++){const a=rotation+i*Math.PI/4,r=i%2?size*slender:size;i?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
// A batched burst: `count` shapes flung from (x,y) along `angle` +- spread/2, one fill call.
export function burst(ctx,x,y,t,color,count=8,radius=50,angle=0,spread=TAU,shape='spark',size=5){
  const k=clamp(t,0,1),travel=ease(k);if(k>=1)return;
  ctx.beginPath();
  for(let i=0;i<count;i++){
    const a=angle+((i+0.5)/count-0.5)*spread+Math.sin(i*2.4)*0.12,d=radius*travel*(0.55+0.45*((i*0.618)%1));
    glyph(ctx,shape,x+Math.cos(a)*d,y+Math.sin(a)*d,a,size*(1-k*0.7)*(0.7+0.3*(i%3)/2));
  }
  ctx.fillStyle=alpha(color,1-k*0.85);ctx.fill();
}
// A soft light band at radius r (never a hard stroke).
export function softRing(ctx,x,y,r,width,color,strength=1){
  if(r<=0||strength<=0)return;
  const inner=Math.max(0,r-width),g=ctx.createRadialGradient(x,y,inner,x,y,r+width*0.35);
  g.addColorStop(0,alpha(color,0));g.addColorStop(0.62,alpha(color,0.75*strength));g.addColorStop(1,alpha(color,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r+width*0.35,0,TAU);if(inner>0){ctx.moveTo(x+inner,y);ctx.arc(x,y,inner,0,TAU,true);}ctx.fill('evenodd');
}
// A tapered ray from (x0,y0) to (x1,y1), width w0 at the root narrowing to w1.
export function taper(ctx,x0,y0,x1,y1,w0,w1){
  const a=Math.atan2(y1-y0,x1-x0),nx=-Math.sin(a),ny=Math.cos(a);
  ctx.moveTo(x0+nx*w0/2,y0+ny*w0/2);ctx.lineTo(x1+nx*w1/2,y1+ny*w1/2);ctx.lineTo(x1-nx*w1/2,y1-ny*w1/2);ctx.lineTo(x0-nx*w0/2,y0-ny*w0/2);ctx.closePath();
}
// A crescent band along radius r from a0 to a1 whose thickness tapers from w0 to w1.
export function crescent(ctx,x,y,r,a0,a1,w0,w1,steps=14){
  for(let i=0;i<=steps;i++){const t=i/steps,a=a0+(a1-a0)*t,w=w0+(w1-w0)*t,px=x+Math.cos(a)*(r+w/2),py=y+Math.sin(a)*(r+w/2);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
  for(let i=steps;i>=0;i--){const t=i/steps,a=a0+(a1-a0)*t,w=w0+(w1-w0)*t;ctx.lineTo(x+Math.cos(a)*(r-w/2),y+Math.sin(a)*(r-w/2));}
  ctx.closePath();
}

/* ---------- Party energy (reads timers only; never creates effects) ---------- */
function sunSigil(ctx,x,y,r,k,reduced,time){
  // Zeyu: sun rays drawn in toward the body while a heavy blow gathers.
  ctx.beginPath();const rays=reduced?8:12;
  for(let i=0;i<rays;i++){const a=i*TAU/rays+(reduced?0:time*0.6),inner=r*(0.55+0.25*(1-k)),outer=r*(1.05+0.35*(1-k));taper(ctx,x+Math.cos(a)*outer,y+Math.sin(a)*outer,x+Math.cos(a)*inner,y+Math.sin(a)*inner,5,1);}
  ctx.fillStyle=alpha(ENERGY.gold,0.35+0.5*k);ctx.fill();
  if(!reduced){ctx.beginPath();for(let i=0;i<10;i++){const a=i*TAU/10+time*1.3,d=r*(1.6-k*1.1)*(0.85+(i%3)*0.1);glyph(ctx,'spark',x+Math.cos(a)*d,y+Math.sin(a)*d,a+Math.PI,4+3*k);}ctx.fillStyle=alpha(ENERGY.white,0.85);ctx.fill();}
}
function moonSigil(ctx,x,y,r,k,reduced,time){
  // Dawnweaver: moon crescents circle in while petals gather.
  const turn=reduced?0:time*0.9;ctx.beginPath();
  for(let i=0;i<6;i++){const a=turn+i*TAU/6,d=r*(1.25-0.35*k);glyph(ctx,'eclipse',x+Math.cos(a)*d,y+Math.sin(a)*d*0.8,a,6+4*k);}
  ctx.fillStyle=alpha(ENERGY.pearl,0.45+0.45*k);ctx.fill();
  if(!reduced){ctx.beginPath();for(let i=0;i<9;i++){const a=-turn*1.4+i*TAU/9,d=r*(0.5+0.9*(1-k));glyph(ctx,'petal',x+Math.cos(a)*d,y+Math.sin(a)*d*0.8,a+1.2,4+2*k);}ctx.fillStyle=alpha(ENERGY.white,0.75);ctx.fill();}
}
function cometSigil(ctx,x,y,r,k,reduced,time){
  // Sol: amber comets orbit and sparks gather.
  const turn=reduced?0:time*2.4;ctx.beginPath();
  for(let i=0;i<3;i++){const a=turn+i*TAU/3,hx=x+Math.cos(a)*r,hy=y+Math.sin(a)*r*0.7,tx=x+Math.cos(a-0.7)*r,ty=y+Math.sin(a-0.7)*r*0.7;taper(ctx,tx,ty,hx,hy,1,5+2*k);ctx.moveTo(hx+3.5,hy);ctx.arc(hx,hy,3.5,0,TAU);}
  ctx.fillStyle=alpha(ENERGY.amber,0.5+0.45*k);ctx.fill();
  if(!reduced)burst(ctx,x,y,1-k,ENERGY.white,7,r*1.3,turn,TAU,'spark',4);
}
// Sol's ward around a body: a soft amber shell (no outline) with three comets running on it.
function wardShell(ctx,x,y,rx,ry,color,reduced,time,strength=1){
  const g=ctx.createRadialGradient(x,y,Math.min(rx,ry)*0.55,x,y,Math.max(rx,ry));
  g.addColorStop(0,alpha(color,0));g.addColorStop(0.72,alpha(color,0.12*strength));g.addColorStop(0.93,alpha(color,0.38*strength));g.addColorStop(1,alpha(color,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();
  const turn=reduced?0.6:time*2.2;ctx.beginPath();
  for(let i=0;i<3;i++){
    const a=turn+i*TAU/3,steps=7,tail=0.9;
    for(let k=0;k<=steps;k++){const b=a-tail*k/steps,w=4.5*(1-k/steps)+0.4;const px=x+Math.cos(b)*(rx+w),py=y+Math.sin(b)*(ry+w);k?ctx.lineTo(px,py):ctx.moveTo(px,py);}
    for(let k=steps;k>=0;k--){const b=a-tail*k/steps,w=4.5*(1-k/steps)+0.4;ctx.lineTo(x+Math.cos(b)*(rx-w),y+Math.sin(b)*(ry-w));}
    ctx.closePath();
  }
  ctx.fillStyle=alpha(color,0.85*strength);ctx.fill();
  ctx.beginPath();for(let i=0;i<3;i++){const a=turn+i*TAU/3;glyph(ctx,'cosmos',x+Math.cos(a)*rx,y+Math.sin(a)*ry,a,6);}
  ctx.fillStyle=alpha(ENERGY.white,strength);ctx.fill();
}
export function drawActorEnergy(ctx,actor,kind,run,reduced,front=false){
  if(actor.hp<=0||actor.warning>0)return;
  if(kind==='enemy'){enemyLayer(ctx,actor,run,reduced,front);return;}
  const time=run?.time||0,cy=actor.y-(kind==='sol'?15:36),face=actor.faceX<0?-1:1,hand={x:actor.x+face*24,y:cy-4};
  let envelope={charge:0,release:0},key=null;
  if(kind==='hero'){key=actor.solarLance>0?'solarLance':actor.sunbreak>0?'sunbreak':actor.slash>0?'slash':null;if(key)envelope=actionEnvelope(actor[key],COMBAT[key].duration,COMBAT[key].impact);}
  else if(kind==='companion'){key=actor.nova>0?'lunarNova':actor.mend>0?'mend':actor.cast>0?'allyCast':null;if(key)envelope=actionEnvelope(key==='lunarNova'?actor.nova:key==='mend'?actor.mend:actor.cast,COMBAT[key].duration,COMBAT[key].impact);}
  else if(kind==='sol'&&(actor.volley>0||actor.pounce>0)){const volley=actor.volley>0;key=volley?'solVolley':'pounce';envelope=actionEnvelope(volley?actor.volley:actor.pounce,volley?COMBAT.solVolley.duration:0.55,volley?COMBAT.solVolley.impact:0.33);}
  const {charge,release}=envelope;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(!front){
    if(charge>0){
      if(key==='sunbreak'){halo(ctx,actor.x,cy,95,ENERGY.gold,charge*0.55);sunSigil(ctx,actor.x,cy,52,charge,reduced,time);}
      else if(key==='solarLance'){halo(ctx,hand.x,hand.y,60,ENERGY.gold,charge*0.7);sunSigil(ctx,hand.x,hand.y,26,charge,reduced,time);star(ctx,hand.x,hand.y,8+14*charge,ENERGY.white,time*2);}
      else if(key==='slash'){ctx.beginPath();crescent(ctx,actor.x,cy,46,face>0?-2.4:Math.PI+2.4-1.3,face>0?-1.1:Math.PI+1.1,1,6*charge);ctx.fillStyle=alpha(ENERGY.gold,0.4+0.5*charge);ctx.fill();}
      else if(key==='lunarNova'){halo(ctx,actor.x,cy,90,ENERGY.pearl,charge*0.5);moonSigil(ctx,actor.x,cy,58,charge,reduced,time);}
      else if(key==='mend'){moonSigil(ctx,actor.x,cy,36,charge,reduced,time);}
      else if(key==='allyCast'){ctx.beginPath();glyph(ctx,'eclipse',hand.x,hand.y-14,-Math.PI/2,5+5*charge);ctx.fillStyle=alpha(ENERGY.pearl,0.5+0.5*charge);ctx.fill();}
      else if(kind==='sol'){cometSigil(ctx,actor.x,cy,key==='solVolley'?34:24,charge,reduced,time);}
    }
    if(actor.ward>0){const k=Math.sin(Math.PI*clamp(actor.ward/0.8,0,1));if(kind==='companion')moonSigil(ctx,actor.x,cy,44,k,reduced,time);else if(kind==='sol')cometSigil(ctx,actor.x,cy,30,k,reduced,time);}
    if(kind==='hero'&&actor.dash>0){
      const a=Math.atan2(actor.faceY||0,actor.faceX||1),c=Math.cos(a),n=Math.sin(a),k=actor.dash/COMBAT.dash.duration;
      ctx.beginPath();for(const side of [-1,0,1])taper(ctx,actor.x-c*(70+side*side*10)-n*side*18,cy-n*(70+side*side*10)+c*side*18,actor.x+c*10-n*side*8,cy+n*10+c*side*8,1,side?4:7);
      ctx.fillStyle=alpha(ENERGY.gold,0.55*k+0.2);ctx.fill();
      if(!reduced)burst(ctx,actor.x-c*20,cy-n*20,1-k,ENERGY.white,6,50,a+Math.PI,0.8,'spark',5);
    }
  }else{
    if(release>0&&!reduced){
      if(kind==='hero')star(ctx,hand.x,hand.y,6+12*release,alpha(ENERGY.white,release),0.2);
      else if(kind==='companion'){ctx.beginPath();glyph(ctx,'eclipse',hand.x,hand.y-10,-Math.PI/2,6+8*release);ctx.fillStyle=alpha(ENERGY.white,release);ctx.fill();}
      else burst(ctx,actor.x+face*16,cy,1-release,ENERGY.amber,6,30,face>0?0:Math.PI,1.2,'spark',5);
    }
    if(kind==='hero'&&actor.shield>0)wardShell(ctx,actor.x,cy+4,40,56,ENERGY.amber,reduced,time,clamp(actor.shield/18,0.45,1));
    if(kind==='hero'&&actor.hurt>0&&!reduced)star(ctx,actor.x,cy,8+10*actor.hurt/COMBAT.hurt.duration,alpha(DANGER.light,0.8),0.35);
  }
  ctx.restore();
}

/* ---------- Enemy and boss layers ---------- */
function bossCenter(e){return e.y-(e.bossRank==='champion'?62:88);}
function shellSize(e){return e.bossRank==='champion'?[62,90]:[80,122];}
function platePath(ctx,cx,cy,rx,ry,i,plates,shrink=0){
  const a0=-Math.PI/2+i*TAU/plates+0.08+shrink,a1=a0+TAU/plates-0.16-shrink*2;
  ctx.moveTo(cx+Math.cos(a0)*rx,cy+Math.sin(a0)*ry);ctx.ellipse(cx,cy,rx,ry,0,a0,a1);ctx.ellipse(cx,cy,rx*0.86,ry*0.88,0,a1,a0,true);ctx.closePath();
}
// Guard while up: themed plates around the body; lit plates show how much guard is left.
// Enraged (the guard held too long): the plates run hot with a fast danger beat - break it now.
export function enrageBeat(enraged,time,reduced){return enraged?(reduced?1:0.5+0.5*Math.sin(time*TAU*3.2)):0;}
function guardShell(ctx,e,family,reduced,time){
  const cx=e.x,cy=bossCenter(e),[rx,ry]=shellSize(e),plates=8,accent=ACCENT[family]||ENERGY.gold;
  const lit=Math.ceil(plates*clamp((e.guardHp??e.guardMax)/(e.guardMax||1),0,1)),rage=enrageBeat(!!e.enraged,time,reduced);
  const shimmer=reduced?-1:Math.floor(time*(e.enraged?7:2.5))%plates;
  if(e.enraged){halo(ctx,cx,cy,rx*1.5,DANGER.hot,0.3+0.3*rage);}
  ctx.beginPath();for(let i=0;i<plates;i++)if(i<lit&&i!==shimmer)platePath(ctx,cx,cy,rx,ry,i,plates);
  ctx.fillStyle=e.enraged?alpha(DANGER.hot,0.28+0.2*rage):alpha(accent,0.26);ctx.fill();
  if(e.enraged){ctx.strokeStyle=alpha(DANGER.dark,0.8);ctx.lineWidth=4;ctx.stroke();}
  ctx.strokeStyle=e.enraged?(rage>0.5?DANGER.core:DANGER.light):alpha(accent,0.9);ctx.lineWidth=e.enraged?2.2:1.6;ctx.stroke();
  if(shimmer>=0&&shimmer<lit){ctx.beginPath();platePath(ctx,cx,cy,rx,ry,shimmer,plates);ctx.fillStyle=alpha(ENERGY.white,0.45);ctx.fill();ctx.strokeStyle=ENERGY.white;ctx.stroke();}
  if(lit<plates){ctx.beginPath();for(let i=lit;i<plates;i++)platePath(ctx,cx,cy,rx,ry,i,plates,0.05);ctx.strokeStyle=alpha(accent,0.22);ctx.lineWidth=1;ctx.stroke();}
  ctx.beginPath();for(let i=0;i<lit;i++){const a=-Math.PI/2+(i+0.5)*TAU/plates;glyph(ctx,family,cx+Math.cos(a)*rx*0.93,cy+Math.sin(a)*ry*0.94,a,4.2);}
  ctx.fillStyle=alpha(ENERGY.white,0.9);ctx.fill();
}
// Guard break (Tier L): the plates shatter outward with a flash, then the Warden reels.
function guardBreak(ctx,e,family,t,reduced){
  const cx=e.x,cy=bossCenter(e),[rx,ry]=shellSize(e),accent=ACCENT[family]||ENERGY.gold,k=ease(t);
  halo(ctx,cx,cy,150*(0.6+0.4*k),ENERGY.white,(1-t)*0.8);
  softRing(ctx,cx,cy,rx+130*k,26,accent,1-t);
  if(!reduced){
    ctx.beginPath();
    for(let i=0;i<16;i++){const a=-Math.PI/2+(i+0.5)*TAU/16,d=1+0.9*k*(0.7+(i%3)*0.15);glyph(ctx,'shard',cx+Math.cos(a)*rx*d,cy+Math.sin(a)*ry*d,a+t*(i%2?2:-2),(10-4*t)*(1-t*0.5));}
    ctx.fillStyle=alpha(accent,1-t);ctx.fill();ctx.strokeStyle=alpha(ENERGY.white,0.85*(1-t));ctx.lineWidth=1.2;ctx.stroke();
  }
  star(ctx,cx,cy,70*(1-t)**2+6,alpha(ENERGY.white,1-t),Math.PI/4,0.18);
}
// Exposed: a cracked, dimmed shell and dazed stars over the head.
function exposedLook(ctx,e,family,reduced,time){
  const cx=e.x,cy=bossCenter(e),[rx,ry]=shellSize(e),accent=ACCENT[family]||ENERGY.gold,top=e.y-(e.bossRank==='champion'?172:226);
  ctx.beginPath();for(let i=0;i<8;i+=2)platePath(ctx,cx,cy,rx,ry,i,8,0.1);ctx.strokeStyle=alpha(accent,0.3);ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();
  for(let i=0;i<4;i++){const a=i*TAU/4+0.5;let px=cx+Math.cos(a)*rx*0.35,py=cy+Math.sin(a)*ry*0.3;ctx.moveTo(px,py);for(let k=1;k<=3;k++){px+=Math.cos(a+(k%2?0.5:-0.5))*rx*0.2;py+=Math.sin(a+(k%2?0.5:-0.5))*ry*0.18;ctx.lineTo(px,py);}}
  ctx.strokeStyle=alpha(ENERGY.white,0.42);ctx.lineWidth=1.6;ctx.stroke();
  const turn=reduced?0.4:time*4.2;ctx.beginPath();
  for(let i=0;i<3;i++){const a=turn+i*TAU/3;glyph(ctx,'cosmos',cx+Math.cos(a)*30,top+Math.sin(a)*9,0,6.5);}
  ctx.fillStyle=ENERGY.white;ctx.fill();
}
// Phase change (Tier L): gather the family glyphs into the body, then release them as rays.
function phaseBurst(ctx,e,family,elapsed,reduced,time){
  const cx=e.x,cy=bossCenter(e),accent=ACCENT[family]||ENERGY.gold;
  if(elapsed<0.75){
    const k=elapsed/0.75;halo(ctx,cx,cy,120,accent,0.25+0.45*k);
    glyphRing(ctx,family,cx,cy,170-100*k,16,5+3*k,alpha(accent,0.5+0.5*k),reduced?0:time*2);
    if(!reduced){ctx.beginPath();for(let i=0;i<12;i++){const a=i*TAU/12+time,d=(1-((time*1.2+i/12)%1))*190;glyph(ctx,'spark',cx+Math.cos(a)*d,cy+Math.sin(a)*d,a+Math.PI,5);}ctx.fillStyle=alpha(ENERGY.white,0.8);ctx.fill();}
  }else{
    const t=clamp((elapsed-0.75)/0.35,0,1),k=ease(t);
    halo(ctx,cx,cy,170,ENERGY.white,(1-t)*0.7);softRing(ctx,cx,cy,70+180*k,30,accent,1-t);
    ctx.beginPath();for(let i=0;i<12;i++){const a=i*TAU/12+0.13;taper(ctx,cx+Math.cos(a)*40,cy+Math.sin(a)*40,cx+Math.cos(a)*(90+170*k),cy+Math.sin(a)*(90+170*k),12*(1-t)+2,1);}
    ctx.fillStyle=alpha(accent,0.85*(1-t));ctx.fill();
    if(!reduced)glyphRing(ctx,family,cx,cy,70+150*k,16,6*(1-t)+2,alpha(ENERGY.white,1-t));
  }
}
function enemyLayer(ctx,e,run,reduced,front){
  const family=enemyFamily(e,run?.areaIndex),accent=ACCENT[family]||ENERGY.danger,time=run?.time||0,cy=e.boss?bossCenter(e):e.y-36;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(!front){
    if(e.spell>0){const w=spellWindup(e.spell,e.spellDuration);if(w)halo(ctx,e.x,cy,e.boss?110:52,accent,0.35+0.45*w.fill*(1-w.after));}
    if(e.boss&&e.phase===2&&!(e.phaseShift>0))glyphRing(ctx,family,e.x,cy,e.bossRank==='champion'?80:100,18,4.5,alpha(accent,reduced?0.4:0.62),reduced?0:time*0.35);
    if(e.boss&&e.phaseShift>0)phaseBurst(ctx,e,family,clamp(1.1-e.phaseShift,0,1.1),reduced,time);
    if(e.boss&&e.attackKind==='slam'&&e.attack>0&&e.attackDuration>0){
      const p=clamp(1-e.attack/e.attackDuration,0,1);
      if(p<0.8){const k=p/0.8;halo(ctx,e.x,cy,90+40*k,DANGER.hot,0.25+0.5*k);
        if(!reduced){ctx.beginPath();for(let i=0;i<12;i++){const a=i*TAU/12+time*0.7,d=(1-((time*1.5+i/12)%1))*150+20;glyph(ctx,family,e.x+Math.cos(a)*d,cy+Math.sin(a)*d*0.8,a+Math.PI,4.5);}ctx.fillStyle=alpha(accent,0.9);ctx.fill();}}
    }
    if(e.charge>0){
      const a=Math.atan2(e.chargeY,e.chargeX),c=Math.cos(a),n=Math.sin(a);ctx.beginPath();
      for(const side of [-1,0,1])taper(ctx,e.x-c*(80-Math.abs(side)*14)-n*side*20,cy-n*(80-Math.abs(side)*14)+c*side*20,e.x+c*20-n*side*9,cy+n*20+c*side*9,1,side?4:6);
      ctx.fillStyle=alpha(DANGER.light,0.75);ctx.fill();
    }
  }else{
    if(e.spell>0&&!reduced){const w=spellWindup(e.spell,e.spellDuration);if(w&&w.after>0)burst(ctx,e.x,cy,w.after,accent,8,e.boss?90:50,0,TAU,family==='generic'?'spark':family,5);}
    if(e.attack>0&&e.attackKind!=='slam'){
      const w=meleeWindup(e.attack,e.attackDuration);
      if(w&&w.strike>0){
        // The strike itself: a claw smear in the danger palette toward the swing.
        const target=e.focusId&&e.focusId!=='hero'?run?.campaign?.npcs?.find(n=>n.id===e.focusId):run?.player,a=target?Math.atan2(target.y-e.y,target.x-e.x):(e.faceX<0?Math.PI:0),fade=1-w.strike;
        ctx.beginPath();for(let i=0;i<(reduced?1:3);i++)crescent(ctx,e.x+Math.cos(a)*(8+i*6),cy+Math.sin(a)*(8+i*6)+(i-1)*9,e.radius+16,a-0.85+w.strike*0.4,a+0.6+w.strike*0.4,1,7*fade);
        ctx.fillStyle=alpha(DANGER.light,0.9*fade);ctx.fill();
      }
    }
    if(e.guardMax>0){
      const exposedFor=e.exposedFor||0,elapsed=exposedFor-(e.exposed||0);
      if(e.guardUp)guardShell(ctx,e,family,reduced,time);
      else if(e.exposed>0){exposedLook(ctx,e,family,reduced,time);if(elapsed<0.7)guardBreak(ctx,e,family,elapsed/0.7,reduced);}
    }
  }
  ctx.restore();
}
// Ground telegraphs for one enemy (drawn under actors): arrival portal, melee wedge, charge lane,
// spell channel with its aim lane, and the gold opening under an exposed Warden.
// o: {reduced,time,warningScale,target}
export function enemyTelegraph(ctx,e,run,o={}){
  const family=enemyFamily(e,run.areaIndex),x=e.x,y=e.y+GROUND,time=o.time??run.time,reduced=!!o.reduced,scale=o.warningScale||1;
  if(e.warning>0){drawPortal(ctx,x,y,e.boss?(e.bossRank==='champion'?78:96):Math.max(30,(e.radius||18)+14),fillProgress(e.warning,1.2*scale),{family,time,reduced,big:!!e.boss});return;}
  // Gold is opportunity: the window drains back to the centre as the Warden recovers.
  if(e.exposed>0&&e.exposedFor>0)drawDecal(ctx,x,y,(e.radius||42)+70,TONES.objective,{progress:clamp(e.exposed/e.exposedFor,0,1),strength:0.72,glint:true,reduced,time});
  if(e.attack>0&&e.attackKind!=='slam'){
    const w=meleeWindup(e.attack,e.attackDuration),target=o.target||run.player;
    if(w)drawWedge(ctx,x,y,Math.atan2(target.y-e.y,target.x-e.x),(e.radius||18)+34,0.62,w.fill,{family,strike:w.strike,beat:strikePulse(w.fill,time,reduced)});
  }
  if(e.chargeWarning>0||e.charge>0){
    const width=2*((e.radius||18)+18),length=340*COMBAT.charge.duration+(e.radius||18)+18,a=Math.atan2(e.chargeY||0,e.chargeX||1);
    if(e.chargeWarning>0){const p=fillProgress(e.chargeWarning,COMBAT.charge.windup*scale);drawLane(ctx,x,y,a,length,width,width,p,{family,beat:strikePulse(p,time,reduced)});}
    else drawLane(ctx,x,y,a,length,width,width,1,{family,strength:clamp(e.charge/COMBAT.charge.duration,0,1)});
  }
  if(e.spell>0){
    const w=spellWindup(e.spell,e.spellDuration);
    if(w){
      drawChannel(ctx,x,y,e.boss?64:(e.radius||18)+22,w.fill,{family,time,reduced});
      const dx=(e.aimX??x)-x,dy=(e.aimY??e.y)+GROUND-y,d=Math.hypot(dx,dy);
      if(d>40&&w.after<1)drawLane(ctx,x,y,Math.atan2(dy,dx),d,e.boss?34:24,8,w.fill,{family,strength:1-w.after,beat:strikePulse(w.fill,time,reduced)});
    }
  }
}

// Above bodies: the melee wedge's rim, so a swing under the hero's feet still shows its edge.
export function enemyTelegraphTop(ctx,e,run,o={}){
  if(!(e.attack>0)||e.attackKind==='slam'||e.warning>0)return;
  const w=meleeWindup(e.attack,e.attackDuration);if(!w||w.strike>0)return;
  const target=o.target||run.player,time=o.time??run.time;
  wedgeRim(ctx,e.x,e.y+GROUND,Math.atan2(target.y-e.y,target.x-e.x),(e.radius||18)+34,0.62,w.fill,strikePulse(w.fill,time,!!o.reduced));
}

/* ---------- Projectiles (Tier S) ---------- */
export function drawProjectiles(ctx,shots,camera,reduced,areaIndex=0){
  const family=FAMILIES[areaIndex]||'thorn',accent=ACCENT[family];
  for(const shot of shots){
    if(!visibleAt(shot,camera,100))continue;
    const a=Math.atan2(shot.vy,shot.vx),c=Math.cos(a),n=Math.sin(a),x=shot.x,y=shot.y-20;
    if(shot.hostile){
      if(!reduced){const g=ctx.createLinearGradient(x-c*30,y-n*30,x,y);g.addColorStop(0,alpha(DANGER.hot,0));g.addColorStop(1,alpha(DANGER.hot,0.7));ctx.fillStyle=g;ctx.beginPath();taper(ctx,x-c*30,y-n*30,x,y,2,11);ctx.fill();
        drawGlyph(ctx,family,x-c*16,y-n*16,a,5,alpha(accent,0.95));}
      ctx.beginPath();ctx.arc(x,y,6.5,0,TAU);ctx.fillStyle=DANGER.hot;ctx.fill();ctx.lineWidth=2.4;ctx.strokeStyle=DANGER.dark;ctx.stroke();
      ctx.beginPath();ctx.arc(x+c*1.5,y+n*1.5,3,0,TAU);ctx.fillStyle=DANGER.core;ctx.fill();
      continue;
    }
    const source=shot.source||(shot.ally?'ally':'hero');
    if(source==='ally'&&shot.moon){
      // Moonlance (every third Dawnweaver bolt pierces): a long pearl lance led by a wide crescent.
      if(!reduced)halo(ctx,x,y,26,ENERGY.pearl,0.7);
      const g=ctx.createLinearGradient(x-c*72,y-n*72,x,y);g.addColorStop(0,alpha(ENERGY.pearl,0));g.addColorStop(0.75,alpha(ENERGY.pearl,0.75));g.addColorStop(1,alpha(ENERGY.white,0.95));
      ctx.fillStyle=g;ctx.beginPath();taper(ctx,x-c*72,y-n*72,x-c*4,y-n*4,1,8);ctx.fill();
      if(!reduced){ctx.beginPath();for(let i=1;i<=3;i++)glyph(ctx,'petal',x-c*(14+i*12)+n*(i%2?5:-5),y-n*(14+i*12)-c*(i%2?5:-5),a+(i%2?0.5:-0.5),5-i);ctx.fillStyle=alpha(ENERGY.white,0.6);ctx.fill();}
      drawGlyph(ctx,'eclipse',x,y,a,14,ENERGY.pearl);drawGlyph(ctx,'eclipse',x-c*2,y-n*2,a,8,ENERGY.white);
    }else if(source==='ally'){
      // Dawnweaver: a pearl crescent with two trailing petals.
      if(!reduced){ctx.beginPath();for(let i=1;i<=2;i++)glyph(ctx,'petal',x-c*(9+i*9),y-n*(9+i*9)+Math.sin(x*0.05+i)*3,a,6-i*1.5);ctx.fillStyle=alpha(ENERGY.pearl,0.55);ctx.fill();}
      drawGlyph(ctx,'eclipse',x,y,a,8,ENERGY.pearl);
    }else if(source==='sol'){
      // Sol: an amber comet, head and tail in one colour, sparks shed behind.
      const g=ctx.createLinearGradient(x-c*24,y-n*24,x,y);g.addColorStop(0,alpha(ENERGY.amber,0));g.addColorStop(1,alpha(ENERGY.amber,0.95));
      ctx.fillStyle=g;ctx.beginPath();taper(ctx,x-c*24,y-n*24,x,y,1,9);ctx.moveTo(x+4.5,y);ctx.arc(x,y,4.5,0,TAU);ctx.fill();
      if(!reduced){ctx.beginPath();for(let i=0;i<2;i++)glyph(ctx,'spark',x-c*(14+i*9)+n*(i?4:-4),y-n*(14+i*9)-c*(i?4:-4),a,3.5);ctx.fillStyle=alpha(ENERGY.white,0.8);ctx.fill();}
    }else{
      // Zeyu (and keepers): one slim light shard, brightest at the tip.
      const color=source==='npc'?'#dfeaff':ENERGY.gold,g=ctx.createLinearGradient(x-c*26,y-n*26,x+c*9,y+n*9);
      g.addColorStop(0,alpha(color,0));g.addColorStop(0.65,alpha(color,1));g.addColorStop(1,alpha(ENERGY.white,1));
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x+c*9,y+n*9);ctx.lineTo(x-n*4,y+c*4);ctx.lineTo(x-c*26,y-n*26);ctx.lineTo(x+n*4,y-c*4);ctx.closePath();ctx.fill();
    }
  }
}

/* ---------- Hazard impact and aftermath ---------- */
const recorded=new WeakSet(),aftermaths=new WeakMap();
const BIG=new Set(['slam','ripple']);
export function aftermathLife(kind){return BIG.has(kind)?1.2:0.8;}
function remember(run,h,shape,family){
  if(recorded.has(h))return;recorded.add(h);
  if(!aftermaths.has(run))aftermaths.set(run,[]);
  const list=aftermaths.get(run);list.push({...shape,kind:h.kind,family,start:run.time-Math.max(0,0.35-(h.life??0.35))});
  if(list.length>32)list.splice(0,list.length-32);
}
export function drawHazardImpact(ctx,h,reduced,run=null){
  if(!h.triggered)return;
  const shape=hazardShape(h);if(!shape.valid)return;
  const {x,y,r,inner}=shape,family=hazardFamily(h,run?.areaIndex),accent=ACCENT[family]||DANGER.light,big=BIG.has(h.kind)&&shape.known;
  if(run)remember(run,h,shape,family);
  const t=clamp(1-(h.life??0)/0.35,0,1),k=ease(t),fade=(1-t)**1.4,outer=r+(big?r*0.32:12);
  ctx.save();
  // Light, shock and shards stay inside the band, so a ring's safe centre is never lit.
  ctx.beginPath();ctx.arc(x,y,outer+4,0,TAU);if(inner>0){ctx.moveTo(x+inner,y);ctx.arc(x,y,inner,0,TAU,true);}ctx.clip('evenodd');
  const g=ctx.createRadialGradient(x,y,inner,x,y,r);g.addColorStop(0,alpha(DANGER.core,0.75*fade));g.addColorStop(0.7,alpha(DANGER.hot,0.6*fade));g.addColorStop(1,alpha(DANGER.light,0.85*fade));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  softRing(ctx,x,y,r+(outer-r)*k,big?30:16,DANGER.light,fade);
  if(!reduced){
    const count=big?26:14;ctx.beginPath();
    for(let i=0;i<count;i++){
      const a=i*TAU/count+(i%2)*0.2,d=inner+(r-inner)*(0.2+0.75*k*(0.55+0.45*((i*0.618)%1)));
      glyph(ctx,family==='generic'?'shard':family,x+Math.cos(a)*d,y+Math.sin(a)*d-(big?18:10)*k,a,(big?9:6.5)*(1-t*0.6));
    }
    ctx.fillStyle=alpha(accent,1-t*0.8);ctx.fill();
    if(big){ctx.beginPath();for(let i=0;i<14;i++){const a=i*TAU/14+0.2;taper(ctx,x+Math.cos(a)*inner,y+Math.sin(a)*inner,x+Math.cos(a)*(inner+(r-inner)*(0.4+0.6*k)),y+Math.sin(a)*(inner+(r-inner)*(0.4+0.6*k)),9*(1-t)+1,1);}ctx.fillStyle=alpha(DANGER.core,0.8*fade);ctx.fill();}
  }
  ctx.restore();
}
// After a strike: a fading scorch where the ground was hit, and for slams and ripples, embers.
export function drawHazardAftermath(ctx,run,camera,reduced){
  const list=aftermaths.get(run);if(!list?.length)return;
  for(let i=list.length-1;i>=0;i--){const m=list[i],life=aftermathLife(m.kind),age=run.time-m.start;if(age>life||age<0)list.splice(i,1);}
  for(const m of list){
    const age=run.time-m.start;if(age<0.2||!visibleAt({x:m.x,y:m.y},camera,m.r+20))continue;
    const life=aftermathLife(m.kind),fade=1-clamp((age-0.2)/(life-0.2),0,1),accent=ACCENT[m.family]||DANGER.light;
    const g=ctx.createRadialGradient(m.x,m.y,m.inner,m.x,m.y,m.r);g.addColorStop(0,alpha(DANGER.dark,0.32*fade));g.addColorStop(0.8,alpha(DANGER.dark,0.22*fade));g.addColorStop(1,alpha(DANGER.dark,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,TAU);if(m.inner>0){ctx.moveTo(m.x+m.inner,m.y);ctx.arc(m.x,m.y,m.inner,0,TAU,true);}ctx.fill('evenodd');
    if(!reduced&&BIG.has(m.kind)){
      ctx.beginPath();
      for(let i=0;i<12;i++){const a=i*2.4,d=m.inner+(m.r-m.inner)*((i*0.37)%1),rise=(age*40+i*7)%60;glyph(ctx,'spark',m.x+Math.cos(a)*d,m.y+Math.sin(a)*d-rise,-Math.PI/2,3.5*fade);}
      ctx.fillStyle=alpha(accent,0.8*fade);ctx.fill();
    }
  }
}

/* ---------- Defeat ---------- */
// Each map dissolves its Hollow in its own material: thorn leaves fall, chime notes rise,
// eclipse crescents spin away, embers lift, cosmos stars scatter. Bosses add a light pillar.
export function drawDefeatEnergy(ctx,corpse,reduced){
  const boss=!!corpse.boss,life=boss?1.2:0.85;
  if(reduced||corpse.deathAge>life)return;
  const t=clamp(corpse.deathAge/life,0,1),family=enemyFamily(corpse),accent=ACCENT[family]||ENERGY.white,cy=corpse.y-(boss?60:30);
  ctx.save();
  halo(ctx,corpse.x,cy,(boss?120:55)*(0.7+0.5*t),accent,(1-t)*0.7);
  if(boss){
    const rise=Math.min(1,t/0.35),fade=1-Math.max(0,(t-0.35)/0.65);
    lightPillar(ctx,corpse.x,corpse.y+GROUND,62,380*rise,ENERGY.white,accent,0.7*fade);
    softRing(ctx,corpse.x,corpse.y+GROUND,60+260*ease(t),34,accent,(1-t)*0.8);
  }
  const count=boss?30:12;ctx.beginPath();
  for(let i=0;i<count;i++){
    const seed=(i*0.618)%1,spread=(boss?70:26)*(0.4+seed);
    let px=corpse.x+Math.sin(i*9.3)*spread,py=cy,turn=i;
    if(family==='thorn'){px+=Math.sin(t*5+i)*12*t;py+=-18+t*(30+i%4*10);turn=t*3+i;}
    else if(family==='chime'){py-=t*(50+i%4*18);turn=-Math.PI/2;}
    else if(family==='eclipse'){px+=Math.cos(i)*40*t;py-=t*(30+i%3*20);turn=t*6+i;}
    else if(family==='ember'){px+=Math.sin(t*9+i)*6;py-=t*(60+i%5*16);turn=-Math.PI/2;}
    else{px+=Math.cos(i*1.7)*60*t;py+=Math.sin(i*1.7)*40*t-20*t;turn=t*2;}
    glyph(ctx,family,px,py,turn,(boss?6:4.5)*(1-t*0.6));
  }
  ctx.fillStyle=alpha(accent,1-t*0.9);ctx.fill();
  ctx.restore();
}
