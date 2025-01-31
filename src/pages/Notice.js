import React from 'react';

const Notice = () => {
  const notices = [
    {
      id: 1,
      title: '2025년 1월 31일 업데이트',
      date: '2025-01-31',
      content: `
      주요 업데이트 소식을 안내합니다.

      1. 이제 오전/오후로 나누어 출석체크를 하실 수 있습니다. 
      
      2. 수련회와 같은 행사도 출석체크를 할 수 있습니다. 
      
      3. 모든 연습 일정은 '일정 탭'에서 관리합니다. 관리자 외에는 수정하지 않는 것을 권고드립니다. 

      4. 통계에도 오전/오후 및 행사에 대한 출석 현황을 확인할 수 있습니다. 
      
      5. 해당 일자가 아니어도 출석체크를 할 수 있습니다. 
      
      문의 : 엄태상(010-2232-6585)`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 sm:py-10">
      <div className="w-full max-w-4xl px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row justify-center items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">사용 안내</h1>
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
                  <span className="text-sm text-gray-500">
                    {notice.date}
                  </span>
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
    </div>
  );
};

export default Notice;
