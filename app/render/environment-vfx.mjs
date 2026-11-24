// Map-rule visuals (root patches, bell tolls, still columns, vents, falling stars). Owned by the world-rules worker.
// Rule zones are Tier M ground decals in a cool Choir violet while the rule is against the party and in a
// friendly tone once it turns (mint mending, gold light, amber warmth, pearl starlight). Strikes that can
// hurt the party use the one danger language (dangerGround/dangerTop, danger impact); strikes that only
// hit Hollow use a friendly decal with the same centre-to-rim timing fill. The turn of a rule and each
// eruption or star are Tier L moments. Reduced effects keeps every shape and timing fill, drops particles.
import {RULES,RULE_ICONS} from '../../content/environment.mjs';
import {currentRule,unitAt} from '../game/environment.mjs';
import {visibleAt} from './presentation.mjs';
import {drawDecal,dangerGround,dangerTop,hazardProgress,caption,alpha,glyph,glyphRing,drawGlyph,lightPillar,TONES,ACCENT,DANGER,GROUND} from './decal.mjs';
import {halo,softRing,star,burst,taper,drawHazardImpact,ENERGY} from './combat-vfx.mjs';

const TAU=Math.PI*2,clamp01=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0)),ease=t=>1-(1-clamp01(t))**3;
// The Choir's hold on a rule: a cool violet, clearly neither danger red nor friendly gold.
export const CHOIR={rim:'#ece6ff',ink:'#ab9fe0',floor:'#6c5fa0',deep:'#140f22',glow:'#cfc4ff'};
const PEARL={rim:'#f7fbff',ink:'#d8edff',floor:'#b9d3f4',deep:'#0f1a2d',glow:'#eef6ff'};
const KIND={roots:TONES.recovery,echo:TONES.objective,still:TONES.restored,heat:TONES.lantern,stars:PEARL};
const FLIP=1.6;

