// One ground grammar for every zone, item and telegraph (Tier M): a soft floor tint, an
// engraved rim (bright outer line, inner band, evenly spaced ticks or family glyphs), a fill
// that grows from the centre to the rim when the zone has progress or timing, and at most one
// icon and a short caption. Friendly zones and enemy telegraphs share the construction; only
// the palette differs. All radii are world-true: they equal the simulation's collision radii.
import {canvasFont} from './typography.mjs';
import {drawSymbol} from './symbols.mjs';

const TAU=Math.PI*2;
const clamp01=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
// Bodies stand on the ground this many world units below their simulation origin.
export const GROUND=22;
export const DECAL={band:10,tickSpacing:24,tickMin:10,rim:1.8,hairline:1.1,runeEvery:4,glyph:3.6,front:9,spill:10};
export const ACCENT={thorn:'#b2d988',chime:'#8de5e7',eclipse:'#d3acff',ember:'#ff9f71',cosmos:'#a7cfff'};
export const FAMILIES=['thorn','chime','eclipse','ember','cosmos'];
export const DANGER={hot:'#ff5a3c',light:'#ffb09a',dark:'#3a1414',core:'#ffe4d8'};
export const TONES={
  objective:{rim:'#fff0c8',ink:'#f2c66d',floor:'#e8b65a',deep:'#2c1f0a',glow:'#ffe39a'},
  recovery:{rim:'#eafff3',ink:'#9fe3c1',floor:'#74cfa6',deep:'#0b2620',glow:'#c6ffe0'},
  restored:{rim:'#fff7da',ink:'#ffd476',floor:'#ffcc66',deep:'#33250a',glow:'#fff0b5'},
  guide:{rim:'#f0f4ff',ink:'#becfff',floor:'#9db4f0',deep:'#121a30',glow:'#e0e9ff'},
  sealed:{rim:'#e2e5da',ink:'#a0a99c',floor:'#8a9387',deep:'#141816',glow:'#d5dbcc'},
  open:{rim:'#fffbe2',ink:'#fff2a0',floor:'#ffd66c',deep:'#382a0b',glow:'#fff7c8'},
  lantern:{rim:'#ffeacc',ink:'#f5bd7d',floor:'#efa55a',deep:'#2f1d0c',glow:'#ffd9a8'},
  locked:{rim:'#d2d2c8',ink:'#8f9086',floor:'#6c6d65',deep:'#111311',glow:'#bdbdb4'},
  danger:{rim:DANGER.light,ink:DANGER.hot,floor:DANGER.hot,deep:DANGER.dark,glow:DANGER.hot}
};
export function alpha(color,value){return color.slice(0,7)+Math.round(clamp01(value)*255).toString(16).padStart(2,'0');}

