@echo off
echo ================================================
echo 证书生成服务启动脚本
echo ================================================

REM 设置Python路径
set PYTHON_PATH=C:\Python313\python.exe

REM 检查Python是否存在
if not exist "%PYTHON_PATH%" (
    echo 错误: 找不到Python，请检查路径: %PYTHON_PATH%
    pause
    exit /b 1
)

REM 显示Python版本
echo 使用Python版本:
%PYTHON_PATH% --version

REM 检查必要的包是否已安装
echo.
echo 检查依赖包...
%PYTHON_PATH% -c "import flask, flask_cors, docx2pdf, PyPDF2; print('所有依赖包已安装')" 2>nul
if errorlevel 1 (
    echo 警告: 缺少必要的依赖包，正在安装...
    %PYTHON_PATH% -m pip install flask flask-cors docx2pdf PyPDF2
    if errorlevel 1 (
        echo 错误: 依赖包安装失败
        pause
        exit /b 1
    )
)

REM 切换到脚本目录
cd /d "%~dp0"

REM 启动Flask服务器
echo.
echo 启动Flask服务器...
echo 服务地址: http://localhost:5000
echo 按 Ctrl+C 停止服务
echo ================================================
%PYTHON_PATH% main.py

REM 如果服务意外停止，暂停以查看错误信息
if errorlevel 1 (
    echo.
    echo 服务异常停止，请检查错误信息
    pause
) 