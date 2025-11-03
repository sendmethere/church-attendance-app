import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

function Events() {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    event_type: 'event' // 기본값을 'event'로 설정
  });
  const [attendanceCounts, setAttendanceCounts] = useState({});
  const [showTable, setShowTable] = useState(false); // 테이블 표시 여부를 위한 state 추가

  // 사용 가능한 연도 목록 가져오기
  const fetchAvailableYears = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('date');
      
      if (error) throw error;

      const years = [...new Set(data.map(event => 
        new Date(event.date).getFullYear()
      ))].sort((a, b) => b - a); // 내림차순 정렬

      // 현재 연도가 목록에 없다면 추가
      const currentYear = new Date().getFullYear();
      if (!years.includes(currentYear)) {
        years.unshift(currentYear);
      }

      setAvailableYears(years);
    } catch (error) {
      console.error('Error fetching years:', error.message);
    }
  };

  // 각 이벤트의 출석 정보 조회
  const fetchAttendanceCounts = async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('attendance_data')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      // attendance_data가 null이거나 정의되지 않은 경우 기본값 반환
      if (!data.attendance_data) {
        return { present: 0, absent: 0, excused: 0 };
      }

      return {
        present: data.attendance_data.attendance || 0,
        absent: data.attendance_data.absent || 0,
        excused: data.attendance_data.excused || 0
      };
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return { present: 0, absent: 0, excused: 0 };
    }
  };

  // 이벤트 목록 조회
  const fetchEvents = async () => {
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })  // 먼저 날짜로 정렬
        .order('event_type', { ascending: true }); // 그 다음 이벤트 타입으로 정렬

      if (error) throw error;

      // event_type에 따른 정렬 우선순위 설정
      const eventTypeOrder = {
        'am': 0,    // 오전연습이 가장 먼저
        'pm': 1,    // 그 다음 오후연습
        'event': 2  // 마지막으로 행사
      };

      // 날짜가 같은 경우 event_type으로 정렬
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        if (dateA === dateB) {
          return eventTypeOrder[a.event_type] - eventTypeOrder[b.event_type];
        }
        return dateA - dateB;
      });

      // 각 이벤트의 출석 정보 조회
      const countsPromises = sortedData.map(async (event) => {
        const counts = await fetchAttendanceCounts(event.id);
        return [event.id, counts];
      });

      const countsEntries = await Promise.all(countsPromises);
      const newAttendanceCounts = Object.fromEntries(countsEntries);
      
      setAttendanceCounts(newAttendanceCounts);
      setEvents(sortedData);
    } catch (error) {
      console.error('Error fetching events:', error.message);
    }
  };

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [selectedYear]); // selectedYear가 변경될 때마다 이벤트 다시 불러오기

  // 이벤트 생성
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const formattedDate = new Date(formData.date).toISOString();
      
      // 현재 최대 ID 값을 조회
      const { data: maxIdData, error: maxIdError } = await supabase
        .from('events')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      if (maxIdError) throw maxIdError;

      // 새로운 ID 생성 (현재 최대값 + 1)
      const newId = maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;
      
      const { error } = await supabase
        .from('events')
        .insert({
          id: newId,
          name: formData.name.trim(),
          date: formattedDate,
          event_type: formData.event_type
        });

      if (error) {
        throw error;
      }
      
      await fetchEvents();
      await fetchAvailableYears();
      setIsModalOpen(false);
      setFormData({ name: '', date: '', event_type: 'event' });
    } catch (error) {
      console.error('Error creating event:', error);
      alert(error.message || '이벤트 생성 중 오류가 발생했습니다.');
    }
  };

  // 이벤트 수정
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ 
          name: formData.name,
          date: formData.date,
          event_type: formData.event_type
        })
        .eq('id', editingEvent.id)
        .select();

      if (error) throw error;
      
      await fetchEvents();
      setIsModalOpen(false);
      setEditingEvent(null);
      setFormData({ name: '', date: '', event_type: 'event' });
    } catch (error) {
      console.error('Error updating event:', error.message);
      alert('이벤트 수정 중 오류가 발생했습니다.');
    }
  };

  // 이벤트 삭제
  const handleDelete = async (id) => {
    if (window.confirm('정말로 이 이벤트를 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error.message);
        alert('이벤트 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 출석 데이터 초기화 함수
  const handleResetAttendance = async (eventId) => {
    if (window.confirm('정말로 이 이벤트의 출석 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      try {
        const { error } = await supabase
          .from('events')
          .update({ 
            attendance_data: null  // attendance_data를 null로 설정
          })
          .eq('id', eventId);

        if (error) throw error;
        
        await fetchEvents();
        alert('출석 데이터가 초기화되었습니다.');
      } catch (error) {
        console.error('Error resetting attendance:', error);
        alert('출석 데이터 초기화 중 오류가 발생했습니다.');
      }
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      date: event.date.split('T')[0],
      event_type: event.event_type
    });
    setIsModalOpen(true);
  };

  // 이벤트 타입에 따른 배경색 반환
  const getEventTypeColor = (type) => {
    switch (type) {
      case 'am':
        return 'bg-yellow-100';
      case 'pm':
        return 'bg-blue-100';
      case 'event':
        return 'bg-green-100';
      default:
        return 'bg-gray-100';
    }
  };

  // 이벤트 타입에 따른 한글 텍스트 반환
  const getEventTypeText = (type) => {
    switch (type) {
      case 'am':
        return '오전연습';
      case 'pm':
        return '오후연습';
      case 'event':
        return '행사';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 sm:py-10">
      <div className="w-full max-w-4xl px-2 sm:px-4">
        {/* 경고 메시지 박스 추가 */}
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* 경고 아이콘 색상도 빨간색으로 변경 */}
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                관리자 외에 일정을 추가/삭제하거나 초기화하지 마세요.
              </p>
            </div>
          </div>
        </div>

        {/* 일정 열람하기 버튼 */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowTable(!showTable)}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
          >
            {showTable ? '일정 숨기기' : '일정 열람하기'}
          </button>
        </div>

        {/* 테이블 섹션 */}
        {showTable && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">이벤트 관리</h1>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setFormData({ name: '', date: `${selectedYear}-01-01` });
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                >
                  새 이벤트 추가
                </button>
              </div>
            </div>

            {/* 이벤트 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-sm sm:text-base">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="px-2 py-2 sm:px-4 text-left">이름</th>
                    <th className="px-2 py-2 sm:px-4 text-left">날짜</th>
                    <th className="px-2 py-2 sm:px-4 text-left">타입</th>
                    <th className="px-2 py-2 sm:px-4 text-center">출</th>
                    <th className="px-2 py-2 sm:px-4 text-center">결</th>
                    <th className="px-2 py-2 sm:px-4 text-center">공</th>
                    <th className="px-2 py-2 sm:px-4 text-left">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length > 0 ? (
                    events.map((event, index) => {
                      const currentMonth = new Date(event.date).getMonth() + 1;
                      const previousMonth = index > 0 ? new Date(events[index - 1].date).getMonth() + 1 : null;
                      const showMonthHeader = index === 0 || currentMonth !== previousMonth;

                      return (
                        <React.Fragment key={event.id}>
                          {showMonthHeader && (
                            <tr className="bg-gray-100">
                              <td colSpan="7" className="px-2 py-2 sm:px-4 font-bold text-gray-700">
                                {currentMonth}월
                              </td>
                            </tr>
                          )}
                          <tr className="border-b hover:bg-gray-100">
                            <td className="px-2 py-2 sm:px-4">{event.name}</td>
                            <td className="px-2 py-2 sm:px-4">
                              {new Date(event.date).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                              })}
                            </td>
                            <td className="px-2 py-2 sm:px-4">
                              <span className={`px-2 py-1 rounded-full text-sm ${getEventTypeColor(event.event_type)}`}>
                                {getEventTypeText(event.event_type)}
                              </span>
                            </td>
                            <td className="px-2 py-2 sm:px-4 text-center">
                              {attendanceCounts[event.id]?.present || 0}
                            </td>
                            <td className="px-2 py-2 sm:px-4 text-center">
                              {attendanceCounts[event.id]?.absent || 0}
                            </td>
                            <td className="px-2 py-2 sm:px-4 text-center">
                              {attendanceCounts[event.id]?.excused || 0}
                            </td>
                            <td className="px-2 py-2 sm:px-4">
                              <button
                                onClick={() => handleEdit(event)}
                                className="text-[#2cb67d] hover:text-[#ffd700] mr-2"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="text-[#ff4f5e] mr-2"
                              >
                                삭제
                              </button>
                              <button
                                onClick={() => handleResetAttendance(event.id)}
                                className="text-[#f5b841] hover:text-[#ffd700]"
                              >
                                초기화
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-2 py-4 sm:px-4 text-center text-gray-500">
                        {selectedYear}년에 등록된 이벤트가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingEvent ? '이벤트 수정' : '새 이벤트 추가'}
            </h2>
            <form onSubmit={editingEvent ? handleUpdate : handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이벤트 이름
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    날짜
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이벤트 타입
                  </label>
                  <div className="flex space-x-2">
                    {[
                      { value: 'am', label: '오전연습' },
                      { value: 'pm', label: '오후연습' },
                      { value: 'event', label: '행사' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, event_type: type.value })}
                        className={`flex-1 px-3 py-2 rounded-lg border transition-colors
                          ${formData.event_type === type.value 
                            ? 'bg-blue-500 text-white border-blue-500' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                    setFormData({ name: '', date: '', event_type: 'event' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  {editingEvent ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Events;
