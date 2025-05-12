import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const companiesData = {
  companies: [
    {
      name: "安可信",
      list: ["AEC2332", "GTY-AEC2335", "AEC2331a", "AEC2232b/A", "GT-AEC2232bX/A", "GT-AEC2232a", "GT-AEC2331a"],
      fullname: "成都安可信电子股份有限公司",
      alarm: 25
    },
    {
      name: "安仕得",
      list: ["ASD5310", "GT-ASD5381", "GTYQ-ASD5310", "GT-ASD5300"],
      fullname: "沈阳安仕得科技有限公司",
      alarm: 25
    },
    {
      name: "成都易安特",
      fullname: "成都鑫易合智能科技有限公司",
      list: ["GT-EA201", "GT-EA201/d"],
      alarm: 25
    },
    {
      name: "鑫豪斯",
      list: ["AT0502AH", "AT0501AH", "GTYQ-AT0502", "GTYQ-AT0501", "GTYQ-AT0602", "GT-AT0501", "GT-XP4000", "GT-AT0503", "AT0502AH/L"],
      fullname: "成都鑫豪斯电子探测技术有限公司",
      alarm: 25
    },
    {
      name: "翼捷",
      list: ["DT4", "GTQ-C600", "DT3", "GTQ-C630", "IR610", "C630"],
      fullname: "上海翼捷工业安全设备股份有限公司",
      alarm: 25
    },
    {
      name: "珠海兴华",
      list: ["XH-G800C", "XH-G800A（四线）", "XH-G800A-A（四线）", "XH-G800A-B（三线）", "GTY-XH800C（四线）", "GT-XH800A", "GTY-XHG800C", "XH-G300A-B"],
      fullname: "珠海兴华电子科技有限公司",
      alarm: 15
    },
    {
      name: "河南中安",
      list: ["GT-QD6320", "GT-QD6360", "GT-QD6330", "GT-QD6310", "GTYQ-QD6100"],
      fullname: "河南中安电子探测技术有限公司",
      alarm: 20
    },
    {
      name: "河南汉威",
      list: ["BS01II", "GTY-CXE", "GT-T3000", "GTQ-BS01"],
      fullname: "汉威科技集团股份有限公司",
      alarm: 20
    },
    {
      name: "济南本安",
      list: ["SST-1080XC", "GTYQ-SST626SMG", "GT-SST610LCD"],
      fullname: "济南本安科技发展有限公司",
      alarm: 25
    },
    {
      name: "珠海创安",
      list: ["CA-217A PLUS（四线）", "CA-217A-D（三线）", "GTYQ-CA228"],
      fullname: "珠海创安电子科技有限公司",
      alarm: 15
    },
    {
      name: "济南瑞安",
      list: ["RBT-6000-ZLG", "GT-RBTZL", "GT-RZLED08A", "GT-RZLED09"],
      fullname: "济南瑞安电子有限公司",
      alarm: 25
    },
    {
      name: "亚车电子",
      list: ["AGS100"],
      fullname: "亚车电子（深圳）有限公司",
      alarm: 25
    },
    {
      name: "深圳特安",
      list: ["ES2000T", "DT      "],
      fullname: "深圳市特安电子有限公司    ",
      alarm: 25
    },
    {
      name: "临沂安福",
      list: ["4888", "GT-4888A3", "GT-4888B"],
      fullname: "临沂市安福电子有限公司",
      alarm: 25
    },
    {
      name: "松江费加罗",
      list: ["GTQ-SF6100A", " SFJEX-07A"],
      fullname: "上海松江费加罗电子有限公司",
      alarm: 15
    },
    {
      name: "重庆能泰",
      list: ["GT-HT616-A", "HT616"],
      fullname: "重庆能泰科技有限公司",
      alarm: 25
    },
    {
      name: "临沂天璨",
      list: ["GT-TS01", "GT-TS01-C"],
      fullname: "临沂市天璨电器有限公司",
      alarm: 25
    },
    {
      name: "宁波艾华",
      list: ["GT-AH22", "AH22"],
      fullname: "宁波市艾华安防科技有限公司",
      alarm: 20
    },
    {
      name: "四川希尔得",
      list: ["GTY-SD2103", "SD2010", "GTY-SD2103F", "GTYQ-SD2100", "GTYQ-SD2100E", "GTYQ-SD2120", "GTY-SD2130"],
      fullname: "四川希尔得科技有限公司",
      alarm: 25
    },
    {
      name: "浙江汉特姆阀门",
      list: ["HTEXS1"],
      fullname: "浙江汉特姆阀门有限公司",
      alarm: 25
    },
    {
      name: "河南保时安电子",
      list: ["GT-B60", "GTYQ-B10", "BH-60"],
      fullname: "河南省保时安电子科技有限公司",
      alarm: 20
    },
    {
      name: "山东百纳",
      list: ["GT-BNT1000A", "GTYQ-BNTLCD", "GT-BNTLCD"],
      fullname: "山东百纳电子设备有限公司",
      alarm: 25
    },
    {
      name: "山东诺盾",
      list: ["ND-T100"],
      fullname: "山东诺盾电子科技有限责任公司",
      alarm: 25
    },
    {
      name: "深圳索富通",
      fullname: "深圳市索富通实业有限公司",
      list: ["SST-9801T", "SST-9801TB", "GT-9801TB"],
      alarm: 20
    },
    {
      name: "山东多瑞电子",
      fullname: "山东多瑞电子科技有限公司",
      list: ["DR-600"],
      alarm: 20
    },
    {
      name: "深圳安泰安防",
      fullname: "深圳市安泰安防技术有限公司",
      list: ["AT3000-A"],
      alarm: 25
    },
    {
      name: "山东瑶安电子",
      fullname: "山东瑶安电子科技发展有限公司",
      list: ["YA-D100"],
      alarm: 20
    },
    {
      name: "山西安赛科",
      fullname: "山西安赛科安全技术有限公司",
      list: ["GT-AS01C"],
      alarm: 20
    },
    {
      name: "济南长清",
      fullname: "济南市长清计算机应用公司",
      list: ["RB-TTy", "RB-TZII"],
      alarm: 20
    },
    {
      name: "济南顺安",
      fullname: "济南顺安电子科技有限公司",
      list: ["GQ-SAT6000"],
      alarm: 25
    },
    {
      name: "常州艾科思",
      fullname: "艾科思电子科技(常州)有限公司",
      list: ["GND-20"],
      alarm: 20
    },
    {
      name: "梅思安",
      fullname: "梅思安（中国）安全设备有限公司",
      list: ["DF-8500PR"],
      alarm: 25
    },
    {
      name: "新考思莫施",
      fullname: "新考思莫施电子（上海）有限公司",
      list: ["XP-3110"],
      alarm: 20
    },
    {
      name: "山东艾瑞达",
      fullname: "山东艾瑞达电子有限公司",
      list: ["GT-ARD320"],
      alarm: 25
    },
    {
      name: "无锡永安电子",
      fullname: "无锡市永安电子科技有限公司",
      list: ["WMKY-2000"],
      alarm: 20
    },
    {
      name: "天津亚丽安",
      fullname: "天津亚丽安报警设备有限公司",
      list: ["QJ-T-08"],
      alarm: 25
    },
    {
      name: "深圳普利通电子",
      fullname: "深圳市普利通电子科技有限公司",
      list: ["GTY-PLT129", "GT-PLT219-EX", "GT-PLT119-EX"],
      alarm: 20
    },
    {
      name: "深圳立鼎丰",
      fullname: "深圳市立鼎丰科技有限公司",
      list: ["GT-LDF-101"],
      alarm: 15
    },
    {
      name: "济南创信",
      fullname: "济南创信电子有限公司",
      list: ["GT-CX200", "GTY-CX300"],
      alarm: 25
    },
    {
      name: "东莞晨阳",
      fullname: "广东省东莞市晨阳气体检测有限公司",
      list: ["CHY-2000T"],
      alarm: 20
    },
    {
      name: "济南巨康",
      fullname: "济南巨康电子科技有限公司",
      list: ["GT-JK-T100"],
      alarm: 25
    },
    {
      name: "北京科力强",
      fullname: "北京科力强电子有限公司",
      list: ["KB-808"],
      alarm: 20
    },
    {
      name: "鑫利达",
      fullname: "山东鑫利达安防科技有限公司",
      list: ["GT-XLD3000"],
      alarm: 25
    },
    {
      name: "苏州卓安",
      fullname: "苏州卓安电子科技有限公司",
      list: ["ZA6100/LEL", "ZA6100/LEL-RS485", "GTQ-ZA6100"],
      alarm: 20
    },
    {
      name: "常州世速",
      fullname: "常州世速电子设备有限公司",
      list: ["GT-HD1100", "QD6310"],
      alarm: 25
    },
    {
      name: "广州堃联",
      fullname: "广州堃联科技有限公司",
      list: ["GT-KL800"],
      alarm: 25
    },
    {
      name: "济南海安",
      fullname: "济南海安安环设备有限公司",
      list: ["HQTC-100"],
      alarm: 25
    },
    {
      name: "赛菲莱",
      fullname: "山东赛菲莱电子科技有限公司",
      list: ["GTY-SF3000"],
      alarm: 25
    },
    {
      name: "山东福祥安",
      fullname: "山东福祥安电子科技有限公司",
      list: ["GTYQ-FXA900"],
      alarm: 20
    }
  ]
}

async function importCompanies() {
  try {
    for (const company of companiesData.companies) {
      await prisma.company.create({
        data: {
          shortName: company.name,
          fullName: company.fullname,
          products: company.list,
          alarm: company.alarm
        }
      })
      console.log(`Imported company: ${company.name}`)
    }
    console.log('Import completed successfully')
  } catch (error) {
    console.error('Error importing companies:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importCompanies() 