export const UI_FONT='Arial, sans-serif';
const roles={label:[600,15],small:[600,12],number:[700,17],map:[700,11]};
export function canvasFont(role='label',scale=1){
  const [weight,size]=roles[role];
  return `${weight} ${size*scale}px ${UI_FONT}`;
}
