import {canvasFont} from './typography.mjs';
import {drawSprite} from './sprites.mjs';
import {sampleClip} from '../game/animation.mjs';
import {visibleAt} from './presentation.mjs';
import {ENERGY,halo,star,burst,softRing,taper,crescent} from './combat-vfx.mjs';
import {drawRadiance} from './raster-details.mjs';
import {COMBAT} from '../../content/game.mjs';
import {DANGER,TONES,GROUND,alpha,glyph,drawGlyph,hitWeight,tierProgress} from './decal.mjs';

const TAU=Math.PI*2;
const ease=t=>1-(1-Math.max(0,Math.min(1,t)))**3;
const groundKinds=new Set(['pulse','mend','impact','ward','step','restore','lantern','trail','solar-lance','lunar-nova']);
export function effectLayer(kind){return groundKinds.has(kind)?'ground':'front';}
export function selectEffects(effects,camera,reduced,ground){
  const layer=ground?'ground':'front',limit=reduced?40:96,selected=[];
  for(let i=effects.length-1;i>=0&&selected.length<limit;i--){
    const fx=effects[i];
    if(fx.kind==='impact')continue; // Live hazards own their exact radius and safe center.
    if(fx.kind.startsWith('gift-'))continue; // Passive gifts draw in their own layer (gift-vfx).
    if(effectLayer(fx.kind)!==layer||fx.age>=fx.life||fx.life<=0)continue;
    if(fx.kind==='solar-lance'){
      const endX=fx.x+Math.cos(fx.angle)*fx.reach,endY=fx.y+Math.sin(fx.angle)*fx.reach;
      if(Math.max(fx.x,endX)<camera.x-70||Math.min(fx.x,endX)>camera.x+camera.width+70||Math.max(fx.y,endY)<camera.y-70||Math.min(fx.y,endY)>camera.y+camera.height+70)continue;
    }else if(!visibleAt(fx,camera,310))continue;
    if(fx.kind==='trail'&&(reduced||i%3!==0)||fx.kind==='step'&&reduced)continue;
    selected.push(fx);
  }
  return selected.reverse();
}
const SOURCE={hero:ENERGY.gold,melee:ENERGY.gold,sunbreak:ENERGY.gold,pulse:ENERGY.gold,ally:ENERGY.pearl,sol:ENERGY.amber,npc:'#dfeaff'};

