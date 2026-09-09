// @ts-nocheck
import {
  type Capability,
  type ISendDelayedEventDetails,
  type ISendEventDetails,
  type IReadEventRelationsResult,
  type IRoomEvent,
  WidgetDriver,
  type IWidgetApiErrorResponseDataDetails,
  type ISearchUserDirectoryResult,
  type IGetMediaConfigResult,
  type IRtcTransportsResult,
  type IRtcLivekitGetTokenFromWidgetRequestData,
  type IRtcLivekitGetTokenFromWidgetResponseData,
  type IRtcLivekitDelegateDelayedLeaveFromWidgetRequestData,
  type IRtcLivekitDelegateDelayedLeaveFromWidgetResponseData,
  OpenIDRequestState,
  SimpleObservable,
  IOpenIDUpdate,
} from 'matrix-widget-api';
import {
  EventType,
  type IContent,
  MatrixError,
  type MatrixEvent,
  Direction,
  type SendDelayedEventResponse,
  type StateEvents,
  type TimelineEvents,
  MatrixClient,
} from 'matrix-js-sdk';
import { getCallCapabilities } from './utils';
import { downloadMedia, mxcUrlToHttp } from '../../utils/matrix';

export class CallWidgetDriver extends WidgetDriver {
  private allowedCapabilities: Set<Capability>;

  private readonly mx: MatrixClient;

  public constructor(
    mx: MatrixClient,
    private inRoomId: string,
  ) {
    super();
    this.mx = mx;

    const deviceId = mx.getDeviceId();
    if (!deviceId) throw new Error('Failed to initialize CallWidgetDriver! Device ID not found.');

    this.allowedCapabilities = getCallCapabilities(inRoomId, mx.getSafeUserId(), deviceId);
  }

  public async validateCapabilities(requested: Set<Capability>): Promise<Set<Capability>> {
    const allow = Array.from(requested).filter((cap) => this.allowedCapabilities.has(cap));
    return new Set(allow);
  }

  public async sendEvent(
    eventType: string,
    content: IContent,
    stateKey: string | null = null,
    targetRoomId: string | null = null,
  ): Promise<ISendEventDetails> {
    const roomId = targetRoomId || this.inRoomId;

    let r: { event_id: string } | null;
    if (typeof stateKey === 'string') {
      r = await this.mx.sendStateEvent(
        roomId,
        eventType as keyof StateEvents,
        content as StateEvents[keyof StateEvents],
        stateKey,
      );
    } else if (eventType === EventType.RoomRedaction) {
      r = await this.mx.redactEvent(roomId, content.redacts);
    } else {
      r = await this.mx.sendEvent(
        roomId,
        eventType as keyof TimelineEvents,
        content as TimelineEvents[keyof TimelineEvents],
      );
    }

    return { roomId, eventId: r.event_id };
  }

  public async sendDelayedEvent(
    delay: number | null,
    parentDelayId: string | null,
    eventType: string,
    content: IContent,
    stateKey: string | null = null,
    targetRoomId: string | null = null,
  ): Promise<ISendDelayedEventDetails> {
    const roomId = targetRoomId || this.inRoomId;

    let delayOpts;
    if (delay !== null) {
      delayOpts = {
        delay,
        ...(parentDelayId !== null && { parent_delay_id: parentDelayId }),
      };
    } else if (parentDelayId !== null) {
      delayOpts = {
        parent_delay_id: parentDelayId,
      };
    } else {
      throw new Error('Must provide at least one of delay or parentDelayId');
    }

    let r: SendDelayedEventResponse | null;
    if (stateKey !== null) {
      r = await this.mx._unstable_sendDelayedStateEvent(
        roomId,
        delayOpts,
        eventType as keyof StateEvents,
        content as StateEvents[keyof StateEvents],
        stateKey,
      );
    } else {
      r = await this.mx._unstable_sendDelayedEvent(
        roomId,
        delayOpts,
        null,
        eventType as keyof TimelineEvents,
        content as TimelineEvents[keyof TimelineEvents],
      );
    }

    return {
      roomId,
      delayId: r.delay_id,
    };
  }

