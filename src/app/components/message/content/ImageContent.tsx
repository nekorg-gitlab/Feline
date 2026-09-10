import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Icon,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  as,
} from 'folds';
import classNames from 'classnames';
import { BlurhashCanvas } from 'react-blurhash';
import FocusTrap from 'focus-trap-react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { IImageInfo, MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import * as css from './style.css';
import { bytesToSize } from '../../../utils/common';
import { stopPropagation } from '../../../utils/keyboard';
import { downloadMxc, mxcUrlToHttp } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { ModalWide } from '../../../styles/Modal.css';
import { validBlurHash } from '../../../utils/blurHash';

type RenderViewerProps = {
  src: string;
  alt: string;
  requestClose: () => void;
};
type RenderImageProps = {
  alt: string;
  title: string;
  src: string;
  onLoad: () => void;
  onError: () => void;
  onClick: () => void;
  tabIndex: number;
};
export type ImageContentProps = {
  body: string;
  mimeType?: string;
  url: string;
  info?: IImageInfo;
  encInfo?: EncryptedAttachmentInfo;
  autoPlay?: boolean;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
  renderViewer: (props: RenderViewerProps) => ReactNode;
  renderImage: (props: RenderImageProps) => ReactNode;
};
export const ImageContent = as<'div', ImageContentProps>(
  (
    {
      className,
      body,
      mimeType,
      url,
      info,
      encInfo,
      autoPlay,
      markedAsSpoiler,
      spoilerReason,
      renderViewer,
      renderImage,
      ...props
    },
    ref,
  ) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const blurHash = validBlurHash(info?.[MATRIX_BLUR_HASH_PROPERTY_NAME]);

    const [load, setLoad] = useState(false);
    const [error, setError] = useState(false);
    const [viewer, setViewer] = useState(false);
    const [blurred, setBlurred] = useState(markedAsSpoiler ?? false);
    const [directFallback, setDirectFallback] = useState(false);

    const [srcState, loadSrc] = useAsyncCallback(
      useCallback(async () => {
        if (!url) throw new Error('Invalid media URL');
        const fileContent = await downloadMxc(mx, url, useAuthentication, mimeType, encInfo);
        return URL.createObjectURL(fileContent);
      }, [mx, url, useAuthentication, mimeType, encInfo]),
    );

    const handleLoad = () => {
      setLoad(true);
    };
    const handleError = () => {
      // Unencrypted media can fall back to a direct <img> URL (no fetch).
      // This covers WebViews where blob: rendering is blocked but https: is allowed.
      if (!encInfo && !directFallback) {
        setDirectFallback(true);
        return;
      }
      setLoad(false);
      setError(true);
    };

    const handleRetry = () => {
      setError(false);
      setDirectFallback(false);
      setLoad(false);
      loadSrc();
    };

    useEffect(() => {
      if (autoPlay) loadSrc();
    }, [autoPlay, loadSrc]);

    const directUrl = !encInfo ? (mxcUrlToHttp(mx, url, false) ?? undefined) : undefined;

    useEffect(
      () => () => {
        if (srcState.status === AsyncStatus.Success && srcState.data.startsWith('blob:')) {
          URL.revokeObjectURL(srcState.data);
        }
      },
      [srcState],
    );

    useEffect(() => {
      if (srcState.status === AsyncStatus.Error && !encInfo && directUrl && !directFallback) {
        setDirectFallback(true);
      }
    }, [srcState, encInfo, directUrl, directFallback]);

    const blobUrl = srcState.status === AsyncStatus.Success ? srcState.data : undefined;
    const imgSrc = directFallback && directUrl ? directUrl : blobUrl;
    const showImage = typeof imgSrc === 'string';
    const showFetchError =
      (error || srcState.status === AsyncStatus.Error) && !(directUrl && !directFallback);

    return (
      <Box className={classNames(css.RelativeBase, className)} {...props} ref={ref}>
        {blobUrl && (
          <Overlay open={viewer} backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setViewer(false),
                  clickOutsideDeactivates: true,
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Modal
                  className={ModalWide}
                  size="500"
                  onContextMenu={(evt: any) => evt.stopPropagation()}
                >
                  {renderViewer({
                    src: directFallback && directUrl ? directUrl : blobUrl,
                    alt: body,
                    requestClose: () => setViewer(false),
                  })}
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
        {typeof blurHash === 'string' && !load && (
          <BlurhashCanvas
            style={{ width: '100%', height: '100%' }}
            width={32}
            height={32}
            hash={blurHash}
            punch={1}
          />
        )}
        {!autoPlay && !markedAsSpoiler && srcState.status === AsyncStatus.Idle && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Button
              variant="Secondary"
              fill="Solid"
              radii="300"
              size="300"
              onClick={loadSrc}
              before={<Icon size="Inherit" src={Icons.Photo} filled />}
            >
              <Text size="B300">View</Text>
            </Button>
          </Box>
        )}
        {showImage && (
          <Box className={classNames(css.AbsoluteContainer, blurred && css.Blur)}>
            {renderImage({
              alt: body,
              title: body,
              src: imgSrc,
              onLoad: handleLoad,
              onError: handleError,
              onClick: () => setViewer(true),
              tabIndex: 0,
            })}
          </Box>
        )}
        {blurred && !showFetchError && srcState.status !== AsyncStatus.Error && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <TooltipProvider
              tooltip={
                typeof spoilerReason === 'string' && (
                  <Tooltip variant="Secondary">
                    <Text>{spoilerReason}</Text>
                  </Tooltip>
                )
              }
              position="Top"
              align="Center"
            >
              {(triggerRef) => (
                <Chip
                  ref={triggerRef}
                  variant="Secondary"
                  radii="Pill"
                  size="500"
                  outlined
                  onClick={() => {
                    setBlurred(false);
                    if (srcState.status === AsyncStatus.Idle) {
                      loadSrc();
                    }
                  }}
                >
                  <Text size="B300">Spoiler</Text>
                </Chip>
              )}
            </TooltipProvider>
          </Box>
        )}
        {(srcState.status === AsyncStatus.Loading ||
          srcState.status === AsyncStatus.Success ||
          (srcState.status === AsyncStatus.Error && directUrl && !directFallback)) &&
          !load &&
          !directFallback &&
          !blurred && (
            <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
              <Spinner variant="Secondary" />
            </Box>
          )}
        {showFetchError && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <TooltipProvider
              tooltip={
                <Tooltip variant="Critical">
                  <Text>Failed to load image!</Text>
                </Tooltip>
              }
              position="Top"
              align="Center"
            >
              {(triggerRef) => (
                <Button
                  ref={triggerRef}
                  size="300"
                  variant="Critical"
                  fill="Soft"
                  outlined
                  radii="300"
                  onClick={handleRetry}
                  before={<Icon size="Inherit" src={Icons.Warning} filled />}
                >
                  <Text size="B300">Retry</Text>
                </Button>
              )}
            </TooltipProvider>
          </Box>
        )}
        {!load && typeof info?.size === 'number' && (
          <Box className={css.AbsoluteFooter} justifyContent="End" alignContent="Center" gap="200">
            <Badge variant="Secondary" fill="Soft">
              <Text size="L400">{bytesToSize(info.size)}</Text>
            </Badge>
          </Box>
        )}
      </Box>
    );
  },
);