/* ---------- Zeyu: gold blade arcs and sun rays ---------- */
// Sunblade: smear, bright edge and tip flash. Combo 2 returns along the mirrored arc; combo 3 is
// the heavy finisher (Tier L): wider and brighter, cracking the ground ahead with a shock band.
function slash(ctx,images,fx,t,reduced){
  const combo=fx.combo===2||fx.combo===3?fx.combo:1,heavy=combo===3,span=heavy?1.7:1.35,R=heavy?118:100,W=heavy?38:28;
  const from=combo===2?span:-span,to=-from,x=fx.x,y=fx.y-16,a=fx.angle||0,fade=1-t;
  drawRadiance(ctx,images,'blade',x+Math.cos(a)*65,y+Math.sin(a)*65,heavy?300:240,t,a,reduced?0.3:heavy?0.75:0.55);
  if(heavy)groundCrack(ctx,fx,t,reduced,R);
  ctx.save();ctx.translate(x,y);ctx.rotate(a);
  const swing=reduced?1:ease(t/0.5),lead=from+(to-from)*swing,tail=reduced?from:from+(to-from)*ease(Math.max(0,(t-0.2)/0.7));
  if(heavy&&!reduced)halo(ctx,R*0.55,0,R*1.4,ENERGY.gold,fade*0.55);
  if(Math.abs(lead-tail)>0.02){
    const g=ctx.createRadialGradient(0,0,R-W,0,0,R+W*0.55);
    g.addColorStop(0,alpha(ENERGY.gold,0));g.addColorStop(0.45,alpha(ENERGY.amber,0.35*fade));g.addColorStop(0.72,alpha(ENERGY.gold,0.75*fade));g.addColorStop(0.86,alpha(ENERGY.white,0.95*fade));g.addColorStop(1,alpha(ENERGY.white,0));
    ctx.fillStyle=g;ctx.beginPath();crescent(ctx,0,0,R-W*0.15,tail,lead,2,W);ctx.fill();
    ctx.fillStyle=alpha(ENERGY.white,0.95*fade);ctx.beginPath();crescent(ctx,0,0,R+W*0.3,tail,lead,0.6,heavy?6:4.5);ctx.fill();
    if(!reduced){ctx.fillStyle=alpha(ENERGY.amber,0.75*fade);ctx.beginPath();crescent(ctx,0,0,R-W*0.62,tail+(to-from)*0.1,lead,0.5,2.4);crescent(ctx,0,0,R+W*0.62,tail+(to-from)*0.2,lead,0.5,1.8);ctx.fill();}
  }
  const tx=Math.cos(lead)*(R+W*0.3),ty=Math.sin(lead)*(R+W*0.3);
  if(t<0.6)star(ctx,tx,ty,(heavy?24:15)*(1-t/0.6)+4,alpha(ENERGY.white,1-t/0.6),lead);
  if(!reduced&&t>0.25)burst(ctx,tx,ty,(t-0.25)/0.75,ENERGY.gold,heavy?10:6,heavy?70:45,lead+(to>from?Math.PI/2:-Math.PI/2),1.4,'spark',heavy?7:5);
  ctx.restore();
}
// The finisher's ground crack: an irregular split that tapers away from the blow and glows
// at its core, with two short branches; a shock band runs out from the point of impact.
const CRACK=[[0,0],[15,2.5],[27,-1.5],[41,3],[52,0.5],[66,4],[79,1],[93,-2.5],[106,0.5],[121,-1.5],[138,1.5]];
const BRANCHES=[[5,[[0,0],[12,9],[20,17],[27,20]]],[8,[[0,0],[9,-7],[17,-15]]]];
function crackPath(ctx,points,w0,w1){
  const n=points.length-1;ctx.moveTo(points[0][0],points[0][1]-w0/2);
  for(let i=1;i<=n;i++)ctx.lineTo(points[i][0],points[i][1]-(w0+(w1-w0)*i/n)/2);
  for(let i=n;i>=0;i--)ctx.lineTo(points[i][0],points[i][1]+(w0+(w1-w0)*i/n)/2);ctx.closePath();
}
function groundCrack(ctx,fx,t,reduced,R){
  const grow=Math.min(1,t*4),fade=1-t,a=fx.angle||0,count=Math.max(2,Math.ceil(grow*CRACK.length)),main=CRACK.slice(0,count).map(([u,v])=>[26+u,v]);
  ctx.save();ctx.translate(fx.x,fx.y+GROUND);ctx.rotate(a);
  ctx.beginPath();crackPath(ctx,main,10,1.5);
  if(grow>0.6)for(const [at,branch] of BRANCHES){const [bx,by]=main[Math.min(at,main.length-1)];crackPath(ctx,branch.map(([u,v])=>[bx+u,by+v]),3.5,0.6);}
  ctx.fillStyle=alpha('#1e1409',0.72*fade);ctx.fill();
  ctx.beginPath();crackPath(ctx,main,3.6,0.5);ctx.fillStyle=alpha(ENERGY.gold,fade);ctx.fill();
  if(!reduced)halo(ctx,40,0,60,ENERGY.gold,fade*0.5);
  softRing(ctx,R*0.75,0,24+80*ease(t),20,ENERGY.gold,fade*0.85);
  if(!reduced)burst(ctx,R*0.75,0,t,'#d8c197',9,60,-Math.PI/2,TAU,'shard',5);
  ctx.restore();
}
// Sunbreak (Tier L): a fan of sun rays over the true hit cone and a crescent shockfront to its range.
function sunbreak(ctx,images,fx,t,reduced){
  const reach=COMBAT.sunbreak.range,cone=0.77,a=fx.angle||0,x=fx.x,y=fx.y-22,fade=1-t,grow=ease(t/0.45);
  drawRadiance(ctx,images,'sun',x+Math.cos(a)*130,y+Math.sin(a)*130,330,t,a,reduced?0.3:0.7);
  ctx.save();ctx.translate(x,y);ctx.rotate(a);
  ctx.beginPath();const rays=reduced?5:7;
  for(let i=0;i<rays;i++){const b=(i/(rays-1)-0.5)*cone*1.7,center=i===(rays-1)/2;taper(ctx,Math.cos(b)*18,Math.sin(b)*18,Math.cos(b)*reach*grow,Math.sin(b)*reach*grow,center?20:13,2);}
  const g=ctx.createRadialGradient(0,0,10,0,0,reach);g.addColorStop(0,alpha(ENERGY.white,0.85*fade));g.addColorStop(0.35,alpha(ENERGY.gold,0.6*fade));g.addColorStop(1,alpha(ENERGY.amber,0));
  ctx.fillStyle=g;ctx.fill();
  const front=50+(reach-50)*ease(t);
  ctx.beginPath();crescent(ctx,0,0,front,-cone,cone,4,26*fade+6,18);ctx.fillStyle=alpha(ENERGY.gold,0.7*fade);ctx.fill();
  ctx.beginPath();crescent(ctx,0,0,front+8*fade,-cone*0.92,cone*0.92,1,4,18);ctx.fillStyle=alpha(ENERGY.white,0.9*fade);ctx.fill();
  if(t<0.4)star(ctx,18,0,30*(1-t/0.4)**2+5,alpha(ENERGY.white,1-t/0.4),0.3);
  if(!reduced&&t>0.35){ctx.beginPath();for(let i=0;i<14;i++){const b=((i*0.618)%1-0.5)*cone*1.8,d=60+(reach-60)*((i*0.37)%1)*ease(t);glyph(ctx,'spark',Math.cos(b)*d,Math.sin(b)*d-18*(t-0.35),b,5*fade);}ctx.fillStyle=alpha(ENERGY.gold,fade);ctx.fill();}
  ctx.restore();
}
// Solar Lance (Tier L): a layered gold beam with a white-hot core, sun glints along it and a flare
// at the cover stop.
function solarLance(ctx,images,fx,t,reduced){
  const reach=Math.min(COMBAT.solarLance.range,fx.reach),width=COMBAT.solarLance.width,fade=1-t;
  if(reach<=0)return;
  ctx.translate(fx.x,fx.y-18);ctx.rotate(fx.angle);
  if(!reduced)halo(ctx,0,0,60,ENERGY.gold,fade*0.8);
  // Clip the painted ribbon to the collision trace, including a stop at cover.
  ctx.beginPath();ctx.rect(-4,-width*2,reach+4,width*4);ctx.clip();
  const wide=ctx.createLinearGradient(0,0,reach,0);wide.addColorStop(0,alpha(ENERGY.gold,0.42*fade));wide.addColorStop(1,alpha(ENERGY.amber,0.14*fade));
  ctx.fillStyle=wide;ctx.beginPath();taper(ctx,0,0,reach,0,width*1.9*(1-0.4*t),22*fade+6);ctx.fill();
  const g=ctx.createLinearGradient(0,0,reach,0);g.addColorStop(0,alpha(ENERGY.gold,0.85*fade));g.addColorStop(0.6,alpha(ENERGY.gold,0.6*fade));g.addColorStop(1,alpha(ENERGY.pearl,0.3*fade));
  ctx.fillStyle=g;ctx.beginPath();taper(ctx,0,0,reach,0,width*(1-0.5*t),12*fade+4);ctx.fill();
  ctx.fillStyle=alpha(ENERGY.white,0.95*fade);ctx.beginPath();taper(ctx,0,0,reach,0,7*fade+2,3);ctx.fill();
  ctx.beginPath();const glints=reduced?2:Math.ceil(reach/110);
  for(let i=0;i<glints;i++){const d=(i+0.55)/glints*reach,twinkle=reduced?1:0.6+0.4*Math.sin(t*18+i*2.1);glyph(ctx,'cosmos',d,(i%2?1:-1)*width*0.35,t*2+i,(13*fade+4)*twinkle);}
  ctx.fillStyle=alpha(ENERGY.white,fade);ctx.fill();
  if(!reduced){
    drawRadiance(ctx,images,'contact',reach-12,0,110,t,0,0.7);
    if(t>0.3){ctx.beginPath();for(let i=0;i<Math.ceil(reach/60);i++){const d=(i+0.5)*60,rise=(t-0.3)*40*(1+(i%3)*0.4);glyph(ctx,'spark',d,(i%2?1:-1)*(8+rise),i%2?Math.PI/2:-Math.PI/2,4*fade);}ctx.fillStyle=alpha(ENERGY.gold,fade);ctx.fill();}
  }
  star(ctx,reach-6,0,16*fade+4,alpha(ENERGY.white,fade),t*2);
}
// Dawn Pulse, a restored well and a lantern burst share one wave: flash, front to the true reach, rays, embers.
function wave(ctx,images,fx,t,reduced,radius,tone,radiance){
  const x=fx.x,y=fx.y+GROUND,r=radius*ease(t),fade=1-t;
  if(radiance)drawRadiance(ctx,images,radiance,x,y-GROUND,radius*2.4,t,0,reduced?0.25:0.55);
  if(t<0.35){const g=ctx.createRadialGradient(x,y,0,x,y,radius*0.65);g.addColorStop(0,alpha(tone.glow,0.5*(1-t/0.35)));g.addColorStop(1,alpha(tone.glow,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,radius*0.65,0,TAU);ctx.fill();}
  softRing(ctx,x,y,r,28,tone.rim,fade**0.8);softRing(ctx,x,y,r*0.86,12,tone.ink,fade*0.8);
  ctx.beginPath();const rays=reduced?6:12;
  for(let i=0;i<rays;i++){const a=i*TAU/rays+(reduced?0:t*0.4);taper(ctx,x+Math.cos(a)*r*0.6,y+Math.sin(a)*r*0.6,x+Math.cos(a)*r*0.98,y+Math.sin(a)*r*0.98,7,1);}
  ctx.fillStyle=alpha(tone.ink,0.75*fade);ctx.fill();
  if(!reduced&&t>0.25){ctx.beginPath();for(let i=0;i<12;i++){const a=i*2.4,d=r*((i*0.37)%1);glyph(ctx,'spark',x+Math.cos(a)*d,y+Math.sin(a)*d-30*(t-0.25),-Math.PI/2,4.5*fade);}ctx.fillStyle=alpha(ENERGY.white,0.85*fade);ctx.fill();}
}

/* ---------- Dawnweaver: pearl petals and moon crescents ---------- */
function lunarNova(ctx,images,fx,t,reduced){
  const radius=COMBAT.lunarNova.range,r=radius*ease(t),x=fx.x,y=fx.y+GROUND,fade=1-t;
  ctx.save();ctx.beginPath();ctx.arc(x,y,radius+6,0,TAU);ctx.clip();
  drawRadiance(ctx,images,'mend',x,y,radius*2,t,0,reduced?0.2:0.4);
  softRing(ctx,x,y,r,30,ENERGY.pearl,fade);softRing(ctx,x,y,r*0.8,10,ENERGY.white,fade*0.7);
  const turn=reduced?0:t*2.4;ctx.beginPath();
  for(let i=0;i<6;i++){const a=turn+i*TAU/6;glyph(ctx,'eclipse',x+Math.cos(a)*r*0.92,y+Math.sin(a)*r*0.92,a,18*(1-t*0.4));}
  ctx.fillStyle=alpha(ENERGY.pearl,0.9*fade);ctx.fill();
  if(!reduced){ctx.beginPath();for(let i=0;i<16;i++){const a=i*TAU/16-turn*0.6,d=r*(0.35+0.55*((i*0.618)%1));glyph(ctx,'petal',x+Math.cos(a)*d,y+Math.sin(a)*d,a+t*3,6*fade+1);}ctx.fillStyle=alpha(ENERGY.white,0.8*fade);ctx.fill();}
  ctx.restore();
}
function mend(ctx,images,fx,t,reduced){
  const x=fx.x,y=fx.y,fade=1-t;
  if(fx.hostile){
    // An enemy restoring its kin: the map's leaves rise, never in the friendly pearl.
    drawRadiance(ctx,images,'hostile',x,y-35,170,t,0,reduced?0.35:0.75);
    if(!reduced){ctx.beginPath();for(let i=0;i<10;i++){const a=i*TAU/10+t*3;glyph(ctx,'thorn',x+Math.cos(a)*30,y+10-t*(55+i*4),a,5*fade+1);}ctx.fillStyle=alpha(ENERGY.thorn,0.9*fade);ctx.fill();}
    return;
  }
  drawRadiance(ctx,images,'mend',x,y-35,170,t,0,reduced?0.35:0.75);
  softRing(ctx,x,y+GROUND,30+22*ease(t),12,ENERGY.pearl,fade);
  if(!reduced){ctx.beginPath();for(let i=0;i<10;i++){const a=i*TAU/10+t*5,d=26+8*Math.sin(i);glyph(ctx,'petal',x+Math.cos(a)*d,y+12-t*(62+i*4)+Math.sin(a)*8,a+1.2,6*fade+1.5);}ctx.fillStyle=alpha(ENERGY.pearl,0.9*fade);ctx.fill();}
  drawGlyph(ctx,'eclipse',x,y-96-10*t,-Math.PI/2,9*Math.sin(Math.PI*Math.min(1,t*1.6))+1,alpha(ENERGY.white,0.9*fade));
}

/* ---------- Sol: amber comets and sparks ---------- */
function solVolley(ctx,images,fx,t,reduced){
  ctx.translate(fx.x,fx.y-16);ctx.rotate(fx.angle||0);const fade=1-t;
  // Launch flare, then three comets fanning out with tails that shed sparks.
  if(t<0.35){halo(ctx,0,0,48,ENERGY.amber,(1-t/0.35)*0.9);star(ctx,6,0,22*(1-t/0.35)+4,alpha(ENERGY.white,1-t/0.35),0.3);}
  const heads=[-1,0,1].map(side=>{const b=side*0.3,d=35+80*ease(t);return [b,Math.cos(b)*d,Math.sin(b)*d];});
  const g=ctx.createLinearGradient(0,0,115,0);g.addColorStop(0,alpha(ENERGY.amber,0));g.addColorStop(1,alpha(ENERGY.amber,0.95*fade));
  ctx.fillStyle=g;ctx.beginPath();for(const [b,hx,hy] of heads){taper(ctx,Math.cos(b)*6,Math.sin(b)*6,hx,hy,1,11);ctx.moveTo(hx+6.5,hy);ctx.arc(hx,hy,6.5,0,TAU);}ctx.fill();
  ctx.beginPath();for(const [,hx,hy] of heads){ctx.moveTo(hx+3,hy);ctx.arc(hx,hy,3,0,TAU);}ctx.fillStyle=alpha(ENERGY.white,fade);ctx.fill();
  if(!reduced){for(const [b,hx,hy] of heads)drawRadiance(ctx,images,'comet',hx,hy,70,t,b,0.55);ctx.beginPath();for(const [b,hx,hy] of heads)for(let k=1;k<=3;k++)glyph(ctx,'spark',hx-Math.cos(b)*k*13+Math.sin(k*2.1)*4,hy-Math.sin(b)*k*13+Math.cos(k*1.7)*4,b,4*(1-k*0.2));ctx.fillStyle=alpha(ENERGY.white,0.85*fade);ctx.fill();}
}
// Sol's leap lands (Tier M): three amber claw comets rake across the target.
function solBite(ctx,fx,t,reduced){
  const a=(fx.angle||0)+Math.PI/2,x=fx.x,y=fx.y-20,fade=1-t,draw=Math.min(1,t/0.3),c=Math.cos(a),n=Math.sin(a),f=Math.cos(fx.angle||0),g=Math.sin(fx.angle||0);
  ctx.beginPath();
  for(let i=-1;i<=1;i++){const ox=f*i*9,oy=g*i*9,len=26*draw;taper(ctx,x+ox-c*26,y+oy-n*26,x+ox-c*26+c*len*2,y+oy-n*26+n*len*2,1.5,6);}
  ctx.fillStyle=alpha(ENERGY.amber,0.95*fade);ctx.fill();
  ctx.beginPath();for(let i=-1;i<=1;i++){const ox=f*i*9,oy=g*i*9,len=26*draw;taper(ctx,x+ox-c*22,y+oy-n*22,x+ox-c*22+c*len*1.8,y+oy-n*22+n*len*1.8,0.5,2);}
  ctx.fillStyle=alpha(ENERGY.white,0.9*fade);ctx.fill();
  if(!reduced)burst(ctx,x,y,t,ENERGY.amber,7,40,fx.angle||0,1.8,'spark',5);
}
function ward(ctx,fx,t,reduced){
  const x=fx.x,y=fx.y-14,fade=1-t;
  softRing(ctx,x,y,36+18*ease(t),14,ENERGY.amber,fade);
  const turn=t*5;ctx.beginPath();for(let i=0;i<3;i++){const a=turn+i*TAU/3,r=40+12*t;glyph(ctx,'cosmos',x+Math.cos(a)*r,y+Math.sin(a)*r*0.8,0,6*fade+2);}
  ctx.fillStyle=alpha(ENERGY.white,fade);ctx.fill();
  if(!reduced)burst(ctx,x,y,t,ENERGY.amber,8,60,0,TAU,'spark',4);
}

/* ---------- Tier S feedback and impacts ---------- */
function contact(ctx,fx,s,reduced){
  const a=fx.angle||0,fade=1-s;
  if(fx.hostile){star(ctx,fx.x,fx.y,10*fade+3,alpha(DANGER.light,fade),a);if(!reduced)burst(ctx,fx.x,fx.y,s,DANGER.hot,4,22,a+Math.PI,1.6,'spark',4);return;}
  if(fx.blocked){star(ctx,fx.x,fx.y,8*fade+2,alpha('#d3dad6',fade),a+0.4);if(!reduced)burst(ctx,fx.x,fx.y,s,'#bcc4c2',4,20,a+Math.PI,1.8,'shard',4);return;}
  const color=SOURCE[fx.source]||ENERGY.gold;
  if(fx.moon){drawGlyph(ctx,'eclipse',fx.x,fx.y,a,16*fade+4,alpha(ENERGY.white,fade));if(!reduced)burst(ctx,fx.x,fx.y,s,ENERGY.pearl,5,26,a,1.4,'petal',5);return;}
  star(ctx,fx.x,fx.y,14*fade+3,alpha(color,fade),a);
  if(!reduced)burst(ctx,fx.x,fx.y,s,color,3,20,a,1.1,'spark',5);
}
function muzzle(ctx,fx,s){
  const a=fx.angle||0,x=fx.x+Math.cos(a)*22,y=fx.y+Math.sin(a)*22,fade=1-s;
  if(fx.hostile){star(ctx,x,y,9*fade+2,alpha(DANGER.light,fade),a);return;}
  if(fx.moon){drawGlyph(ctx,'eclipse',x,y,a,13*fade+3,alpha(ENERGY.white,fade));return;}
  if(fx.source==='ally')drawGlyph(ctx,'petal',x,y,a,10*fade+2,alpha(ENERGY.pearl,fade));
  else if(fx.source==='sol')drawGlyph(ctx,'spark',x,y,a,12*fade+3,alpha(ENERGY.amber,fade));
  else drawGlyph(ctx,'rune',x,y,a,11*fade+3,alpha(fx.source==='npc'?SOURCE.npc:ENERGY.white,fade));
}
// Heavy blows (Sunblade, Sunbreak, Dawn Pulse) land with gold rays sized by damage; guard-absorbed
// hits clink in steel; light projectile hits are carried by their contact flash alone.
function landedHit(ctx,fx,t,reduced){
  const weight=hitWeight(fx),fade=1-t;
  if(weight==='guard'){
    ctx.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6+0.3,d=10+14*ease(t);glyph(ctx,'shard',fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d,a,5*fade+1);}
    ctx.fillStyle=alpha('#bcd4dc',fade);ctx.fill();star(ctx,fx.x,fx.y,9*fade+2,alpha(ENERGY.white,fade),0.4);return;
  }
  if(weight!=='heavy')return;
  const size=Math.min(1.35,0.75+(fx.value||20)/150),r=(22+16*ease(t))*size;
  if(!reduced)halo(ctx,fx.x,fx.y,r*1.3,ENERGY.gold,fade*0.7);
  ctx.beginPath();for(let i=0;i<8;i++){const a=i*TAU/8+0.2;taper(ctx,fx.x+Math.cos(a)*r*0.3,fx.y+Math.sin(a)*r*0.3,fx.x+Math.cos(a)*r,fx.y+Math.sin(a)*r,6*size*fade+1,1);}
  ctx.fillStyle=alpha(ENERGY.gold,0.9*fade);ctx.fill();
  star(ctx,fx.x,fx.y,18*size*fade+4,alpha(ENERGY.white,fade),0.45);
}
function guardBreak(ctx,fx,t,reduced,uiScale){
  const fade=1-t;
  if(!fx.boss){
    star(ctx,fx.x,fx.y-25,26*(1-t)**2+4,alpha(ENERGY.white,fade),Math.PI/4);
    if(!reduced){ctx.beginPath();for(let i=0;i<9;i++){const a=i*TAU/9-Math.PI/2,d=16+60*ease(t);glyph(ctx,'shard',fx.x+Math.cos(a)*d,fx.y-25+Math.sin(a)*d+20*t*t,a+t*3,8*fade+2);}ctx.fillStyle=alpha('#dec99b',fade);ctx.fill();ctx.strokeStyle=alpha(ENERGY.white,0.7*fade);ctx.lineWidth=1;ctx.stroke();}
    else softRing(ctx,fx.x,fx.y-25,24+40*t,10,'#dec99b',fade);
  }
  ctx.fillStyle=ENERGY.white;ctx.font=canvasFont('small',uiScale);ctx.textAlign='center';ctx.strokeStyle='#17110f';ctx.lineWidth=4;
  const y=fx.y-(fx.boss?120:65)-20*t;ctx.strokeText('Guard broken',fx.x,y);ctx.fillText('Guard broken',fx.x,y);
}
export function drawEffects(ctx,images,run,camera,reduced,ground,uiScale=1){
  const selected=selectEffects(run.effects,camera,reduced,ground),secondary=selected.filter(fx=>fx.kind==='hit'||fx.kind==='cover'||fx.kind==='contact').length;
  const secondaryOpacity=Math.min(1,Math.sqrt(18/Math.max(1,secondary)));
  for(const fx of selected){
    const t=Math.max(0,fx.age/fx.life);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(fx.kind==='hit'||fx.kind==='cover'||fx.kind==='contact')ctx.globalAlpha*=secondaryOpacity;
    if(fx.kind==='solar-lance')solarLance(ctx,images,fx,t,reduced);
    else if(fx.kind==='lunar-nova')lunarNova(ctx,images,fx,t,reduced);
    else if(fx.kind==='sol-volley')solVolley(ctx,images,fx,t,reduced);
    else if(fx.kind==='sol-bite')solBite(ctx,fx,t,reduced);
    else if(fx.kind==='pulse')wave(ctx,images,fx,t,reduced,210,{rim:ENERGY.white,ink:ENERGY.gold,glow:ENERGY.gold},'sun');
    else if(fx.kind==='restore')wave(ctx,images,fx,t,reduced,230,{rim:TONES.restored.rim,ink:TONES.recovery.ink,glow:TONES.restored.glow},null);
    else if(fx.kind==='lantern')wave(ctx,images,fx,t,reduced,170,{rim:TONES.lantern.rim,ink:TONES.lantern.ink,glow:TONES.lantern.glow},'sun');
    else if(fx.kind==='slash')slash(ctx,images,fx,t,reduced);
    else if(fx.kind==='sunbreak')sunbreak(ctx,images,fx,t,reduced);
    else if(fx.kind==='mend')mend(ctx,images,fx,t,reduced);
    else if(fx.kind==='ward')ward(ctx,fx,t,reduced);
    else if(fx.kind==='trail'){
      drawSprite(ctx,images,sampleClip('heroReactions','dash',0.08),fx.x,fx.y,98,fx.faceX,(1-t)*0.27);
      ctx.beginPath();taper(ctx,fx.x-fx.faceX*48,fx.y-20,fx.x,fx.y-20,1,5);ctx.fillStyle=alpha(ENERGY.gold,0.55*(1-t));ctx.fill();
    }else if(fx.kind==='step'){
      const s=tierProgress(fx);if(s!==null){const g=ctx.createRadialGradient(fx.x,fx.y,0,fx.x,fx.y,14);g.addColorStop(0,alpha('#d8c197',0.3*(1-s)));g.addColorStop(1,alpha('#d8c197',0));ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(fx.x,fx.y,6+10*s,3+4*s,0,0,TAU);ctx.fill();}
    }else if(fx.kind==='guard-break')guardBreak(ctx,fx,t,reduced,uiScale);
    else if(fx.kind==='contact'){const s=tierProgress(fx);if(s!==null)contact(ctx,fx,s,reduced);}
    else if(fx.kind==='muzzle'){const s=tierProgress(fx);if(s!==null)muzzle(ctx,fx,s);}
    else if(fx.kind==='hit')landedHit(ctx,fx,t,reduced);
    else if(fx.kind==='cover'){const s=tierProgress(fx);if(s!==null){star(ctx,fx.x,fx.y,8*(1-s)+2,alpha('#d6d2c4',1-s),0.4);if(!reduced)burst(ctx,fx.x,fx.y,s,'#b9b2a1',4,22,-Math.PI/2,2.4,'shard',4);}}
    else if(fx.kind==='outgoing'){
      const text=(fx.absorbed?'Guard ':'')+'−'+fx.value;
      ctx.fillStyle=fx.absorbed?'#bed5d8':fx.source==='ally'?'#e1efff':'#ffe6a5';ctx.font=canvasFont('small',uiScale);ctx.textAlign='center';ctx.strokeStyle='#201b20';ctx.lineWidth=3;ctx.strokeText(text,fx.x,fx.y-30*t);ctx.fillText(text,fx.x,fx.y-30*t);
    }else if(fx.kind==='damage'){
      const y=fx.y-(fx.keeper?40*uiScale:0)-25*t;
      ctx.fillStyle='#ffd2ba';ctx.font=canvasFont('number',uiScale);ctx.textAlign='center';ctx.strokeStyle='#291b1a';ctx.lineWidth=4;ctx.strokeText('−'+fx.value,fx.x,y);ctx.fillText('−'+fx.value,fx.x,y);
    }
    ctx.restore();
  }
}
