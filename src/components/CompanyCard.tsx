import { useState } from 'react'
import { EditCompanyDialog } from './EditCompanyDialog'
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Dialog } from '@headlessui/react'

export interface Company {
  id: string
  shortName: string
  fullName: string
  products: string[]
  alarm: number
  range?: string
  rangeConfirmed?: boolean
}

interface CompanyCardProps {
  company: Company
  onUpdate: () => void
}

export function CompanyCard({ company, onUpdate }: CompanyCardProps) {
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
      <div className="rounded-lg bg-white p-5 shadow-md transition-shadow hover:shadow-lg sm:p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{company.shortName}</h3>
            <p className="text-sm text-gray-500">{company.fullName}</p>
          </div>
          <div className="flex space-x-2">
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

        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">预警阈值：</span>
            <span className="text-sm text-gray-900">{company.alarm}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">量程：</span>
            <span className="text-sm text-gray-900">{company.range || '0-100'} %LEL</span>
            {company.rangeConfirmed ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                已确认
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                默认值待确认
              </span>
            )}
          </div>
          {!company.rangeConfirmed && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <div className="flex gap-2">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-none" />
                <p>
                  当前量程是系统默认值，仅供临时使用。请尽快编辑公司信息，确认或修改真实量程。
                </p>
              </div>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-500">产品列表：</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {company.products.map((product: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {product}
                </span>
              ))}
            </div>
          </div>
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
