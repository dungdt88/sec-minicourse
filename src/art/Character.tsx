// Placeholder character art drawn as SVG: squirrel, bear, rabbit and owl, each with neutral,
// happy, thinking and oops expressions (DR-02). Real artwork replaces these by adding
// `images: { neutral: "assets/characters/soc-neutral.png", … }` to a character in the content file.

import type { Character as CharacterData, Expression } from '../content/types';

interface Props {
  character: CharacterData | undefined;
  expression?: Expression;
  size?: number;
  /** Decorative next to text that already names the character. */
  decorative?: boolean;
}

interface Look {
  fur: string;
  dark: string;
  muzzle: string;
  ears: (fur: string, dark: string) => React.ReactNode;
  back?: (fur: string, dark: string) => React.ReactNode;
  owl?: boolean;
}

const LOOKS: Record<string, Look> = {
  soc: {
    fur: '#c8743a',
    dark: '#8a4a1f',
    muzzle: '#f6dcc0',
    back: (fur, dark) => (
      <path
        d="M86 96 C118 92 122 52 104 34 C96 26 84 30 88 42 C98 56 96 74 80 84 Z"
        fill={fur}
        stroke={dark}
        strokeWidth="3"
      />
    ),
    ears: (fur, dark) => (
      <>
        <path d="M34 34 L30 12 L50 28 Z" fill={fur} stroke={dark} strokeWidth="3" strokeLinejoin="round" />
        <path d="M86 34 L90 12 L70 28 Z" fill={fur} stroke={dark} strokeWidth="3" strokeLinejoin="round" />
      </>
    ),
  },
  gau: {
    fur: '#9a6a43',
    dark: '#5e3d22',
    muzzle: '#e9cfa8',
    ears: (fur, dark) => (
      <>
        <circle cx="32" cy="30" r="13" fill={fur} stroke={dark} strokeWidth="3" />
        <circle cx="32" cy="30" r="6" fill="#e9cfa8" />
        <circle cx="88" cy="30" r="13" fill={fur} stroke={dark} strokeWidth="3" />
        <circle cx="88" cy="30" r="6" fill="#e9cfa8" />
      </>
    ),
  },
  tho: {
    fur: '#f4ecec',
    dark: '#8f7377',
    muzzle: '#ffffff',
    ears: (fur, dark) => (
      <>
        <ellipse cx="44" cy="20" rx="9" ry="24" fill={fur} stroke={dark} strokeWidth="3" transform="rotate(-10 44 20)" />
        <ellipse cx="44" cy="22" rx="4" ry="16" fill="#f3b8c6" transform="rotate(-10 44 22)" />
        <ellipse cx="76" cy="20" rx="9" ry="24" fill={fur} stroke={dark} strokeWidth="3" transform="rotate(10 76 20)" />
        <ellipse cx="76" cy="22" rx="4" ry="16" fill="#f3b8c6" transform="rotate(10 76 22)" />
      </>
    ),
  },
  cu: {
    fur: '#7e8fa8',
    dark: '#4b5a70',
    muzzle: '#dfe6ef',
    owl: true,
    ears: (fur, dark) => (
      <>
        <path d="M30 40 L26 18 L46 32 Z" fill={fur} stroke={dark} strokeWidth="3" strokeLinejoin="round" />
        <path d="M90 40 L94 18 L74 32 Z" fill={fur} stroke={dark} strokeWidth="3" strokeLinejoin="round" />
      </>
    ),
  },
};

