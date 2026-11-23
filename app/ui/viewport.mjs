// Chooses how much of the world the battlefield shows so the canvas exactly fills the
// play area on any screen. Landscape views keep 680 world units of height (the original
// framing); portrait views keep 640 units of width. Enemies spawn at least 680 units across
// or 440 units up or down from the hero, and the camera leads the hero by up to 55 units,
// so half the view plus that lead must stay inside those distances: at most 1240 x 760.
export const VIEW={landscapeHeight:680,portraitWidth:640,maxWidth:1240,maxHeight:760,cameraLead:55,maxScale:2.5,minScale:0.5};

export function computeView(cssWidth,cssHeight,devicePixelRatio=1,maxPixels=2.6e6){
  const width=Math.max(1,cssWidth),height=Math.max(1,cssHeight),aspect=width/height;
  let viewWidth,viewHeight;
  if(aspect>=1){
    viewHeight=VIEW.landscapeHeight;viewWidth=viewHeight*aspect;
    if(viewWidth>VIEW.maxWidth){viewWidth=VIEW.maxWidth;viewHeight=viewWidth/aspect;}
  }else{
    viewWidth=VIEW.portraitWidth;viewHeight=viewWidth/aspect;
    if(viewHeight>VIEW.maxHeight){viewHeight=VIEW.maxHeight;viewWidth=viewHeight*aspect;}
  }
  let scale=Math.min(width*Math.max(1,devicePixelRatio)/viewWidth,VIEW.maxScale);
  const pixels=viewWidth*viewHeight*scale*scale;
  if(pixels>maxPixels)scale*=Math.sqrt(maxPixels/pixels);
  scale=Math.max(VIEW.minScale,scale);
  return {width:Math.round(viewWidth),height:Math.round(viewHeight),scale,cssWidth:width,cssHeight:height};
}
