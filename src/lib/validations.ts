import { z } from 'zod'

export const waitlistSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  name: z.string().min(2, '姓名至少需要2个字符').optional(),
})

export type WaitlistFormData = z.infer<typeof waitlistSchema>

export const companySchema = z.object({
  shortName: z.string().min(1, '请输入公司简称'),
  fullName: z.string().min(1, '请输入公司全称'),
  products: z.string().min(1, '请输入型号列表'),
  marketCap: z.string().min(1, '请输入低报值'),
})

export type CompanyFormData = z.infer<typeof companySchema> 