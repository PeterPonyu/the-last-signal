// Canvas and legend icons: colour and path only. Names and descriptions live in the UI strings (src/i18n/ui.mjs sym.*).
export const SYMBOLS={
  beacon:{color:'#a8e8c8',path:'M12 2 A10 10 0 1 1 11.99 2 M7 8 C4 7 4 11 5 13 L7 16 Q10 15 9 12 L8 9 Z M6 18 L9 17 M16 5 C13 4 13 8 14 10 L16 13 Q19 12 18 9 L17 6 Z M15 15 L18 14'},
  lantern:{color:'#f5bd7d',path:'M12 1 L23 12 L12 23 L1 12 Z M7 17 L16 6 L18 5 L18 8 L9 19 M6 13 L12 19 M16 12 L21 12 M16 15 L19 18'},
  guide:{color:'#becfff',path:'M5 3 H19 Q22 3 22 6 V14 Q22 17 19 17 H11 L5 22 V17 H4 Q2 17 2 14 V6 Q2 3 5 3 Z M7 8 H17 M7 12 H14'},
  gate:{color:'#e5e8c4',path:'M4 22 V3 H17 V8 M14 22 H4 M8 22 V6 H14 M10 14 H23 M19 10 L23 14 L19 18'},
  danger:{color:'#ffb09a',path:'M12 2 L23 22 H1 Z M12 8 V14 M12 18 V19'},
  hero:{color:'#fff0ba',path:'M3 8 L12 17 L21 8 M7 6 L12 11 L17 6'},
  boss:{color:'#f4c98c',path:'M3 6 L8 12 L12 3 L16 12 L21 6 L18 20 H6 Z M6 16 H18'},
  scenery:{color:'#b8b39f',path:'M12 2 A10 10 0 1 1 11.99 2 M12 6 V12 L17 15 M12 2 V4 M22 12 H20 M12 22 V20 M2 12 H4'},
  event:{color:'#f2c66d',path:'M6 22 V2 M6 3 H18 L15 7.5 L18 12 H6 M3 22 H10'},
  shield:{color:'#dec99b',path:'M12 2 L21 6 V13 Q20 20 12 23 Q4 20 3 13 V6 Z M12 6 V18'},
  bell:{color:'#bceee5',path:'M4 17 Q7 15 7 9 A5 5 0 0 1 17 9 Q17 15 20 17 Z M10 20 Q12 23 14 20 M12 2 V4'},
  slash:{color:'#f4d388',path:'M5 20 L19 4 L22 2 L21 6 L7 22 M3 14 L11 22 M3 22 L6 19'},
  lance:{color:'#f4d388',path:'M2 12 H22 M16 6 L22 12 L16 18 M2 6 H9 M2 18 H9 M7 9 V15'},
  sunbreak:{color:'#f4d388',path:'M2 12 H19 M13 5 L22 12 L13 19 M5 5 L8 8 M5 19 L8 16'},
  dash:{color:'#f4d388',path:'M2 6 H10 M2 12 H7 M2 18 H10 M12 4 L20 12 L12 20'},
  pulse:{color:'#f4d388',path:'M12 7 A5 5 0 1 1 11.99 7 M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5'}
};
export function symbolSvg(kind){
  const symbol=SYMBOLS[kind];
  return `<svg class="instruction-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="color:${symbol.color}"><path d="${symbol.path}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const paths=new Map();
export function drawSymbol(ctx,kind,x,y,size=24,color=SYMBOLS[kind].color){
  if(!paths.has(kind))paths.set(kind,new Path2D(SYMBOLS[kind].path));
  ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/24,size/24);ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(paths.get(kind));ctx.restore();
}
