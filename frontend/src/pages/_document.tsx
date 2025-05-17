import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';

/**
 * DIY 크래프팅 월드 Document
 * 
 * Next.js 문서 기본 설정 및 초기 HTML 구조 정의
 */
class MyDocument extends Document {
  // 서버 사이드 초기 설정
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="ko">
        <Head>
          {/* 메타태그 */}
          <meta name="application-name" content="DIY 크래프팅 월드" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="DIY 크래프팅 월드" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="theme-color" content="#4B7DF3" />
          
          {/* SEO 최적화 */}
          <meta property="og:type" content="website" />
          <meta property="og:title" content="DIY 크래프팅 월드 - Build-to-Earn" />
          <meta property="og:description" content="블록을 조합해 당신만의 세계를 만들고 수익을 창출하세요!" />
          <meta property="og:site_name" content="DIY 크래프팅 월드" />
          <meta property="og:url" content="https://build-to-earn.com" />
          <meta property="og:image" content="https://build-to-earn.com/images/og-image.jpg" />
          
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="DIY 크래프팅 월드 - Build-to-Earn" />
          <meta name="twitter:description" content="블록을 조합해 당신만의 세계를 만들고 수익을 창출하세요!" />
          <meta name="twitter:image" content="https://build-to-earn.com/images/twitter-image.jpg" />
          
          {/* 웹폰트 */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link 
            href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Poppins:wght@400;500;600;700&display=swap" 
            rel="stylesheet"
          />
          
          {/* 파비콘 및 앱 아이콘 */}
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="shortcut icon" href="/favicon.ico" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#4B7DF3" />
          
          {/* 앱 스크립트 */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // 다크모드 초기 설정
                (function() {
                  try {
                    const mode = localStorage.getItem('theme');
                    if (mode === 'dark' || (!mode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
        </Head>
        <body className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
