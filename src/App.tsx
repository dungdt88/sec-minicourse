import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { applySkin, rememberedSkin, SkinProvider, type Skin } from './art/skin';
import { PinEntry, ProfilePicker, SessionGate } from './player/Entry';
import { Home } from './player/Home';
import { Homework } from './player/Homework';
import { LevelPlayer } from './player/LevelPlayer';

// The mentor console (and the PDF library it loads) is a separate bundle children never download.
const MentorApp = lazy(() => import('./mentor/MentorApp'));

export function App() {
  // The skin starts from what this device saw last, then follows the team setting (DR-08).
  const [skin, setSkinState] = useState<Skin>(rememberedSkin);
  useEffect(() => applySkin(skin), [skin]);
  const setSkin = useCallback((s: Skin) => setSkinState(s), []);

  return (
    <SkinProvider value={{ skin, setSkin }}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<ProfilePicker />} />
            <Route path="/pin/:profileId" element={<PinEntry />} />
            <Route path="/play" element={<SessionGate />}>
              <Route path="home" element={<Home />} />
              <Route path="level/:levelId" element={<LevelPlayer />} />
              <Route path="homework" element={<Homework />} />
              <Route index element={<Navigate to="home" replace />} />
            </Route>
            <Route path="/mentor/*" element={<MentorApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SkinProvider>
  );
}
