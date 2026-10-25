// The mentor console's shared state. In its own module (not MentorApp.tsx) so the pages do not
// import the app shell back, and a hot reload of the shell in development cannot leave a page
// holding a different context object ("useMentor outside provider").
import { createContext, useContext } from 'react';
import type { MentorApi, MentorSession, TeamData } from '../api/types';
import type { CourseContent } from '../content/types';
import type { Translate } from '../content/strings';

export interface MentorCtx {
  api: MentorApi;
  session: MentorSession;
  data: TeamData;
  /** Content of every version referenced by data, plus the active one. */
  contents: Map<string, CourseContent>;
  active: CourseContent;
  activeId: string;
  t: Translate;
  refresh: () => Promise<void>;
  /** Runs a change, shows its error if any, then reloads. */
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
  /** Shows a short message at the top of the page. */
  notify: (message: string) => void;
}

export const MentorContext = createContext<MentorCtx | null>(null);
export const useMentor = () => {
  const v = useContext(MentorContext);
  if (!v) throw new Error('useMentor outside provider');
  return v;
};
