export function drawWorldDetail(ctx,images,index,x,y,height,opacity=1,tilt=0,asset='worldDetails'){
 const image=images[asset],frame=image.atlas.frames[index];
 const [sx,sy]=frame.rect,[bx,by,bw,bh]=frame.bounds,scale=height/bh;
 ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.globalAlpha*=opacity;
 ctx.drawImage(image,sx+bx,sy+by,bw,bh,-bw*scale/2,-height,bw*scale,height);ctx.restore();
}
export function drawRadiance(ctx,images,clip,x,y,size,progress,angle=0,opacity=1){
 const image=images.radiance;if(!image||progress>=1)return;
 const rows={contact:0,blade:1,sun:2,mend:3,comet:4,hostile:5},column=Math.min(5,Math.floor(Math.max(0,progress)*6)),frame=image.atlas.frames[rows[clip]*6+column];
 const [sx,sy,sw,sh]=frame.rect;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=opacity;
 ctx.drawImage(image,sx,sy,sw,sh,-size/2,-size/2,size,size);ctx.restore();
}
