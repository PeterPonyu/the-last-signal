// A sleeping loop wakes for input/layout changes and stays awake only during play.
export function createFrameLoop(draw, host = globalThis) {
  const interval=1000/60;
  let pending = null, previous = null, due = null;
  function wake() {
    if (pending === null) pending = host.requestAnimationFrame(frame);
  }
  function frame(now) {
    pending = null;
    if(due!==null&&now+0.1<due){wake();return;}
    const elapsed = previous === null ? 0 : Math.min(0.1, Math.max(0, (now - previous) / 1000));
    previous = now;
    due=(due??now)+interval;
    if(due<=now)due=now+interval;
    if (draw(elapsed)) wake();
    else previous = due = null;
  }
  return {
    wake,
    stop() {
      if (pending !== null) host.cancelAnimationFrame(pending);
      pending = previous = due = null;
    }
  };
}
