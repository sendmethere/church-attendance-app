import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const MemberManagement = () => {
  const [members, setMembers] = useState([]);
  const [groupFilter, setGroupFilter] = useState(() => 
    localStorage.getItem('selectedMemberGroup') || 'all'
  );
  const [tagFilter, setTagFilter] = useState(() => 
    localStorage.getItem('selectedMemberTag') || 'all'
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
    join_date: new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      .toISOString()
      .split('T')[0],
    out_date: '2099-12-31',
    group: '소프라노',
    tags: []
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTags, setEditingTags] = useState([]);

  const groups = ['소프라노', '알토', '테너', '베이스', '기악부', '기타'];
  const tags = ['중창A', '중창B', '중창C', '엘벧엘'];

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

  const handleTagFilterChange = (tag) => {
    setTagFilter(tag);
    localStorage.setItem('selectedMemberTag', tag);
  };

  const isActiveMember = (member) => {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      .toISOString()
      .split('T')[0];
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

  const getMemberCountByTag = (tag) => {
    const activeMembers = members.filter(isActiveMember);
    
    if (tag === 'all') {
      return activeMembers.length;
    }
    return activeMembers.filter(member => member.tags?.includes(tag)).length;
  };

  const filteredMembers = members
    .filter((member) => showInactive ? true : isActiveMember(member))
    .filter((member) => groupFilter === 'all' || member.group === groupFilter)
    .filter((member) => tagFilter === 'all' || (member.tags && member.tags.includes(tagFilter)));

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
    } catch (error) {
      console.error('Error updating dates:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditGroup = (member) => {
    setEditingMember(member);
    setEditingGroup(member.group);
    setIsGroupModalOpen(true);
  };

  const handleUpdateGroup = async (member, newGroup) => {
    setIsGroupUpdating(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({ group: newGroup })
        .eq('id', member.id);

      if (error) throw error;

      setMembers(members.map(m => 
        m.id === member.id 
          ? { ...m, group: newGroup }
          : m
      ));
    } catch (error) {
      console.error('Error updating group:', error);
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
          group: newMember.group,
          tags: newMember.tags
        }])
        .select();

      if (error) throw error;

      setMembers([...members, data[0]]);
      setIsAddModalOpen(false);
      setNewMember({
        name: '',
        join_date: new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
          .toISOString()
          .split('T')[0],
        out_date: '2099-12-31',
        group: '소프라노',
        tags: []
      });
    } catch (error) {
      console.error('Error adding member:', error);
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
    } catch (error) {
      console.error('Error deleting member:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateTags = async (member, newTags) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({ tags: newTags })
        .eq('id', member.id);

      if (error) throw error;

      setMembers(members.map(m => 
        m.id === member.id 
          ? { ...m, tags: newTags }
          : m
      ));
    } catch (error) {
      console.error('Error updating tags:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleTag = (member, tag) => {
    const currentTags = member.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    handleUpdateTags(member, newTags);
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
            멤버 수는 오늘 날짜 ({new Date().toLocaleString('ko-KR', { 
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}) 기준으로 나타납니다.
          </span>
        </div>

        <div className="mb-6">
          <div className="flex flex-col space-y-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">그룹 필터</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleGroupFilterChange('all')}
                  className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-md flex items-center ${
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
                    className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-md flex items-center ${
                      groupFilter === group
                        ? 'bg-blue-500 text-white focus:ring focus:ring-blue-300'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    <span>{group}</span>
                    <span className={`ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
                      groupFilter === group
                        ? 'bg-white bg-opacity-20'
                        : 'bg-white bg-opacity-50'
                    }`}>
                      {getMemberCountByGroup(group)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">태그 필터</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTagFilterChange('all')}
                  className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-md flex items-center ${
                    tagFilter === 'all'
                      ? 'bg-purple-500 text-white focus:ring focus:ring-purple-300'
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  }`}
                >
                  <span>전체</span>
                  <span className="ml-1.5 sm:ml-2 bg-white bg-opacity-20 px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                    {getMemberCountByTag('all')}
                  </span>
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagFilterChange(tag)}
                    className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg shadow-md flex items-center ${
                      tagFilter === tag
                        ? 'bg-purple-500 text-white focus:ring focus:ring-purple-300'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    <span>{tag}</span>
                    <span className={`ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
                      tagFilter === tag
                        ? 'bg-white bg-opacity-20'
                        : 'bg-white bg-opacity-50'
                    }`}>
                      {getMemberCountByTag(tag)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-center mb-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="my-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-black text-white text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-black focus:ring-opacity-50"
            >
              멤버 추가
            </button>
          </div>

          </div>

          {/* 멤버 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white shadow-md rounded-lg overflow-hidden text-center text-sm sm:text-base">
              <thead className="bg-black text-white">
                <tr>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">이름</th>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">등록 날짜</th>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">만료 날짜</th>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">그룹</th>
                  <th className="px-2 py-2 sm:px-4 whitespace-nowrap">태그</th>
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
                    <td className="px-2 py-2 sm:px-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {groups.map(group => (
                          <button
                            key={group}
                            onClick={() => handleUpdateGroup(member, group)}
                            disabled={isGroupUpdating}
                            className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                              member.group === group
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                            }`}
                          >
                            {group}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td 
                      className="px-2 py-2 sm:px-4 cursor-pointer whitespace-nowrap"
                    >
                      <div className="flex flex-wrap gap-1">
                        {tags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(member, tag)}
                            disabled={isUpdating}
                            className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                              member.tags?.includes(tag)
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
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
          <div className="flex flex-col sm:flex-row justify-end items-center mb-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="my-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-black text-white text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-black focus:ring-opacity-50"
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
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <button
                      key={group}
                      onClick={() => setNewMember(prev => ({ ...prev, group }))}
                      className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                        newMember.group === group
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = newMember.tags || [];
                        const newTags = currentTags.includes(tag)
                          ? currentTags.filter(t => t !== tag)
                          : [...currentTags, tag];
                        setNewMember(prev => ({ ...prev, tags: newTags }));
                      }}
                      className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                        newMember.tags?.includes(tag)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
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
