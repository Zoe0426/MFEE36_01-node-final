//假新北市
function newtaipeiAddress() {
  const counties = ["新北市"];
  const districts = [
    "板橋區",
    "三重區",
    "中和區",
    "永和區",
    "新莊區",
    "新店區",
    "樹林區",
    "鶯歌區",
    "三峽區",
    "淡水區",
    "汐止區",
    "瑞芳區",
    "土城區",
    "蘆洲區",
    "五股區",
    "泰山區",
    "林口區",
    "深坑區",
    "石碇區",
    "坪林區",
    "三芝區",
    "石門區",
    "八里區",
    "平溪區",
    "雙溪區",
    "貢寮區",
    "金山區",
    "萬里區",
    "烏來區",
  ];
  const roadNames = [
    "中山路",
    "忠孝路",
    "和平路",
    "光明路",
    "自由路",
    "大同路",
    "文化路",
    "安和路",
    "民生路",
    "新生路",
    "復興路",
    "成功路",
    "建國路",
    "和平路",
    "中正路",
    "信義路",
    "臨江路",
    "福德路",
    "光復路",
    "仁愛路",
    "南華路",
    "水源路",
    "臨港路",
    "清水路",
    "漢口路",
    "百福路",
    "萬壽路",
    "大安路",
    "龍門路",
    "忠義路",
  ];

  const randomCountyIndex = Math.floor(Math.random() * counties.length);
  const county = counties[randomCountyIndex];

  const randomDistrictIndex = Math.floor(Math.random() * districts.length);
  const district = districts[randomDistrictIndex];

  const randomRoadIndex = Math.floor(Math.random() * roadNames.length);
  const road = roadNames[randomRoadIndex];

  const number = Math.floor(Math.random() * 100) + 1; // 幾號, 1-100之间的随机数
  const floor = Math.floor(Math.random() * 10) + 1; // 幾樓, 1-10之间的随机数

  return `${county}${district}${road} ${number}號 ${floor}樓`;
}

const addressesNewTaipei = [];
for (let i = 0; i < 100; i++) {
  const address = newtaipeiAddress();
  addressesNewTaipei.push(address);
}
console.log(addressesNewTaipei);

//假桃園市
function taoyuanAddress() {
  const counties = ["桃園市"];
  const districts = [
    "中壢區",
    "桃園區",
    "平鎮區",
    "八德區",
    "龍潭區",
    "楊梅區",
    "新屋區",
    "觀音區",
    "竹北區",
    "機場第一區",
    "機場第二區",
    "大園區",
  ];
  const roadNames = [
    "中正路",
    "中山路",
    "大同路",
    "大興路",
    "大湳路",
    "忠孝路",
    "復興路",
    "民生路",
    "和平路",
    "成功路",
    "信義路",
    "光明路",
    "自強路",
    "建國路",
    "龍安路",
    "中山街",
    "中正街",
    "大同街",
    "大興街",
    "大湳街",
    "忠孝街",
    "復興街",
    "民生街",
    "和平街",
    "成功街",
    "信義街",
    "光明街",
    "自強街",
    "建國街",
    "龍安街",
  ];

  const randomCountyIndex = Math.floor(Math.random() * counties.length);
  const county = counties[randomCountyIndex];

  const randomDistrictIndex = Math.floor(Math.random() * districts.length);
  const district = districts[randomDistrictIndex];

  const randomRoadIndex = Math.floor(Math.random() * roadNames.length);
  const road = roadNames[randomRoadIndex];

  const number = Math.floor(Math.random() * 100) + 1; // 幾號, 1-100之间的随机数
  const floor = Math.floor(Math.random() * 10) + 1; // 幾樓, 1-10之间的随机数

  return `${county}${district}${road} ${number}號 ${floor}樓`;
}

const addressestaoyuan = [];
for (let i = 0; i < 100; i++) {
  const address = taoyuanAddress();
  addressestaoyuan.push(address);
}
console.log(addressesNewTaipei);

//假台中市
function taichungAddress() {
  const counties = ["台中市"];
  const districts = ["中區", "東區", "南區", "西區", "北區", "西屯區", "南屯區", "北屯區", "大甲區"];
  const roadNames = [
    "中山路",
    "林森路",
    "成功路",
    "復興路",
    "文心南路",
    "大墩十七街",
    "洛陽街",
    "建國北路",
    "忠明南路",
    "健行路",
    "英才路",
    "青年路",
    "五權南路",
    "經國路",
    "旅順街",
  ];

  const randomCountyIndex = Math.floor(Math.random() * counties.length);
  const county = counties[randomCountyIndex];

  const randomDistrictIndex = Math.floor(Math.random() * districts.length);
  const district = districts[randomDistrictIndex];

  const randomRoadIndex = Math.floor(Math.random() * roadNames.length);
  const road = roadNames[randomRoadIndex];

  const number = Math.floor(Math.random() * 100) + 1; // 幾號, 1-100之间的随机数
  const floor = Math.floor(Math.random() * 10) + 1; // 幾樓, 1-10之间的随机数

  return `${county}${district}${road} ${number}號 ${floor}樓`;
}

