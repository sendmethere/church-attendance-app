import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { getDefaultSunday, isValidDate, getSundayFromDate } from '../utils/dateUtils';

const AttendanceManagement = () => {
  const [date, setDate] = useState(getDefaultSunday());
  const [attendance, setAttendance] = useState([]);
  const [members, setMembers] = useState([]);
  const [groupFilter, setGroupFilter] = useState(() => 
    localStorage.getItem('selectedGroup') || 'all'
  );
  const [tagFilter, setTagFilter] = useState(() => 
    localStorage.getItem('selectedTag') || 'all'
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
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [showExcusedModal, setShowExcusedModal] = useState(false);

  const groups = ['기타', '소프라노', '알토', '테너', '베이스', '기악부'];
  const tags = ['중창A', '중창B', '중창C', '엘벧엘'];

  // 그룹/태그 축약 표시 함수
  const getShortName = (name) => {
    const shortNames = {
      '소프라노': '소',
      '알토': '알',
      '테너': '테',
      '베이스': '베',
      '기악부': '기악',
      '중창A': 'A',
      '중창B': 'B',
      '중창C': 'C',
      '엘벧엘': '엘'
    };
    return shortNames[name] || name;
  };

  // 그룹명 전체 표시 함수
  const getGroupDisplayName = (name) => {
    return name === '기타' ? '지휘/기타' : name;
  };

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
      .or(`out_date.gt.${formattedDate},out_date.is.null`);

    if (error) {
      console.error(error);
      return;
    }

    // 추가 필터링
    const activeMembers = data.filter(member => 
      isDateInRange(formattedDate, member.join_date, member.out_date)
    );

    // 커스텀 순서로 정렬
    const sortedMembers = activeMembers.sort((a, b) => {
      const groupIndexA = groups.indexOf(a.group);
      const groupIndexB = groups.indexOf(b.group);
      
      if (groupIndexA !== groupIndexB) {
        return groupIndexA - groupIndexB;
      }
      
      return a.name.localeCompare(b.name, 'ko');
    });

    setMembers(sortedMembers);
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

    // 1. 해당 날짜에 활동 중인 멤버 목록 조회
    // - join_date가 현재 날짜보다 이전이고
    // - out_date가 현재 날짜보다 이후이거나 null인 멤버들을 가져옴
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

    // 2. 실제로 해당 날짜에 활동 중인 멤버만 필터링
    // - join_date와 out_date 사이에 현재 날짜가 있는 멤버만 선택
    const activeMembers = memberData.filter(member => 
      isDateInRange(formattedDate, member.join_date, member.out_date)
    );

    // 3. 기본 출석 데이터 구조 생성
    // - 모든 멤버의 초기 상태를 'absent'(결석)로 설정
    // - 출석/결석/공결 카운트 초기화
    const defaultData = {
      attendance: activeMembers.length,  // 전체 인원 수
      absent: 0,                         // 결석 인원 수
      excused: 0,                        // 공결 인원 수
      list: activeMembers.map((member) => ({
        id: member.id,
        name: member.name,
        group: member.group,
        tags: member.tags || [],
        status: 'absent',               // 초기 상태는 모두 결석
        reason: '',                      // 사유는 빈 문자열로 초기화
      })),
    };

    /* 결석을 기본값으로 변경하려면:
     * 1. status를 'absent'로 변경
     * 2. attendance와 absent 카운트를 반대로 설정
     * 3. reason에 기본 사유를 설정할 수도 있음
     * 
     * const defaultData = {
     *   attendance: 0,                     // 출석 인원 수 (초기값 0)
     *   absent: activeMembers.length,      // 결석 인원 수 (전체 인원)
     *   excused: 0,                        // 공결 인원 수
     *   list: activeMembers.map((member) => ({
     *     id: member.id,
     *     name: member.name,
     *     group: member.group,
     *     tags: member.tags || [],
     *     status: 'absent',                // 초기 상태를 결석으로 변경
     *     reason: '미출석',                 // 기본 사유 설정 (선택사항)
     *   })),
     * };
     */

    // 4. 데이터베이스에 출석 데이터 업데이트
    // - 해당 날짜와 이벤트 타입(오전/오후/행사)에 맞는 레코드 업데이트
    // - updated_at 필드에 현재 시간(한국 시간) 기록
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

    // 5. 상태 업데이트
    // - 출석 데이터 상태 업데이트
    // - 이벤트 존재 여부 플래그 설정
    // - 해당 이벤트 타입의 가용성 플래그 설정
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

  // 숨겨진 기능: 모든 필터링된 멤버를 출석으로 변경
  const handleMarkAllAsPresent = () => {
    if (!filteredMembers || filteredMembers.length === 0) {
      return;
    }

    // 모든 필터링된 멤버들의 상태를 출석으로 변경
    const updatedList = attendance.list.map((item) => {
      const isFiltered = filteredMembers.some(fm => fm.id === item.id);
      if (isFiltered) {
        return { ...item, status: 'present', reason: '' };
      }
      return item;
    });

    const updatedAttendance = {
      ...attendance,
      list: updatedList,
      attendance: updatedList.filter((item) => item.status === 'present').length,
      absent: updatedList.filter((item) => item.status === 'absent').length,
      excused: updatedList.filter((item) => item.status === 'excused').length,
    };

    setAttendance(updatedAttendance);

    // changes에도 추가
    const newChanges = {};
    filteredMembers.forEach(member => {
      newChanges[member.id] = { id: member.id, status: 'present', reason: '' };
    });

    setChanges((prev) => ({
      ...prev,
      ...newChanges,
    }));
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

  const handleTagFilterChange = (tag) => {
    setTagFilter(tag);
    localStorage.setItem('selectedTag', tag);
  };

  const filteredMembers = (attendance.list?.filter((member) => {
    const groupMatch = groupFilter === 'all' || member.group === groupFilter;
    const tagMatch = tagFilter === 'all' || (member.tags && member.tags.includes(tagFilter));
    return groupMatch && tagMatch;
  }) || []).sort((a, b) => {
    const groupIndexA = groups.indexOf(a.group);
    const groupIndexB = groups.indexOf(b.group);
    
    if (groupIndexA !== groupIndexB) {
      return groupIndexA - groupIndexB;
    }
    
    return a.name.localeCompare(b.name, 'ko');
  });

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
  const moveToNextSunday = async () => {
    const currentIndex = availableDates.indexOf(date);
    if (currentIndex < availableDates.length - 1) {
      const nextDate = availableDates[currentIndex + 1];
      
      // input 값 업데이트
      const localDate = new Date(nextDate);
      setYearInput(localDate.getFullYear());
      setMonthInput(localDate.getMonth() + 1);
      setDayInput(localDate.getDate());
      
      // 일정 타입 확인 및 설정을 기다림
      await checkAndSetEventType(nextDate);
      
      // 타입 설정이 완료된 후 날짜 설정
      setDate(nextDate);
    }
  };

  // moveToPreviousSunday 함수 수정
  const moveToPreviousSunday = async () => {
    const currentIndex = availableDates.indexOf(date);
    if (currentIndex > 0) {
      const previousDate = availableDates[currentIndex - 1];
      
      // input 값 업데이트
      const localDate = new Date(previousDate);
      setYearInput(localDate.getFullYear());
      setMonthInput(localDate.getMonth() + 1);
      setDayInput(localDate.getDate());
      
      // 일정 타입 확인 및 설정을 기다림
      await checkAndSetEventType(previousDate);
      
      // 타입 설정이 완료된 후 날짜 설정
      setDate(previousDate);
    }
  };

  // handleDateSearch 함수 수정
  const handleDateSearch = async () => {  // async 추가
    // 입력값을 숫자로 변환
    const year = parseInt(yearInput);
    const month = parseInt(monthInput) - 1;
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

    const formattedSearchDate = searchDate.toISOString().split('T')[0];

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

    // input 값 업데이트
    const localDate = new Date(targetDate);
    setYearInput(localDate.getFullYear());
    setMonthInput(localDate.getMonth() + 1);
    setDayInput(localDate.getDate());
    
    // 일정 타입 확인 및 설정을 기다림
    await checkAndSetEventType(targetDate);
    
    // 타입 설정이 완료된 후 날짜 설정
    setDate(targetDate);
  };

  // checkAndSetEventType 함수 수정
  const checkAndSetEventType = async (targetDate) => {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('date', targetDate);

    if (events && events.length > 0) {
      const hasValidAM = events.some(event => event.event_type === 'am');
      const hasValidPM = events.some(event => event.event_type === 'pm');
      const hasValidEvent = events.some(event => event.event_type === 'event');

      setAvailableEvents({
        am: hasValidAM,
        pm: hasValidPM,
        event: hasValidEvent
      });

      // 현재 선택된 timeOfDay가 유효하지 않은 경우에만 다른 타입으로 변경
      const currentTimeOfDay = timeOfDay;
      let newTimeOfDay = currentTimeOfDay;

      if (!events.some(event => event.event_type === currentTimeOfDay)) {
        if (hasValidAM) newTimeOfDay = 'am';
        else if (hasValidPM) newTimeOfDay = 'pm';
        else if (hasValidEvent) newTimeOfDay = 'event';
      }

      setTimeOfDay(newTimeOfDay);
      setHasEvents(hasValidAM || hasValidPM || hasValidEvent);
    } else {
      setAvailableEvents({
        am: false,
        pm: false,
        event: false
      });
      setTimeOfDay('');
      setHasEvents(false);
    }
  };

  // syncMembers 함수 수정
  const syncMembers = async () => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const eventType = timeOfDay;

    try {
      // 1. 현재 활동 중인 멤버 목록 가져오기
      const { data: membersData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .lte('join_date', formattedDate)
        .or(`out_date.gt.${formattedDate},out_date.is.null`);

      if (memberError) {
        console.error('멤버 데이터 조회 실패:', memberError);
        alert('멤버 데이터를 가져오는데 실패했습니다.');
        return;
      }

      // 커스텀 순서로 정렬
      const activeMembers = membersData.sort((a, b) => {
        const groupIndexA = groups.indexOf(a.group);
        const groupIndexB = groups.indexOf(b.group);
        
        if (groupIndexA !== groupIndexB) {
          return groupIndexA - groupIndexB;
        }
        
        return a.name.localeCompare(b.name, 'ko');
      });

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

      // 3. 현재 출석부 데이터 처리
      const currentAttendanceData = typeof currentAttendance.attendance_data === 'string'
        ? JSON.parse(currentAttendance.attendance_data)
        : currentAttendance.attendance_data;

      if (!currentAttendanceData || !currentAttendanceData.list) {
        console.log('출석부 데이터가 올바르지 않아 새로 생성합니다.');
        await insertDefaultAttendanceData();
        return;
      }

      // 4. 변경사항 확인
      let changes = {
        added: [],
        updated: [],
        removed: []
      };

      // 활성 멤버 ID 맵 생성
      const activeMemberMap = new Map(
        activeMembers
          .filter(member => isDateInRange(formattedDate, member.join_date, member.out_date))
          .map(member => [member.id, member])
      );

      // 현재 출석부 멤버 ID 맵 생성
      const currentMemberMap = new Map(
        currentAttendanceData.list.map(member => [member.id, member])
      );

      // 4.1 새로 추가되거나 그룹/태그가 변경된 멤버 확인
      activeMemberMap.forEach((activeMember, id) => {
        const currentMember = currentMemberMap.get(id);
        if (!currentMember) {
          // 새로운 멤버
          changes.added.push(activeMember);
        } else if (
          currentMember.group !== activeMember.group ||
          JSON.stringify(currentMember.tags || []) !== JSON.stringify(activeMember.tags || [])
        ) {
          // 그룹이나 태그가 변경된 멤버
          changes.updated.push(activeMember);
        }
      });

      // 4.2 제거된 멤버 확인 (더 이상 활동하지 않는 멤버)
      currentMemberMap.forEach((currentMember, id) => {
        if (!activeMemberMap.has(id)) {
          changes.removed.push(currentMember);
        }
      });

      // 변경사항이 없는 경우
      if (changes.added.length === 0 && changes.updated.length === 0 && changes.removed.length === 0) {
        alert('변경사항이 없습니다.');
        return;
      }

      // 5. 출석부 리스트 업데이트
      let updatedList = [...currentAttendanceData.list];

      // 5.1 새로운 멤버 추가
      changes.added.forEach(member => {
        updatedList.push({
          id: member.id,
          name: member.name,
          group: member.group,
          tags: member.tags || [],
          status: 'present',
          reason: '',
        });
      });

      // 5.2 그룹과 태그 정보 업데이트
      changes.updated.forEach(member => {
        updatedList = updatedList.map(item =>
          item.id === member.id
            ? { 
                ...item, 
                group: member.group,
                tags: member.tags || []
              }
            : item
        );
      });

      // 5.3 비활성 멤버 제거
      updatedList = updatedList.filter(member => !changes.removed.some(rm => rm.id === member.id));

      // 6. 통계 업데이트
      const updatedAttendanceData = {
        ...currentAttendanceData,
        list: updatedList,
        attendance: updatedList.filter(item => item.status === 'present').length,
        absent: updatedList.filter(item => item.status === 'absent').length,
        excused: updatedList.filter(item => item.status === 'excused').length,
      };

      // 7. 데이터베이스 업데이트
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

      // 8. 상태 업데이트 및 결과 알림
      setAttendance(updatedAttendanceData);
      alert(
        `멤버 최신화가 완료되었습니다.\n` +
        `- 추가된 멤버: ${changes.added.length}명\n` +
        `- 그룹/태그 변경: ${changes.updated.length}명\n` +
        `- 제거된 멤버: ${changes.removed.length}명`
      );

    } catch (error) {
      console.error('멤버 최신화 중 오류 발생:', error);
      alert('멤버 최신화 중 오류가 발생했습니다.');
    }
  };

  // 오전 출석 반영 함수
  const applyMorningAttendance = async () => {
    const formattedDate = new Date(date).toISOString().split('T')[0];

    try {
      // 같은 날짜의 오전 출석 데이터 가져오기
      const { data: morningData, error: morningError } = await supabase
        .from('events')
        .select('*')
        .eq('date', formattedDate)
        .eq('event_type', 'am')
        .single();

      if (morningError || !morningData) {
        alert('해당 날짜에 오전 출석 데이터가 없습니다.');
        return;
      }

      if (!morningData.attendance_data || !morningData.attendance_data.list) {
        alert('오전 출석 데이터가 비어있습니다.');
        return;
      }

      // 현재 오후 출석 데이터 업데이트
      const updatedList = attendance.list.map((pmMember) => {
        // 오전 데이터에서 같은 멤버 찾기
        const amMember = morningData.attendance_data.list.find(
          (am) => am.id === pmMember.id
        );

        if (amMember) {
          return {
            ...pmMember,
            status: amMember.status,
            reason: amMember.reason || ''
          };
        }
        return pmMember;
      });

      const updatedAttendance = {
        ...attendance,
        list: updatedList,
        attendance: updatedList.filter((item) => item.status === 'present').length,
        absent: updatedList.filter((item) => item.status === 'absent').length,
        excused: updatedList.filter((item) => item.status === 'excused').length,
      };

      setAttendance(updatedAttendance);

      // changes에 추가
      const newChanges = {};
      updatedList.forEach(member => {
        const amMember = morningData.attendance_data.list.find(am => am.id === member.id);
        if (amMember) {
          newChanges[member.id] = {
            id: member.id,
            status: amMember.status,
            reason: amMember.reason || ''
          };
        }
      });

      setChanges((prev) => ({
        ...prev,
        ...newChanges,
      }));

      alert('오전 출석 데이터가 반영되었습니다. "변경사항 저장" 버튼을 눌러주세요.');
    } catch (error) {
      console.error('오전 출석 반영 중 오류:', error);
      alert('오전 출석 데이터 반영 중 오류가 발생했습니다.');
    }
  };

  // 결석/공결 리스트를 가져오는 함수
  const getAbsentList = (status) => {
    return filteredMembers
      .filter(member => member.status === status)
      .map(member => ({
        name: member.name,
        group: member.group,
        reason: member.reason || '(사유 미기재)'
      }));
  };

  // 모달 컴포넌트
  const AttendanceModal = ({ isOpen, onClose, title, list, titleColor }) => {
    if (!isOpen) return null;

    const handleBackgroundClick = (e) => {
      // 배경 클릭 시에만 모달 닫기 (모달 내부 클릭 시 닫히지 않도록)
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleBackgroundClick}  // 배경 클릭 이벤트 추가
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className={`text-lg font-semibold ${titleColor}`}>{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {list.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">이름</th>
                    <th className="text-left py-2">소속</th>
                    <th className="text-left py-2">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2">{getGroupDisplayName(item.group)}</td>
                      <td className="py-2">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 py-4">해당하는 인원이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 멤버 수 계산 함수 추가
  const getMemberCountByGroup = (group) => {
    if (group === 'all') {
      return filteredMembers.length;
    }
    return filteredMembers.filter(member => member.group === group).length;
  };

  const getMemberCountByTag = (tag) => {
    if (tag === 'all') {
      return filteredMembers.length;
    }
    return filteredMembers.filter(member => member.tags?.includes(tag)).length;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center pt-4 pb-6 sm:pb-6">
      <h1 className="text-lg sm:text-xl font-bold text-gray-800">전주교회 찬양대</h1>
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
                <span className="text-gray-600"> ({new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' })})</span>
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
                  className={`px-3 py-1 text-xs font-semibold rounded-l-md ${
                    timeOfDay === 'am'
                      ? 'bg-black text-white'
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
                  className={`px-3 py-1 text-xs font-semibold ${
                    timeOfDay === 'pm'
                      ? 'bg-black text-white'
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
                  className={`px-3 py-1 text-xs font-semibold rounded-r-md ${
                    timeOfDay === 'event'
                      ? 'bg-black text-white'
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
                className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-black hover:bg-gray-800 focus:ring-2 transition-colors"
              >
                조회
              </button>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={syncMembers}
              className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-black hover:bg-gray-800 transition-colors"
            >
              멤버 동기화
            </button>

            {timeOfDay === 'pm' && (
              <button
                onClick={applyMorningAttendance}
                className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-black hover:bg-gray-800 transition-colors"
              >
                오전 출석 반영
              </button>
            )}

            {Object.keys(changes).length > 0 && (
              <button
                onClick={handleBulkUpdate}
                disabled={isUpdating}
                className={`px-4 py-2 rounded-lg text-sm sm:text-base font-semibold text-white 
                  ${isUpdating 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-[#2cb67d] hover:bg-[#2cb67d] focus:ring-2 focus:ring-blue-300'
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
            {/* 통합 통계 섹션 */}
            <div className="bg-white rounded-lg shadow-md p-3 mb-2">
              {/* 상단 통계 */}
              <div className="grid grid-cols-4 gap-0">
                <div className="p-1 sm:p-2">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-1 sm:mb-2">
                    {groupFilter === 'all' ? '전체' : groupFilter}
                  </h3>
                  <p className="text-xl sm:text-2xl font-bold text-black">
                    {filteredMembers.length}명
                  </p>
                </div>
                <div className="p-1 sm:p-2">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-700 sm:mb-1">출석</h3>
                  <p className="text-xs text-gray-400">연습 일정 참석</p>
                  <div className="flex flex-col">
                    <p className="text-xl sm:text-2xl font-bold text-[#2cb67d] mb-1">
                      {filteredMembers.filter(item => item.status === 'present').length}명
                    </p>
                    <p className="text-xs sm:text-sm text-[#2cb67d]">
                      ({calculateStats(filteredMembers).presentRate}%)
                    </p>
                  </div>
                </div>
                <div 
                  className="p-1 sm:p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setShowAbsentModal(true)}
                >
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-700 sm:mb-1">결석</h3>
                  <p className="text-xs text-gray-400">무단으로 결석</p>
                  <div className="flex flex-col">
                    <p className="text-xl sm:text-2xl font-bold text-[#ff4f5e] mb-1">
                      {filteredMembers.filter(item => item.status === 'absent').length}명
                    </p>
                    <p className="text-xs sm:text-sm text-[#ff4f5e]">
                      ({calculateStats(filteredMembers).absentRate}%)
                    </p>
                  </div>
                </div>
                <div 
                  className="p-1 sm:p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setShowExcusedModal(true)}
                >
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-700 sm:mb-1">공결</h3>
                  <p className="text-xs text-gray-400">합당한 결석사유 알림</p>  
                  <div className="flex flex-col">
                    <p className="text-xl sm:text-2xl font-bold text-[#f5b841] mb-1">
                      {filteredMembers.filter(item => item.status === 'excused').length}명
                    </p>
                    <p className="text-xs sm:text-sm text-[#f5b841]">
                      ({calculateStats(filteredMembers).excusedRate}%)
                    </p>
                  </div>
                </div>
              </div>


              {/* 그룹별 통계 (전체 필터 시) */}
              {groupFilter === 'all' && tagFilter === 'all' && (
                <div className="mt-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setIsGroupStatsOpen(!isGroupStatsOpen)}
                    className="w-full flex justify-between items-center font-semibold text-gray-700 mb-4 focus:outline-none"
                  >
                    <div><span className="text-sm sm:text-base">그룹별 통계</span><span className="text-xs text-gray-500 ml-2">({date} ({new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' })}) {timeOfDay === 'am' ? '오전' : timeOfDay === 'pm' ? '오후' : '행사'})</span></div>
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
                            <th scope="col" className="px-3 py-2 text-center text-xs sm:text-sm font-medium text-[#2cb67d]">
                              출석
                            </th>
                            <th scope="col" className="px-3 py-2 text-center text-xs sm:text-sm font-medium text-[#ff4f5e]">
                              결석
                            </th>
                            <th scope="col" className="px-3 py-2 text-center text-xs sm:text-sm font-medium text-[#f5b841]">
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
                                  {getGroupDisplayName(group)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-center text-gray-900">
                                  {stats.total}명
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-center">
                                  <div className="text-[#2cb67d]">{stats.present}명</div>
                                  <div className="text-[#2cb67d] text-xs">({stats.presentRate}%)</div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-center">
                                  <div className="text-[#ff4f5e]">{stats.absent}명</div>
                                  <div className="text-[#ff4f5e] text-xs">({stats.absentRate}%)</div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-center">
                                  <div className="text-[#f5b841]">{stats.excused}명</div>
                                  <div className="text-[#f5b841] text-xs">({stats.excusedRate}%)</div>
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
            </div>

            <div className="flex flex-col space-y-2 my-4">
              <div>
                <div className="flex flex-wrap gap-1.5 items-center border-b border-gray-200 pb-2">
                <h3 className="text-xs font-semibold text-gray-600 mr-2">그룹 필터</h3>
                  <button
                    onClick={() => handleGroupFilterChange('all')}
                    className={`px-2.5 py-1 text-xs rounded-md flex items-center transition-colors ${
                      groupFilter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    <span>전체</span>
                    <span className="ml-1.5 bg-white bg-opacity-25 px-1.5 py-0.5 rounded text-[10px] hidden sm:block">
                      {getMemberCountByGroup('all')}
                    </span>
                  </button>
                  {groups.map((group) => (
                    <button
                      key={group}
                      onClick={() => handleGroupFilterChange(group)}
                      className={`px-2.5 py-1 text-xs rounded-md flex items-center transition-colors ${
                        groupFilter === group
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      <span>{getShortName(group)}</span>
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] hidden sm:block ${
                        groupFilter === group
                          ? 'bg-white bg-opacity-25'
                          : 'bg-white'
                      }`}>
                        {getMemberCountByGroup(group)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                
                <div className="flex flex-wrap gap-1.5 items-center">
                <h3 className="text-xs font-semibold text-gray-600 mr-2">태그 필터</h3>
                  <button
                    onClick={() => handleTagFilterChange('all')}
                    className={`px-2.5 py-1 text-xs rounded-md flex items-center transition-colors ${
                      tagFilter === 'all'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    <span>전체</span>
                    <span className="ml-1.5 bg-white bg-opacity-25 px-1.5 py-0.5 rounded text-[10px] hidden sm:block">
                      {getMemberCountByTag('all')}
                    </span>
                  </button>
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagFilterChange(tag)}
                      className={`px-2.5 py-1 text-xs rounded-md flex items-center transition-colors ${
                        tagFilter === tag
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      <span>{getShortName(tag)}</span>
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] hidden sm:block ${
                        tagFilter === tag
                          ? 'bg-white bg-opacity-25'
                          : 'bg-white'
                      }`}>
                        {getMemberCountByTag(tag)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table-auto w-full bg-white shadow-md rounded-lg overflow-hidden text-center text-sm sm:text-base">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap">이름</th>
                    <th className={`${groupFilter !== 'all' || tagFilter !== 'all' ? 'hidden sm:table-cell' : ''} px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap`}>소속/태그</th>
                    <th className="px-2 py-1 sm:px-4 sm:py-2">출결</th>
                    <th className="px-2 py-1 sm:px-4 sm:py-2">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-100">
                      <td className="px-4 py-2 whitespace-nowrap">{member.name}</td>
                      <td className={`${groupFilter !== 'all' || tagFilter !== 'all' ? 'hidden sm:table-cell' : ''} px-4 py-2 whitespace-nowrap`}>
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {getShortName(member.group)}
                          </span>
                          {member.tags && member.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full"
                            >
                              {getShortName(tag)}
                            </span>
                          ))}
                        </div>
                      </td>
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
                                    ? 'bg-[#2cb67d] text-white focus:ring-[#2cb67d]'
                                    : status === 'absent'
                                    ? 'bg-[#ff4f5e] text-white focus:ring-[#ff4f5e]'
                                    : 'bg-[#f5b841] text-white focus:ring-[#f5b841]'
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

            {Object.keys(changes).length > 0 && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleBulkUpdate}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded-lg text-sm sm:text-base font-semibold text-white 
                    ${isUpdating 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#2cb67d] hover:bg-[#2cb67d] focus:ring-2 focus:ring-blue-300'
                    } transition-colors`}
                >
                  {isUpdating ? '업데이트 중...' : '변경사항 저장'}
                </button>
              </div>
            )}

            {/* 하단 문구 */}
            <div className="mt-8 text-center text-gray-400 text-xs">
              JJCHCHOIR <span 
                onClick={handleMarkAllAsPresent}
                className="cursor-pointer"
                style={{ userSelect: 'none' }}
              >
                Att
              </span>endance Manager
            </div>
          </>
        )}
      </div>

      {/* 모달 컴포넌트 추가 */}
      <AttendanceModal
        isOpen={showAbsentModal}
        onClose={() => setShowAbsentModal(false)}
        title="결석자 명단"
        list={getAbsentList('absent')}
        titleColor="text-red-600"
      />
      
      <AttendanceModal
        isOpen={showExcusedModal}
        onClose={() => setShowExcusedModal(false)}
        title="공결자 명단"
        list={getAbsentList('excused')}
        titleColor="text-yellow-600"
      />
    </div>
  );
};

export default AttendanceManagement;
