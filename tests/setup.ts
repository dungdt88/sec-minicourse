// jsdom lacks a few browser APIs the app touches.
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.randomUUID) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
