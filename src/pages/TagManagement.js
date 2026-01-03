import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const TagManagement = () => {
  const [tags, setTags] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState(null);
  const [editTagName, setEditTagName] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newTagAbbreviation, setNewTagAbbreviation] = useState('');
  const [editTagAbbreviation, setEditTagAbbreviation] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      return;
    }

    setTags(data);
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      alert('태그 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ 
          name: newTagName.trim(),
          abbreviation: newTagAbbreviation.trim() || null
        }])
        .select();

      if (error) throw error;

      setTags([...tags, data[0]]);
      setIsAddModalOpen(false);
      setNewTagName('');
      setNewTagAbbreviation('');
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('태그 추가 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTag = async () => {
    if (!editTagName.trim()) {
      alert('태그 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tags')
        .update({ 
          name: editTagName.trim(),
          abbreviation: editTagAbbreviation.trim() || null
        })
        .eq('id', editingTag.id);

      if (error) throw error;

      setTags(tags.map(tag => 
        tag.id === editingTag.id 
          ? { ...tag, name: editTagName.trim(), abbreviation: editTagAbbreviation.trim() || null }
          : tag
      ));
      setIsEditModalOpen(false);
      setEditingTag(null);
      setEditTagName('');
      setEditTagAbbreviation('');
    } catch (error) {
      console.error('Error editing tag:', error);
      alert('태그 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTag = async () => {
    if (deleteConfirmName !== editingTag.name) {
      alert('태그 이름이 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', editingTag.id);

      if (error) throw error;

      setTags(tags.filter(tag => tag.id !== editingTag.id));
      setIsDeleteModalOpen(false);
      setDeleteConfirmName('');
      setEditingTag(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('태그 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-4xl mx-auto">
        {/* 경고 메시지 */}
        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>주의:</strong> 관리자 외에 태그를 추가/수정/삭제하지 마세요. 태그 변경은 모든 멤버와 출석 데이터에 영향을 미칩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">태그 관리</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-opacity-50 cursor-pointer"
          >
            태그 추가
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="w-full text-center">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 py-3">태그 이름</th>
                <th className="px-4 py-3">약어</th>
                <th className="px-4 py-3">생성일</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody>
              {tags.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-gray-500">
                    등록된 태그가 없습니다.
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{tag.name}</td>
                    <td className="px-4 py-3">{tag.abbreviation || '-'}</td>
                    <td className="px-4 py-3">
                      {new Date(tag.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setEditingTag(tag);
                          setEditTagName(tag.name);
                          setEditTagAbbreviation(tag.abbreviation || '');
                          setIsEditModalOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 mr-4"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          setEditingTag(tag);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 태그 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">새 태그 추가</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그 이름
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="태그 이름을 입력하세요"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleAddTag();
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  약어 (선택사항)
                </label>
                <input
                  type="text"
                  value={newTagAbbreviation}
                  onChange={(e) => setNewTagAbbreviation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="출석부에 표시될 약어"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleAddTag();
                    }
                  }}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewTagName('');
                  setNewTagAbbreviation('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleAddTag}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg cursor-pointer ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isLoading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 태그 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">태그 수정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그 이름
                </label>
                <input
                  type="text"
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="태그 이름을 입력하세요"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleEditTag();
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  약어 (선택사항)
                </label>
                <input
                  type="text"
                  value={editTagAbbreviation}
                  onChange={(e) => setEditTagAbbreviation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                  placeholder="출석부에 표시될 약어"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleEditTag();
                    }
                  }}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTag(null);
                  setEditTagName('');
                  setEditTagAbbreviation('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleEditTag}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg cursor-pointer ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isLoading ? '수정 중...' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 태그 삭제 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">태그 삭제</h2>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-600 text-sm">
                  주의: 이 작업은 되돌릴 수 없습니다.
                  <br />
                  이 태그를 사용하는 모든 멤버에서 태그가 제거됩니다.
                  <br />
                  삭제를 확인하려면 아래에 "{editingTag?.name}" 을 입력하세요.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그 이름 확인
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-red-300"
                  placeholder="태그 이름을 입력하세요"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isLoading && deleteConfirmName === editingTag?.name) {
                      handleDeleteTag();
                    }
                  }}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmName('');
                  setEditingTag(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleDeleteTag}
                disabled={isLoading || deleteConfirmName !== editingTag?.name}
                className={`px-4 py-2 rounded-lg cursor-pointer ${
                  isLoading || deleteConfirmName !== editingTag?.name
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManagement;

