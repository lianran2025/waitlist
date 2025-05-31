"use client"

import { useState, useEffect } from "react"

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [downloadUrl, setDownloadUrl] = useState("")
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState("")

  useEffect(() => {
    fetch("/api/companies/data")
      .then(res => res.json())
      .then(data => {
        setCompanies(data)
        if (data.length > 0) {
          setSelectedCompany(data[0].fullname)
          setModels(data[0].list)
          setSelectedModel(data[0].list[0] || "")
        }
      })
  }, [])

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const company = companies.find(c => c.fullname === e.target.value)
    setSelectedCompany(company.fullname)
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
    const form = e.currentTarget
    const formData = new FormData(form)

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

    // 前端校验
    const allNums = parseInt(formData.get("all_nums") as string)
    const sections = (formData.get("sections") as string).split(/[,，\s]+/).filter(Boolean)
    const sectionsNum = (formData.get("sections_num") as string).split(/[,，\s]+/).map(Number).filter(n => !isNaN(n))
    if (sections.length === 0 || sectionsNum.length === 0) {
      setMessage("请填写探头分布区域和对应的数量")
      setLoading(false)
      return
    }
    if (sections.length !== sectionsNum.length) {
      setMessage(`区域数量与探头数量分布不匹配\n区域：${sections.join(", ")}\n数量：${sectionsNum.join(", ")}`)
      setLoading(false)
      return
    }
    const totalProbes = sectionsNum.reduce((a, b) => a + b, 0)
    if (totalProbes !== allNums) {
      setMessage(`各区域探头数量之和与总数量不匹配\n总数量：${allNums}\n各区域：${sections.map((s, i) => `${s}(${sectionsNum[i]})`).join(", ")}\n数量之和：${totalProbes}`)
      setLoading(false)
      return
    }

    try {
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
      setMessage("证书已生成，点击下载 zip 文件")
    } catch (error: any) {
      setMessage(error.message || "生成证书失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xl">
        <h2 className="text-2xl font-bold mb-6">证书生成工具</h2>
        <form id="generateForm" className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="company_name" className="block font-medium mb-1">委托单位名称</label>
            <input type="text" id="company_name" name="company_name" required className="w-full border rounded px-3 py-2" placeholder="请输入委托单位名称" />
          </div>
          <div>
            <label htmlFor="alert_factory" className="block font-medium mb-1">公司名称</label>
            <select id="alert_factory" name="alert_factory" value={selectedCompany} onChange={handleCompanyChange} required className="w-full border rounded px-3 py-2">
              {companies.map(c => (
                <option key={c.fullname} value={c.fullname}>{c.fullname}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="alert_type" className="block font-medium mb-1">品牌型号</label>
            <select id="alert_type" name="alert_type" value={selectedModel} onChange={handleModelChange} required className="w-full border rounded px-3 py-2">
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="all_nums" className="block font-medium mb-1">探头总数量</label>
            <input type="number" id="all_nums" name="all_nums" required min={1} className="w-full border rounded px-3 py-2" placeholder="请输入探头总数" />
          </div>
          <div>
            <label htmlFor="date" className="block font-medium mb-1">检测日期</label>
            <input type="date" id="date" name="date" required className="w-full border rounded px-3 py-2" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="temperature" className="block font-medium mb-1">温度（°C）</label>
              <input type="number" id="temperature" name="temperature" step="0.1" required className="w-full border rounded px-3 py-2" placeholder="如: 20.0" defaultValue="20.0" />
            </div>
            <div className="flex-1">
              <label htmlFor="humidity" className="block font-medium mb-1">湿度（%）</label>
              <input type="number" id="humidity" name="humidity" required min={0} max={100} className="w-full border rounded px-3 py-2" placeholder="如: 50" defaultValue="50" />
            </div>
          </div>
          <div>
            <label htmlFor="sections" className="block font-medium mb-1">探头分布区域</label>
            <input type="text" id="sections" name="sections" required className="w-full border rounded px-3 py-2" placeholder="例如：厨房 大厅 或 厨房,大厅" />
          </div>
          <div>
            <label htmlFor="sections_num" className="block font-medium mb-1">各区域探头数量</label>
            <input type="text" id="sections_num" name="sections_num" required className="w-full border rounded px-3 py-2" placeholder="例如：4 6 或 4,6" />
          </div>
          <div>
            <label htmlFor="start_num" className="block font-medium mb-1">探头起始编号</label>
            <input type="number" id="start_num" name="start_num" required min={1} className="w-full border rounded px-3 py-2" placeholder="请输入起始编号" defaultValue="1" />
          </div>
          <div>
            <label htmlFor="problem_nums" className="block font-medium mb-1">故障探头编号（可选）</label>
            <input
              type="text"
              id="problem_nums"
              name="problem_nums"
              className="w-full border rounded px-3 py-2"
              placeholder="如 1-3 5 7-8"
            />
            <p className="text-xs text-gray-500">支持区间和空格分隔，如 1-3 5 7-8</p>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-300" disabled={loading}>
            {loading ? "生成中..." : "生成证书"}
          </button>
        </form>
        {message && <div className="mt-4 text-center text-blue-600">{message}</div>}
        {downloadUrl && (
          <div className="mt-4 text-center">
            <a href={downloadUrl} download="certificates.zip" className="text-blue-500 underline">下载证书 zip 文件</a>
          </div>
        )}
      </div>
    </div>
  )
} 