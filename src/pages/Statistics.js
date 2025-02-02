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
  const [totalStats, setTotalStats] = useState({});

  const groupOrder = ['소프라노', '알토', '테너', '베이스', '기악부', '기타'];

  useEffect(() => {
    fetchData();
  }, [viewType, selectedYear, selectedMonth, selectedGroup, yearPeriod]);

  const fetchData = async () => {
    let startDate, endDate;
    
    if (viewType === 'year') {
      // 연간 조회 시 기간 설정
      switch (yearPeriod) {
        case 'first': // 상반기
          startDate = `${selectedYear}-01-01`;
          endDate = `${selectedYear}-06-30`;
          break;
        case 'second': // 하반기
          startDate = `${selectedYear}-07-01`;
          endDate = `${selectedYear}-12-31`;
          break;
        case 'q1': // 1분기
          startDate = `${selectedYear}-01-01`;
          endDate = `${selectedYear}-03-31`;
          break;
        case 'q2': // 2분기
          startDate = `${selectedYear}-04-01`;
          endDate = `${selectedYear}-06-30`;
          break;
        case 'q3': // 3분기
          startDate = `${selectedYear}-07-01`;
          endDate = `${selectedYear}-09-30`;
          break;
        case 'q4': // 4분기
          startDate = `${selectedYear}-10-01`;
          endDate = `${selectedYear}-12-31`;
          break;
        default: // 전체
          startDate = `${selectedYear}-01-01`;
          endDate = `${selectedYear}-12-31`;
      }
    } else {
      // 월간 조회
      startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .lte('join_date', endDate)
      .or(`out_date.gt.${startDate},out_date.is.null`);

    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    const processedData = (eventsData || []).map(record => ({
      date: record.date,
      data: typeof record.attendance_data === 'string'
        ? JSON.parse(record.attendance_data)
        : record.attendance_data,
      event_type: record.event_type
    }));

    setMembers(membersData || []);
    setAttendanceData(processedData);
    setTableData(generateTableData(membersData || [], processedData));
  };

  const getEventDates = (attendanceData) => {
    // 날짜와 이벤트 타입을 함께 추적
    const dateEvents = attendanceData.map(record => ({
      date: record.date,
      event_type: record.event_type
    }));

    // 날짜별로 그룹화하여 존재하는 이벤트 타입 기록
    const dateMap = dateEvents.reduce((acc, { date, event_type }) => {
      if (!acc[date]) {
        acc[date] = { date, am: false, pm: false, event: false };
      }
      acc[date][event_type] = true;
      return acc;
    }, {});

    // 날짜순으로 정렬하여 반환
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  const generateTableData = (members, attendanceData) => {
    // getSundays() 대신 getEventDates() 사용
    const eventDates = getEventDates(attendanceData);

    // 멤버 데이터를 그룹과 이름으로 정렬
    const sortedMembers = [...members].sort((a, b) => {
      const groupIndexA = groupOrder.indexOf(a.group);
      const groupIndexB = groupOrder.indexOf(b.group);
      
      if (groupIndexA !== groupIndexB) {
        return groupIndexA - groupIndexB;
      }
      
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

      // 각 날짜에 대해 출결 상태를 계산
      eventDates.forEach(dateInfo => {
        const amRecord = attendanceData.find(record => 
          record.date === dateInfo.date && record.event_type === 'am'
        );
        const pmRecord = attendanceData.find(record => 
          record.date === dateInfo.date && record.event_type === 'pm'
        );
        const eventRecord = attendanceData.find(record => 
          record.date === dateInfo.date && record.event_type === 'event'
        );

        rowData[`${dateInfo.date}_am`] = getAttendanceStatus(amRecord, member.id);
        rowData[`${dateInfo.date}_pm`] = getAttendanceStatus(pmRecord, member.id);
        rowData[`${dateInfo.date}_event`] = getAttendanceStatus(eventRecord, member.id);

        updateAttendanceCounts(rowData, amRecord, member.id);
        updateAttendanceCounts(rowData, pmRecord, member.id);
        updateAttendanceCounts(rowData, eventRecord, member.id);
      });

      return rowData;
    });

    // 날짜별 통계 초기화
    const totalStats = {};
    eventDates.forEach(dateInfo => {
      totalStats[dateInfo.date] = {
        am: { present: 0, absent: 0, excused: 0 },
        pm: { present: 0, absent: 0, excused: 0 },
        event: { present: 0, absent: 0, excused: 0 }
      };
    });

    // 실제 출석 데이터로 통계 계산
    attendanceData.forEach(record => {
      const date = record.date;
      if (record.data && record.data.list) {
        record.data.list.forEach(member => {
          const memberInfo = members.find(m => m.id === member.id);
          if (memberInfo && (selectedGroup === 'all' || memberInfo.group === selectedGroup)) {
            const timeSlot = record.event_type;
            if (totalStats[date] && totalStats[date][timeSlot]) {
              if (member.status === 'present') totalStats[date][timeSlot].present++;
              if (member.status === 'absent') totalStats[date][timeSlot].absent++;
              if (member.status === 'excused') totalStats[date][timeSlot].excused++;
            }
          }
        });
      }
    });

    setTotalStats(totalStats);

    const totalRow = createTotalRow(totalStats);
    const attendanceRateRow = createAttendanceRateRow(totalStats);

    return [...tableData, totalRow, attendanceRateRow];
  };

  // 출석 상태 가져오기 헬퍼 함수
  const getAttendanceStatus = (record, memberId) => {
    if (!record || !record.data || !record.data.list) return '';
    const memberAttendance = record.data.list.find(item => item.id === memberId);
    // 상태와 함께 사유도 반환
    return memberAttendance ? {
      status: memberAttendance.status,
      reason: memberAttendance.reason || ''
    } : '';
  };

  // 출석 카운트 업데이트 헬퍼 함수
  const updateAttendanceCounts = (rowData, record, memberId) => {
    if (!record || !record.data || !record.data.list) return;
    
    const memberAttendance = record.data.list.find(item => item.id === memberId);
    if (memberAttendance) {
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
      }
    }
  };

  // 전체 출석 인원 행 생성 함수
  const createTotalRow = (totalStats) => {
    const totalRow = {
      key: 'total',
      name: '출/결/공',
      group: '',
      presentCount: '-',
      absentCount: '-',
      excusedCount: '-',
    };

    // 각 날짜별 AM/PM 데이터 추가
    Object.entries(totalStats).forEach(([date, stats]) => {
      totalRow[`${date}_am`] = stats.am;
      totalRow[`${date}_pm`] = stats.pm;
    });

    return totalRow;
  };

  // 출석률 행 생성 함수
  const createAttendanceRateRow = (totalStats) => {
    const attendanceRateRow = {
      key: 'attendanceRate',
      name: '출석율 (%)',
      group: '',
      presentCount: '-',
      absentCount: '-',
      excusedCount: '-',
    };

    // 각 날짜별 AM/PM 출석률 계산
    Object.entries(totalStats).forEach(([date, stats]) => {
      ['am', 'pm'].forEach(timeSlot => {
        const total = stats[timeSlot].present + stats[timeSlot].absent + stats[timeSlot].excused;
        attendanceRateRow[`${date}_${timeSlot}`] = total 
          ? ((stats[timeSlot].present / total) * 100).toFixed(1)
          : '0';
      });
    });

    return attendanceRateRow;
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
    ...(attendanceData.length > 0 
      ? getEventDates(attendanceData).flatMap(dateInfo => {
          const columns = [];
          if (dateInfo.am) {
            columns.push({
              title: () => (
                <div>
                  <div>{`${parseInt(dateInfo.date.split('-')[1])}/${parseInt(dateInfo.date.split('-')[2])}`}</div>
                  <div className="text-xs">오전</div>
                </div>
              ),
              dataIndex: `${dateInfo.date}_am`,
              key: `${dateInfo.date}_am`,
              width: 50,
              align: 'center',
              render: (value, record) => renderAttendanceCell(value, record, dateInfo.date, 'am'),
            });
          }
          if (dateInfo.pm) {
            columns.push({
              title: () => (
                <div>
                  <div>{`${parseInt(dateInfo.date.split('-')[1])}/${parseInt(dateInfo.date.split('-')[2])}`}</div>
                  <div className="text-xs">오후</div>
                </div>
              ),
              dataIndex: `${dateInfo.date}_pm`,
              key: `${dateInfo.date}_pm`,
              width: 50,
              align: 'center',
              render: (value, record) => renderAttendanceCell(value, record, dateInfo.date, 'pm'),
            });
          }
          if (dateInfo.event) {
            columns.push({
              title: () => (
                <div>
                  <div>{`${parseInt(dateInfo.date.split('-')[1])}/${parseInt(dateInfo.date.split('-')[2])}`}</div>
                  <div className="text-xs">행사</div>
                </div>
              ),
              dataIndex: `${dateInfo.date}_event`,
              key: `${dateInfo.date}_event`,
              width: 50,
              align: 'center',
              render: (value, record) => renderAttendanceCell(value, record, dateInfo.date, 'event'),
            });
          }
          return columns;
        })
      : []
    ),
  ];

  const renderAttendanceCell = (value, record, date, timeSlot) => {
    if (record.key === 'total') {
      const stats = totalStats[date]?.[timeSlot] || { present: 0, absent: 0, excused: 0 };
      return `${stats.present}/${stats.absent}/${stats.excused}`;
    }
    if (record.key === 'attendanceRate') {
      const stats = totalStats[date]?.[timeSlot] || { present: 0, absent: 0, excused: 0 };
      const total = stats.present + stats.absent + stats.excused;
      return total ? `${((stats.present / total) * 100).toFixed(1)}%` : '0%';
    }

    let content = '';
    const status = value?.status;
    const reason = value?.reason;

    switch (status) {
      case 'present':
        content = '○';
        break;
      case 'absent':
        content = (
          <Tooltip title={reason || '사유 없음'}>
            ×
          </Tooltip>
        );
        break;
      case 'excused':
        content = (
          <Tooltip title={reason || '사유 없음'}>
            △
          </Tooltip>
        );
        break;
    }
    return content;
  };

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
