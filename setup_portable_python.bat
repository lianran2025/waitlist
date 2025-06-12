@echo off
echo ================================================
echo 便携版Python环境设置脚本
echo ================================================

REM 设置工作目录
set WORK_DIR=%~dp0
cd /d "%WORK_DIR%"

REM 创建便携版Python目录
set PORTABLE_PYTHON=%WORK_DIR%portable_python
if not exist "%PORTABLE_PYTHON%" mkdir "%PORTABLE_PYTHON%"

echo 工作目录: %WORK_DIR%
echo 便携版Python目录: %PORTABLE_PYTHON%

REM 检查是否已经有便携版Python
if exist "%PORTABLE_PYTHON%\python.exe" (
    echo 发现已有便携版Python，跳过下载
    goto :install_packages
)

echo.
echo 正在下载便携版Python 3.11...
echo 请稍等，这可能需要几分钟...

REM 使用PowerShell下载便携版Python
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-embed-amd64.zip' -OutFile 'python-portable.zip'}"

if not exist "python-portable.zip" (
    echo 下载失败，请检查网络连接
    echo 您也可以手动下载：https://www.python.org/ftp/python/3.11.8/python-3.11.8-embed-amd64.zip
    echo 并将其重命名为 python-portable.zip 放在当前目录
    pause
    exit /b 1
)

echo 正在解压Python...
powershell -Command "Expand-Archive -Path 'python-portable.zip' -DestinationPath '%PORTABLE_PYTHON%' -Force"

REM 清理下载文件
del python-portable.zip

REM 下载get-pip.py
echo 正在下载pip安装器...
powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%PORTABLE_PYTHON%\get-pip.py'"

:install_packages
echo.
echo 设置Python环境...

REM 设置Python路径
set PYTHON_EXE=%PORTABLE_PYTHON%\python.exe
set PYTHONPATH=%PORTABLE_PYTHON%\Lib\site-packages

REM 检查Python是否可用
if not exist "%PYTHON_EXE%" (
    echo 错误: Python可执行文件不存在
    pause
    exit /b 1
)

echo Python路径: %PYTHON_EXE%

REM 安装pip（如果需要）
if not exist "%PORTABLE_PYTHON%\Scripts\pip.exe" (
    echo 正在安装pip...
    "%PYTHON_EXE%" "%PORTABLE_PYTHON%\get-pip.py" --target "%PORTABLE_PYTHON%\Lib\site-packages"
)

REM 安装必要的包
echo.
echo 正在安装Python包...
echo 使用国内镜像源以提高下载速度...

"%PYTHON_EXE%" -m pip install --target "%PORTABLE_PYTHON%\Lib\site-packages" flask -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn
"%PYTHON_EXE%" -m pip install --target "%PORTABLE_PYTHON%\Lib\site-packages" flask-cors -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn
"%PYTHON_EXE%" -m pip install --target "%PORTABLE_PYTHON%\Lib\site-packages" PyPDF2 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn

REM 验证安装
echo.
echo 验证安装结果...
"%PYTHON_EXE%" -c "import flask; print('Flask: OK')"
"%PYTHON_EXE%" -c "import flask_cors; print('Flask-CORS: OK')"
"%PYTHON_EXE%" -c "import PyPDF2; print('PyPDF2: OK')"

if errorlevel 1 (
    echo 包安装验证失败
    pause
    exit /b 1
)

echo.
echo ================================================
echo 便携版Python环境设置完成！
echo Python路径: %PYTHON_EXE%
echo 现在可以运行Flask服务器了
echo ================================================

REM 创建启动脚本
echo @echo off > start_flask_portable.bat
echo set PYTHON_EXE=%PORTABLE_PYTHON%\python.exe >> start_flask_portable.bat
echo set PYTHONPATH=%PORTABLE_PYTHON%\Lib\site-packages >> start_flask_portable.bat
echo echo 使用便携版Python启动Flask服务器... >> start_flask_portable.bat
echo echo Python路径: %%PYTHON_EXE%% >> start_flask_portable.bat
echo "%%PYTHON_EXE%%" main_simple.py >> start_flask_portable.bat
echo pause >> start_flask_portable.bat

echo 已创建启动脚本: start_flask_portable.bat
echo 双击该文件即可启动服务器

pause 