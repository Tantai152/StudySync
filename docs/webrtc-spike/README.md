# WebRTC Two-Browser Spike

## Goal

Validate whether StudySync can support peer-to-peer audio communication between two browsers using WebRTC.

## Test Environment

- Browser A: Google Chrome
- Browser B: Microsoft Edge
- Transport: WebRTC audio
- Signaling: Manual SDP copy/paste
- STUN: Google public STUN server
- Environment: localhost

## Test Flow

1. Request microphone permission on both browsers.
2. Browser A creates a WebRTC offer.
3. Offer SDP is copied manually to Browser B.
4. Browser B applies the offer and creates an answer.
5. Answer SDP is copied back to Browser A.
6. Browser A applies the answer.
7. Both browsers establish a peer connection and exchange audio.

## Result

The two browsers successfully established a WebRTC peer connection.

Audio communication between Chrome and Edge is feasible on localhost.

## Feasibility Conclusion

WebRTC is suitable for the StudySync MVP voice feature.

For the production implementation:

- Socket.IO should replace manual SDP copy/paste for signaling.
- WebRTC should continue to carry the audio stream directly between peers.
- STUN is sufficient for development testing.
- TURN may be required in production for restrictive NAT/firewall environments.
- HTTPS/WSS will be required outside localhost.
- Peer connections must be cleaned up when users leave or disconnect.

## Limitations of This Spike

- Manual signaling only.
- No authentication.
- No room membership validation.
- No mute/unmute UI.
- No automatic reconnection.
- No TURN server testing.
- Tested only with two browsers on one machine.