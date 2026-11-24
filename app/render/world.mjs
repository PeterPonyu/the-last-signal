import {WORLD} from '../../content/game.mjs';
import {distance} from '../game/geometry.mjs';
import {restorationAt,visibleAt} from './presentation.mjs';
import {drawWorldDetail} from './raster-details.mjs';

const patches=new WeakMap();
function foliageFor(area){
  if(patches.has(area))return patches.get(area);
  const result=[];
  for(let i=0;i<700;i++){
    const x=90+(i*227%(WORLD.width-180)),y=105+(i*139%(WORLD.height-210));
    if(area.obstacles.some(o=>distance({x,y},o)<o.radius+18))continue;
    result.push({x,y,phase:i*2.3,size:7+i%8});
  }
  patches.set(area,result);return result;
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
  const party=[run.player,run.companion,...(run.sol.active?[run.sol]:[])];
  const waves=run.effects.filter(f=>['pulse','lantern','restore'].includes(f.kind));
  for(const patch of foliageFor(area)){
    if(!visibleAt(patch,camera,30))continue;
    const warm=restorationAt(patch,run.beacons),near=party.find(a=>distance(a,patch)<45);
    const wave=waves.find(f=>Math.abs(distance(f,patch)-f.age/f.life*(f.kind==='restore'?230:210))<24);
    const bend=(reduced?0:Math.sin(run.time*1.7+patch.phase)*2)+(near?(patch.x-near.x)*0.18:0)+(wave?(patch.x-wave.x)*0.035:0);
    drawWorldDetail(ctx,images,12+area.detailTheme,patch.x+bend,patch.y+22,patch.size*2.5,warm>0.35?0.9:0.6,bend*0.01);
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
export function drawShadow(ctx,actor,height,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#10151c24';ctx.beginPath();ctx.ellipse(actor.x+height*0.18,actor.y+25,height*0.32,Math.max(6,height*0.075),0.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#07111266';ctx.beginPath();ctx.ellipse(actor.x,actor.y+23,actor.radius||height*0.2,actor.prop?10:6,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
