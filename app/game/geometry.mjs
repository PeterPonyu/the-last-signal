import { WORLD } from '../../content/game.mjs';
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function segmentHitsCircle(ax, ay, bx, by, cx, cy, radius) {
  return segmentCircleTime(ax,ay,bx,by,cx,cy,radius)!==null;
}

export function segmentCircleTime(ax, ay, bx, by, cx, cy, radius) {
  // Reject distant scenery before solving the quadratic. Keep the original
  // intersection calculation for every possible hit, including tangencies.
  if(cx<Math.min(ax,bx)-radius||cx>Math.max(ax,bx)+radius||cy<Math.min(ay,by)-radius||cy>Math.max(ay,by)+radius)return null;
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
  const ox=ax-cx,oy=ay-cy,c=ox*ox+oy*oy-radius*radius;
  if(c<=0)return 0;
  if(!length)return null;
  const b=2*(ox*dx+oy*dy),discriminant=b*b-4*length*c;
  if(discriminant<0)return null;
  const t=(-b-Math.sqrt(discriminant))/(2*length);
  return t>=0&&t<=1?t:null;
}

export function clearPath(a, b, obstacles, padding = 0) {
  return !obstacles.some(o => segmentHitsCircle(a.x, a.y, b.x, b.y, o.x, o.y, o.radius + padding));
}

export function moveBody(body, dx, dy, obstacles, radius = 18) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
  for (let i = 0; i < steps; i++) {
    body.x = clamp(body.x + dx / steps, WORLD.left, WORLD.right);
    body.y = clamp(body.y + dy / steps, WORLD.top, WORLD.bottom);
    for (const o of obstacles) {
      const x = body.x - o.x, y = body.y - o.y, limit = radius + o.radius;
      if(Math.abs(x)>=limit||Math.abs(y)>=limit)continue;
      const d = Math.hypot(x, y);
      if (d < limit) { body.x = o.x + (d ? x / d : 1) * limit; body.y = o.y + (d ? y / d : 0) * limit; }
    }
  }
}

export const CELL = 40, COLS = Math.ceil(WORLD.width / CELL), ROWS = Math.ceil(WORLD.height / CELL);
const terrainCache = new WeakMap();
const indexAt = p => clamp(Math.floor(p.y / CELL), 0, ROWS - 1) * COLS + clamp(Math.floor(p.x / CELL), 0, COLS - 1);
const centerAt = index => ({ x: (index % COLS + 0.5) * CELL, y: (Math.floor(index / COLS) + 0.5) * CELL });
export function navigationField(obstacles, target) {
  let terrain = terrainCache.get(obstacles);
  if (!terrain) { const blocked = Array.from({length:COLS*ROWS},(_, i) => {
    const p = centerAt(i);
    return p.x < WORLD.left || p.x > WORLD.right || p.y < WORLD.top || p.y > WORLD.bottom || obstacles.some(o => distance(p, o) < o.radius + 34);
  }); terrain={blocked,queue:new Int32Array(COLS*ROWS),start:-1,field:null};terrainCache.set(obstacles, terrain); }
  const {blocked,queue}=terrain;
  let start = indexAt(target);
  if (blocked[start]) {
    let nearest = Infinity;
    for (let i = 0; i < blocked.length; i++) if (!blocked[i]) { const d = distance(centerAt(i), target); if (d < nearest) { start = i; nearest = d; } }
  }
  if(terrain.start===start)return terrain.field;
  const costs = Array(COLS * ROWS).fill(Infinity);
  // Each cell enters the queue once. Keep the same E/W/S/N traversal without
  // creating four coordinate pairs for every visited cell.
  let tail=1;
  queue[0]=start;costs[start] = 0;
  for (let head = 0; head < tail; head++) {
    const i = queue[head], x = i % COLS;
    for (let direction=0;direction<4;direction++) {
      if((direction===0&&x===COLS-1)||(direction===1&&x===0))continue;
      const j=i+(direction===0?1:direction===1?-1:direction===2?COLS:-COLS);
      if (j<0||j>=costs.length||blocked[j]||costs[j]!==Infinity) continue;
      costs[j] = costs[i] + 1; queue[tail++]=j;
    }
  }
  terrain.start=start;terrain.field=costs;return costs;
}

export function directionTo(body, target, obstacles, field) {
  let point = target;const clearance=body.radius??18;
  let escapeX=0,escapeY=0;
  for(const obstacle of obstacles){
    const limit=obstacle.radius+clearance+2;
    if(Math.abs(body.x-obstacle.x)>limit||Math.abs(body.y-obstacle.y)>limit)continue;
    const d=distance(body,obstacle);
    if(d<=obstacle.radius+clearance+2){escapeX+=d?(body.x-obstacle.x)/d:1;escapeY+=d?(body.y-obstacle.y)/d:0;}
  }
  const escapeLength=Math.hypot(escapeX,escapeY);
  if(escapeLength>0)return {x:escapeX/escapeLength,y:escapeY/escapeLength};
  if (!clearPath(body, target, obstacles, clearance+6)) {
    const i = indexAt(body), x = i % COLS, y = Math.floor(i / COLS);
    let best = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy, j = ny * COLS + nx;
      if ((!dx && !dy) || nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || !Number.isFinite(field[j]) || field[j] >= field[i]) continue;
      const candidate = centerAt(j), score = field[j] + distance(body, candidate) / CELL;
      if (score < best && clearPath(body, candidate, obstacles, clearance+2)) { best = score; point = candidate; }
    }
    if (point === target) {
      // A body pressed into cover may sit in an inflated cell. Rejoin a reachable
      // nearby cell before descending the field; never steer blindly into stone.
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const nx=x+dx,ny=y+dy,j=ny*COLS+nx;
        if(nx<0||nx>=COLS||ny<0||ny>=ROWS||!Number.isFinite(field[j]))continue;
        const candidate=centerAt(j),score=field[j]+distance(body,candidate)/CELL;
        if(score<best&&clearPath(body,candidate,obstacles,body.radius||18)){best=score;point=candidate;}
      }
      if (point === target) return {x:0,y:0};
    }
  }
  const dx = point.x - body.x, dy = point.y - body.y, length = Math.hypot(dx,dy) || 1;
  return { x: dx / length, y: dy / length };
}
