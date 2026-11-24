import {WORLD,KITS} from '../../content/game.mjs';
import {distance} from '../game/geometry.mjs';
import {restorationAt,visibleAt} from './presentation.mjs';
import {drawWorldDetail} from './raster-details.mjs';

// Scenery kits (content KITS): standing sprites put their painted ground line (cell row `ground`,
// 292 of 320 by default) on the body ground line, 24 world units below their point, like the shared
// battlefield props; flat sprites are ground decals centred 22 units below their point.
const KIT_CELL=320,KIT_GROUND=292,PROP_FOOT=24,DECAL_FOOT=22;
export function kitOf(area){return KITS[area?.id]||null;}
export function kitSprite(area,type){return kitOf(area)?.sprites[type]||null;}
// Draws one kit sprite; returns false (draws nothing) when its atlas is not loaded yet.
export function drawKitSprite(ctx,images,area,type,x,y,{height=null,opacity=1,tilt=0,time=0,reduced=false,glow=true}={}){
  const kit=kitOf(area),sprite=kit?.sprites[type],image=images[kit?.asset],frame=sprite&&image?.atlas?.frames?.[sprite.frame];
  if(!frame)return false;
  const [sx,sy,sw,sh]=frame.rect,[bx,by,bw,bh]=frame.bounds,k=(height??sprite.height)/bh;
  ctx.save();ctx.translate(x,y+(sprite.flat?DECAL_FOOT:PROP_FOOT));if(tilt)ctx.rotate(tilt);ctx.globalAlpha*=opacity;
  if(sprite.flat)ctx.drawImage(image,sx+bx,sy+by,bw,bh,-bw*k/2,-bh*k/2,bw*k,bh*k);
  else{const ground=(sprite.ground??KIT_GROUND)*sh/KIT_CELL;ctx.drawImage(image,sx+bx,sy+by,bw,bh,(bx-sw/2)*k,(by-ground)*k,bw*k,bh*k);}
  // Painted light sources breathe softly (Tier S); reduced effects keep them steady.
  if(glow&&sprite.light){const [lx,ly,lr,color]=sprite.light,s=height?height/sprite.height:1,pulse=reduced?1:1+0.08*Math.sin(time*(2.1+(x%7)*0.13)+x*0.031);
    ctx.globalCompositeOperation='lighter';drawGlowDisc(ctx,lx*s,ly*s,lr*s*pulse,color);}
  ctx.restore();return true;
}
// Set pieces (landmark, gathering object, gates, barricade, foliage, crossing): a kit sprite or a
// shared painted detail (world-details atlas index, or an open-gate frame). Like drawWorldDetail,
// the piece stands on baseline y and `height` is its visible height.
// A piece may list sprite variants; `variant` (a stable index such as a patch number) picks one.
export function drawPiece(ctx,images,area,piece,x,y,height,{opacity=1,tilt=0,time=0,reduced=false,variant=0}={}){
  const spec=kitOf(area)?.pieces?.[piece];if(!spec)return false;
  if(spec.sprite){const name=Array.isArray(spec.sprite)?spec.sprite[Math.abs(variant|0)%spec.sprite.length]:spec.sprite,flat=kitSprite(area,name)?.flat;
    return drawKitSprite(ctx,images,area,name,x,flat?y-height/2-DECAL_FOOT:y-PROP_FOOT,{height,opacity,tilt,time,reduced});}
  if(spec.gate!==undefined){if(!images.openGate)return false;drawWorldDetail(ctx,images,spec.gate,x,y,height,opacity,tilt,'openGate');return true;}
  if(!images.worldDetails)return false;drawWorldDetail(ctx,images,spec.detail,x,y,height,opacity,tilt);return true;
}
function drawGlowDisc(ctx,x,y,r,color){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}

