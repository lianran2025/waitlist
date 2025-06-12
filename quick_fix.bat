@echo off
echo ================================================
echo 快速修复Python环境脚本
echo ================================================

REM 以管理员权限运行
net session >nul 2>&1
if %errorLevel% == 0 (
    echo 检测到管理员权限，继续执行...
) else (
    echo 需要管理员权限，正在重新启动...
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%~dp0\" && \"%~f0\"' -Verb RunAs"
    exit /b
)

echo 当前目录: %~dp0
cd /d "%~dp0"

REM 尝试修复Python313
set PYTHON_PATH=C:\Python313\python.exe

echo 尝试修复Python环境...

REM 重新安装pip
echo 重新安装pip...
%PYTHON_PATH% -m ensurepip --force --default-pip

REM 升级pip
echo 升级pip...
%PYTHON_PATH% -m pip install --upgrade pip --force-reinstall

REM 清理缓存
echo 清理pip缓存...
%PYTHON_PATH% -m pip cache purge

REM 使用--user和--force-reinstall安装包
echo 强制重新安装所需包...
%PYTHON_PATH% -m pip install --user --force-reinstall flask flask-cors PyPDF2 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn --no-cache-dir

REM 验证
echo.
echo 验证安装...
%PYTHON_PATH% -c "import flask, flask_cors, PyPDF2; print('SUCCESS: 所有包安装成功！')"

if errorlevel 1 (
    echo.
    echo 修复失败，建议重新安装Python
    echo 下载地址: https://www.python.org/downloads/release/python-3118/
    echo 安装时请勾选 "Add Python to PATH"
    pause
    exit /b 1
)

echo.
echo ================================================
echo 修复成功！现在可以运行Flask服务器了
echo ================================================

REM 直接启动简化版服务器
echo 正在启动Flask服务器...
%PYTHON_PATH% main_simple.py

pause 