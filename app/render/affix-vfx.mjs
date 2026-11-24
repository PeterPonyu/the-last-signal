// Enemy gift (affix) markers and auras. Owned by the world-rules worker.
// Every gifted Hollow wears one small marker (its gift's glyph in the gift colour on a dark disc) opposite
// the guard shield, plus one aura that shows what the gift does: thorns at the feet, roots that dig in,
// echo arcs, speed streaks, a fading veil, a verdict glint, slag drips, iron plates, a star tether, an
// eclipse shadow over the Hollow it shields, a heavy stance, a frenzy flicker, a split seam.
// Reduced effects keeps markers and static auras and drops motion and particles.
import {AFFIXES} from '../../content/affixes.mjs';
import {alpha,glyph,glyphRing,drawGlyph,floorTint,rimLine,GROUND} from './decal.mjs';
import {halo,softRing,star,taper} from './combat-vfx.mjs';

const TAU=Math.PI*2,clamp01=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const SHADE={rim:'#d8ccff',ink:'#9b88d6',floor:'#3b2f66',deep:'#0d0a18',glow:'#b7a6f0'};
// Head-left marker spot, mirrored from the guard shield the renderer draws at head-right.
export function markerSpot(e){
  if(e.boss)return {x:e.x-36,y:e.y-(e.bossRank==='champion'?168:224)};
  if(e.type==='pack')return {x:e.x-18,y:e.y-30};
  if(e.lieutenant)return {x:e.x-32,y:e.y-58};
  return {x:e.x-27,y:e.y-42};
}
function markerGlyph(ctx,id,x,y,s,color){
  ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
  const shape=(family,angle=0,size=s)=>drawGlyph(ctx,family,x,y,angle,size,color);
  if(id==='thorned')shape('thorn',-Math.PI/4);
  else if(id==='rooted'){ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x,y+s*0.2);for(const side of [-1,0,1]){ctx.moveTo(x,y+s*0.2);ctx.quadraticCurveTo(x+side*s*0.5,y+s*0.5,x+side*s*0.9,y+s);}ctx.stroke();}
  else if(id==='echoing')shape('chime',0,s*0.95);
  else if(id==='hastened'){ctx.beginPath();glyph(ctx,'ember',x-s*0.35,y,0,s*0.7);glyph(ctx,'ember',x+s*0.4,y,0,s*0.7);ctx.fill();}
  else if(id==='nameless'){ctx.beginPath();ctx.ellipse(x,y,s*0.62,s*0.82,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(x-s*0.35,y+s*0.1);ctx.lineTo(x+s*0.35,y+s*0.1);ctx.stroke();}
  else if(id==='judged'){ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x,y+s*0.8);ctx.moveTo(x-s*0.9,y-s*0.55);ctx.lineTo(x+s*0.9,y-s*0.55);ctx.moveTo(x-s*0.5,y+s*0.8);ctx.lineTo(x+s*0.5,y+s*0.8);ctx.stroke();for(const side of [-1,1]){ctx.beginPath();ctx.arc(x+side*s*0.75,y-s*0.1,s*0.32,0,Math.PI);ctx.fill();}}
  else if(id==='molten'){ctx.beginPath();ctx.moveTo(x,y-s);ctx.quadraticCurveTo(x+s*0.8,y+s*0.1,x,y+s*0.85);ctx.quadraticCurveTo(x-s*0.8,y+s*0.1,x,y-s);ctx.fill();}
  else if(id==='forged'){ctx.beginPath();ctx.moveTo(x-s*0.9,y-s*0.35);ctx.lineTo(x+s*0.9,y-s*0.35);ctx.lineTo(x+s*0.45,y+s*0.15);ctx.lineTo(x+s*0.45,y+s*0.75);ctx.lineTo(x-s*0.45,y+s*0.75);ctx.lineTo(x-s*0.45,y+s*0.15);ctx.closePath();ctx.fill();}
  else if(id==='starbound')shape('cosmos',0,s*1.05);
  else if(id==='eclipsed')shape('eclipse',-Math.PI/2,s*0.95);
  else if(id==='stalwart'){ctx.fillRect(x-s*0.7,y-s*0.7,s*1.4,s*1.4);}
  else if(id==='frenzied')shape('ember',-Math.PI/2,s*1.05);
  else if(id==='splitting'){ctx.beginPath();ctx.arc(x-s*0.45,y,s*0.42,0,TAU);ctx.moveTo(x+s*0.87,y);ctx.arc(x+s*0.45,y,s*0.42,0,TAU);ctx.fill();}
  else shape('rune');
}
export function drawMarker(ctx,id,x,y,color,scale=1){
  const r=10*scale;
  ctx.save();
  ctx.fillStyle='#120e18e8';ctx.beginPath();ctx.moveTo(x,y-r*1.15);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r*1.15);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill();
  ctx.strokeStyle=alpha(color,0.95);ctx.lineWidth=1.5*scale;ctx.stroke();
  markerGlyph(ctx,id,x,y,5.2*scale,color);
  ctx.restore();
}
// The Eclipsed Hollow alive this frame (cached per run and time: auras are checked for every body).
const eclipseCache=new WeakMap();
function eclipsers(run){
  const cached=eclipseCache.get(run);if(cached&&cached.time===run.time&&cached.count===run.enemies.length)return cached.list;
  const list=run.enemies.filter(o=>o.affix==='eclipsed'&&o.hp>0&&!(o.warning>0));
  eclipseCache.set(run,{time:run.time,count:run.enemies.length,list});return list;
}
function shieldedBy(run,e){
  if(e.boss||e.affix==='eclipsed')return null;
  const reach=AFFIXES.eclipsed.reach;
  return eclipsers(run).find(o=>o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<reach)||null;
}