/* ---------- Pure helpers (unit tested) ---------- */
export function tickCount(radius){return Math.max(DECAL.tickMin,Math.round(TAU*Math.max(0,radius)/DECAL.tickSpacing));}
export function fillProgress(warning,total){
  if(!(total>0))return warning>0?0:1;
  return clamp01(1-Math.max(0,warning)/total);
}
const firstWarning=new WeakMap();
// Contracted hazards carry `total`; older ones are timed from the first warning seen.
export function hazardTotal(h){
  if(h.total>0)return h.total;
  const seen=firstWarning.get(h);
  if(seen===undefined||h.warning>seen){const start=Math.max(0.001,h.warning||0);firstWarning.set(h,start);return start;}
  return seen;
}
export function hazardProgress(h){return h.triggered?1:fillProgress(h.warning,hazardTotal(h));}
const KIND_FAMILY={rootfall:'thorn',rootline:'thorn',ring:'thorn',nurture:'thorn',resonance:'chime',fan:'chime',forge:'chime',crown:'eclipse',cross:'eclipse',afterimage:'eclipse',meteor:'ember',sweep:'ember',seeker:'cosmos',radial:'cosmos'};
export function hazardFamily(h,areaIndex){
  if(ACCENT[h?.family])return h.family;
  if(Number.isInteger(areaIndex)&&FAMILIES[areaIndex])return FAMILIES[areaIndex];
  return KIND_FAMILY[h?.kind]||'generic';
}
export const KNOWN_HAZARDS=new Set([...Object.keys(KIND_FAMILY),'slam','chase','ray','ripple','lead']);
export function hazardShape(h){
  const r=Math.max(1,Number(h.radius)||1),inner=Math.max(0,Math.min(Number(h.inner)||0,r-6));
  return {x:h.x,y:h.y+GROUND,r,inner,known:KNOWN_HAZARDS.has(h.kind),ring:inner>0,valid:Number.isFinite(h.x)&&Number.isFinite(h.y)};
}
// Light, heavy or guard-absorbed: how strongly a landed hit is drawn.
export function hitWeight(fx){
  if(fx.absorbed)return 'guard';
  return ['melee','sunbreak','pulse'].includes(fx.source)?'heavy':'light';
}
const TIER={step:'S',muzzle:'S',contact:'S',cover:'S',trail:'S',outgoing:'S',damage:'S',slash:'M',mend:'M',ward:'M',impact:'M',sunbreak:'L','solar-lance':'L',pulse:'L','lunar-nova':'L','sol-volley':'L',lantern:'L',restore:'L'};
export function effectTier(fx){
  if(fx.kind==='hit')return hitWeight(fx)==='light'?'S':'M';
  if(fx.kind==='guard-break')return fx.boss?'L':'M';
  return TIER[fx.kind]||'M';
}
// Tier S feedback never lasts longer than 0.35 s, whatever life the simulation gave it.
export const TIER_LIFE={S:0.35,M:0.8,L:1.2};
export function tierProgress(fx){
  const span=Math.min(fx.life>0?fx.life:TIER_LIFE.S,TIER_LIFE[effectTier(fx)]);
  return fx.age>=span?null:clamp01(fx.age/span);
}
// Melee wind-up: the wedge fills until the swing lands at half the attack, then flashes out.
export function meleeWindup(attack,duration){
  if(!(attack>0)||!(duration>0))return null;
  const half=duration/2,elapsed=duration-attack;
  return elapsed<half?{fill:clamp01(elapsed/half),strike:0}:{fill:1,strike:clamp01((elapsed-half)/half)};
}
// Spell wind-up: the aim lane fills until release at 65 % of the cast.
export function spellWindup(spell,duration){
  if(!(spell>0)||!(duration>0))return null;
  const elapsed=duration-spell,release=duration*0.65;
  return elapsed<release?{fill:clamp01(elapsed/release),after:0}:{fill:1,after:clamp01((elapsed-release)/(duration-release))};
}
// Lead marks of one cast lie on the hero's predicted path; their order gives the travel direction.
export function leadDirection(h,hazards){
  const group=hazards.filter(o=>o.kind==='lead'&&o.owner===h.owner&&Math.abs((o.total||0)-(h.total||0))<0.6&&Math.hypot(o.x-h.x,o.y-h.y)<900);
  if(group.length<2)return null;
  group.sort((a,b)=>(a.total||0)-(b.total||0));
  const first=group[0],last=group.at(-1),dx=last.x-first.x,dy=last.y-first.y,length=Math.hypot(dx,dy);
  return length<12?null:{x:dx/length,y:dy/length};
}

