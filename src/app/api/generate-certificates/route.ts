import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import axios from 'axios'
import FormData from 'form-data'
import { companiesJson } from '@/lib/companies-json'
import { calibrationRecordsJson } from '@/lib/calibration-records-json'

const DEFAULT_ALERT_NUM_PLACE = '委托方现场';

function getBackendErrorMessage(error: any, action: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const backendMessage = error.response?.data?.error || error.response?.data?.message;

    if (error.code === 'ECONNABORTED') {
      return `Windows 后端${action}超时，请检查 Flask 终端是否卡住，必要时重启 Flask 后再试`;
    }

    if (error.code === 'ECONNREFUSED') {
      return `无法连接 Windows 后端，请确认 Flask 已启动并监听 ${process.env.WINDOWS_API_URL || 'http://127.0.0.1:5000'}`;
    }

    if (status) {
      return `Windows 后端${action}失败（HTTP ${status}）${backendMessage ? `：${backendMessage}` : ''}`;
    }

    return `Windows 后端${action}失败：${error.message}`;
  }

  return `Windows 后端${action}失败：${error?.message || String(error)}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const companyName = formData.get('company_name') as string
    const allNums = parseInt(formData.get('all_nums') as string)
    const date = formData.get('date') as string
    const temperature = formData.get('temperature') as string
    const humidity = formData.get('humidity') as string
    const liangcheng = (formData.get('liangcheng') as string) || '0-100'
    
    // 添加调试信息
    console.log('[后端API] 收到的日期参数:', date, typeof date)
    const sectionsRaw = (formData.get('sections') as string || '').trim()
    const sections = sectionsRaw ? sectionsRaw.split(/[,，\s]+/).filter(Boolean) : ['']
    const sectionsNum = (formData.get('sections_num') as string).split(/[,，\s]+/).map(Number).filter(n => !isNaN(n))
    const startNum = parseInt(formData.get('start_num') as string)
    const alertFactory = formData.get('alert_factory') as string;
    const alertType = formData.get('alert_type') as string;
    const problemNumsRaw = formData.get('problem_nums') as string | null;
    const gas = formData.get('gas') as string;
    const convertToPdf = formData.get('convert_to_pdf') === 'true';

    // 根据gas值设置gas_num和REL
    let gas_num: string;
    let REL: string;
    const qiju = gas === '甲烷' ? '可燃气体检测报警器' : `可燃气体检测报警器（${gas}）`;
    if (gas === '甲烷') {
      gas_num = 'GBW(E)061662';
      REL = '1.5%';
    } else if (gas === '丙烷') {
      gas_num = 'GBW(E)061853';
      REL = '1%';
    } else {
      gas_num = 'GBW(E)061662'; // 默认值
      REL = '1.5%'; // 默认值
    }

    // 校验
    if (!companyName || !allNums || !date || !temperature || !humidity || !sectionsNum.length || isNaN(startNum) || !gas) {
      return new Response(JSON.stringify({ message: '参数不完整' }), { status: 400 })
    }
    
    // 如果区域为空，只允许一个数量值
    if (sectionsRaw === '' && sectionsNum.length !== 1) {
      return new Response(JSON.stringify({ message: '探头分布区域为空时，只能填写一个总数量值' }), { status: 400 })
    }
    
    // 如果区域不为空，需要与数量一一对应
    if (sectionsRaw !== '' && sections.length !== sectionsNum.length) {
      return new Response(JSON.stringify({ message: '区域数量与探头数量分布不匹配' }), { status: 400 })
    }
    const totalProbes = sectionsNum.reduce((a, b) => a + b, 0)
    if (totalProbes !== allNums) {
      return new Response(JSON.stringify({ message: '各区域探头数量之和与总数量不匹配' }), { status: 400 })
    }

    // 辅助函数
    function formatDate(dateStr: string): [string, string] {
      // 输入验证
      if (!dateStr || typeof dateStr !== 'string' || !/^\d{8}$/.test(dateStr)) {
        console.error('Invalid date format:', dateStr);
        throw new Error('日期格式必须为8位数字字符串，例如：20230614');
      }

      const year = parseInt(dateStr.slice(0, 4));
      const month = parseInt(dateStr.slice(4, 6)) - 1;
      const day = parseInt(dateStr.slice(6, 8));

      // 日期有效性验证
      const date = new Date(year, month, day);
      if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        console.error('Invalid date values:', { year, month, day });
        throw new Error('无效的日期值');
      }

      const formatted = `${year} 年 ${String(month + 1).padStart(2, '0')} 月 ${String(day).padStart(2, '0')} 日`;
      
      // 计算校准日期：检测日期后一天
      const secondDate = new Date(date);
      secondDate.setDate(secondDate.getDate() + 1);
      const formattedSecond = `${secondDate.getFullYear()} 年 ${String(secondDate.getMonth() + 1).padStart(2, '0')} 月 ${String(secondDate.getDate()).padStart(2, '0')} 日`;

      return [formatted, formattedSecond];
    }

    function returnFormatNum(num: number): string {
      num = Number(num);
      if (num < 10) return `000${num}`;
      if (num < 100) return `00${num}`;
      if (num < 1000) return `0${num}`;
      return `${num}`;
    }

    function returnFormatNum3(num: number): string {
      num = Number(num);
      if (num < 10) return `00${num}`;
      if (num < 100) return `0${num}`;
      return `${num}`;
    }

    function getFileNum(date: string, num: number, startNum: number): string {
      const serialNum = returnFormatNum(Number(num) + Number(startNum));
      return `ZJYX-${date}${serialNum}`;
    }

    function formatSignedDecimal(value: string | undefined, fallback = '0.0'): string {
      const rawValue = value || fallback;
      const numericValue = Number(rawValue);

      if (Number.isNaN(numericValue)) {
        return rawValue;
      }

      if (numericValue > 0 && !rawValue.trim().startsWith('+')) {
        return `+${rawValue}`;
      }

      return rawValue;
    }

    function formatIntegerValue(value: string | undefined, fallback: string): string {
      const numericValue = Number(value || fallback);

      if (Number.isNaN(numericValue)) {
        return value || fallback;
      }

      return String(Math.round(numericValue));
    }

    function createAllAlertsNumList(sections: string[], sectionsNum: number[]): { place: string, num: string }[] {
      const allAlertsNum: { place: string, num: string }[] = [];
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim() || DEFAULT_ALERT_NUM_PLACE;
        for (let j = 0; j < Number(sectionsNum[i]); j++) {
          const numStr = returnFormatNum3(Number(j + 1));
          allAlertsNum.push({ place: section, num: numStr });
        }
      }
      return allAlertsNum;
    }

    function parseProblemNums(input: string): string[] {
      if (!input) return [];
      const result: string[] = [];
      input.split(/\s+/).forEach(part => {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n, 10));
          for (let i = start; i <= end; i++) {
            result.push(i.toString().padStart(3, '0'));
          }
        } else if (part) {
          result.push(parseInt(part, 10).toString().padStart(3, '0'));
        }
      });
      return result;
    }

    async function renderDocxTemplate(templatePath: string, data: Record<string, any>): Promise<Buffer> {
      const templateBuffer = await fs.readFile(templatePath);
      const content = new PizZip(templateBuffer);
      const doc = new Docxtemplater(content, { 
        paragraphLoop: true, 
        linebreaks: true,
        delimiters: {
          start: '{{',
          end: '}}'
        }
      });

      try {
        doc.render(data);
      } catch (err) {
        const errorMsg = (err as Error).message || String(err);
        console.error('模板渲染错误:', errorMsg);
        throw new Error('模板渲染失败: ' + errorMsg);
      }

      return doc.getZip().generate({ type: 'nodebuffer' });
    }

    const problemNums = parseProblemNums(problemNumsRaw || '');
    
    // 根据公司名称（alert_factory）查询公司信息，获取 alarm 值
    let alarmValue = 25; // 默认值
    if (alertFactory) {
      const company = companiesJson.findFirst({
        where: {
          fullName: alertFactory
        }
      });
      
      if (company && company.alarm) {
        alarmValue = company.alarm;
        console.log(`[动作值查询] 公司: ${alertFactory}, 动作值: ${alarmValue}`);
      } else {
        // 如果精确匹配失败，尝试模糊匹配
        const companyFuzzy = companiesJson.findFirst({
          where: {
            OR: [
              { fullName: { contains: alertFactory } },
              { shortName: { contains: alertFactory } }
            ]
          }
        });
        
        if (companyFuzzy && companyFuzzy.alarm) {
          alarmValue = companyFuzzy.alarm;
          console.log(`[动作值查询] 模糊匹配成功 - 公司: ${alertFactory}, 匹配到: ${companyFuzzy.fullName}, 动作值: ${alarmValue}`);
        } else {
          console.warn(`[动作值查询] 未找到公司: ${alertFactory}，使用默认值: ${alarmValue}`);
        }
      }
    }
    
    const allAlertNums = createAllAlertsNumList(sections, sectionsNum);
    console.log(`[证书生成] 开始生成 DOCX，公司=${companyName}，探头数=${allNums}，每个正常探头额外生成打印版证书`);

    // 1. 生成所有 docx，随后统一上传到 Windows 后端服务
    const docxBuffers: { name: string, buffer: Buffer }[] = [];
    for (let i = 0; i < allNums; i++) {
      const itemStart = Date.now();
      const [date_now, date_second] = formatDate(String(date));
      const fileNum = getFileNum(String(date), i, startNum);
      const alertInfo = allAlertNums[i] || { place: DEFAULT_ALERT_NUM_PLACE, num: `未知${returnFormatNum(i + startNum)}` };
      const alertNum = alertInfo.num;
      const alertNumPlace = alertInfo.place || DEFAULT_ALERT_NUM_PLACE;
      // 判断当前编号是否为故障编号（仅根据文件编号后三位判断）
      const isProblem = problemNums.includes(fileNum.slice(-3));
      const calibrationRecord = calibrationRecordsJson.findRandomByAlarmThreshold(alarmValue);

      const certificateTemplatePath = isProblem
        ? path.join(process.cwd(), 'templates', 'problem.docx')
        : path.join(process.cwd(), 'templates', 'new_templates', 'new_normal.docx');
      const printCertificateTemplatePath = path.join(process.cwd(), 'templates', 'new_templates', 'new_normal_02.docx');
      const recordTemplatePath = path.join(process.cwd(), 'templates', 'new_templates', 'jilu.docx');
      const alarmActionValue = calibrationRecord?.alarm_action_value || String(alarmValue);
      const repeatabilityValue = calibrationRecord?.repeatability || '0.4';
      const responseTime1Value = formatIntegerValue(calibrationRecord?.response_time_1, '15');
      const responseTime2Value = formatIntegerValue(calibrationRecord?.response_time_2, '15');
      const responseTime3Value = formatIntegerValue(calibrationRecord?.response_time_3, '15');
      const responseTimeAvgValue = formatIntegerValue(calibrationRecord?.response_time_avg, '15');

      const data = {
        ...(calibrationRecord || {}),
        indication_10_error: formatSignedDecimal(calibrationRecord?.indication_10_error),
        indication_40_error: formatSignedDecimal(calibrationRecord?.indication_40_error),
        indication_60_error: formatSignedDecimal(calibrationRecord?.indication_60_error),
        certificate_indication_10_error: formatSignedDecimal(calibrationRecord?.certificate_indication_10_error),
        certificate_indication_40_error: formatSignedDecimal(calibrationRecord?.certificate_indication_40_error),
        certificate_indication_60_error: formatSignedDecimal(calibrationRecord?.certificate_indication_60_error),
        response_time_1: responseTime1Value,
        response_time_2: responseTime2Value,
        response_time_3: responseTime3Value,
        response_time_avg: responseTimeAvgValue,
        file_num: fileNum,
        company_name: companyName,
        alert_type: alertType,
        alert_factory: alertFactory,
        dongzuozhi: isProblem ? '/' : alarmActionValue,
        dongzuozhi_with_unit: isProblem ? '/' : `${alarmActionValue}%LEL`,
        alert_num: alertNum,
        alert_num_place: alertNumPlace,
        date_now,
        date_second,
        temperature,
        humidity,
        liangcheng,
        random_chongfu: isProblem ? '/' : repeatabilityValue,
        random_chongfu_with_unit: isProblem ? '/' : `${repeatabilityValue}%`,
        action_time: isProblem ? '/' : responseTimeAvgValue,
        action_time_with_unit: isProblem ? '/' : `${responseTimeAvgValue}s`,
        alarm_status: isProblem ? '异常' : '正常',
        gongneng: isProblem ? '异常' : '正常',
        gas: gas,
        gas_num: gas_num,
        REL: REL,
        qiju,
      };

      try {
        console.log(`[证书生成] 渲染第 ${i + 1}/${allNums} 个探头，编号=${fileNum}，探头=${alertNumPlace ? `${alertNumPlace} ` : ''}${alertNum}，故障=${isProblem ? '是' : '否'}`);
        const certificateBuffer = await renderDocxTemplate(certificateTemplatePath, data);
        console.log(`[证书生成] 证书渲染完成，编号=${fileNum}，大小=${certificateBuffer.length} bytes`);
        const printCertificateBuffer = isProblem
          ? null
          : await renderDocxTemplate(printCertificateTemplatePath, data);
        if (printCertificateBuffer) {
          console.log(`[证书生成] 打印版证书渲染完成，编号=${fileNum}，大小=${printCertificateBuffer.length} bytes`);
        }
        const recordBuffer = await renderDocxTemplate(recordTemplatePath, data);
        console.log(`[证书生成] 原始记录渲染完成，编号=${fileNum}，大小=${recordBuffer.length} bytes，用时=${Date.now() - itemStart}ms`);
        const baseDocxName = `${fileNum}-${alertNum}`;

        docxBuffers.push({ name: `${baseDocxName}-证书.docx`, buffer: certificateBuffer });
        if (printCertificateBuffer) {
          docxBuffers.push({ name: `${baseDocxName}-证书（打印版）.docx`, buffer: printCertificateBuffer });
        }
        docxBuffers.push({ name: `${baseDocxName}-原始记录.docx`, buffer: recordBuffer });
      } catch (err) {
        const errorMsg = (err as Error).message || String(err);
        return new Response(JSON.stringify({ 
          message: errorMsg,
          details: err
        }), { status: 500 });
      }
    }

    // 2. 上传所有 docx 到 Windows 服务器
    const winApi = process.env.WINDOWS_API_URL || 'http://127.0.0.1:5000';

    try {
      console.log(`[证书生成] 检查 Windows 后端健康状态: ${winApi}/health`);
      await axios.get(`${winApi}/health`, { timeout: 5000 });
    } catch (error: any) {
      const message = getBackendErrorMessage(error, '健康检查');
      console.error('[证书生成] Windows 后端健康检查失败:', message);
      return new Response(JSON.stringify({
        message,
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nodeForm = new FormData();
    docxBuffers.forEach(doc => {
      nodeForm.append('files', doc.buffer, { filename: doc.name });
    });
    const totalBytes = docxBuffers.reduce((sum, doc) => sum + doc.buffer.length, 0);
    console.log(`[证书生成] DOCX 全部生成完成，开始上传到 ${winApi}/upload，文件数=${docxBuffers.length}，总大小=${totalBytes} bytes`);

    let uploadResp;
    try {
      uploadResp = await axios.post(`${winApi}/upload`, nodeForm, {
        headers: nodeForm.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 45000,
      });
    } catch (error: any) {
      const message = getBackendErrorMessage(error, '上传');
      console.error('[证书生成] 上传到 Windows 后端失败:', message);
      return new Response(JSON.stringify({
        message,
      }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log('[证书生成] 上传完成，Windows 后端返回:', uploadResp.data);
    const taskId = uploadResp.data.task_id;

    if (!taskId) {
      throw new Error('Windows 后端未返回 task_id');
    }

    // 3. 立即返回 taskId，前端可用 taskId 轮询进度
    // 生成压缩包名称：委托单位名称+简化日期格式.zip (如：XX公司20250612.zip)
    const zipFileName = `${companyName}${date}.zip`;
    
    const docxZipUrl = `/api/download/${taskId}/docx?filename=${encodeURIComponent(zipFileName)}`;
    const pdfUrl = `/api/download/${taskId}/merged`;
    const completeZipUrl = `/api/download/${taskId}/complete?filename=${encodeURIComponent(zipFileName)}`;
    
    // 4. 后台异步处理（根据convertToPdf决定是否执行PDF转换）
    setImmediate(async () => {
      try {
        if (convertToPdf) {
          console.log(`[后台] 开始转换 PDF，taskId=${taskId}`);
          await axios.post(`${winApi}/convert/${taskId}`, {}, { timeout: 300000 });
          console.log(`[后台] 转换 PDF 完成，taskId=${taskId}`);
          await axios.post(`${winApi}/merge/${taskId}`, {}, { timeout: 300000 });
          console.log(`[后台] 合并 PDF 完成，taskId=${taskId}`);
          // 生成完整压缩包（含PDF）
          await axios.post(`${winApi}/package/${taskId}`, { 
            filename: zipFileName 
          }, { timeout: 300000 });
          console.log(`[后台] 生成完整压缩包完成，taskId=${taskId}`);
        } else {
          console.log(`[后台] 跳过PDF转换，仅生成证书，taskId=${taskId}`);
          // 这里可以调用一个直接完成的API或设置状态为完成
          try {
            // 尝试调用完成接口，如果不存在则忽略
            await axios.post(`${winApi}/force-complete/${taskId}`, {}, { timeout: 30000 });
            console.log(`[后台] 标记任务完成，taskId=${taskId}`);
          } catch (e) {
            console.log(`[后台] 无force-complete接口，任务将自然完成，taskId=${taskId}`);
          }
        }
      } catch (e) {
        console.error(`[后台] 处理流程异常，taskId=${taskId}`, e);
      }
    });
    // 5. 立即响应
    return new Response(JSON.stringify({
      status: 'success',
      taskId,
      docxZipUrl,
      pdfUrl,
      completeZipUrl,
      zipFileName,
      convertToPdf
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('生成证书时出错:', error);
    return new Response(JSON.stringify({ 
      message: error.message || '生成证书失败',
      details: error
    }), { status: 500 });
  }
} 
