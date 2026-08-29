import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useState,
} from 'react';
import {
  as,
  Box,
  Button,
  Chip,
  color,
  config,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Switch,
  Text,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { isKeyHotkey } from 'is-hotkey';
import { stopPropagation } from '../../../utils/keyboard';
import {
  DarkTheme,
  LightTheme,
  Theme,
  ThemeKind,
  useSystemThemeKind,
  useThemeNames,
  useThemes,
} from '../../../hooks/useTheme';
import { HexColorPicker } from 'react-colorful';
import { HexColorPickerPopOut } from '../../../components/HexColorPickerPopOut';
import { applyThemeOverrides, toHex, rgbParts, hslParts } from '../../../utils/themeOverride';
import {
  applyRoundness,
  DEFAULT_ROUNDNESS,
  MAX_ROUNDNESS,
  MIN_ROUNDNESS,
  toDisplayRoundness,
} from '../../../utils/roundness';
import { CustomThemeColorGroup } from '../../../state/settings';
import { SequenceCardStyle } from '../styles.css';

type ThemeSelectorProps = {
  themeNames: Record<string, string>;
  themes: Theme[];
  selected: Theme;
  onSelect: (theme: Theme) => void;
};
const ThemeSelector = as<'div', ThemeSelectorProps>(
  ({ themeNames, themes, selected, onSelect, ...props }, ref) => (
    <Menu {...props} ref={ref}>
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        {themes.map((theme) => (
          <MenuItem
            key={theme.id}
            size="300"
            variant={theme.id === selected.id ? 'Primary' : 'Surface'}
            radii="300"
            onClick={() => onSelect(theme)}
          >
            <Text size="T300">{themeNames[theme.id] ?? theme.id}</Text>
          </MenuItem>
        ))}
      </Box>
    </Menu>
  )
);

function SelectTheme({ disabled }: { disabled?: boolean }) {
  const themes = useThemes();
  const themeNames = useThemeNames();
  const [themeId, setThemeId] = useSetting(settingsAtom, 'themeId');
  const [menuCords, setMenuCords] = useState<RectCords>();
  const selectedTheme = themes.find((theme) => theme.id === themeId) ?? LightTheme;

  const handleThemeMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleThemeSelect = (theme: Theme) => {
    setThemeId(theme.id);
    setMenuCords(undefined);
  };

  return (
    <>
      <Button
        size="300"
        variant="Primary"
        outlined
        fill="Soft"
        radii="300"
        after={<Icon size="300" src={Icons.ChevronBottom} />}
        onClick={disabled ? undefined : handleThemeMenu}
        aria-disabled={disabled}
      >
        <Text size="T300">{themeNames[selectedTheme.id] ?? selectedTheme.id}</Text>
      </Button>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <ThemeSelector
              themeNames={themeNames}
              themes={themes}
              selected={selectedTheme}
              onSelect={handleThemeSelect}
            />
          </FocusTrap>
        }
      />
    </>
  );
}

function SystemThemePreferences() {
  const themeKind = useSystemThemeKind();
  const themeNames = useThemeNames();
  const themes = useThemes();
  const [lightThemeId, setLightThemeId] = useSetting(settingsAtom, 'lightThemeId');
  const [darkThemeId, setDarkThemeId] = useSetting(settingsAtom, 'darkThemeId');

  const lightThemes = themes.filter((theme) => theme.kind === ThemeKind.Light);
  const darkThemes = themes.filter((theme) => theme.kind === ThemeKind.Dark);

  const selectedLightTheme = lightThemes.find((theme) => theme.id === lightThemeId) ?? LightTheme;
  const selectedDarkTheme = darkThemes.find((theme) => theme.id === darkThemeId) ?? DarkTheme;

  const [ltCords, setLTCords] = useState<RectCords>();
  const [dtCords, setDTCords] = useState<RectCords>();

  const handleLightThemeMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setLTCords(evt.currentTarget.getBoundingClientRect());
  };
  const handleDarkThemeMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setDTCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleLightThemeSelect = (theme: Theme) => {
    setLightThemeId(theme.id);
    setLTCords(undefined);
  };

  const handleDarkThemeSelect = (theme: Theme) => {
    setDarkThemeId(theme.id);
    setDTCords(undefined);
  };

  return (
    <Box wrap="Wrap" gap="400">
      <SettingTile
        title="Light Theme:"
        after={
          <Chip
            variant={themeKind === ThemeKind.Light ? 'Primary' : 'Secondary'}
            outlined={themeKind === ThemeKind.Light}
            radii="Pill"
            after={<Icon size="200" src={Icons.ChevronBottom} />}
            onClick={handleLightThemeMenu}
          >
            <Text size="B300">{themeNames[selectedLightTheme.id] ?? selectedLightTheme.id}</Text>
          </Chip>
        }
      />
      <PopOut
        anchor={ltCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setLTCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <ThemeSelector
              themeNames={themeNames}
              themes={lightThemes}
              selected={selectedLightTheme}
              onSelect={handleLightThemeSelect}
            />
          </FocusTrap>
        }
      />
      <SettingTile
        title="Dark Theme:"
        after={
          <Chip
            variant={themeKind === ThemeKind.Dark ? 'Primary' : 'Secondary'}
            outlined={themeKind === ThemeKind.Dark}
            radii="Pill"
            after={<Icon size="200" src={Icons.ChevronBottom} />}
            onClick={handleDarkThemeMenu}
          >
            <Text size="B300">{themeNames[selectedDarkTheme.id] ?? selectedDarkTheme.id}</Text>
          </Chip>
        }
      />
      <PopOut
        anchor={dtCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setDTCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <ThemeSelector
              themeNames={themeNames}
              themes={darkThemes}
              selected={selectedDarkTheme}
              onSelect={handleDarkThemeSelect}
            />
          </FocusTrap>
        }
      />
    </Box>
  );
}