function Eyes({ expression, owl }: { expression: Expression; owl?: boolean }) {
  const ink = '#2b211c';
  const lx = 46;
  const rx = 74;
  const y = 58;
  const rings = owl ? (
    <>
      <circle cx={lx} cy={y} r="13" fill="#fff" stroke="#4b5a70" strokeWidth="3" />
      <circle cx={rx} cy={y} r="13" fill="#fff" stroke="#4b5a70" strokeWidth="3" />
    </>
  ) : null;
  switch (expression) {
    case 'happy':
      return (
        <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round">
          {rings}
          <path d={`M${lx - 6} ${y + 2} Q${lx} ${y - 6} ${lx + 6} ${y + 2}`} />
          <path d={`M${rx - 6} ${y + 2} Q${rx} ${y - 6} ${rx + 6} ${y + 2}`} />
        </g>
      );
    case 'thinking':
      return (
        <g>
          {rings}
          <circle cx={lx + 2} cy={y - 3} r="4.5" fill={ink} />
          <circle cx={rx + 2} cy={y - 3} r="4.5" fill={ink} />
          <path d={`M${lx - 8} ${y - 14} L${lx + 6} ${y - 12}`} stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'oops':
      return (
        <g>
          {rings}
          <circle cx={lx} cy={y} r="7" fill="#fff" stroke={ink} strokeWidth="2.5" />
          <circle cx={lx} cy={y} r="3.5" fill={ink} />
          <circle cx={rx} cy={y} r="7" fill="#fff" stroke={ink} strokeWidth="2.5" />
          <circle cx={rx} cy={y} r="3.5" fill={ink} />
        </g>
      );
    default:
      return (
        <g>
          {rings}
          <circle cx={lx} cy={y} r="5" fill={ink} />
          <circle cx={rx} cy={y} r="5" fill={ink} />
          <circle cx={lx + 1.5} cy={y - 1.5} r="1.5" fill="#fff" />
          <circle cx={rx + 1.5} cy={y - 1.5} r="1.5" fill="#fff" />
        </g>
      );
  }
}

function Mouth({ expression, owl }: { expression: Expression; owl?: boolean }) {
  const ink = '#2b211c';
  if (owl) {
    const beak = <path d="M55 70 L65 70 L60 80 Z" fill="#f2a33a" stroke="#b86d12" strokeWidth="2" strokeLinejoin="round" />;
    if (expression === 'happy') return <>{beak}<path d="M50 86 Q60 92 70 86" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" /></>;
    if (expression === 'oops') return <>{beak}<ellipse cx="60" cy="88" rx="4" ry="4" fill={ink} /></>;
    return beak;
  }
  const nose = <ellipse cx="60" cy="72" rx="5" ry="4" fill={ink} />;
  switch (expression) {
    case 'happy':
      return (
        <>
          {nose}
          <path d="M48 80 Q60 96 72 80 Z" fill="#c44b4b" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        </>
      );
    case 'thinking':
      return (
        <>
          {nose}
          <path d="M53 84 L67 82" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'oops':
      return (
        <>
          {nose}
          <ellipse cx="60" cy="86" rx="5" ry="6" fill="#7a2f2f" stroke={ink} strokeWidth="2.5" />
        </>
      );
    default:
      return (
        <>
          {nose}
          <path d="M52 80 Q60 87 68 80" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </>
      );
  }
}

export function Character({ character, expression = 'neutral', size = 120, decorative }: Props) {
  const image = character?.images?.[expression] ?? character?.images?.neutral;
  const label = decorative ? undefined : character?.name;
  if (image) {
    return <img className="character" src={`/${image}`} width={size} height={size} alt={label ?? ''} />;
  }
  const look = LOOKS[character?.id ?? ''] ?? LOOKS.gau;
  return (
    <svg
      className="character"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {look.back?.(look.fur, look.dark)}
      {look.ears(look.fur, look.dark)}
      <ellipse cx="60" cy="66" rx="40" ry="38" fill={look.fur} stroke={look.dark} strokeWidth="3" />
      {look.owl ? (
        <ellipse cx="60" cy="86" rx="20" ry="14" fill={look.muzzle} />
      ) : (
        <ellipse cx="60" cy="80" rx="20" ry="15" fill={look.muzzle} />
      )}
      <circle cx="34" cy="76" r="6" fill="#f29a9a" opacity="0.55" />
      <circle cx="86" cy="76" r="6" fill="#f29a9a" opacity="0.55" />
      <Eyes expression={expression} owl={look.owl} />
      <Mouth expression={expression} owl={look.owl} />
      {expression === 'thinking' && (
        <g fill="#fff" stroke="#8a7b70" strokeWidth="2">
          <circle cx="100" cy="30" r="4" />
          <circle cx="108" cy="18" r="6" />
        </g>
      )}
      {expression === 'oops' && <path d="M96 40 Q100 48 96 52 Q92 48 96 40 Z" fill="#7cc4f2" stroke="#3d8cc0" strokeWidth="1.5" />}
    </svg>
  );
}

/** Characters rotate through the levels unless the level names one. */
export function levelCharacter(characters: CharacterData[], level: { order: number; character?: string }) {
  return characters.find((c) => c.id === level.character) ?? characters[(level.order - 1) % characters.length];
}
