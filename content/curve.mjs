// How hard each map is, rising steeply from map 1 to map 5 to match the growing party (one recruit per
// map) and the skills learned from the answers. Multipliers apply on map index 0..4.
// health/damage: ordinary Hollow; stageHealth: extra health per campaign step within a map;
// bossDamage: champion and Warden hits (health stays authored per boss in content/bosses.mjs).
export const CURVE={
  health:[1,1.3,1.7,2.25,3],
  damage:[1,1.1,1.22,1.36,1.52],
  stageHealth:0.12,
  bossDamage:[1,1.08,1.2,1.32,1.48],
  // Hard already hits harder everywhere, so its damage climbs more gently between maps (multiplier^growth).
  growth:{easy:1,normal:1,hard:0.4}
};