function RoundnessControl() {
  const [roundness, setRoundness] = useSetting(settingsAtom, 'roundness');
  const raw = typeof roundness === 'number' ? roundness : DEFAULT_ROUNDNESS;
  const value = Math.max(MIN_ROUNDNESS, Math.min(MAX_ROUNDNESS, Math.round(raw)));
  const displayValue = toDisplayRoundness(value);
  const displayPercent = (value / MAX_ROUNDNESS) * 100;

  const handleChange = (v: number) => {
    const clamped = Math.max(MIN_ROUNDNESS, Math.min(MAX_ROUNDNESS, Math.round(v)));
    setRoundness(clamped);
    applyRoundness(clamped);
  };

  const handleReset = () => handleChange(DEFAULT_ROUNDNESS);

  const label =
    value === MIN_ROUNDNESS
      ? 'Square'
      : value === MAX_ROUNDNESS
        ? 'Circle'
        : value < 50
          ? 'Sharp'
          : value === 50
            ? 'Default'
            : 'Rounded';
  const previewRadius = `${(value / MAX_ROUNDNESS) * 50}%`;

  return (
    <Box direction="Column" gap="400">
      <SettingTile
        title="Roundness"
        description="Control how rounded the interface feels — 0 is sharp squares, 100 is fully circular."
        after={
          <Button
            size="300"
            variant="Secondary"
            fill="Soft"
            radii="300"
            onClick={handleReset}
            disabled={value === DEFAULT_ROUNDNESS}
          >
            <Text size="B300">Reset</Text>
          </Button>
        }
      />
      <Box
        style={{
          padding: config.space.S300,
          borderRadius: config.radii.R400,
          background: color.Surface.Container,
          border: `1px solid ${color.Surface.ContainerLine}`,
        }}
        direction="Column"
        gap="300"
      >
        <Box gap="300" alignItems="Center" justifyContent="SpaceBetween" wrap="Wrap">
          <Box gap="200" alignItems="Center">
            <Box
              aria-hidden
              style={{
                width: toRem(36),
                height: toRem(36),
                background: color.Primary.Container,
                border: `1px solid ${color.Primary.ContainerLine}`,
                borderRadius: previewRadius,
                transition: 'border-radius 160ms ease',
                flexShrink: 0,
              }}
            />
            <Box
              aria-hidden
              style={{
                width: toRem(72),
                height: toRem(36),
                background: color.Secondary.Container,
                border: `1px solid ${color.Secondary.ContainerLine}`,
                borderRadius: previewRadius,
                transition: 'border-radius 160ms ease',
                flexShrink: 0,
              }}
            />
            <Box
              aria-hidden
              style={{
                width: toRem(42),
                height: toRem(42),
                background: color.SurfaceVariant.Container,
                border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
                borderRadius: previewRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-radius 160ms ease',
                flexShrink: 0,
                color: color.SurfaceVariant.OnContainer,
              }}
            >
              <Icon src={Icons.User} size="200" />
            </Box>
          </Box>
          <Box direction="Column" alignItems="End" gap="100" style={{ minWidth: toRem(80) }}>
            <Box
              style={{
                minWidth: toRem(48),
                height: toRem(28),
                padding: `0 ${config.space.S200}`,
                borderRadius: config.radii.Pill,
                background: color.Primary.Main,
                color: color.Primary.OnMain,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text size="B400" style={{ color: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
                {displayValue}
              </Text>
            </Box>
            <Text size="T200" priority="300">
              {label}
            </Text>
          </Box>
        </Box>
        <Box direction="Column" gap="200">
          <Box style={{ padding: `0 ${toRem(2)}` }}>
            <Box
              style={{
                position: 'relative',
                height: toRem(24),
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <input
                className="roundness-slider"
                type="range"
                min={MIN_ROUNDNESS}
                max={MAX_ROUNDNESS}
                step={1}
                value={value}
                onChange={(e) => handleChange(Number(e.target.value))}
                aria-label="Roundness"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  width: '100%',
                  height: toRem(8),
                  borderRadius: '9999px',
                  background: `linear-gradient(to right, ${color.Primary.Main} 0%, ${color.Primary.Main} ${displayPercent}%, ${color.Background.Container} ${displayPercent}%, ${color.Background.Container} 100%)`,
                  border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
                  outline: 'none',
                  cursor: 'pointer',
                  margin: 0,
                  padding: 0,
                }}
              />
              <style>{`
                .roundness-slider::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: ${toRem(22)};
                  height: ${toRem(22)};
                  border-radius: 50%;
                  background: #fff;
                  border: 2px solid ${color.Primary.Main};
                  box-shadow: 0 1px 6px rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.14);
                  cursor: pointer;
                  transition: transform 100ms ease, box-shadow 100ms ease;
                  margin-top: -${toRem(7)};
                }
                .roundness-slider::-webkit-slider-thumb:active {
                  transform: scale(1.08);
                  box-shadow: 0 2px 10px rgba(0,0,0,0.28);
                }
                .roundness-slider::-moz-range-thumb {
                  width: ${toRem(22)};
                  height: ${toRem(22)};
                  border-radius: 50%;
                  background: #fff;
                  border: 2px solid ${color.Primary.Main};
                  box-shadow: 0 1px 6px rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.14);
                  cursor: pointer;
                  transition: transform 100ms ease;
                }
                .roundness-slider::-moz-range-thumb:active {
                  transform: scale(1.08);
                }
                .roundness-slider::-webkit-slider-runnable-track {
                  height: ${toRem(8)};
                  border-radius: 9999px;
                  background: transparent;
                }
                .roundness-slider::-moz-range-track {
                  height: ${toRem(8)};
                  border-radius: 9999px;
                  background: transparent;
                  border: none;
                }
                .roundness-slider:focus-visible::-webkit-slider-thumb {
                  box-shadow: 0 0 0 3px ${color.Primary.Container}, 0 1px 6px rgba(0,0,0,0.22);
                }
                .roundness-slider:focus-visible::-moz-range-thumb {
                  box-shadow: 0 0 0 3px ${color.Primary.Container}, 0 1px 6px rgba(0,0,0,0.22);
                }
              `}</style>
            </Box>
          </Box>
          <Box direction="Row" justifyContent="SpaceBetween" alignItems="Center">
            <Text size="T200" priority="300">
              Square
            </Text>
            <Text size="T200" priority="300">
              Circle
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function PageZoomInput() {
  const [pageZoom, setPageZoom] = useSetting(settingsAtom, 'pageZoom');
  const [currentZoom, setCurrentZoom] = useState(`${pageZoom}`);

  const handleZoomChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    setCurrentZoom(evt.target.value);
  };

  const handleZoomEnter: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (isKeyHotkey('escape', evt)) {
      evt.stopPropagation();
      setCurrentZoom(pageZoom.toString());
    }
    if (
      isKeyHotkey('enter', evt) &&
      'value' in evt.target &&
      typeof evt.target.value === 'string'
    ) {
      const newZoom = parseInt(evt.target.value, 10);
      if (Number.isNaN(newZoom)) return;
      const safeZoom = Math.max(Math.min(newZoom, 150), 75);
      setPageZoom(safeZoom);
      setCurrentZoom(safeZoom.toString());
    }
  };

  return (
    <Input
      style={{ width: toRem(100) }}
      variant={pageZoom === parseInt(currentZoom, 10) ? 'Secondary' : 'Success'}
      size="300"
      radii="300"
      type="number"
      min="75"
      max="150"
      value={currentZoom}
      onChange={handleZoomChange}
      onKeyDown={handleZoomEnter}
      after={<Text size="T300">%</Text>}
      outlined
    />
  );
}

const CUSTOM_THEME_GROUPS: { group: CustomThemeColorGroup; label: string }[] = [
  { group: 'Background', label: 'Background' },
  { group: 'Surface', label: 'Surface' },
  { group: 'SurfaceVariant', label: 'Surface Variant' },
  { group: 'Primary', label: 'Primary' },
  { group: 'Secondary', label: 'Secondary' },
];

function CustomColorTile({ group, label }: { group: CustomThemeColorGroup; label: string }) {
  const [customThemeColors, setCustomThemeColors] = useSetting(
    settingsAtom,
    'customThemeColors',
  );
  const value = customThemeColors?.[group];
  const initRgb = value ? rgbParts(value) : null;
  const initHsl = value ? hslParts(value) : null;
  const [hexText, setHexText] = useState(value ? value.replace('#', '') : '');
  const [rText, setRText] = useState(initRgb ? `${initRgb.r}` : '');
  const [gText, setGText] = useState(initRgb ? `${initRgb.g}` : '');
  const [bText, setBText] = useState(initRgb ? `${initRgb.b}` : '');
  const [hText, setHText] = useState(
    initHsl && !Number.isNaN(initHsl.h) ? `${Math.round(initHsl.h)}` : '',
  );
  const [sText, setSText] = useState(initHsl ? `${Math.round(initHsl.s * 100)}` : '');
  const [lText, setLText] = useState(initHsl ? `${Math.round(initHsl.l * 100)}` : '');

  const applyFromHex = (hex: string) => {
    const rgb = rgbParts(hex);
    if (rgb) {
      setRText(`${rgb.r}`);
      setGText(`${rgb.g}`);
      setBText(`${rgb.b}`);
    }
    const hsl = hslParts(hex);
    if (hsl) {
      setHText(Number.isNaN(hsl.h) ? '' : `${Math.round(hsl.h)}`);
      setSText(`${Math.round(hsl.s * 100)}`);
      setLText(`${Math.round(hsl.l * 100)}`);
    }
    setHexText(hex.replace('#', ''));
    const next = { ...customThemeColors, [group]: hex };
    setCustomThemeColors(next);
    applyThemeOverrides(next);
  };

  const handlePick = (hex: string) => applyFromHex(hex);

  const applyFromRgb = (r: string, g: string, b: string) => {
    const hex = toHex(`rgb(${r}, ${g}, ${b})`);
    if (hex) applyFromHex(hex);
  };
  const onR: ChangeEventHandler<HTMLInputElement> = (e) => {
    setRText(e.target.value);
    applyFromRgb(e.target.value, gText, bText);
  };
  const onG: ChangeEventHandler<HTMLInputElement> = (e) => {
    setGText(e.target.value);
    applyFromRgb(rText, e.target.value, bText);
  };
  const onB: ChangeEventHandler<HTMLInputElement> = (e) => {
    setBText(e.target.value);
    applyFromRgb(rText, gText, e.target.value);
  };

  const applyFromHsl = (h: string, s: string, l: string) => {
    const hex = toHex(`hsl(${h}, ${s}%, ${l}%)`);
    if (hex) applyFromHex(hex);
  };
  const onH: ChangeEventHandler<HTMLInputElement> = (e) => {
    setHText(e.target.value);
    applyFromHsl(e.target.value, sText, lText);
  };
  const onS: ChangeEventHandler<HTMLInputElement> = (e) => {
    setSText(e.target.value);
    applyFromHsl(hText, e.target.value, lText);
  };
  const onL: ChangeEventHandler<HTMLInputElement> = (e) => {
    setLText(e.target.value);
    applyFromHsl(hText, sText, e.target.value);
  };

  const onHex: ChangeEventHandler<HTMLInputElement> = (e) => {
    setHexText(e.target.value);
    const hex = toHex(e.target.value);
    if (hex) applyFromHex(hex);
  };

  const handleReset = () => {
    [setHexText, setRText, setGText, setBText, setHText, setSText, setLText].forEach((s) => s(''));
    const next = { ...customThemeColors };
    delete next[group];
    setCustomThemeColors(next);
    applyThemeOverrides(next);
  };

  return (
    <SettingTile
      title={label}
      after={
        <HexColorPickerPopOut
          picker={
            <Box direction="Column" gap="200">
              <HexColorPicker color={value ?? '#000000'} onChange={handlePick} />
              <Box direction="Row" gap="100" alignItems="Center">
                <Text size="B300">hex #</Text>
                <Input
                  variant="Secondary"
                  size="300"
                  radii="300"
                  placeholder="00ff88"
                  value={hexText}
                  onChange={onHex}
                  outlined
                  style={{ width: toRem(96) }}
                />
              </Box>
              <Box direction="Row" gap="100" alignItems="Center">
                <Text size="B300">rgb</Text>
                <Input
                  type="number"
                  variant="Secondary"
                  size="300"
                  radii="300"
                  placeholder="r"
                  value={rText}
                  onChange={onR}
                  outlined
                  style={{ width: toRem(60) }}
                />
                <Input
                  type="number"
                  variant="Secondary"
                  size="300"
                  radii="300"
                  placeholder="g"
                  value={gText}
                  onChange={onG}
                  outlined
                  style={{ width: toRem(60) }}
                />
                <Input
                  type="number"
                  variant="Secondary"
                  size="300"
                  radii="300"
                  placeholder="b"
                  value={bText}
                  onChange={onB}
                  outlined
                  style={{ width: toRem(60) }}
                />
              </Box>
              <Box direction="Row" gap="100" alignItems="Center">
                <Text size="B300">hsl</Text>
                <Input
                  type="number"
                  variant="Secondary"
                  size="300"
                  radii="300"
                  placeholder="h"
                  value={hText}
                  onChange={onH}
                  outlined
                  style={{ width: toRem(60) }}
                />
                <Input
                  type="number"
                  variant="Secondary"
                  size="300"
                  radii="300"
                  placeholder="s"
                  value={sText}
                  onChange={onS}
                  outlined
                  style={{ width: toRem(60) }}
                />
                <Input
                  type="number"
                  variant="Secondary"
                  size="300"
                  radii="300"
                  placeholder="l"
                  value={lText}
                  onChange={onL}
                  outlined
                  style={{ width: toRem(60) }}
                />
              </Box>
            </Box>
          }
          onRemove={handleReset}
        >
          {(openPicker, opened) => (
            <Button
              aria-pressed={opened}
              onClick={openPicker}
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              before={
                <Box
                  style={{
                    width: toRem(16),
                    height: toRem(16),
                    borderRadius: '50%',
                    background: value ?? 'transparent',
                    border: `1px solid ${value ? 'transparent' : 'rgba(127, 127, 127, 0.5)'}`,
                  }}
                />
              }
            >
              <Text size="B300">{value ? 'Change' : 'Pick'}</Text>
            </Button>
          )}
        </HexColorPickerPopOut>
      }
    />
  );
}

export function Appearance() {
  const [systemTheme, setSystemTheme] = useSetting(settingsAtom, 'useSystemTheme');
  const [monochromeMode, setMonochromeMode] = useSetting(settingsAtom, 'monochromeMode');
  const [twitterEmoji, setTwitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');
  const [, setCustomThemeColors] = useSetting(settingsAtom, 'customThemeColors');

  const handleResetCustomTheme = () => {
    setCustomThemeColors(undefined);
    applyThemeOverrides(undefined);
  };

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Appearance</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="System Theme"
          description="Choose between light and dark theme based on system preference."
          after={<Switch variant="Primary" value={systemTheme} onChange={setSystemTheme} />}
        />
        {systemTheme && <SystemThemePreferences />}
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Theme"
          description="Theme to use when system theme is not enabled."
          after={<SelectTheme disabled={systemTheme} />}
        />
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column" gap="400">
        <SettingTile
          title="Custom Theme"
          description="Override individual theme colors. Pick a base color for each element; the rest of its shades are derived automatically."
        />
        {CUSTOM_THEME_GROUPS.map(({ group, label }) => (
          <CustomColorTile key={group} group={group} label={label} />
        ))}
        <SettingTile
          title="Reset Custom Theme"
          description="Clear all custom colors and revert to the selected theme."
          after={
            <Button
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="400"
              onClick={handleResetCustomTheme}
            >
              <Text size="B300">Reset All</Text>
            </Button>
          }
        />
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Monochrome Mode"
          after={<Switch variant="Primary" value={monochromeMode} onChange={setMonochromeMode} />}
        />
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Twitter Emoji"
          after={<Switch variant="Primary" value={twitterEmoji} onChange={setTwitterEmoji} />}
        />
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column" gap="400">
        <RoundnessControl />
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Page Zoom"
          after={<PageZoomInput />}
        />
      </SequenceCard>
    </Box>
  );
}

type AppearancePageProps = {
  requestClose: () => void;
};
export function AppearancePage({ requestClose }: AppearancePageProps) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Appearance
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Appearance />
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
