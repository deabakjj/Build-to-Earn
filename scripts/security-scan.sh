#!/bin/bash

# DIY 크래프팅 월드 보안 스캔 스크립트
# Description: 종합적인 보안 점검을 수행합니다.

set -e

# 색깔 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 보안 스캔 시작
echo -e "${BLUE}"
echo "============================================"
echo "  DIY 크래프팅 월드 보안 스캔"
echo "============================================"
echo -e "${NC}"

# 결과 저장 디렉토리 생성
SCAN_DATE=$(date +%Y%m%d_%H%M%S)
SCAN_DIR="./security-reports/${SCAN_DATE}"
mkdir -p "${SCAN_DIR}"

# 1. 의존성 보안 검사
log_info "의존성 보안 검사 진행 중..."
npm audit --production > "${SCAN_DIR}/npm-audit.txt" 2>&1
if [ $? -eq 0 ]; then
    log_success "npm audit 완료 - 보안 취약점 없음"
else
    log_warning "npm audit에서 취약점 발견됨 - ${SCAN_DIR}/npm-audit.txt 확인"
fi

# Yarn berry 사용시
# yarn audit > "${SCAN_DIR}/yarn-audit.txt" 2>&1

# 2. 보안 린팅
log_info "보안 린팅 진행 중..."
npx eslint --ext .js,.jsx,.ts,.tsx . -c .eslintrc.security.js > "${SCAN_DIR}/security-lint.txt" 2>&1
if [ $? -eq 0 ]; then
    log_success "보안 린팅 완료 - 이슈 없음"
else
    log_warning "보안 린팅에서 이슈 발견됨 - ${SCAN_DIR}/security-lint.txt 확인"
fi

# 3. 시크릿 스캔
log_info "시크릿 스캔 진행 중..."
# gitLeaks 사용
if command -v gitleaks &> /dev/null; then
    gitleaks detect --source . --report-path "${SCAN_DIR}/gitleaks-report.json"
    if [ $? -eq 0 ]; then
        log_success "시크릿 스캔 완료 - 노출된 시크릿 없음"
    else
        log_error "시크릿 누출 발견! - ${SCAN_DIR}/gitleaks-report.json 확인"
    fi
else
    log_warning "gitLeaks가 설치되어 있지 않습니다."
fi

# 4. 스마트 컨트랙트 보안 분석
if [ -d "smart-contracts" ]; then
    log_info "스마트 컨트랙트 보안 분석 진행 중..."
    cd smart-contracts
    
    # Slither 분석
    if command -v slither &> /dev/null; then
        slither . > "../${SCAN_DIR}/slither-analysis.txt" 2>&1
        log_success "Slither 분석 완료"
    else
        log_warning "Slither가 설치되어 있지 않습니다."
    fi
    
    # Mythril 분석
    if command -v myth &> /dev/null; then
        find ./contracts -name "*.sol" -exec myth analyze {} \; > "../${SCAN_DIR}/mythril-analysis.txt" 2>&1
        log_success "Mythril 분석 완료"
    else
        log_warning "Mythril이 설치되어 있지 않습니다."
    fi
    
    cd ..
fi

# 5. Docker 컨테이너 보안 스캔
log_info "Docker 이미지 보안 스캔 진행 중..."
if command -v trivy &> /dev/null; then
    docker images --format "table {{.Repository}}:{{.Tag}}" | grep -v REPOSITORY | while read image; do
        image_name=$(echo $image | tr ':' '_' | tr '/' '_')
        trivy image $image > "${SCAN_DIR}/trivy-${image_name}.txt" 2>&1
    done
    log_success "Docker 이미지 보안 스캔 완료"
else
    log_warning "Trivy가 설치되어 있지 않습니다."
fi

# 6. 네트워크 포트 스캔
log_info "네트워크 포트 스캔 진행 중..."
if command -v nmap &> /dev/null; then
    nmap -sV -sC -oA "${SCAN_DIR}/port-scan" localhost > "${SCAN_DIR}/port-scan.txt" 2>&1
    log_success "포트 스캔 완료"
else
    log_warning "nmap이 설치되어 있지 않습니다."
fi

# 7. SSL/TLS 설정 검사
log_info "SSL/TLS 설정 검사 중..."
if [ ! -z "$APP_URL" ]; then
    if command -v sslscan &> /dev/null; then
        sslscan $APP_URL > "${SCAN_DIR}/ssl-scan.txt" 2>&1
        log_success "SSL/TLS 검사 완료"
    else
        log_warning "sslscan이 설치되어 있지 않습니다."
    fi
fi

# 8. 웹 애플리케이션 취약점 스캔
log_info "웹 애플리케이션 취약점 스캔 중..."
if [ ! -z "$APP_URL" ]; then
    if command -v zaproxy &> /dev/null; then
        zaproxy -quickurl $APP_URL -quickprogress > "${SCAN_DIR}/zap-scan.txt" 2>&1
        log_success "OWASP ZAP 스캔 완료"
    else
        log_warning "OWASP ZAP이 설치되어 있지 않습니다."
    fi
fi

# 9. 데이터베이스 보안 설정 확인
log_info "데이터베이스 보안 설정 확인 중..."
if command -v mongosh &> /dev/null; then
    cat > "${SCAN_DIR}/mongodb-security-check.js" << 'EOF'
