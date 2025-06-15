import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'

// 定义公司数据类型
export interface Company {
  id: string
  shortName: string
  fullName: string
  products: string[]
  alarm: number
  createdAt: string
  updatedAt: string
}

// JSON文件路径
const COMPANIES_JSON_PATH = path.join(process.cwd(), 'src/data/companies.json')

// 读取公司数据
function readCompaniesFromFile(): Company[] {
  try {
    const data = readFileSync(COMPANIES_JSON_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('读取公司数据失败:', error)
    return []
  }
}

// 写入公司数据
function writeCompaniesToFile(companies: Company[]): void {
  try {
    writeFileSync(COMPANIES_JSON_PATH, JSON.stringify(companies, null, 2), 'utf-8')
  } catch (error) {
    console.error('写入公司数据失败:', error)
    throw new Error('保存数据失败')
  }
}

// 生成时间字符串
function generateTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 23)
}

// 模拟Prisma的company操作接口
export const companiesJson = {
  // 查找所有公司
  findMany: (options?: {
    orderBy?: {
      createdAt?: 'desc' | 'asc'
      updatedAt?: 'desc' | 'asc'
    }
  }): Company[] => {
    const companies = readCompaniesFromFile()
    
    if (options?.orderBy) {
      const { orderBy } = options
      companies.sort((a, b) => {
        if (orderBy.createdAt) {
          const order = orderBy.createdAt === 'desc' ? -1 : 1
          return order * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        }
        if (orderBy.updatedAt) {
          const order = orderBy.updatedAt === 'desc' ? -1 : 1
          return order * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
        }
        return 0
      })
    }
    
    return companies
  },

  // 查找单个公司
  findFirst: (options: {
    where: {
      OR?: Array<{
        shortName?: { contains: string }
        fullName?: { contains: string }
      }>
      fullName?: string
      shortName?: string
    }
  }): Company | null => {
    const companies = readCompaniesFromFile()
    
    return companies.find(company => {
      if (options.where.OR) {
        return options.where.OR.some(condition => {
          if (condition.shortName?.contains) {
            return company.shortName.includes(condition.shortName.contains)
          }
          if (condition.fullName?.contains) {
            return company.fullName.includes(condition.fullName.contains)
          }
          return false
        })
      }
      
      if (options.where.fullName) {
        return company.fullName === options.where.fullName
      }
      
      if (options.where.shortName) {
        return company.shortName === options.where.shortName
      }
      
      return false
    }) || null
  },

  // 创建公司
  create: (options: {
    data: {
      shortName: string
      fullName: string
      products: string[]
      alarm: number
    }
  }): Company => {
    const companies = readCompaniesFromFile()
    const now = generateTimestamp()
    
    const newCompany: Company = {
      id: nanoid(),
      shortName: options.data.shortName,
      fullName: options.data.fullName,
      products: options.data.products,
      alarm: options.data.alarm,
      createdAt: now,
      updatedAt: now
    }
    
    companies.push(newCompany)
    writeCompaniesToFile(companies)
    
    return newCompany
  },

  // 更新公司
  update: (options: {
    where: { id: string }
    data: {
      shortName?: string
      fullName?: string
      products?: string[]
      alarm?: number
    }
  }): Company => {
    const companies = readCompaniesFromFile()
    const companyIndex = companies.findIndex(c => c.id === options.where.id)
    
    if (companyIndex === -1) {
      throw new Error('公司不存在')
    }
    
    const updatedCompany = {
      ...companies[companyIndex],
      ...options.data,
      updatedAt: generateTimestamp()
    }
    
    companies[companyIndex] = updatedCompany
    writeCompaniesToFile(companies)
    
    return updatedCompany
  },

  // 删除公司
  delete: (options: { where: { id: string } }): Company => {
    const companies = readCompaniesFromFile()
    const companyIndex = companies.findIndex(c => c.id === options.where.id)
    
    if (companyIndex === -1) {
      throw new Error('公司不存在')
    }
    
    const deletedCompany = companies[companyIndex]
    companies.splice(companyIndex, 1)
    writeCompaniesToFile(companies)
    
    return deletedCompany
  },

  // 查找公司（通过ID）
  findUnique: (options: { where: { id: string } }): Company | null => {
    const companies = readCompaniesFromFile()
    return companies.find(c => c.id === options.where.id) || null
  }
} 