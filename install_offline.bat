@echo off
echo ================================================
echo Python环境修复和离线安装脚本
echo ================================================

REM 设置Python路径
set PYTHON_PATH=C:\Python313\python.exe

REM 检查Python是否存在
if not exist "%PYTHON_PATH%" (
    echo 错误: 找不到Python，请先安装Python
    echo 建议下载Python 3.11: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo 当前Python路径: %PYTHON_PATH%

REM 尝试修复pip
echo.
echo 正在修复pip...
%PYTHON_PATH% -m ensurepip --force --default-pip

REM 升级pip并设置超时时间
echo.
echo 升级pip（增加超时时间）...
%PYTHON_PATH% -m pip install --upgrade pip --timeout 60 --retries 3

REM 设置国内镜像源（解决网络问题）
echo.
echo 使用国内镜像源安装依赖包...

REM 尝试多个镜像源
set MIRRORS[0]=-i https://pypi.tuna.tsinghua.edu.cn/simple/
set MIRRORS[1]=-i https://mirrors.aliyun.com/pypi/simple/
set MIRRORS[2]=-i https://pypi.douban.com/simple/

echo 尝试清华大学镜像源...
%PYTHON_PATH% -m pip install flask flask-cors PyPDF2 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --timeout 60 --retries 3
if errorlevel 1 (
    echo 清华镜像失败，尝试阿里云镜像...
    %PYTHON_PATH% -m pip install flask flask-cors PyPDF2 -i https://mirrors.aliyun.com/pypi/simple/ --timeout 60 --retries 3
    if errorlevel 1 (
        echo 阿里云镜像失败，尝试豆瓣镜像...
        %PYTHON_PATH% -m pip install flask flask-cors PyPDF2 -i https://pypi.douban.com/simple/ --timeout 60 --retries 3
    )
)

REM docx2pdf单独安装（可能需要特殊处理）
echo.
echo 安装docx2pdf...
%PYTHON_PATH% -m pip install docx2pdf -i https://pypi.tuna.tsinghua.edu.cn/simple/ --timeout 60 --retries 3
if errorlevel 1 (
    echo docx2pdf安装失败，尝试安装依赖...
    %PYTHON_PATH% -m pip install comtypes python-docx -i https://pypi.tuna.tsinghua.edu.cn/simple/ --timeout 60 --retries 3
    %PYTHON_PATH% -m pip install docx2pdf --no-deps -i https://pypi.tuna.tsinghua.edu.cn/simple/ --timeout 60 --retries 3
)

REM 验证安装
echo.
echo 验证安装结果...
%PYTHON_PATH% -c "import flask; print('Flask:', flask.__version__)"
%PYTHON_PATH% -c "import flask_cors; print('Flask-CORS: 已安装')"
%PYTHON_PATH% -c "import PyPDF2; print('PyPDF2:', PyPDF2.__version__)"
%PYTHON_PATH% -c "import docx2pdf; print('docx2pdf: 已安装')" 2>nul
if errorlevel 1 (
    echo 警告: docx2pdf可能未正确安装，但其他包已安装
)

echo.
echo ================================================
echo 安装完成！现在可以运行Flask服务器了
echo ================================================
pause 