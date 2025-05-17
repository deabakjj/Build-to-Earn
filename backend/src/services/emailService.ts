import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import Handlebars from 'handlebars';
import config from '../config';
import logger from '../utils/logger';

/**
 * 이메일 서비스
 * 
 * 각종 이메일 전송 기능을 제공하는 서비스
 */
class EmailService {
  private transporter: nodemailer.Transporter;
  private templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();
  private templateDir: string = path.join(__dirname, '../templates/emails');
  
  constructor() {
    // Nodemailer 트랜스포터 설정
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
    
    // 이메일 서비스가 정상적으로 생성되면 연결 테스트
    this.verifyConnection();
  }
  
  /**
   * 이메일 서비스 연결 테스트
   * @returns {Promise<void>}
   */
  private async verifyConnection(): Promise<void> {
    if (config.nodeEnv === 'test') {
      return; // 테스트 환경에서는 연결 테스트 건너뛰기
    }
    
    try {
      // 실제 트랜스포터가 제공된 경우에만 검증
      if (config.email.host && config.email.user && config.email.pass) {
        await this.transporter.verify();
        logger.info('Email service connected successfully');
      } else {
        logger.warn('Email service credentials not provided, running in dry mode');
      }
    } catch (error) {
      logger.error('Email service connection failed:', error);
    }
  }
  
  /**
   * 이메일 템플릿 로드
   * @param {string} templateName - 템플릿 이름
   * @returns {Promise<Handlebars.TemplateDelegate>} - 컴파일된 Handlebars 템플릿
   */
  private async loadTemplate(templateName: string): Promise<Handlebars.TemplateDelegate> {
    // 캐시에 있는 경우 캐시에서 반환
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }
    
    // 템플릿 파일 경로
    const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
    
