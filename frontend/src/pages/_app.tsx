import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider } from 'next-themes';
import { ToastContainer } from 'react-toastify';
import { useRouter } from 'next/router';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';
import NProgress from 'nprogress';

// 상태 관리 및 컨텍스트
import { AuthProvider } from '../contexts/AuthContext';
import { GameProvider } from '../contexts/GameContext';
import { WalletProvider } from '../contexts/WalletContext';
import { SeasonProvider } from '../contexts/SeasonContext';
import { MarketplaceProvider } from '../contexts/MarketplaceContext';

// 레이아웃 및 공통 컴포넌트
import DefaultLayout from '../components/layout/DefaultLayout';

// 스타일
import '../styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import 'nprogress/nprogress.css';

// 웹 요청 및 통합
import { setupInterceptors } from '../utils/axiosConfig';

// Web3 제공자 가져오기 함수
function getLibrary(provider: any) {
  const library = new ethers.providers.Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
}

/**
 * DIY 크래프팅 월드 앱 진입점
 * 
 * 전역 상태 관리 및 공통 컴포넌트 설정
 */
function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // 페이지 전환 로딩 프로그레스 설정
  useEffect(() => {
    // API 인터셉터 설정
    setupInterceptors();
    
    // 페이지 로딩 프로그레스 설정
    const handleStart = () => NProgress.start();
    const handleComplete = () => NProgress.done();
    
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);
    
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);
  
  // 레이아웃 확인 (컴포넌트에 customLayout 속성이 있는 경우 사용)
  const getLayout = (Component as any).getLayout || ((page: React.ReactNode) => (
    <DefaultLayout>{page}</DefaultLayout>
  ));
  
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DIY 크래프팅 월드 - Build-to-Earn</title>
        <meta name="description" content="DIY 크래프팅 월드에서 블록을 조합해 당신만의 세계를 만들고 수익을 창출하세요!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Web3ReactProvider getLibrary={getLibrary}>
        <ThemeProvider attribute="class" defaultTheme="system">
          <AuthProvider>
            <WalletProvider>
              <GameProvider>
                <SeasonProvider>
                  <MarketplaceProvider>
                    {/* 전역 토스트 알림 */}
                    <ToastContainer
                      position="top-right"
                      autoClose={5000}
                      hideProgressBar={false}
                      newestOnTop
                      closeOnClick
                      rtl={false}
                      pauseOnFocusLoss
                      draggable
                      pauseOnHover
                      theme="colored"
                    />
                    
                    {/* 페이지 레이아웃 적용 */}
                    {getLayout(<Component {...pageProps} />)}
                  </MarketplaceProvider>
                </SeasonProvider>
              </GameProvider>
            </WalletProvider>
          </AuthProvider>
        </ThemeProvider>
      </Web3ReactProvider>
    </>
  );
}

export default MyApp;
