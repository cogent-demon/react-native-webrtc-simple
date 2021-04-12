import { startWebRTC } from './WebRtcSimple/webrtc';
import { callToUser, listeningRemoteCall, peerConnection } from './WebRtcSimple/peer';
import { START_CALL, RECEIVED_CALL, ACCEPT_CALL, REJECT_CALL, END_CALL, REMOTE_STREAM, SetupPeer } from './WebRtcSimple/contains';

let currentCall: any[] = [];
let stream: any = null;
let peerServer: any = null;
let peerConn: any[] = [];
let sessionId: string | null = null;

const WebRTCSimple = {
  start: async (configPeer: SetupPeer) => {
    const myStream = await startWebRTC();
    stream = myStream;
    if (myStream) {
      const peer = await peerConnection(configPeer, myStream);
      if (peer) {
        peerServer = peer;
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  },
  getLocalStream: () => {
    return stream;
  },
  getSessionId: (callback: (id: string) => void) => {
    if (sessionId) {
      callback(sessionId);
    } else {
      peerServer.on('open', (id: string) => {
        sessionId = id;
        listeningRemoteCall(sessionId, stream);
        callback(id);
      });
    }
  },
  listenings: {
    callEvents: (callback: (type: 'RECEIVED_CALL' | 'ACCEPT_CALL' | 'START_CALL' | 'END_CALL' | 'REJECT_CALL', userdata?: | object) => void) => {

      START_CALL.subscribe((data: any) => {
        peerConn.push(data.peerConn);
        callback('START_CALL', null);
      });

      RECEIVED_CALL.subscribe((data: any) => {
        peerConn.push(data.peerConn);
        const userData = data?.userData;
        callback('RECEIVED_CALL', userData);
      });

      ACCEPT_CALL.subscribe((data: any) => {
        callback('ACCEPT_CALL', data?.sessionId ? data?.sessionId : null);
      });

      REJECT_CALL.subscribe((data: any) => {
        peerConn = [];
        callback('REJECT_CALL', data?.sessionId ? data?.sessionId : null);
      });

      END_CALL.subscribe((data: any) => {
        currentCall = [];
        peerConn = [];
        callback('END_CALL', data && data.sessionId ? { sessionId: data.sessionId } : null);
      });

      REMOTE_STREAM.subscribe((data: any) => {
        currentCall.push(data.call);
      });

    },
    getRemoteStream: (callback: (remoteStream: any) => void) => {
      REMOTE_STREAM.subscribe((data: any) => {
        callback(data.remoteStream);
      });
    },
  },
  events: {
    call: (callId: string, userData: any = {}) => {
      if (sessionId) {
        callToUser(sessionId, callId, userData);
      } else {
        console.log('Call error: Session is null');
      }
    },
    acceptCall: () => {
      if (peerConn.length > 0) {
        ACCEPT_CALL.next({ peerConn });
      }
    },
    rejectCall: () => {
      if (peerConn.length > 0) {
        REJECT_CALL.next({ peerConn });
      }
    },
    endCall: () => {
      if (currentCall.length > 0) {
        END_CALL.next({ currentCall, peerConn });
      }
    },
    switchCamera: () => {
      stream?.getVideoTracks()[0]._switchCamera();
    },
    muted: (mute: boolean) => {
      stream.getTracks().map((track: any) => {
        track.muted = mute;
      });
      console.log(stream);
    },
  },
};

export default WebRTCSimple;
