import { Company } from '@prisma/client'
import { useState } from 'react'
import { EditCompanyDialog } from './EditCompanyDialog'
import { TrashIcon } from '@heroicons/react/24/outline'
import { Dialog } from '@headlessui/react'

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
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
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
            <span className="text-sm font-medium text-gray-500">产品列表：</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {company.products.map((product, index) => (
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
        onSuccess={onUpdate}
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
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