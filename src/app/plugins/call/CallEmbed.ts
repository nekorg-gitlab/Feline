// @ts-nocheck
import {
  ClientEvent,
  KnownMembership,
  MatrixClient,
  MatrixEvent,
  MatrixEventEvent,
  Room,
  RoomStateEvent,
} from 'matrix-js-sdk';
import {
  ClientWidgetApi,
  IRoomEvent,
  IWidget,
  Widget,
  WidgetApiFromWidgetAction,
  WidgetApiToWidgetAction,
  WidgetDriver,
} from 'matrix-widget-api';
import { CallWidgetDriver } from './CallWidgetDriver';
import { trimTrailingSlash } from '../../utils/common';
import {
  ElementCallIntent,
  ElementCallThemeKind,
  ElementMediaStateDetail,
  ElementWidgetActions,
} from './types';
import { CallControl } from './CallControl';
import { CallControlState } from './CallControlState';
import { installNoiseSuppressionPatch } from './callNoiseSuppression';
import { getSettings } from '../../state/settings';

export class CallEmbed {
  private mx: MatrixClient;

  public readonly call: ClientWidgetApi;

  public readonly iframe: HTMLIFrameElement;

  public readonly room: Room;

  public joined = false;

  public readonly control: CallControl;

  private readonly container: HTMLElement;

  private readUpToMap: { [roomId: string]: string } = {}; // room ID to event ID

  private eventsToFeed = new WeakSet<MatrixEvent>();

  private readonly disposables: Array<() => void> = [];

  private noiseSuppressionCleanup: (() => void) | null = null;

  static getIntent(dm: boolean, ongoing: boolean, video?: boolean): ElementCallIntent {
    if (dm && ongoing) {
      return video ? ElementCallIntent.JoinExistingDM : ElementCallIntent.JoinExistingDMVoice;
    }
    if (dm) {
      return video ? ElementCallIntent.StartCallDM : ElementCallIntent.StartCallDMVoice;
    }

    if (ongoing) {
      return video ? ElementCallIntent.JoinExisting : ElementCallIntent.JoinExistingVoice;
    }
    return video ? ElementCallIntent.StartCall : ElementCallIntent.StartCallVoice;
  }

  static dmCall(intent: ElementCallIntent): boolean {
    return (
      intent === ElementCallIntent.JoinExistingDM ||
      intent === ElementCallIntent.JoinExistingDMVoice ||
      intent === ElementCallIntent.StartCallDM ||
      intent === ElementCallIntent.StartCallDMVoice
    );
  }

  static startingCall(intent: ElementCallIntent): boolean {
    return (
      intent === ElementCallIntent.StartCallDM ||
      intent === ElementCallIntent.StartCallDMVoice ||
      intent === ElementCallIntent.StartCall ||
      intent === ElementCallIntent.StartCallVoice
    );
  }

  static getWidget(
    mx: MatrixClient,
    room: Room,
    intent: ElementCallIntent,
    themeKind: ElementCallThemeKind,
  ): Widget {
    const userId = mx.getSafeUserId();
    const deviceId = mx.getDeviceId() ?? '';
    const clientOrigin = window.location.origin;
    const widgetId = 'call-embed';

    const params = new URLSearchParams({
      widgetId,
      parentUrl: clientOrigin,
      baseUrl: mx.baseUrl,
      roomId: room.roomId,
      userId,
      deviceId,
      intent,

      skipLobby: 'true',
      confineToRoom: 'true',
      appPrompt: 'false',
      perParticipantE2EE: room.hasEncryptionStateEvent().toString(),
      lang: 'en-EN',
      theme: themeKind,
      header: 'none',
    });

    if (!room.isCallRoom() && CallEmbed.startingCall(intent)) {
      params.append('sendNotificationType', CallEmbed.dmCall(intent) ? 'ring' : 'notification');
    }

    const widgetUrl = new URL(
      `${trimTrailingSlash(import.meta.env.BASE_URL)}/public/element-call/index.html`,
      window.location.origin,
    );
    widgetUrl.search = params.toString();

    const options: IWidget = {
      id: widgetId,
      creatorUserId: userId,
      name: 'Call',
      type: 'm.call',
      url: widgetUrl.href,
      waitForIframeLoad: false,
      data: {},
    };

    const widget: Widget = new Widget(options);

    return widget;
  }

