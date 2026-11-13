import {JOURNEY} from '../../content/journey.mjs';
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
  ctx.lineWidth=5;ctx.strokeStyle='#c2a66e55';ctx.strokeRect(WORLD.left-20,WORLD.top-20,WORLD.right-WORLD.left+40,WORLD.bottom-WORLD.top+40);
  ctx.fillStyle=run.areaIndex===0?'#101b1726':'#100e1820';ctx.fillRect(0,0,WORLD.width,WORLD.height);
  for(const b of run.beacons)if(b.charge>0){ctx.save();ctx.globalAlpha=b.charge;glow(ctx,b.x,b.y,230,'#ffcd6532');ctx.restore();}
  const party=[run.player,run.companion,...(run.sol.active?[run.sol]:[])];
  const waves=run.effects.filter(f=>['pulse','lantern','restore'].includes(f.kind));
  for(const patch of foliageFor(area)){
    if(!visibleAt(patch,camera,30))continue;
    const warm=restorationAt(patch,run.beacons),near=party.find(a=>distance(a,patch)<45);
    const wave=waves.find(f=>Math.abs(distance(f,patch)-f.age/f.life*(f.kind==='restore'?230:210))<24);
    const bend=(reduced?0:Math.sin(run.time*1.7+patch.phase)*2)+(near?(patch.x-near.x)*0.18:0)+(wave?(patch.x-wave.x)*0.035:0);
    drawWorldDetail(ctx,images,12+run.areaIndex,patch.x+bend,patch.y+22,patch.size*2.5,warm>0.35?0.9:0.6,bend*0.01);
  }
}
export function drawAmbient(ctx,run,camera,reduced){
  if(reduced)return;
  for(let i=0;i<24;i++){
    const x=(i*173+run.time*(3+i%3))%WORLD.width,y=(i*97-run.time*4+WORLD.height*100)%WORLD.height;
    if(!visibleAt({x,y},camera,5))continue;
    ctx.globalAlpha=0.12+0.16*(0.5+0.5*Math.sin(run.time+i));ctx.fillStyle=run.areaIndex===0?'#ffeab3':'#deb99a';ctx.fillRect(x,y,2,2);
  }
  ctx.globalAlpha=1;
}
export function drawShadow(ctx,actor,height,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#10151c24';ctx.beginPath();ctx.ellipse(actor.x+height*0.18,actor.y+25,height*0.32,Math.max(6,height*0.075),0.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#07111266';ctx.beginPath();ctx.ellipse(actor.x,actor.y+23,actor.radius||height*0.2,actor.prop?10:6,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
