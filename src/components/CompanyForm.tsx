'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companySchema, type CompanyFormData } from '@/lib/validations'

export function CompanyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const [searchResult, setSearchResult] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  })

  const searchCompany = async (searchTerm: string) => {
    try {
      const response = await fetch(`/api/companies/search?term=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()
      
      if (data.company) {
        setValue('shortName', data.company.shortName)
        setValue('fullName', data.company.fullName)
        setValue('products', data.company.products)
        setValue('marketCap', data.company.marketCap)
        setSearchResult(null)
      } else {
        setValue('shortName', searchTerm)
        setSearchResult('不存在公司信息，请直接新增')
      }
    } catch (error) {
      setSearchResult('搜索失败，请重试')
    }
  }

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('提交失败')

      setSubmitStatus('success')
      reset()
    } catch (error) {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        <input
          type="text"
          id="search_fullname"
          placeholder="输入公司简称"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => searchCompany(e.target.value)}
        />
      </div>

      {searchResult && (
        <p className="text-sm text-yellow-600">{searchResult}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="shortName" className="block text-sm font-medium text-gray-700">
            公司简称
          </label>
          <input
            {...register('shortName')}
            type="text"
            id="shortName"
            className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.shortName && (
            <p className="mt-1 text-sm text-red-500">{errors.shortName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            公司全称
          </label>
          <input
            {...register('fullName')}
            type="text"
            id="fullName"
            className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="products" className="block text-sm font-medium text-gray-700">
            型号列表
          </label>
          <input
            {...register('products')}
            type="text"
            id="products"
            className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.products && (
            <p className="mt-1 text-sm text-red-500">{errors.products.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="marketCap" className="block text-sm font-medium text-gray-700">
            低报值
          </label>
          <input
            {...register('marketCap')}
            type="text"
            id="marketCap"
            className="mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.marketCap && (
            <p className="mt-1 text-sm text-red-500">{errors.marketCap.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? '提交中...' : '提交'}
        </button>

        {submitStatus === 'success' && (
          <p className="text-sm text-green-500">提交成功！</p>
        )}
        {submitStatus === 'error' && (
          <p className="text-sm text-red-500">提交失败，请稍后重试。</p>
        )}
      </form>
    </div>
  )
} 