  static getIframe(url: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');

    iframe.title = 'Call Embed';
    iframe.sandbox =
      'allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads';
    iframe.allow =
      'microphone *; camera *; display-capture *; autoplay *; clipboard-write *; fullscreen *;';
    iframe.allowFullscreen = true;
    iframe.src = url;

    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    return iframe;
  }

  constructor(
    mx: MatrixClient,
    room: Room,
    widget: Widget,
    container: HTMLElement,
    initialControlState?: CallControlState,
  ) {
    const iframe = CallEmbed.getIframe(
      widget.getCompleteUrl({ currentUserId: mx.getSafeUserId() }),
    );
    container.append(iframe);

    const callWidgetDriver: WidgetDriver = new CallWidgetDriver(mx, room.roomId);
    const call: ClientWidgetApi = new ClientWidgetApi(widget, iframe, callWidgetDriver);

    this.mx = mx;
    this.call = call;
    this.room = room;
    this.iframe = iframe;
    this.container = container;

    const controlState = initialControlState ?? new CallControlState(true, false, true);
    this.control = new CallControl(controlState, call, iframe);
    this.control.startObserving();
    const installNoiseSuppression = () => {
      try {
        if (this.noiseSuppressionCleanup) this.noiseSuppressionCleanup();
        this.noiseSuppressionCleanup = installNoiseSuppressionPatch(iframe, () => {
          try {
            return getSettings().noiseSuppressionQuality;
          } catch {
            return 'off';
          }
        });
      } catch {}
    };
    iframe.addEventListener('load', () => {
      this.control.startObserving();
      installNoiseSuppression();
    });
    if (iframe.contentWindow?.document?.readyState === 'complete') {
      installNoiseSuppression();
    } else {
      setTimeout(installNoiseSuppression, 200);
      setTimeout(installNoiseSuppression, 1000);
    }

    let initialMediaEvent = true;
    this.disposables.push(
      this.listenAction<ElementMediaStateDetail>(ElementWidgetActions.DeviceMute, (evt) => {
        if (initialMediaEvent) {
          initialMediaEvent = false;
          this.control.applyState();
          return;
        }
        this.control.onMediaState(evt);
      }),
    );

    this.start();
  }

  get roomId(): string {
    return this.room.roomId;
  }

  get document(): Document | undefined {
    return this.iframe.contentDocument ?? this.iframe.contentWindow?.document;
  }

  public setTheme(theme: ElementCallThemeKind) {
    return this.call.transport.send(WidgetApiToWidgetAction.ThemeChange, {
      name: theme,
    });
  }

  public hangup() {
    return this.call.transport.send(ElementWidgetActions.HangupCall, {});
  }

  public onPreparing(callback: () => void) {
    return this.listenEvent('preparing', callback);
  }

  public onPreparingError(callback: (error: any) => void) {
    return this.listenEvent('error:preparing', callback);
  }

  public onReady(callback: () => void) {
    return this.listenEvent('ready', callback);
  }

  public onCapabilitiesNotified(callback: () => void) {
    return this.listenEvent('capabilitiesNotified', callback);
  }

  private start() {
    this.call.setViewedRoomId(this.roomId);
    this.disposables.push(
      this.listenAction(ElementWidgetActions.JoinCall, this.onCallJoined.bind(this)),
    );
    this.disposables.push(
      this.listenAction(WidgetApiFromWidgetAction.UpdateAlwaysOnScreen, () => {}),
    );

    this.mx.getRooms().forEach((room) => {
      const events = room.getLiveTimeline()?.getEvents() || [];
      const roomEvent = events[events.length - 1];
      if (!roomEvent) return; // force later code to think the room is fresh
      this.readUpToMap[room.roomId] = roomEvent.getId()!;
    });

    this.mx.on(ClientEvent.Event, this.onEvent.bind(this));
    this.mx.on(MatrixEventEvent.Decrypted, this.onEventDecrypted.bind(this));
    this.mx.on(RoomStateEvent.Events, this.onStateUpdate.bind(this));
    this.mx.on(ClientEvent.ToDeviceEvent, this.onToDeviceEvent.bind(this));
  }

