// A sleeping loop wakes for input/layout changes and stays awake only during play.
// Paint rate: 60 (default) or 30 paints per second, or 0 to paint on every display refresh.
// The simulation behind it keeps its own fixed 60 Hz step, so the rate only changes smoothness.
export const FRAME_RATES=[60,0,30];
const intervalFor=rate=>rate>0?1000/rate:0;
export function createFrameLoop(draw, host = globalThis, {rate=60}={}) {
  const tolerance=1;
  let pending = null, previous = null, due = null, current = FRAME_RATES.includes(rate)?rate:60, interval=intervalFor(current);
  function wake() {
    if (pending === null) pending = host.requestAnimationFrame(frame);
  }
  function frame(now) {
    pending = null;
    // rAF timestamps wobble around the display period. Do not drop a whole
    // refresh because this callback arrived a fraction of a millisecond early.
    if(interval>0&&due!==null&&now+tolerance<due){wake();return;}
    const elapsed = previous === null ? 0 : Math.min(0.1, Math.max(0, (now - previous) / 1000));
    previous = now;
    if(interval>0){due=(due??now)+interval;if(due<=now)due=now+interval;}
    if (draw(elapsed)) wake();
    else previous = due = null;
  }
  return {
    wake,
    stop() {
      if (pending !== null) host.cancelAnimationFrame(pending);
      pending = previous = due = null;
    },
    // A new rate applies from the next paint; elapsed time stays continuous.
    setRate(next){
      if(!FRAME_RATES.includes(next)||next===current)return current;
      current=next;interval=intervalFor(next);due=null;return current;
    },
    get rate(){return current;}
  };
}
