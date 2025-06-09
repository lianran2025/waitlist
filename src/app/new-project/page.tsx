"use client"

import { useState, useEffect } from "react"
import Select from 'react-select'
import { Fragment } from "react"

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [downloadUrl, setDownloadUrl] = useState("")
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

    // 新增：分布区域与数量一一对应校验（空格分隔）
    const sections = (formData.get("sections") as string).trim().split(/\s+/).filter(Boolean)
    // 支持多分隔符：空格、英文逗号、中文逗号
    const sectionsNumRaw = formData.get("sections_num") as string
    const sectionsNumArr = sectionsNumRaw.trim().split(/[\s,，]+/).filter(Boolean)
    if (sections.length !== sectionsNumArr.length) {
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

  // 真正生成证书的逻辑，原 handleSubmit 的 try-catch 部分
  const handleConfirmGenerate = async () => {
    setShowConfirmModal(false)
    setLoading(true)
    setMessage("")
    setDownloadUrl("")
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
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)
      // 动态设置压缩包名称：委托单位名称+日期.zip
      const company = confirmData?.company_name || '证书'
      const date = confirmData?.date || ''
      setZipName(`${company} ${date}.zip`)
      setMessage("证书已生成，点击下载 zip 文件")
    } catch (error: any) {
      setErrorModal(error.message || "生成证书失败")
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
              <label htmlFor="sections" className="block text-sm font-medium text-gray-700 mb-2">探头分布区域</label>
              <input 
                type="text" 
                id="sections" 
                name="sections" 
                required 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                placeholder="例如：厨房 大厅 或 厨房,大厅" 
              />
            </div>
            <div>
              <label htmlFor="sections_num" className="block text-sm font-medium text-gray-700 mb-2">各区域探头数量</label>
              <input 
                type="text" 
                id="sections_num" 
                name="sections_num" 
                required 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                placeholder="例如：4 6 或 4,6" 
              />
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
        {message && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-blue-600 text-center">
            {message}
          </div>
        )}
        {downloadUrl && (
          <div className="mt-6 text-center">
            <a 
              href={downloadUrl} 
              download={zipName}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              下载证书 zip 文件
            </a>
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