import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface CreateCompanyDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormErrors {
  shortName?: string
  fullName?: string
  products?: string
  alarm?: string
}

export function CreateCompanyDialog({ isOpen, onClose, onSuccess }: CreateCompanyDialogProps) {
  const [formData, setFormData] = useState({
    shortName: '',
    fullName: '',
    products: '',
    alarm: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.shortName.trim()) {
      newErrors.shortName = '请输入公司简称'
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = '请输入公司全称'
    }
    if (!formData.products.trim()) {
      newErrors.products = '请输入产品列表'
    }
    if (!formData.alarm.trim()) {
      newErrors.alarm = '请输入预警阈值'
    } else if (isNaN(Number(formData.alarm)) || Number(formData.alarm) < 0) {
      newErrors.alarm = '预警阈值必须为非负数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          alarm: Number(formData.alarm),
          products: formData.products.split(',').map(p => p.trim()).filter(Boolean)
        }),
      })

      if (!response.ok) {
        throw new Error('创建公司失败')
      }

      onSuccess()
      onClose()
      setFormData({
        shortName: '',
        fullName: '',
        products: '',
        alarm: ''
      })
      setErrors({})
    } catch (error) {
      console.error('Error creating company:', error)
      alert('创建公司失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      shortName: '',
      fullName: '',
      products: '',
      alarm: ''
    })
    setErrors({})
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-2xl rounded-xl bg-white p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              添加新公司
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="shortName" className="block text-sm font-medium text-gray-700 mb-1">
                公司简称
              </label>
              <input
                type="text"
                id="shortName"
                value={formData.shortName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, shortName: e.target.value }))
                  if (errors.shortName) {
                    setErrors(prev => ({ ...prev, shortName: undefined }))
                  }
                }}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.shortName ? 'border-red-300' : 'border-gray-300'
                }`}
                style={{ height: '42px', padding: '0.75rem 1rem' }}
              />
              {errors.shortName && (
                <p className="mt-1 text-sm text-red-600">{errors.shortName}</p>
              )}
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                公司全称
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fullName: e.target.value }))
                  if (errors.fullName) {
                    setErrors(prev => ({ ...prev, fullName: undefined }))
                  }
                }}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.fullName ? 'border-red-300' : 'border-gray-300'
                }`}
                style={{ height: '42px', padding: '0.75rem 1rem' }}
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="products" className="block text-sm font-medium text-gray-700 mb-1">
                产品列表（用逗号分隔）
              </label>
              <input
                type="text"
                id="products"
                value={formData.products}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, products: e.target.value }))
                  if (errors.products) {
                    setErrors(prev => ({ ...prev, products: undefined }))
                  }
                }}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.products ? 'border-red-300' : 'border-gray-300'
                }`}
                style={{ height: '42px', padding: '0.75rem 1rem' }}
              />
              {errors.products && (
                <p className="mt-1 text-sm text-red-600">{errors.products}</p>
              )}
            </div>

            <div>
              <label htmlFor="alarm" className="block text-sm font-medium text-gray-700 mb-1">
                预警阈值
              </label>
              <input
                type="number"
                id="alarm"
                value={formData.alarm}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, alarm: e.target.value }))
                  if (errors.alarm) {
                    setErrors(prev => ({ ...prev, alarm: undefined }))
                  }
                }}
                min="0"
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.alarm ? 'border-red-300' : 'border-gray-300'
                }`}
                style={{ height: '42px', padding: '0.75rem 1rem' }}
              />
              {errors.alarm && (
                <p className="mt-1 text-sm text-red-600">{errors.alarm}</p>
              )}
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '创建中...' : '创建'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
} 