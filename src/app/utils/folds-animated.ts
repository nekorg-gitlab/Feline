import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text as FoldsText } from 'folds/dist/index.js';
import mapping from '../locales/_mapping.json';

export {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  CrossSizeVariant,
  DefaultReset,
  Dialog,
  Disabled,
  FocusOutline,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Line,
  Menu,
  MenuItem,
  Modal,
  OverlayBackdrop,
  OverlayCenter,
  OverlayContainerProvider,
  PopOutContainerProvider,
  Portal,
  ProgressBar,
  RadiiVariant,
  RadioButton,
  Scroll,
  Spinner,
  Switch,
  TextArea,
  TextReset,
  Tooltip,
  TooltipContainerProvider,
  TooltipProvider,
  as,
  color,
  config,
  configClass,
  getRelativeFixedPosition,
  lightTheme,
  percent,
  pxToRem,
  toRem,
  useOverlayContainer,
  usePopOutContainer,
  useTooltipContainer,
  vars,
  varsClass,
} from 'folds/dist/index.js';

export { AnimatedOverlay as Overlay } from '../components/animated/AnimatedOverlay';
export { AnimatedPopOut as PopOut } from '../components/animated/AnimatedPopOut';

const normalizedMapping: Record<string, string> = {};
for (const [k, v] of Object.entries(mapping as Record<string, string>)) {
  normalizedMapping[k] = v;
  const norm = k.replace(/\s+/g, ' ').trim();
  if (!(norm in normalizedMapping)) normalizedMapping[norm] = v;
}

export const Text = React.forwardRef<HTMLElement, React.ComponentProps<typeof FoldsText>>(
  (props: React.ComponentProps<typeof FoldsText>, ref) => {
    const { t } = useTranslation();
    const { children, ...rest } = props as { children?: React.ReactNode } & Record<string, unknown>;
    let nextChildren: React.ReactNode = children;
    if (typeof children === 'string') {
      const trimmed = children.trim();
      if (trimmed.length > 0) {
        const normalized = trimmed.replace(/\s+/g, ' ');
        const key =
          (mapping as Record<string, string>)[trimmed] ??
          normalizedMapping[normalized] ??
          normalizedMapping[trimmed];
        if (key) {
          nextChildren = t(key);
        }
      }
    }
    return React.createElement(
      FoldsText as unknown as React.ComponentType<Record<string, unknown>>,
      {
        ...(rest as Record<string, unknown>),
        ref: ref as unknown as React.Ref<unknown>,
        children: nextChildren,
      },
    );
  },
);
(Text as React.FC).displayName = 'Text';
