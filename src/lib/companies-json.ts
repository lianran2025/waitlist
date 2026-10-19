import { readFileSync, writeFileSync, copyFileSync, renameSync, existsSync, unlinkSync } from 'fs'
import { getProductConfigs, validateCompanyProducts, CompanyValidationError, type ProductConfig } from './product-config'
import path from 'path'
import { nanoid } from 'nanoid'

// 定义公司数据类型
export interface Company {
  id: string
  shortName: string
  fullName: string
  products: string[]
  productConfigs?: Record<string, ProductConfig>
  alarm: number
  range: string
  rangeConfirmed: boolean
  createdAt: string
  updatedAt: string
}

// JSON文件路径
const COMPANIES_JSON_PATH = path.join(process.cwd(), 'src/data/companies.json')

// 读取公司数据
function readCompaniesFromFile(): Company[] {
  // 读取失败必须停止保存，避免将空数组写回并丢失生产数据。
  const companies = JSON.parse(readFileSync(COMPANIES_JSON_PATH, 'utf-8'))
  if (!Array.isArray(companies)) throw new Error('公司数据格式无效，已停止操作')
  return companies
}

function normalizeCompany(company: Company): Company {
  return {
    ...company,
    range: company.range || '0-100',
    rangeConfirmed: company.rangeConfirmed ?? false,
    productConfigs: getProductConfigs(company)
  }
}

function writeCompaniesToFile(companies: Company[]): void {
  const temporaryPath = `${COMPANIES_JSON_PATH}.${process.pid}.tmp`
  try {
    // 同目录写完后替换；保留保存前的完整文件用于恢复。
    writeFileSync(temporaryPath, JSON.stringify(companies, null, 2), 'utf-8')
    copyFileSync(COMPANIES_JSON_PATH, COMPANIES_JSON_PATH.replace(/\.json$/, '.backup.json'))
    renameSync(temporaryPath, COMPANIES_JSON_PATH)
  } catch (error) {
    console.error('写入公司数据失败:', error)
    throw new Error('保存数据失败，原数据已保留，请检查文件权限')
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath)
  }
}

function validateCompany(company: Company): void {
  if (!company.shortName?.trim() || !company.fullName?.trim()) {
    throw new CompanyValidationError('公司简称和全称不能为空')
  }
  validateCompanyProducts(company)
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
    
    return companies.map(normalizeCompany)
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
    
    const company = companies.find(company => {
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
    })
    return company ? normalizeCompany(company) : null
  },

  // 创建公司
  create: (options: {
    data: {
      shortName: string
      fullName: string
      products: string[]
      productConfigs?: Record<string, ProductConfig>
      alarm: number
      range?: string
      rangeConfirmed?: boolean
    }
  }): Company => {
    const companies = readCompaniesFromFile()
    const now = generateTimestamp()
    
    const newCompany: Company = {
      id: nanoid(),
      shortName: options.data.shortName,
      fullName: options.data.fullName,
      products: options.data.products,
      productConfigs: options.data.productConfigs,
      alarm: options.data.alarm,
      range: options.data.range || '0-100',
      rangeConfirmed: options.data.rangeConfirmed ?? false,
      createdAt: now,
      updatedAt: now
    }
    
    validateCompany(newCompany)
    if (options.data.productConfigs && options.data.products.some(model => !Object.hasOwn(options.data.productConfigs!, model))) {
      throw new CompanyValidationError('请为每个型号填写阈值和量程')
    }
    newCompany.productConfigs = getProductConfigs(newCompany)
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
      productConfigs?: Record<string, ProductConfig>
      alarm?: number
      range?: string
      rangeConfirmed?: boolean
    }
  }): Company => {
    const companies = readCompaniesFromFile()
    const companyIndex = companies.findIndex(c => c.id === options.where.id)
    
    if (companyIndex === -1) {
      throw new Error('公司不存在')
    }
    
    const updatedCompany = {
      ...companies[companyIndex],
      ...Object.fromEntries(Object.entries(options.data).filter(([, value]) => value !== undefined)),
      updatedAt: generateTimestamp()
    }
    
    if (!Array.isArray(updatedCompany.products)) throw new CompanyValidationError('产品型号列表无效')
    if (options.data.productConfigs && updatedCompany.products.some(model => !Object.hasOwn(options.data.productConfigs!, model))) {
      throw new CompanyValidationError('请为每个型号填写阈值和量程')
    }
    // 旧型号先固定为原来的参数，后续修改公司级兼容字段不联动覆盖。
    updatedCompany.productConfigs = options.data.productConfigs ?? getProductConfigs(companies[companyIndex])
    validateCompany(updatedCompany)
    updatedCompany.productConfigs = getProductConfigs(updatedCompany)
    companies[companyIndex] = updatedCompany
    writeCompaniesToFile(companies)
    
    return normalizeCompany(updatedCompany)
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
    const company = companies.find(c => c.id === options.where.id)
    return company ? normalizeCompany(company) : null
  }
} 
