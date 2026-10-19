// 本地回归：在临时目录验证真实 JSON 读写与 DOCX 渲染，所有 Windows HTTP 请求均替身处理。
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { createRequire } = require('module');
const { randomUUID } = require('crypto');
const root = path.resolve(__dirname, '..');
const nativeRequire = createRequire(path.join(root, 'package.json'));
const ts = nativeRequire('typescript');
const PizZip = nativeRequire('pizzip');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'waitlist-products-'));
const dataPath = path.join(temporary, 'src/data/companies.json');
fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.symlinkSync(path.join(root, 'templates'), path.join(temporary, 'templates'), 'dir');
fs.copyFileSync(path.join(root, 'src/data/calibration-records.json'), path.join(temporary, 'src/data/calibration-records.json'));
const oldCompanies = [
  { id: 'old', shortName: '旧厂家', fullName: '旧厂家全称', products: ['型号A', '型号B'], alarm: 25, range: '3-100', rangeConfirmed: true, createdAt: '2025-01-01', updatedAt: '2025-01-01', extra: '保留字段' },
  { id: 'other', shortName: '其他厂家', fullName: '其他厂家全称', products: ['旧型号'], alarm: 15, extra: '保留其他公司' }
];
const original = JSON.stringify(oldCompanies, null, 2);
fs.writeFileSync(dataPath, original);
let uploads = [], httpCalls = 0, failRename = false;
const testFs = { ...fs, renameSync: (...args) => {
  if (failRename) throw new Error('模拟文件替换失败');
  return fs.renameSync(...args);
} };
const axios = {
  isAxiosError: () => false,
  get: async () => { httpCalls++; return { data: {} }; },
  post: async (url, form) => {
    httpCalls++;
    if (url.endsWith('/upload')) { uploads = form._streams.filter(Buffer.isBuffer); return { data: { task_id: 'local-test' } }; }
    return { data: {} };
  }
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true
  } }).outputText;
  const requireLocal = name => {
    if (name === 'axios') return axios;
    if (name === 'fs') return testFs;
    if (name === 'nanoid') return { nanoid: randomUUID };
    if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'));
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
    return nativeRequire(name);
  };
  const sandbox = { require: requireLocal, module, exports: module.exports, Buffer, Response,
    console: { log() {}, error() {} }, setImmediate: callback => callback(),
    process: { ...process, cwd: () => temporary } };
  vm.runInNewContext(source, sandbox, { filename: file });
  return module.exports;
}
function json(value) { return JSON.parse(JSON.stringify(value)); }
async function main() {
  const { companiesJson: store } = load(path.join(root, 'src/lib/companies-json.ts'));
  const { getProductConfig } = load(path.join(root, 'src/lib/product-config.ts'));
  const old = store.findUnique({ where: { id: 'old' } });
  assert.equal(old.productConfigs['型号A'].alarm, 25);
  assert.equal(old.productConfigs['型号B'].range, '3-100');
  assert.equal(store.findUnique({ where: { id: 'other' } }).productConfigs['旧型号'].range, '0-100');
  assert.equal(fs.readFileSync(dataPath, 'utf8'), original);
  console.log('PASS 旧 JSON 在内存中补齐全部型号，读取不落盘');

  const configs = json(old.productConfigs);
  configs['型号A'] = { alarm: 10, range: '0-50', rangeConfirmed: true };
  configs['新型号'] = { alarm: 20, range: '5-100', rangeConfirmed: false };
  store.update({ where: { id: 'old' }, data: { products: ['型号A', '型号B', '新型号'], productConfigs: configs } });
  let disk = JSON.parse(fs.readFileSync(dataPath));
  assert.deepEqual(disk[1], oldCompanies[1]);
  assert.equal(disk[0].extra, oldCompanies[0].extra);
  assert.equal(disk[0].alarm, 25);
  assert.equal(disk[0].range, '3-100');
  assert.equal(disk[0].productConfigs['型号B'].alarm, 25);
  assert.equal(fs.readFileSync(dataPath.replace('.json', '.backup.json'), 'utf8'), original);
  console.log('PASS 保存独立参数/新增型号，保留其他公司、旧字段及完整备份');

  const renamed = { ...configs, '重命名型号': configs['型号A'] }; delete renamed['型号A']; delete renamed['新型号'];
  const saved = store.update({ where: { id: 'old' }, data: { products: ['重命名型号', '型号B'], productConfigs: renamed } });
  assert.equal(saved.productConfigs['重命名型号'].alarm, 10);
  assert.equal(Object.hasOwn(saved.productConfigs, '型号A'), false);
  assert.equal(Object.hasOwn(saved.productConfigs, '新型号'), false);
  console.log('PASS 型号重命名保留参数，删除型号清理配置');

  const beforeInvalid = fs.readFileSync(dataPath, 'utf8');
  for (const data of [
    { products: ['重复', '重复'] },
    { productConfigs: { '重命名型号': { alarm: 30, range: '0-100', rangeConfirmed: false }, '型号B': configs['型号B'] } },
    { productConfigs: { '重命名型号': { alarm: 10, range: '100-0', rangeConfirmed: false }, '型号B': configs['型号B'] } },
    { productConfigs: {} }
  ]) assert.throws(() => store.update({ where: { id: 'old' }, data }));
  assert.equal(fs.readFileSync(dataPath, 'utf8'), beforeInvalid);
  console.log('PASS 拒绝重复型号、非法阈值、无效量程和不完整参数且不写文件');

  const newCompany = store.create({ data: { shortName: '新增', fullName: '新增公司', products: ['新A'], alarm: 15, range: '0-100', productConfigs: { '新A': { alarm: 15, range: '0-100', rangeConfirmed: true } } } });
  assert.equal(store.findUnique({ where: { id: newCompany.id } }).productConfigs['新A'].alarm, 15);
  // 兼容旧接口只更新公司名称，不丢失已保存的型号参数。
  store.update({ where: { id: 'old' }, data: { shortName: '改名', productConfigs: undefined } });
  assert.equal(store.findUnique({ where: { id: 'old' } }).productConfigs['重命名型号'].alarm, 10);

  const companyRoute = load(path.join(root, 'src/app/api/companies/[id]/route.ts'));
  const { GET: getOptions } = load(path.join(root, 'src/app/api/companies/data/route.ts'));
  const apiResponse = await companyRoute.PUT({ json: async () => ({ shortName: '接口改名', products: saved.products, productConfigs: saved.productConfigs }) }, { params: { id: 'old' } });
  assert.equal(apiResponse.status, 200);
  const badResponse = await companyRoute.PUT({ json: async () => ({ products: ['重命名型号'], productConfigs: { '重命名型号': { alarm: 30, range: '0-100', rangeConfirmed: true } } }) }, { params: { id: 'old' } });
  assert.equal(badResponse.status, 400);
  const optionsResponse = await getOptions();
  assert.equal(optionsResponse.status, 200);
  const options = await optionsResponse.json();
  assert.equal(options.find(c => c.fullname === '旧厂家全称').productConfigs['重命名型号'].alarm, 10);
  console.log('PASS 编辑 API 保存型号参数、校验错误返回 400，生成页选项接口返回独立配置');

  const { POST } = load(path.join(root, 'src/app/api/generate-certificates/route.ts'));
  async function generate(model, expectedStatus, extra = {}) {
    const data = new FormData();
    const fields = { company_name: '验证单位', all_nums: '1', date: '20261019', temperature: '20', humidity: '50', sections: '', sections_num: '1', start_num: '1', alert_factory: '旧厂家全称', alert_type: model, gas: '甲烷', convert_to_pdf: 'false', ...extra };
    Object.entries(fields).forEach(([key, value]) => data.set(key, value));
    uploads = [];
    const response = await POST({ formData: async () => data });
    assert.equal(response.status, expectedStatus, await response.clone().text());
    if (expectedStatus === 200) {
      assert.equal(uploads.length, 3);
      const texts = uploads.map(buffer => new PizZip(buffer).file('word/document.xml').asText().replace(/<[^>]*>/g, ''));
      const alarm = texts[0].match(/报警动作值：\s*([\d.]+)%LEL/)[1];
      const config = getProductConfig(store.findUnique({ where: { id: 'old' } }), model);
      assert(Number(alarm) > config.alarm - 2 && Number(alarm) <= config.alarm + 1);
      assert(texts[1].includes(alarm) && texts[2].includes(alarm));
      assert(texts[2].includes(config.range));
    } else assert.equal(uploads.length, 0);
  }
  await generate('重命名型号', 200, { alarm_threshold: '10', liangcheng: '0-50' });
  await generate('型号B', 200, { alarm_threshold: '25', liangcheng: '3-100' });
  await generate('重命名型号', 200); // 未携带旧参数的客户端也从服务端解析
  await generate('不存在', 400);
  const callsBefore = httpCalls;
  await generate('重命名型号', 409, { alarm_threshold: '25', liangcheng: '3-100' });
  assert.equal(httpCalls, callsBefore);
  console.log('PASS 同厂不同型号使用独立阈值与量程，三份 DOCX 一致，篡改/过期参数在上传前拒绝');

  const beforeFailure = fs.readFileSync(dataPath, 'utf8');
  failRename = true;
  assert.throws(() => store.update({ where: { id: 'old' }, data: { shortName: '替换失败' } }));
  failRename = false;
  assert.equal(fs.readFileSync(dataPath, 'utf8'), beforeFailure);
  assert.equal(fs.readdirSync(path.dirname(dataPath)).some(name => name.endsWith('.tmp')), false);
  console.log('PASS 文件替换失败保留原 JSON 并清理临时文件');

  fs.writeFileSync(dataPath, '{损坏');
  assert.throws(() => store.create({ data: { shortName: '测试', fullName: '测试', products: ['A'], alarm: 25 } }));
  assert.equal(fs.readFileSync(dataPath, 'utf8'), '{损坏');
  console.log('PASS 损坏 JSON 阻止写入，不以空列表覆盖');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(temporary, { recursive: true, force: true }));
