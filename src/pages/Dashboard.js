import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { getDefaultSunday } from '../utils/dateUtils';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(getDefaultSunday());
  const [memberStats, setMemberStats] = useState({
    total: 0,
    soprano: 0,
    alto: 0,
    tenor: 0,
    bass: 0,
    instrument: 0,
    other: 0,
    ensembleA: 0,
    ensembleB: 0,
    ensembleC: 0,
    lbt: 0
  });
  const [amAttendance, setAmAttendance] = useState({
    present: 0,
    absent: 0,
    excused: 0,
    presentRate: 0,
    absentRate: 0,
    excusedRate: 0
  });
  const [pmAttendance, setPmAttendance] = useState({
    present: 0,
    absent: 0,
    excused: 0,
    presentRate: 0,
    absentRate: 0,
    excusedRate: 0
  });
  const [amStats, setAmStats] = useState([]);
  const [pmStats, setPmStats] = useState([]);
  const [hasAmData, setHasAmData] = useState(false);
  const [hasPmData, setHasPmData] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState('week'); // 'week' or 'month'
  const [memberViewMode, setMemberViewMode] = useState('table'); // 'table' or 'chart'
  const [attendanceViewMode, setAttendanceViewMode] = useState('table'); // 'table' or 'chart'
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const groups = ['기타', '소프라노', '알토', '테너', '베이스', '기악부'];

  // 그룹명 표시 함수
  const getGroupDisplayName = (groupName) => {
    return groupName === '기타' ? '지휘/기타' : groupName;
  };

  useEffect(() => {
    fetchMemberStats();
    fetchAttendanceData();
  }, []);

  // 현재 활동 중인 멤버 통계
  const fetchMemberStats = async () => {
    const formattedDate = new Date(currentDate).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .lte('join_date', formattedDate)
      .or(`out_date.gt.${formattedDate},out_date.is.null`);

    if (error) {
      console.error('멤버 데이터 조회 실패:', error);
      return;
    }

    const stats = {
      total: data.length,
      soprano: data.filter(m => m.group === '소프라노').length,
      alto: data.filter(m => m.group === '알토').length,
      tenor: data.filter(m => m.group === '테너').length,
      bass: data.filter(m => m.group === '베이스').length,
      instrument: data.filter(m => m.group === '기악부').length,
      other: data.filter(m => m.group === '기타').length,
      ensembleA: data.filter(m => m.tags && m.tags.includes('중창A')).length,
      ensembleB: data.filter(m => m.tags && m.tags.includes('중창B')).length,
      ensembleC: data.filter(m => m.tags && m.tags.includes('중창C')).length,
      lbt: data.filter(m => m.tags && m.tags.includes('엘벧엘')).length
    };

    setMemberStats(stats);
  };

  // 출석 데이터 처리 헬퍼 함수
  const processAttendanceData = (attendanceData) => {
    if (!attendanceData || !attendanceData.list) {
      return {
        attendance: {
          present: 0,
          absent: 0,
          excused: 0,
          presentRate: 0,
          absentRate: 0,
          excusedRate: 0
        },
        stats: []
      };
    }

    const total = attendanceData.list.length;
    const present = attendanceData.list.filter(m => m.status === 'present').length;
    const absent = attendanceData.list.filter(m => m.status === 'absent').length;
    const excused = attendanceData.list.filter(m => m.status === 'excused').length;

    const attendance = {
      present,
      absent,
      excused,
      presentRate: total > 0 ? ((present / total) * 100).toFixed(1) : 0,
      absentRate: total > 0 ? ((absent / total) * 100).toFixed(1) : 0,
      excusedRate: total > 0 ? ((excused / total) * 100).toFixed(1) : 0
    };

    // 그룹별 통계 계산
    const stats = groups.map(group => {
      const groupMembers = attendanceData.list.filter(m => m.group === group);
      const groupTotal = groupMembers.length;
      const groupPresent = groupMembers.filter(m => m.status === 'present').length;
      const groupAbsent = groupMembers.filter(m => m.status === 'absent').length;
      const groupExcused = groupMembers.filter(m => m.status === 'excused').length;

      return {
        group,
        total: groupTotal,
        present: groupPresent,
        absent: groupAbsent,
        excused: groupExcused,
        presentRate: groupTotal > 0 ? ((groupPresent / groupTotal) * 100).toFixed(1) : 0
      };
    });

    return { attendance, stats };
  };

  // 오전/오후 출석 데이터
  const fetchAttendanceData = async () => {
    const formattedDate = new Date(currentDate).toISOString().split('T')[0];

    // 오전 데이터 가져오기
    const { data: amEvents, error: amError } = await supabase
      .from('events')
      .select('*')
      .eq('date', formattedDate)
      .eq('event_type', 'am');

    if (!amError && amEvents && amEvents.length > 0) {
      const amEvent = amEvents[0];
      const amAttendanceData = typeof amEvent.attendance_data === 'string'
        ? JSON.parse(amEvent.attendance_data)
        : amEvent.attendance_data;

      const { attendance, stats } = processAttendanceData(amAttendanceData);
      setAmAttendance(attendance);
      setAmStats(stats);
      setHasAmData(true);
    } else {
      setHasAmData(false);
      setAmAttendance({
        present: 0,
        absent: 0,
        excused: 0,
        presentRate: 0,
        absentRate: 0,
        excusedRate: 0
      });
      setAmStats([]);
    }

    // 오후 데이터 가져오기
    const { data: pmEvents, error: pmError } = await supabase
      .from('events')
      .select('*')
      .eq('date', formattedDate)
      .eq('event_type', 'pm');

    if (!pmError && pmEvents && pmEvents.length > 0) {
      const pmEvent = pmEvents[0];
      const pmAttendanceData = typeof pmEvent.attendance_data === 'string'
        ? JSON.parse(pmEvent.attendance_data)
        : pmEvent.attendance_data;

      const { attendance, stats } = processAttendanceData(pmAttendanceData);
      setPmAttendance(attendance);
      setPmStats(stats);
      setHasPmData(true);
    } else {
      setHasPmData(false);
      setPmAttendance({
        present: 0,
        absent: 0,
        excused: 0,
        presentRate: 0,
        absentRate: 0,
        excusedRate: 0
      });
      setPmStats([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 전체 컨테이너 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* 헤더 */}
          <div className="mb-2 flex justify-between items-start">
    <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                전주교회 찬양대
              </h1>
              <p className="text-lg text-gray-600">
                {new Date(currentDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
            <button
              onClick={() => setShowCalendarModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="출석 일정표 보기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                <path d="M8 2v4"/>
                <path d="M16 2v4"/>
                <rect width="18" height="18" x="3" y="4" rx="2"/>
                <path d="M3 10h18"/>
                <path d="M8 14h.01"/>
                <path d="M12 14h.01"/>
                <path d="M16 14h.01"/>
                <path d="M8 18h.01"/>
                <path d="M12 18h.01"/>
                <path d="M16 18h.01"/>
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="mb-4 border-t border-gray-200"></div>

          {/* 메인 콘텐츠 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* 왼쪽: 전체 인원 및 파트별 인원 */}
            <div className="pt-6 lg:pt-0 lg:pr-6 lg:col-span-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">단원 현황</h2>
                <div className="flex rounded-lg shadow-sm">
                  <button
                    className={`px-2 py-1 text-xs font-semibold rounded-l-md cursor-pointer ${
                      memberViewMode === 'table'
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setMemberViewMode('table')}
                  >
                    표
                  </button>
                  <button
                    className={`px-2 py-1 text-xs font-semibold rounded-r-md cursor-pointer ${
                      memberViewMode === 'chart'
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setMemberViewMode('chart')}
                  >
                    차트
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {/* 전체 - 전체 너비 */}
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-semibold text-gray-700">전체</span>
                  <span className="text-xl font-bold text-blue-600">{memberStats.total}명</span>
                </div>

                {/* 파트 - 2열 그리드 또는 차트 */}
                {memberViewMode === 'table' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-base text-gray-700">소프라노</span>
                      <span className="text-base font-semibold text-gray-800">{memberStats.soprano}명</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-base text-gray-700">알토</span>
                      <span className="text-base font-semibold text-gray-800">{memberStats.alto}명</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-base text-gray-700">테너</span>
                      <span className="text-base font-semibold text-gray-800">{memberStats.tenor}명</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-base text-gray-700">베이스</span>
                      <span className="text-base font-semibold text-gray-800">{memberStats.bass}명</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-base text-gray-700">기악부</span>
                      <span className="text-base font-semibold text-gray-800">{memberStats.instrument}명</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-base text-gray-700">{getGroupDisplayName('기타')}</span>
                      <span className="text-base font-semibold text-gray-800">{memberStats.other}명</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-4">
                    <div style={{ width: '250px', height: '250px' }}>
                      <Pie
                        data={{
                          labels: ['소프라노', '알토', '테너', '베이스', '기악부'],
                          datasets: [{
                            data: [
                              memberStats.soprano,
                              memberStats.alto,
                              memberStats.tenor,
                              memberStats.bass,
                              memberStats.instrument,
                            ],
                            backgroundColor: [
                              '#FFB6C1',  // 소프라노 - 분홍
                              '#FF6347',  // 알토 - 주홍
                              '#87CEEB',  // 테너 - 하늘
                              '#4169E1',  // 베이스 - 남색
                              '#9966FF',  // 기악부 - 보라
                            ],
                            borderWidth: 2,
                            borderColor: '#fff'
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                font: { size: 10 },
                                padding: 10
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => `${context.label}: ${context.parsed}명`
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 구분선 */}
                <div className="my-3"></div>

                {/* 중창단 - 2열 그리드 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                    <span className="text-base text-gray-700">중창A</span>
                    <span className="text-base font-semibold text-purple-700">{memberStats.ensembleA}명</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                    <span className="text-base text-gray-700">중창B</span>
                    <span className="text-base font-semibold text-purple-700">{memberStats.ensembleB}명</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                    <span className="text-base text-gray-700">중창C</span>
                    <span className="text-base font-semibold text-purple-700">{memberStats.ensembleC}명</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                    <span className="text-base text-gray-700">엘벧엘</span>
                    <span className="text-base font-semibold text-purple-700">{memberStats.lbt}명</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 오늘의 출석 현황 - 오전/오후 2열 */}
            <div className="pt-6 lg:pt-0 lg:pl-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-800">
                  
                {new Date(currentDate).toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric'
                })} ({new Date(currentDate).toLocaleDateString('ko-KR', { weekday: 'short' })})
                출석 현황</h2>
                <div className="flex rounded-lg shadow-sm">
                  <button
                    className={`px-2 py-1 text-xs font-semibold rounded-l-md cursor-pointer ${
                      attendanceViewMode === 'table'
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setAttendanceViewMode('table')}
                  >
                    표
                  </button>
                  <button
                    className={`px-2 py-1 text-xs font-semibold rounded-r-md cursor-pointer ${
                      attendanceViewMode === 'chart'
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setAttendanceViewMode('chart')}
                  >
                    차트
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x divide-gray-200">
                {/* 오전 출석 */}
                <div className="md:pr-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">오전</h3>
                  
                  {!hasAmData ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      출석 데이터가 없습니다
                    </div>
                  ) : (
                    <>
                      {attendanceViewMode === 'table' ? (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-xs font-semibold text-gray-600 mb-2">출석</div>
                            <div className="text-3xl font-bold text-[#2cb67d] mb-1">{amAttendance.present}명</div>
                            <div className="text-xs text-[#2cb67d]">({amAttendance.presentRate}%)</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-xs font-semibold text-gray-600 mb-2">결석</div>
                            <div className="text-3xl font-bold text-[#ff4f5e] mb-1">{amAttendance.absent}명</div>
                            <div className="text-xs text-[#ff4f5e]">({amAttendance.absentRate}%)</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-xs font-semibold text-gray-600 mb-2">공결</div>
                            <div className="text-3xl font-bold text-[#f5b841] mb-1">{amAttendance.excused}명</div>
                            <div className="text-xs text-[#f5b841]">({amAttendance.excusedRate}%)</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center mb-4">
                          <div style={{ width: '200px', height: '200px' }}>
                            <Pie
                              data={{
                                labels: ['출석', '결석', '공결'],
                                datasets: [{
                                  data: [amAttendance.present, amAttendance.absent, amAttendance.excused],
                                  backgroundColor: ['#2cb67d', '#ff4f5e', '#f5b841'],
                                  borderWidth: 2,
                                  borderColor: '#fff'
                                }]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      font: { size: 10 },
                                      padding: 8
                                    }
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: (context) => `${context.label}: ${context.parsed}명 (${
                                        context.label === '출석' ? amAttendance.presentRate :
                                        context.label === '결석' ? amAttendance.absentRate :
                                        amAttendance.excusedRate
                                      }%)`
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 오전 그룹별 통계 */}
                      <div className="mt-4">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left text-sm font-medium text-gray-500">그룹</th>
                                <th className="px-2 py-1 text-center text-sm font-medium text-[#2cb67d]">출</th>
                                <th className="px-2 py-1 text-center text-sm font-medium text-[#ff4f5e]">결</th>
                                <th className="px-2 py-1 text-center text-sm font-medium text-[#f5b841]">공</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {amStats.map(stat => (
                                <tr key={stat.group} className="hover:bg-gray-50">
                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                                    {getGroupDisplayName(stat.group)}
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#2cb67d]">
                                    {stat.present}
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#ff4f5e]">
                                    {stat.absent}
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#f5b841]">
                                    {stat.excused}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-gray-100 font-semibold">
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                                  합계
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#2cb67d]">
                                  {amAttendance.present}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#ff4f5e]">
                                  {amAttendance.absent}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#f5b841]">
                                  {amAttendance.excused}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 오후 출석 */}
                <div className="md:pl-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">오후</h3>
                  
                  {!hasPmData ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      출석 데이터가 없습니다
                    </div>
                  ) : (
                    <>
                      {attendanceViewMode === 'table' ? (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-xs font-semibold text-gray-600 mb-2">출석</div>
                            <div className="text-3xl font-bold text-[#2cb67d] mb-1">{pmAttendance.present}명</div>
                            <div className="text-xs text-[#2cb67d]">({pmAttendance.presentRate}%)</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-xs font-semibold text-gray-600 mb-2">결석</div>
                            <div className="text-3xl font-bold text-[#ff4f5e] mb-1">{pmAttendance.absent}명</div>
                            <div className="text-xs text-[#ff4f5e]">({pmAttendance.absentRate}%)</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-xs font-semibold text-gray-600 mb-2">공결</div>
                            <div className="text-3xl font-bold text-[#f5b841] mb-1">{pmAttendance.excused}명</div>
                            <div className="text-xs text-[#f5b841]">({pmAttendance.excusedRate}%)</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center mb-4">
                          <div style={{ width: '200px', height: '200px' }}>
                            <Pie
                              data={{
                                labels: ['출석', '결석', '공결'],
                                datasets: [{
                                  data: [pmAttendance.present, pmAttendance.absent, pmAttendance.excused],
                                  backgroundColor: ['#2cb67d', '#ff4f5e', '#f5b841'],
                                  borderWidth: 2,
                                  borderColor: '#fff'
                                }]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      font: { size: 10 },
                                      padding: 8
                                    }
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: (context) => `${context.label}: ${context.parsed}명 (${
                                        context.label === '출석' ? pmAttendance.presentRate :
                                        context.label === '결석' ? pmAttendance.absentRate :
                                        pmAttendance.excusedRate
                                      }%)`
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 오후 그룹별 통계 */}
                      <div className="mt-4">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left text-sm font-medium text-gray-500">그룹</th>
                                <th className="px-2 py-1 text-center text-sm font-medium text-[#2cb67d]">출</th>
                                <th className="px-2 py-1 text-center text-sm font-medium text-[#ff4f5e]">결</th>
                                <th className="px-2 py-1 text-center text-sm font-medium text-[#f5b841]">공</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {pmStats.map(stat => (
                                <tr key={stat.group} className="hover:bg-gray-50">
                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                                    {getGroupDisplayName(stat.group)}
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#2cb67d]">
                                    {stat.present}
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#ff4f5e]">
                                    {stat.absent}
                                  </td>
                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#f5b841]">
                                    {stat.excused}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-gray-100 font-semibold">
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                                  합계
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#2cb67d]">
                                  {pmAttendance.present}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#ff4f5e]">
                                  {pmAttendance.absent}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-center text-[#f5b841]">
                                  {pmAttendance.excused}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
      </div>
      </div>

      {/* 캘린더 모달 */}
      {showCalendarModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCalendarModal(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[96vw] h-[96vh] flex flex-col">
            <div className="flex justify-end items-center p-1 border-b">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const iframe = document.querySelector('iframe[title="캘린더"]');
                    if (iframe) {
                      iframe.src = iframe.src;
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer p-1"
                  title="새로고침"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </button>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                  title="닫기"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe 
                src="https://docs.google.com/spreadsheets/d/e/2PACX-1vQoI2cr6ks5Gpvx2MuUMOjC0FTNYz9gEKLxynZBvYhVQYklzHAo5XSEWnicQ3b61AQEN8gpiEYsHmBI/pubhtml?gid=661926174&single=true&widget=true&headers=false"
                className="w-full h-full border-0"
                title="캘린더"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
