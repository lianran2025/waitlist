"use client"

import { useState, useEffect, useRef } from "react"
import Select from 'react-select'
import DatePicker from 'react-datepicker'
import { Fragment } from "react"
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import "react-datepicker/dist/react-datepicker.css"

export default function HomePage() {
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
  const [taskCompleted, setTaskCompleted] = useState(false);

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
    
    if (!selectedCompanyOption) {
      setCompanyError("请选择公司名称")
      setLoading(false)
      return
    }

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

    formData.set("alert_factory", selectedCompany)
    formData.set("alert_type", selectedModel)
    formData.set("gas", selectedGas)

    const sectionsRaw = (formData.get("sections") as string || "").trim()
    const sections = sectionsRaw ? sectionsRaw.split(/\s+/).filter(Boolean) : [""]
    const sectionsNumRaw = formData.get("sections_num") as string
    const sectionsNumArr = sectionsNumRaw.trim().split(/[\s,，]+/).filter(Boolean)
    
    if (sectionsRaw === "" && sectionsNumArr.length !== 1) {
      setErrorModal(`探头分布区域为空时，只能填写一个总数量值`)
      setLoading(false)
      return
    }
    
    if (sectionsRaw !== "" && sections.length !== sectionsNumArr.length) {
      setErrorModal(`分布区域数量与各区域探头数量不一致，请检查！\n区域：${sections.join(' ')}\n数量：${sectionsNumArr.join(' ')}`)
      setLoading(false)
      return
    }
    
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
          const resp = await fetch(`/api/progress/${taskId}`);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }
          const data = await resp.json();
          
          console.log(`[前端轮询] TaskId: ${taskId}`);
          console.log(`[前端轮询] 收到数据:`, data);
          console.log(`[前端轮询] 进度: ${data.progress}%, 状态: ${data.status}, 消息: ${data.message}`);
          
          setErrorCount(0);
          
          if (data.raw && data.raw.logs && Array.isArray(data.raw.logs)) {
            const backendLogs = data.raw.logs.map((log: string) => {
              return log.includes('[') ? log : `[后台] ${log}`;
            });
            setLogs(prev => {
              const combined = [...prev, ...backendLogs];
              return [...new Set(combined)];
            });
          }
          
          addLog(`📊 进度: ${data.progress}% - ${data.message}`);
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          setProgress(data.progress || 0);
          setProgressText(data.message || '');
          
          if (data.status === 'completed') {
            console.log(`[前端轮询] 检测到完成状态，停止轮询`);
            setPolling(false);
            setTaskCompleted(true);
            setMergeDone(true);
            addLog('✅ 所有任务完成！可以下载了！');
            
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            
            const baseUrl = '/api/download';
            
            let zipFileName = '证书包.zip';
            
            if (data.raw && data.raw.complete_zip_path) {
              const fullPath = data.raw.complete_zip_path;
              console.log(`[文件名提取] complete_zip_path: ${fullPath}`);
              
              const fileName = fullPath.split('\\').pop() || fullPath.split('/').pop();
              if (fileName) {
                console.log(`[文件名提取] 原始文件名: ${fileName}`);
                
                const nameMatch = fileName.match(/^[a-f0-9-]+_(.+)\.zip$/i);
                if (nameMatch) {
                  zipFileName = nameMatch[1] + '.zip';
                  console.log(`[文件名提取] 提取的显示文件名: ${zipFileName}`);
                } else {
                  zipFileName = fileName;
                  console.log(`[文件名提取] 使用原始文件名: ${zipFileName}`);
                }
              }
            }
            
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
            
            const encodedFileName = encodeURIComponent(zipFileName);
            const completeUrl = `${baseUrl}/${taskId}/complete?filename=${encodedFileName}`;
            
            console.log(`[URL生成] 原始文件名: ${zipFileName}`);
            console.log(`[URL生成] 编码后文件名: ${encodedFileName}`);
            console.log(`[URL生成] 完整下载URL: ${completeUrl}`);
            
            setCompleteZipUrl(completeUrl);
            setPdfUrl(`${baseUrl}/${taskId}/merged`);
            setDownloadUrl(`${baseUrl}/${taskId}/docx`);
            
            setZipFileName(zipFileName);
          } else if (data.status === 'error') {
            throw new Error(data.message || '处理失败');
          } else {
            console.log(`[前端轮询] 继续轮询，当前状态: ${data.status}`);
          }
        } catch (error) {
          console.error('轮询进度时出错:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          
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
          
          if (errorCount >= 4) {
            setPolling(false);
            setMessage("进度查询失败次数过多，已停止轮询");
            addLog('⚠️ 进度查询失败次数过多，已停止轮询');
            
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        }
      }, 2000);
      
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
  }, [polling, taskId, taskCompleted, errorCount, addLog]);

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
    setTaskCompleted(false)
    setMergeDone(false)
    
    try {
      const formData = new FormData()
      Object.entries(confirmData).forEach(([k, v]) => {
        if (k === 'date') {
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
      
      let currentTaskId = data.taskId;
      if (!currentTaskId) {
        const match = (data.docxZipUrl || data.pdfUrl || '').match(/download\/(.*?)\//);
        if (match) currentTaskId = match[1];
      }
      
      setTaskId(currentTaskId);
      setDownloadUrl(data.docxZipUrl)
      setPdfUrl(data.pdfUrl)
      setCompleteZipUrl(data.completeZipUrl)
      setZipFileName(data.zipFileName || '证书包.zip')
      
      if (currentTaskId) {
        setProgress(15)
        setProgressText('证书已生成，正在启动后台处理...')
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 flex flex-col items-center justify-center p-6 relative animate-gradient-shift">
      <LogoutButton />
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-4xl transform transition-all duration-700 animate-fade-in-up hover:shadow-2xl">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">证书生成工具</h2>
        <form id="generateForm" className="space-y-6" onSubmit={handleSubmit}>
          {/* 基本信息组 */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6 shadow-sm no-transform-for-datepicker transition-all duration-300 hover:shadow-lg animate-slide-in-left">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center mr-3">
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
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                />
              </div>
              <div className="relative datepicker-container">
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
                  popperClassName="super-high-z-index"
                  popperPlacement="bottom-start"
                />
              </div>
            </div>
          </div>

          {/* 设备信息组 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-1 animate-slide-in-right">
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
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
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
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                />
              </div>
            </div>
          </div>

          {/* 探头配置组 */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6 shadow-sm transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-1 animate-slide-in-left delay-100">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">探头配置</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div>
                <label htmlFor="problem_nums" className="block text-sm font-medium text-gray-700 mb-2">故障探头编号（可选）</label>
                <input
                  type="text"
                  id="problem_nums"
                  name="problem_nums"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  placeholder="如: 1-3 5 7-8"
                />
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">故障探头编号支持区间和空格分隔，如 1-3 5 7-8</p>
          </div>

          {/* 分布配置组 */}
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-6 shadow-sm transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-1 animate-slide-in-right delay-150">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">分布配置</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="sections" className="block text-sm font-medium text-gray-700 mb-2">
                  探头分布区域 <span className="text-gray-500 text-sm">(可选)</span>
                </label>
                <input 
                  type="text" 
                  id="sections" 
                  name="sections" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  placeholder="如: 厂房A 厂房B"
                />
              </div>
              <div>
                <label htmlFor="sections_num" className="block text-sm font-medium text-gray-700 mb-2">各区域探头数量</label>
                <input 
                  type="text" 
                  id="sections_num" 
                  name="sections_num" 
                  required 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                  placeholder="如: 2 3"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">
                • 区域为空时：只需填写总数量，所有探头视为一个整体
              </p>
              <p className="text-sm text-gray-500">
                • 区域不为空时：需要与区域数量一一对应，支持空格、逗号分隔
              </p>
            </div>
          </div>

          {/* 环境参数组 */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 shadow-sm transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-1 animate-slide-in-left delay-200">
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

          <div className="pt-4 animate-fade-in delay-300">
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:scale-100 transform" 
              disabled={loading}
            >
              <span className={`inline-block transition-transform duration-200 ${loading ? 'animate-pulse' : ''}`}>
                {loading ? "生成中..." : "生成证书"}
              </span>
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
                实时监控中...
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
            <h3 className="text-lg font-medium text-green-900 mb-4">处理完成！</h3>
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
          </div>
        )}

        {/* 添加指向公司列表的链接 */}
        <div className="mt-8 pt-6 border-t border-gray-200 animate-fade-in delay-300">
          <div className="text-center">
            <Link 
              href="/companies" 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-lg hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 transform border border-gray-200 hover:border-blue-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              探头厂家信息列表
        </Link>
          </div>
        </div>

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
  // 按分组组织字段
  const fieldGroups = [
    {
      title: "基本信息",
      icon: "📋",
      color: "from-gray-50 to-slate-50",
      borderColor: "border-gray-200",
      fields: {
        company_name: "委托单位名称",
        gas: "检测气体",
        date: "检测日期",
      }
    },
    {
      title: "设备信息", 
      icon: "🏭",
      color: "from-green-50 to-emerald-50",
      borderColor: "border-green-200",
      fields: {
        alert_factory: "公司名称",
        alert_type: "品牌型号",
      }
    },
    {
      title: "探头配置",
      icon: "🔧", 
      color: "from-purple-50 to-violet-50",
      borderColor: "border-purple-200",
      fields: {
        all_nums: "探头总数量",
        start_num: "探头起始编号",
        problem_nums: "故障探头编号",
      }
    },
    {
      title: "分布配置",
      icon: "📍",
      color: "from-rose-50 to-pink-50", 
      borderColor: "border-rose-200",
      fields: {
        sections: "探头分布区域",
        sections_num: "各区域探头数量",
      }
    },
    {
      title: "环境参数",
      icon: "🌡️",
      color: "from-orange-50 to-amber-50",
      borderColor: "border-orange-200", 
      fields: {
        temperature: "温度（°C）",
        humidity: "湿度（%）",
      }
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative mx-4 animate-fade-in-up">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">确认证书信息</h3>
          <p className="text-gray-600">请仔细核对以下信息，确认无误后点击生成</p>
        </div>

        {/* 分组信息展示 */}
        <div className="space-y-6 mb-8">
          {fieldGroups.map((group, groupIndex) => (
            <div key={groupIndex} className={`bg-gradient-to-r ${group.color} border ${group.borderColor} rounded-xl p-6`}>
              <div className="flex items-center mb-5">
                <span className="text-2xl mr-3">{group.icon}</span>
                <h4 className="text-lg font-semibold text-gray-800">{group.title}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(group.fields).map(([key, label]) => {
                  const value = data?.[key];
                  const displayValue = value || "-";
                  return (
                    <div key={key} className="bg-white bg-opacity-70 rounded-lg p-4 border border-white border-opacity-50">
                      <div className="text-sm font-medium text-gray-600 mb-2">{label}</div>
                      <div className={`text-base font-semibold ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 按钮区域 */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            className="px-8 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
            onClick={onCancel}
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              返回修改
            </span>
          </button>
          <button
            type="button"
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
            onClick={onConfirm}
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              确认生成证书
            </span>
          </button>
        </div>
      </div>
    </div>
  )
} 