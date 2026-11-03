import { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  stream: MediaStream;
}

const AudioPlayer = ({ stream }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
};

export default AudioPlayer;