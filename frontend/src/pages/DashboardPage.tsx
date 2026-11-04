import { useQuery } from '@tanstack/react-query';
import { getDashboardStatsApi } from '../api/dashboard.api';

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const DashboardPage = () => {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStatsApi,
  });

  if (isLoading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;
  if (isError || !stats) return <div className="p-10 text-center text-red-500">Lỗi khi tải dữ liệu thống kê.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Dashboard Học Tập</h1>

      {/* THẺ THỐNG KÊ TỔNG QUAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-blue-100 font-medium mb-1">Tổng thời gian học</p>
            <h2 className="text-4xl font-bold">{formatDuration(stats.totalSeconds)}</h2>
          </div>
          <div className="text-5xl opacity-50">⏱️</div>
        </div>

        <div className="bg-emerald-600 text-white p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-emerald-100 font-medium mb-1">Số phiên đã hoàn thành</p>
            <h2 className="text-4xl font-bold">{stats.totalSessions} <span className="text-xl font-normal">phiên</span></h2>
          </div>
          <div className="text-5xl opacity-50">🎯</div>
        </div>
      </div>

      {/* DANH SÁCH LỊCH SỬ GẦN ĐÂY */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Lịch sử gần đây</h2>
        </div>
        
        {stats.recentSessions.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Chưa có dữ liệu phiên học nào.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                <th className="p-4 font-medium">Mục tiêu</th>
                <th className="p-4 font-medium">Phòng</th>
                <th className="p-4 font-medium">Thời gian</th>
                <th className="p-4 font-medium">Kết thúc lúc</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSessions.map((session) => (
                <tr key={session.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-semibold text-gray-800">{session.goal || 'Không có mục tiêu'}</td>
                  <td className="p-4 text-gray-600">{session.room.name}</td>
                  <td className="p-4 font-bold text-blue-600">{formatDuration(session.duration)}</td>
                  <td className="p-4 text-gray-500 text-sm">{formatDate(session.endedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;