/* ---------- Rule icons (HUD chip and canvas) ---------- */
const paths=new Map();
function iconPath(icon){
  if(typeof Path2D!=='function'||!RULE_ICONS[icon])return null;
  if(!paths.has(icon))paths.set(icon,new Path2D(RULE_ICONS[icon].path));
  return paths.get(icon);
}
export function drawRuleIcon(ctx,icon,x,y,size=24,color=RULE_ICONS[icon]?.color||'#ffffff'){
  const path=iconPath(icon);if(!path)return;
  ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/24,size/24);ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(path);ctx.restore();
}
// Inline SVG for the HUD rule chip, in the same format as symbolSvg.
export function ruleIconSvg(icon){
  const def=RULE_ICONS[icon];if(!def)return '';
  return `<svg class="rule-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="color:${def.color}"><path d="${def.path}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function medallion(ctx,icon,x,y,tone,scale=1){
  const r=11*scale;
  ctx.fillStyle=alpha(tone.deep,0.9);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  ctx.strokeStyle=alpha(tone.ink,0.95);ctx.lineWidth=1.4*scale;ctx.stroke();
  drawRuleIcon(ctx,icon,x,y,15*scale,tone.rim);
}
const toneOf=s=>s.phase==='kind'?KIND[s.id]:CHOIR;

/* ---------- Grasping Roots ---------- */
// Roots reach in from the rim; against the party they are dark bark with thorns, with it they are green.
function tendrils(ctx,x,y,r,kind,time,reduced,seed){
  const sway=reduced?0:Math.sin(time*1.3+seed)*0.08;
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=seed*1.3+i*TAU/6+sway,b=a+0.55*(i%2?1:-1),sx=x+Math.cos(a)*r*0.94,sy=y+Math.sin(a)*r*0.94,ex=x+Math.cos(a+0.2)*r*0.28,ey=y+Math.sin(a+0.2)*r*0.28;
    ctx.moveTo(sx,sy);ctx.quadraticCurveTo(x+Math.cos(b)*r*0.62,y+Math.sin(b)*r*0.62,ex,ey);
  }
  ctx.strokeStyle=kind?'#20321ccc':'#1d1614d9';ctx.lineWidth=6;ctx.stroke();
  ctx.strokeStyle=kind?alpha('#8fd08a',0.75):alpha(ACCENT.thorn,0.45);ctx.lineWidth=2.2;ctx.stroke();
  if(!kind){ctx.beginPath();for(let i=0;i<6;i++){const a=seed*1.3+i*TAU/6+sway+0.12,d=r*0.66;glyph(ctx,'thorn',x+Math.cos(a)*d,y+Math.sin(a)*d,a+Math.PI/2,4.2);}ctx.fillStyle=alpha(ACCENT.thorn,0.8);ctx.fill();}
}
// Roots curled around the feet of a Hollow standing in a patch: fed against you, held with you.
function wrapFeet(ctx,e,kind,time,reduced){
  const x=e.x,y=e.y+GROUND,rx=(e.radius||18)+8,ry=rx*0.42,turn=reduced?0:time*0.8;
  ctx.beginPath();
  for(let i=0;i<3;i++){const a=turn+i*TAU/3;ctx.moveTo(x+Math.cos(a)*rx,y+Math.sin(a)*ry);ctx.ellipse(x,y,rx,ry,0,a,a+1.3);}
  ctx.strokeStyle=kind?alpha('#b9ef9c',0.9):alpha('#2a201c',0.85);ctx.lineWidth=kind?3.4:3;ctx.stroke();
  if(kind){ctx.strokeStyle=alpha(TONES.restored.ink,0.55);ctx.lineWidth=1.2;ctx.stroke();}
}
function groundRoots(ctx,run,s,camera,reduced,time,scale){
  const kind=s.phase==='kind',tone=toneOf(s);
  for(const u of s.units){
    if(!visibleAt(u,camera,u.radius+40))continue;
    const x=u.x,y=u.y+GROUND;
    drawDecal(ctx,x,y,u.radius,tone,{strength:kind?0.9:0.78,reduced,time,rotation:u.id*0.4,glint:kind&&!!unitAt(s,run.player)&&unitAt(s,run.player).id===u.id});
    tendrils(ctx,x,y,u.radius,kind,time,reduced,u.id);
    medallion(ctx,'roots',x,y+u.radius,tone,scale);
  }
  for(const e of run.enemies)if(e.hp>0&&!(e.warning>0)&&visibleAt(e,camera,60)&&unitAt(s,e))wrapFeet(ctx,e,kind,time,reduced);
}
// Rising mend motes: on the party in a kind patch, on wounded Hollow in a hostile one.
function topRoots(ctx,run,s,camera,reduced,time){
  if(reduced)return;
  const kind=s.phase==='kind',bodies=kind?[run.player,...(run.party||[]).filter(a=>a.hp>0&&!a.downed&&(a.kind!=='sol'||a.active)),...run.campaign.npcs.filter(n=>n.state==='active'&&n.hp>0)]:run.enemies.filter(e=>e.hp>0&&!(e.warning>0)&&!e.boss&&e.hp<e.maxHp);
  ctx.beginPath();
  for(const b of bodies){
    if(!visibleAt(b,camera,40)||!unitAt(s,b))continue;
    for(let i=0;i<3;i++){const t=(time*0.7+i/3+(b.x%7)*0.1)%1,px=b.x+Math.sin(i*2.1+time)*16,py=b.y-14-t*56;glyph(ctx,kind?'petal':'thorn',px,py,-Math.PI/2,6.5*(1-t*0.5));}
  }
  ctx.fillStyle=kind?alpha(TONES.recovery.glow,0.85):alpha('#a7d27c',0.75);ctx.fill();
}

/* ---------- The Echo ---------- */
function bellStone(ctx,u,run,kind,ready,time,reduced){
  const x=u.x,y=u.y+GROUND,since=run.time-u.rang,swing=since>=0&&since<1.4&&!reduced?Math.sin(since*15)*0.5*Math.exp(-since*3):0;
  ctx.save();ctx.translate(x,y);ctx.scale(1.35,1.35);ctx.translate(-x,-y);
  // Plinth, post and crossbar in worn causeway stone.
  ctx.fillStyle='#2b2c33';ctx.beginPath();ctx.ellipse(x,y,22,9,0,0,TAU);ctx.fill();
  ctx.fillStyle='#565863';ctx.beginPath();ctx.ellipse(x,y-3,18,7,0,0,TAU);ctx.fill();
  ctx.fillStyle='#6b6e78';ctx.fillRect(x-3.5,y-58,7,55);ctx.fillRect(x-15,y-60,30,5);
  ctx.strokeStyle='#1a1b20';ctx.lineWidth=1.2;ctx.strokeRect(x-3.5,y-58,7,55);ctx.strokeRect(x-15,y-60,30,5);
  // The bell: tarnished while the Choir holds it, bright bronze once it rings for the party.
  ctx.save();ctx.translate(x,y-55);ctx.rotate(swing);
  ctx.beginPath();ctx.moveTo(-11,24);ctx.quadraticCurveTo(-9,20,-8,9);ctx.arc(0,9,8,Math.PI,0);ctx.quadraticCurveTo(9,20,11,24);ctx.closePath();
  const bronze=kind?(ready?'#e6b765':'#a88a55'):'#8d8a80';
  const g=ctx.createLinearGradient(-10,0,10,24);g.addColorStop(0,'#fff3cf');g.addColorStop(0.3,bronze);g.addColorStop(1,'#3a2c18');
  ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#1f160c';ctx.lineWidth=1.4;ctx.stroke();
  ctx.fillStyle='#2a1f12';ctx.beginPath();ctx.arc(0,25,2.6,0,TAU);ctx.fill();
  ctx.restore();ctx.restore();
  if(kind&&ready)halo(ctx,x,y-62,40,ENERGY.gold,reduced?0.35:0.3+0.15*Math.sin(time*4+u.id));
}
function groundEcho(ctx,run,s,camera,reduced,time,scale){
  const def=RULES[run.areaIndex],kind=s.phase==='kind';
  for(const wave of s.waves){
    const k=wave.r/wave.reach,after=wave.r>=wave.reach?clamp01((run.time-wave.born-wave.reach/def.toll.speed)/0.4):0,strength=(1-k*0.55)*(1-after);
    if(strength<=0||!visibleAt(wave,camera,wave.r+40))continue;
    const color=wave.phase==='kind'?ENERGY.gold:CHOIR.glow,y=wave.y+GROUND;
    softRing(ctx,wave.x,y,Math.max(4,wave.r),wave.unit===null?30:22,color,(reduced?0.5:0.75)*strength);
    if(!reduced&&wave.r>20)glyphRing(ctx,'chime',wave.x,y,wave.r,Math.min(48,Math.max(8,Math.round(wave.r/40))),4,alpha(wave.phase==='kind'?ENERGY.white:ACCENT.chime,0.8*strength),wave.id*0.3);
  }
  for(const u of s.units){
    if(!visibleAt(u,camera,90))continue;
    const ready=kind&&run.time>=u.readyAt,tone=!kind?CHOIR:ready?TONES.objective:TONES.locked;
    const cooling=kind&&!ready?1-clamp01((u.readyAt-run.time)/def.toll.strikeCooldown):null;
    drawDecal(ctx,u.x,u.y+GROUND,u.radius+12,tone,{progress:cooling,strength:0.85,reduced,time,glint:ready&&Math.hypot(run.player.x-u.x,run.player.y-u.y)<220});
    bellStone(ctx,u,run,kind,ready,time,reduced);
  }
}
// Hastened Hollow and quickened friends carry chevrons at their feet; staggered Hollow see stars.
function chevrons(ctx,b,color){
  const a=Math.atan2(b.vy||0,b.vx||(b.faceX||1)),x=b.x,y=b.y+GROUND+2;
  ctx.beginPath();for(const back of [10,22])glyph(ctx,'ember',x-Math.cos(a)*back,y-Math.sin(a)*back*0.5,a,6);ctx.fillStyle=color;ctx.fill();
}
function topEcho(ctx,run,s,camera,reduced,time){
  const t=run.time;
  for(const e of run.enemies){
    if(!(e.hp>0)||e.warning>0||!visibleAt(e,camera,60))continue;
    if(e.echoHaste>t)chevrons(ctx,e,alpha(CHOIR.glow,0.9));
    if(e.echoDaze>t){
      const top=e.y-(e.boss?(e.bossRank==='champion'?178:236):e.lieutenant?136:108),turn=reduced?0.5:time*5;
      ctx.beginPath();for(let i=0;i<3;i++){const a=turn+i*TAU/3;glyph(ctx,e.boss?'chime':'cosmos',e.x+Math.cos(a)*(e.boss?30:16),top+Math.sin(a)*5,0,e.boss?6:5);}
      ctx.fillStyle=alpha(ENERGY.white,0.95);ctx.fill();
    }
  }
  for(const b of [run.player,...(run.party||[]),...run.campaign.npcs])if(b&&b.echoQuick>t&&!(b.hp<=0)&&visibleAt(b,camera,40))chevrons(ctx,b,alpha(ENERGY.gold,0.9));
}

/* ---------- Stillness ---------- */
function groundStill(ctx,run,s,camera,reduced,time,scale){
  const tone=toneOf(s),inside=unitAt(s,run.player);
  for(const u of s.units){
    if(!visibleAt(u,camera,u.radius+30))continue;
    drawDecal(ctx,u.x,u.y+GROUND,u.radius,tone,{strength:0.85,reduced,time,rotation:u.id*0.5,glint:s.phase==='kind'&&inside?.id===u.id});
    medallion(ctx,'column',u.x,u.y+GROUND+u.radius,tone,scale);
  }
}
// The column itself is a shaft of still air (Choir) or of remembered names (gold), drawn over bodies.
function topStill(ctx,run,s,camera,reduced,time){
  const kind=s.phase==='kind';
  for(const u of s.units){
    if(!visibleAt(u,camera,u.radius+60))continue;
    const x=u.x,y=u.y+GROUND;
    lightPillar(ctx,x,y,u.radius*0.72,330,kind?'#ffe2a0':'#cfc6ff',kind?'#fff5d3':'#8f82c8',kind?0.42:0.3);
    if(reduced)continue;
    ctx.beginPath();
    if(kind)for(let i=0;i<7;i++){const t=(time*0.35+i/7)%1,px=x+Math.sin(i*2.7)*u.radius*0.5,py=y-20-t*280;glyph(ctx,'rune',px,py,-Math.PI/2,5*(1-t*0.5));}
    // Dust that hangs nearly still: the column's hush.
    else for(let i=0;i<9;i++){const px=x+Math.sin(i*2.3)*u.radius*0.55+Math.sin(time*0.2+i)*2,py=y-30-((i*37)%240);glyph(ctx,'spark',px,py,0,2.6);}
    ctx.fillStyle=kind?alpha(ENERGY.white,0.85):alpha(CHOIR.rim,0.55);ctx.fill();
  }
  // Light carried through a kind column: a gold glint rides the empowered shot.
  if(kind)for(const shot of run.shots)if(shot.named&&visibleAt(shot,camera,30))star(ctx,shot.x,shot.y-20,reduced?6:6+2*Math.sin(time*20),alpha(ENERGY.gold,0.95),reduced?0:time*6);
  else for(const shot of run.shots)if(!reduced&&visibleAt(shot,camera,30)&&unitAt(s,shot))halo(ctx,shot.x,shot.y-20,16,CHOIR.glow,0.5);
}

/* ---------- Furnace Heat ---------- */
function vent(ctx,u,heat,kind,time,reduced){
  const x=u.x,y=u.y+GROUND,r=u.radius;
  ctx.fillStyle='#120e0c';ctx.beginPath();ctx.arc(x,y,r+4,0,TAU);ctx.fill();
  const iron=ctx.createRadialGradient(x-r*0.3,y-r*0.3,2,x,y,r);iron.addColorStop(0,'#5d524a');iron.addColorStop(1,'#26201c');
  ctx.fillStyle=iron;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  ctx.strokeStyle='#7d6c5c';ctx.lineWidth=1.6;ctx.stroke();
  // Slits glow as the next breath of the furnace nears.
  const glowColor=kind?'#ffd27a':'#ff7a45',k=clamp01(heat),flicker=reduced?0:0.15*Math.sin(time*13+u.id);
  ctx.save();ctx.beginPath();ctx.arc(x,y,r-4,0,TAU);ctx.clip();
  for(let i=-2;i<=2;i++){ctx.fillStyle=alpha(glowColor,0.25+0.65*k+flicker*k);ctx.fillRect(x-r,y+i*9-2,r*2,4);}
  ctx.restore();
  if(k>0.2)halo(ctx,x,y,r*1.8,glowColor,0.25*k);
}
function groundHeat(ctx,run,s,camera,reduced,time,scale){
  const def=RULES[run.areaIndex],kind=s.phase==='kind';
  for(const u of s.units){
    if(!visibleAt(u,camera,def.vent.radius+30))continue;
    const pending=run.hazards.find(h=>h.rule==='heat'&&h.unit===u.id&&!h.triggered);
    vent(ctx,u,pending?0.6+0.4*hazardProgress(pending):1-u.next/2.5,kind,time,reduced);
  }
  for(const h of run.hazards)if(h.rule==='heat'&&visibleAt(h,camera,h.radius+30))strikeGround(ctx,run,h,'vent',reduced,time,scale);
}
// One pending or landing world strike, on the ground: danger when it can hurt the party, friendly when not.
function strikeGround(ctx,run,h,icon,reduced,time,scale){
  const hostile=h.targets!=='enemies';
  if(h.triggered){
    if(hostile){drawHazardImpact(ctx,h,reduced,run);return;}
    const t=clamp01(1-(h.life??0)/0.35),fade=(1-t)**1.4,x=h.x,y=h.y+GROUND,tone=KIND[h.rule]||TONES.restored;
    const g=ctx.createRadialGradient(x,y,0,x,y,h.radius);g.addColorStop(0,alpha('#ffffff',0.8*fade));g.addColorStop(0.6,alpha(tone.floor,0.55*fade));g.addColorStop(1,alpha(tone.rim,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,h.radius,0,TAU);ctx.fill();
    softRing(ctx,x,y,h.radius*(1+0.3*ease(t)),18,tone.glow,fade);
    return;
  }
  if(hostile){dangerGround(ctx,h,{areaIndex:run.areaIndex,time:run.time,reduced});return;}
  const tone=KIND[h.rule]||TONES.restored;
  drawDecal(ctx,h.x,h.y+GROUND,h.radius,tone,{progress:hazardProgress(h),glint:true,reduced,time,strength:0.95});
  medallion(ctx,icon,h.x,h.y+GROUND+h.radius,tone,scale);
}
function topHeat(ctx,run,s,camera,reduced,time,scale){
  for(const b of s.bursts){
    const age=run.time-b.at;if(b.kind!=='vent'||age>1||!visibleAt(b,camera,120))continue;
    const k=age/1,rise=ease(Math.min(1,age/0.25)),fade=1-k,x=b.x,y=b.y+GROUND,kind=b.phase==='kind';
    lightPillar(ctx,x,y,34+10*rise,240*rise,kind?'#ffc861':DANGER.hot,kind?'#fff0c2':DANGER.light,0.85*fade);
    if(!reduced)burst(ctx,x,y-40,k,kind?'#ffe6a3':DANGER.light,10,90,-Math.PI/2,1.4,'ember',6);
    if(kind&&!reduced&&age<0.8){
      // Warmth reaching the party.
      ctx.beginPath();for(const body of [run.player,...run.campaign.npcs.filter(n=>n.state==='active')])if(Math.hypot(body.x-x,body.y-b.y)<b.radius*1.15)for(let i=0;i<4;i++){const t=(age*1.4+i/4)%1;glyph(ctx,'petal',body.x+Math.sin(i*1.9)*14,body.y-12-t*46,-Math.PI/2,5*(1-t*0.5));}
      ctx.fillStyle=alpha(TONES.recovery.glow,0.9);ctx.fill();
    }
  }
  for(const h of run.hazards)if(h.rule==='heat'&&!h.triggered&&h.targets!=='enemies'&&visibleAt(h,camera,h.radius+30))dangerTop(ctx,h,{time:run.time,reduced,scale});
}

/* ---------- Falling Stars ---------- */
function groundStars(ctx,run,s,camera,reduced,time,scale){
  for(const pool of s.pools){
    if(!visibleAt(pool,camera,pool.radius+30))continue;
    const left=clamp01((pool.until-run.time)/(pool.until-pool.born));
    drawDecal(ctx,pool.x,pool.y+GROUND,pool.radius,TONES.recovery,{progress:left,glint:true,reduced,time,strength:0.6+0.4*left});
  }
  for(const h of run.hazards)if(h.rule==='stars'&&visibleAt(h,camera,h.radius+30))strikeGround(ctx,run,h,'star',reduced,time,scale);
}
// A star falls along a slanted path as its warning fills, landing exactly when the strike does.
function fallingStar(ctx,h,reduced,time){
  const p=hazardProgress(h),hostile=h.targets!=='enemies',x=h.x,y=h.y+GROUND-6,k=p**1.3;
  const sx=x+120,sy=y-400,hx=sx+(x-sx)*k,hy=sy+(y-sy)*k,a=Math.atan2(y-sy,x-sx),c=Math.cos(a),n=Math.sin(a),tail=60+90*p;
  const core=hostile?DANGER.core:ENERGY.white,light=hostile?DANGER.light:PEARL.ink;
  const g=ctx.createLinearGradient(hx-c*tail,hy-n*tail,hx,hy);g.addColorStop(0,alpha(light,0));g.addColorStop(1,alpha(light,0.85));
  ctx.fillStyle=g;ctx.beginPath();taper(ctx,hx-c*tail,hy-n*tail,hx,hy,1,10+6*p);ctx.fill();
  if(!reduced)halo(ctx,hx,hy,24+14*p,hostile?DANGER.hot:PEARL.glow,0.6);
  star(ctx,hx,hy,8+6*p,core,reduced?0:time*3);
  drawGlyph(ctx,'cosmos',hx-c*16,hy-n*16,a,5,alpha(ACCENT.cosmos,0.95));
}
function topStars(ctx,run,s,camera,reduced,time,scale){
  for(const h of run.hazards){
    if(h.rule!=='stars'||!visibleAt(h,camera,h.radius+200))continue;
    if(!h.triggered){fallingStar(ctx,h,reduced,time);if(h.targets!=='enemies')dangerTop(ctx,h,{time:run.time,reduced,scale});}
  }
  for(const b of s.bursts){
    const age=run.time-b.at;if(b.kind!=='star'||age>0.9||!visibleAt(b,camera,120))continue;
    const k=age/0.9,kind=b.phase==='kind',x=b.x,y=b.y+GROUND;
    halo(ctx,x,y-10,b.radius*(1+0.6*ease(k)),kind?PEARL.glow:DANGER.light,(1-k)*0.8);
    star(ctx,x,y-12,26*(1-k)**2+4,alpha(kind?ENERGY.white:DANGER.core,1-k),Math.PI/4,0.2);
    if(!reduced)burst(ctx,x,y-12,k,kind?ENERGY.white:ACCENT.cosmos,12,b.radius*1.3,0,TAU,'cosmos',6);
  }
  if(!reduced){
    ctx.beginPath();
    for(const pool of s.pools){if(!visibleAt(pool,camera,pool.radius))continue;for(let i=0;i<5;i++){const t=(time*0.5+i/5)%1;glyph(ctx,'cosmos',pool.x+Math.sin(i*2.4)*pool.radius*0.6,pool.y+GROUND-t*60,0,4*(1-t));}}
    ctx.fillStyle=alpha(TONES.recovery.glow,0.85);ctx.fill();
  }
}

/* ---------- The turn of a rule (Tier L) ---------- */
function topFlip(ctx,run,s,camera,reduced){
  if(s.flippedAt===null||s.flippedAt===undefined)return;
  const age=run.time-s.flippedAt;if(age<0||age>FLIP)return;
  const k=age/FLIP,family=['thorn','chime','eclipse','ember','cosmos'][run.areaIndex]||'cosmos';
  const spots=s.units.length?s.units:[{x:run.player.x,y:run.player.y,radius:220}];
  for(const u of spots){
    if(!visibleAt(u,camera,(u.radius||40)+160))continue;
    const x=u.x,y=u.y+GROUND,r=Math.max(40,u.radius||40);
    if(reduced){softRing(ctx,x,y,r,14,ENERGY.gold,0.8*(1-k));continue;}
    halo(ctx,x,y,r*1.4,ENERGY.gold,0.55*(1-k));
    softRing(ctx,x,y,r*(0.5+1.1*ease(k)),26,ENERGY.gold,1-k);
    burst(ctx,x,y-20,k,ENERGY.white,12,r*1.4,0,TAU,family,6);
  }
}
// One short action caption: the nearest bell stone or vent the hero can strike now.
function strikeCaption(ctx,run,s,scale){
  if(s.phase!=='kind'||!['echo','heat'].includes(s.id))return;
  const p=run.player;let best=null,gap=220;
  for(const u of s.units){const d=Math.hypot(u.x-p.x,u.y-p.y);if(d<gap&&run.time>=u.readyAt&&!run.hazards.some(h=>h.rule==='heat'&&h.unit===u.id&&!h.triggered)){gap=d;best=u;}}
  if(best)caption(ctx,s.id==='echo'?'Strike the bell':'Strike the vent',best.x,s.id==='echo'?best.y+GROUND+46*scale:best.y+GROUND-best.radius-24*scale,TONES.objective,scale);
}

export function drawEnvironmentGround(ctx,run,camera,reduced,uiScale=1){
  const s=currentRule(run);if(!s||!camera)return;
  const time=reduced?0:run.time;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(s.id==='roots')groundRoots(ctx,run,s,camera,reduced,time,uiScale);
  else if(s.id==='echo')groundEcho(ctx,run,s,camera,reduced,time,uiScale);
  else if(s.id==='still')groundStill(ctx,run,s,camera,reduced,time,uiScale);
  else if(s.id==='heat')groundHeat(ctx,run,s,camera,reduced,time,uiScale);
  else if(s.id==='stars')groundStars(ctx,run,s,camera,reduced,time,uiScale);
  ctx.restore();
}
export function drawEnvironmentTop(ctx,run,camera,reduced,uiScale=1){
  const s=currentRule(run);if(!s||!camera)return;
  const time=reduced?0:run.time;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(s.id==='roots')topRoots(ctx,run,s,camera,reduced,time);
  else if(s.id==='echo')topEcho(ctx,run,s,camera,reduced,time);
  else if(s.id==='still')topStill(ctx,run,s,camera,reduced,time);
  else if(s.id==='heat')topHeat(ctx,run,s,camera,reduced,time,uiScale);
  else if(s.id==='stars')topStars(ctx,run,s,camera,reduced,time,uiScale);
  topFlip(ctx,run,s,camera,reduced);
  strikeCaption(ctx,run,s,uiScale);
  ctx.restore();
}
