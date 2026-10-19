import { isSupportedAlarmThreshold } from './alarm-thresholds'

export interface ProductConfig {
  alarm: number
  range: string
  rangeConfirmed: boolean
}

export interface CompanyProductData {
  products: string[]
  alarm: number
  range?: string
  rangeConfirmed?: boolean
  productConfigs?: Record<string, ProductConfig>
}

// 旧 JSON 仅在内存中补齐型号参数；读取不会改写磁盘。
export function getProductConfig(company: CompanyProductData, model: string): ProductConfig {
  const config = company.productConfigs && Object.hasOwn(company.productConfigs, model)
    ? company.productConfigs[model]
    : undefined
  return {
    alarm: config?.alarm ?? company.alarm,
    range: config?.range ?? (company.range || '0-100'),
    rangeConfirmed: config?.rangeConfirmed ?? company.rangeConfirmed ?? false
  }
}

export function getProductConfigs(company: CompanyProductData): Record<string, ProductConfig> {
  return Object.fromEntries(company.products.map(model => [model, getProductConfig(company, model)]))
}

export function isValidRange(value: string): boolean {
  const match = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/.exec(value.trim())
  return !!match && Number(match[1]) < Number(match[2])
}

export class CompanyValidationError extends Error {}

export function validateCompanyProducts(company: CompanyProductData): void {
  if (!Array.isArray(company.products) || company.products.length === 0) {
    throw new CompanyValidationError('请至少添加一个产品型号')
  }
  const names = new Set<string>()
  for (const model of company.products) {
    if (typeof model !== 'string' || !model.trim() || model !== model.trim()) {
      throw new CompanyValidationError('型号名称不能为空，且不能包含首尾空格')
    }
    if (names.has(model)) throw new CompanyValidationError(`型号重复：${model}`)
    names.add(model)
    if (company.productConfigs && Object.hasOwn(company.productConfigs, model)) {
      const stored = company.productConfigs[model]
      if (!stored || typeof stored.alarm !== 'number' || typeof stored.range !== 'string' || typeof stored.rangeConfirmed !== 'boolean') {
        throw new CompanyValidationError(`${model} 的参数不完整，请填写阈值、量程和确认状态`)
      }
    }
    const config = getProductConfig(company, model)
    if (!isSupportedAlarmThreshold(config.alarm)) {
      throw new CompanyValidationError(`${model} 的报警阈值仅支持 10、15、20、25 %LEL`)
    }
    if (typeof config.range !== 'string' || !isValidRange(config.range)) {
      throw new CompanyValidationError(`${model} 的量程应为下限小于上限的区间，例如 0-100`)
    }
    if (typeof config.rangeConfirmed !== 'boolean') {
      throw new CompanyValidationError(`${model} 的量程确认状态无效`)
    }
  }
}
