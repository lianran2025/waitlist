'use client'

import { Company } from '@prisma/client'
import { useEffect, useState } from 'react'
import { CompanyCard } from '@/components/CompanyCard'
import { CreateCompanyDialog } from '@/components/CreateCompanyDialog'
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function HomePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      if (!response.ok) {
        throw new Error('获取公司列表失败')
      }
      const data = await response.json()
      setCompanies(data)
      setFilteredCompanies(data)
    } catch (error) {
      setError('加载公司列表失败，请刷新页面重试')
      console.error('Error fetching companies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCompanies(companies)
      return
    }

    const searchTermLower = searchTerm.toLowerCase()
    const filtered = companies.filter(company => 
      company.shortName.toLowerCase().includes(searchTermLower) ||
      company.fullName.toLowerCase().includes(searchTermLower)
    )
    setFilteredCompanies(filtered)
  }, [searchTerm, companies])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 h-48" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">越鑫检测报告公司信息</h1>
        
        {/* 搜索框 */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索公司名称或简称..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* 公司列表或空状态 */}
        {filteredCompanies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                onUpdate={fetchCompanies}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? '未找到匹配的公司' : '暂无公司信息'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? '请尝试其他搜索关键词'
                  : '点击下方按钮添加新公司'}
              </p>
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                添加新公司
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateCompanyDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={fetchCompanies}
      />
    </div>
  )
}
