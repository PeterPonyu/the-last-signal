// Page icons for the answer cards, party roster, map-rule chip and locked skills.
// Same grammar as the battlefield symbols (src/render/symbols.mjs): one 24-unit stroked path,
// round joins, colour from CSS (currentColor) so rarity and state styles can tint them.
import {SYMBOLS} from '../render/symbols.mjs';

export const UI_ICONS={
  lock:'M6.5 11 H17.5 Q19 11 19 12.5 V19.5 Q19 21 17.5 21 H6.5 Q5 21 5 19.5 V12.5 Q5 11 6.5 11 Z M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11 M12 14.5 V17.5',
  reroll:'M20 12 A8 8 0 0 1 6.3 17.7 M4 12 A8 8 0 0 1 17.7 6.3 M17.7 2.8 V6.3 H14.2 M6.3 21.2 V17.7 H9.8',
  // Card kinds
  skill:'M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z',
  gift:'M12 3 L20 9 L12 21 L4 9 Z M4 9 H20 M9 9 L12 21 L15 9 M9 9 L12 3 L15 9',
  stat:'M5 13 L12 6 L19 13 M5 19 L12 12 L19 19',
  party:'M9 5 A3 3 0 1 1 8.99 5 M3 20 Q3 13 9 13 Q15 13 15 20 M16 6.5 A2.5 2.5 0 1 1 15.99 6.5 M17 13.2 Q21 13.8 21 19',
  // Card art for gifts and stats that bring no icon of their own
  shard:'M14 3 L20 9 L10 21 L4 15 Z M14 3 L10 21 M2 6 H7 M3 10 H6',
  heart:'M12 20 C6 16 3 12.5 3 9 A4.5 4.5 0 0 1 12 7 A4.5 4.5 0 0 1 21 9 C21 12.5 18 16 12 20 Z',
  wind:'M3 8 H14 A3 3 0 1 0 11 5 M3 12 H19 A3 3 0 1 1 16 15 M3 16 H10',
  orbit:'M12 9.5 A2.5 2.5 0 1 1 11.99 9.5 M4 12 A8 8 0 0 1 19 8 M20 12 A8 8 0 0 1 5 16 M19 8 L21.5 5.5 M5 16 L2.5 18.5',
  chain:'M3 17 L8 12 L12 16 L16 8 L21 5 M8 10.4 A1.6 1.6 0 1 1 7.99 10.4 M16 6.4 A1.6 1.6 0 1 1 15.99 6.4',
  comet:'M16 4.5 A3.5 3.5 0 1 1 15.99 4.5 M13.5 10.5 L4 20 M12.5 8 L5 13 M16 11.5 L11 19',
  ember:'M12 21 C7 21 5 17.5 6 14 C7 11 9.5 10 9.5 6.5 C12 8 13 10 12.5 12.5 C14 11.5 15 10 15 8.5 C18 11 19 14 18 16.5 C17 19.5 15 21 12 21 Z',
  split:'M3 12 H10 L19 5 M10 12 H20 M10 12 L19 19 M15.5 4.5 H19.5 V8.5 M15.5 19.5 H19.5 V15.5',
  bloom:'M12 12 C9 9 9 5 12 3 C15 5 15 9 12 12 C15 9 19 9 21 12 C19 15 15 15 12 12 C15 15 15 19 12 21 C9 19 9 15 12 12 C9 15 5 15 3 12 C5 9 9 9 12 12 Z',
  // Map rules (garden, causeway, court, foundry, observatory)
  roots:'M3 13 H21 M12 13 V5 M12 8 C9 8 8 6 8 4 C10 4 12 5 12 8 M12 7 C15 7 16 5 16 3 C14 3 12 4 12 7 M12 13 C11 16 9 17 6 18 M12 13 C13 16 15 17 18 18 M12 13 V21',
  echo:'M7 16 Q9 14.5 9 10 A3 3 0 0 1 15 10 Q15 14.5 17 16 Z M11 18.5 Q12 20 13 18.5 M4.5 7 Q2.5 11 4.5 15 M19.5 7 Q21.5 11 19.5 15',
  stillness:'M5 4 H19 M6 4 V7 H18 V4 M8 7 V18 M12 7 V18 M16 7 V18 M6 18 H18 V21 H6 Z',
  heat:'M4 21 H20 M7 21 V17 H17 V21 M12 15 C9 15 8 12.5 9 10.5 C10 9 11 8 11 5.5 C13 7 14 8.5 13.6 10.5 C14.6 10 15.2 9 15.2 8 C16.8 10 17 12 16 13.5 C15 14.8 13.6 15 12 15 Z',
  stars:'M14 3 L15.5 7 L19.5 7.5 L16.4 10.2 L17.3 14.2 L14 12.1 L10.7 14.2 L11.6 10.2 L8.5 7.5 L12.5 7 Z M9 15 L4 20 M12 17 L8 21 M6 13 L3 16',
  // A Hollow carrying a Choir gift
  affix:'M12 4 A8 8 0 1 1 11.99 4 M12 1 V4 M12 20 V23 M1 12 H4 M20 12 H23 M12 9 L15 12 L12 15 L9 12 Z'
};
// Each map's rule falls back to its land's icon when the rule brings none the page knows.
export const RULE_ICONS=['roots','echo','stillness','heat','stars'];

const isPath=value=>typeof value==='string'&&/^[Mm][\d\s.,-]/.test(value)&&/^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/.test(value);
export function hasIcon(name){return typeof name==='string'&&(Object.hasOwn(UI_ICONS,name)||Object.hasOwn(SYMBOLS,name)||isPath(name));}
const pathOf=name=>Object.hasOwn(UI_ICONS,name)?UI_ICONS[name]:Object.hasOwn(SYMBOLS,name)?SYMBOLS[name].path:isPath(name)?name:null;
// An inline icon in the current text colour: a UI icon, a battlefield symbol's path, or a raw 24-unit path.
export function iconSvg(name,fallback='skill'){
  const path=pathOf(name)||pathOf(fallback)||UI_ICONS.skill;
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
