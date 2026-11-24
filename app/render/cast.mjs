import {castDisplay,partyDisplay,motionMemory,castHeight,PARTY_HEIGHT} from './motion.mjs';
import {drawSprite} from './sprites.mjs';

// Per-ghost opacity of a smear (nearest first) and one reusable motion layer: no allocations per actor per frame.
const GHOST=[0.42,0.26,0.14],layer={offsetX:0,offsetY:0,tilt:0,stretchX:1,stretchY:1,blend:''};
// Desaturated copies of atlases for browsers without canvas filters, made once per atlas on first use.
const muted=new WeakMap();
function mutedAtlas(image){
 if(muted.has(image))return muted.get(image);
 let copy=null;
 try{
  const canvas=globalThis.document?.createElement('canvas');
  if(canvas&&image.width>0&&image.height>0){
   canvas.width=image.width;canvas.height=image.height;
   const c=canvas.getContext('2d');c.drawImage(image,0,0);
   const data=c.getImageData(0,0,canvas.width,canvas.height),px=data.data;
   for(let i=0;i<px.length;i+=4){const l=(px[i]*0.3+px[i+1]*0.59+px[i+2]*0.11)*0.78;px[i]=px[i+1]=px[i+2]=l;}
   c.putImageData(data,0,0);canvas.atlas=image.atlas;copy=canvas;
  }
 }catch{copy=null;}
 muted.set(image,copy);return copy;
}
// A downed ally: its lying frame, greyed by `gray` (0..1) and darkened. Canvas filters where available; otherwise
// the cached grey atlas is laid over the coloured frame (and without either, the frame is only dimmed).
function paintDowned(ctx,images,s,x,y,height,opacity,gray){
 const pose=s.pose,alpha=opacity*s.alpha;
 if(typeof ctx.filter==='string'){
  ctx.save();ctx.filter=`grayscale(${gray.toFixed(2)}) brightness(${(1-0.24*gray).toFixed(2)})`;
  drawSprite(ctx,images,pose,x,y,height,s.face,alpha,s.motion);ctx.restore();return;
 }
 const image=images[pose.asset],copy=image&&mutedAtlas(image);
 if(gray<0.99||!copy)drawSprite(ctx,images,pose,x,y,height,s.face,alpha*(copy?1:1-0.3*gray),s.motion);
 if(copy)drawSprite(ctx,{[pose.asset]:copy},pose,x,y,height,s.face,alpha*gray,s.motion);
}
function paint(ctx,images,s,x,y,height,opacity){
 const m=s.motion;
 if(s.gray>0.01){paintDowned(ctx,images,s,x,y,height,opacity,s.gray);return;}
 for(let i=s.ghosts;i>0;i--){
  layer.offsetX=m.offsetX+s.ghostX*i;layer.offsetY=m.offsetY+s.ghostY*i;layer.tilt=m.tilt+s.ghostTilt*i;layer.stretchX=m.stretchX;layer.stretchY=m.stretchY;layer.blend=s.ghostBlend;
  drawSprite(ctx,images,s.pose,x,y,height,s.face,opacity*s.ghostAlpha*GHOST[i-1],layer);
 }
 if(s.fadeAlpha>0)drawSprite(ctx,images,s.fadePose,x,y,height,s.face,opacity*s.fadeAlpha,s.fadeMotion);
 drawSprite(ctx,images,s.pose,x,y,height,s.face,opacity*s.alpha,m);
 // Hit flash: the same frame redrawn additively brightens painted art without an offscreen canvas (at most two passes).
 if(s.flash>0.02){Object.assign(layer,m);layer.blend='lighter';for(let pass=s.flash;pass>0.02;pass-=0.55)drawSprite(ctx,images,s.pose,x,y,height,s.face,opacity*s.alpha*Math.min(0.85,pass),layer);}
}
// Hero, Dawnweaver and Sol (kind 'hero'|'companion'|'sol'; body heights 98/96/54).
export function drawParty(ctx,images,actor,kind,time,reduced=false,opacity=1){
 const s=partyDisplay(motionMemory,actor,kind,time,reduced);
 paint(ctx,images,s,actor.x,actor.y,PARTY_HEIGHT[kind],opacity);
 return s;
}
// Hollow, champions, Wardens, their remains, route keepers and recruited keepers.
export function drawCast(ctx,images,actor,time,reduced=false,opacity=1){
 const height=castHeight(actor),s=castDisplay(motionMemory,actor,time,reduced,height);
 paint(ctx,images,s,actor.x,actor.y,height,opacity);
 return s;
}
