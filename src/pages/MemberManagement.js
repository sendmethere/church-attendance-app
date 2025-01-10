import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const MemberManagement = () => {
  const [members, setMembers] = useState([]);
  const [groupFilter, setGroupFilter] = useState(() => 
    localStorage.getItem('selectedMemberGroup') || 'all'
  );
  const [showInactive, setShowInactive] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDate, setEditDate] = useState({ join_date: '', out_date: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState('');
  const [isGroupUpdating, setIsGroupUpdating] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    join_date: new Date().toISOString().split('T')[0],
    out_date: '',
    group: '소프라노'
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const groups = ['소프라노', '알토', '테너', '베이스', '기악부', '피아노', '기타'];

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('group')
      .order('name');

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    setMembers(data);
  };

  const handleGroupFilterChange = (group) => {
    setGroupFilter(group);
    localStorage.setItem('selectedMemberGroup', group);
  };

  const isActiveMember = (member) => {
    const today = new Date().toISOString().split('T')[0];
    const joinDate = member.join_date;
    const outDate = member.out_date;

    if (joinDate > today) return false;
    if (outDate && outDate < today) return false;
    
    return true;
  };

  const getMemberCountByGroup = (group) => {
    const activeMembers = members.filter(isActiveMember);
    
    if (group === 'all') {
      return activeMembers.length;
    }
    return activeMembers.filter(member => member.group === group).length;
  };

  const filteredMembers = members
    .filter((member) => showInactive ? true : isActiveMember(member))
    .filter((member) => groupFilter === 'all' || member.group === groupFilter);

  const handleEditDates = (member) => {
    setEditingMember(member);
    setEditDate({
      join_date: member.join_date,
      out_date: member.out_date || ''
    });
    setIsModalOpen(true);
  };

  const handleUpdateDates = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({
          join_date: editDate.join_date,
          out_date: editDate.out_date || null
        })
        .eq('id', editingMember.id);

      if (error) throw error;

      setMembers(members.map(member => 
        member.id === editingMember.id 
          ? { ...member, ...editDate }
          : member
      ));

      setIsModalOpen(false);
      alert('날짜가 성공적으로 업데이트되었습니다.');
    } catch (error) {
      console.error('Error updating dates:', error);
      alert('날짜 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditGroup = (member) => {
    setEditingMember(member);
    setEditingGroup(member.group);
    setIsGroupModalOpen(true);
  };

  const handleUpdateGroup = async () => {
    setIsGroupUpdating(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({ group: editingGroup })
        .eq('id', editingMember.id);

      if (error) throw error;

      setMembers(members.map(member => 
        member.id === editingMember.id 
          ? { ...member, group: editingGroup }
          : member
      ));

      setIsGroupModalOpen(false);
      alert('그룹이 성공적으로 업데이트되었습니다.');
    } catch (error) {
      console.error('Error updating group:', error);
      alert('그룹 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsGroupUpdating(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([{
          name: newMember.name,
          join_date: newMember.join_date,
          out_date: newMember.out_date || null,
          group: newMember.group
        }])
        .select();

      if (error) throw error;

      setMembers([...members, data[0]]);
      setIsAddModalOpen(false);
      setNewMember({
        name: '',
        join_date: new Date().toISOString().split('T')[0],
        out_date: '',
        group: '소프라노'
      });
      alert('멤버가 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('Error adding member:', error);
      alert('멤버 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMember = async () => {
    if (deleteConfirmName !== editingMember.name) {
      alert('멤버 이름이 일치하지 않습니다.');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', editingMember.id);

      if (error) throw error;

      setMembers(members.filter(member => member.id !== editingMember.id));
      setIsDeleteModalOpen(false);
      setDeleteConfirmName('');
      setEditingMember(null);
      alert('멤버가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('멤버 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 sm:py-10">
      <div className="w-full max-w-4xl px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row justify-center items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">찬양대 명부 관리</h1>
        </div>

        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
          <label className="flex items-center space-x-2 text-sm sm:text-base text-gray-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-500 rounded focus:ring-blue-400"
            />
            <span>비활성 멤버 표시</span>
          </label>
          <span className="text-xs sm:text-sm text-gray-600">
            멤버 수는 오늘 날짜({new Date().toISOString().split('T')[0]}) 기준
          </span>
        </div>

        <div className="mb-6">
          {/* 그룹 필터 버튼 */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={() => handleGroupFilterChange('all')}
              className={`px-1 py-1.5 sm:px-2 sm:py-2 text-sm sm:text-base rounded-lg shadow-md flex items-center ${
                groupFilter === 'all'
                  ? 'bg-blue-500 text-white focus:ring focus:ring-blue-300'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              <span>전체</span>
              <span className="ml-1.5 sm:ml-2 bg-white bg-opacity-20 px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                {getMemberCountByGroup('all')}
              </span>
            </button>
            {groups.map((group) => (
              <button
                key={group}
                onClick={() => handleGroupFilterChange(group)}
                className={`px-1 py-1.5 sm:px-3 sm:py-2 text-sm sm:text-base rounded-lg shadow-md flex items-center ${
                  groupFilter === group
                    ? 'bg-blue-500 text-white focus:ring focus:ring-blue-300'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                <span>{group}</span>
                <span className={`ml-1 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
                  groupFilter === group
                    ? 'bg-white bg-opacity-20'
                    : 'bg-white bg-opacity-50'
                }`}>
                  {getMemberCountByGroup(group)}
                </span>
              </button>
            ))}
          </div>

          {/* 멤버 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-center text-sm sm:text-base">
              <thead className="bg-blue-500 text-white">
                <tr>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">이름</th>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">등록 날짜</th>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">만료 날짜</th>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">그룹</th>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    className={`border-b hover:bg-gray-100 ${
                      !isActiveMember(member) ? 'text-gray-500' : ''
                    }`}
                  >
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap">
                      {member.name}
                      {!isActiveMember(member) && (
                        <span className="ml-1 sm:ml-2 text-xs text-red-500">
                          {member.out_date && new Date(member.out_date) < new Date() ? '만료' : '예정'}
                        </span>
                      )}
                    </td>
                    <td 
                      className="px-2 py-2 sm:px-4 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                      onClick={() => handleEditDates(member)}
                    >
                      {member.join_date}
                    </td>
                    <td 
                      className="px-2 py-2 sm:px-4 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                      onClick={() => handleEditDates(member)}
                    >
                      {member.out_date || '-'}
                    </td>
                    <td 
                      className="px-2 py-2 sm:px-4 cursor-pointer whitespace-nowrap"
                      onClick={() => handleEditGroup(member)}
                    >
                      <span className={`px-2 py-1 sm:px-3 rounded-lg text-sm ${
                        groups.includes(member.group)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        {member.group}
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm sm:text-base"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        <div className="flex flex-col sm:flex-row justify-end items-center my-4 space-y-2 sm:space-y-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 text-white text-sm sm:text-base rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            멤버 추가
          </button>
          </div>
        </div>
      </div>

      {/* 날짜 수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm">
            <h2 className="text-xl font-semibold mb-4">
              {editingMember?.name} 날짜 수정
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  등록 날짜
                </label>
                <input
                  type="date"
                  value={editDate.join_date}
                  onChange={(e) => setEditDate(prev => ({ 
                    ...prev, 
                    join_date: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  만료 날짜
                </label>
                <input
                  type="date"
                  value={editDate.out_date}
                  onChange={(e) => setEditDate(prev => ({ 
                    ...prev, 
                    out_date: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleUpdateDates}
                disabled={isUpdating}
                className={`px-4 py-2 rounded-lg ${
                  isUpdating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isUpdating ? '업데이트 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 그룹 수정 모달 */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">
              {editingMember?.name} 그룹 수정
            </h2>
            <div className="space-y-3">
              {groups.map((group) => (
                <label key={group} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                  <input
                    type="radio"
                    name="group"
                    value={group}
                    checked={editingGroup === group}
                    onChange={(e) => setEditingGroup(e.target.value)}
                    className="form-radio h-4 w-4 text-blue-500 focus:ring-blue-400"
                  />
                  <span className="text-gray-700">{group}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={isGroupUpdating || editingGroup === editingMember?.group}
                className={`px-4 py-2 rounded-lg ${
                  isGroupUpdating || editingGroup === editingMember?.group
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isGroupUpdating ? '업데이트 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
        
      )}

      {/* 멤버 추가 모달 추가 (마지막 모달 이후에 추가) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">새 멤버 추가</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  등록 날짜
                </label>
                <input
                  type="date"
                  value={newMember.join_date}
                  onChange={(e) => setNewMember(prev => ({ 
                    ...prev, 
                    join_date: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  만료 날짜
                </label>
                <input
                  type="date"
                  value={newMember.out_date}
                  onChange={(e) => setNewMember(prev => ({ 
                    ...prev, 
                    out_date: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  그룹
                </label>
                <select
                  value={newMember.group}
                  onChange={(e) => setNewMember(prev => ({ 
                    ...prev, 
                    group: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                >
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleAddMember}
                disabled={isAdding}
                className={`px-4 py-2 rounded-lg ${
                  isAdding
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isAdding ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 모달 추가 (마지막 모달 다음에 추가) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">멤버 삭제</h2>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-600 text-sm">
                  주의: 이 작업은 되돌릴 수 없습니다.
                  <br />
                  삭제를 확인하려면 아래에 "{editingMember?.name}" 을 입력하세요.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  멤버 이름 확인
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-red-300"
                  placeholder="멤버 이름을 입력하세요"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={isDeleting || deleteConfirmName !== editingMember?.name}
                className={`px-4 py-2 rounded-lg ${
                  isDeleting || deleteConfirmName !== editingMember?.name
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;