/* ---------- Glyphs: every small mark is appended to one path and filled once ---------- */
// Appends one small shape to the current path. `angle` points the shape's +u axis.
export function glyph(ctx,family,px,py,angle,s){
  const c=Math.cos(angle),n=Math.sin(angle),P=(u,v)=>[px+c*u-n*v,py+n*u+c*v];
  const poly=points=>{points.forEach(([u,v],i)=>{const [x,y]=P(u,v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();};
  if(family==='petal'){ctx.moveTo(...P(s,0));ctx.quadraticCurveTo(...P(0,-0.62*s),...P(-s,0));ctx.quadraticCurveTo(...P(0,0.62*s),...P(s,0));ctx.closePath();}
  else if(family==='spark')poly([[s,0],[0,0.2*s],[-s,0],[0,-0.2*s]]);
  else if(family==='shard')poly([[s,0],[-0.15*s,0.42*s],[-0.75*s,0.05*s],[-0.2*s,-0.4*s]]);
  else if(family==='thorn')poly([[0.95*s,-0.42*s],[0.95*s,0.32*s],[-1.05*s,0.62*s]]);
  else if(family==='chime'){poly([[0.5*s,-0.85*s],[0.5*s,0.85*s],[0.16*s,0.85*s],[0.16*s,-0.85*s]]);poly([[-0.2*s,-0.5*s],[-0.2*s,0.5*s],[-0.54*s,0.5*s],[-0.54*s,-0.5*s]]);}
  else if(family==='eclipse'){
    // Crescent: outer circle minus a circle shifted inward through the same two tips.
    const [ox,oy]=P(0,0),[cx,cy]=P(-0.5*s,0);ctx.moveTo(...P(-0.156*s,-0.988*s));
    ctx.arc(ox,oy,s,angle-Math.PI*0.55,angle+Math.PI*0.55);ctx.arc(cx,cy,s*1.046,angle+1.236,angle-1.236,true);ctx.closePath();
  }
  else if(family==='ember')poly([[-0.7*s,-0.72*s],[0.8*s,0],[-0.7*s,0.72*s],[-0.25*s,0]]);
  else if(family==='cosmos')poly([[s,0],[0.2*s,0.2*s],[0,0.72*s],[-0.2*s,0.2*s],[-s,0],[-0.2*s,-0.2*s],[0,-0.72*s],[0.2*s,-0.2*s]]);
  else if(family==='rune')poly([[0.95*s,0],[0,0.55*s],[-0.95*s,0],[0,-0.55*s]]);
  else poly([[0.9*s,-0.26*s],[0.9*s,0.26*s],[-0.9*s,0.26*s],[-0.9*s,-0.26*s]]);
}
export function glyphRing(ctx,family,x,y,r,count,size,color,rotation=0,skip=0){
  ctx.beginPath();
  for(let i=0;i<count;i++){if(skip&&i%skip===0)continue;const a=rotation+i*TAU/count;glyph(ctx,family,x+Math.cos(a)*r,y+Math.sin(a)*r,a,size);}
  ctx.fillStyle=color;ctx.fill();
}
export function drawGlyph(ctx,family,x,y,angle,size,color){ctx.beginPath();glyph(ctx,family,x,y,angle,size);ctx.fillStyle=color;ctx.fill();}

/* ---------- Decal layers ---------- */
function annulus(ctx,x,y,r,inner){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(inner>0){ctx.moveTo(x+inner,y);ctx.arc(x,y,inner,0,TAU,true);}}
// 1) Floor tint: a soft wash of the category colour that deepens into a shadow just inside the
// rim, so the rim reads as cut into the ground.
export function floorTint(ctx,x,y,r,tone,strength=1,inner=0){
  const g=ctx.createRadialGradient(x,y,inner,x,y,r);
  g.addColorStop(0,alpha(tone.floor,0.08*strength));g.addColorStop(0.62,alpha(tone.floor,0.13*strength));
  g.addColorStop(0.88,alpha(tone.deep,0.28*strength));g.addColorStop(0.97,alpha(tone.deep,0.46*strength));g.addColorStop(1,alpha(tone.deep,0));
  ctx.fillStyle=g;annulus(ctx,x,y,r,inner);ctx.fill('evenodd');
}
// 3) Fill: the front sits `progress` of the way from the inner edge (or centre) to the rim;
// light spills a little past the front so it reads as light, not as a drawn ring.
export function progressFill(ctx,x,y,r,progress,base,front,inner=0,strength=1){
  const q=clamp01(progress);if(q<=0)return;
  const span=Math.max(1,r-inner),soft=Math.min(0.22,DECAL.front/span),spill=Math.min(0.14,DECAL.spill/span),g=ctx.createRadialGradient(x,y,inner,x,y,r);
  g.addColorStop(0,alpha(base,0.12*strength));
  if(q>soft)g.addColorStop(q-soft,alpha(base,0.32*strength));
  g.addColorStop(Math.max(0,q-soft*0.22),alpha(front,0.9*strength));
  if(q<1){g.addColorStop(Math.min(1,q+0.006),alpha(front,0.3*strength));g.addColorStop(Math.min(1,q+spill),alpha(front,0));if(q+spill<1)g.addColorStop(1,alpha(front,0));}
  ctx.fillStyle=g;annulus(ctx,x,y,r,inner);ctx.fill('evenodd');
}
// 2) Engraved band: a tinted band inside the rim, a hairline on its inner edge and evenly spaced
// ticks with a brighter rune every fourth tick (or the map's glyphs on enemy work).
function engrave(ctx,x,y,r,tone,strength=1,family=null,rotation=0){
  const band=Math.min(DECAL.band,r*0.3),mid=r-band/2,count=tickCount(r);
  ctx.fillStyle=alpha(tone.ink,0.24*strength);annulus(ctx,x,y,r,r-band);ctx.fill('evenodd');
  ctx.strokeStyle=alpha(tone.ink,0.72*strength);ctx.lineWidth=DECAL.hairline;ctx.beginPath();ctx.arc(x,y,r-band,0,TAU);ctx.stroke();
  if(family){glyphRing(ctx,family,x,y,mid,count,Math.min(DECAL.glyph,band*0.42),alpha(ACCENT[family]||tone.rim,0.9*strength),rotation);return;}
  glyphRing(ctx,'tick',x,y,mid,count,band*0.36,alpha(tone.ink,0.92*strength),rotation,DECAL.runeEvery);
  ctx.beginPath();for(let i=0;i<count;i+=DECAL.runeEvery){const a=rotation+i*TAU/count;glyph(ctx,'rune',x+Math.cos(a)*mid,y+Math.sin(a)*mid,a,band*0.56);}
  ctx.fillStyle=alpha(tone.rim,strength);ctx.fill();ctx.strokeStyle=alpha(tone.deep,0.75*strength);ctx.lineWidth=0.8;ctx.stroke();
}
export function rimLine(ctx,x,y,r,tone,strength=1,width=DECAL.rim){
  ctx.beginPath();ctx.arc(x,y,r,0,TAU);
  ctx.strokeStyle=alpha(tone.deep,0.62*strength);ctx.lineWidth=width+2.1;ctx.stroke();
  ctx.strokeStyle=alpha(tone.rim,0.95*strength);ctx.lineWidth=width;ctx.stroke();
}
export function medallion(ctx,kind,x,y,tone,scale=1){
  const r=11*scale;
  ctx.fillStyle=alpha(tone.deep,0.9);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  ctx.strokeStyle=alpha(tone.ink,0.95);ctx.lineWidth=1.4*scale;ctx.stroke();
  drawSymbol(ctx,kind,x,y,15*scale,tone.rim);
}
export function caption(ctx,text,x,y,tone,scale=1){
  ctx.save();ctx.font=canvasFont('label',scale);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.lineWidth=4*scale;ctx.strokeStyle='#120f0ce6';ctx.strokeText(text,x,y);
  ctx.fillStyle=tone.rim;ctx.fillText(text,x,y);ctx.restore();
}
// A soft shimmer that travels along an active rim (Tier M, never in Reduced effects).
function glint(ctx,x,y,r,tone,time){
  const a=time*1.5%TAU;
  ctx.strokeStyle=alpha(tone.rim,0.85);ctx.lineWidth=DECAL.rim+1.4;ctx.beginPath();ctx.arc(x,y,r,a,a+0.42);ctx.stroke();
  ctx.strokeStyle=alpha(tone.rim,0.35);ctx.lineWidth=DECAL.rim+4;ctx.beginPath();ctx.arc(x,y,r,a+0.06,a+0.36);ctx.stroke();
}
// The friendly decal. Options: progress (0..1 or null), strength (state intensity), alpha (fade
// of the whole decal, icon included), icon (symbol kind), scale, reduced, time, glint, inner, rotation.
export function drawDecal(ctx,x,y,r,tone,o={}){
  const strength=o.strength??1,inner=o.inner||0;
  if(o.alpha!==undefined&&!(o.alpha>0))return;
  ctx.save();ctx.lineCap='round';if(o.alpha!==undefined)ctx.globalAlpha*=Math.min(1,o.alpha);
  floorTint(ctx,x,y,r,tone,strength,inner);
  if(o.progress!==undefined&&o.progress!==null)progressFill(ctx,x,y,r,o.progress,tone.floor,tone.rim,inner,strength);
  // Active zones spill a little light past the rim.
  if(o.glint){const g=ctx.createRadialGradient(x,y,r,x,y,r+DECAL.spill);g.addColorStop(0,alpha(tone.rim,0.22*strength));g.addColorStop(1,alpha(tone.rim,0));ctx.fillStyle=g;annulus(ctx,x,y,r+DECAL.spill,r);ctx.fill('evenodd');}
  engrave(ctx,x,y,r,tone,strength,null,o.rotation||0);
  rimLine(ctx,x,y,r,tone,strength);
  if(inner>0)rimLine(ctx,x,y,inner,tone,strength*0.8,DECAL.hairline+0.4);
  if(o.glint&&!o.reduced)glint(ctx,x,y,r,tone,o.time||0);
  if(o.icon)medallion(ctx,o.icon,x,y+r,tone,o.scale||1);
  ctx.restore();
}

/* ---------- Danger language ---------- */
// Near the strike the front brightens and the rim beats faster; Reduced effects holds it steady.
export function strikePulse(progress,time,reduced){
  const k=clamp01((progress-0.72)/0.28);
  return reduced||k<=0?k*0.5:k*(0.55+0.45*Math.sin(time*TAU*(3+5*k)));
}
export function dangerGround(ctx,h,o={}){
  const {x,y,r,inner,known,ring,valid}=hazardShape(h),family=hazardFamily(h,o.areaIndex),time=o.time||0,reduced=!!o.reduced;
  if(!valid)return;
  const p=hazardProgress(h),beat=strikePulse(p,time,reduced),hollow=known&&ring;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  // Dark floor under the dangerous band only; a ring's safe centre keeps a calm, light floor.
  const g=ctx.createRadialGradient(x,y,inner,x,y,r);
  g.addColorStop(0,alpha(DANGER.dark,0.26));g.addColorStop(0.86,alpha(DANGER.dark,0.34));g.addColorStop(1,alpha(DANGER.dark,0.5));
  ctx.fillStyle=g;annulus(ctx,x,y,r,inner);ctx.fill('evenodd');
  if(hollow){
    const safe=ctx.createRadialGradient(x,y,0,x,y,inner);safe.addColorStop(0,'#fff6e000');safe.addColorStop(0.75,'#fff6e014');safe.addColorStop(1,'#fff6e040');
    ctx.fillStyle=safe;ctx.beginPath();ctx.arc(x,y,inner,0,TAU);ctx.fill();
  }
  if(!h.triggered)progressFill(ctx,x,y,r,p,DANGER.hot,beat>0.5?DANGER.core:DANGER.light,inner,0.9+0.1*beat);
  // Inner band of family glyphs: the map accent is the secondary detail.
  const band=Math.min(DECAL.band,(r-inner)*0.35);
  ctx.fillStyle=alpha(DANGER.hot,0.2);annulus(ctx,x,y,r,r-band);ctx.fill('evenodd');
  if(r>=34)glyphRing(ctx,family,x,y,r-band/2,tickCount(r),Math.min(DECAL.glyph,band*0.42),alpha(ACCENT[family]||DANGER.light,0.95),o.rotation||0);
  if(known)kindDetail(ctx,h,{x,y,r,inner},p,family,o);
  if(h.anchorHp>0)anchorCrystal(ctx,x,y,family,time,reduced);
  ctx.restore();
}
function kindDetail(ctx,h,shape,p,family,o){
  const {x,y,r}=shape,accent=ACCENT[family]||DANGER.light,time=o.time||0;
  if(h.kind==='slam'){
    // Ground cracks race outward with the fill; motes are drawn into the centre (anticipation).
    ctx.beginPath();
    for(let i=0;i<9;i++){
      const a=i*TAU/9+0.35,length=r*(0.25+0.68*p);let px=x,py=y;ctx.moveTo(px,py);
      for(let k=1;k<=4;k++){const d=length*k/4,bend=(k%2?1:-1)*(0.09+(i%3)*0.03);px=x+Math.cos(a+bend)*d;py=y+Math.sin(a+bend)*d;ctx.lineTo(px,py);}
    }
    ctx.strokeStyle=alpha(DANGER.dark,0.7);ctx.lineWidth=4.2;ctx.stroke();ctx.strokeStyle=alpha(DANGER.light,0.55+0.4*p);ctx.lineWidth=1.6;ctx.stroke();
    if(!o.reduced){ctx.beginPath();for(let i=0;i<14;i++){const a=i*TAU/14+i,d=r*(1.12-((time*0.9+i*0.137)%1)*0.95);glyph(ctx,family,x+Math.cos(a)*d,y+Math.sin(a)*d,a+Math.PI,3.2);}ctx.fillStyle=alpha(accent,0.8);ctx.fill();}
  }else if(h.kind==='lead'){
    const dir=leadDirection(h,o.hazards||[]);
    if(dir){
      // A comet streak along the hero's predicted travel: turning or stopping escapes it.
      const a=Math.atan2(dir.y,dir.x),c=Math.cos(a),n=Math.sin(a),len=r*0.95,g=ctx.createLinearGradient(x-c*len,y-n*len,x+c*len*0.55,y+n*len*0.55);
      g.addColorStop(0,alpha(DANGER.light,0));g.addColorStop(1,alpha(DANGER.core,0.75));
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-c*len-n*3,y-n*len+c*3);ctx.lineTo(x+c*len*0.35-n*9,y+n*len*0.35+c*9);ctx.lineTo(x+c*len*0.62,y+n*len*0.62);ctx.lineTo(x+c*len*0.35+n*9,y+n*len*0.35-c*9);ctx.lineTo(x-c*len+n*3,y-n*len-c*3);ctx.closePath();ctx.fill();
      drawGlyph(ctx,'ember',x+c*len*0.58,y+n*len*0.58,a,9,alpha(DANGER.core,0.9));
    }
  }else if(h.kind==='chase'){
    // Footprints: these marks land where you stand, so keep moving.
    ctx.fillStyle=alpha(DANGER.core,0.62);ctx.beginPath();
    for(const [dx,dy,tilt] of [[-7,5,-0.25],[7,-6,0.25]]){ctx.moveTo(x+dx+4.2*Math.cos(tilt),y+dy+4.2*Math.sin(tilt));ctx.ellipse(x+dx,y+dy,4.2,8,tilt,0,TAU);ctx.moveTo(x+dx+3,y+dy-12);ctx.arc(x+dx,y+dy-12,3,0,TAU);}
    ctx.fill();
  }else if(h.kind==='ray'){
    const owner=o.owner;
    if(owner){const a=Math.atan2(y-(owner.y+GROUND),x-owner.x),c=Math.cos(a),n=Math.sin(a);
      const g=ctx.createLinearGradient(x-c*r,y-n*r,x+c*r,y+n*r);g.addColorStop(0,alpha(accent,0));g.addColorStop(0.55,alpha(DANGER.core,0.55));g.addColorStop(1,alpha(accent,0));
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-c*r,y-n*r);ctx.lineTo(x-n*5,y+c*5);ctx.lineTo(x+c*r,y+n*r);ctx.lineTo(x+n*5,y-c*5);ctx.closePath();ctx.fill();}
  }
}
function anchorCrystal(ctx,x,y,family,time,reduced){
  const lift=reduced?0:Math.sin(time*3)*2,accent=ACCENT[family]||DANGER.light,top=y-60+lift;
  ctx.fillStyle=alpha(DANGER.dark,0.45);ctx.beginPath();ctx.ellipse(x,y,16,6,0,0,TAU);ctx.fill();
  const g=ctx.createLinearGradient(x-16,top,x+16,top+50);g.addColorStop(0,'#ffffff');g.addColorStop(0.45,accent);g.addColorStop(1,alpha(DANGER.dark,0.9));
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,top-8);ctx.lineTo(x+15,top+20);ctx.lineTo(x,top+50);ctx.lineTo(x-15,top+20);ctx.closePath();ctx.fill();
  ctx.strokeStyle=DANGER.core;ctx.lineWidth=1.6;ctx.stroke();
  ctx.strokeStyle=alpha('#ffffff',0.8);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,top-2);ctx.lineTo(x-6,top+20);ctx.stroke();
}
// Drawn above actors so the boundary stays visible through bodies; never paints the band or a safe centre.
export function dangerTop(ctx,h,o={}){
  const {x,y,r,inner,valid}=hazardShape(h),p=hazardProgress(h),beat=strikePulse(p,o.time||0,!!o.reduced),scale=o.scale||1;
  if(h.triggered||!valid)return;
  ctx.save();
  const edge=(radius,width)=>{ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.strokeStyle=alpha(DANGER.dark,0.85);ctx.lineWidth=width+2.4;ctx.stroke();ctx.strokeStyle=beat>0.5?DANGER.core:DANGER.light;ctx.lineWidth=width;ctx.stroke();};
  edge(r,DECAL.rim+0.5+beat*1.2);
  if(inner>0)edge(inner,DECAL.rim);
  if(r>=56&&h.kind!=='ray'&&h.kind!=='chase'&&h.kind!=='lead'){
    // Rings show the icon on the band, a slam below the boss that stands on its centre.
    const iy=inner>0?y-(r+inner)/2:h.kind==='slam'?y+r*0.62:y;
    dangerIcon(ctx,x,iy,(h.kind==='slam'?17:14)*scale);
  }
  ctx.restore();
}
export function dangerIcon(ctx,x,y,size){
  const s=size/2;ctx.save();ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x+s*1.05,y+s*0.82);ctx.lineTo(x-s*1.05,y+s*0.82);ctx.closePath();
  ctx.fillStyle=alpha(DANGER.dark,0.88);ctx.fill();ctx.strokeStyle=DANGER.light;ctx.lineWidth=Math.max(1.2,size*0.1);ctx.stroke();
  ctx.fillStyle=DANGER.core;ctx.fillRect(x-size*0.055,y-s*0.42,size*0.11,s*0.68);ctx.fillRect(x-size*0.055,y+s*0.4,size*0.11,size*0.1);ctx.restore();
}

