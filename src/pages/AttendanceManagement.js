import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { getDefaultSunday, isValidDate, getSundayFromDate } from '../utils/dateUtils';

const AttendanceManagement = () => {
  const [date, setDate] = useState(getDefaultSunday());
  const [attendance, setAttendance] = useState([]);
  const [members, setMembers] = useState([]);
  const [groupFilter, setGroupFilter] = useState(() => 
    localStorage.getItem('selectedGroup') || 'all'
  );
  const [editReason, setEditReason] = useState({});
  const [changes, setChanges] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGroupStatsOpen, setIsGroupStatsOpen] = useState(false);

  const groups = ['소프라노', '알토', '테너', '베이스', '기악부', '피아노', '기타'];

  const isSunday = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 0;
  };

  // 날짜 비교 함수 추가
  const isDateInRange = (targetDate, startDate, endDate) => {
    const target = new Date(targetDate);
    const start = startDate ? new Date(startDate) : new Date('1900-01-01');
    const end = endDate ? new Date(endDate) : new Date('9999-12-31');
    
    return target >= start && target <= end;
  };

  useEffect(() => {
    if (date) {
      fetchMembers(); // 날짜가 변경될 때마다 멤버 목록도 업데이트
      fetchAttendance();
    }
  }, [date]);

  const fetchMembers = async () => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .lte('join_date', formattedDate)
      .or(`out_date.gt.${formattedDate},out_date.is.null`)
      .order('group')
      .order('name');

    if (error) {
      console.error(error);
      return;
    }

    // 추가 필터링
    const activeMembers = data.filter(member => 
      isDateInRange(formattedDate, member.join_date, member.out_date)
    );

    setMembers(activeMembers);
  };

  const fetchAttendance = async () => {
    const formattedDate = new Date(date).toISOString().split('T')[0];

    // 미래 날짜인 경우 처리하지 않음
    if (!isValidDate(formattedDate)) {
      console.log('Future date selected, skipping fetch');
      setAttendance({ list: [] }); // 빈 데이터로 설정
      return;
    }

    console.log('Fetching attendance for date:', formattedDate);

    // 먼저 해당 날짜의 데이터가 있는지 확인
    const { data: existingData } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', formattedDate)
      .maybeSingle(); // single() 대신 maybeSingle() 사용

    // 이미 데이터가 있으면 바로 반환
    if (existingData) {
      console.log('Found existing data:', existingData);
      const attendanceData = typeof existingData.attendance_data === 'string'
        ? JSON.parse(existingData.attendance_data)
        : existingData.attendance_data;

      if (attendanceData && attendanceData.list) {
        setAttendance(attendanceData);
        return;
      }
    }

    // 데이터가 없는 경우에만 새로 생성
    console.log('No valid data found, creating new attendance record');
    await insertDefaultAttendanceData();
  };

  const insertDefaultAttendanceData = async () => {
    const formattedDate = new Date(date).toISOString().split('T')[0];

    // 한 번 더 확인하여 중복 생성 방지
    const { data: existingData } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', formattedDate)
      .maybeSingle();

    if (existingData) {
      console.log('Data already exists, skipping creation');
      return;
    }

    // 해당 날짜에 활동 중인 멤버만 가져오기
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .lte('join_date', formattedDate)  // 가입일이 선택된 날짜 이전
      .or(`out_date.gt.${formattedDate},out_date.is.null`)  // 탈퇴일이 선택된 날짜 이후이거나 없음
      .order('group')
      .order('name');

    if (memberError) {
      console.error(memberError);
      alert('멤버 데이터를 가져오는데 실패했습니다.');
      return;
    }

    // 활동 중인 멤버만 필터링 (추가 안전장치)
    const activeMembers = memberData.filter(member => 
      isDateInRange(formattedDate, member.join_date, member.out_date)
    );

    const defaultData = {
      attendance: activeMembers.length,
      absent: 0,
      excused: 0,
      list: activeMembers.map((member) => ({
        id: member.id,
        name: member.name,
        group: member.group,
        status: 'present',
        reason: '',
      })),
    };

    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        date: formattedDate,
        attendance_data: defaultData,
      });

    if (insertError) {
      console.error(insertError);
      alert('기본 출석 데이터를 생성하는 데 실패했습니다.');
      return;
    }

    setAttendance(defaultData);
  };

  const updateAttendance = (memberId, status, reason = '') => {
    console.log('Updating attendance for member:', memberId, { status, reason });
    
    // 출석으로 변경 시 사유를 빈칸으로 리셋
    const updatedReason = status === 'present' ? '' : reason;
    
    const updatedList = attendance.list.map((item) =>
      item.id === memberId ? { ...item, status, reason: updatedReason } : item
    );

    const updatedAttendance = {
      ...attendance,
      list: updatedList,
      attendance: updatedList.filter((item) => item.status === 'present').length,
      absent: updatedList.filter((item) => item.status === 'absent').length,
      excused: updatedList.filter((item) => item.status === 'excused').length,
    };

    console.log('Updated attendance state:', updatedAttendance);
    setAttendance(updatedAttendance);

    console.log('Adding to changes:', {
      [memberId]: { id: memberId, status, reason: updatedReason }
    });
    setChanges((prev) => ({
      ...prev,
      [memberId]: { id: memberId, status, reason: updatedReason },
    }));
  };

  const handleBulkUpdate = async () => {
    setIsUpdating(true);
    const formattedDate = new Date(date).toISOString().split('T')[0];

    console.log('Starting bulk update for date:', formattedDate);
    console.log('Current changes:', changes);

    try {
      // 1. 현재 데이터 가져오기
      const { data: currentData, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', formattedDate)
        .single();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        alert('데이터를 가져오는 중 오류가 발생했습니다.');
        return;
      }

      console.log('Current data from DB:', currentData);

      // 2. 변경된 항목만 업데이트
      const currentAttendanceData = currentData.attendance_data;
      console.log('Current attendance data:', currentAttendanceData);

      const updatedList = currentAttendanceData.list.map(member => {
        if (changes[member.id]) {
          console.log('Updating member:', member.id, changes[member.id]);
          return {
            ...member,
            status: changes[member.id].status,
            reason: changes[member.id].reason
          };
        }
        return member;
      });

      // 3. 출석/결석/공결 수 계산
      const updatedAttendanceData = {
        ...currentAttendanceData,
        list: updatedList,
        attendance: updatedList.filter(item => item.status === 'present').length,
        absent: updatedList.filter(item => item.status === 'absent').length,
        excused: updatedList.filter(item => item.status === 'excused').length
      };

      console.log('Updated attendance data to save:', updatedAttendanceData);

      // 4. 업데이트 요청 수정
      const { error: updateError } = await supabase
        .from('attendance')
        .update({
          attendance_data: updatedAttendanceData,
          updated_at: new Date().toLocaleString('en-US', { 
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
        })
        .eq('date', formattedDate)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        alert('업데이트 중 오류가 발생했습니다.');
      } else {
        console.log('Update successful');
        setAttendance(updatedAttendanceData);
        setChanges({});
        alert('성공적으로 업데이트되었습니다.');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReasonChange = (memberId, value) => {
    // 현재 멤버의 상태를 찾음
    const member = attendance.list.find(m => m.id === memberId);
    if (!member) return;

    // 현재 상태를 유지하면서 reason만 업데이트
    setChanges(prev => ({
      ...prev,
      [memberId]: { 
        ...prev[memberId],
        id: memberId,
        status: member.status, // 현재 상태 유지
        reason: value 
      }
    }));

    // attendance 상태 업데이트
    const updatedList = attendance.list.map(item =>
      item.id === memberId ? { ...item, reason: value } : item
    );

    setAttendance({
      ...attendance,
      list: updatedList
    });
  };

  const getStatusKorean = (status) => {
    switch (status) {
      case 'present':
        return '출석';
      case 'absent':
        return '결석';
      case 'excused':
        return '공결';
      default:
        return '출석';
    }
  };

  const handleGroupFilterChange = (group) => {
    setGroupFilter(group);
    localStorage.setItem('selectedGroup', group);
  };

  const filteredMembers = attendance.list?.filter((member) => {
    return groupFilter === 'all' || member.group === groupFilter;
  }) || [];

  // 통계 계산 함수 추가
  const calculateStats = (memberList) => {
    if (!memberList || memberList.length === 0) {
      return {
        total: 0,
        present: 0,
        absent: 0,
        excused: 0,
        presentRate: 0,
        absentRate: 0,
        excusedRate: 0
      };
    }

    const total = memberList.length;
    const present = memberList.filter(item => item.status === 'present').length;
    const absent = memberList.filter(item => item.status === 'absent').length;
    const excused = memberList.filter(item => item.status === 'excused').length;

    return {
      total,
      present,
      absent,
      excused,
      presentRate: (present / total * 100).toFixed(2),
      absentRate: (absent / total * 100).toFixed(2),
      excusedRate: (excused / total * 100).toFixed(2)
    };
  };

  // 날짜 이동 함수 수정
  const moveToNextSunday = () => {
    const nextSunday = new Date(date);
    nextSunday.setDate(nextSunday.getDate() + 7);
    
    // 다음 주가 미래인지 확인
    if (!isValidDate(nextSunday.toISOString().split('T')[0])) {
      alert('오늘 이후의 날짜는 선택할 수 없습니다.');
      return;
    }
    
    setDate(nextSunday.toISOString().split('T')[0]);
  };

  const moveToPreviousSunday = () => {
    const previousSunday = new Date(date);
    previousSunday.setDate(previousSunday.getDate() - 7);
    setDate(previousSunday.toISOString().split('T')[0]);
  };

  // 날짜 변경 핸들러 수정
  const handleDateChange = (selectedDate) => {
    if (!isValidDate(selectedDate)) {
      alert('미래 날짜는 선택할 수 없습니다.');
      return;
    }
    const sundayDate = getSundayFromDate(selectedDate);
    setDate(sundayDate);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">찬양대 출석 관리</h1>

      <div className="w-full max-w-4xl px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4 mb-4 sm:mb-0">
            <button 
              onClick={moveToPreviousSunday}
              className="p-1 sm:p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 sm:h-6 sm:w-6 text-gray-600" />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base border rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
            />
            <button 
              onClick={moveToNextSunday}
              disabled={!isValidDate(new Date(date).toISOString().split('T')[0])}
              className={`p-1 sm:p-2 rounded-full transition-colors ${
                isValidDate(new Date(date).toISOString().split('T')[0])
                  ? 'hover:bg-gray-200'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <ChevronRightIcon className="h-4 w-4 sm:h-6 sm:w-6 text-gray-600" />
            </button>
          </div>

          {Object.keys(changes).length > 0 && (
            <button
              onClick={handleBulkUpdate}
              disabled={isUpdating}
              className={`px-4 py-2 rounded-lg text-sm sm:text-base font-semibold text-white 
                ${isUpdating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-300'
                } transition-colors`}
            >
              {isUpdating ? '업데이트 중...' : '변경사항 저장'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2">
              {groupFilter === 'all' ? '전체' : groupFilter}
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">
              {filteredMembers.length}명
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2">출석</h3>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {filteredMembers.filter(item => item.status === 'present').length}명
              </p>
              <p className="text-xs sm:text-lg text-green-500">
                ({calculateStats(filteredMembers).presentRate}%)
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2">결석</h3>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                {filteredMembers.filter(item => item.status === 'absent').length}명
              </p>
              <p className="text-xs sm:text-lg text-red-500">
                ({calculateStats(filteredMembers).absentRate}%)
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2">공결</h3>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                {filteredMembers.filter(item => item.status === 'excused').length}명
              </p>
              <p className="text-xs sm:text-lg text-yellow-500">
                ({calculateStats(filteredMembers).excusedRate}%)
              </p>
            </div>
          </div>
        </div>

{groupFilter === 'all' && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <button
              onClick={() => setIsGroupStatsOpen(!isGroupStatsOpen)}
              className="w-full flex justify-between items-center text-lg font-semibold text-gray-700 mb-4 focus:outline-none"
            >
              <span>그룹별 통계</span>
              <svg
                className={`w-6 h-6 transform transition-transform duration-200 ${
                  isGroupStatsOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isGroupStatsOpen 
                  ? 'max-h-[1000px] opacity-100' 
                  : 'max-h-0 opacity-0'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs sm:text-sm font-medium text-gray-500">
                        그룹
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs sm:text-sm font-medium text-gray-500">
                        인원
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs sm:text-sm font-medium text-green-600">
                        출석
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs sm:text-sm font-medium text-red-600">
                        결석
                      </th>
                      <th scope="col" className="px-3 py-2 text-center text-xs sm:text-sm font-medium text-yellow-600">
                        공결
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groups.map(group => {
                      const groupMembers = attendance.list?.filter(member => member.group === group) || [];
                      const stats = calculateStats(groupMembers);
                      return (
                        <tr key={group} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {group}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-center text-gray-900">
                            {stats.total}명
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-center">
                            <div className="text-green-600">{stats.present}명</div>
                            <div className="text-green-500 text-xs">({stats.presentRate}%)</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-center">
                            <div className="text-red-600">{stats.absent}명</div>
                            <div className="text-red-500 text-xs">({stats.absentRate}%)</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-center">
                            <div className="text-yellow-600">{stats.excused}명</div>
                            <div className="text-yellow-500 text-xs">({stats.excusedRate}%)</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button
            onClick={() => handleGroupFilterChange('all')}
            className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-md ${
              groupFilter === 'all'
                ? 'bg-blue-500 text-white focus:ring focus:ring-blue-300'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            전체
          </button>
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => handleGroupFilterChange(group)}
              className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-md ${
                groupFilter === group
                  ? 'bg-blue-500 text-white focus:ring focus:ring-blue-300'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {group}
            </button>
          ))}
        </div>



        <div className="overflow-x-auto">
          <table className="table-auto w-full bg-white shadow-md rounded-lg overflow-hidden text-center text-sm sm:text-base">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap">이름</th>
                <th className="px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap">소속</th>
                <th className="px-2 py-1 sm:px-4 sm:py-2">출결</th>
                <th className="px-2 py-1 sm:px-4 sm:py-2">사유</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} className="border-b hover:bg-gray-100">
                  <td className="px-4 py-2 whitespace-nowrap">{member.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{member.group}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center space-x-2">
                      {[
                        { status: 'present', label: '출석', shortLabel: '출' },
                        { status: 'absent', label: '결석', shortLabel: '결' },
                        { status: 'excused', label: '공결', shortLabel: '공' }
                      ].map(({ status, label, shortLabel }) => (
                        <button
                          key={status}
                          onClick={() => updateAttendance(member.id, status, member.reason)}
                          className={`px-3 py-1 rounded-lg shadow-md focus:outline-none focus:ring ${
                            member.status === status
                              ? status === 'present'
                                ? 'bg-green-500 text-white focus:ring-green-300'
                                : status === 'absent'
                                ? 'bg-red-500 text-white focus:ring-red-300'
                                : 'bg-yellow-500 text-white focus:ring-yellow-300'
                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                          }`}
                        >
                          <span className="hidden sm:inline">{label}</span>
                          <span className="sm:hidden">{shortLabel}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={member.reason || ''}
                      onChange={(e) => handleReasonChange(member.id, e.target.value)}
                      className={`w-full px-3 py-1 border rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 ${
                        member.status === 'present'
                          ? 'bg-gray-100 cursor-not-allowed'
                          : 'bg-white'
                      }`}
                      placeholder={
                        member.status === 'present'
                          ? '결석/공결에만 사유를 입력할 수 있습니다.'
                          : '사유를 입력하세요'
                      }
                      disabled={member.status === 'present'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManagement;
