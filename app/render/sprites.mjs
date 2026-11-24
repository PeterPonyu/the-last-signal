import { ANIMATIONS } from '../../content/animations.mjs';
export function drawSprite(ctx,images,pose,x,y,bodyHeight,face=1,alpha=1,motion={}){
  const image=images[pose.asset],definition=ANIMATIONS[pose.asset];
  if(!image?.atlas||!definition)throw new Error('Unbound sprite: '+pose.asset);
  const frame=image.atlas.frames[pose.row*definition.columns+pose.column];
  if(!frame)throw new Error('Missing frame: '+pose.asset+'/'+pose.row+'/'+pose.column);
  const [sx,sy,sw,sh]=frame.rect,scale=bodyHeight/(image.atlas.referenceHeights?.[pose.row]||(image.atlas.referenceCellHeight||image.height/definition.rows)*image.atlas.referenceHeightRatio),w=sw*scale,h=sh*scale;
  ctx.save();if(motion.blend)ctx.globalCompositeOperation=motion.blend;ctx.translate(x,y+22);ctx.scale(face<0?-1:1,1);ctx.translate(motion.offsetX||0,motion.offsetY||0);ctx.rotate(motion.tilt||0);ctx.scale(motion.stretchX||1,motion.stretchY||1);ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
  ctx.drawImage(image,sx,sy,sw,sh,-w*frame.pivot[0],-h*frame.pivot[1],w,h);ctx.restore();
}
