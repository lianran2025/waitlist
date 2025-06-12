@echo off
echo ================================================
echo 手动安装Python包脚本
echo ================================================

REM 设置Python路径
set PYTHON_PATH=C:\Python313\python.exe

echo 当前Python路径: %PYTHON_PATH%

REM 检查Python是否存在
if not exist "%PYTHON_PATH%" (
    echo 错误: 找不到Python
    echo 请确保Python已正确安装在: %PYTHON_PATH%
    pause
    exit /b 1
)

echo.
echo 尝试使用--user选项安装包...

REM 使用--user选项安装，避免权限问题
echo 安装Flask...
%PYTHON_PATH% -m pip install --user flask --timeout 120 --retries 5 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn

echo 安装Flask-CORS...
%PYTHON_PATH% -m pip install --user flask-cors --timeout 120 --retries 5 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn

echo 安装PyPDF2...
%PYTHON_PATH% -m pip install --user PyPDF2 --timeout 120 --retries 5 -i https://pypi.tuna.tsinghua.edu.cn/simple/ --trusted-host pypi.tuna.tsinghua.edu.cn

REM 如果上面失败，尝试其他镜像源
echo.
echo 如果上面的安装失败，尝试其他镜像源...

echo 尝试阿里云镜像...
%PYTHON_PATH% -m pip install --user flask flask-cors PyPDF2 --timeout 120 --retries 5 -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com

echo 尝试豆瓣镜像...
%PYTHON_PATH% -m pip install --user flask flask-cors PyPDF2 --timeout 120 --retries 5 -i https://pypi.douban.com/simple/ --trusted-host pypi.douban.com

REM 验证安装
echo.
echo 验证安装结果...
%PYTHON_PATH% -c "import sys; print('Python版本:', sys.version)"
%PYTHON_PATH% -c "import flask; print('Flask版本:', flask.__version__)"
%PYTHON_PATH% -c "import flask_cors; print('Flask-CORS: 已安装')"
%PYTHON_PATH% -c "import PyPDF2; print('PyPDF2版本:', PyPDF2.__version__)"

if errorlevel 1 (
    echo.
    echo 验证失败，请检查安装日志
    echo.
    echo 如果仍然失败，请尝试以下手动步骤：
    echo 1. 以管理员身份运行命令提示符
    echo 2. 运行: %PYTHON_PATH% -m pip install --force-reinstall flask flask-cors PyPDF2
    echo 3. 或者重新安装Python
    pause
    exit /b 1
)

echo.
echo ================================================
echo 所有包安装成功！
echo 现在可以运行Flask服务器了
echo ================================================

REM 创建测试脚本
echo @echo off > test_imports.bat
echo echo 测试Python包导入... >> test_imports.bat
echo %PYTHON_PATH% -c "import flask, flask_cors, PyPDF2; print('所有包导入成功！')" >> test_imports.bat
echo pause >> test_imports.bat

echo 已创建测试脚本: test_imports.bat
echo 可以运行该脚本验证包是否正确安装

pause 