    try {
      // 템플릿 파일 읽기
      const templateSource = await fs.promises.readFile(templatePath, 'utf-8');
      
      // Handlebars로 템플릿 컴파일
      const template = Handlebars.compile(templateSource);
      
      // 캐시에 저장
      this.templateCache.set(templateName, template);
      
      return template;
    } catch (error) {
      logger.error(`Failed to load email template '${templateName}':`, error);
      
      // 폴백: 기본 템플릿 반환
      return Handlebars.compile(`
        <h1>{{title}}</h1>
        <p>{{message}}</p>
        {{#if actionUrl}}
          <a href="{{actionUrl}}">{{actionText}}</a>
        {{/if}}
      `);
    }
  }
  
  /**
   * 이메일 전송
   * @param {object} options - 이메일 옵션
   * @returns {Promise<void>}
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<void> {
    try {
      // 개발 환경에서는 로그만 출력
      if (config.nodeEnv === 'development' && !process.env.SEND_REAL_EMAILS) {
        logger.info('Email would be sent:', {
          to: options.to,
          subject: options.subject,
          html: options.html.substring(0, 100) + '...',
        });
        return;
      }
      
      // 실제 이메일 전송
      await this.transporter.sendMail({
        from: options.from || config.email.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      
      logger.info(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }
  
  /**
   * 이메일 인증 이메일 전송
   * @param {string} email - 수신자 이메일
   * @param {string} token - 인증 토큰
   * @returns {Promise<void>}
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    // 인증 URL 생성
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    
    // 템플릿 로드 및 데이터 바인딩
    const template = await this.loadTemplate('verification');
    const html = template({
      title: 'Email Verification',
      username: email.split('@')[0],
      message: 'Thank you for signing up. Please verify your email address by clicking the button below:',
      actionUrl: verificationUrl,
      actionText: 'Verify Email',
      footer: 'If you did not create an account, please ignore this email.',
    });
    
    // 이메일 전송
    await this.sendEmail({
      to: email,
      subject: 'Please Verify Your Email Address',
      html,
    });
  }
  
  /**
   * 비밀번호 재설정 이메일 전송
   * @param {string} email - 수신자 이메일
   * @param {string} token - 재설정 토큰
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // 재설정 URL 생성
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    
    // 템플릿 로드 및 데이터 바인딩
    const template = await this.loadTemplate('password-reset');
    const html = template({
      title: 'Reset Your Password',
      username: email.split('@')[0],
      message: 'You have requested to reset your password. Click the button below to create a new password:',
      actionUrl: resetUrl,
      actionText: 'Reset Password',
      validityPeriod: '1 hour',
      footer: 'If you did not request a password reset, please ignore this email or contact support.',
    });
    
    // 이메일 전송
    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
    });
  }
  
  /**
   * 비밀번호 변경 알림 이메일 전송
   * @param {string} email - 수신자 이메일
   * @returns {Promise<void>}
   */
  async sendPasswordChangeNotification(email: string): Promise<void> {
    // 템플릿 로드 및 데이터 바인딩
    const template = await this.loadTemplate('password-changed');
    const html = template({
      title: 'Password Changed',
      username: email.split('@')[0],
      message: 'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
      supportEmail: 'support@build-to-earn.com',
      supportUrl: `${config.frontendUrl}/support`,
      actionUrl: `${config.frontendUrl}/login`,
      actionText: 'Log In',
    });
    
    // 이메일 전송
    await this.sendEmail({
      to: email,
      subject: 'Your Password Has Been Changed',
      html,
    });
  }
  
  /**
   * 환영 이메일 전송
   * @param {string} email - 수신자 이메일
   * @param {string} username - 사용자 이름
   * @returns {Promise<void>}
   */
  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    // 템플릿 로드 및 데이터 바인딩
    const template = await this.loadTemplate('welcome');
    const html = template({
      title: 'Welcome to DIY 크래프팅 월드!',
      username: username,
      message: 'Thank you for joining our community. Get ready to build amazing creations and earn rewards!',
      actionUrl: `${config.frontendUrl}/getting-started`,
      actionText: 'Get Started',
      resources: [
        { name: 'Beginner Guide', url: `${config.frontendUrl}/guides/beginner` },
        { name: 'FAQ', url: `${config.frontendUrl}/faq` },
        { name: 'Community Discord', url: 'https://discord.gg/build-to-earn' },
      ],
    });
    
    // 이메일 전송
    await this.sendEmail({
      to: email,
      subject: 'Welcome to DIY 크래프팅 월드!',
      html,
    });
  }
  
  /**
   * NFT 민팅 알림 이메일 전송
   * @param {string} email - 수신자 이메일
   * @param {object} nftData - NFT 데이터
   * @returns {Promise<void>}
   */
  async sendNFTMintedEmail(email: string, nftData: {
    name: string;
    imageUrl: string;
    type: string;
    tokenId: string;
    explorerUrl: string;
  }): Promise<void> {
    // 템플릿 로드 및 데이터 바인딩
    const template = await this.loadTemplate('nft-minted');
    const html = template({
      title: 'Your NFT Has Been Minted!',
      username: email.split('@')[0],
      message: `Congratulations! Your ${nftData.type} NFT "${nftData.name}" has been successfully minted.`,
      nftName: nftData.name,
      nftImage: nftData.imageUrl,
      nftType: nftData.type,
      tokenId: nftData.tokenId,
      explorerUrl: nftData.explorerUrl,
      actionUrl: `${config.frontendUrl}/nft/${nftData.tokenId}`,
      actionText: 'View Your NFT',
    });
    
    // 이메일 전송
    await this.sendEmail({
      to: email,
      subject: `Your NFT "${nftData.name}" Has Been Minted!`,
      html,
    });
  }
  
  /**
   * NFT 판매 알림 이메일 전송
   * @param {string} email - 수신자 이메일
   * @param {object} saleData - 판매 데이터
   * @returns {Promise<void>}
   */
  async sendNFTSoldEmail(email: string, saleData: {
    name: string;
    imageUrl: string;
    price: string;
    currency: string;
    buyer: string;
    transactionUrl: string;
  }): Promise<void> {
    // 템플릿 로드 및 데이터 바인딩
    const template = await this.loadTemplate('nft-sold');
    const html = template({
      title: 'Your NFT Has Been Sold!',
      username: email.split('@')[0],
      message: `Great news! Your NFT "${saleData.name}" has been sold.`,
      nftName: saleData.name,
      nftImage: saleData.imageUrl,
      price: saleData.price,
      currency: saleData.currency,
      buyer: saleData.buyer,
      transactionUrl: saleData.transactionUrl,
      actionUrl: `${config.frontendUrl}/account/sales`,
      actionText: 'View Your Sales',
    });
    
    // 이메일 전송
    await this.sendEmail({
      to: email,
      subject: `Your NFT "${saleData.name}" Has Been Sold!`,
      html,
    });
  }
  
  /**
   * 시즌 시작 알림 이메일 전송
   * @param {string} email - 수신자 이메일
   * @param {object} seasonData - 시즌 데이터
   * @returns {Promise<void>}
   */
  async sendSeasonStartEmail(email: string, seasonData: {
    seasonNumber: number;
    seasonName: string;
    startDate: string;
    endDate: string;
    themeDescription: string;
    imageUrl: string;
  }): Promise<void> {
    // 템플릿 로드 및 데이터 바인딩
    const template = await this.loadTemplate('season-start');
    const html = template({
      title: `Season ${seasonData.seasonNumber} Has Begun!`,
      username: email.split('@')[0],
      message: `A new season "${seasonData.seasonName}" has started in DIY 크래프팅 월드. Dive in to discover new rewards and challenges!`,
      seasonNumber: seasonData.seasonNumber,
      seasonName: seasonData.seasonName,
      startDate: seasonData.startDate,
      endDate: seasonData.endDate,
      themeDescription: seasonData.themeDescription,
      seasonImage: seasonData.imageUrl,
      actionUrl: `${config.frontendUrl}/seasons/current`,
      actionText: 'Explore the New Season',
    });
    
    // 이메일 전송
    await this.sendEmail({
      to: email,
      subject: `Season ${seasonData.seasonNumber}: ${seasonData.seasonName} - Now Live!`,
      html,
    });
  }
}

export default new EmailService();
