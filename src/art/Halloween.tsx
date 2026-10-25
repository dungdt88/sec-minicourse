// Halloween skin art (DR-02, DR-08), drawn as SVG like the characters: the mascot Drắc Nhí, candy,
// pumpkin, ghost, bat and the four costumes. Friendly, round, never scary.

export type MascotExpression = 'neutral' | 'happy' | 'oops';

/** Drắc Nhí: a baby Dracula with a big round head, tiny fangs and a too-big cape collar. */
export function Mascot({ expression = 'neutral', size = 96, label }: { expression?: MascotExpression; size?: number; label?: string }) {
  const ink = '#2b211c';
  return (
    <svg className="character" width={size} height={size} viewBox="0 0 120 120" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {/* cape collar */}
      <path d="M14 112 L30 70 L60 92 L90 70 L106 112 Z" fill="#7a3fb0" stroke="#4e2575" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 98 L60 92 L84 98 L60 110 Z" fill="#c0392b" />
      {/* head */}
      <circle cx="60" cy="56" r="34" fill="#f4ecf7" stroke="#8e7aa0" strokeWidth="3" />
      {/* hair with a widow's peak */}
      <path d="M26 50 C28 26 48 18 60 30 C72 18 92 26 94 50 C86 40 74 36 60 44 C46 36 34 40 26 50 Z" fill="#2f2440" />
      {/* cheeks */}
      <circle cx="40" cy="66" r="5" fill="#f3a6c0" opacity="0.7" />
      <circle cx="80" cy="66" r="5" fill="#f3a6c0" opacity="0.7" />
      {expression === 'happy' ? (
        <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round">
          <path d="M42 58 Q48 51 54 58" />
          <path d="M66 58 Q72 51 78 58" />
        </g>
      ) : expression === 'oops' ? (
        <g>
          <circle cx="48" cy="57" r="6" fill="#fff" stroke={ink} strokeWidth="2.5" />
          <circle cx="48" cy="57" r="3" fill={ink} />
          <circle cx="72" cy="57" r="6" fill="#fff" stroke={ink} strokeWidth="2.5" />
          <circle cx="72" cy="57" r="3" fill={ink} />
        </g>
      ) : (
        <g fill={ink}>
          <circle cx="48" cy="57" r="4.5" />
          <circle cx="72" cy="57" r="4.5" />
        </g>
      )}
      {/* mouth with two tiny fangs */}
      {expression === 'oops' ? (
        <ellipse cx="60" cy="76" rx="5" ry="6" fill="#7a2f2f" stroke={ink} strokeWidth="2" />
      ) : (
        <g>
          <path d={expression === 'happy' ? 'M48 72 Q60 86 72 72 Z' : 'M50 74 Q60 80 70 74'} fill={expression === 'happy' ? '#c44b4b' : 'none'} stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M53 73 L55 79 L57 73 Z M63 73 L65 79 L67 73 Z" fill="#fff" stroke={ink} strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

/** A wrapped candy; `empty` is the wrapper without the sweet (a question not right first time). */
export function Candy({ empty, size = 44 }: { empty?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {empty ? (
        <g fill="none" stroke="#b9a7c9" strokeWidth="2.5" strokeDasharray="4 3" strokeLinejoin="round">
          <path d="M4 16 L14 24 L4 32 Z" />
          <path d="M44 16 L34 24 L44 32 Z" />
          <ellipse cx="24" cy="24" rx="11" ry="9" />
        </g>
      ) : (
        <g strokeLinejoin="round">
          <path d="M3 15 L14 24 L3 33 Z" fill="#f7a8c4" stroke="#c9577e" strokeWidth="2" />
          <path d="M45 15 L34 24 L45 33 Z" fill="#f7a8c4" stroke="#c9577e" strokeWidth="2" />
          <ellipse cx="24" cy="24" rx="12" ry="10" fill="#f28c38" stroke="#b85e14" strokeWidth="2" />
          <path d="M17 19 Q24 30 31 19" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.8" />
        </g>
      )}
    </svg>
  );
}

export function Pumpkin({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <path d="M30 14 C30 8 34 5 38 4" fill="none" stroke="#3f7e44" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="20" cy="35" rx="13" ry="18" fill="#f28c38" stroke="#b85e14" strokeWidth="2" />
      <ellipse cx="40" cy="35" rx="13" ry="18" fill="#f28c38" stroke="#b85e14" strokeWidth="2" />
      <ellipse cx="30" cy="35" rx="11" ry="19" fill="#f6a04d" stroke="#b85e14" strokeWidth="2" />
      <path d="M21 31 L25 27 L28 32 Z M39 31 L35 27 L32 32 Z" fill="#7a3f10" />
      <path d="M22 41 Q30 47 38 41" fill="none" stroke="#7a3f10" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Ghost({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 28 V14 C6 7 11 3 16 3 C21 3 26 7 26 14 V28 L22 25 L19 28 L16 25 L13 28 L10 25 Z" fill="#fff" stroke="#8e7aa0" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12.5" cy="14" r="2" fill="#2b211c" />
      <circle cx="19.5" cy="14" r="2" fill="#2b211c" />
      <ellipse cx="16" cy="19.5" rx="2" ry="1.5" fill="#f3a6c0" />
    </svg>
  );
}

export function Bat({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 50 30" aria-hidden="true">
      <path d="M25 10 C22 4 18 6 18 10 C12 4 4 6 2 14 C8 12 12 16 14 20 C17 16 21 18 25 24 C29 18 33 16 36 20 C38 16 42 12 48 14 C46 6 38 4 32 10 C32 6 28 4 25 10 Z" fill="#5b3d7a" />
      <circle cx="22.5" cy="12" r="1.3" fill="#fff" />
      <circle cx="27.5" cy="12" r="1.3" fill="#fff" />
    </svg>
  );
}

/** Costumes drawn over the 120×120 character (witch hat, pumpkin cap, bat bow, wizard hat). */
export function Costume({ characterId }: { characterId: string }) {
  switch (characterId) {
    case 'soc': // witch hat
      return (
        <g>
          <path d="M30 34 L60 -6 L90 34 Z" fill="#4e2575" stroke="#2f1748" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="60" cy="34" rx="40" ry="8" fill="#5b2d8a" stroke="#2f1748" strokeWidth="3" />
          <rect x="42" y="24" width="36" height="6" fill="#f28c38" />
        </g>
      );
    case 'gau': // pumpkin cap
      return (
        <g>
          <path d="M60 10 C60 4 64 2 68 2" fill="none" stroke="#3f7e44" strokeWidth="4" strokeLinecap="round" />
          <path d="M28 34 C28 14 44 8 60 8 C76 8 92 14 92 34 Z" fill="#f28c38" stroke="#b85e14" strokeWidth="3" />
          <path d="M60 8 V34 M44 11 C40 20 40 28 42 34 M76 11 C80 20 80 28 78 34" stroke="#b85e14" strokeWidth="2" fill="none" />
        </g>
      );
    case 'tho': // bat bow between the ears
      return (
        <g transform="translate(35 22) scale(1)">
          <path d="M25 10 C22 4 18 6 18 10 C12 4 4 6 2 14 C8 12 12 16 14 20 C17 16 21 18 25 24 C29 18 33 16 36 20 C38 16 42 12 48 14 C46 6 38 4 32 10 C32 6 28 4 25 10 Z" fill="#5b3d7a" />
        </g>
      );
    case 'cu': // wizard hat with stars
      return (
        <g>
          <path d="M34 36 L64 -4 L86 36 Z" fill="#3a5aa8" stroke="#22356a" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="60" cy="36" rx="34" ry="7" fill="#4a6cc2" stroke="#22356a" strokeWidth="3" />
          <path d="M56 16 l2 4 4 0.5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -0.5 z" fill="#f2b632" />
          <circle cx="70" cy="24" r="2" fill="#f2b632" />
        </g>
      );
    default:
      return null;
  }
}
