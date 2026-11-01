// 노션풍 테마: 따뜻한 회색 스케일, 파란 포인트, 작은 라운드, 옅은 그림자.
// 팔레트를 여기서 덮어써서 페이지 코드는 건드리지 않는다. (black = 짙은 회색: 버튼·테이블 헤더)
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', '"Apple SD Gothic Neo"', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        black: '#37352f',
        gray: {
          50: '#f7f6f3', 100: '#f1f1ef', 200: '#e9e9e7', 300: '#d3d1cb', 400: '#9b9a97',
          500: '#787774', 600: '#5f5e5b', 700: '#454441', 800: '#2f2d29', 900: '#191919',
        },
        blue: { 500: '#2383e2', 600: '#1a6fc4' },
      },
      borderRadius: { md: '4px', lg: '6px', xl: '8px' },
      boxShadow: {
        DEFAULT: '0 1px 2px rgba(15,15,15,.06)',
        md: '0 1px 3px rgba(15,15,15,.08), 0 0 0 1px rgba(15,15,15,.04)',
        lg: '0 4px 12px rgba(15,15,15,.08), 0 0 0 1px rgba(15,15,15,.04)',
        xl: '0 8px 24px rgba(15,15,15,.10), 0 0 0 1px rgba(15,15,15,.04)',
      },
    },
  },
  plugins: [],
};
