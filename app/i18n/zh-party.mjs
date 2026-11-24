// Simplified Chinese for the party feature, keyed by exact English source text (same shape as zh.mjs).
// Merged by src/i18n/index.mjs; owned by the party worker. Keeper names and skills are already in zh.mjs.
export const ZH={
  // Ally role labels (content/party.mjs)
  'Support caster':'辅助术士',
  'Fox striker':'灵狐前锋',
  'Forge striker':'锻火前锋',
  'Seed healer':'种子医者',
  'Signal gunner':'信号射手',
  'Flare scout':'焰光斥候',
  'Memory caster':'记忆术士',
  'Shield guard':'持盾卫士',
  'Ally':'队友',
  // Downed marker (src/render/party-vfx.mjs)
  'Reviving':'复苏中'
};
export const ZH_PATTERNS=[
  [/^Back in (\d+)s$/,'$1 秒后归队'],
  [/^(.+) joins the party$/,'$1加入队伍']
];
