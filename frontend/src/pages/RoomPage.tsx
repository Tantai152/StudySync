import { useParams } from 'react-router-dom';

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <div className="flex min-h-full flex-col justify-center items-center bg-gray-50 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-600">
          Room: {roomId ?? 'Loading...'}
        </h2>
        <p className="mt-4 text-gray-600">
          This is the room page for room ID: {roomId}
        </p>
      </div>
    </div>
  );
};

export default RoomPage;