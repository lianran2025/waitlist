import { useEffect, useRef, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { SUPPORTED_ALARM_THRESHOLDS } from '@/lib/alarm-thresholds'
import { getProductConfig, validateCompanyProducts, type CompanyProductData, type ProductConfig } from '@/lib/product-config'

export interface EditableCompany extends CompanyProductData {
  id: string
  shortName: string
  fullName: string
}

type ProductRow = ProductConfig & { key: number; name: string }

export function CompanyFormDialog({ company, onClose, onSaved }: {
  company?: EditableCompany
  onClose: () => void
  onSaved: () => void
}) {
  const [shortName, setShortName] = useState(company?.shortName || '')
  const [fullName, setFullName] = useState(company?.fullName || '')
  const [rows, setRows] = useState<ProductRow[]>(() => company
    ? company.products.map((name, key) => ({ key, name, ...getProductConfig(company, name) }))
    : [{ key: 0, name: '', alarm: 25, range: '0-100', rangeConfirmed: false }])
  const [nextKey, setNextKey] = useState(rows.length)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [addedRowKey, setAddedRowKey] = useState<number | null>(null)
  const addedRowRef = useRef<HTMLDivElement>(null)
  const addedModelRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addedRowKey === null) return
    addedRowRef.current?.scrollIntoView({ block: 'nearest' })
    addedModelRef.current?.focus({ preventScroll: true })
  }, [addedRowKey])
  const updateRow = (key: number, patch: Partial<ProductRow>) => {
    setRows(current => current.map(row => row.key === key ? { ...row, ...patch } : row))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const products = rows.map(row => row.name.trim())
    const productConfigs = Object.fromEntries(rows.map((row, index) => [products[index], {
      alarm: row.alarm, range: row.range.trim(), rangeConfirmed: row.rangeConfirmed
    }]))
    try {
      if (!shortName.trim() || !fullName.trim()) throw new Error('请填写公司简称和全称')
      validateCompanyProducts({ products, productConfigs, alarm: 25 })
      setSaving(true)
      const response = await fetch(company ? `/api/companies/${company.id}` : '/api/companies', {
        method: company ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortName: shortName.trim(), fullName: fullName.trim(), products, productConfigs,
          // 公司级字段仅供旧数据兼容；新增公司以首个型号建立兼容值。
          ...(!company ? productConfigs[products[0]] : {})
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '保存失败，请重试')
      onSaved()
      onClose()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }
  const inputStyle = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Dialog open onClose={() => { if (!saving) onClose() }} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <Dialog.Panel className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="shrink-0 border-b border-gray-100 px-5 py-5 sm:px-7">
            <Dialog.Title className="text-xl font-semibold text-gray-900">{company ? '编辑公司信息' : '添加新公司'}</Dialog.Title>
            <p className="mt-1 text-sm text-gray-500">每个型号独立维护报警阈值和量程，生成证书时自动使用。</p>
          </div>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <fieldset disabled={saving} className="min-w-0 px-5 py-5 sm:px-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-gray-700">公司简称
                    <input value={shortName} onChange={e => setShortName(e.target.value)} required className={inputStyle} />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-gray-700">公司全称
                    <input value={fullName} onChange={e => setFullName(e.target.value)} required className={inputStyle} />
                  </label>
                </div>
                <div className="mb-3 mt-7 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">产品型号 <span className="text-sm font-normal text-gray-500">共 {rows.length} 个</span></h3>
                  <button type="button" onClick={() => {
                    const defaults = rows[rows.length - 1] || { alarm: company?.alarm ?? 25, range: company?.range || '0-100' }
                    setRows(current => [...current, { key: nextKey, name: '', alarm: defaults.alarm, range: defaults.range, rangeConfirmed: false }])
                    setAddedRowKey(nextKey)
                    setNextKey(current => current + 1)
                  }} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">＋ 添加型号</button>
                </div>
                <p className="mb-4 text-xs text-gray-500">新增型号预填上一型号的参数，请按设备实际参数核对。修改量程后需重新确认。</p>
                <div className="space-y-3">
                  {rows.map(row => (
                    <div key={row.key} ref={row.key === addedRowKey ? addedRowRef : undefined} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <label className="space-y-2 text-sm text-gray-700">产品型号
                          <input ref={row.key === addedRowKey ? addedModelRef : undefined} value={row.name} onChange={e => updateRow(row.key, { name: e.target.value })} required className={inputStyle} />
                        </label>
                        <label className="space-y-2 text-sm text-gray-700">报警阈值（%LEL）
                          <select value={row.alarm} onChange={e => updateRow(row.key, { alarm: Number(e.target.value) })} className={inputStyle}>
                            {!SUPPORTED_ALARM_THRESHOLDS.some(value => value === row.alarm) && <option value={row.alarm} disabled>{row.alarm}（需修改）</option>}
                            {SUPPORTED_ALARM_THRESHOLDS.map(value => <option key={value} value={value}>{value}</option>)}
                          </select>
                        </label>
                        <label className="space-y-2 text-sm text-gray-700">量程（%LEL）
                          <input value={row.range} onChange={e => updateRow(row.key, { range: e.target.value, rangeConfirmed: false })} placeholder="例如 0-100" required className={inputStyle} />
                        </label>
                        <button type="button" onClick={() => setRows(current => current.filter(item => item.key !== row.key))} aria-label={`删除型号 ${row.name || '未命名'}`} className="rounded-lg px-2 py-2.5 text-sm text-red-600 hover:bg-red-50">删除</button>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" checked={row.rangeConfirmed} onChange={e => updateRow(row.key, { rangeConfirmed: e.target.checked })} className="h-4 w-4 rounded border-gray-300 accent-blue-600" />
                        已确认该型号量程为 {row.range || '未填写'} %LEL
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="shrink-0 border-t border-gray-100 px-5 py-4 sm:px-7">
              {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" disabled={saving} onClick={onClose} className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm text-gray-700 disabled:opacity-50">取消</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
