// Visuals for the hero's passive gifts and skill evolutions (answers of the light). Owned by the answers worker.
// Called twice per frame (ground layer, then front layer). Tiers follow the Visual standard:
// - Tier S (one shape, one colour, <= 0.35 s): blade nicks, chain sparks, dash cuts, shard bursts, burns.
// - Tier M (shared ground decal or one readable zone): comet landing mark, healing petals, embers, scorch.
// - Tier L (gather -> release -> aftermath): comet strike, wide dawn, prism beams, aftershock, skill learned.
// Friendly palette only (Zeyu gold and white, pearl for allied threads). Reduced effects: static
// shapes, no particles, no trails.
import {ENERGY,halo,star,burst,softRing,taper,crescent} from './combat-vfx.mjs';
import {TONES,GROUND,alpha,glyph,drawGlyph,drawDecal,medallion,lightPillar} from './decal.mjs';
import {drawRadiance} from './raster-details.mjs';
import {visibleAt} from './presentation.mjs';
import {orbitBlades,ORBIT,COMET,EMBER,BLOOM} from '../game/answers.mjs';
import {COMBAT} from '../../content/game.mjs';

const TAU=Math.PI*2;
const clamp01=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const ease=t=>1-(1-clamp01(t))**3;
const fade=(age,life,inSpan,outSpan)=>clamp01(age/inSpan)*clamp01((life-age)/outSpan);
// Burnt ground under friendly fire: deep umber, never the danger red.
const ASH={deep:'#2a1606',umber:'#5a2c0c',ember:'#e0782c'};
const SKILL_ICON={pulse:'pulse',sunbreak:'sunbreak',solarLance:'lance'};
const GROUND_FX=new Set(['gift-wave','gift-prism','gift-comet']);
const FRONT_FX=new Set(['gift-comet','gift-chain','gift-aftershock','gift-orbit','gift-cut','gift-split','gift-bloom','gift-learn']);

