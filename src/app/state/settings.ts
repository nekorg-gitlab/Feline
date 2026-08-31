import { atom } from 'jotai';
import { AppLanguage, isAppLanguage } from '../utils/language';

const STORAGE_KEY = 'settings';

export type CustomThemeColorGroup =
  'Background' | 'Surface' | 'SurfaceVariant' | 'Primary' | 'Secondary';
export type DateFormat =
  'D MMM YYYY' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'YYYY-MM-DD' | '';
export type MessageSpacing = '0' | '100' | '200' | '300' | '400' | '500';
export enum MessageLayout {
  Modern = 0,
  Compact = 1,
  Bubble = 2,
}

export type NoiseSuppressionQuality = 'off' | 'low' | 'medium' | 'high';

export interface Settings {
  themeId?: string;
  useSystemTheme: boolean;
  lightThemeId?: string;
  darkThemeId?: string;
  monochromeMode?: boolean;
  customThemeColors?: Partial<Record<CustomThemeColorGroup, string>>;
  isMarkdown: boolean;
  editorToolbar: boolean;
  twitterEmoji: boolean;
  pageZoom: number;
  roundness: number;
  hideActivity: boolean;
  hideBorderLines: boolean;

  animationsEnabled: boolean;
  animationSpeed: number;

  isPeopleDrawer: boolean;
  memberSortFilterIndex: number;
  enterForNewline: boolean;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  hideMembershipEvents: boolean;
  hideNickAvatarEvents: boolean;
  mediaAutoLoad: boolean;
  urlPreview: boolean;
  encUrlPreview: boolean;
  showHiddenEvents: boolean;
  legacyUsernameColor: boolean;

  showNotifications: boolean;
  isNotificationSounds: boolean;

  hour24Clock: boolean;
  dateFormatString: string;

  developerTools: boolean;

  language: AppLanguage;

  microphoneDeviceId?: string;
  speakerDeviceId?: string;
  cameraDeviceId?: string;
  microphoneVolume: number;
  speakerVolume: number;
  noiseSuppressionQuality: NoiseSuppressionQuality;
}

const defaultSettings: Settings = {
  themeId: undefined,
  useSystemTheme: true,
  lightThemeId: undefined,
  darkThemeId: undefined,
  monochromeMode: false,
  customThemeColors: undefined,
  isMarkdown: true,
  editorToolbar: false,
  twitterEmoji: false,
  pageZoom: 100,
  roundness: 50,
  hideActivity: false,
  hideBorderLines: false,

  animationsEnabled: true,
  animationSpeed: 1,

  isPeopleDrawer: true,
  memberSortFilterIndex: 0,
  enterForNewline: false,
  messageLayout: 0,
  messageSpacing: '400',
  hideMembershipEvents: false,
  hideNickAvatarEvents: true,
  mediaAutoLoad: true,
  urlPreview: true,
  encUrlPreview: false,
  showHiddenEvents: false,
  legacyUsernameColor: false,

  showNotifications: true,
  isNotificationSounds: true,

  hour24Clock: false,
  dateFormatString: 'D MMM YYYY',

  developerTools: false,

  language: 'auto',

  microphoneDeviceId: undefined,
  speakerDeviceId: undefined,
  cameraDeviceId: undefined,
  microphoneVolume: 100,
  speakerVolume: 100,
  noiseSuppressionQuality: 'high',
};

export const getSettings = () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return defaultSettings;
  try {
    const settings = localStorage.getItem(STORAGE_KEY);
    if (settings === null) return defaultSettings;
    const parsed = JSON.parse(settings) as Settings;
    if (typeof parsed.roundness === 'number') {
      parsed.roundness = Math.max(0, Math.min(90, Math.round(parsed.roundness)));
    }
    if (typeof parsed.animationSpeed === 'number') {
      parsed.animationSpeed = Math.max(0.5, Math.min(2, parsed.animationSpeed));
    }
    if (typeof parsed.animationsEnabled !== 'boolean') {
      parsed.animationsEnabled = defaultSettings.animationsEnabled;
    }
    if (typeof parsed.hideBorderLines !== 'boolean') {
      parsed.hideBorderLines = defaultSettings.hideBorderLines;
    }
    if (!isAppLanguage(parsed.language)) {
      parsed.language = defaultSettings.language;
    }
    if (typeof parsed.microphoneVolume !== 'number' || Number.isNaN(parsed.microphoneVolume)) {
      parsed.microphoneVolume = defaultSettings.microphoneVolume;
    } else {
      parsed.microphoneVolume = Math.max(0, Math.min(100, Math.round(parsed.microphoneVolume)));
    }
    if (typeof parsed.speakerVolume !== 'number' || Number.isNaN(parsed.speakerVolume)) {
      parsed.speakerVolume = defaultSettings.speakerVolume;
    } else {
      parsed.speakerVolume = Math.max(0, Math.min(100, Math.round(parsed.speakerVolume)));
    }
    const validQualities: NoiseSuppressionQuality[] = ['off', 'low', 'medium', 'high'];
    if (!validQualities.includes(parsed.noiseSuppressionQuality as NoiseSuppressionQuality)) {
      parsed.noiseSuppressionQuality = defaultSettings.noiseSuppressionQuality;
    }
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
};

export const setSettings = (settings: Settings) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const baseSettings = atom<Settings>(getSettings());
export const settingsAtom = atom<Settings, [Settings], undefined>(
  (get) => get(baseSettings),
  (get, set, update) => {
    set(baseSettings, update);
    setSettings(update);
  },
);
