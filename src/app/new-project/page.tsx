"use client"

import { useState, useEffect, useRef } from "react"
import Select from 'react-select'
import DatePicker from 'react-datepicker'
import { Fragment } from "react"
import "react-datepicker/dist/react-datepicker.css"

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [polling, setPolling] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [message, setMessage] = useState("")
  const [downloadUrl, setDownloadUrl] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")
  const [completeZipUrl, setCompleteZipUrl] = useState("")
  const [zipFileName, setZipFileName] = useState("")
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedCompanyOption, setSelectedCompanyOption] = useState<any>(null)
  const [companyError, setCompanyError] = useState("")
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [selectedModelOption, setSelectedModelOption] = useState<any>(null)
  const [selectedGas, setSelectedGas] = useState("甲烷")
  const [selectedGasOption, setSelectedGasOption] = useState<any>({ label: "甲烷", value: "甲烷" })
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmData, setConfirmData] = useState<any>(null)
  const [errorModal, setErrorModal] = useState("")
  const [zipName, setZipName] = useState('证书.zip')
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [mergeDone, setMergeDone] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [taskCompleted, setTaskCompleted] = useState(false); // 添加任务完成标记
 // 添加下载状态标记

  // 添加日志函数
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    fetch("/api/companies/data")
      .then(res => res.json())
      .then(data => {
        setCompanies(data)
        // 初始不选中公司，鼓励用户输入搜索
        // if (data.length > 0) {
        //   setSelectedCompany(data[0].fullname)
        //   setSelectedCompanyOption({ label: data[0].fullname, value: data[0].fullname })
        //   setModels(data[0].list)
        //   setSelectedModel(data[0].list[0] || "")
        // }
      })
  }, [])

  const handleCompanyChange = (option: any) => {
    setCompanyError("")
    if (!option) {
      setSelectedCompany("")
      setSelectedCompanyOption(null)
      setModels([])
      setSelectedModel("")
      setSelectedModelOption(null)
      return
    }
    const company = companies.find(c => c.fullname === option.value)
    setSelectedCompany(company.fullname)
    setSelectedCompanyOption(option)
    setModels(company.list)
    setSelectedModel(company.list[0] || "")
    setSelectedModelOption(company.list[0] ? { label: company.list[0], value: company.list[0] } : null)
  }

  const handleModelChange = (option: any) => {
    if (!option) {
      setSelectedModel("")
      setSelectedModelOption(null)
      return
    }
    setSelectedModel(option.value)
    setSelectedModelOption(option)
  }

  const handleGasChange = (option: any) => {
    if (!option) {
      setSelectedGas("甲烷")
      setSelectedGasOption({ label: "甲烷", value: "甲烷" })
      return
    }
    setSelectedGas(option.value)
    setSelectedGasOption(option)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setDownloadUrl("")
    setCompanyError("")
    const form = e.currentTarget
    const formData = new FormData(form)
    // 校验公司是否已选择
    if (!selectedCompanyOption) {
      setCompanyError("请选择公司名称")
      setLoading(false)
      return
    }

    // 日期格式化处理 - 使用本地时间避免时区问题
    if (!selectedDate) {
      setErrorModal("请选择检测日期")
      setLoading(false)
      return
    }
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    const formattedDate = `${year}${month}${day}`
    console.log(`[日期格式化] 原始日期: ${selectedDate}, 格式化后: ${formattedDate}`)
    formData.set("date", formattedDate)

    // 新增：将 alert_factory、alert_type 和 gas 加入表单
    formData.set("alert_factory", selectedCompany)
    formData.set("alert_type", selectedModel)
    formData.set("gas", selectedGas)

    // 修改：分布区域可选，留空时按单个空区域处理
    const sectionsRaw = (formData.get("sections") as string || "").trim()
    const sections = sectionsRaw ? sectionsRaw.split(/\s+/).filter(Boolean) : [""]
    // 支持多分隔符：空格、英文逗号、中文逗号
    const sectionsNumRaw = formData.get("sections_num") as string
    const sectionsNumArr = sectionsNumRaw.trim().split(/[\s,，]+/).filter(Boolean)
    
    // 如果区域为空，则只允许一个数量值
    if (sectionsRaw === "" && sectionsNumArr.length !== 1) {
      setErrorModal(`探头分布区域为空时，只能填写一个总数量值`)
      setLoading(false)
      return
    }
    
    // 如果区域不为空，则需要与数量一一对应
    if (sectionsRaw !== "" && sections.length !== sectionsNumArr.length) {
      setErrorModal(`分布区域数量与各区域探头数量不一致，请检查！\n区域：${sections.join(' ')}\n数量：${sectionsNumArr.join(' ')}`)
      setLoading(false)
      return
    }
    // 前端校验
    const allNums = parseInt(formData.get("all_nums") as string)
    const sectionsNumFiltered = sectionsNumArr.map(Number).filter(n => !isNaN(n))
    if (sectionsNumFiltered.length === 0) {
      setErrorModal("请填写各区域探头数量")
      setLoading(false)
      return
    }
    const totalProbes = sectionsNumFiltered.reduce((a, b) => a + b, 0)
    if (totalProbes !== allNums) {
      setErrorModal(`各区域探头数量之和与总数量不匹配\n总数量：${allNums}\n各区域数量：${sectionsNumArr.join(' ')}\n数量之和：${totalProbes}`)
      setLoading(false)
      return
    }

    // 新增：弹出二次确认弹窗，展示所有表单项
    const dataObj: any = {}
    formData.forEach((v, k) => { dataObj[k] = v })
    dataObj["alert_factory"] = selectedCompany
    dataObj["alert_type"] = selectedModel
    dataObj["gas"] = selectedGas
    dataObj["date"] = selectedDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    })
    setConfirmData(dataObj)
    setShowConfirmModal(true)
    setLoading(false)
  }

  // 轮询进度
  useEffect(() => {
    if (polling && taskId && !taskCompleted) {
      pollingRef.current = setInterval(async () => {
        try {
          // 使用Next.js API代理，避免混合内容错误
          const resp = await fetch(`/api/progress/${taskId}`);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }
          const data = await resp.json();
          
          // 添加前端调试日志
          console.log(`[前端轮询] TaskId: ${taskId}`);
          console.log(`[前端轮询] 收到数据:`, data);
          console.log(`[前端轮询] 进度: ${data.progress}%, 状态: ${data.status}, 消息: ${data.message}`);
          
          // 重置错误计数
          setErrorCount(0);
          
          // 同步后台日志
          if (data.raw && data.raw.logs && Array.isArray(data.raw.logs)) {
            const backendLogs = data.raw.logs.map((log: string) => {
              // 为后台日志添加前缀以区分
              return log.includes('[') ? log : `[后台] ${log}`;
            });
            setLogs(prev => {
              // 去重，避免日志重复
              const combined = [...prev, ...backendLogs];
              return [...new Set(combined)];
            });
          }
          
          addLog(`📊 进度: ${data.progress}% - ${data.message}`);
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          // 更新进度信息
          setProgress(data.progress || 0);
          setProgressText(data.message || '');
          
          // 根据进度状态更新UI
          if (data.status === 'completed') {
            console.log(`[前端轮询] 检测到完成状态，停止轮询`);
            setPolling(false);
            setTaskCompleted(true); // 标记任务已完成
            setMergeDone(true);
            addLog('✅ 所有任务完成！可以下载了！');
            
            // 立即清理轮询定时器
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            
            // 设置下载链接（使用Next.js API代理，避免混合内容错误）
            const baseUrl = '/api/download';
            
            // 从后台数据中提取文件名
            let zipFileName = '证书包.zip';
            
            // 方法1：从complete_zip_path字段提取
            if (data.raw && data.raw.complete_zip_path) {
              const fullPath = data.raw.complete_zip_path;
              console.log(`[文件名提取] complete_zip_path: ${fullPath}`);
              
              // 提取文件名部分 (去掉路径前缀)
              const fileName = fullPath.split('\\').pop() || fullPath.split('/').pop();
              if (fileName) {
                console.log(`[文件名提取] 原始文件名: ${fileName}`);
                
                // 从完整文件名中提取公司名称和日期部分
                // 格式: taskId_公司名称日期.zip -> 公司名称日期.zip
                const nameMatch = fileName.match(/^[a-f0-9-]+_(.+)\.zip$/i);
                if (nameMatch) {
                  zipFileName = nameMatch[1] + '.zip';
                  console.log(`[文件名提取] 提取的显示文件名: ${zipFileName}`);
                } else {
                  // 如果正则匹配失败，直接使用文件名
                  zipFileName = fileName;
                  console.log(`[文件名提取] 使用原始文件名: ${zipFileName}`);
                }
              }
            }
            
            // 方法2：从日志中提取（备用方案）
            else if (data.raw && data.raw.logs) {
              const zipLog = data.raw.logs.find((log: string) => log.includes('完整压缩包生成成功:'));
              if (zipLog) {
                console.log(`[文件名提取] 从日志提取: ${zipLog}`);
                const match = zipLog.match(/complete\\(.+\.zip)/);
                if (match) {
                  const fullFileName = match[1].split('\\').pop();
                  if (fullFileName) {
                    const nameMatch = fullFileName.match(/_(.+)\.zip$/);
                    if (nameMatch) {
                      zipFileName = nameMatch[1] + '.zip';
                    }
                  }
                }
              }
            }
            
            console.log(`[文件名提取] 最终文件名: ${zipFileName}`);
            
            // 生成下载URL，确保正确编码
            const encodedFileName = encodeURIComponent(zipFileName);
            const completeUrl = `${baseUrl}/${taskId}/complete?filename=${encodedFileName}`;
            
            console.log(`[URL生成] 原始文件名: ${zipFileName}`);
            console.log(`[URL生成] 编码后文件名: ${encodedFileName}`);
            console.log(`[URL生成] 完整下载URL: ${completeUrl}`);
            
            setCompleteZipUrl(completeUrl);
            setPdfUrl(`${baseUrl}/${taskId}/merged`);
            setDownloadUrl(`${baseUrl}/${taskId}/docx`);
            
            // 设置显示的文件名
            setZipFileName(zipFileName);
          } else if (data.status === 'error') {
            throw new Error(data.message || '处理失败');
          } else {
            console.log(`[前端轮询] 继续轮询，当前状态: ${data.status}`);
          }
        } catch (error) {
          console.error('轮询进度时出错:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // 区分网络错误和其他错误
          const isNetworkError = errorMessage.includes('fetch failed') || 
                                errorMessage.includes('Connect Timeout') || 
                                errorMessage.includes('HTTP 5');
          
          if (isNetworkError) {
            console.log(`[前端轮询] 网络连接问题，继续重试...`);
            addLog(`⚠️ 网络连接问题，正在重试...`);
          } else {
            addLog(`❌ 进度查询错误: ${errorMessage}`);
          }
          
          setErrorCount(prev => prev + 1);
          
          // 连续错误超过5次停止轮询
          if (errorCount >= 4) {
            setPolling(false);
            setMessage("进度查询失败次数过多，已停止轮询");
            addLog('⚠️ 进度查询失败次数过多，已停止轮询');
            
            // 清理轮询定时器
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        }
      }, 2000); // 2秒轮询一次
      
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
  }, [polling, taskId, taskCompleted, errorCount, addLog]);

  // 真正生成证书的逻辑，原 handleSubmit 的 try-catch 部分
  const handleConfirmGenerate = async () => {
    setShowConfirmModal(false)
    setLoading(true)
    setMessage("")
    setDownloadUrl("")
    setPdfUrl("")
    setCompleteZipUrl("")
    setZipFileName("")
    setProgress(10)
    setProgressText('正在生成证书并上传到服务器...')
    setTaskCompleted(false) // 重置任务完成状态
    setMergeDone(false) // 重置合并完成状态
    
    try {
      const formData = new FormData()
      Object.entries(confirmData).forEach(([k, v]) => {
        if (k === 'date') {
          // 重新格式化日期为8位数字字符串
          const year = selectedDate.getFullYear()
          const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
          const day = String(selectedDate.getDate()).padStart(2, '0')
          const formattedDate = `${year}${month}${day}`
          console.log(`[确认生成] 重新格式化日期: ${formattedDate}`)
          formData.append(k, formattedDate)
        } else {
          formData.append(k, v as string)
        }
      })
      
      const response = await fetch("/api/generate-certificates", {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "生成证书失败")
      }
      
      const data = await response.json()
      
      // 解析 taskId
      let currentTaskId = data.taskId;
      if (!currentTaskId) {
        // 尝试从 docxZipUrl 或 pdfUrl 中解析
        const match = (data.docxZipUrl || data.pdfUrl || '').match(/download\/(.*?)\//);
        if (match) currentTaskId = match[1];
      }
      
      setTaskId(currentTaskId);
      setDownloadUrl(data.docxZipUrl)
      setPdfUrl(data.pdfUrl)
      setCompleteZipUrl(data.completeZipUrl)
      setZipFileName(data.zipFileName || '证书包.zip')
      
      // 启动进度轮询
      if (currentTaskId) {
        setProgress(15)
        setProgressText('证书已生成，正在启动后台处理...')
        // 稍微延迟启动轮询，让后台任务有时间初始化
        setTimeout(() => {
          setPolling(true);
          setErrorCount(0);
          addLog('开始轮询任务进度...');
        }, 1000);
      } else {
        setProgressText('无法获取任务进度，请联系管理员')
        setProgress(0)
      }
      
    } catch (error: any) {
      setErrorModal(error.message || "生成证书失败")
      setProgress(0)
      setProgressText('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-4xl">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">证书生成工具</h2>
        <form id="generateForm" className="space-y-6" onSubmit={handleSubmit}>
          {/* 基本信息组 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">基本信息</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">委托单位名称</label>
                <input 
                  type="text" 
                  id="company_name" 
                  name="company_name" 
                  required 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  placeholder="请输入委托单位名称" 
                />
              </div>
                             <div>
                 <label htmlFor="gas" className="block text-sm font-medium text-gray-700 mb-2">检测气体</label>
                 <Select
                   inputId="gas"
                   name="gas"
                   instanceId="gas-select"
                   value={selectedGasOption}
                   onChange={handleGasChange}
                   options={[
                     { label: "甲烷", value: "甲烷" },
                     { label: "丙烷", value: "丙烷" }
                   ]}
                   classNamePrefix="react-select"
                   placeholder="请选择检测气体..."
                   isSearchable={false}
                   styles={{
                     control: (base) => ({ 
                       ...base, 
                       minHeight: '48px', 
                       borderRadius: '0.5rem', 
                       borderColor: '#d1d5db', 
                       boxShadow: 'none',
                       backgroundColor: 'white'
                     }),
                     menu: (base) => ({ ...base, zIndex: 20 }),
                   }}
                 />
               </div>
                             <div>
                 <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">检测日期</label>
                 <DatePicker
                   id="date"
                   selected={selectedDate}
                   onChange={(date: Date | null) => date && setSelectedDate(date)}
                   dateFormat="yyyy年MM月dd日"
                   className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white cursor-pointer"
                   wrapperClassName="w-full"
                   calendarClassName="shadow-lg border-0 rounded-lg"
                   dayClassName={(date) => 
                     "hover:bg-blue-500 hover:text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                   }
                   monthClassName={() => "hover:bg-blue-500 hover:text-white rounded px-2 py-1 transition-colors cursor-pointer"}
                   yearClassName={() => "hover:bg-blue-500 hover:text-white rounded px-2 py-1 transition-colors cursor-pointer"}
                   previousMonthButtonLabel="‹"
                   nextMonthButtonLabel="›"
                   showPopperArrow={false}
                   placeholderText="请选择日期"
                 />
               </div>
            </div>
          </div>

          {/* 设备信息组 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">设备信息</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="alert_factory" className="block text-sm font-medium text-gray-700 mb-2">公司名称</label>
                                 <Select
                   inputId="alert_factory"
                   name="alert_factory"
                   instanceId="company-select"
                   value={selectedCompanyOption}
                   onChange={handleCompanyChange}
                   options={companies.map(c => ({ label: c.fullname, value: c.fullname }))}
                   classNamePrefix="react-select"
                   placeholder="请输入或搜索公司名称..."
                   isSearchable
                   isClearable
                   styles={{
                     control: (base, state) => ({ 
                       ...base, 
                       minHeight: '48px', 
                       borderRadius: '0.5rem', 
                       borderColor: companyError ? '#ef4444' : '#d1d5db', 
                       boxShadow: 'none',
                       backgroundColor: 'white'
                     }),
                     menu: (base) => ({ ...base, zIndex: 20 }),
                   }}
                 />
                 {companyError && <p className="mt-1 text-sm text-red-500">{companyError}</p>}
              </div>
                             <div>
                 <label htmlFor="alert_type" className="block text-sm font-medium text-gray-700 mb-2">品牌型号</label>
                 <Select
                   inputId="alert_type"
                   name="alert_type"
                   instanceId="model-select"
                   value={selectedModelOption}
                   onChange={handleModelChange}
                   options={models.map(m => ({ label: m, value: m }))}
                   classNamePrefix="react-select"
                   placeholder="请选择品牌型号..."
                   isSearchable={true}
                   styles={{
                     control: (base) => ({ 
                       ...base, 
                       minHeight: '48px', 
                       borderRadius: '0.5rem', 
                       borderColor: '#d1d5db', 
                       boxShadow: 'none',
                       backgroundColor: 'white'
                     }),
                     menu: (base) => ({ ...base, zIndex: 20 }),
                   }}
                 />
               </div>
            </div>
          </div>

          {/* 探头配置组 */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">探头配置</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="all_nums" className="block text-sm font-medium text-gray-700 mb-2">探头总数量</label>
                <input 
                  type="number" 
                  id="all_nums" 
                  name="all_nums" 
                  required 
                  min={1} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  placeholder="请输入探头总数" 
                />
              </div>
              <div>
                <label htmlFor="start_num" className="block text-sm font-medium text-gray-700 mb-2">探头起始编号</label>
                <input 
                  type="number" 
                  id="start_num" 
                  name="start_num" 
                  required 
                  min={1} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  placeholder="请输入起始编号" 
                  defaultValue="1" 
                />
              </div>
            </div>
          </div>

          {/* 分布配置组 */}
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">分布配置</h3>
            </div>
                         <div className="space-y-6">
               <div>
                 <label htmlFor="sections" className="block text-sm font-medium text-gray-700 mb-2">
                   探头分布区域 <span className="text-gray-500 text-sm">(可选)</span>
                 </label>
                 <input 
                   type="text" 
                   id="sections" 
                   name="sections" 
                   className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                 />
                 <p className="mt-2 text-sm text-gray-500">
                   留空时将所有探头视为一个整体，不按区域分布
                 </p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label htmlFor="sections_num" className="block text-sm font-medium text-gray-700 mb-2">各区域探头数量</label>
                   <input 
                     type="text" 
                     id="sections_num" 
                     name="sections_num" 
                     required 
                     className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                   />
                   <p className="mt-2 text-sm text-gray-500">
                     如果区域为空，只需填写总数量；如果有区域，需要与区域数量对应
                   </p>
                 </div>
                 <div>
                   <label htmlFor="problem_nums" className="block text-sm font-medium text-gray-700 mb-2">故障探头编号（可选）</label>
                   <input
                     type="text"
                     id="problem_nums"
                     name="problem_nums"
                     className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                   />
                   <p className="mt-2 text-sm text-gray-500">支持区间和空格分隔，如 1-3 5 7-8</p>
                 </div>
               </div>
             </div>
          </div>

          {/* 环境参数组 */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">环境参数</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">温度（°C）</label>
                <input 
                  type="number" 
                  id="temperature" 
                  name="temperature" 
                  step="0.1" 
                  required 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  placeholder="如: 20.0" 
                  defaultValue="20.0" 
                />
              </div>
              <div>
                <label htmlFor="humidity" className="block text-sm font-medium text-gray-700 mb-2">湿度（%）</label>
                <input 
                  type="number" 
                  id="humidity" 
                  name="humidity" 
                  required 
                  min={0} 
                  max={100} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  placeholder="如: 50" 
                  defaultValue="50" 
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              {loading ? "生成中..." : "生成证书"}
            </button>
          </div>
        </form>
        {/* 优化的进度显示 */}
        {(loading || polling || progress > 0) && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">处理进度</span>
              <span className="text-sm font-medium text-blue-900">{progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progressText && (
              <div className="mt-3 text-sm text-blue-800 text-center font-medium">
                {progressText}
              </div>
            )}
            {polling && !taskCompleted && (
              <div className="mt-2 flex items-center justify-center text-xs text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                实时监控中... (错误次数: {errorCount}/5)
              </div>
            )}
            {polling && !taskCompleted && errorCount > 0 && errorCount < 5 && (
              <div className="mt-2 text-xs text-amber-600 text-center">
                ⚠️ 网络连接不稳定，正在重试...
              </div>
            )}
          </div>
        )}

        {/* 下载区域 - 只在真正完成时显示 */}
        {mergeDone && completeZipUrl && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-green-900 mb-2">处理完成！</h3>
            <p className="text-sm text-green-700 mb-4">
              所有证书已生成完成，包含Word文档和PDF文件
            </p>
            <a
              href={completeZipUrl}
              download={zipFileName || '证书包.zip'}
              onClick={() => {
                console.log(`[下载] 开始下载: ${completeZipUrl}`);
                console.log(`[下载] 文件名: ${zipFileName}`);
              }}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              下载完整证书包
            </a>
            <p className="mt-2 text-xs text-green-600">
              文件名：{zipFileName}
            </p>
          </div>
        )}
        {errorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4 text-red-600">错误提示</h3>
              <div className="mb-6 whitespace-pre-line text-gray-800">{errorModal}</div>
              <button
                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                onClick={() => setErrorModal("")}
              >关闭</button>
            </div>
          </div>
        )}
        {showConfirmModal && (
          <ConfirmModal
            data={confirmData}
            onCancel={() => setShowConfirmModal(false)}
            onConfirm={handleConfirmGenerate}
          />
        )}
      </div>
    </div>
  )
}

function ConfirmModal({ data, onCancel, onConfirm }: { data: any, onCancel: () => void, onConfirm: () => void }) {
  // 字段中文名映射
  const fieldLabels: Record<string, string> = {
    company_name: "委托单位名称",
    alert_factory: "公司名称",
    alert_type: "品牌型号",
    all_nums: "探头总数量",
    date: "检测日期",
    start_num: "探头起始编号",
    gas: "检测气体",
    temperature: "温度（°C）",
    humidity: "湿度（%）",
    sections: "探头分布区域",
    sections_num: "各区域探头数量",
    problem_nums: "故障探头编号（可选）",
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
        <h3 className="text-xl font-bold mb-6 text-gray-800">请确认以下信息</h3>
        <ul className="space-y-3">
          {Object.entries(fieldLabels).map(([key, label]) => (
            <li key={key} className="flex justify-between border-b pb-2">
              <span className="text-gray-600">{label}</span>
              <span className="font-medium text-gray-900">{data?.[key] || <span className="text-gray-400">-</span>}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-4 mt-8">
          <button
            type="button"
            className="px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            onClick={onCancel}
          >返回修改</button>
          <button
            type="button"
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            onClick={onConfirm}
          >确认生成</button>
        </div>
      </div>
    </div>
  )
} 