  public async cancelScheduledDelayedEvent(delayId: string): Promise<void> {
    await this.mx._unstable_cancelScheduledDelayedEvent(delayId);
  }

  public async restartScheduledDelayedEvent(delayId: string): Promise<void> {
    await this.mx._unstable_restartScheduledDelayedEvent(delayId);
  }

  public async sendScheduledDelayedEvent(delayId: string): Promise<void> {
    await this.mx._unstable_sendScheduledDelayedEvent(delayId);
  }

  public async sendToDevice(
    eventType: string,
    encrypted: boolean,
    contentMap: { [userId: string]: { [deviceId: string]: object } },
  ): Promise<void> {
    if (encrypted) {
      const crypto = this.mx.getCrypto();
      if (!crypto) throw new Error('E2EE not enabled');

      const invertedContentMap: { [content: string]: { userId: string; deviceId: string }[] } = {};

      // eslint-disable-next-line no-restricted-syntax
      for (const userId of Object.keys(contentMap)) {
        const userContentMap = contentMap[userId];
        // eslint-disable-next-line no-restricted-syntax
        for (const deviceId of Object.keys(userContentMap)) {
          const content = userContentMap[deviceId];
          const stringifiedContent = JSON.stringify(content);
          invertedContentMap[stringifiedContent] = invertedContentMap[stringifiedContent] || [];
          invertedContentMap[stringifiedContent].push({ userId, deviceId });
        }
      }

      await Promise.all(
        Object.entries(invertedContentMap).map(async ([stringifiedContent, recipients]) => {
          const batch = await crypto.encryptToDeviceMessages(
            eventType,
            recipients,
            JSON.parse(stringifiedContent),
          );

          await this.mx.queueToDevice(batch);
        }),
      );
    } else {
      await this.mx.queueToDevice({
        eventType,
        batch: Object.entries(contentMap).flatMap(([userId, userContentMap]) =>
          Object.entries(userContentMap).map(([deviceId, content]) => ({
            userId,
            deviceId,
            payload: content,
          })),
        ),
      });
    }
  }

