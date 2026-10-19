import { useState } from 'react'
import { EditCompanyDialog } from './EditCompanyDialog'
import { TrashIcon } from '@heroicons/react/24/outline'
import { Dialog } from '@headlessui/react'

import { getProductConfig } from '@/lib/product-config'
import type { EditableCompany } from './CompanyFormDialog'

export type Company = EditableCompany

interface CompanyCardProps {
  company: Company
  onUpdate: () => void
}

export function CompanyCard({ company, onUpdate }: CompanyCardProps) {
  const [selectedModel, setSelectedModel] = useState(company.products[0] || '')
  const activeModel = company.products.includes(selectedModel) ? selectedModel : company.products[0] || ''
  const config = getProductConfig(company, activeModel)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('删除公司失败')
      }

      onUpdate()
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting company:', error)
      alert('删除公司失败，请重试')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="min-w-0 rounded-lg bg-white p-5 shadow-md transition-shadow hover:shadow-lg sm:p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 pr-3">
            <h3 className="text-lg font-medium text-gray-900">{company.shortName}</h3>
            <p className="break-words text-sm text-gray-500">{company.fullName}</p>
          </div>
          <div className="flex flex-none space-x-2">
            <button
              onClick={() => setIsEditDialogOpen(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              编辑
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-600 hover:text-red-800"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-600">
            产品型号 <span className="font-normal text-gray-400">（{company.products.length} 个）</span>
            <select value={activeModel} onChange={event => setSelectedModel(event.target.value)} disabled={!company.products.length} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {!company.products.length && <option value="">暂无型号，请编辑添加</option>}
              {company.products.map(model => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
          {activeModel && <div className="rounded-lg bg-blue-50/60 px-3 py-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">型号报警阈值</p><p className="mt-1 font-medium text-gray-900">{config.alarm} %LEL</p></div>
              <div><p className="text-xs text-gray-500">型号量程</p><p className="mt-1 font-medium text-gray-900">{config.range} %LEL</p></div>
            </div>
            {!config.rangeConfirmed && <p className="mt-2 text-xs text-amber-700">该型号量程待确认，请在编辑中核对。</p>}
          </div>}
        </div>
      </div>

      <EditCompanyDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        company={company}
        onUpdate={onUpdate}
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-3 sm:p-4">
          <Dialog.Panel className="mx-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-5 shadow-xl sm:p-6">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              确认删除
            </Dialog.Title>
            <p className="text-sm text-gray-500 mb-6">
              您确定要删除 {company.shortName} 的所有数据吗？此操作无法撤销。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  )
} 
