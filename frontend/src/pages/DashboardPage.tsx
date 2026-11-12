import { useQuery } from '@tanstack/react-query';
import { ActivityCalendar, type Activity } from 'react-activity-calendar';
import {
  getDashboardStatsApi,
  getStudyStatsApi,
  getUserSummariesApi,
} from '../api/dashboard.api';
import { BackButton } from '../components/BackButton';

const formatDuration = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatHeatmapDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const DashboardPage = () => {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStatsApi,
  });

  const { data: studyStats, isLoading: isLoadingStudyStats } = useQuery({
    queryKey: ['studyStats'],
    queryFn: getStudyStatsApi,
  });

  const { data: summaries = [], isLoading: isLoadingSummaries } = useQuery({
    queryKey: ['userSummaries'],
    queryFn: getUserSummariesApi,
  });

  if (
    isLoadingStats ||
    isLoadingStudyStats ||
    isLoadingSummaries ||
    !stats ||
    !studyStats
  ) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <BackButton className="mb-4" />
        <div className="p-10 text-center">Đang tải dữ liệu...</div>
      </div>
    );
  }

  const heatmapData: Activity[] = studyStats.heatmap.map((day) => ({
    date: day.date,
    count: Math.round(day.duration / 60),
    level: day.level,
  }));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <BackButton className="mb-4" />
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

      {/* STREAK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-orange-100 font-medium mb-1">
              Chuỗi ngày học hiện tại
            </p>
            <h2 className="text-4xl font-bold">
              {studyStats.currentStreak}{' '}
              <span className="text-xl font-normal">ngày</span>
            </h2>
          </div>
          <div className="text-5xl opacity-50">🔥</div>
        </div>

        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-emerald-100 font-medium mb-1">
              Chuỗi ngày học dài nhất
            </p>
            <h2 className="text-4xl font-bold">
              {studyStats.longestStreak}{' '}
              <span className="text-xl font-normal">ngày</span>
            </h2>
          </div>
          <div className="text-5xl opacity-50">🏆</div>
        </div>
      </div>

      {/* HEATMAP ĐÓNG GÓP HỌC TẬP */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-10">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">
            Biểu đồ đóng góp học tập
          </h2>
          <p className="text-sm text-gray-500">365 ngày gần nhất</p>
        </div>

        <div className="p-5 overflow-x-auto">
          <ActivityCalendar
            data={heatmapData}
            colorScheme="light"
            blockSize={12}
            blockMargin={3}
            blockRadius={2}
            theme={{
              light: ['#ebedf0', '#d1fae5', '#6ee7b7', '#34d399', '#059669'],
              dark: ['#1f2937', '#064e3b', '#047857', '#10b981', '#6ee7b7'],
            }}
            labels={{
              totalCount: 'Tổng {{count}} phút học trong năm qua',
              legend: { less: 'Ít', more: 'Nhiều' },
            }}
            tooltips={{
              activity: {
                text: (activity) =>
                  `${activity.count} phút vào ngày ${formatHeatmapDate(activity.date)}`,
              },
            }}
          />
        </div>
      </div>

      {/* DANH SÁCH LỊCH SỬ GẦN ĐÂY */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-10">
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
                  <td className="p-4 text-gray-500 text-sm">{formatDateTime(session.endedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* LỊCH SỬ TÓM TẮT BUỔI HỌC */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Lịch sử tóm tắt buổi học</h2>
          <p className="text-sm text-gray-500">
            {summaries.length === 0 ? 'Chưa có bản tóm tắt nào.' : `${summaries.length} bản tóm tắt`}
          </p>
        </div>

        {summaries.length === 0 ? (
          <div className="p-12 text-center text-gray-400 border-b border-t">
            <div className="text-2xl mb-2">📝</div>
            <p className="font-medium text-gray-600">Chưa có buổi học nào được tóm tắt.</p>
            <p className="text-sm text-gray-500 mt-1">
              Tóm tắt sẽ tự động xuất hiện sau khi buổi học kết thúc và phòng vắng người 2 phút.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {summaries.map((summary) => (
              <div key={summary.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <h3 className="font-bold text-gray-800 text-lg">{summary.roomName}</h3>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {formatDate(summary.createdAt)}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{summary.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;