const addressestaichung = [];
for (let i = 0; i < 100; i++) {
  const address = taichungAddress();
  addressestaichung.push(address);
}
console.log(addressesNewTaipei);

//假台南市
function tainanAddress() {
  const counties = ["台南市"];
  const districts = [
    "中西區",
    "東區",
    "南區",
    "北區",
    "安平區",
    "安南區",
    "永康區",
    "歸仁區",
    "新化區",
    "左鎮區",
    "玉井區",
    "楠西區",
    "南化區",
    "仁德區",
    "關廟區",
    "龍崎區",
    "官田區",
    "麻豆區",
    "佳里區",
    "西港區",
    "七股區",
    "將軍區",
    "學甲區",
    "北門區",
    "新營區",
    "後壁區",
    "白河區",
    "東山區",
    "六甲區",
    "下營區",
    "柳營區",
    "鹽水區",
    "善化區",
    "大內區",
    "山上區",
    "新市區",
    "安定區",
  ];
  const roadNames = [
    "忠孝路",
    "中山路",
    "建國路",
    "中正路",
    "成功路",
    "文化路",
    "林森路",
    "民權路",
    "虎尾路",
    "幸福路",
    "大同路",
    "南京路",
    "和平路",
    "大學路",
    "復興路",
    "光復路",
    "清水路",
    "三民路",
    "大安路",
    "太平路",
    "新興路",
    "建興路",
    "經國路",
    "竹溪路",
    "自由路",
    "南華路",
    "水悟路",
    "東光路",
    "北門路",
    "長榮路",
  ];

  const randomCountyIndex = Math.floor(Math.random() * counties.length);
  const county = counties[randomCountyIndex];

  const randomDistrictIndex = Math.floor(Math.random() * districts.length);
  const district = districts[randomDistrictIndex];

  const randomRoadIndex = Math.floor(Math.random() * roadNames.length);
  const road = roadNames[randomRoadIndex];

  const number = Math.floor(Math.random() * 100) + 1; // 幾號, 1-100之间的随机数
  const floor = Math.floor(Math.random() * 10) + 1; // 幾樓, 1-10之间的随机数

  return `${county}${district}${road} ${number}號 ${floor}樓`;
}

const addressestainan = [];
for (let i = 0; i < 100; i++) {
  const address = tainanAddress();
  addressestainan.push(address);
}
console.log(addressesNewTaipei);

//假高雄市
function kaohsiungAddress() {
  const counties = ["高雄市"];
  const districts = [
    "鹽埕區",
    "鼓山區",
    "左營區",
    "楠梓區",
    "三民區",
    "新興區",
    "前金區",
    "苓雅區",
    "前鎮區",
    "小港區",
    "茂林區",
  ];
  const roadNames = [
    "中山路",
    "中正路",
    "前鎮路",
    "成功路",
    "忠孝路",
    "大同路",
    "五福路",
    "自由路",
    "民生路",
    "和平路",
    "高雄大道",
    "建國路",
    "漢中街",
    "龍華路",
    "博愛路",
    "六合路",
    "正義路",
    "蓮池潭畔",
    "遼寧街",
    "中正四路",
    "苓雅二路",
    "新光路",
    "左營大路",
    "好望角路",
    "鳳山西路",
    "大勇路",
    "興中一路",
    "文化路",
    "高鐵路",
    "光遠路",
  ];

  const randomCountyIndex = Math.floor(Math.random() * counties.length);
  const county = counties[randomCountyIndex];

  const randomDistrictIndex = Math.floor(Math.random() * districts.length);
  const district = districts[randomDistrictIndex];

  const randomRoadIndex = Math.floor(Math.random() * roadNames.length);
  const road = roadNames[randomRoadIndex];

  const number = Math.floor(Math.random() * 100) + 1; // 幾號, 1-100之间的随机数
  const floor = Math.floor(Math.random() * 10) + 1; // 幾樓, 1-10之间的随机数

  return `${county}${district}${road} ${number}號 ${floor}樓`;
}

const addresseskaohsiung = [];
for (let i = 0; i < 100; i++) {
  const address = kaohsiungAddress();
  addresseskaohsiung.push(address);
}
console.log(addressesNewTaipei);