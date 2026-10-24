import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './styles.css';
import { App } from './App';
import { installErrorReporting } from './errors';

installErrorReporting();
createRoot(document.getElementById('root')!).render(<App />);
