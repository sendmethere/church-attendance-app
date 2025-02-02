import { utils as xlsxUtils, writeFile } from 'xlsx';

/**
 * 테이블 데이터를 엑셀 형식으로 변환
 * @param {Array} tableData - 테이블 데이터
 * @returns {Array} - 엑셀용 데이터 배열
 */
const convertTableDataToExcel = (tableData) => {
  if (!tableData || tableData.length === 0) return [];

  // 날짜 관련 컬럼들을 찾습니다 (키가 '_am', '_pm', '_event'로 끝나는 컬럼들)
  const dateColumns = Object.keys(tableData[0]).filter(key => 
    key.endsWith('_am') || key.endsWith('_pm') || key.endsWith('_event')
  );

  // 엑셀 헤더 생성
  const headers = [
    '그룹',
    '이름',
    '출석',
    '결석',
    '공결',
    // 날짜 컬럼들 추가
    ...dateColumns.map(col => {
      const [date, type] = col.split('_');
      const [year, month, day] = date.split('-');
      const typeText = type === 'am' ? '오전' : type === 'pm' ? '오후' : '행사';
      return `${month}/${day} ${typeText}`;
    })
  ];

  // 엑셀 데이터 생성
  const excelData = tableData.map(record => {
    const row = [
      record.group,
      record.name,
      record.presentCount,
      record.absentCount,
      record.excusedCount,
    ];

    // 날짜별 출석 데이터 추가
    dateColumns.forEach(col => {
      let value = record[col];
      
      // total 행과 attendanceRate 행 처리
      if (record.key === 'total' || record.key === 'attendanceRate') {
        row.push(value);
      } else {
        // 일반 행의 출석 상태 변환
        switch (value) {
          case 'present':
            value = '○';
            break;
          case 'absent':
            value = '×';
            break;
          case 'excused':
            value = '△';
            break;
          default:
            value = '';
        }
        row.push(value);
      }
    });

    return row;
  });

  return [headers, ...excelData];
};

/**
 * 엑셀 파일 생성 및 다운로드
 * @param {Array} data - 변환된 엑셀 데이터
 * @param {string} fileName - 파일 이름
 */
const downloadExcel = (data, fileName) => {
  const wb = xlsxUtils.book_new();
  // aoa_to_sheet를 사용하여 배열 데이터를 직접 시트로 변환
  const ws = xlsxUtils.aoa_to_sheet(data);

  // 열 너비 설정
  const colWidths = {
    A: 10, // 그룹
    B: 12, // 이름
    C: 8,  // 출석
    D: 8,  // 결석
    E: 8,  // 공결
  };
  ws['!cols'] = Object.keys(colWidths).map(key => ({ wch: colWidths[key] }));

  xlsxUtils.book_append_sheet(wb, ws, '출석부');
  writeFile(wb, fileName);
};

/**
 * 파일 이름 생성
 * @param {Object} params - 파일 이름 생성에 필요한 파라미터
 * @returns {string} - 생성된 파일 이름
 */
const generateFileName = ({ selectedYear, viewType, yearPeriod, selectedMonth, selectedGroup }) => {
  const groupPrefix = selectedGroup === 'all' ? '' : `${selectedGroup}_`;
  const periodSuffix = viewType === 'year'
    ? yearPeriod === 'first'
      ? '_상반기'
      : yearPeriod === 'second'
        ? '_하반기'
        : yearPeriod === 'q1'
          ? '_1분기'
          : yearPeriod === 'q2'
            ? '_2분기'
            : yearPeriod === 'q3'
              ? '_3분기'
              : yearPeriod === 'q4'
                ? '_4분기'
                : ''
    : `_${selectedMonth}월`;

  return `${groupPrefix}출석부_${selectedYear}년${periodSuffix}.xlsx`;
};

export { convertTableDataToExcel, downloadExcel, generateFileName }; 