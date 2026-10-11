@echo off
chcp 65001 > nul
echo ========================================================
echo   BatchPixel - 브라우저 기반 일괄 이미지 리사이저 실행
echo ========================================================
echo.
echo 브라우저에서 BatchPixel을 실행합니다...
echo (모든 이미지 처리는 사용자 PC 메모리에서 100%% 안전하게 연산됩니다)
echo.
start "" "%~dp0index.html"
exit
