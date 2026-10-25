// Seasonal skin (DR-08). The skin is a team setting the mentor can switch off; it is remembered on
// the device so the first screen already has the right colours before the server answers.
import { createContext, useContext } from 'react';

export type Skin = 'plain' | 'halloween';

const KEY = 'tvt.skin';
export const DEFAULT_SKIN: Skin = 'halloween';

export function rememberedSkin(): Skin {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'plain' || v === 'halloween' ? v : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

/** Sets the CSS skin (`<html data-skin>`), which switches the colour tokens in styles.css. */
export function applySkin(skin: Skin) {
  document.documentElement.dataset.skin = skin;
  try {
    localStorage.setItem(KEY, skin);
  } catch {
    /* private mode: fine for this session */
  }
}

interface SkinValue {
  skin: Skin;
  setSkin: (s: Skin) => void;
}

const SkinContext = createContext<SkinValue>({ skin: DEFAULT_SKIN, setSkin: () => {} });
export const SkinProvider = SkinContext.Provider;
export const useSkin = () => useContext(SkinContext).skin;
export const useSetSkin = () => useContext(SkinContext).setSkin;

/** Every animation is skipped when the OS asks for reduced motion (DR-05). */
export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
