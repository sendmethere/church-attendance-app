import ExcelJS from 'exceljs';

/**
 * 기간 텍스트 생성 (타이틀용)
 */
const getPeriodText = ({ viewType, yearPeriod, selectedMonth, selectedYear }) => {
  if (viewType === 'month') return `${selectedYear}년 ${selectedMonth}월`;
  const suffixMap = {
    first: ' 상반기', second: ' 하반기',
    q1: ' 1분기', q2: ' 2분기', q3: ' 3분기', q4: ' 4분기',
  };
  return `${selectedYear}년${suffixMap[yearPeriod] || ''}`;
};

/**
 * 출석 컬럼 목록 추출 (이벤트 타입 필터 적용)
 */
const getDateColumns = (tableData, selectedEventType) => {
  if (!tableData || tableData.length === 0) return [];
  return Object.keys(tableData[0]).filter(key => {
    if (!key.endsWith('_am') && !key.endsWith('_pm') && !key.endsWith('_event')) return false;
    if (selectedEventType !== 'all') {
      const type = key.substring(key.lastIndexOf('_') + 1);
      if (type !== selectedEventType) return false;
    }
    const dateStr = key.substring(0, key.lastIndexOf('_'));
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return false;
    const [, month, day] = dateStr.split('-');
    return parseInt(month) > 0 && parseInt(month) <= 12 && parseInt(day) > 0 && parseInt(day) <= 31;
  });
};

/**
 * 워크북에 시트 추가
 */
const addAttendanceSheet = (wb, sheetName, tableData, selectedEventType, titleText) => {
  if (!tableData || tableData.length === 0) return;

  const dateColumns = getDateColumns(tableData, selectedEventType);
  const totalCols = 5 + dateColumns.length;
  const ws = wb.addWorksheet(sheetName);

  // 타이틀 행
  ws.addRow([titleText]);
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).font = { bold: true, size: 18 };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 34;
  if (totalCols > 1) ws.mergeCells(1, 1, 1, totalCols);

  // 헤더 행
  const headers = [
    '그룹', '이름', '출석', '결석', '공결',
    ...dateColumns.map(col => {
      const lastIdx = col.lastIndexOf('_');
      const date = col.substring(0, lastIdx);
      const type = col.substring(lastIdx + 1);
      const [, month, day] = date.split('-');
      const typeText = type === 'am' ? '오전' : type === 'pm' ? '오후' : '행사';
      return `${parseInt(month)}/${parseInt(day)} ${typeText}`;
    }),
  ];
  ws.addRow(headers);
  const headerRow = ws.getRow(2);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.alignment = { horizontal: 'center' };
    cell.border = { bottom: { style: 'thin' } };
  });

  // 데이터 행
  tableData.forEach(record => {
    const row = [
      record.group ?? '',
      record.name ?? '',
      record.presentCount ?? '',
      record.absentCount ?? '',
      record.excusedCount ?? '',
    ];

    dateColumns.forEach(col => {
      const value = record[col];
      if (record.key === 'total') {
        row.push(
          typeof value === 'object' && value !== null
            ? `${value.present}/${value.absent}/${value.excused}`
            : (value ?? '')
        );
      } else if (record.key === 'attendanceRate') {
        row.push(value != null ? `${value}%` : '');
      } else {
        const status = typeof value === 'object' && value !== null ? value.status : value;
        switch (status) {
          case 'present': row.push('○'); break;
          case 'absent':  row.push('×'); break;
          case 'excused': row.push('△'); break;
          default:        row.push('');
        }
      }
    });

    const dataRow = ws.addRow(row);
    dataRow.eachCell(cell => { cell.alignment = { horizontal: 'center' }; });
  });

  // 열 너비
  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 7;
  ws.getColumn(4).width = 7;
  ws.getColumn(5).width = 7;
  for (let i = 6; i <= totalCols; i++) ws.getColumn(i).width = 9;
};

/**
 * 출석부 엑셀 다운로드 (전체 + 파트별 멀티 시트)
 * @param {Array} sheets - [{ sheetName, tableData, selectedEventType, titleText }]
 * @param {string} fileName
 */
const downloadExcel = async (sheets, fileName) => {
  const wb = new ExcelJS.Workbook();
  sheets.forEach(({ sheetName, tableData, selectedEventType, titleText }) => {
    addAttendanceSheet(wb, sheetName, tableData, selectedEventType, titleText);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * 파일 이름 생성
 */
const generateFileName = ({ selectedYear, viewType, yearPeriod, selectedMonth, selectedGroup }) => {
  const groupPrefix = selectedGroup === 'all' ? '' : `${selectedGroup}_`;
  const suffixMap = {
    first: '_상반기', second: '_하반기',
    q1: '_1분기', q2: '_2분기', q3: '_3분기', q4: '_4분기',
  };
  const periodSuffix = viewType === 'year'
    ? (suffixMap[yearPeriod] || '')
    : `_${selectedMonth}월`;
  return `${groupPrefix}출석부_${selectedYear}년${periodSuffix}.xlsx`;
};

/**
 * 결석/공결 사유 엑셀 다운로드
 * @param {Array} absenceData - getAbsenceReasonData() 결과
 * @param {string} titleText - 시트 상단 타이틀
 * @param {string} fileName
 */
const downloadAbsenceReasonExcel = async (absenceData, titleText, fileName) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('결석공결사유');

  const totalCols = 4;

  // 타이틀 행
  ws.addRow([titleText]);
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).font = { bold: true, size: 18 };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 34;
  ws.mergeCells(1, 1, 1, totalCols);

  // 헤더 행
  ws.addRow(['그룹', '이름 (결석/공결)', '결석 내역', '공결 내역']);
  const headerRow = ws.getRow(2);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.alignment = { horizontal: 'center' };
    cell.border = { bottom: { style: 'thin' } };
  });

  // 데이터 행
  absenceData.forEach(record => {
    const fmt = (entry) => {
      const typeText = entry.eventType === 'am' ? '오전' : entry.eventType === 'pm' ? '오후' : '행사';
      return `${entry.date} (${typeText}): ${entry.reason}`;
    };
    const absenceText = record.absences.map(fmt).join('\n');
    const excusedText = record.excused.map(fmt).join('\n');

    const dataRow = ws.addRow([
      record.group,
      `${record.name} (${record.absences.length}/${record.excused.length})`,
      absenceText,
      excusedText,
    ]);
    dataRow.eachCell(cell => {
      cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    });
  });

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 48;
  ws.getColumn(4).width = 48;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export { getPeriodText, downloadExcel, generateFileName, downloadAbsenceReasonExcel };