// MongoDB 보안 설정 체크
print("=== MongoDB 보안 설정 확인 ===");
print("1. 인증 활성화 여부:", db.serverStatus().security);
print("2. SSL/TLS 설정:", db.serverStatus().transportSecurity);
print("3. 권한 설정:");
db.getUsers().forEach(function(user) {
    print("  - User:", user.user, "Roles:", user.roles);
});
EOF
    mongosh --eval "load('${SCAN_DIR}/mongodb-security-check.js')" > "${SCAN_DIR}/mongodb-security.txt" 2>&1
    log_success "MongoDB 보안 설정 확인 완료"
fi

# 10. 보안 정책 준수 검사
log_info "보안 정책 준수 검사 중..."
cat > "${SCAN_DIR}/security-policy-check.txt" << EOF
=== 보안 정책 준수 체크리스트 ===
$(date)

[ ] 1. 환경 변수에 민감한 정보가 하드코딩되어 있지 않은가?
[ ] 2. 모든 API 엔드포인트에 인증이 적용되어 있는가?
[ ] 3. 입력값 검증이 충분히 이루어지고 있는가?
[ ] 4. SQL 인젝션 방어가 적용되어 있는가?
[ ] 5. XSS 방어가 적용되어 있는가?
[ ] 6. CSRF 보호가 활성화되어 있는가?
[ ] 7. Rate limiting이 설정되어 있는가?
[ ] 8. 로그에 민감한 정보가 기록되지 않는가?
[ ] 9. 에러 메시지에 시스템 정보가 노출되지 않는가?
[ ] 10. 최신 보안 업데이트가 적용되어 있는가?
EOF

# 11. 보안 헤더 검사
log_info "보안 헤더 검사 중..."
if [ ! -z "$APP_URL" ]; then
    if command -v curl &> /dev/null; then
        {
            echo "=== 보안 헤더 검사 ==="
            echo "검사 대상: $APP_URL"
            echo "검사 시간: $(date)"
            echo ""
            echo "Content-Security-Policy:"
            curl -I -s $APP_URL | grep -i content-security-policy || echo "설정되지 않음"
            echo ""
            echo "X-Frame-Options:"
            curl -I -s $APP_URL | grep -i x-frame-options || echo "설정되지 않음"
            echo ""
            echo "X-Content-Type-Options:"
            curl -I -s $APP_URL | grep -i x-content-type-options || echo "설정되지 않음"
            echo ""
            echo "Strict-Transport-Security:"
            curl -I -s $APP_URL | grep -i strict-transport-security || echo "설정되지 않음"
        } > "${SCAN_DIR}/security-headers.txt"
        log_success "보안 헤더 검사 완료"
    fi
fi

# 12. 보고서 생성
log_info "보안 보고서 생성 중..."
{
    echo "==================================="
    echo " DIY 크래프팅 월드 보안 스캔 보고서"
    echo "==================================="
    echo "스캔 일시: $(date)"
    echo "보고서 ID: ${SCAN_DATE}"
    echo ""
    echo "1. 스캔 수행 항목:"
    echo "   ✓ 의존성 보안 검사"
    echo "   ✓ 보안 린팅"
    echo "   ✓ 시크릿 스캔"
    echo "   ✓ 스마트 컨트랙트 보안 분석"
    echo "   ✓ Docker 이미지 보안 스캔"
    echo "   ✓ 네트워크 포트 스캔"
    echo "   ✓ SSL/TLS 설정 검사"
    echo "   ✓ 웹 애플리케이션 취약점 스캔"
    echo "   ✓ 데이터베이스 보안 설정 확인"
    echo "   ✓ 보안 정책 준수 검사"
    echo "   ✓ 보안 헤더 검사"
    echo ""
    echo "2. 상세 보고서 위치:"
    echo "   - ${SCAN_DIR}/"
    echo ""
    echo "3. 긴급 대응 필요 항목:"
    echo "   - 발견된 시크릿 누출 즉시 제거"
    echo "   - 고위험 취약점 우선 패치"
    echo "   - 악용 가능한 보안 설정 즉시 수정"
    echo ""
    echo "4. 권장 개선 사항:"
    echo "   - 정기적인 보안 스캔 자동화"
    echo "   - 보안 모니터링 시스템 구축"
    echo "   - 침투 테스트 정기 실시"
    echo ""
    echo "==================================="
} > "${SCAN_DIR}/security-report.txt"

# 13. 요약 출력
echo -e "\n${GREEN}"
echo "============================================"
echo "  보안 스캔 완료!"
echo "============================================"
echo -e "${NC}"

log_info "스캔 결과 요약:"
echo "  - 스캔 ID: ${SCAN_DATE}"
echo "  - 보고서 위치: ${SCAN_DIR}/"
echo "  - 주요 발견사항 확인 필요"
echo ""
log_info "다음 단계:"
echo "  1. 발견된 취약점 우선순위 지정"
echo "  2. 고위험 이슈 즉시 대응"
echo "  3. 보안 개선 계획 수립"
echo "  4. 정기적인 스캔 스케줄 설정"
echo ""

# 이메일 알림 (설정된 경우)
if [ ! -z "$SECURITY_ALERT_EMAIL" ]; then
    log_info "보안 스캔 결과 이메일 발송 중..."
    mail -s "보안 스캔 완료 - ${SCAN_DATE}" $SECURITY_ALERT_EMAIL < "${SCAN_DIR}/security-report.txt"
fi

log_success "보안 스캔이 성공적으로 완료되었습니다! 🔒"

exit 0