function back(ctx,e,run,id,a,reduced,time){
  const x=e.x,feet=e.y+GROUND,r=(e.radius||18),cy=e.y-36,color=a.color;
  if(id==='thorned')glyphRing(ctx,'thorn',x,feet,r+9,9,4.2,alpha(color,0.85),reduced?0:time*0.4);
  else if(id==='rooted'){
    const planted=clamp01((e.affixStill||0)/(a.still||0.5)),reach=r+8+10*planted;
    ctx.beginPath();for(let i=0;i<5;i++){const t=i*TAU/5+0.4,ex=x+Math.cos(t)*reach,ey=feet+Math.sin(t)*reach*0.45;ctx.moveTo(x+Math.cos(t)*r*0.4,feet+Math.sin(t)*r*0.2);ctx.quadraticCurveTo(x+Math.cos(t+0.5)*reach*0.7,feet+Math.sin(t+0.5)*reach*0.3,ex,ey);}
    ctx.strokeStyle='#2a2119dd';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle=alpha(color,0.75);ctx.lineWidth=1.6;ctx.stroke();
    if(planted>=1&&e.hp<e.maxHp)halo(ctx,x,feet-6,r+16,color,reduced?0.25:0.2+0.1*Math.sin(time*5));
  }
  else if(id==='echoing'){
    const beat=reduced?0.5:(time*1.2+e.id*0.3)%1,face=e.faceX<0?1:-1;
    for(const k of [0,1]){const t=(beat+k*0.5)%1;ctx.beginPath();ctx.arc(x,cy,r+10+t*18,face>0?-0.9:Math.PI-0.9,face>0?0.9:Math.PI+0.9);ctx.strokeStyle=alpha(color,0.7*(1-t));ctx.lineWidth=2.2;ctx.stroke();}
    if(e.affixEcho){ctx.beginPath();glyph(ctx,'chime',e.affixEcho.x,e.affixEcho.y+GROUND,0,6);ctx.fillStyle=alpha(color,0.85);ctx.fill();}
  }
  else if(id==='hastened'){
    if(!e.moving&&reduced)return;
    const face=e.faceX<0?1:-1;ctx.beginPath();for(const [dy,len] of [[-14,34],[0,46],[14,30]])taper(ctx,x+face*(r*0.6+len),cy+dy,x+face*r*0.6,cy+dy,1,4);
    ctx.fillStyle=alpha(color,e.moving?0.7:0.35);ctx.fill();
  }
  else if(id==='nameless'){
    const blink=e.affixBlink;
    if(blink){
      const k=clamp01(1-(blink.at-run.time)/(a.fade||0.5));
      halo(ctx,blink.fromX,blink.fromY-36,r+26,color,0.55*(1-k));
      ctx.beginPath();ctx.ellipse(blink.fromX,blink.fromY-30,r*0.8,r*1.9,0,0,TAU);ctx.fillStyle=alpha(color,0.28*(1-k));ctx.fill();
      softRing(ctx,blink.x,blink.y+GROUND,(r+16)*(0.4+0.6*k),10,color,0.8*k);
    }else if(!reduced)halo(ctx,x,cy,r+22,color,0.12+0.06*Math.sin(time*3+e.id));
  }
  else if(id==='judged'){
    const charge=e.affixReturn>0?1:0.4;
    halo(ctx,x,cy,r+18,color,0.18+0.2*charge);
  }
  else if(id==='molten'){
    halo(ctx,x,feet-4,r+16,color,0.25);
    if(!reduced){ctx.beginPath();for(let i=0;i<4;i++){const t=(time*1.1+i/4+e.id*0.13)%1;glyph(ctx,'ember',x+Math.sin(i*2.3)*r*0.7,cy+10+t*34,Math.PI/2,4*(1-t*0.5));}ctx.fillStyle=alpha(color,0.9);ctx.fill();}
  }
  else if(id==='forged'){
    const broken=e.guardBroken>0;ctx.beginPath();
    for(let i=0;i<6;i++){const a0=i*TAU/6+0.12,a1=a0+TAU/6-0.24;ctx.moveTo(x+Math.cos(a0)*(r+9),feet+Math.sin(a0)*(r+9)*0.45);ctx.ellipse(x,feet,r+9,(r+9)*0.45,0,a0,a1);}
    ctx.strokeStyle=broken?alpha('#7c7366',0.5):alpha(color,0.9);ctx.lineWidth=broken?2:4;ctx.stroke();
  }
  else if(id==='starbound'){
    const top=e.y-(e.boss?280:150),sway=reduced?0:Math.sin(time*1.6+e.id)*6;
    ctx.beginPath();ctx.moveTo(x,cy-10);ctx.quadraticCurveTo(x+sway*2,(cy+top)/2,x+sway,top);ctx.strokeStyle=alpha(color,0.55);ctx.lineWidth=1.4;ctx.stroke();
    star(ctx,x+sway,top,reduced?6:6+1.5*Math.sin(time*4+e.id),alpha(color,0.95),reduced?0:time);
  }
  else if(id==='eclipsed'){
    const reach=a.reach,y=feet;
    floorTint(ctx,x,y,reach,SHADE,0.75);rimLine(ctx,x,y,reach,SHADE,0.55,1.2);
    glyphRing(ctx,'eclipse',x,y,reach-5,24,3,alpha(SHADE.ink,0.7),reduced?0:time*0.2);
    halo(ctx,x,cy,r+20,'#2a1f4a',0.55);
  }
  else if(id==='stalwart'){
    ctx.beginPath();ctx.ellipse(x,feet,r+12,(r+12)*0.42,0,0,TAU);ctx.strokeStyle=alpha(color,0.65);ctx.lineWidth=3.2;ctx.stroke();
  }
  else if(id==='frenzied'){
    if(!e.affixFrenzy)return;
    halo(ctx,x,cy,r+26,color,reduced?0.35:0.3+0.18*Math.sin(time*14+e.id));
    if(!reduced){ctx.beginPath();for(let i=0;i<5;i++){const t=(time*1.6+i/5)%1;glyph(ctx,'ember',x+Math.sin(i*1.7+time*3)*r*0.8,cy+18-t*48,-Math.PI/2,4.5*(1-t*0.6));}ctx.fillStyle=alpha(color,0.85);ctx.fill();}
  }
  else if(id==='splitting'){
    ctx.beginPath();ctx.moveTo(x,cy-r*1.6);ctx.lineTo(x+3,cy-r*0.4);ctx.lineTo(x-3,cy+r*0.6);ctx.lineTo(x,cy+r*1.6);ctx.strokeStyle=alpha(color,reduced?0.5:0.35+0.25*Math.sin(time*4+e.id));ctx.lineWidth=2;ctx.stroke();
  }
}
function front(ctx,e,run,id,a,reduced,time){
  const spot=markerSpot(e);
  if(id==='nameless'&&e.phaseShift>0){halo(ctx,e.x,e.y-36,(e.radius||18)+24,a.color,0.6);}
  if(id==='judged'&&e.affixReturn>0&&!reduced)star(ctx,e.x,e.y-48,7+3*Math.sin(time*16),alpha(a.color,0.95),time*4);
  // A Starbound Hollow's called stars fall onto their marks as the warning fills.
  if(id==='starbound')for(const h of run.hazards){
    if(h.owner!==e.id||h.kind!=='starcall'||h.triggered)continue;
    const p=clamp01(1-h.warning/(h.total||1)),k=p**1.5,tx=h.x,ty=h.y+GROUND-6,sx=tx+80,sy=ty-360,hx=sx+(tx-sx)*k,hy=sy+(ty-sy)*k;
    ctx.beginPath();taper(ctx,hx-(tx-sx)*0.12,hy-(ty-sy)*0.12,hx,hy,1,6);ctx.fillStyle=alpha(a.color,0.75);ctx.fill();
    star(ctx,hx,hy,5+4*p,'#ffffff',reduced?0:time*3);
  }
  drawMarker(ctx,id,spot.x,spot.y,a.color,e.boss?1.25:1);
}
// Called before (front=false) and after (front=true) each enemy sprite.
export function drawAffixes(ctx,enemy,run,reduced,front_){
  if(!enemy||!(enemy.hp>0)||enemy.warning>0)return;
  const time=reduced?0:(run?.time||0);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  const shield=run?.enemies?shieldedBy(run,enemy):null;
  // Hollow inside an Eclipsed aura wear a small dim crescent over the head.
  if(shield&&front_)drawGlyph(ctx,'eclipse',enemy.x+2,enemy.y-(enemy.lieutenant?132:enemy.type==='pack'?72:112),-Math.PI/2,6,alpha(AFFIXES.eclipsed.color,0.9));
  const a=AFFIXES[enemy.affix];
  if(a){if(front_)front(ctx,enemy,run,enemy.affix,a,reduced,time);else back(ctx,enemy,run,enemy.affix,a,reduced,time);}
  ctx.restore();
}
