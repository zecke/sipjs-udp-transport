// A sip.js transport for UDP. Proof of Concept quality.

import { EventEmitter } from 'events';
import { Emitter, makeEmitter } from 'sip.js/lib/api/emitter';
import { Transport } from 'sip.js/lib/api/transport';
import { TransportState } from 'sip.js/lib/api/transport-state';
import {
  BodyAndContentType,
  SessionDescriptionHandlerModifier,
  SessionDescriptionHandlerOptions,
  SessionDescriptionHandler,
} from 'sip.js/lib/api';
import { Logger } from 'sip.js/lib/core';
import * as dgram from 'dgram';

// sip.js assumes WebRTC but this is not available on nodejs. Provide a dummy
// interface.
interface RTCSessionDescriptionInit {}

// Options for receiving and sending datagrams.
interface TransportOptions {
  port: number;
  address?: string;
  remotePort: number;
  remoteAddress: string;
}

// A dummy handler to create and close UDP ports and negiotate codecs. Currently
// no ports are opened.
export class UDPSessionDescriptionHandler implements SessionDescriptionHandler {
  private logger: Logger;

  constructor(logger: Logger, options: any) {
    this.logger = logger;
    // TODO(holger): Attempt to open one or two (RTP+RTCP) ports.
  }

  close() {
    // TODO(holger): Close the ports that we opened earlier.
    this.logger.log('close()');
  }

  getDescription(
    options?: SessionDescriptionHandlerOptions,
    modifiers?: SessionDescriptionHandlerModifier[]
  ): Promise<BodyAndContentType> {
    // TODO(holger): Return the listening address and port.
    const body = `v=0
o=Z 0 0 IN IP4 127.0.0.1
s=Z
c=IN IP4 127.0.0.1
t=0 0
m=audio 8000 RTP/AVP 3 110 8 0 98 101
a=rtpmap:110 speex/8000
a=rtpmap:98 iLBC/8000
a=fmtp:98 mode=20
a=rtpmap:101 telephone-event/8000
a=fmtp:101 0-15
a=sendrecv
`;
    return Promise.resolve({ body, contentType: 'application/sdp' });
  }

  hasDescription(): boolean {
    return true;
  }

  holdModifier(description: RTCSessionDescriptionInit) {
    return Promise.resolve(description);
  }

  setDescription(
    sessionDescription: string,
    options: SessionDescriptionHandlerOptions = {},
    modifiers: SessionDescriptionHandlerModifier[] = []
  ) {
    return Promise.resolve();
  }

  sendDtmf(tones: string, options?: any): boolean {
    return false;
  }
}

// A minimal sip.js transport for UDP. Due sip.js limitations responses
// can only be sent to a static and configured remote (proxy).
export class UDPTransport extends EventEmitter implements Transport {
  private _state: TransportState = TransportState.Disconnected;
  private _stateEventEmitter = new EventEmitter();
  private _protocol = 'udp';
  private _logger: Logger;
  private _options: TransportOptions;
  private _socket: dgram.Socket;

  onConnect: (() => void) | undefined;
  onDisconnect: ((error?: Error) => void) | undefined;
  onMessage: ((message: string) => void) | undefined;

  constructor(logger: Logger, options: TransportOptions) {
    super();
    console.log(options);
    this._logger = logger;
    this._options = options;
    this._socket = dgram.createSocket('udp4');
  }

  get state() {
    console.log('get state');
    return this._state;
  }

  get protocol() {
    console.log('Protocol');
    return this._protocol;
  }

  isConnected(): boolean {
    return this.state === TransportState.Connected;
  }

  get stateChange(): Emitter<TransportState> {
    return makeEmitter(this._stateEventEmitter);
  }

  connect(): Promise<void> {
    try {
      this._socket.bind(this._options.port, this._options.address);
      this._socket.on('message', (msg, rinfo) => {
        if (this.onMessage) {
          this.onMessage(msg.toString());
        }
        this.emit('message', msg.toString());
      });
    } catch (error) {
      return Promise.resolve().then(() => {
        // The `state` MUST transition to "Disconnecting" or "Disconnected" before rejecting
        this._state = TransportState.Disconnected;
        if (this.onDisconnect) {
          this.onDisconnect(error);
        }
        throw error;
      });
    }
    return Promise.resolve().then(() => {
      this._state = TransportState.Connected;
      if (this.onConnect) {
        this.onConnect();
      }
    });
  }

  send(message: string): Promise<void> {
    try {
      // TODO(holger): Identify where this should be sent to.
      this._socket.send(
        message,
        this._options.remotePort,
        this._options.remoteAddress
      );
    } catch (error) {
      return Promise.reject(error);
    }
    return Promise.resolve();
  }

  dispose(): Promise<void> {
    console.log('dispose.');
    return this.disconnect();
  }

  disconnect(): Promise<void> {
    console.log('disconnect');
    return new Promise((resolve, reject) => resolve());
  }
}