/* ---------- Ground layer: zones, embers, petals, landing marks ---------- */
// Sunscar (Tier L aftermath that still burns): a scorched disc at its true radius with glowing cracks.
function scar(ctx,z,time,reduced){
  const k=fade(z.age,z.life,0.15,0.6);if(k<=0)return;
  const x=z.x,y=z.y+GROUND,r=Math.max(1,z.r);
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,alpha(ENERGY.amber,0.3*k));g.addColorStop(0.55,alpha(ASH.umber,0.3*k));g.addColorStop(0.9,alpha(ASH.deep,0.42*k));g.addColorStop(1,alpha(ASH.deep,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  const flicker=reduced?1:0.75+0.25*Math.sin(time*9+x*0.01);
  ctx.beginPath();
  for(let i=0;i<7;i++){const a=i*TAU/7+0.4,len=r*(0.55+0.3*((i*0.618)%1));taper(ctx,x+Math.cos(a)*r*0.12,y+Math.sin(a)*r*0.12,x+Math.cos(a)*len,y+Math.sin(a)*len,5,1);}
  ctx.fillStyle=alpha(ENERGY.gold,0.75*k*flicker);ctx.fill();
  softRing(ctx,x,y,r,14,ENERGY.amber,0.55*k);
  if(!reduced){
    ctx.beginPath();
    for(let i=0;i<10;i++){const s=(time*0.8+i/10)%1,a=i*2.4,d=r*0.8*((i*0.37)%1);glyph(ctx,'spark',x+Math.cos(a)*d,y+Math.sin(a)*d-s*46,-Math.PI/2,4*(1-s)+1);}
    ctx.fillStyle=alpha(ENERGY.white,0.85*k);ctx.fill();
  }
}
// A small flame: amber body, white heart. Each flame keeps its own size and lean from its seed.
function flame(ctx,x,y,size,lean,k){
  ctx.beginPath();glyph(ctx,'petal',x,y-size,-Math.PI/2+lean,size);ctx.fillStyle=alpha(ENERGY.amber,0.9*k);ctx.fill();
  ctx.beginPath();glyph(ctx,'petal',x,y-size*0.75,-Math.PI/2+lean*0.5,size*0.45);ctx.fillStyle=alpha(ENERGY.white,0.85*k);ctx.fill();
}
const seedOf=(x,y,i=0)=>Math.abs(Math.sin(x*12.9898+y*78.233+i*37.719)*43758.5453)%1;
// Searing Line: the lance's path stays alight at its true width, a soft-edged bed with flames along it.
function searingLine(ctx,z,time,reduced){
  const k=fade(z.age,z.life,0.12,0.6);if(k<=0)return;
  const ax=z.x,ay=z.y+GROUND,bx=z.x2,by=z.y2+GROUND,length=Math.hypot(bx-ax,by-ay);if(!(length>1))return;
  const a=Math.atan2(by-ay,bx-ax),c=Math.cos(a),n=Math.sin(a),w=z.r;
  ctx.save();ctx.translate(ax,ay);ctx.rotate(a);
  const bed=ctx.createLinearGradient(0,-w,0,w);
  bed.addColorStop(0,alpha(ASH.deep,0));bed.addColorStop(0.25,alpha(ASH.deep,0.4*k));bed.addColorStop(0.5,alpha(ASH.umber,0.5*k));bed.addColorStop(0.75,alpha(ASH.deep,0.4*k));bed.addColorStop(1,alpha(ASH.deep,0));
  ctx.beginPath();taper(ctx,0,0,length,0,w*2,w*1.6);ctx.fillStyle=bed;ctx.fill();
  const flicker=reduced?1:0.8+0.2*Math.sin(time*9);
  const glow=ctx.createLinearGradient(0,-w*0.75,0,w*0.75);
  glow.addColorStop(0,alpha(ENERGY.amber,0));glow.addColorStop(0.3,alpha(ENERGY.amber,0.3*k*flicker));glow.addColorStop(0.5,alpha(ENERGY.gold,0.68*k*flicker));glow.addColorStop(0.7,alpha(ENERGY.amber,0.3*k*flicker));glow.addColorStop(1,alpha(ENERGY.amber,0));
  ctx.beginPath();taper(ctx,0,0,length,0,w*1.5,w*1.1);ctx.fillStyle=glow;ctx.fill();
  ctx.beginPath();taper(ctx,0,0,length,0,3,1.4);ctx.fillStyle=alpha(ENERGY.white,0.7*k);ctx.fill();
  ctx.restore();
  for(let i=0,count=Math.floor(length/30);i<count;i++){
    if(reduced&&i%2)continue;
    const s=seedOf(ax,ay,i),d=(i+0.3+s*0.4)*30,side=(s-0.5)*w*1.2,flick=reduced?1:0.7+0.3*Math.sin(time*(9+s*6)+i*1.7);
    flame(ctx,ax+c*d-n*side,ay+n*d+c*side,(6+6*s)*flick*k+1.5,(s-0.5)*0.5,k);
  }
}
// Ember Step: a small burning patch at its true reach, one or two flames flickering on it.
function ember(ctx,item,time,reduced){
  const k=fade(item.age,item.life,0.1,0.6);if(k<=0)return;
  const x=item.x,y=item.y+GROUND,r=EMBER.radius,s=seedOf(item.x,item.y);
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,alpha(ENERGY.gold,0.4*k));g.addColorStop(0.45,alpha(ENERGY.amber,0.3*k));g.addColorStop(0.75,alpha(ASH.ember,0.14*k));g.addColorStop(1,alpha(ASH.deep,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  const flick=reduced?1:0.72+0.28*Math.sin(time*(10+s*6)+s*9);
  flame(ctx,x-5+s*10,y,(7+6*s)*flick*k+1.5,(s-0.5)*0.6,k);
  if(!reduced&&s>0.35)flame(ctx,x+8-s*6,y+4,(4+4*s)*(1.7-flick)*k+1,(0.5-s)*0.7,k);
}
// Dawn Bloom petal, ground part: the pickup decal at its true reach; it blinks before it wilts.
function petalBlink(item,time,reduced){
  const left=item.life-item.age;
  return clamp01(item.age/0.25)*(left<3&&!reduced?0.55+0.45*Math.cos(time*Math.PI*(left<1.2?8:4)):1);
}
function petalGround(ctx,item,time,reduced,uiScale){
  const k=petalBlink(item,time,reduced);if(k<=0)return;
  ctx.save();ctx.globalAlpha*=k;
  drawDecal(ctx,item.x,item.y+GROUND,BLOOM.reach,TONES.recovery,{strength:0.8,reduced,time,scale:uiScale});
  ctx.restore();
}
// Front part: a small five-petal flower floating above the decal, readable over bodies.
function petalFlower(ctx,item,time,reduced){
  const k=petalBlink(item,time,reduced);if(k<=0)return;
  const bob=reduced?0:Math.sin(time*2.4+item.x*0.01)*3,x=item.x,y=item.y-16+bob,turn=reduced?0:time*0.6;
  ctx.save();ctx.globalAlpha*=k;
  if(!reduced)halo(ctx,x,y,30,TONES.recovery.glow,0.7);
  ctx.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*TAU/5+turn;glyph(ctx,'petal',x+Math.cos(a)*9,y+Math.sin(a)*9,a,9);}
  ctx.fillStyle=alpha('#e8fff2',0.95);ctx.fill();ctx.strokeStyle=alpha(TONES.recovery.ink,0.95);ctx.lineWidth=1.2;ctx.stroke();
  star(ctx,x,y,5.5,alpha(ENERGY.gold,1),0);
  ctx.restore();
}
// Comet Call (Tier M part): the landing mark is the friendly decal at the strike radius, filling to impact.
function cometMark(ctx,comet,time,reduced,uiScale){
  drawDecal(ctx,comet.x,comet.y+GROUND,COMET.radius,TONES.restored,{progress:clamp01(comet.age/comet.delay),strength:0.9,glint:true,reduced,time,scale:uiScale});
}
// Wide Dawn: the pulse's front carries on to the wider reach; its rays light only the added band.
function wideWave(ctx,fx,t,reduced){
  const x=fx.x,y=fx.y+GROUND,radius=fx.radius||295,from=fx.from||210,r=radius*ease(t),k=1-t;
  if(r<=1)return;
  softRing(ctx,x,y,r,30,ENERGY.white,k**0.8);softRing(ctx,x,y,r*0.9,12,ENERGY.gold,k*0.8);
  const inner=Math.max(from,r*0.72);
  if(r>inner+4){
    ctx.beginPath();const rays=reduced?8:16;
    for(let i=0;i<rays;i++){const a=i*TAU/rays+0.2+(reduced?0:t*0.3);taper(ctx,x+Math.cos(a)*inner,y+Math.sin(a)*inner,x+Math.cos(a)*r*0.99,y+Math.sin(a)*r*0.99,6,1);}
    ctx.fillStyle=alpha(ENERGY.gold,0.7*k);ctx.fill();
  }
  if(!reduced&&t>0.25){ctx.beginPath();for(let i=0;i<14;i++){const a=i*2.2+0.5,d=from+(r-from)*((i*0.37)%1);glyph(ctx,'spark',x+Math.cos(a)*d,y+Math.sin(a)*d-26*(t-0.25),-Math.PI/2,4.5*k);}ctx.fillStyle=alpha(ENERGY.white,0.85*k);ctx.fill();}
}
// Prism Lance: two thinner side beams split from the lance, gold turning pearl along their length.
function prismBeam(ctx,fx,t,reduced){
  const reach=Math.max(0,Math.min(fx.reach||0,COMBAT.solarLance.range)),width=COMBAT.solarLance.width*0.7,k=1-t;
  if(reach<=1)return;
  ctx.save();ctx.translate(fx.x,fx.y-18);ctx.rotate(fx.angle||0);
  const wide=ctx.createLinearGradient(0,0,reach,0);wide.addColorStop(0,alpha(ENERGY.gold,0.4*k));wide.addColorStop(0.5,alpha(ENERGY.pearl,0.28*k));wide.addColorStop(1,alpha(ENERGY.pearl,0.08*k));
  ctx.fillStyle=wide;ctx.beginPath();taper(ctx,0,0,reach,0,width*1.7*(1-0.4*t),14*k+4);ctx.fill();
  const core=ctx.createLinearGradient(0,0,reach,0);core.addColorStop(0,alpha(ENERGY.white,0.9*k));core.addColorStop(1,alpha(ENERGY.pearl,0.35*k));
  ctx.fillStyle=core;ctx.beginPath();taper(ctx,0,0,reach,0,width*0.6*(1-0.5*t),6*k+2);ctx.fill();
  ctx.beginPath();const glints=reduced?1:Math.max(1,Math.ceil(reach/140));
  for(let i=0;i<glints;i++){const d=(i+0.5)/glints*reach;glyph(ctx,'cosmos',d,(i%2?1:-1)*width*0.3,t*2+i,9*k+3);}
  ctx.fillStyle=alpha(ENERGY.white,k);ctx.fill();
  star(ctx,reach-4,0,12*k+3,alpha(ENERGY.white,k),t*2);
  ctx.restore();
}
// Comet strike, ground part: a scorch at the true radius, a shock band and cracks running out.
function cometGround(ctx,fx,t,reduced){
  const x=fx.x,y=fx.y+GROUND,R=COMET.radius,k=1-t,hot=clamp01(1-t/0.4);
  const g=ctx.createRadialGradient(x,y,0,x,y,R);g.addColorStop(0,alpha(ASH.umber,0.5*k));g.addColorStop(0.7,alpha(ASH.deep,0.3*k));g.addColorStop(1,alpha(ASH.deep,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.fill();
  // The crater glows white-gold at impact before it cools to a scorch.
  if(hot>0){const glow=ctx.createRadialGradient(x,y,0,x,y,R*0.7);glow.addColorStop(0,alpha(ENERGY.white,0.75*hot));glow.addColorStop(0.4,alpha(ENERGY.gold,0.45*hot));glow.addColorStop(1,alpha(ENERGY.gold,0));ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,R*0.7,0,TAU);ctx.fill();}
  softRing(ctx,x,y,20+R*ease(t/0.45),22,ENERGY.gold,k);
  const grow=ease(t/0.3);
  ctx.beginPath();for(let i=0;i<9;i++){const a=i*TAU/9+0.3,length=R*(0.5+0.35*((i*0.618)%1))*grow;if(length>10)taper(ctx,x+Math.cos(a)*8,y+Math.sin(a)*8,x+Math.cos(a)*length,y+Math.sin(a)*length,5,1);}
  ctx.fillStyle=alpha(ENERGY.gold,0.8*k);ctx.fill();
  if(!reduced&&t>0.3){ctx.beginPath();for(let i=0;i<8;i++){const a=i*2.5,d=R*0.7*((i*0.37)%1);glyph(ctx,'spark',x+Math.cos(a)*d,y+Math.sin(a)*d-40*(t-0.3),-Math.PI/2,4*k);}ctx.fillStyle=alpha(ENERGY.white,0.8*k);ctx.fill();}
}

/* ---------- Front layer: blades, burns, waves, falling comets, hit feedback ---------- */
// Orbiting Dawn: sickle blades riding the orbit, leading edge thick and bright; a short smear behind.
function orbit(ctx,run,reduced){
  const blades=orbitBlades(run);if(!blades.length)return;
  const p=run.player,cx=p.x,cy=p.y-20,R=ORBIT.radius;
  for(const b of blades){
    const a=b.angle,k=Math.sin(a)<0?0.8:1,tip={x:cx+Math.cos(a+0.12)*R,y:cy+Math.sin(a+0.12)*R};
    if(!reduced){
      // A short smear just behind the blade, fading toward its tail.
      ctx.beginPath();crescent(ctx,cx,cy,R,a-0.62,a-0.18,0.4,6,10);ctx.fillStyle=alpha(ENERGY.gold,0.32*k);ctx.fill();
      halo(ctx,b.x,b.y-20,30,ENERGY.gold,0.6*k);
    }
    ctx.beginPath();crescent(ctx,cx,cy,R,a-0.3,a+0.12,1.5,13,10);ctx.fillStyle=alpha(ENERGY.gold,0.95*k);ctx.fill();
    ctx.beginPath();crescent(ctx,cx,cy,R+5,a-0.24,a+0.1,0.5,3.2,8);ctx.fillStyle=alpha(ENERGY.white,0.95*k);ctx.fill();
    star(ctx,tip.x,tip.y,6.5,alpha(ENERGY.white,k),a);
  }
}
// Burning Hollow (Fox Fire): amber flames licking the body while the burn lasts.
function burns(ctx,run,camera,time,reduced){
  for(const e of run.enemies||[]){
    if(!e.giftBurn||!(e.hp>0)||e.warning>0||!visibleAt(e,camera,90))continue;
    const s=e.boss?1.6:e.lieutenant?1.25:1,x=e.x,y=e.y-(e.boss?100:e.lieutenant?56:30),f=reduced?1:0.75+0.25*Math.sin(time*13+(e.id||0)),g=reduced?1:0.75+0.25*Math.sin(time*11+(e.id||0)*1.7);
    if(!reduced)halo(ctx,x,y-12*s,38*s,ENERGY.amber,0.6);
    flame(ctx,x,y,17*s*f,0,1);
    if(!reduced){flame(ctx,x-12*s,y+7*s,12*s*g,-0.25,0.95);flame(ctx,x+12*s,y+8*s,11*s*(1.75-f),0.25,0.95);}
  }
}
// Crescent Wave: a forward-bulging gold crescent over the travelling shot.
function waveShots(ctx,run,camera,reduced){
  for(const s of run.shots||[]){
    if(!s.wave||!(s.life>0)||!visibleAt(s,camera,90))continue;
    ctx.save();ctx.translate(s.x,s.y-20);ctx.rotate(Math.atan2(s.vy||0,s.vx||1));
    if(!reduced)halo(ctx,-4,0,48,ENERGY.gold,0.6);
    ctx.beginPath();crescent(ctx,-28,0,36,-1.15,0,1,13,10);crescent(ctx,-28,0,36,0,1.15,13,1,10);ctx.fillStyle=alpha(ENERGY.gold,0.92);ctx.fill();
    ctx.beginPath();crescent(ctx,-28,0,41,-1,1,1.5,1.5,14);ctx.fillStyle=alpha(ENERGY.white,0.95);ctx.fill();
    if(!reduced){ctx.beginPath();for(let i=1;i<=3;i++)glyph(ctx,'spark',-22-i*13,(i%2?1:-1)*11,0,6-i);ctx.fillStyle=alpha(ENERGY.white,0.75);ctx.fill();}
    ctx.restore();
  }
}
// Comet Call (Tier L gather): the comet falls along a fixed slant and lands when the mark is full.
function cometHead(ctx,images,comet,time,reduced){
  const k=clamp01(comet.age/comet.delay),fall=k*k,sx=comet.x-150,sy=comet.y-560,ex=comet.x,ey=comet.y-14;
  const x=sx+(ex-sx)*fall,y=sy+(ey-sy)*fall,a=Math.atan2(ey-sy,ex-sx),tail=70+150*k,tx=x-Math.cos(a)*tail,ty=y-Math.sin(a)*tail;
  const g=ctx.createLinearGradient(tx,ty,x,y);g.addColorStop(0,alpha(ENERGY.gold,0));g.addColorStop(0.6,alpha(ENERGY.gold,0.6));g.addColorStop(1,alpha(ENERGY.white,0.95));
  ctx.beginPath();taper(ctx,tx,ty,x,y,3,30);ctx.fillStyle=g;ctx.fill();
  if(!reduced){
    halo(ctx,x,y,80,ENERGY.gold,0.95);halo(ctx,x,y,34,ENERGY.white,0.9);
    ctx.beginPath();for(let i=1;i<=5;i++){const d=i*tail/6,side=(i%2?1:-1)*(6+i*2.5);glyph(ctx,'spark',x-Math.cos(a)*d-Math.sin(a)*side,y-Math.sin(a)*d+Math.cos(a)*side,a,6.5-i*0.8);}ctx.fillStyle=alpha(ENERGY.white,0.85);ctx.fill();
  }
  star(ctx,x,y,20+10*k,alpha(ENERGY.white,1),reduced?0:time*3);
  drawGlyph(ctx,'cosmos',x,y,reduced?0:time*2,11,alpha(ENERGY.gold,1));
}
// Comet strike, release: a column of light, a white flash, the painted sunburst and sparks.
function cometRelease(ctx,images,fx,t,reduced){
  const x=fx.x,y=fx.y-20;
  if(t<0.4){const k=1-t/0.4;if(!reduced)lightPillar(ctx,x,fx.y+GROUND,46,320*k,ENERGY.white,ENERGY.gold,0.8*k);halo(ctx,x,y,170,ENERGY.gold,k);star(ctx,x,y,58*k*k+8,alpha(ENERGY.white,k),0.4);}
  drawRadiance(ctx,images,'sun',x,y,260,t,0,reduced?0.3:0.85);
  if(!reduced)burst(ctx,x,y,t,ENERGY.gold,14,130,-Math.PI/2,TAU,'spark',7);
}
// Chain Light / Starthread: a jagged thread of light from the struck Hollow to the next (Tier S).
function chain(ctx,fx,t){
  const k=1-t,color=fx.ally?ENERGY.pearl:ENERGY.gold,ax=fx.x,ay=fx.y-30,bx=fx.tx,by=fx.ty-30,dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
  ctx.beginPath();ctx.moveTo(ax,ay);
  for(let i=1;i<6;i++){const u=i/6,off=Math.sin(i*2.7+ax*0.05+by*0.03)*11;ctx.lineTo(ax+dx*u+nx*off,ay+dy*u+ny*off);}
  ctx.lineTo(bx,by);
  ctx.strokeStyle=alpha(color,0.5*k);ctx.lineWidth=7;ctx.stroke();
  ctx.strokeStyle=alpha(ENERGY.white,0.95*k);ctx.lineWidth=2.2;ctx.stroke();
  star(ctx,bx,by,11*k+3,alpha(ENERGY.white,k),0.4);
}
// Aftershock: a second, thinner shockfront across the Sunbreak cone.
function aftershock(ctx,images,fx,t,reduced){
  const reach=COMBAT.sunbreak.range,cone=0.77,k=1-t,front=40+(reach-40)*ease(t);
  ctx.save();ctx.translate(fx.x,fx.y-22);ctx.rotate(fx.angle||0);
  ctx.beginPath();crescent(ctx,0,0,front,-cone,cone,3,22*k+4,18);ctx.fillStyle=alpha(ENERGY.gold,0.72*k);ctx.fill();
  ctx.beginPath();crescent(ctx,0,0,front+7*k,-cone*0.9,cone*0.9,1,3.5,18);ctx.fillStyle=alpha(ENERGY.white,0.92*k);ctx.fill();
  ctx.beginPath();const rays=reduced?3:5;
  for(let i=0;i<rays;i++){const b=(i/(rays-1)-0.5)*cone*1.6;taper(ctx,Math.cos(b)*front*0.45,Math.sin(b)*front*0.45,Math.cos(b)*front*0.95,Math.sin(b)*front*0.95,7,1);}
  ctx.fillStyle=alpha(ENERGY.gold,0.45*k);ctx.fill();
  if(t<0.3)star(ctx,16,0,22*(1-t/0.3)+4,alpha(ENERGY.white,1-t/0.3),0.3);
  ctx.restore();
  if(!reduced)drawRadiance(ctx,images,'sun',fx.x+Math.cos(fx.angle||0)*120,fx.y-22+Math.sin(fx.angle||0)*120,260,t,fx.angle||0,0.45);
}
// Orbiting Dawn nick and Mirage Step cut (Tier S): one bright slash line across the Hollow.
function nick(ctx,fx,t,length,reduced){
  const k=1-t,a=(fx.angle||0)+0.6,x=fx.x,y=fx.y-32,c=Math.cos(a)*length/2,n=Math.sin(a)*length/2,draw=Math.min(1,t/0.35+0.4);
  ctx.beginPath();taper(ctx,x-c,y-n,x-c+2*c*draw,y-n+2*n*draw,1.5,5);ctx.fillStyle=alpha(ENERGY.gold,0.95*k);ctx.fill();
  ctx.beginPath();taper(ctx,x-c*0.8,y-n*0.8,x-c*0.8+1.6*c*draw,y-n*0.8+1.6*n*draw,0.5,2);ctx.fillStyle=alpha(ENERGY.white,k);ctx.fill();
  if(!reduced)burst(ctx,x,y,t,ENERGY.gold,4,22,a,1.2,'spark',4);
}
function splitBurst(ctx,fx,t,reduced){
  const k=1-t;star(ctx,fx.x,fx.y-24,14*k+3,alpha(ENERGY.white,k),0.4);
  if(!reduced)burst(ctx,fx.x,fx.y-24,t,ENERGY.gold,6,30,0,TAU,'shard',5);
}
// Healing petal gathered: petals rise around Zeyu in the recovery tone.
function bloomRise(ctx,fx,t,reduced){
  const k=1-t,x=fx.x,y=fx.y;
  softRing(ctx,x,y+GROUND,24+20*ease(t),10,TONES.recovery.ink,k);
  if(reduced)return;
  ctx.beginPath();for(let i=0;i<8;i++){const a=i*TAU/8+t*4,d=22+6*Math.sin(i);glyph(ctx,'petal',x+Math.cos(a)*d,y+10-t*(55+i*4)+Math.sin(a)*6,a+1.2,6*k+1.5);}
  ctx.fillStyle=alpha('#e8fff2',0.9*k);ctx.fill();
}
// A skill learned (Tier L): rays gather on Zeyu, then the skill's sign rises in a burst of light.
function learned(ctx,run,fx,t,reduced){
  const p=run.player,x=p.x,y=p.y-40,icon=SKILL_ICON[fx.skill]||'pulse';
  if(t<0.3){
    const k=t/0.3,rays=reduced?8:12;ctx.beginPath();
    for(let i=0;i<rays;i++){const a=i*TAU/rays,outer=90-50*k,inner=outer-22;taper(ctx,x+Math.cos(a)*outer,y+Math.sin(a)*outer,x+Math.cos(a)*inner,y+Math.sin(a)*inner,5,1);}
    ctx.fillStyle=alpha(ENERGY.gold,0.4+0.5*k);ctx.fill();return;
  }
  const k=(t-0.3)/0.7,f=1-k;
  if(!reduced&&k<0.6)lightPillar(ctx,x,p.y+GROUND,40,260*(1-k/0.6),ENERGY.white,ENERGY.gold,0.7*(1-k/0.6));
  halo(ctx,x,y,110*(0.6+0.4*ease(k)),ENERGY.gold,f*0.8);
  softRing(ctx,x,p.y+GROUND,30+70*ease(k),16,ENERGY.gold,f);
  star(ctx,x,y,30*(1-k)**2+6,alpha(ENERGY.white,f),0.3);
  // The skill's sign rises on a medallion, then fades.
  ctx.save();ctx.globalAlpha*=clamp01(f*1.6);medallion(ctx,icon,x,y-70-(reduced?0:24*ease(k)),TONES.restored,1.9);ctx.restore();
  if(!reduced)burst(ctx,x,y,k,ENERGY.gold,12,90,0,TAU,'spark',6);
}

export function drawGiftEffects(ctx,images,run,camera,reduced,ground,uiScale=1){
  if(!run?.player||!camera)return;
  const g=run.gifts&&run.gifts.area===run.areaIndex?run.gifts:null,time=reduced?0:(run.time||0);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(ground){
    if(g){
      for(const z of g.zones||[])if(visibleAt(z,camera,z.kind==='line'?700:160))(z.kind==='line'?searingLine:scar)(ctx,z,time,reduced);
      for(const item of g.embers||[])if(visibleAt(item,camera,60))ember(ctx,item,time,reduced);
      for(const item of g.petals||[])if(visibleAt(item,camera,70))petalGround(ctx,item,time,reduced,uiScale);
      for(const comet of g.comets||[])if(visibleAt(comet,camera,COMET.radius+40))cometMark(ctx,comet,time,reduced,uiScale);
    }
    for(const fx of run.effects||[]){
      if(!GROUND_FX.has(fx.kind)||!(fx.life>0)||fx.age>=fx.life)continue;
      if(fx.kind!=='gift-prism'&&!visibleAt(fx,camera,320))continue;
      const t=clamp01(fx.age/fx.life);ctx.save();
      if(fx.kind==='gift-wave')wideWave(ctx,fx,t,reduced);
      else if(fx.kind==='gift-prism')prismBeam(ctx,fx,t,reduced);
      else cometGround(ctx,fx,t,reduced);
      ctx.restore();
    }
  }else{
    if(visibleAt(run.player,camera,ORBIT.radius+60))orbit(ctx,run,reduced);
    burns(ctx,run,camera,time,reduced);
    waveShots(ctx,run,camera,reduced);
    if(g){
      for(const item of g.petals||[])if(visibleAt(item,camera,70))petalFlower(ctx,item,time,reduced);
      for(const comet of g.comets||[])if(visibleAt(comet,camera,600))cometHead(ctx,images,comet,time,reduced);
    }
    for(const fx of run.effects||[]){
      if(!FRONT_FX.has(fx.kind)||!(fx.life>0)||fx.age>=fx.life)continue;
      if(fx.kind!=='gift-learn'&&!visibleAt(fx,camera,fx.kind==='gift-chain'?320:200))continue;
      const t=clamp01(fx.age/fx.life);ctx.save();
      if(fx.kind==='gift-comet')cometRelease(ctx,images,fx,t,reduced);
      else if(fx.kind==='gift-chain')chain(ctx,fx,t);
      else if(fx.kind==='gift-aftershock')aftershock(ctx,images,fx,t,reduced);
      else if(fx.kind==='gift-orbit')nick(ctx,fx,t,30,reduced);
      else if(fx.kind==='gift-cut')nick(ctx,fx,t,52,reduced);
      else if(fx.kind==='gift-split')splitBurst(ctx,fx,t,reduced);
      else if(fx.kind==='gift-bloom')bloomRise(ctx,fx,t,reduced);
      else learned(ctx,run,fx,t,reduced);
      ctx.restore();
    }
  }
  ctx.restore();
}
