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
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data);
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
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              새 이벤트 추가
            </button>
          </div>
        </div>

        {/* 이벤트 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-sm sm:text-base">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="px-2 py-2 sm:px-4 text-left">이름</th>
                <th className="px-2 py-2 sm:px-4 text-left">날짜</th>
                <th className="px-2 py-2 sm:px-4 text-left">타입</th>
                <th className="px-2 py-2 sm:px-4 text-left">작업</th>
              </tr>
            </thead>
            <tbody>
              {events.length > 0 ? (
                events.map((event) => (
                  <tr key={event.id} className="border-b hover:bg-gray-100">
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
                    <td className="px-2 py-2 sm:px-4">
                      <button
                        onClick={() => handleEdit(event)}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-2 py-4 sm:px-4 text-center text-gray-500">
                    {selectedYear}년에 등록된 이벤트가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
