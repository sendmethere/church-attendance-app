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
  const [yearInput, setYearInput] = useState(() => new Date(getDefaultSunday()).getFullYear());
  const [monthInput, setMonthInput] = useState(() => new Date(getDefaultSunday()).getMonth() + 1);
  const [dayInput, setDayInput] = useState(() => new Date(getDefaultSunday()).getDate());
  const [timeOfDay, setTimeOfDay] = useState('am'); // 'am' or 'pm' or 'event'
  const [availableEvents, setAvailableEvents] = useState({ am: false, pm: false, event: false });
  const [hasEvents, setHasEvents] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);

  const groups = ['소프라노', '알토', '테너', '베이스', '기악부', '기타'];

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
  }, [date, timeOfDay]);

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
    console.log('Fetching attendance for date:', formattedDate);

    // 해당 날짜의 이벤트 확인
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('date', formattedDate);

    // 오전/오후/행사 이벤트 존재 여부 확인 수정
    const hasValidAM = events?.some(event => event.event_type === 'am');
    const hasValidPM = events?.some(event => event.event_type === 'pm');
    const hasValidEvent = events?.some(event => event.event_type === 'event');

    setAvailableEvents({ 
      am: hasValidAM, 
      pm: hasValidPM, 
      event: hasValidEvent 
    });
    setHasEvents(hasValidAM || hasValidPM || hasValidEvent);

    // 선택된 시간대에 유효한 데이터가 없으면 다른 시간대 선택
    if (!availableEvents[timeOfDay]) {
      if (hasValidAM) setTimeOfDay('am');
      else if (hasValidPM) setTimeOfDay('pm');
      else if (hasValidEvent) setTimeOfDay('event');
    }

    // 현재 선택된 시간대의 이벤트 데이터 가져오기
    const eventType = timeOfDay;
    const existingEvent = events?.find(event => event.event_type === eventType);

    if (existingEvent && existingEvent.attendance_data) {
      console.log('Found existing data:', existingEvent);
      const attendanceData = typeof existingEvent.attendance_data === 'string'
        ? JSON.parse(existingEvent.attendance_data)
        : existingEvent.attendance_data;

      if (attendanceData && attendanceData.list) {
        setAttendance(attendanceData);
        return;
      }
    }

    // 데이터가 없거나 유효하지 않은 경우 새로 생성
    console.log('No valid data found, creating new attendance record');
    await insertDefaultAttendanceData();
  };

  const insertDefaultAttendanceData = async () => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const eventType = timeOfDay;

    // 해당 날짜에 활동 중인 멤버만 가져오기
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .lte('join_date', formattedDate)
      .or(`out_date.gt.${formattedDate},out_date.is.null`)
      .order('group')
      .order('name');

    if (memberError) {
      console.error(memberError);
      alert('멤버 데이터를 가져오는데 실패했습니다.');
      return;
    }

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

    // 기존 레코드 업데이트
    const { error: updateError } = await supabase
      .from('events')
      .update({
        attendance_data: defaultData,
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
      .eq('event_type', eventType);

    if (updateError) {
      console.error(updateError);
      alert('출석 데이터를 업데이트하는 데 실패했습니다.');
      return;
    }

    setAttendance(defaultData);
    setHasEvents(true);
    setAvailableEvents(prev => ({
      ...prev,
      [eventType === 'am' ? 'am' : eventType === 'pm' ? 'pm' : 'event']: true
    }));
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
    const eventType = timeOfDay;

    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('date', formattedDate)
        .eq('event_type', eventType)
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
        .from('events')
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
        .eq('event_type', eventType);

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

  // 사용 가능한 날짜들을 가져오는 함수 추가
  const fetchAvailableDates = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('date')
      .order('date');

    if (error) {
      console.error('날짜 조회 실패:', error);
      return;
    }

    // 중복 날짜 제거
    const uniqueDates = [...new Set(data.map(event => event.date))].sort();
    setAvailableDates(uniqueDates);
  };

  // useEffect에 fetchAvailableDates 추가
  useEffect(() => {
    fetchAvailableDates();
  }, []);

  // moveToNextSunday 함수 수정
  const moveToNextSunday = () => {
    const currentIndex = availableDates.indexOf(date);
    if (currentIndex < availableDates.length - 1) {
      const nextDate = availableDates[currentIndex + 1];
      setDate(nextDate);
      
      // input 값도 업데이트
      const localDate = new Date(nextDate);
      setYearInput(localDate.getFullYear());
      setMonthInput(localDate.getMonth() + 1);
      setDayInput(localDate.getDate());
      
      // 해당 날짜의 일정 타입 확인 및 설정
      checkAndSetEventType(nextDate);
    }
  };

  // moveToPreviousSunday 함수 수정
  const moveToPreviousSunday = () => {
    const currentIndex = availableDates.indexOf(date);
    if (currentIndex > 0) {
      const previousDate = availableDates[currentIndex - 1];
      setDate(previousDate);
      
      // input 값도 업데이트
      const localDate = new Date(previousDate);
      setYearInput(localDate.getFullYear());
      setMonthInput(localDate.getMonth() + 1);
      setDayInput(localDate.getDate());
      
      // 해당 날짜의 일정 타입 확인 및 설정
      checkAndSetEventType(previousDate);
    }
  };

  // handleDateSearch 함수 수정
  const handleDateSearch = () => {
    // 입력값을 숫자로 변환
    const year = parseInt(yearInput);
    const month = parseInt(monthInput) - 1; // JavaScript의 월은 0부터 시작
    const day = parseInt(dayInput);
    
    // 날짜 유효성 기본 체크
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      alert('유효하지 않은 날짜입니다.');
      return;
    }
    
    const searchDate = new Date(Date.UTC(year, month, day));
    
    // 날짜가 실제로 존재하는지 확인
    if (searchDate.getUTCFullYear() !== year || 
        searchDate.getUTCMonth() !== month || 
        searchDate.getUTCDate() !== day) {
      alert('유효하지 않은 날짜입니다.');
      return;
    }

    // 입력된 날짜를 ISO 형식으로 변환
    const formattedSearchDate = searchDate.toISOString().split('T')[0];

    // availableDates에서 입력된 날짜와 같거나 작은 날짜 중 가장 큰 날짜 찾기
    const targetDate = availableDates.reduce((closest, date) => {
      if (date <= formattedSearchDate && (!closest || date > closest)) {
        return date;
      }
      return closest;
    }, null);

    if (!targetDate) {
      alert('조회 가능한 이전 일정이 없습니다.');
      return;
    }

    // 날짜 설정
    setDate(targetDate);
    
    // input 값도 업데이트 (현지 시간 기준)
    const localDate = new Date(targetDate);
    setYearInput(localDate.getFullYear());
    setMonthInput(localDate.getMonth() + 1);
    setDayInput(localDate.getDate());
    
    // 해당 날짜의 일정 타입 확인 및 설정
    checkAndSetEventType(targetDate);
  };

  // 일정 타입을 확인하고 설정하는 함수 수정
  const checkAndSetEventType = async (targetDate) => {
    const { data: events } = await supabase
      .from('events')
      .select('*')  // event_type만이 아닌 전체 데이터를 가져옴
      .eq('date', targetDate);

    if (events && events.length > 0) {
      // 각 타입별 이벤트 존재 여부 확인
      const hasValidAM = events.some(event => event.event_type === 'am');
      const hasValidPM = events.some(event => event.event_type === 'pm');
      const hasValidEvent = events.some(event => event.event_type === 'event');

      // 버튼 상태 업데이트
      setAvailableEvents({
        am: hasValidAM,
        pm: hasValidPM,
        event: hasValidEvent
      });

      // 존재하는 첫 번째 일정 타입으로 설정
      if (hasValidAM) setTimeOfDay('am');
      else if (hasValidPM) setTimeOfDay('pm');
      else if (hasValidEvent) setTimeOfDay('event');

      setHasEvents(hasValidAM || hasValidPM || hasValidEvent);
    } else {
      // 일정이 없는 경우 모든 버튼 비활성화
      setAvailableEvents({
        am: false,
        pm: false,
        event: false
      });
      setHasEvents(false);
    }
  };

  // 멤버 최신화 함수 추가
  const syncMembers = async () => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const eventType = timeOfDay;

    try {
      // 1. 현재 활동 중인 멤버 목록 가져오기
      const { data: activeMembers, error: memberError } = await supabase
        .from('members')
        .select('*')
        .lte('join_date', formattedDate)
        .or(`out_date.gt.${formattedDate},out_date.is.null`)
        .order('group')
        .order('name');

      if (memberError) {
        console.error('멤버 데이터 조회 실패:', memberError);
        alert('멤버 데이터를 가져오는데 실패했습니다.');
        return;
      }

      // 2. 현재 출석부 데이터 가져오기
      const { data: currentAttendance, error: attendanceError } = await supabase
        .from('events')
        .select('*')
        .eq('date', formattedDate)
        .eq('event_type', eventType)
        .single();

      // 출석부가 없는 경우 새로 생성
      if (attendanceError) {
        console.log('출석부가 없어 새로 생성합니다.');
        await insertDefaultAttendanceData();
        return;
      }

      // 3. 현재 출석부에 없는 멤버 찾기
      const currentAttendanceData = typeof currentAttendance.attendance_data === 'string'
        ? JSON.parse(currentAttendance.attendance_data)
        : currentAttendance.attendance_data;

      if (!currentAttendanceData || !currentAttendanceData.list) {
        console.log('출석부 데이터가 올바르지 않아 새로 생성합니다.');
        await insertDefaultAttendanceData();
        return;
      }

      const existingMemberIds = new Set(currentAttendanceData.list.map(m => m.id));
      const newMembers = activeMembers.filter(member => 
        !existingMemberIds.has(member.id) && 
        isDateInRange(formattedDate, member.join_date, member.out_date)
      );

      if (newMembers.length === 0) {
        alert('추가할 새로운 멤버가 없습니다.');
        return;
      }

      // 4. 새로운 멤버 추가
      const updatedList = [
        ...currentAttendanceData.list,
        ...newMembers.map(member => ({
          id: member.id,
          name: member.name,
          group: member.group,
          status: 'present',
          reason: '',
        }))
      ];

      // 5. 통계 업데이트
      const updatedAttendanceData = {
        ...currentAttendanceData,
        list: updatedList,
        attendance: updatedList.filter(item => item.status === 'present').length,
        absent: updatedList.filter(item => item.status === 'absent').length,
        excused: updatedList.filter(item => item.status === 'excused').length,
      };

      // 6. 데이터베이스 업데이트
      const { error: updateError } = await supabase
        .from('events')
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
        .eq('event_type', eventType);

      if (updateError) {
        console.error('업데이트 실패:', updateError);
        alert('멤버 최신화에 실패했습니다.');
        return;
      }

      // 7. 상태 업데이트 및 알림
      setAttendance(updatedAttendanceData);
      alert(`${newMembers.length}명의 멤버가 추가되었습니다.`);

    } catch (error) {
      console.error('멤버 최신화 중 오류 발생:', error);
      alert('멤버 최신화 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">찬양대 출석 관리</h1>

      <div className="w-full max-w-4xl px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-4 sm:mb-0 w-full sm:w-auto">
            <div className="flex items-center justify-center w-full sm:w-auto space-x-2">
              <button 
                onClick={moveToPreviousSunday}
                disabled={availableDates.indexOf(date) <= 0}
                className={`p-1 sm:p-2 rounded-full transition-colors ${
                  availableDates.indexOf(date) <= 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                <ChevronLeftIcon className="h-4 w-4 sm:h-6 sm:w-6" />
              </button>

              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  className="w-14 px-1 py-1 text-sm border rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="년"
                />
                <span className="text-gray-600">년</span>
                <input
                  type="text"
                  value={monthInput}
                  onChange={(e) => setMonthInput(e.target.value)}
                  className="w-10 px-1 py-1 text-sm border rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="월"
                />
                <span className="text-gray-600">월</span>
                <input
                  type="text"
                  value={dayInput}
                  onChange={(e) => setDayInput(e.target.value)}
                  className="w-10 px-1 py-1 text-sm border rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="일"
                />
                <span className="text-gray-600">일</span>
              </div>

              <button 
                onClick={moveToNextSunday}
                disabled={availableDates.indexOf(date) >= availableDates.length - 1}
                className={`p-1 sm:p-2 rounded-full transition-colors ${
                  availableDates.indexOf(date) >= availableDates.length - 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                <ChevronRightIcon className="h-4 w-4 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="flex items-center justify-center w-full sm:w-auto space-x-2">
              <div className="flex rounded-lg shadow-sm">
                <button
                  className={`px-3 py-1 text-sm font-semibold rounded-l-lg ${
                    timeOfDay === 'am'
                      ? 'bg-blue-500 text-white'
                      : availableEvents.am
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => setTimeOfDay('am')}
                  disabled={!availableEvents.am}
                >
                  오전
                </button>
                <button
                  className={`px-3 py-1 text-sm font-semibold ${
                    timeOfDay === 'pm'
                      ? 'bg-blue-500 text-white'
                      : availableEvents.pm
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => setTimeOfDay('pm')}
                  disabled={!availableEvents.pm}
                >
                  오후
                </button>
                <button
                  className={`px-3 py-1 text-sm font-semibold rounded-r-lg ${
                    timeOfDay === 'event'
                      ? 'bg-blue-500 text-white'
                      : availableEvents.event
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => setTimeOfDay('event')}
                  disabled={!availableEvents.event}
                >
                  행사
                </button>
              </div>

              <button
                onClick={handleDateSearch}
                className="px-3 py-1 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 transition-colors"
              >
                조회
              </button>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={syncMembers}
              className="px-4 py-2 rounded-lg text-sm sm:text-base font-semibold text-white bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-300 transition-colors"
            >
              멤버 최신화
            </button>

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
        </div>

        {!hasEvents ? (
          <div className="w-full bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-xl text-gray-600">해당 날짜에 등록된 일정이 없습니다.</p>
          </div>
        ) : (
          <>
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
                  <div><span>그룹별 통계</span><span className="text-xs text-gray-500 ml-2">({date} {timeOfDay === 'am' ? '오전' : timeOfDay === 'pm' ? '오후' : '행사'})</span></div>
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
                    {groupFilter === 'all' && (
                      <th className="px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap">소속</th>
                    )}
                    <th className="px-2 py-1 sm:px-4 sm:py-2">출결</th>
                    <th className="px-2 py-1 sm:px-4 sm:py-2">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-100">
                      <td className="px-4 py-2 whitespace-nowrap">{member.name}</td>
                      {groupFilter === 'all' && (
                        <td className="px-4 py-2 whitespace-nowrap">{member.group}</td>
                      )}
                      <td className="px-4 py-2">
                        <div className="flex justify-center space-x-1 sm:space-x-2">
                          {[
                            { status: 'present', label: '출석', shortLabel: '출' },
                            { status: 'absent', label: '결석', shortLabel: '결' },
                            { status: 'excused', label: '공결', shortLabel: '공' }
                          ].map(({ status, label, shortLabel }) => (
                            <button
                              key={status}
                              onClick={() => updateAttendance(member.id, status, member.reason)}
                              className={`px-2 sm:px-3 py-1 rounded-lg shadow-md focus:outline-none focus:ring text-xs sm:text-sm ${
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
                      <td className="px-2 sm:px-4 py-2 min-w-[120px] sm:min-w-[200px]">
                        <input
                          type="text"
                          value={member.reason || ''}
                          onChange={(e) => handleReasonChange(member.id, e.target.value)}
                          className={`w-full px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300 ${
                            member.status === 'present'
                              ? 'bg-gray-100 cursor-not-allowed'
                              : 'bg-white'
                          }`}
                          placeholder={
                            member.status === 'present'
                              ? '결석/공결 시 입력'
                              : '사유 입력'
                          }
                          disabled={member.status === 'present'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;