  public dispose(): void {
    this.disposables.forEach((disposable) => {
      disposable();
    });
    if (this.noiseSuppressionCleanup) {
      try {
        this.noiseSuppressionCleanup();
      } catch {}
      this.noiseSuppressionCleanup = null;
    }
    this.call.stop();
    this.container.removeChild(this.iframe);
    this.control.dispose();

    this.mx.off(ClientEvent.Event, this.onEvent.bind(this));
    this.mx.off(MatrixEventEvent.Decrypted, this.onEventDecrypted.bind(this));
    this.mx.off(RoomStateEvent.Events, this.onStateUpdate.bind(this));
    this.mx.off(ClientEvent.ToDeviceEvent, this.onToDeviceEvent.bind(this));

    this.readUpToMap = {};
    this.eventsToFeed = new WeakSet<MatrixEvent>();
  }

  private onCallJoined(): void {
    this.joined = true;
  }

  private onEvent(ev: MatrixEvent): void {
    this.mx.decryptEventIfNeeded(ev);
    this.feedEvent(ev);
  }

  private onEventDecrypted(ev: MatrixEvent): void {
    this.feedEvent(ev);
  }

  private onStateUpdate(ev: MatrixEvent): void {
    if (this.call === null) return;
    const raw = ev.getEffectiveEvent();
    this.call.feedStateUpdate(raw as IRoomEvent).catch((e) => {
      if (import.meta.env.DEV) console.error('Error sending state update to widget: ', e);
    });
  }

  private async onToDeviceEvent(ev: MatrixEvent): Promise<void> {
    await this.mx.decryptEventIfNeeded(ev);
    if (ev.isDecryptionFailure()) return;
    await this.call?.feedToDevice(ev.getEffectiveEvent() as IRoomEvent, ev.isEncrypted());
  }

  private relatesToUnknown(ev: MatrixEvent): boolean {
    if (!ev.relationEventId || ev.replyEventId) return false;
    const room = this.mx.getRoom(ev.getRoomId());
    return room === null || !room.findEventById(ev.relationEventId);
  }

  private advanceReadUpToMarker(ev: MatrixEvent): boolean {
    const evId = ev.getId();
    if (evId === undefined) return false;
    const roomId = ev.getRoomId();
    if (roomId === undefined) return false;
    const room = this.mx.getRoom(roomId);
    if (room === null) return false;

    const upToEventId = this.readUpToMap[ev.getRoomId()!];
    if (!upToEventId) {
      this.readUpToMap[roomId] = evId;
      return true;
    }

    if (upToEventId === evId) return false;

    const timeline = room.getLiveTimeline();
    const events = [...timeline.getEvents()].reverse().slice(0, 100);
    function isRelevantTimelineEvent(timelineEvent: MatrixEvent): boolean {
      return timelineEvent.getId() === upToEventId || timelineEvent.getId() === ev.getId();
    }
    const possibleMarkerEv = events.find(isRelevantTimelineEvent);
    if (possibleMarkerEv?.getId() === upToEventId) {
      return false;
    }
    if (possibleMarkerEv?.getId() === ev.getId()) {
      this.readUpToMap[roomId] = evId;
      return true;
    }

    return false;
  }

  private isFromInvite(ev: MatrixEvent): boolean {
    const room = this.mx.getRoom(ev.getRoomId());
    return room?.getMyMembership() === KnownMembership.Invite;
  }

  private feedEvent(ev: MatrixEvent): void {
    if (this.call === null) return;
    if (
      this.eventsToFeed.delete(ev) ||
      this.relatesToUnknown(ev) ||
      this.isFromInvite(ev) ||
      this.advanceReadUpToMarker(ev)
    ) {
      if (ev.isBeingDecrypted() || ev.isDecryptionFailure()) {
        this.eventsToFeed.add(ev);
      } else {
        const raw = ev.getEffectiveEvent();
        this.call.feedEvent(raw as IRoomEvent).catch((e) => {
          if (import.meta.env.DEV) console.error('Error sending event to widget: ', e);
        });
      }
    }
  }

  public listenAction<T>(type: string, callback: (event: CustomEvent<T>) => void) {
    const wrapped = (ev: CustomEvent<T>) => {
      ev.preventDefault();
      callback(ev);
    };
    return this.listenEvent(`action:${type}`, wrapped);
  }

  public listenEvent<T>(type: string, callback: (event: T) => void) {
    this.call.on(type, callback);
    return () => {
      this.call.off(type, callback);
    };
  }
}
