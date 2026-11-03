import { useEffect, useRef } from 'react';
import { useVoiceRoom } from '../hooks/useVoiceRoom';
import { useAuth } from '../hooks/useAuth';

interface VoicePanelProps {
  roomId: string;
}

const MicIcon = ({ className = '' }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = ({ className = '' }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const PhoneOffIcon = ({ className = '' }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15.053 5.547A10 10 0 0 1 20.687 11.2c.434.981.653 2.01.653 3.08 0 5.22-3.86 9.57-8.855 10.56-.79.15-1.605.22-2.415.22-4.052 0-7.744-2.788-8.89-6.97C3.85 16.204 2.08 13.345 1.5 10.53c-.18-1.014-.06-2.052.42-2.96.23-.45.54-.85.9-1.2.17-.18.36-.34.57-.49.43-.28.9-.57 1.4-.86 1.1-.63 2.3-1.27 3.55-1.9 1.25-.63 2.55-1.28 3.9-1.92A10 10 0 0 1 17 8.4c1.89.27 3.56.84 5.01 1.81 1.05.7 1.89 1.61 2.09 2.65.07.36.11.73.11 1.09 0 .7-.15 1.37-.39 2z" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const initialsFrom = (userId: string): string => {
  return userId.slice(-2).toUpperCase();
};

const VoicePanel = ({ roomId }: VoicePanelProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const { state, peers, error, isMuted, join, leaveVoice, toggleMute } =
    useVoiceRoom({ roomId });

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const currentUserIds = new Set(peers.map((p) => p.userId));
    for (const uid of audioRefs.current.keys()) {
      if (!currentUserIds.has(uid)) {
        const el = audioRefs.current.get(uid);
        if (el) {
          el.srcObject = null;
        }
        audioRefs.current.delete(uid);
      }
    }
  }, [peers]);

  const renderIdle = () => (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-600">Chưa tham gia voice</p>
      <button
        onClick={join}
        disabled={state === 'requesting-mic' || state === 'connecting'}
        className={`w-full px-4 py-2 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
          state === 'requesting-mic' || state === 'connecting'
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        <MicIcon />
        <span>Tham gia voice</span>
      </button>
    </div>
  );

  const renderRequestingMic = () => (
    <div className="p-4 space-y-3 text-center">
      <div className="flex justify-center">
        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-sm text-gray-600">Đang xin quyền micro…</p>
    </div>
  );

  const renderConnecting = () => (
    <div className="p-4 space-y-3 text-center">
      <div className="flex justify-center">
        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-sm text-gray-600">Đang kết nối voice…</p>
    </div>
  );

  const renderConnected = () => (
    <div className="p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800">
        Voice ({peers.length + 1})
      </p>
      <div className="space-y-2">
        {/* Self */}
        <div className="flex items-center gap-2 p-2 bg-white border rounded-lg">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
            {initialsFrom(currentUserId)}
          </div>
          <span className="text-xs text-gray-700 truncate flex-1">Bạn</span>
          {isMuted ? (
            <MicOffIcon className="text-gray-400" />
          ) : (
            <MicIcon className="text-emerald-600" />
          )}
        </div>

        {/* Peers */}
        {peers.map((peer) => (
          <div
            key={peer.userId}
            className="flex items-center gap-2 p-2 bg-white border rounded-lg"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-xs font-bold">
              {initialsFrom(peer.userId)}
            </div>
            <span className="text-xs text-gray-700 truncate flex-1">
              {peer.userId.slice(-6)}
            </span>
            {peer.muted && <MicOffIcon className="text-gray-400" />}
            {!peer.muted && peer.audioStream && (
              <MicIcon className="text-emerald-600" />
            )}
            {peer.iceState !== 'connected' && (
              <span className="text-[10px] text-gray-400">
                {peer.iceState}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Mute / Unmute button */}
      <button
        onClick={toggleMute}
        className={`w-full px-4 py-2 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
          isMuted
            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {isMuted ? (
          <>
            <MicOffIcon />
            <span>Unmute</span>
          </>
        ) : (
          <>
            <MicIcon />
            <span>Mute</span>
          </>
        )}
      </button>

      {/* Leave voice button */}
      <button
        onClick={leaveVoice}
        className="w-full px-4 py-2 rounded-lg font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
      >
        <PhoneOffIcon />
        <span>Rời voice</span>
      </button>
    </div>
  );

  const renderError = () => (
    <div className="p-4 space-y-3">
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
        <p className="text-sm text-rose-700">{error}</p>
      </div>
      <button
        onClick={join}
        className="w-full px-4 py-2 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
      >
        <MicIcon />
        <span>Tham gia lại</span>
      </button>
    </div>
  );

  const audioElements = peers.map((peer) => {
    if (!peer.audioStream) return null;
    return (
      <audio
        key={peer.userId}
        autoPlay
        ref={(el) => {
          if (el && peer.audioStream) {
            el.srcObject = peer.audioStream;
            audioRefs.current.set(peer.userId, el);
          }
        }}
        className="hidden"
      />
    );
  });

  switch (state) {
    case 'idle':
      return renderIdle();
    case 'requesting-mic':
      return renderRequestingMic();
    case 'connecting':
      return renderConnecting();
    case 'connected':
      return (
        <div className="p-2">
          {renderConnected()}
          {audioElements}
        </div>
      );
    case 'error':
      return renderError();
    default:
      return renderIdle();
  }
};

export default VoicePanel;
