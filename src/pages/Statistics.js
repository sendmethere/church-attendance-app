import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { Table, Typography, ConfigProvider, Select, Space, Button, Tooltip } from 'antd';
import { getSundaysInPeriod, getSundaysInMonth } from '../utils/dateUtils';
import { convertTableDataToExcel, downloadExcel, generateFileName } from '../utils/excelUtils';
import { DownloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 커스텀 스타일 정의
const customButtonStyle = {
  '&.ant-btn-default': {
    color: 'rgba(0, 0, 0, 0.88) !important',
    borderColor: '#d9d9d9 !important',
    backgroundColor: '#ffffff !important',
  },
  '&.ant-btn-default:hover': {
    color: 'rgba(0, 0, 0, 0.88) !important',
    borderColor: '#d9d9d9 !important',
    backgroundColor: '#f5f5f5 !important',
  },
  '&.ant-btn-default:active': {
    color: 'rgba(0, 0, 0, 0.88) !important',
    borderColor: '#d9d9d9 !important',
    backgroundColor: '#f0f0f0 !important',
  },
  '&.ant-btn-default.ant-btn-dangerous': {
    color: '#ff4d4f !important',
    borderColor: '#ff4d4f !important',
    backgroundColor: '#ffffff !important',
  },
  '&.ant-btn-default.ant-btn-dangerous:hover': {
    color: '#ff7875 !important',
    borderColor: '#ff7875 !important',
    backgroundColor: '#fff1f0 !important',
  },
  '&.ant-btn-default.ant-btn-dangerous:active': {
    color: '#d9363e !important',
    borderColor: '#d9363e !important',
    backgroundColor: '#fff1f0 !important',
  },
  '&.ant-btn-default.ant-btn-dangerous:disabled': {
    color: 'rgba(0, 0, 0, 0.25) !important',
    borderColor: '#d9d9d9 !important',
    backgroundColor: '#f5f5f5 !important',
  },
  '&.ant-btn-default:disabled': {
    color: 'rgba(0, 0, 0, 0.25) !important',
    borderColor: '#d9d9d9 !important',
    backgroundColor: '#f5f5f5 !important',
  },
  '&.ant-btn-default:hover:not(:disabled)': {
    color: 'rgba(0, 0, 0, 0.88) !important',
    borderColor: '#d9d9d9 !important',
    backgroundColor: '#f5f5f5 !important',
  },
  '&.ant-btn-default:active:not(:disabled)': {
    color: 'rgba(0, 0, 0, 0.88) !important',
    borderColor: '#d9d9d9 !important',
    backgroundColor: '#f0f0f0 !important',
  },
};

// 선택된 버튼 스타일
const selectedButtonStyle = {
  ...customButtonStyle,
  '&.ant-btn-default': {
    color: 'white !important',
    borderColor: '#000 !important',
    backgroundColor: '#000 !important',
  },
  '&.ant-btn-default:hover': {
    color: 'white !important',
    borderColor: '#000 !important',
    backgroundColor: '#1a1a1a !important',
  },
  '&.ant-btn-default:active': {
    color: 'white !important',
    borderColor: '#000 !important',
    backgroundColor: '#333 !important',
  },
  '&.ant-btn-default:hover:not(:disabled)': {
    color: 'white !important',
    borderColor: '#000 !important',
    backgroundColor: '#1a1a1a !important',
  },
  '&.ant-btn-default:active:not(:disabled)': {
    color: 'white !important',
    borderColor: '#000 !important',
    backgroundColor: '#333 !important',
  },
};

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
  const [showGroupMonthlyStats, setShowGroupMonthlyStats] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState('all'); // 'all', 'am', 'pm', 'event'
  const [showAbsenceReasons, setShowAbsenceReasons] = useState(false); // 새로운 상태 추가
  const [absenceSortType, setAbsenceSortType] = useState('none'); // 'none', 'absence', 'excused'

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
          if (dateInfo.am && (selectedEventType === 'all' || selectedEventType === 'am')) {
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
          if (dateInfo.pm && (selectedEventType === 'all' || selectedEventType === 'pm')) {
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
          if (dateInfo.event && (selectedEventType === 'all' || selectedEventType === 'event')) {
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

  // 부서별 월별 통계 계산 함수 추가
  const calculateGroupMonthlyStats = () => {
    const stats = {};
    
    // 각 그룹별 초기화
    groupOrder.forEach(group => {
      stats[group] = {
        present: 0,
        absent: 0,
        excused: 0,
        attendanceRate: 0
      };
    });

    // 각 그룹별 출결 현황 집계
    attendanceData.forEach(record => {
      // 선택된 이벤트 타입에 따라 필터링
      if (selectedEventType !== 'all' && record.event_type !== selectedEventType) {
        return;
      }

      if (record.data && record.data.list) {
        record.data.list.forEach(attendance => {
          const member = members.find(m => m.id === attendance.id);
          if (member) {
            const group = member.group;
            if (stats[group]) {
              switch (attendance.status) {
                case 'present':
                  stats[group].present++;
                  break;
                case 'absent':
                  stats[group].absent++;
                  break;
                case 'excused':
                  stats[group].excused++;
                  break;
              }
            }
          }
        });
      }
    });

    // 출석률 계산
    Object.keys(stats).forEach(group => {
      const total = stats[group].present + stats[group].absent + stats[group].excused;
      stats[group].attendanceRate = total > 0 
        ? ((stats[group].present / total) * 100).toFixed(1)
        : 0;
    });

    return stats;
  };

  const groupMonthlyColumns = [
    {
      title: '부서',
      dataIndex: 'group',
      key: 'group',
      width: 100,
      align: 'center',
    },
    {
      title: '출석',
      dataIndex: 'present',
      key: 'present',
      width: 70,
      align: 'center',
    },
    {
      title: '결석',
      dataIndex: 'absent',
      key: 'absent',
      width: 70,
      align: 'center',
    },
    {
      title: '공결',
      dataIndex: 'excused',
      key: 'excused',
      width: 70,
      align: 'center',
    },
    {
      title: '출석률',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      width: 80,
      align: 'center',
      render: (text) => `${text}%`,
    },
  ];

  const getGroupMonthlyData = () => {
    const stats = calculateGroupMonthlyStats();
    
    // 전체 통계 계산
    const totalStats = {
      present: 0,
      absent: 0,
      excused: 0,
      attendanceRate: 0
    };

    // 각 그룹의 통계를 합산
    groupOrder.forEach(group => {
      totalStats.present += stats[group].present;
      totalStats.absent += stats[group].absent;
      totalStats.excused += stats[group].excused;
    });

    // 전체 출석률 계산
    const total = totalStats.present + totalStats.absent + totalStats.excused;
    totalStats.attendanceRate = total > 0 
      ? ((totalStats.present / total) * 100).toFixed(1)
      : 0;

    // 그룹별 데이터와 전체 통계를 합쳐서 반환
    return [
      ...groupOrder.map(group => ({
        key: group,
        group: group,
        ...stats[group],
      })),
      {
        key: 'total',
        group: '전체',
        ...totalStats,
      }
    ];
  };

  // 결석/공결 사유 데이터 생성 함수 수정
  const getAbsenceReasonData = () => {
    const absenceData = {};

    // 각 멤버별로 결석/공결 데이터 초기화
    members.forEach(member => {
      if (selectedGroup === 'all' || member.group === selectedGroup) {
        absenceData[member.id] = {
          key: member.id,
          name: member.name,
          group: member.group,
          absences: [],
          excused: []
        };
      }
    });

    // 출석 데이터에서 결석/공결 정보 수집
    attendanceData.forEach(record => {
      if (record.data && record.data.list) {
        record.data.list.forEach(attendance => {
          if (attendance.status === 'absent' || attendance.status === 'excused') {
            const member = members.find(m => m.id === attendance.id);
            if (member && (selectedGroup === 'all' || member.group === selectedGroup)) {
              const date = record.date;
              const eventType = record.event_type;
              const reason = attendance.reason || '사유 없음';
              
              const entry = {
                date,
                eventType,
                reason
              };

              if (attendance.status === 'absent') {
                absenceData[member.id].absences.push(entry);
              } else {
                absenceData[member.id].excused.push(entry);
              }
            }
          }
        });
      }
    });

    // 데이터를 배열로 변환
    let data = Object.values(absenceData)
      .filter(data => data.absences.length > 0 || data.excused.length > 0);

    // 정렬 타입에 따라 정렬
    switch (absenceSortType) {
      case 'absence':
        data.sort((a, b) => b.absences.length - a.absences.length);
        break;
      case 'excused':
        data.sort((a, b) => b.excused.length - a.excused.length);
        break;
      default:
        // 기본 정렬: 그룹 순서 -> 이름 순서
        data.sort((a, b) => {
          const groupIndexA = groupOrder.indexOf(a.group);
          const groupIndexB = groupOrder.indexOf(b.group);
          if (groupIndexA !== groupIndexB) {
            return groupIndexA - groupIndexB;
          }
          return a.name.localeCompare(b.name, 'ko');
        });
    }

    return data;
  };

  // 결석/공결 사유 테이블 컬럼 정의
  const absenceReasonColumns = [
    {
      title: '그룹',
      dataIndex: 'group',
      key: 'group',
      width: 100,
      align: 'center',
    },
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      align: 'center',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <div style={{ fontSize: '0.8rem', color: 'gray' }}>
            ({record.absences.length} / {record.excused.length})
          </div>
        </div>
      ),
    },
    {
      title: '결석 내역',
      dataIndex: 'absences',
      key: 'absences',
      width: 300,
      render: (absences) => (
        <div>
          {absences.map((absence, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <span style={{ color: '#ff4d4f' }}>
                {`${absence.date} (${absence.eventType === 'am' ? '오전' : absence.eventType === 'pm' ? '오후' : '행사'})`}
              </span>
              <span style={{ marginLeft: '8px' }}>{absence.reason}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '공결 내역',
      dataIndex: 'excused',
      key: 'excused',
      width: 300,
      render: (excused) => (
        <div>
          {excused.map((excuse, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <span style={{ color: '#faad14' }}>
                {`${excuse.date} (${excuse.eventType === 'am' ? '오전' : excuse.eventType === 'pm' ? '오후' : '행사'})`}
              </span>
              <span style={{ marginLeft: '8px' }}>{excuse.reason}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

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
            type="default"
            icon={<DownloadOutlined />}
            onClick={handleExcelDownload}
            className="hide-on-print bg-black text-white hover:bg-gray-800"
            style={selectedButtonStyle}
          >
            <span className="hidden sm:inline">엑셀 다운로드</span>
          </Button>
        </Space>
        <Space direction="vertical" size="middle" className="w-full mb-4">
          <Space direction="vertical" size="small" className="hide-on-print w-full">
            {/* 첫 번째 행: 연/월 선택 */}
            <Space wrap>
              <Button
                type={viewType === 'year' ? 'default' : 'default'}
                onClick={() => {
                  setViewType('year');
                  setYearPeriod('full');
                  setShowGroupMonthlyStats(false);
                }}
                className={viewType === 'year' ? 'bg-black text-white hover:bg-gray-800' : ''}
                style={viewType === 'year' ? selectedButtonStyle : customButtonStyle}
              >
                연간 통계
              </Button>
              <Button
                type={viewType === 'month' ? 'default' : 'default'}
                onClick={() => setViewType('month')}
                className={viewType === 'month' ? 'bg-black text-white hover:bg-gray-800' : ''}
                style={viewType === 'month' ? selectedButtonStyle : customButtonStyle}
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
              {/* 부서별 월별 통계 버튼 */}
          <Space wrap className="hide-on-print">
            <Button
              type={showGroupMonthlyStats ? 'default' : 'default'}
              onClick={() => {
                setShowGroupMonthlyStats(!showGroupMonthlyStats);
                setShowAbsenceReasons(false);
                if (!showGroupMonthlyStats) {
                  setViewType('month');
                }
              }}
              className={showGroupMonthlyStats ? 'bg-black text-white hover:bg-gray-800' : ''}
              style={showGroupMonthlyStats ? selectedButtonStyle : customButtonStyle}
            >
              부서별 월별 통계
            </Button>
            <Button
              type={showAbsenceReasons ? 'default' : 'default'}
              onClick={() => {
                setShowAbsenceReasons(!showAbsenceReasons);
                setShowGroupMonthlyStats(false);
              }}
              className={showAbsenceReasons ? 'bg-black text-white hover:bg-gray-800' : ''}
              style={showAbsenceReasons ? selectedButtonStyle : customButtonStyle}
            >
              결석/공결 사유
            </Button>
          </Space>
            </Space>

            {/* 구분선 추가 */}
            {viewType === 'year' && (
              <div className="w-full border-t border-gray-200 my-2" />
            )}

            {/* 두 번째 행: 기간 필터 버튼 */}
            {viewType === 'year' && (
              <Space wrap>
                <Button
                  type={yearPeriod === 'full' ? 'default' : 'default'}
                  onClick={() => setYearPeriod('full')}
                  className={yearPeriod === 'full' ? 'bg-black text-white hover:bg-gray-800' : ''}
                  style={yearPeriod === 'full' ? selectedButtonStyle : customButtonStyle}
                >
                  전체
                </Button>
                <Button
                  type={yearPeriod === 'first' ? 'default' : 'default'}
                  onClick={() => setYearPeriod('first')}
                  className={yearPeriod === 'first' ? 'bg-black text-white hover:bg-gray-800' : ''}
                  style={yearPeriod === 'first' ? selectedButtonStyle : customButtonStyle}
                >
                  상반기
                </Button>
                <Button
                  type={yearPeriod === 'second' ? 'default' : 'default'}
                  onClick={() => setYearPeriod('second')}
                  className={yearPeriod === 'second' ? 'bg-black text-white hover:bg-gray-800' : ''}
                  style={yearPeriod === 'second' ? selectedButtonStyle : customButtonStyle}
                >
                  하반기
                </Button>
                <Button
                  type={yearPeriod === 'q1' ? 'default' : 'default'}
                  onClick={() => setYearPeriod('q1')}
                  className={yearPeriod === 'q1' ? 'bg-black text-white hover:bg-gray-800' : ''}
                  style={yearPeriod === 'q1' ? selectedButtonStyle : customButtonStyle}
                >
                  1분기
                </Button>
                <Button
                  type={yearPeriod === 'q2' ? 'default' : 'default'}
                  onClick={() => setYearPeriod('q2')}
                  className={yearPeriod === 'q2' ? 'bg-black text-white hover:bg-gray-800' : ''}
                  style={yearPeriod === 'q2' ? selectedButtonStyle : customButtonStyle}
                >
                  2분기
                </Button>
                <Button
                  type={yearPeriod === 'q3' ? 'default' : 'default'}
                  onClick={() => setYearPeriod('q3')}
                  className={yearPeriod === 'q3' ? 'bg-black text-white hover:bg-gray-800' : ''}
                  style={yearPeriod === 'q3' ? selectedButtonStyle : customButtonStyle}
                >
                  3분기
                </Button>
                <Button
                  type={yearPeriod === 'q4' ? 'default' : 'default'}
                  onClick={() => setYearPeriod('q4')}
                  className={yearPeriod === 'q4' ? 'bg-black text-white hover:bg-gray-800' : ''}
                  style={yearPeriod === 'q4' ? selectedButtonStyle : customButtonStyle}
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
              type={selectedGroup === 'all' ? 'default' : 'default'}
              onClick={() => setSelectedGroup('all')}
              className={selectedGroup === 'all' ? 'bg-black text-white hover:bg-gray-800' : ''}
              style={selectedGroup === 'all' ? selectedButtonStyle : customButtonStyle}
            >
              전체
            </Button>
            {groupOrder.map(group => (
              <Button
                key={group}
                type={selectedGroup === group ? 'default' : 'default'}
                onClick={() => setSelectedGroup(group)}
                className={selectedGroup === group ? 'bg-black text-white hover:bg-gray-800' : ''}
                style={selectedGroup === group ? selectedButtonStyle : customButtonStyle}
              >
                {group}
              </Button>
            ))}
          </Space>

          {/* 구분선 추가 */}
          <div className="w-full border-t border-gray-200 my-2" />

          {/* 이벤트 타입 필터 버튼 */}
          <Space wrap className="hide-on-print">
            <Button 
              type={selectedEventType === 'all' ? 'default' : 'default'}
              onClick={() => setSelectedEventType('all')}
              className={selectedEventType === 'all' ? 'bg-black text-white hover:bg-gray-800' : ''}
              style={selectedEventType === 'all' ? selectedButtonStyle : customButtonStyle}
            >
              전체
            </Button>
            <Button
              type={selectedEventType === 'am' ? 'default' : 'default'}
              onClick={() => setSelectedEventType('am')}
              className={selectedEventType === 'am' ? 'bg-black text-white hover:bg-gray-800' : ''}
              style={selectedEventType === 'am' ? selectedButtonStyle : customButtonStyle}
            >
              오전
            </Button>
            <Button
              type={selectedEventType === 'pm' ? 'default' : 'default'}
              onClick={() => setSelectedEventType('pm')}
              className={selectedEventType === 'pm' ? 'bg-black text-white hover:bg-gray-800' : ''}
              style={selectedEventType === 'pm' ? selectedButtonStyle : customButtonStyle}
            >
              오후
            </Button>
            <Button
              type={selectedEventType === 'event' ? 'default' : 'default'}
              onClick={() => setSelectedEventType('event')}
              className={selectedEventType === 'event' ? 'bg-black text-white hover:bg-gray-800' : ''}
              style={selectedEventType === 'event' ? selectedButtonStyle : customButtonStyle}
            >
              행사
            </Button>
          </Space>

        </Space>

        {/* 부서별 월별 통계 테이블 */}
        {showAbsenceReasons ? (
          <div className="mb-6">
            <Space direction="vertical" size="middle" className="w-full">
              <Space>
                <Title level={4} className="mb-0">
                  결석/공결 사유 내역
                </Title>
                <Space className="ml-4">
                  <Button
                    type={absenceSortType === 'none' ? 'default' : 'default'}
                    onClick={() => setAbsenceSortType('none')}
                    className={absenceSortType === 'none' ? 'bg-black text-white hover:bg-gray-800' : ''}
                    style={absenceSortType === 'none' ? selectedButtonStyle : customButtonStyle}
                  >
                    기본 정렬
                  </Button>
                  <Button
                    type={absenceSortType === 'absence' ? 'default' : 'default'}
                    onClick={() => setAbsenceSortType('absence')}
                    className={absenceSortType === 'absence' ? 'bg-black text-white hover:bg-gray-800' : ''}
                    style={absenceSortType === 'absence' ? selectedButtonStyle : customButtonStyle}
                  >
                    결석 많은 순
                  </Button>
                  <Button
                    type={absenceSortType === 'excused' ? 'default' : 'default'}
                    onClick={() => setAbsenceSortType('excused')}
                    className={absenceSortType === 'excused' ? 'bg-black text-white hover:bg-gray-800' : ''}
                    style={absenceSortType === 'excused' ? selectedButtonStyle : customButtonStyle}
                  >
                    공결 많은 순
                  </Button>
                </Space>
              </Space>
              <Table
                columns={absenceReasonColumns}
                dataSource={getAbsenceReasonData()}
                pagination={false}
                size="small"
                bordered
                scroll={{ x: 'max-content' }}
              />
            </Space>
          </div>
        ) : showGroupMonthlyStats ? (
          <div className="mb-6">
            <Title level={4} className="mb-4">
              {selectedYear}년 {selectedMonth}월 부서별 통계
              {selectedEventType !== 'all' && (
                <span className="ml-2 text-base">
                  ({selectedEventType === 'am' ? '오전' : selectedEventType === 'pm' ? '오후' : '행사'})
                </span>
              )}
            </Title>
            <Table
              columns={groupMonthlyColumns}
              dataSource={getGroupMonthlyData()}
              pagination={false}
              size="small"
              bordered
              style={{ maxWidth: '600px' }}
              rowClassName={(record) => record.key === 'total' ? 'font-bold bg-gray-50' : ''}
            />
          </div>
        ) : (
          // 기존 상세 통계 테이블
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
        )}

        <div className="mt-4">
          <Text>○: 출석 / ×: 결석 / △: 공결</Text>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default Statistics;
