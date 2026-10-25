// FR-P-18 / DR-05: after a quiz answer, Drắc Nhí pops over the page for under 2 s. Right: jumps in
// with a cheer while sweets and bats fly out. Wrong: wobbles with "Ối!" while two bats flutter off.
// It never takes a tap (pointer-events: none), never covers the explanation once it has ended,
// and is not shown at all when the OS asks for reduced motion.
import { useEffect, useState } from 'react';
import { Bat, Candy, Mascot } from '../art/Halloween';
import { prefersReducedMotion } from '../art/skin';

const DURATION_MS = 1800;

export function MascotPopup({ right, word }: { right: boolean; word: string }) {
  const [visible, setVisible] = useState(() => !prefersReducedMotion());
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setVisible(false), DURATION_MS);
    return () => clearTimeout(id);
  }, [visible]);
  if (!visible) return null;
  const flyers = right ? ['c', 'b', 'c', 'b', 'c', 'c'] : ['b', 'b'];
  return (
    <div className={`mascot-pop ${right ? 'right' : 'wrong'}`} aria-hidden="true">
      <div className="mascot-pop-body">
        <Mascot expression={right ? 'happy' : 'oops'} size={110} />
        <span className="mascot-pop-word">{word}</span>
      </div>
      {flyers.map((k, i) => (
        <span key={i} className={`flyer f${i}`}>
          {k === 'c' ? <Candy size={30} /> : <Bat size={34} />}
        </span>
      ))}
    </div>
  );
}
