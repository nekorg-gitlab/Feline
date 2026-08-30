import { useAtomValue } from 'jotai';
import { settingsAtom } from '../state/settings';
import { getAnimationDuration } from '../utils/animations';

export function useAnimationDuration(): number {
  const settings = useAtomValue(settingsAtom);
  return getAnimationDuration(settings.animationsEnabled, settings.animationSpeed);
}

export function useAnimationEnabled(): boolean {
  const settings = useAtomValue(settingsAtom);
  return settings.animationsEnabled;
}
