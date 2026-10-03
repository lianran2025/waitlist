// 本次检测可选择的报警阈值；新增档位前须补充对应校准数据。
export const SUPPORTED_ALARM_THRESHOLDS = [10, 15, 20, 25] as const

export function isSupportedAlarmThreshold(value: number): boolean {
  return SUPPORTED_ALARM_THRESHOLDS.some(threshold => threshold === value)
}
