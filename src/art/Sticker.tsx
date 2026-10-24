// One sticker per level (FR-P-08). Generated so that level 8, 9… get one without new artwork;
// a level can name its own image with `sticker: "assets/stickers/l1.png"`.

const COLORS = ['#e8743b', '#3f8f5a', '#4a7fc1', '#c2577a', '#f2b632', '#7a5cc2', '#2a9d9a'];

function Icon({ kind }: { kind: number }) {
  switch (kind) {
    case 0: // bracelet
      return (
        <g>
          <circle cx="50" cy="50" r="18" fill="none" stroke="#fff" strokeWidth="5" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={50 + 18 * Math.cos((i * Math.PI) / 3)} cy={50 + 18 * Math.sin((i * Math.PI) / 3)} r="6" fill="#fff" />
          ))}
        </g>
      );
    case 1: // check / idea works
      return <path d="M32 52 L45 64 L70 36" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />;
    case 2: // friends (two heads)
      return (
        <g fill="#fff">
          <circle cx="40" cy="42" r="9" />
          <circle cx="62" cy="42" r="9" />
          <path d="M26 70 Q40 52 52 70 Z" />
          <path d="M48 70 Q62 52 76 70 Z" />
        </g>
      );
    case 3: // shop tag
      return (
        <g>
          <path d="M30 40 L50 30 L72 30 L72 66 L50 66 L30 56 Z" fill="#fff" />
          <circle cx="40" cy="48" r="4" fill="rgba(0,0,0,0.25)" />
        </g>
      );
    case 4: // coin
      return (
        <g>
          <circle cx="50" cy="50" r="20" fill="#fff" />
          <text x="50" y="58" textAnchor="middle" fontSize="24" fontWeight="900" fill="rgba(0,0,0,0.35)">
            đ
          </text>
        </g>
      );
    case 5: // piggy jar / heart
      return <path d="M50 70 C20 50 30 28 44 32 C48 33 50 36 50 38 C50 36 52 33 56 32 C70 28 80 50 50 70 Z" fill="#fff" />;
    default: // star
      return (
        <path
          d="M50 26 L56 43 L74 43 L60 54 L65 72 L50 61 L35 72 L40 54 L26 43 L44 43 Z"
          fill="#fff"
          strokeLinejoin="round"
        />
      );
  }
}

export function Sticker({ order, image, size = 56, label }: { order: number; image?: string; size?: number; label?: string }) {
  if (image) return <img src={`/${image}`} width={size} height={size} alt={label ?? ''} />;
  const color = COLORS[(order - 1) % COLORS.length];
  const scallops = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI * 2) / 16;
    return <circle key={i} cx={50 + 42 * Math.cos(a)} cy={50 + 42 * Math.sin(a)} r="8" fill={color} />;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {scallops}
      <circle cx="50" cy="50" r="42" fill={color} />
      <circle cx="50" cy="50" r="35" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />
      <Icon kind={(order - 1) % 7} />
    </svg>
  );
}
