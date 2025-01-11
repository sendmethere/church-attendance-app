import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { Table, Typography, ConfigProvider, Select, Space, Button, Tooltip } from 'antd';
import { getSundaysInPeriod, getSundaysInMonth } from '../utils/dateUtils';
import { convertTableDataToExcel, downloadExcel, generateFileName } from '../utils/excelUtils';
import { DownloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

function Statistics() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [members, setMembers] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [viewType, setViewType] = useState('year'); // 'year' or 'month'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [yearPeriod, setYearPeriod] = useState('full'); // 'full', 'first', 'second', 'q1', 'q2', 'q3', 'q4'


  const groupOrder = ['소프라노', '알토', '테너', '베이스', '기악부', '피아노', '기타'];

  useEffect(() => {
    fetchData();
  }, [viewType, selectedYear, selectedMonth, selectedGroup, yearPeriod]);

  const fetchData = async () => {
    let startDate, endDate;
    if (viewType === 'year') {
      startDate = `${selectedYear}-01-01`;
      endDate = `${selectedYear}-12-31`;
    } else {
      startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
    }

    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .lte('join_date', endDate)
      .or(`out_date.gt.${startDate},out_date.is.null`);

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    const processedData = (attendanceData || []).map(record => ({
      date: record.date,
      data: typeof record.attendance_data === 'string'
        ? JSON.parse(record.attendance_data)
        : record.attendance_data,
    }));

    setMembers(membersData || []);
    setAttendanceData(processedData);
    setTableData(generateTableData(membersData || [], processedData));
  };

  const getSundays = () => {
    if (viewType === 'year') {
      return getSundaysInPeriod(selectedYear, yearPeriod);
    } else {
      return getSundaysInMonth(selectedYear, selectedMonth - 1);
    }
  };
  

  const generateTableData = (members, attendanceData) => {
    const sundays = getSundays();

    // 멤버 데이터를 그룹과 이름으로 정렬
    const sortedMembers = [...members].sort((a, b) => {
      // 먼저 그룹 순서로 정렬
      const groupIndexA = groupOrder.indexOf(a.group);
      const groupIndexB = groupOrder.indexOf(b.group);
      
      if (groupIndexA !== groupIndexB) {
        return groupIndexA - groupIndexB;
      }
      
      // 그룹이 같은 경우 이름으로 정렬
      return a.name.localeCompare(b.name, 'ko');
    });

    // 정렬된 멤버로 테이블 데이터 생성
    const tableData = sortedMembers.map(member => {
      const rowData = {
        key: member.id,
        name: member.name,
        group: member.group,
        presentCount: 0,
        absentCount: 0,
        excusedCount: 0,
      };

      // 선택된 기간의 일요일에 대해서만 출결 상태를 계산
      sundays.forEach(date => {
        const attendanceRecord = attendanceData.find(record => record.date === date);
        if (attendanceRecord && attendanceRecord.data.list) {
          const memberAttendance = attendanceRecord.data.list.find(item => item.id === member.id);
          if (memberAttendance) {
            rowData[date] = memberAttendance.status;
            switch (memberAttendance.status) {
              case 'present':
                rowData.presentCount += 1;
                break;
              case 'absent':
                rowData.absentCount += 1;
                break;
              case 'excused':
                rowData.excusedCount += 1;
                break;
              default:
                break;
            }
          } else {
            rowData[date] = '';
          }
        } else {
          rowData[date] = '';
        }
      });

      return rowData;
    });

    const totalStats = {};
    
    // 각 날짜별 통계 초기화
    sundays.forEach(date => {
      totalStats[date] = { present: 0, absent: 0, excused: 0 };
    });

    // 실제 출석 데이터로 통계 계산
    attendanceData.forEach(record => {
      const date = record.date;
      if (sundays.includes(date) && record.data && record.data.list) {
        record.data.list.forEach(member => {
          // 현재 선택된 그룹의 멤버만 집계
          const memberInfo = members.find(m => m.id === member.id);
          if (memberInfo && (selectedGroup === 'all' || memberInfo.group === selectedGroup)) {
            if (member.status === 'present') totalStats[date].present++;
            if (member.status === 'absent') totalStats[date].absent++;
            if (member.status === 'excused') totalStats[date].excused++;
          }
        });
      }
    });

    // 전체 출석 인원 행
    const totalRow = {
      key: 'total',
      name: '출/결/공',
      group: '',
      presentCount: '-',
      absentCount: '-',
      excusedCount: '-',
    };

    // 각 일자별 데이터 추가 - 출/결/공 모두 표시
    sundays.forEach(date => {
      totalRow[date] = totalStats[date] 
        ? `${totalStats[date].present}/${totalStats[date].absent}/${totalStats[date].excused}`
        : '0/0/0';
    });

    // 출석률 행
    const attendanceRateRow = {
      key: 'attendanceRate',
      name: '출석율 (%)',
      group: '',
      presentCount: '-',
      absentCount: '-',
      excusedCount: '-',
      ...Object.fromEntries(
        sundays.map(date => {
          const stats = totalStats[date];
          const totalMembers = stats.present + stats.absent + stats.excused;
          return [
            date,
            totalMembers ? ((stats.present / totalMembers) * 100).toFixed(1) : 0
          ];
        })
      ),
    };

    return [...tableData, totalRow, attendanceRateRow];
  };

  const columns = [
    {
      title: '그룹',
      dataIndex: 'group',
      key: 'group',
      fixed: 'left',
      width: 80,
      align: 'center',
      filters: groupOrder.map(group => ({
        text: group,
        value: group,
      })),
      onFilter: (value, record) => record.group === value,
      ellipsis: true,
    },
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 100,
      align: 'center',
      ellipsis: true,
    },
    {
      title: '출/결/공',
      dataIndex: 'summary',
      key: 'summary',
      fixed: 'left',
      width: 70,
      align: 'center',
      ellipsis: true,
      render: (_, record) => {
        if (record.key === 'total' || record.key === 'attendanceRate') {
          return '';
        }
        return (
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'gray', whiteSpace: 'nowrap' }}>
            {`${record.presentCount || 0}/${record.absentCount || 0}/${record.excusedCount || 0}`}
          </div>
        );
      },
    },
    ...getSundays().map(date => ({
      title: `${parseInt(date.split('-')[1])}/${parseInt(date.split('-')[2])}`,
      dataIndex: date,
      key: date,
      width: 50,
      align: 'center',
      render: (value, record) => {
        if (record.key === 'total') {
          return value || 0;
        }
        if (record.key === 'attendanceRate') {
          return value ? `${value}%` : '0%';
        }

        // 출결 상태에 따른 툴팁 처리
        const attendanceRecord = attendanceData.find(record => record.date === date);
        let reason = '';
        if (attendanceRecord && attendanceRecord.data.list) {
          const memberAttendance = attendanceRecord.data.list.find(item => item.id === record.key);
          if (memberAttendance) {
            reason = memberAttendance.reason || '사유 미기재';
          }
        }

        let content = '';
        switch (value) {
          case 'present':
            content = '○';
            break;
          case 'absent':
            content = <Tooltip title={reason}>×</Tooltip>;
            break;
          case 'excused':
            content = <Tooltip title={reason}>△</Tooltip>;
            break;
          default:
            content = '';
        }
        return content;
      },
    })),
  ];

  const getFilteredData = () => {
    return selectedGroup === 'all'
      ? tableData
      : tableData.filter(record => record.group === selectedGroup);
  };
  

  const handleExcelDownload = () => {
    // 테재 필터링된 데이터 가져오기
    const filteredData = tableData.filter(record => 
      selectedGroup === 'all' || 
      record.group === selectedGroup || 
      record.key === 'total' || 
      record.key === 'attendanceRate'
    );

    // 엑셀 데이터 변환
    const excelData = convertTableDataToExcel(filteredData);

    // 파일 이름 생성
    const fileName = generateFileName({
      selectedYear,
      viewType,
      yearPeriod,
      selectedMonth,
      selectedGroup
    });

    // 엑셀 파일 다운로드
    downloadExcel(excelData, fileName);
  };

  return (
    <ConfigProvider>
      <div className="p-6">
        <Space className="w-full justify-between mb-4">
          <Title level={2}>
            {selectedGroup === 'all' ? '' : selectedGroup + ' '}출석 통계 
            ({selectedYear}년 {viewType === 'year' 
              ? (yearPeriod === 'first' 
                  ? ' 상반기' 
                  : yearPeriod === 'second' 
                    ? ' 하반기'
                    : yearPeriod === 'q1'
                      ? ' 1분기'
                      : yearPeriod === 'q2'
                        ? ' 2분기'
                        : yearPeriod === 'q3'
                          ? ' 3분기'
                          : yearPeriod === 'q4'
                            ? ' 4분기'
                            : '')
              : ` ${selectedMonth}월`})
          </Title>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExcelDownload}
            className="hide-on-print"
          >
            <span className="hidden sm:inline">엑셀 다운로드</span>
          </Button>
        </Space>
        <Space direction="vertical" size="middle" className="w-full mb-4">
          <Space direction="vertical" size="small" className="hide-on-print w-full">
            {/* 첫 번째 행: 연/월 선택 */}
            <Space wrap>
              <Button
                type={viewType === 'year' ? 'primary' : 'default'}
                onClick={() => {
                  setViewType('year');
                  setYearPeriod('full');
                }}
              >
                연간 통계
              </Button>
              <Button
                type={viewType === 'month' ? 'primary' : 'default'}
                onClick={() => setViewType('month')}
              >
                월간 통계
              </Button>
              <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 100 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Option key={2025 + i} value={2025 + i}>
                    {2025 + i}년
                  </Option>
                ))}
              </Select>
              {viewType === 'month' && (
                <Select value={selectedMonth} onChange={setSelectedMonth} style={{ width: 80 }}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <Option key={i + 1} value={i + 1}>
                      {i + 1}월
                    </Option>
                  ))}
                </Select>
              )}
            </Space>

            {/* 구분선 추가 */}
            {viewType === 'year' && (
              <div className="w-full border-t border-gray-200 my-2" />
            )}

            {/* 두 번째 행: 기간 필터 버튼 */}
            {viewType === 'year' && (
              <Space wrap>
                <Button
                  type={yearPeriod === 'full' ? 'primary' : 'default'}
                  onClick={() => setYearPeriod('full')}
                >
                  전체
                </Button>
                <Button
                  type={yearPeriod === 'first' ? 'primary' : 'default'}
                  onClick={() => setYearPeriod('first')}
                >
                  상반기
                </Button>
                <Button
                  type={yearPeriod === 'second' ? 'primary' : 'default'}
                  onClick={() => setYearPeriod('second')}
                >
                  하반기
                </Button>
                <Button
                  type={yearPeriod === 'q1' ? 'primary' : 'default'}
                  onClick={() => setYearPeriod('q1')}
                >
                  1분기
                </Button>
                <Button
                  type={yearPeriod === 'q2' ? 'primary' : 'default'}
                  onClick={() => setYearPeriod('q2')}
                >
                  2분기
                </Button>
                <Button
                  type={yearPeriod === 'q3' ? 'primary' : 'default'}
                  onClick={() => setYearPeriod('q3')}
                >
                  3분기
                </Button>
                <Button
                  type={yearPeriod === 'q4' ? 'primary' : 'default'}
                  onClick={() => setYearPeriod('q4')}
                >
                  4분기
                </Button>
              </Space>
            )}
          </Space>

          {/* 구분선 추가 */}
          <div className="w-full border-t border-gray-200 my-2" />

          {/* 그룹 필터 버튼 */}
          <Space wrap className="hide-on-print">
            <Button 
              type={selectedGroup === 'all' ? 'primary' : 'default'}
              onClick={() => setSelectedGroup('all')}
            >
              전체
            </Button>
            {groupOrder.map(group => (
              <Button
                key={group}
                type={selectedGroup === group ? 'primary' : 'default'}
                onClick={() => setSelectedGroup(group)}
              >
                {group}
              </Button>
            ))}
          </Space>
        </Space>

        <ConfigProvider
          theme={{
            components: {
              Table: {
                fontSize: '0.75rem',
                padding: '3px 6px',
              },
            },
          }}
        >
          <Table
            columns={columns.filter(col => 
              selectedGroup === 'all' || 
              col.dataIndex === 'name' || 
              col.dataIndex === 'summary' || 
              !['group'].includes(col.dataIndex)
            )}
            dataSource={tableData.filter(record => 
              selectedGroup === 'all' || 
              record.group === selectedGroup || 
              record.key === 'total' || 
              record.key === 'attendanceRate'
            )}
            scroll={{ 
              x: viewType === 'year' ? true : 'max-content',
              scrollToFirstRowOnChange: true 
            }}
            pagination={false}
            size="small"
            bordered
            rowClassName={(record) => {
              if (record.key === 'total') return 'total-row';
              if (record.key === 'attendanceRate') return 'rate-row';
              return '';
            }}
            style={{ 
              width: viewType === 'month' ? 'auto' : '100%',
              maxWidth: viewType === 'month' ? 'fit-content' : 'none',
              cursor: 'pointer',
            }}
          />
        </ConfigProvider>
        <div className="mt-4">
          <Text>○: 출석 / ×: 결석 / △: 공결</Text>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default Statistics;
