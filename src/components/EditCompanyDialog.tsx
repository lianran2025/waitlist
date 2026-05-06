import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import type { Company } from './CompanyCard'

interface EditCompanyDialogProps {
  company: Company
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function EditCompanyDialog({ company, isOpen, onClose, onUpdate }: EditCompanyDialogProps) {
  const [formData, setFormData] = useState({
    shortName: company.shortName,
    fullName: company.fullName,
    products: company.products.join('\n'),
    alarm: company.alarm,
    range: company.range || '0-100',
    rangeConfirmed: company.rangeConfirmed ?? false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          range: formData.range.trim(),
          products: formData.products.split('\n').map(p => p.trim()).filter(Boolean)
        }),
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error updating company:', error)
      alert('更新失败，请重试')
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl p-6">
          <Dialog.Title className="text-xl font-semibold mb-4">
            编辑公司信息
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                公司简称
              </label>
              <input
                type="text"
                value={formData.shortName}
                onChange={e => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                公司全称
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                产品列表（每行一个）
              </label>
              <textarea
                value={formData.products}
                onChange={e => setFormData(prev => ({ ...prev, products: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                报警阈值
              </label>
              <input
                type="number"
                value={formData.alarm}
                onChange={e => setFormData(prev => ({ ...prev, alarm: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                量程（%LEL）
              </label>
              <input
                type="text"
                value={formData.range}
                onChange={e => setFormData(prev => ({ ...prev, range: e.target.value }))}
                placeholder="例如：0-100 或 10-100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {!formData.rangeConfirmed && (
                <p className="mt-2 text-sm text-amber-700">
                  当前量程尚未确认。如果这个值是设备真实量程，请勾选下方确认项；否则请先修改。
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <input
                type="checkbox"
                checked={formData.rangeConfirmed}
                onChange={e => setFormData(prev => ({ ...prev, rangeConfirmed: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-amber-900">
                我已确认该公司的量程为 {formData.range || '0-100'} %LEL
              </span>
            </label>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                保存
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
} 
