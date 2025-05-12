import { z } from 'zod'

export const waitlistSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  name: z.string().min(2, '姓名至少需要2个字符').optional(),
})

export type WaitlistFormData = z.infer<typeof waitlistSchema> 