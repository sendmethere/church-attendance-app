import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { Modal, Button, Form, Input, DatePicker } from 'antd';
import moment from 'moment';

const { TextArea } = Input;

const Notice = () => {
  const [notices, setNotices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_displayed', true)
        .order('date', { ascending: false });

      if (error) throw error;
      setNotices(data);
    } catch (error) {
      console.error('Error fetching notices:', error);
    }
  };

  const handleCreate = async (values) => {
    try {
      const { error } = await supabase
        .from('notices')
        .insert([{
          title: values.title,
          content: values.content,
          date: values.date.format('YYYY-MM-DD'),
          is_displayed: true
        }]);

      if (error) throw error;
      
      await fetchNotices();
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Error creating notice:', error);
    }
  };

  const handleUpdate = async (values) => {
    try {
      const { error } = await supabase
        .from('notices')
        .update({
          title: values.title,
          content: values.content,
          date: values.date.format('YYYY-MM-DD')
        })
        .eq('id', editingNotice.id);

      if (error) throw error;
      
      await fetchNotices();
      setIsModalOpen(false);
      setEditingNotice(null);
      form.resetFields();
    } catch (error) {
      console.error('Error updating notice:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase
          .from('notices')
          .update({ is_displayed: false })
          .eq('id', id);

        if (error) throw error;
        await fetchNotices();
      } catch (error) {
        console.error('Error deleting notice:', error);
      }
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    form.setFieldsValue({
      title: notice.title,
      content: notice.content,
      date: moment(notice.date)
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingNotice(null);
    form.resetFields();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 sm:py-10">
      <div className="w-full max-w-4xl px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">공지사항</h1>
          <Button 
            type="primary" 
            onClick={() => setIsModalOpen(true)}
            className="bg-black hover:bg-gray-800"
          >
            글쓰기
          </Button>
        </div>

        <div className="space-y-4">
          {notices.map((notice) => (
            <div 
              key={notice.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                    {notice.title}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {notice.date}
                    </span>
                    <Button 
                      type="text" 
                      onClick={() => handleEdit(notice)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      수정
                    </Button>
                    <Button 
                      type="text" 
                      onClick={() => handleDelete(notice.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm sm:text-base">
                    {notice.content}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        title={editingNotice ? "공지사항 수정" : "공지사항 작성"}
        open={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
      >
        <Form
          form={form}
          onFinish={editingNotice ? handleUpdate : handleCreate}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력해주세요' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="date"
            label="날짜"
            rules={[{ required: true, message: '날짜를 선택해주세요' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="content"
            label="내용"
            rules={[{ required: true, message: '내용을 입력해주세요' }]}
          >
            <TextArea rows={6} />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Button type="default" onClick={handleModalClose} className="mr-2">
              취소
            </Button>
            <Button type="primary" htmlType="submit">
              {editingNotice ? "수정" : "작성"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Notice;
