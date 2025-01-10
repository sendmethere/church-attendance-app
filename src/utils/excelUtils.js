import { utils as xlsxUtils, writeFile } from 'xlsx';

/**
 * 테이블 데이터를 엑셀 형식으로 변환
 * @param {Array} tableData - 테이블 데이터
 * @param {Array} sundays - 일요일 날짜 배열
 * @returns {Array} - 엑셀용 데이터 배열
 */
const convertTableDataToExcel = (tableData) => {
  return tableData.map(record => {
    const row = {
      그룹: record.group,
      이름: record.name,
      '출/결/공': record.key === 'total' || record.key === 'attendanceRate' 
        ? ''
        : `${record.presentCount}/${record.absentCount}/${record.excusedCount}`,
    };

    // 날짜 데이터 추가
    Object.entries(record).forEach(([key, value]) => {
      if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {  // 날짜 형식 체크
        const monthDay = `${parseInt(key.split('-')[1])}/${parseInt(key.split('-')[2])}`;
        if (record.key === 'total') {
          row[monthDay] = value;
        } else if (record.key === 'attendanceRate') {
          row[monthDay] = value ? `${value}%` : '0%';
        } else {
          switch (value) {
            case 'present':
              row[monthDay] = '○';
              break;
            case 'absent':
              row[monthDay] = '×';
              break;
            case 'excused':
              row[monthDay] = '△';
              break;
            default:
              row[monthDay] = '';
          }
        }
      }
    });

    return row;
  });
};

/**
 * 엑셀 파일 생성 및 다운로드
 * @param {Array} data - 변환된 엑셀 데이터
 * @param {string} fileName - 파일 이름
 */
const downloadExcel = (data, fileName) => {
  const wb = xlsxUtils.book_new();
  const ws = xlsxUtils.json_to_sheet(data);

  // 열 너비 설정
  const colWidths = {
    A: 10, // 그룹
    B: 12, // 이름
    C: 12, // 출/결/공
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