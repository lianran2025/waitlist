import { readFileSync } from 'fs'
import path from 'path'

export interface CalibrationRecord {
  id: string
  alarm_threshold?: number
  alarm_function: string
  alarm_value_1: string
  alarm_value_2: string
  alarm_value_3: string
  alarm_action_value: string
  indication_10_value_1: string
  indication_10_value_2: string
  indication_10_value_3: string
  indication_10_avg: string
  indication_10_error: string
  indication_10_urel: string
  indication_40_value_1: string
  indication_40_value_2: string
  indication_40_value_3: string
  indication_40_avg: string
  indication_40_error: string
  indication_40_urel: string
  indication_60_value_1: string
  indication_60_value_2: string
  indication_60_value_3: string
  indication_60_avg: string
  indication_60_error: string
  indication_60_urel: string
  repeat_value_1: string
  repeat_value_2: string
  repeat_value_3: string
  repeat_value_4: string
  repeat_value_5: string
  repeat_value_6: string
  repeatability: string
  response_time_1: string
  response_time_2: string
  response_time_3: string
  response_time_avg: string
  certificate_indication_10_measured: string
  certificate_indication_10_error: string
  certificate_indication_10_urel: string
  certificate_indication_40_measured: string
  certificate_indication_40_error: string
  certificate_indication_40_urel: string
  certificate_indication_60_measured: string
  certificate_indication_60_error: string
  certificate_indication_60_urel: string
}

const CALIBRATION_RECORDS_JSON_PATH = path.join(process.cwd(), 'src/data/calibration-records.json')

function readCalibrationRecordsFromFile(): CalibrationRecord[] {
  try {
    const data = readFileSync(CALIBRATION_RECORDS_JSON_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('读取校准记录数据失败:', error)
    return []
  }
}

export const calibrationRecordsJson = {
  findMany: (): CalibrationRecord[] => {
    return readCalibrationRecordsFromFile()
  },

  findUnique: (options: { where: { id: string } }): CalibrationRecord | null => {
    const records = readCalibrationRecordsFromFile()
    return records.find(record => record.id === options.where.id) || null
  },

  findRandom: (): CalibrationRecord | null => {
    const records = readCalibrationRecordsFromFile()
    if (records.length === 0) return null

    const index = Math.floor(Math.random() * records.length)
    return records[index]
  },

  findRandomByAlarmThreshold: (alarmThreshold: number): CalibrationRecord | null => {
    const records = readCalibrationRecordsFromFile()
    const matchingRecords = records.filter(record => record.alarm_threshold === alarmThreshold)
    const fallbackRecords = records.filter(record => record.alarm_threshold === 25)
    const availableRecords = matchingRecords.length > 0
      ? matchingRecords
      : fallbackRecords.length > 0
        ? fallbackRecords
        : records
    if (availableRecords.length === 0) return null

    const index = Math.floor(Math.random() * availableRecords.length)
    return availableRecords[index]
  }
}