/* ---------- Lanes, wedges, portals and channels: same layers along other shapes ---------- */
// A lane that fills along its length from (x,y) toward angle; widths taper from w0 to w1.
export function drawLane(ctx,x,y,angle,length,w0,w1,progress,o={}){
  const family=o.family||'generic',accent=ACCENT[family]||DANGER.light,strength=o.strength??1,c=Math.cos(angle),n=Math.sin(angle);
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.lineCap='round';ctx.lineJoin='round';
  const shape=()=>{ctx.beginPath();ctx.moveTo(0,-w0/2);ctx.lineTo(length,-w1/2);ctx.arc(length,0,w1/2,-Math.PI/2,Math.PI/2);ctx.lineTo(0,w0/2);ctx.arc(0,0,w0/2,Math.PI/2,-Math.PI/2);ctx.closePath();};
  shape();ctx.fillStyle=alpha(DANGER.dark,0.36*strength);ctx.fill();
  const q=clamp01(progress);
  if(q>0){
    const g=ctx.createLinearGradient(0,0,length,0),soft=Math.min(0.2,DECAL.front*1.4/length);
    g.addColorStop(0,alpha(DANGER.hot,0.16*strength));if(q>soft)g.addColorStop(q-soft,alpha(DANGER.hot,0.36*strength));
    g.addColorStop(Math.max(0,q-soft*0.2),alpha(o.beat>0.5?DANGER.core:DANGER.light,0.9*strength));
    if(q<1){g.addColorStop(Math.min(1,q+0.004),alpha(DANGER.light,0));g.addColorStop(1,alpha(DANGER.light,0));}
    ctx.save();shape();ctx.clip();ctx.fillStyle=g;ctx.fillRect(-w0,-Math.max(w0,w1),length+w0+w1,Math.max(w0,w1)*2);ctx.restore();
  }
  // Rim around the whole lane and forward glyphs at the shared tick spacing.
  shape();ctx.strokeStyle=alpha(DANGER.dark,0.75*strength);ctx.lineWidth=DECAL.rim+2.2;ctx.stroke();
  ctx.strokeStyle=alpha(DANGER.light,0.92*strength);ctx.lineWidth=DECAL.rim;ctx.stroke();
  // Chevrons always point along the lane; the map accent colours them.
  ctx.beginPath();for(let d=DECAL.tickSpacing*0.75;d<length-6;d+=DECAL.tickSpacing)glyph(ctx,'ember',d,0,0,Math.min(5,(w0+(w1-w0)*d/length)*0.18+2));
  ctx.fillStyle=alpha(accent,0.85*strength);ctx.fill();
  ctx.restore();
  return {endX:x+c*length,endY:y+n*length};
}
// A wedge that fills from its apex toward the rim; strike (0..1) flashes it out after impact.
export function drawWedge(ctx,x,y,angle,radius,half,progress,o={}){
  const family=o.family||'generic',strike=o.strike||0,fade=strike>0?1-strike:1;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha*=fade;
  const sector=r=>{ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,-half,half);ctx.closePath();};
  sector(radius);ctx.fillStyle=alpha(DANGER.dark,0.34);ctx.fill();
  if(strike>0){sector(radius*(1+0.12*strike));ctx.fillStyle=alpha(DANGER.core,0.55*(1-strike));ctx.fill();}
  else{ctx.save();sector(radius);ctx.clip();progressFill(ctx,0,0,radius,progress,DANGER.hot,o.beat>0.5?DANGER.core:DANGER.light);ctx.restore();}
  ctx.beginPath();ctx.arc(0,0,radius,-half,half);ctx.strokeStyle=alpha(DANGER.dark,0.8);ctx.lineWidth=DECAL.rim+2.4;ctx.stroke();
  ctx.strokeStyle=DANGER.light;ctx.lineWidth=DECAL.rim+0.4;ctx.stroke();
  ctx.beginPath();const count=Math.max(3,Math.round(radius*half*2/DECAL.tickSpacing));
  for(let i=0;i<=count;i++){const a=-half+i*half*2/count;glyph(ctx,family==='generic'?'tick':family,Math.cos(a)*(radius-5),Math.sin(a)*(radius-5),a,3);}
  ctx.fillStyle=alpha(ACCENT[family]||DANGER.light,0.9);ctx.fill();
  ctx.restore();
}
// The wedge's rim drawn again above bodies: a melee swing is usually under the hero's feet.
export function wedgeRim(ctx,x,y,angle,radius,half,progress,beat=0){
  ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y,radius,angle-half,angle+half);
  ctx.strokeStyle=alpha(DANGER.dark,0.8);ctx.lineWidth=DECAL.rim+2.6;ctx.stroke();
  ctx.strokeStyle=beat>0.5?DANGER.core:alpha(DANGER.light,0.6+0.4*clamp01(progress));ctx.lineWidth=DECAL.rim+0.6;ctx.stroke();ctx.restore();
}
// Enemy arrival: a portal decal whose fill rises from the centre; light lifts out of it at the end.
export function drawPortal(ctx,x,y,r,progress,o={}){
  const family=o.family||'generic',accent=ACCENT[family]||DANGER.light,time=o.time||0,reduced=!!o.reduced,big=!!o.big;
  const q=clamp01(progress);
  ctx.save();ctx.lineCap='round';
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,alpha('#08060c',0.78));g.addColorStop(0.72,alpha(DANGER.dark,0.55));g.addColorStop(1,alpha(DANGER.dark,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  if(!reduced){
    // Three swirl arms turning inward.
    ctx.beginPath();
    for(let arm=0;arm<3;arm++)for(let k=0;k<=10;k++){const t=k/10,a=time*2.2+arm*TAU/3+t*2.6,d=r*(0.92-t*0.8);k?ctx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}
    ctx.strokeStyle=alpha(accent,0.55);ctx.lineWidth=big?2.6:1.8;ctx.stroke();
  }
  progressFill(ctx,x,y,r,q,DANGER.hot,DANGER.light,0,0.85);
  glyphRing(ctx,family,x,y,r-4,tickCount(r),big?3.6:2.8,alpha(accent,0.95),reduced?0:-time*0.6);
  rimLine(ctx,x,y,r,TONES.danger,0.9);
  if(!reduced){
    // Motes rise out of the portal; near the end a column of light carries the body up.
    ctx.beginPath();const motes=big?16:7;
    for(let i=0;i<motes;i++){const t=(time*0.9+i/motes)%1,a=i*2.4,d=r*0.75*((i*0.37)%1);glyph(ctx,family,x+Math.cos(a)*d,y-t*(big?150:60)*(0.4+q),-Math.PI/2,(big?3.6:2.6)*(1-t));}
    ctx.fillStyle=alpha(accent,0.85);ctx.fill();
    if(q>0.6){const k=(q-0.6)/0.4;lightPillar(ctx,x,y,r*0.7,(big?260:120)*k,DANGER.core,accent,0.5*k);}
  }
  ctx.restore();
}
// A soft pillar of light rising from (x,y): nested ellipses, brightest at the core, fading upward.
export function lightPillar(ctx,x,y,width,height,base,top,strength=1){
  if(height<=1||strength<=0)return;
  // A pool of light on the ground, then three stacked fills (clipped at the ground) so the
  // light falls off toward the pillar's edges and fades upward.
  const pool=ctx.createRadialGradient(x,y,0,x,y,width*1.3);pool.addColorStop(0,alpha(base,0.5*strength));pool.addColorStop(1,alpha(base,0));
  ctx.fillStyle=pool;ctx.beginPath();ctx.ellipse(x,y,width*1.3,width*0.5,0,0,TAU);ctx.fill();
  ctx.save();ctx.beginPath();ctx.rect(x-width-2,y-height-2,width*2+4,height+2);ctx.clip();
  for(const [w,k] of [[width,0.3],[width*0.58,0.4],[width*0.24,0.55]]){
    const col=ctx.createLinearGradient(x,y,x,y-height);
    col.addColorStop(0,alpha(base,k*strength));col.addColorStop(0.45,alpha(top,0.5*k*strength));col.addColorStop(1,alpha(top,0));ctx.fillStyle=col;
    ctx.beginPath();ctx.ellipse(x,y-height*0.4,w,height*0.62,0,0,TAU);ctx.fill();
  }
  ctx.restore();
}
// Caster channel: the same engraved decal at the caster's feet, glyph band turning as it charges.
export function drawChannel(ctx,x,y,r,progress,o={}){
  const family=o.family||'generic',time=o.time||0,reduced=!!o.reduced;
  ctx.save();ctx.lineCap='round';
  floorTint(ctx,x,y,r,TONES.danger,0.9);
  progressFill(ctx,x,y,r,progress,DANGER.hot,DANGER.light,0,0.9);
  glyphRing(ctx,family,x,y,r-4,tickCount(r),3,alpha(ACCENT[family]||DANGER.light,0.95),reduced?0:time*1.4);
  rimLine(ctx,x,y,r,TONES.danger,0.9);
  ctx.restore();
}
