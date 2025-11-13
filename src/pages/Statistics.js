import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { Table, Typography, ConfigProvider, Select, Space, Button, Tooltip, Input } from 'antd';
import { convertTableDataToExcel, downloadExcel, generateFileName } from '../utils/excelUtils';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title as ChartTitle, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, ChartTooltip, Legend);

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
  const [showGroupQuarterlyStats, setShowGroupQuarterlyStats] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState('all'); // 'all', 'am', 'pm', 'event'
  const [showAbsenceReasons, setShowAbsenceReasons] = useState(false); // 새로운 상태 추가
  const [absenceSortType, setAbsenceSortType] = useState('none'); // 'none', 'absence', 'excused'
  const [showMemberView, setShowMemberView] = useState(false); // 멤버별 보기
  const [memberSearchText, setMemberSearchText] = useState(''); // 멤버 검색
  const [showAttendanceRate, setShowAttendanceRate] = useState(false); // 출석율 통계
  const [selectedRateRange, setSelectedRateRange] = useState(null); // 선택된 출석율 구간

  const groupOrder = ['기타', '소프라노', '알토', '테너', '베이스', '기악부'];

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
    const dateEvents = attendanceData
      .filter(record => record.date && record.event_type) // 유효한 데이터만 필터링
      .map(record => ({
        date: record.date,
        event_type: record.event_type
      }));

    // 날짜별로 그룹화하여 존재하는 이벤트 타입 기록
    const dateMap = dateEvents.reduce((acc, { date, event_type }) => {
      // 날짜 형식 검증 (YYYY-MM-DD)
      if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return acc;
      }
      
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
          // 날짜 유효성 재확인
          if (!dateInfo.date || !dateInfo.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return [];
          }
          
          const [, month, day] = dateInfo.date.split('-');
          const monthNum = parseInt(month);
          const dayNum = parseInt(day);
          
          // 월과 일이 유효한지 확인
          if (monthNum === 0 || dayNum === 0 || monthNum > 12 || dayNum > 31) {
            return [];
          }
          
          const columns = [];
          if (dateInfo.am && (selectedEventType === 'all' || selectedEventType === 'am')) {
            columns.push({
              title: () => (
                <div>
                  <div>{`${monthNum}/${dayNum}`}</div>
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
                  <div>{`${monthNum}/${dayNum}`}</div>
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
                  <div>{`${monthNum}/${dayNum}`}</div>
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

  // 출석율 통계 계산 함수
  const getAttendanceRateStats = () => {
    // 각 멤버의 출석율 계산
    const memberRates = members
      .filter(member => selectedGroup === 'all' || member.group === selectedGroup)
      .map(member => {
        let totalCount = 0;
        let presentCount = 0;

        attendanceData.forEach(record => {
          // 선택된 이벤트 타입 필터링
          if (selectedEventType !== 'all' && record.event_type !== selectedEventType) {
            return;
          }

          if (record.data && record.data.list) {
            const attendance = record.data.list.find(a => a.id === member.id);
            if (attendance) {
              totalCount++;
              if (attendance.status === 'present') {
                presentCount++;
              }
            }
          }
        });

        const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
        
        return {
          id: member.id,
          name: member.name,
          group: member.group,
          presentCount,
          totalCount,
          rate: parseFloat(rate.toFixed(1))
        };
      });

    // 구간별로 그룹화
    const ranges = [
      { label: '0-10%', min: 0, max: 10, members: [] },
      { label: '10-20%', min: 10, max: 20, members: [] },
      { label: '20-30%', min: 20, max: 30, members: [] },
      { label: '30-40%', min: 30, max: 40, members: [] },
      { label: '40-50%', min: 40, max: 50, members: [] },
      { label: '50-60%', min: 50, max: 60, members: [] },
      { label: '60-70%', min: 60, max: 70, members: [] },
      { label: '70-80%', min: 70, max: 80, members: [] },
      { label: '80-90%', min: 80, max: 90, members: [] },
      { label: '90-100%', min: 90, max: 100, members: [] },
    ];

    memberRates.forEach(member => {
      // 100%는 90-100% 구간에 포함
      const range = ranges.find(r => {
        if (r.max === 100) {
          return member.rate >= r.min && member.rate <= r.max;
        }
        return member.rate >= r.min && member.rate < r.max;
      });
      if (range) {
        range.members.push(member);
      }
    });

    // 각 구간의 멤버들을 그룹 순서대로 정렬 (소프라노-알토-테너-베이스-기악부-기타/지휘)
    const displayOrder = ['소프라노', '알토', '테너', '베이스', '기악부', '기타'];
    ranges.forEach(range => {
      range.members.sort((a, b) => {
        const groupIndexA = displayOrder.indexOf(a.group);
        const groupIndexB = displayOrder.indexOf(b.group);
        if (groupIndexA !== groupIndexB) {
          return groupIndexA - groupIndexB;
        }
        return a.name.localeCompare(b.name, 'ko');
      });
    });

    return ranges;
  };

  // 멤버별 월간 통계 생성 함수
  const getMemberMonthlyStats = () => {
    // 검색된 멤버 필터링
    const filteredMembers = members.filter(member => {
      const groupMatch = selectedGroup === 'all' || member.group === selectedGroup;
      const nameMatch = member.name.toLowerCase().includes(memberSearchText.toLowerCase());
      return groupMatch && nameMatch;
    }).sort((a, b) => {
      const groupIndexA = groupOrder.indexOf(a.group);
      const groupIndexB = groupOrder.indexOf(b.group);
      if (groupIndexA !== groupIndexB) {
        return groupIndexA - groupIndexB;
      }
      return a.name.localeCompare(b.name, 'ko');
    });

    // 각 멤버별로 월간 통계 계산
    return filteredMembers.map(member => {
      const memberData = {
        key: member.id,
        name: member.name,
        group: member.group,
      };

      // 날짜별로 그룹화
      const monthlyStats = {};
      
      attendanceData.forEach(record => {
        // 선택된 이벤트 타입 필터링
        if (selectedEventType !== 'all' && record.event_type !== selectedEventType) {
          return;
        }

        if (record.data && record.data.list) {
          const attendance = record.data.list.find(a => a.id === member.id);
          if (attendance) {
            const month = record.date.substring(0, 7); // YYYY-MM
            if (!monthlyStats[month]) {
              monthlyStats[month] = { present: 0, absent: 0, excused: 0 };
            }
            if (attendance.status === 'present') monthlyStats[month].present++;
            if (attendance.status === 'absent') monthlyStats[month].absent++;
            if (attendance.status === 'excused') monthlyStats[month].excused++;
          }
        }
      });

      // 월별 데이터를 memberData에 추가
      Object.keys(monthlyStats).sort().forEach(month => {
        memberData[month] = monthlyStats[month];
      });

      return memberData;
    });
  };

  // 멤버별 월간 통계 컬럼
  const getMemberMonthlyColumns = () => {
    const columns = [
      {
        title: '그룹',
        dataIndex: 'group',
        key: 'group',
        width: 80,
        align: 'center',
        fixed: 'left',
      },
      {
        title: '이름',
        dataIndex: 'name',
        key: 'name',
        width: 100,
        align: 'center',
        fixed: 'left',
      },
    ];

    // 출석 데이터에서 월 추출
    const months = new Set();
    attendanceData.forEach(record => {
      if (selectedEventType === 'all' || record.event_type === selectedEventType) {
        const month = record.date.substring(0, 7); // YYYY-MM
        months.add(month);
      }
    });

    // 월별 컬럼 추가
    Array.from(months).sort().forEach(month => {
      const [year, monthNum] = month.split('-');
      columns.push({
        title: `${parseInt(monthNum)}월`,
        key: month,
        width: 90,
        align: 'center',
        render: (_, record) => {
          const stats = record[month];
          if (!stats) return '-';
          return (
            <div style={{ fontSize: '0.75rem' }}>
              <span style={{ color: '#2cb67d' }}>{stats.present}</span>
              <span style={{ margin: '0 2px' }}>/</span>
              <span style={{ color: '#ff4f5e' }}>{stats.absent}</span>
              <span style={{ margin: '0 2px' }}>/</span>
              <span style={{ color: '#f5b841' }}>{stats.excused}</span>
            </div>
          );
        },
      });
    });

    return columns;
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
            출석 통계
            {' '}
            ({selectedYear}년 {viewType === 'year' 
              ? (yearPeriod === 'first' 
                  ? '상반기' 
                  : yearPeriod === 'second' 
                    ? '하반기'
                    : yearPeriod === 'q1'
                      ? '1분기'
                      : yearPeriod === 'q2'
                        ? '2분기'
                        : yearPeriod === 'q3'
                          ? '3분기'
                          : yearPeriod === 'q4'
                            ? '4분기'
                            : '')
              : `${selectedMonth}월`})
            {selectedGroup !== 'all' && ` - ${selectedGroup}`}
          </Title>
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={handleExcelDownload}
            className="hide-on-print bg-black text-white hover:bg-gray-800 cursor-pointer"
            style={selectedButtonStyle}
          >
            <span className="hidden sm:inline">엑셀 다운로드</span>
          </Button>
        </Space>

        {/* 통계 설정 박스 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 hide-on-print">
          <Space direction="vertical" size="middle" className="w-full">
            
            {/* 1. 기간 선택 */}
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">기간 선택</div>
              <Space wrap>
                {/* 연간 통계 */}
                <Button
                  type="default"
                  onClick={() => {
                    setViewType('year');
                    setYearPeriod('full');
                    setShowGroupQuarterlyStats(false);
                    setShowGroupMonthlyStats(false);
                  }}
                  className={viewType === 'year' && yearPeriod === 'full' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={viewType === 'year' && yearPeriod === 'full' ? selectedButtonStyle : customButtonStyle}
                >
                  연간 통계
                </Button>
                
                {/* 상반기 */}
                <Button
                  type="default"
                  onClick={() => {
                    setViewType('year');
                    setYearPeriod('first');
                    setShowGroupQuarterlyStats(false);
                    setShowGroupMonthlyStats(false);
                  }}
                  className={yearPeriod === 'first' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={yearPeriod === 'first' ? selectedButtonStyle : customButtonStyle}
                >
                  상반기
                </Button>
                <Button
                  type="default"
                  onClick={() => {
                    setViewType('year');
                    setYearPeriod('second');
                    setShowGroupQuarterlyStats(false);
                    setShowGroupMonthlyStats(false);
                  }}
                  className={yearPeriod === 'second' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={yearPeriod === 'second' ? selectedButtonStyle : customButtonStyle}
                >
                  하반기
                </Button>
                
                <div className="border-l border-gray-300 h-6 mx-2" />
                
                {/* 분기 */}
                <Button
                  type="default"
                  onClick={() => {
                    setViewType('year');
                    setYearPeriod('q1');
                  }}
                  className={yearPeriod === 'q1' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={yearPeriod === 'q1' ? selectedButtonStyle : customButtonStyle}
                >
                  1분기
                </Button>
                <Button
                  type="default"
                  onClick={() => {
                    setViewType('year');
                    setYearPeriod('q2');
                  }}
                  className={yearPeriod === 'q2' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={yearPeriod === 'q2' ? selectedButtonStyle : customButtonStyle}
                >
                  2분기
                </Button>
                <Button
                  type="default"
                  onClick={() => {
                    setViewType('year');
                    setYearPeriod('q3');
                  }}
                  className={yearPeriod === 'q3' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={yearPeriod === 'q3' ? selectedButtonStyle : customButtonStyle}
                >
                  3분기
                </Button>
                <Button
                  type="default"
                  onClick={() => {
                    setViewType('year');
                    setYearPeriod('q4');
                  }}
                  className={yearPeriod === 'q4' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={yearPeriod === 'q4' ? selectedButtonStyle : customButtonStyle}
                >
                  4분기
                </Button>

                <div className="border-l border-gray-300 h-6 mx-2" />

                {/* 월간 통계 */}
                <Button
                  type="default"
                  onClick={() => {
                    setViewType('month');
                    setShowGroupQuarterlyStats(false);
                  }}
                  className={viewType === 'month' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={viewType === 'month' ? selectedButtonStyle : customButtonStyle}
                >
                  월간 통계
                </Button>
                
                <div className="border-l border-gray-300 h-6 mx-2" />
                
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
            </div>

            <div className="border-t border-gray-200" />

            {/* 2. 통계 유형 */}
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">통계 유형</div>
              <Space wrap>
                <Button
                  type="default"
                  onClick={() => {
                    setShowGroupMonthlyStats(false);
                    setShowGroupQuarterlyStats(false);
                    setShowAbsenceReasons(false);
                    setShowMemberView(false);
                    setShowAttendanceRate(false);
                  }}
                  className={!showGroupMonthlyStats && !showGroupQuarterlyStats && !showAbsenceReasons && !showMemberView && !showAttendanceRate ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={!showGroupMonthlyStats && !showGroupQuarterlyStats && !showAbsenceReasons && !showMemberView && !showAttendanceRate ? selectedButtonStyle : customButtonStyle}
                >
                  전체 통계
                </Button>
                <Button
                  type="default"
                  onClick={() => {
                    if (viewType === 'month') {
                      setShowGroupMonthlyStats(true);
                      setShowGroupQuarterlyStats(false);
                    } else {
                      setShowGroupQuarterlyStats(true);
                      setShowGroupMonthlyStats(false);
                    }
                    setShowAbsenceReasons(false);
                    setShowMemberView(false);
                    setShowAttendanceRate(false);
                  }}
                  className={showGroupMonthlyStats || showGroupQuarterlyStats ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={showGroupMonthlyStats || showGroupQuarterlyStats ? selectedButtonStyle : customButtonStyle}
                >
                  부서별 통계
                </Button>
                <Button
                  type="default"
                  onClick={() => {
                    setShowMemberView(true);
                    setShowGroupMonthlyStats(false);
                    setShowGroupQuarterlyStats(false);
                    setShowAbsenceReasons(false);
                    setShowAttendanceRate(false);
                  }}
                  className={showMemberView ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={showMemberView ? selectedButtonStyle : customButtonStyle}
                >
                  멤버별 통계
                </Button>
                <Button
                  type="default"
                  onClick={() => {
                    setShowAttendanceRate(true);
                    setShowGroupMonthlyStats(false);
                    setShowGroupQuarterlyStats(false);
                    setShowAbsenceReasons(false);
                    setShowMemberView(false);
                    setSelectedRateRange(null);
                  }}
                  className={showAttendanceRate ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={showAttendanceRate ? selectedButtonStyle : customButtonStyle}
                >
                  출석율 통계
                </Button>
                <Button
                  type="default"
                  onClick={() => {
                    setShowAbsenceReasons(true);
                    setShowGroupMonthlyStats(false);
                    setShowGroupQuarterlyStats(false);
                    setShowMemberView(false);
                    setShowAttendanceRate(false);
                  }}
                  className={showAbsenceReasons ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={showAbsenceReasons ? selectedButtonStyle : customButtonStyle}
                >
                  결석/공결 사유
                </Button>
              </Space>
            </div>

            <div className="border-t border-gray-200" />

            {/* 3. 시간대 필터 */}
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">시간대</div>
              <Space wrap>
                <Button 
                  type="default"
                  onClick={() => setSelectedEventType('all')}
                  className={selectedEventType === 'all' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={selectedEventType === 'all' ? selectedButtonStyle : customButtonStyle}
                >
                  전체
                </Button>
                <Button
                  type="default"
                  onClick={() => setSelectedEventType('am')}
                  className={selectedEventType === 'am' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={selectedEventType === 'am' ? selectedButtonStyle : customButtonStyle}
                >
                  오전
                </Button>
                <Button
                  type="default"
                  onClick={() => setSelectedEventType('pm')}
                  className={selectedEventType === 'pm' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={selectedEventType === 'pm' ? selectedButtonStyle : customButtonStyle}
                >
                  오후
                </Button>
                <Button
                  type="default"
                  onClick={() => setSelectedEventType('event')}
                  className={selectedEventType === 'event' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                  style={selectedEventType === 'event' ? selectedButtonStyle : customButtonStyle}
                >
                  행사
                </Button>
              </Space>
            </div>

            {/* 4. 부서 필터 (전체 통계, 멤버별 통계, 출석율 통계에서만 표시) */}
            {!showGroupMonthlyStats && !showGroupQuarterlyStats && !showAbsenceReasons && (
              <>
                <div className="border-t border-gray-200" />
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-2">부서</div>
                  <Space wrap>
                    <Button 
                      type="default"
                      onClick={() => setSelectedGroup('all')}
                      className={selectedGroup === 'all' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                      style={selectedGroup === 'all' ? selectedButtonStyle : customButtonStyle}
                    >
                      전체
                    </Button>
                    {groupOrder.map(group => (
                      <Button
                        key={group}
                        type="default"
                        onClick={() => setSelectedGroup(group)}
                        className={selectedGroup === group ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                        style={selectedGroup === group ? selectedButtonStyle : customButtonStyle}
                      >
                        {group}
                      </Button>
                    ))}
                  </Space>
                </div>
              </>
            )}

            {/* 5. 멤버 검색 (멤버별 통계에서만 표시) */}
            {showMemberView && (
              <>
                <div className="border-t border-gray-200" />
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-2">멤버 검색</div>
                  <Input
                    placeholder="이름으로 검색..."
                    value={memberSearchText}
                    onChange={(e) => setMemberSearchText(e.target.value)}
                    prefix={<SearchOutlined />}
                    allowClear
                    style={{ width: '300px' }}
                  />
                </div>
              </>
            )}

          </Space>
        </div>

        {/* 통계 테이블 */}
        {showAttendanceRate ? (
          <div className="mb-6">
            <Title level={4} className="mb-4">
              출석율 분포
              {selectedEventType !== 'all' && (
                <span className="ml-2 text-base">
                  ({selectedEventType === 'am' ? '오전' : selectedEventType === 'pm' ? '오후' : '행사'})
                </span>
              )}
            </Title>
            
            {/* 막대 그래프 */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
              <Bar
                data={{
                  labels: getAttendanceRateStats().map(r => r.label),
                  datasets: [{
                    label: '인원 수',
                    data: getAttendanceRateStats().map(r => r.members.length),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  onClick: (event, elements) => {
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      const ranges = getAttendanceRateStats();
                      setSelectedRateRange(ranges[index]);
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `인원: ${context.parsed.y}명`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
                height={80}
              />
              <div className="mt-2 text-xs text-gray-500 text-center">
                * 막대를 클릭하면 해당 구간의 멤버 목록을 볼 수 있습니다
              </div>
            </div>

            {/* 구간별 멤버 리스트 버튼 */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-600 mb-2">구간 선택</div>
              <Space wrap>
                {getAttendanceRateStats().map((range, index) => (
                  <Button
                    key={index}
                    type="default"
                    onClick={() => setSelectedRateRange(range)}
                    className={selectedRateRange?.label === range.label ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                    style={selectedRateRange?.label === range.label ? selectedButtonStyle : customButtonStyle}
                  >
                    {range.label} ({range.members.length}명)
                  </Button>
                ))}
              </Space>
            </div>

            {/* 선택된 구간의 멤버 리스트 */}
            {selectedRateRange && selectedRateRange.members.length > 0 && (
              <div>
                <Title level={5} className="mb-3">
                  {selectedRateRange.label} 구간 멤버 ({selectedRateRange.members.length}명)
                </Title>
                <Table
                  columns={[
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
                    },
                    {
                      title: '출석',
                      dataIndex: 'presentCount',
                      key: 'presentCount',
                      width: 80,
                      align: 'center',
                    },
                    {
                      title: '전체',
                      dataIndex: 'totalCount',
                      key: 'totalCount',
                      width: 80,
                      align: 'center',
                    },
                    {
                      title: '출석율',
                      dataIndex: 'rate',
                      key: 'rate',
                      width: 100,
                      align: 'center',
                      render: (rate) => `${rate}%`,
                      sorter: (a, b) => b.rate - a.rate,
                    },
                  ]}
                  dataSource={selectedRateRange.members.map(m => ({ ...m, key: m.id }))}
                  pagination={false}
                  size="small"
                  bordered
                />
              </div>
            )}
          </div>
        ) : showMemberView ? (
          <div className="mb-6">
            <Title level={4} className="mb-4">
              멤버별 월간 출석 통계
              {selectedEventType !== 'all' && (
                <span className="ml-2 text-base">
                  ({selectedEventType === 'am' ? '오전' : selectedEventType === 'pm' ? '오후' : '행사'})
                </span>
              )}
            </Title>
            <Table
              columns={getMemberMonthlyColumns()}
              dataSource={getMemberMonthlyStats()}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content' }}
            />
          </div>
        ) : showAbsenceReasons ? (
          <div className="mb-6">
            <Space direction="vertical" size="middle" className="w-full">
              <div className="flex items-center justify-between">
                <Title level={4} className="mb-0">
                  결석/공결 사유 내역
                </Title>
                <Space>
                  <Button
                    type="default"
                    onClick={() => setAbsenceSortType('none')}
                    className={absenceSortType === 'none' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                    style={absenceSortType === 'none' ? selectedButtonStyle : customButtonStyle}
                  >
                    기본 정렬
                  </Button>
                  <Button
                    type="default"
                    onClick={() => setAbsenceSortType('absence')}
                    className={absenceSortType === 'absence' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                    style={absenceSortType === 'absence' ? selectedButtonStyle : customButtonStyle}
                  >
                    결석 많은 순
                  </Button>
                  <Button
                    type="default"
                    onClick={() => setAbsenceSortType('excused')}
                    className={absenceSortType === 'excused' ? 'bg-black text-white hover:bg-gray-800 cursor-pointer' : 'cursor-pointer'}
                    style={absenceSortType === 'excused' ? selectedButtonStyle : customButtonStyle}
                  >
                    공결 많은 순
                  </Button>
                </Space>
              </div>
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
        ) : showGroupQuarterlyStats ? (
          <div className="mb-6">
            <Title level={4} className="mb-4">
              {selectedYear}년 {
                yearPeriod === 'q1' ? '1분기' :
                yearPeriod === 'q2' ? '2분기' :
                yearPeriod === 'q3' ? '3분기' :
                yearPeriod === 'q4' ? '4분기' : ''
              } 부서별 통계
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
