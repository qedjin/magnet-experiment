@echo off
chcp 65001 > nul
title 자석 실험 서버

echo.
echo ===========================================
echo   🧲 자석 가상 실험 서버
echo ===========================================
echo.
echo 서버를 시작합니다...
echo.
echo ✅ 브라우저에서 아래 주소로 접속하세요:
echo.
echo       http://localhost:8000
echo.
echo ⚠️  이 창을 닫으면 서버가 꺼집니다.
echo     실험이 끝나면 이 창을 닫아주세요.
echo.
echo ===========================================
echo.

REM 3초 후 자동으로 브라우저 열기
timeout /t 2 /nobreak > nul
start http://localhost:8000

REM 파이썬 서버 실행
python -m http.server 8000

pause
