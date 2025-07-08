import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import JSZip from 'jszip'
import axios from 'axios'
import FormData from 'form-data'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const companyName = formData.get('company_name') as string
    const allNums = parseInt(formData.get('all_nums') as string)
    const date = formData.get('date') as string
    const temperature = formData.get('temperature') as string
    const humidity = formData.get('humidity') as string
    
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

    // 根据gas值设置gas_num和REL
    let gas_num: string;
    let REL: string;
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
      
      // 计算下一年日期（下一年的前一天）
      const nextYear = new Date(date);
      nextYear.setFullYear(year + 1);  // 先加一年
      nextYear.setDate(nextYear.getDate() - 1);  // 再减一天
      const formattedNext = `${nextYear.getFullYear()} 年 ${String(nextYear.getMonth() + 1).padStart(2, '0')} 月 ${String(nextYear.getDate()).padStart(2, '0')} 日`;

      return [formatted, formattedNext];
    }

    function returnFormatNum(num: number): string {
      num = Number(num);
      if (num < 10) return `00${num}`;
      if (num < 100) return `0${num}`;
      return `${num}`;
    }

    function getFileNum(date: string, num: number, startNum: number): string {
      return `ZJYX-${date}0${returnFormatNum(Number(num) + Number(startNum))}`;
    }

    function createAllAlertsNumList(sections: string[], sectionsNum: number[]): string[] {
      const allAlertsNum: string[] = [];
      for (let i = 0; i < sections.length; i++) {
        for (let j = 0; j < Number(sectionsNum[i]); j++) {
          allAlertsNum.push(`${sections[i]}${returnFormatNum(Number(j + 1))}`);
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

    const problemNums = parseProblemNums(problemNumsRaw || '');
    const allAlertNums = createAllAlertsNumList(sections, sectionsNum);
    const zip = new JSZip();

    // 1. 生成所有 docx 并打包 zip（保留原有逻辑）
    const docxBuffers: { name: string, buffer: Buffer }[] = [];
    for (let i = 0; i < allNums; i++) {
      const [date_now, date_next] = formatDate(String(date));
      const fileNum = getFileNum(String(date), i, startNum);
      const alertNum = allAlertNums[i] || `未知${returnFormatNum(i + startNum)}`;
      // 判断当前编号是否为故障编号（仅根据文件编号后三位判断）
      const isProblem = problemNums.includes(fileNum.slice(-3));

      // 每个证书单独选择模板
      let templatePath;
      if (isProblem) {
        templatePath = path.join(process.cwd(), 'templates', 'problem.docx');
      } else {
        const n = Math.floor(Math.random() * 15) + 1; // 1~15
        templatePath = path.join(process.cwd(), 'templates', `normal_${n}.docx`);
      }
      const templateBuffer = await fs.readFile(templatePath);

      const data = {
        file_num: fileNum,
        company_name: companyName,
        alert_type: alertType,
        alert_factory: alertFactory,
        dongzuozhi: isProblem ? '/' : 25,
        dongzuozhi_with_unit: isProblem ? '/' : '25%LEL',
        alert_num: alertNum,
        date_now,
        date_next,
        temperature,
        humidity,
        random_chongfu: isProblem ? '/' : Math.round((Math.random() * 2) * 10) / 10,
        random_chongfu_with_unit: isProblem ? '/' : `${Math.round((Math.random() * 2) * 10) / 10}%`,
        action_time: isProblem ? '/' : Math.floor(Math.random() * (25 - 7 + 1)) + 7,
        action_time_with_unit: isProblem ? '/' : `${Math.floor(Math.random() * (25 - 7 + 1)) + 7}s`,
        alarm_status: isProblem ? '异常' : '正常',
        gongneng: isProblem ? '异常' : '正常',
        gas: gas,
        gas_num: gas_num,
        REL: REL,
      };

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
        return new Response(JSON.stringify({ 
          message: '模板渲染失败: ' + errorMsg,
          details: err
        }), { status: 500 });
      }

      const out = doc.getZip().generate({ type: 'nodebuffer' });
      const docxName = `${companyName}_${fileNum}_${alertNum}.docx`;
      zip.file(docxName, out);
      docxBuffers.push({ name: docxName, buffer: out });
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 2. 上传所有 docx 到 Windows 服务器
    const winApi = process.env.WINDOWS_API_URL || 'http://139.196.115.44:5000';
    const nodeForm = new FormData();
    docxBuffers.forEach(doc => {
      nodeForm.append('files', doc.buffer, { filename: doc.name });
    });
    // submit 方法是 callback 风格，需要 Promise 封装
    const uploadResp = await new Promise((resolve, reject) => {
      nodeForm.submit(`${winApi}/upload`, (err, res) => {
        if (err) return reject(err);
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      });
    });
    const taskId = (uploadResp as any).task_id;

    // 3. 立即返回 taskId，前端可用 taskId 轮询进度
    // 生成压缩包名称：委托单位名称+简化日期格式.zip (如：XX公司20250612.zip)
    const zipFileName = `${companyName}${date}.zip`;
    
    const docxZipUrl = `${winApi}/download/${taskId}/docx`;
    const pdfUrl = `${winApi}/download/${taskId}/merged`;
    const completeZipUrl = `${winApi}/download/${taskId}/complete?filename=${encodeURIComponent(zipFileName)}`;
    
    // 4. 后台异步串联调用 convert/merge
    setImmediate(async () => {
      try {
        console.log(`[后台] 开始转换 PDF，taskId=${taskId}`);
        await axios.post(`${winApi}/convert/${taskId}`, {}, { timeout: 300000 });
        console.log(`[后台] 转换 PDF 完成，taskId=${taskId}`);
        await axios.post(`${winApi}/merge/${taskId}`, {}, { timeout: 300000 });
        console.log(`[后台] 合并 PDF 完成，taskId=${taskId}`);
        // 新增：生成完整压缩包
        await axios.post(`${winApi}/package/${taskId}`, { 
          filename: zipFileName 
        }, { timeout: 300000 });
        console.log(`[后台] 生成完整压缩包完成，taskId=${taskId}`);
      } catch (e) {
        console.error(`[后台] 合并流程异常，taskId=${taskId}`, e);
      }
    });
    // 5. 立即响应
    return new Response(JSON.stringify({
      status: 'success',
      taskId,
      docxZipUrl,
      pdfUrl,
      completeZipUrl,
      zipFileName
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