// An app to create a UserAgent and accept any call.

import {
  Invitation,
  Session,
  SessionState,
  Referral,
  UserAgent,
} from 'sip.js/lib/api';
import { URI, Contact } from 'sip.js/lib/core';
import { UDPTransport, UDPSessionDescriptionHandler } from './transport';

// The configuration for the proxy.
const listenAddress = '127.0.0.1';
const listenPort = 6666;
const localNumber = '1345';

// sip.js lost its ability to send SIP messages to more than one endpoint. For
// now we supply the remote address and port and send all messages these ways.
const remoteAddress = '127.0.0.1';
const remotePort = 6060;

// sip.js will generate a random "Contact" and then a remote will not be able
// to return any message to the proxy. Resort to a typescript hack and monkey
// patch the initContact method.
const uri = new URI('sip', localNumber, `${listenAddress}:${listenPort}`);
const MY_USER_AGENT: any = UserAgent;
MY_USER_AGENT.prototype.initContact = () => {
  return {
    pubGruu: uri,
    tempGruu: uri,
    uri,
    toString: (options?: any) => {
      return `sip:${localNumber}@${listenAddress}:${listenPort};transport=udp`;
    },
  };
};

// Create an user agent (ua) and provide it with our configuration and a custom
// SIP Session Description Handler to work for UDP (instead of WebSocket).
const ua = new MY_USER_AGENT({
  sessionDescriptionHandlerFactory: (session: Session, options?: any) => {
    const logger = session.userAgent.getLogger(
      'sip.SessionDescriptionHandler',
      session.id
    );
    return new UDPSessionDescriptionHandler(logger, options);
  },
  transportConstructor: UDPTransport,
  transportOptions: {
    address: listenAddress,
    port: listenPort,
    remoteAddress,
    remotePort,
  },
  uri,
});

// Only handle incoming calls right now and get them into a connected state.
ua.delegate = {
  onInvite(invitation: Invitation): void {
    // TODO(holger): Extract information about the call and SDP session and store it.
    const incomingSession: Session = invitation;
    console.log(`Invite ${incomingSession}`);
    invitation
      .accept({})
      .then()
      .catch(err => console.log(`Error accepting ${err}`));
  },
};

ua.start();
