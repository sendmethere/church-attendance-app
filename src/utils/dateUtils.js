// 한국 시간 기준 날짜 처리를 위한 유틸리티 함수들

/**
 * 현재 한국 시간 기준 정오로 설정된 Date 객체를 반환
 */
export const getKoreanNoon = () => {
  const now = new Date();
  const today = new Date(now.toLocaleString('en-US', { 
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }));
  today.setHours(12, 0, 0, 0);
  return today;
};

/**
 * 주어진 날짜의 일요일 날짜를 반환
 * @param {Date} date - 기준 날짜
 * @returns {Date} - 해당 주의 일요일 날짜
 */
export const getSundayFromDate = (date) => {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  if (dayOfWeek !== 0) {
    targetDate.setDate(targetDate.getDate() - dayOfWeek);
  }
  return targetDate;
};

/**
 * 현재 한국 시간 기준 이번 주 일요일 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getDefaultSunday = () => {
  const today = getKoreanNoon();
  const sunday = getSundayFromDate(today);
  return sunday.toISOString().split('T')[0];
};

/**
 * 주어진 날짜가 현재 한국 시간보다 미래인지 확인
 * @param {string} dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns {boolean} - 미래 날짜 여부
 */
export const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date);
};

/**
 * 주어진 연도와 월의 모든 일요일 날짜 배열을 반환
 * @param {number} year - 연도
 * @param {number} month - 월 (0-11)
 * @returns {string[]} - YYYY-MM-DD 형식의 일요일 날짜 배열
 */
export const getSundaysInMonth = (year, month) => {
  const sundays = [];
  const date = new Date(year, month, 1);
  date.setHours(12, 0, 0, 0);
  
  // 해당 월의 첫 번째 일요일 찾기
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }

  // 월의 마지막 날까지 일요일 추가
  while (date.getMonth() === month) {
    sundays.push(date.toISOString().split('T')[0]);
    date.setDate(date.getDate() + 7);
  }

  return sundays;
};

/**
 * 주어진 연도의 특정 기간의 모든 일요일 날짜 배열을 반환
 * @param {number} year - 연도
 * @param {string} period - 기간 ('full', 'first', 'second', 'q1', 'q2', 'q3', 'q4')
 * @returns {string[]} - YYYY-MM-DD 형식의 일요일 날짜 배열
 */
export const getSundaysInPeriod = (year, period) => {
  let startMonth = 0;
  let endMonth = 11;

  switch (period) {
    case 'first':
      endMonth = 5;
      break;
    case 'second':
      startMonth = 6;
      break;
    case 'q1':
      endMonth = 2;
      break;
    case 'q2':
      startMonth = 3;
      endMonth = 5;
      break;
    case 'q3':
      startMonth = 6;
      endMonth = 8;
      break;
    case 'q4':
      startMonth = 9;
      break;
  }

  const sundays = [];
  for (let month = startMonth; month <= endMonth; month++) {
    sundays.push(...getSundaysInMonth(year, month));
  }

  return sundays;
}; 