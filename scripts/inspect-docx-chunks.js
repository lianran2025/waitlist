const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const templatePath = path.join(__dirname, '../templates/model.docx');
const content = fs.readFileSync(templatePath);
const zip = new PizZip(content);

// 直接读取文档所有段落文本
const xml = zip.file('word/document.xml').asText();

// 匹配所有包含 { 或 } 的文本块
const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
let match;
let idx = 0;
console.log('包含大括号的文本块如下：');
while ((match = regex.exec(xml)) !== null) {
  const text = match[1];
  if (text.includes('{') || text.includes('}')) {
    console.log(`[${++idx}] ${text}`);
  }
}
if (idx === 0) {
  console.log('未检测到包含大括号的文本块，说明所有变量都被拆分了。');
} else {
  console.log('\n请检查这些文本块，确认每个变量标签（如 {{file_num}}）是否完整，或是否被拆分成多个块。');
}