const patches=new WeakMap(),grounds=new WeakMap();
// A stable 0..1 value per integer, so the same map always grows the same way.
const hash=n=>{let h=Math.imul((n|0)^0x9e3779b9,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);return ((h^(h>>>16))>>>0)/4294967296;};
// Ground growth and debris (flowers, bluegrass, crystals, slag, shards) gathers where the map would grow
// or drop it: in small clumps at the feet of its props, plus a few loose drifts on open ground, instead
// of an even carpet across the whole floor.
export function foliageFor(area){
  if(patches.has(area))return patches.get(area);
  const result=[],decals=area.decorations.filter(d=>kitSprite(area,d.type)?.flat);
  const tuft=(x,y,n)=>{
    if(x<70||y<85||x>WORLD.width-70||y>WORLD.height-85)return;
    if(area.obstacles.some(o=>distance({x,y},o)<o.radius+16)||decals.some(d=>distance({x,y},d)<d.height*0.9)||result.some(p=>distance({x,y},p)<16))return;
    result.push({x,y,phase:n*2.3,size:7+Math.floor(hash(n*7+3)*8),variant:n});
  };
  area.obstacles.forEach((o,i)=>{
    if(!o.type)return;
    for(let j=0,count=2+Math.floor(hash(i*31+1)*4);j<count;j++){
      const angle=hash(i*131+j*17)*Math.PI*2,r=o.radius+18+hash(i*71+j*29)*44;
      tuft(o.x+Math.cos(angle)*r*1.15,o.y+o.radius*0.2+Math.sin(angle)*r*0.75,i*8+j);
    }
  });
  for(let k=0;k<26;k++){
    const cx=150+hash(k*13+5)*(WORLD.width-300),cy=160+hash(k*17+11)*(WORLD.height-320);
    for(let j=0;j<4;j++){const angle=hash(k*97+j*7)*Math.PI*2,r=12+hash(k*53+j*19)*60;tuft(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r*0.7,1000+k*8+j);}
  }
  patches.set(area,result);return result;
}
// Flat kit decorations (puddles, sigils, star charts...) lie on the floor under every actor.
function groundDecals(area){
  if(!grounds.has(area))grounds.set(area,area.decorations.filter(d=>kitSprite(area,d.type)?.flat));
  return grounds.get(area);
}
// The playable world fades into a dark fog band instead of a drawn frame. The fog starts
// EDGE_FOG.inside units within the boundary and is deepest at the texture's outer edge.
export const EDGE_FOG={inside:120,colors:['#060d0b','#07070d','#0a060e','#120604','#05081a']};
export function edgeFogBands(camera){
  const bands=[],inside=EDGE_FOG.inside;
  if(camera.x<WORLD.left+inside)bands.push({side:'left',from:WORLD.left+inside,to:0});
  if(camera.x+camera.width>WORLD.right-inside)bands.push({side:'right',from:WORLD.right-inside,to:WORLD.width});
  if(camera.y<WORLD.top+inside)bands.push({side:'top',from:WORLD.top+inside,to:0});
  if(camera.y+camera.height>WORLD.bottom-inside)bands.push({side:'bottom',from:WORLD.bottom-inside,to:WORLD.height});
  return bands;
}
function drawEdgeFog(ctx,camera,areaIndex){
  const color=EDGE_FOG.colors[areaIndex]||EDGE_FOG.colors[0];
  for(const band of edgeFogBands(camera)){
    const horizontal=band.side==='left'||band.side==='right',g=horizontal?ctx.createLinearGradient(band.from,0,band.to,0):ctx.createLinearGradient(0,band.from,0,band.to);
    g.addColorStop(0,color+'00');g.addColorStop(0.45,color+'4d');g.addColorStop(0.8,color+'a6');g.addColorStop(1,color+'d9');
    ctx.fillStyle=g;
    if(horizontal)ctx.fillRect(Math.min(band.from,band.to),camera.y-2,Math.abs(band.to-band.from),camera.height+4);
    else ctx.fillRect(camera.x-2,Math.min(band.from,band.to),camera.width+4,Math.abs(band.to-band.from));
  }
}
export function glow(ctx,x,y,r,color){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
export function drawWorld(ctx,images,area,run,camera,reduced){
  const image=images[area.id],tw=1200,th=800;
  // Reflect adjacent texture panels so edges meet without stretching the floor.
  for(let row=Math.floor(camera.y/th);row<=Math.floor((camera.y+camera.height)/th);row++)for(let col=Math.floor(camera.x/tw);col<=Math.floor((camera.x+camera.width)/tw);col++){
    ctx.save();ctx.translate(col*tw+(col%2?tw:0),row*th+(row%2?th:0));ctx.scale(col%2?-1:1,row%2?-1:1);
    // The camera can sit between screen pixels. Overlap by one world pixel so
    // filtered texture edges cannot expose a hairline of cleared canvas.
    ctx.drawImage(image,image.width*0.1,image.height*0.12,image.width*0.8,image.height*0.76,-0.5,-0.5,tw+1,th+1);ctx.restore();
  }
  ctx.lineJoin='round';ctx.lineCap='round';
  ctx.fillStyle=['#101b1726','#100e1820','#100e1820','#3518112b','#0c153726'][run.areaIndex];ctx.fillRect(0,0,WORLD.width,WORLD.height);
  drawEdgeFog(ctx,camera,run.areaIndex);
  for(const b of run.beacons)if(b.charge>0){ctx.save();ctx.globalAlpha=b.charge;glow(ctx,b.x,b.y,230,'#ffcd6532');ctx.restore();}
  const time=reduced?0:run.time;
  for(const d of groundDecals(area))if(visibleAt(d,camera,d.height))drawKitSprite(ctx,images,area,d.type,d.x,d.y,{time,reduced});
  const party=[run.player,run.companion,...(run.sol.active?[run.sol]:[])];
  const waves=run.effects.filter(f=>['pulse','lantern','restore'].includes(f.kind));
  for(const patch of foliageFor(area)){
    if(!visibleAt(patch,camera,30))continue;
    const warm=restorationAt(patch,run.beacons),near=party.find(a=>distance(a,patch)<45);
    const wave=waves.find(f=>Math.abs(distance(f,patch)-f.age/f.life*(f.kind==='restore'?230:210))<24);
    const bend=(reduced?0:Math.sin(run.time*1.7+patch.phase)*2)+(near?(patch.x-near.x)*0.18:0)+(wave?(patch.x-wave.x)*0.035:0);
    drawPiece(ctx,images,area,'foliage',patch.x+bend,patch.y+22,patch.size*2.5,{opacity:warm>0.35?0.9:0.6,tilt:bend*0.01,variant:patch.variant});
  }
}
export function drawAmbient(ctx,run,camera,reduced){
  if(reduced)return;
  const count=run.areaIndex>=3?32:24;
  for(let i=0;i<count;i++){
    const x=(i*173+run.time*(3+i%3))%WORLD.width,y=(i*97-run.time*4+WORLD.height*100)%WORLD.height;
    if(!visibleAt({x,y},camera,5))continue;
    ctx.globalAlpha=0.12+0.16*(0.5+0.5*Math.sin(run.time+i));ctx.fillStyle=['#ffeab3','#deb99a','#e8c2ef','#ffc77d','#cae4ff'][run.areaIndex];ctx.fillRect(x,y,run.areaIndex>=3?3:2,run.areaIndex===3?5:2);
  }
  ctx.globalAlpha=1;
}
// Kit props with a long footprint (reach) cast a correspondingly wide contact shadow.
export function drawShadow(ctx,actor,height,alpha=1){
  const spread=actor.prop&&actor.reach?actor.reach*0.85:actor.radius||height*0.2;
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#10151c24';ctx.beginPath();ctx.ellipse(actor.x+height*0.18,actor.y+25,Math.max(height*0.32,spread),Math.max(6,height*0.075),0.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#07111266';ctx.beginPath();ctx.ellipse(actor.x,actor.y+23,spread,actor.prop?10:6,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
