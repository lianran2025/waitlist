"use client"

import { useState, useEffect, useRef } from "react"
import Select from 'react-select'
import { Fragment } from "react"

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
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmData, setConfirmData] = useState<any>(null)
  const [errorModal, setErrorModal] = useState("")
  const [zipName, setZipName] = useState('证书.zip')
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [mergeDone, setMergeDone] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

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
      return
    }
    const company = companies.find(c => c.fullname === option.value)
    setSelectedCompany(company.fullname)
    setSelectedCompanyOption(option)
    setModels(company.list)
    setSelectedModel(company.list[0] || "")
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value)
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

    // 日期格式化处理
    const rawDate = formData.get("date") as string
    if (rawDate) {
      // 兼容 '2025-05-29' 或 '2025/05/29'，转为 '20250529'
      const formattedDate = rawDate.replace(/[-/]/g, "")
      formData.set("date", formattedDate)
    }

    // 新增：将 alert_factory 和 alert_type 加入表单
    formData.set("alert_factory", selectedCompany)
    formData.set("alert_type", selectedModel)

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
    setConfirmData(dataObj)
    setShowConfirmModal(true)
    setLoading(false)
  }

  // 轮询进度
  const pollProgress = (taskId: string) => {
    setPolling(true);
    setProgress(20); // 开始时设置为20%
    setProgressText('后台正在处理，请耐心等待...');
    setMergeDone(false);
    setErrorCount(0);
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`http://139.196.115.44:5000/progress/${taskId}`);
        if (!resp.ok) throw new Error('进度查询失败');
        const data = await resp.json();
        setErrorCount(0); // 成功则清零
        
        // 同步日志
        setLogs(data.logs || []);
        
        // 简化的进度显示逻辑
        let progressText = '后台正在处理，请耐心等待...';
        let progressValue = 20;
        
        // 根据任务状态更新进度
        if (data.total > 0 && data.current < data.total) {
          // 转换阶段
          progressText = `正在转换第 ${data.current} / ${data.total} 个文件`;
          progressValue = 20 + Math.round((data.current / data.total) * 40); // 20% - 60%
        } else if (data.convert_done && !data.merge_done) {
          // 合并阶段
          progressText = '正在合并PDF文件...';
          progressValue = 70;
        } else if (data.merge_done && !data.package_done) {
          // 打包阶段
          progressText = '正在生成完整压缩包...';
          progressValue = 85;
        } else if (data.done) {
          // 全部完成
          progressText = '处理完成，可以下载了！';
          progressValue = 100;
        }
        
        setProgress(progressValue);
        setProgressText(progressText);
        
        // 只有在真正完成时才显示下载按钮
        if (data.done) {
          setTimeout(() => setMergeDone(true), 1000);
          clearInterval(pollingRef.current!);
          setPolling(false);
        }
        
      } catch (e) {
        setErrorCount(cnt => {
          if (cnt >= 2) {
            setProgressText('后台连接中断，请检查网络或刷新页面重试');
            clearInterval(pollingRef.current!);
            setPolling(false);
          } else {
            setProgressText('网络异常，正在重试...');
          }
          return cnt + 1;
        });
      }
    }, 2000); // 改为2秒轮询一次，减少服务器压力
  };

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
    
    try {
      const formData = new FormData()
      Object.entries(confirmData).forEach(([k, v]) => formData.append(k, v as string))
      
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
      let taskId = data.taskId;
      if (!taskId) {
        // 尝试从 docxZipUrl 或 pdfUrl 中解析
        const match = (data.docxZipUrl || data.pdfUrl || '').match(/download\/(.*?)\//);
        if (match) taskId = match[1];
      }
      
      setTaskId(taskId);
      setDownloadUrl(data.docxZipUrl)
      setPdfUrl(data.pdfUrl)
      setCompleteZipUrl(data.completeZipUrl)
      setZipFileName(data.zipFileName || '证书包.zip')
      
      // 启动进度轮询
      if (taskId) {
        setProgress(15)
        setProgressText('证书已生成，正在启动后台处理...')
        // 稍微延迟启动轮询，让后台任务有时间初始化
        setTimeout(() => pollProgress(taskId), 1000);
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
        <form id="generateForm" className="space-y-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">委托单位名称</label>
              <input 
                type="text" 
                id="company_name" 
                name="company_name" 
                required 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                placeholder="请输入委托单位名称" 
              />
            </div>
            <div>
              <label htmlFor="alert_factory" className="block text-sm font-medium text-gray-700 mb-2">公司名称</label>
              <Select
                inputId="alert_factory"
                name="alert_factory"
                value={selectedCompanyOption}
                onChange={handleCompanyChange}
                options={companies.map(c => ({ label: c.fullname, value: c.fullname }))}
                classNamePrefix="react-select"
                placeholder="请输入或搜索公司名称..."
                isSearchable
                isClearable
                styles={{
                  control: (base, state) => ({ ...base, minHeight: '48px', borderRadius: '0.5rem', borderColor: companyError ? '#ef4444' : '#d1d5db', boxShadow: 'none' }),
                  menu: (base) => ({ ...base, zIndex: 20 }),
                }}
              />
              <p className="mt-2 text-sm text-gray-500">可输入关键字快速搜索公司</p>
              {companyError && <p className="mt-1 text-sm text-red-500">{companyError}</p>}
            </div>
            <div>
              <label htmlFor="alert_type" className="block text-sm font-medium text-gray-700 mb-2">品牌型号</label>
              <select 
                id="alert_type" 
                name="alert_type" 
                value={selectedModel} 
                onChange={handleModelChange} 
                required 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="all_nums" className="block text-sm font-medium text-gray-700 mb-2">探头总数量</label>
              <input 
                type="number" 
                id="all_nums" 
                name="all_nums" 
                required 
                min={1} 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                placeholder="请输入探头总数" 
              />
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">检测日期</label>
              <input 
                type="date" 
                id="date" 
                name="date" 
                required 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                defaultValue={new Date().toISOString().split('T')[0]} 
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
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                placeholder="请输入起始编号" 
                defaultValue="1" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">温度（°C）</label>
              <input 
                type="number" 
                id="temperature" 
                name="temperature" 
                step="0.1" 
                required 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
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
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                placeholder="如: 50" 
                defaultValue="50" 
              />
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <label htmlFor="sections" className="block text-sm font-medium text-gray-700 mb-2">
                探头分布区域 <span className="text-gray-500 text-sm">(可选)</span>
              </label>
              <input 
                type="text" 
                id="sections" 
                name="sections" 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                placeholder="例如：厨房 大厅 或 厨房,大厅 (留空则不按区域分布)" 
              />
              <p className="mt-1 text-sm text-gray-500">
                留空时将所有探头视为一个整体，不按区域分布
              </p>
            </div>
            <div>
              <label htmlFor="sections_num" className="block text-sm font-medium text-gray-700 mb-2">各区域探头数量</label>
              <input 
                type="text" 
                id="sections_num" 
                name="sections_num" 
                required 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                placeholder="例如：4 6 或 4,6 (区域为空时只填总数量)" 
              />
              <p className="mt-1 text-sm text-gray-500">
                如果区域为空，只需填写总数量；如果有区域，需要与区域数量对应
              </p>
            </div>
            <div>
              <label htmlFor="problem_nums" className="block text-sm font-medium text-gray-700 mb-2">故障探头编号（可选）</label>
              <input
                type="text"
                id="problem_nums"
                name="problem_nums"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="如 1-3 5 7-8"
              />
              <p className="mt-2 text-sm text-gray-500">支持区间和空格分隔，如 1-3 5 7-8</p>
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
            {polling && (
              <div className="mt-2 flex items-center justify-center text-xs text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                实时监控中...
              </div>
            )}
          </div>
        )}
        {/* 处理日志展示区 - 只在轮询时显示 */}
        {polling && logs.length > 0 && (
          <div className="mt-4">
            <details className="bg-gray-50 rounded-lg">
              <summary className="px-3 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 rounded-lg">
                查看处理详情 ({logs.length} 条记录)
              </summary>
              <div className="px-3 pb-3 max-h-40 overflow-y-auto text-xs font-mono text-gray-700 space-y-1">
                {logs.slice(-10).map((log, idx) => (
                  <div key={idx} className="py-1 border-b border-gray-200 last:border-b-0">
                    {log}
                  </div>
                ))}
              </div>
            </details>
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
              target="_blank"
              rel="noopener noreferrer"
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