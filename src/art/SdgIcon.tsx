import { useState } from 'react';
import type { Sdg } from '../content/types';

// Official SDG colours, used for the fallback tile until the official Vietnamese icons are placed
// at the paths the content file names (see public/assets/sdg/README.md).
const SDG_COLORS = [
  '#E5243B', '#DDA63A', '#4C9F38', '#C5192D', '#FF3A21', '#26BDE2', '#FCC30B', '#A21942', '#FD6925',
  '#DD1367', '#FD9D24', '#BF8B2E', '#3F7E44', '#0A97D9', '#56C02B', '#00689D', '#19486A',
];

export function SdgIcon({ sdg }: { sdg: Sdg }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return <img src={`/${sdg.icon}`} alt={`${sdg.number}. ${sdg.title}`} onError={() => setFailed(true)} loading="lazy" />;
  }
  return (
    <span className="sdg-fallback" style={{ background: SDG_COLORS[sdg.number - 1] }} role="img" aria-label={`${sdg.number}. ${sdg.title}`}>
      <span className="n">{sdg.number}</span>
      <span>{sdg.title}</span>
    </span>
  );
}