  public async readRoomTimeline(
    roomId: string,
    eventType: string,
    msgtype: string | undefined,
    stateKey: string | undefined,
    limit: number,
    since: string | undefined,
  ): Promise<IRoomEvent[]> {
    const safeLimit =
      limit > 0 ? Math.min(limit, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER; // relatively arbitrary

    const room = this.mx.getRoom(roomId);
    if (room === null) return [];
    const results: MatrixEvent[] = [];
    const events = room.getLiveTimeline().getEvents();

    for (let i = events.length - 1; i >= 0; i -= 1) {
      const ev = events[i];
      if (results.length >= safeLimit) break;
      if (since !== undefined && ev.getId() === since) break;

      if (
        ev.getType() === eventType &&
        !ev.isState() &&
        (eventType !== EventType.RoomMessage || !msgtype || msgtype === ev.getContent().msgtype) &&
        (ev.getStateKey() === undefined || stateKey === undefined || ev.getStateKey() === stateKey)
      ) {
        results.push(ev);
      }
    }

    return results.map((e) => e.getEffectiveEvent() as IRoomEvent);
  }

  public async askOpenID(observer: SimpleObservable<IOpenIDUpdate>): Promise<void> {
    return observer.update({
      state: OpenIDRequestState.Allowed,
      token: await this.mx.getOpenIdToken(),
    });
  }

  public async readRoomState(
    roomId: string,
    eventType: string,
    stateKey: string | undefined,
  ): Promise<IRoomEvent[]> {
    const room = this.mx.getRoom(roomId);
    if (room === null) return [];
    const state = room.getLiveTimeline().getState(Direction.Forward);
    if (state === undefined) return [];

    if (stateKey === undefined)
      return state.getStateEvents(eventType).map((e) => e.getEffectiveEvent() as IRoomEvent);
    const event = state.getStateEvents(eventType, stateKey);
    return event === null ? [] : [event.getEffectiveEvent() as IRoomEvent];
  }

  public async readEventRelations(
    eventId: string,
    roomId?: string,
    relationType?: string,
    eventType?: string,
    from?: string,
    to?: string,
    limit?: number,
    direction?: 'f' | 'b',
  ): Promise<IReadEventRelationsResult> {
    const dir = direction as Direction;
    const targetRoomId = roomId ?? this.inRoomId ?? undefined;

    if (typeof targetRoomId !== 'string') {
      throw new Error('Error while reading the current room');
    }

    const { events, nextBatch, prevBatch } = await this.mx.relations(
      targetRoomId,
      eventId,
      relationType ?? null,
      eventType ?? null,
      { from, to, limit, dir },
    );

    return {
      chunk: events.map((e) => e.getEffectiveEvent() as IRoomEvent),
      nextBatch: nextBatch ?? undefined,
      prevBatch: prevBatch ?? undefined,
    };
  }

  public async searchUserDirectory(
    searchTerm: string,
    limit?: number,
  ): Promise<ISearchUserDirectoryResult> {
    const { limited, results } = await this.mx.searchUserDirectory({ term: searchTerm, limit });

    return {
      limited,
      results: results.map((r) => ({
        userId: r.user_id,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
      })),
    };
  }

  public async getMediaConfig(): Promise<IGetMediaConfigResult> {
    return this.mx.getMediaConfig();
  }

  public async uploadFile(file: XMLHttpRequestBodyInit): Promise<{ contentUri: string }> {
    const uploadResult = await this.mx.uploadContent(file);

    return { contentUri: uploadResult.content_uri };
  }

  public async downloadFile(contentUri: string): Promise<{ file: XMLHttpRequestBodyInit }> {
    const httpUrl = mxcUrlToHttp(this.mx, contentUri, true);
    if (!httpUrl) {
      throw new Error('Call widget failed to download file! No http url!');
    }
    const blob = await downloadMedia(httpUrl, this.mx);
    return { file: blob };
  }

  public async getRtcTransports(): Promise<IRtcTransportsResult> {
    try {
      const transports = await this.mx._unstable_getRTCTransports();
      return { rtc_transports: transports };
    } catch (e) {
      if (e instanceof MatrixError && e.httpStatus === 404) {
        try {
          const domain = this.mx.getSafeUserId().split(':')[1];
          const wellKnownUrl = `https://${domain}/.well-known/matrix/client`;
          const res = await fetch(wellKnownUrl);
          if (res.ok) {
            const body = (await res.json()) as Record<string, unknown>;
            const foci = body['org.matrix.msc4143.rtc_foci'];
            if (Array.isArray(foci) && foci.length > 0) {
              return { rtc_transports: foci as IRtcTransportsResult['rtc_transports'] };
            }
          }
        } catch {}
        const domain = this.mx.getSafeUserId().split(':')[1];
        if (domain === 'matrix.org') {
          return {
            rtc_transports: [
              {
                type: 'livekit',
                livekit_service_url: 'https://livekit-jwt.call.matrix.org',
              } as unknown as IRtcTransportsResult['rtc_transports'][number],
            ],
          };
        }
      }
      throw e;
    }
  }

  public async getRtcLivekitToken(
    data: IRtcLivekitGetTokenFromWidgetRequestData,
  ): Promise<IRtcLivekitGetTokenFromWidgetResponseData> {
    const token = await this.mx.getOpenIdToken();
    const res = await fetch(data.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: data.room_id,
        slot_id: data.slot_id,
        member: data.member,
        openid_token: token,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to get LiveKit token: ${res.status} ${text}`);
    }
    const body = (await res.json()) as { jwt?: string; token?: string };
    return { jwt: body.jwt ?? body.token ?? '' };
  }

  public async delegateRtcLivekitDelayedLeave(
    _data: IRtcLivekitDelegateDelayedLeaveFromWidgetRequestData,
  ): Promise<IRtcLivekitDelegateDelayedLeaveFromWidgetResponseData> {
    return {};
  }

  public getKnownRooms(): string[] {
    return this.mx.getVisibleRooms().map((r) => r.roomId);
  }

  // eslint-disable-next-line class-methods-use-this
  public processError(error: unknown): IWidgetApiErrorResponseDataDetails | undefined {
    return error instanceof MatrixError
      ? { matrix_api_error: error.asWidgetApiErrorData() }
      : undefined;
  }
}
