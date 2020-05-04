const fs = require('fs');
const ejs = require('ejs');
const request = require('request');
const express = require('express');
const mariadb = require('mariadb');
const winston = require('winston');
const dateformat = require('dateformat');
const bodyParser = require('body-parser');
const session = require('express-session');
const sessionDatabase = require('express-mysql-session')(session);
const DBOptions = {
  host: 'localhost', 
  user:'root', 
  password: 'luftaquila',
  database: 'ajoumeow'
};
const pool = mariadb.createPool(DBOptions);
const sessionDB = new sessionDatabase(DBOptions);
let db;

let logger = new winston.createLogger({
  transports: [
    new winston.transports.File({
      level: 'info',
      filename: 'server.log',
      maxsize: 5242880, //5MB
      maxFiles: 1,
      showLevel: true,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
      )
    })
  ],
  exitOnError: false,
});

const app = express();
//app.use('/', express.static('../'));
app.set("view engine", "ejs");
app.set('views', 'views');
app.engine('html', ejs.renderFile);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
 secret: '@+*LU_Ft%AQuI-|!la#@$',
 resave: false,
 saveUninitialized: true,
 store: sessionDB
}));

app.get('/', async function(req, res) {
  console.log(new Date(), 'start')
  let record = await db.query("SELECT * FROM record;")
  let namelist = await db.query("SELECT * FROM `namelist_20-1`;");
  res.status(200)
  for(let obj of record) {
    let target = namelist.find(o => o.name == obj.name);
    if(target) await db.query("UPDATE record SET ID=" + target.ID + " WHERE name='" + obj.name + "';");
  }
  console.log(new Date(), 'ok')
});

app.post('//loginCheck', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    if(req.session.isLogin) {
      query = 'SELECT name, ID, role FROM `namelist_' + await settings('currentSemister') + "` WHERE ID='" + req.session.ID + "';";
      result = await db.query(query);
      res.send({ 'name' : result[0].name, 'id' : result[0].ID, 'role' : result[0].role });
      logger.info('세션의 로그인 여부를 확인합니다.', { ip: ip, url: 'loginCheck', query: query, result: JSON.stringify(result)});
    }
    else {
      res.send({ 'name' : null, 'id' : null, 'role' : null });
      logger.info('세션의 로그인 여부를 확인합니다.', { ip: ip, url: 'loginCheck', query: query, result: result.toString()});
    }
  }
  catch(e) {
    res.send({ 'name' : null, 'id' : null, 'role' : null });
    logger.error('세션의 로그인 여부를 확인하는 중에 오류가 발생했습니다.', { ip: ip, url: 'loginCheck', query: query, result: e.toString()});
  }
});

app.post('//login', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    query = 'SELECT name, ID, role FROM `namelist_' + await settings('currentSemister') + "` WHERE ID='" + req.body['ID'] + "';";
    result = await db.query(query);
    if(result[0]) {
      req.session.ID = req.body['ID'];
      req.session.isLogin = true;
      res.send({ 'name' : result[0].name, 'id' : result[0].ID, 'role' : result[0].role });
      logger.info('로그인을 시도합니다.', { ip: ip, url: 'login', query: query, result: result.toString()});
    }
    else {
      res.send({ 'name' : null, 'id' : null, 'role' : null });
      logger.info('로그인을 시도합니다.', { ip: ip, url: 'login', query: query, result: result.toString()});
    } 
  }
  catch(e) {
    logger.error('로그인 시도 중에 오류가 발생했습니다.', { ip: ip, url: 'login', query: query, result: e.toString()});
  }
});

app.post('//logout', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  req.session.destroy();
  res.send({ 'result' : 'success' });
  logger.info('로그아웃을 시도합니다.', { ip: ip, url: 'logout', query: 'logout', result: 'ok'});
});

app.post('//apply', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    query = 'INSERT INTO `namelist_' + await settings('currentSemister') + '`(college, department, ID, name, phone, birthday, 1365ID, register)' +
        " VALUES('" + req.body['단과대학'] + "', '" + req.body['학과'] + "', '" + req.body['학번'] + "', '" + req.body['이름'] + "', '" + req.body['전화번호'] + "', '" + req.body['생년월일'] + "', '" + req.body['1365 아이디'] + "', '" + req.body['가입 학기'] + "');";
    result = await db.query(query);
    res.send(result);
    logger.info('회원 등록을 시도합니다.', { ip: ip, url: 'apply', query: query, result: result.toString()});
  }
  catch(e) {
    res.send({ 'result' : null, 'error' : e.toString() });
    logger.error('회원 등록 중에 오류가 발생했습니다.', { ip: ip, url: 'apply', query: query, result: e.toString()});
  }
});

app.post('//requestApply', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  try {
    let applyTerm = await settings('applyTerm'), result;
    applyTerm = applyTerm.split('~');
  
    if((new Date() > new Date(applyTerm[0]) && new Date() < new Date(new Date(applyTerm[1]).getTime() + 60 * 60 * 24 * 1000)) || (await settings('isAllowAdditionalApply') == 'TRUE'))
      result = { result: true };
    else result = { result: null };
  
    res.send(result);
    logger.info('회원 등록 가능 여부를 확인합니다.', { ip: ip, url: 'requestApply', query: '-', result: result.toString()});
  }
  catch(e) {
    logger.error('회원 등록 가능 여부를 확인하는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestApply', query: '-', result: e.toString()});
  }
});

app.post('//requestRegister', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  try {
    let registerTerm = await settings('registerTerm'), result;
    registerTerm = registerTerm.split('~');
  
    if((new Date() > new Date(registerTerm[0]) && new Date() < new Date(new Date(registerTerm[1]).getTime() + 60 * 60 * 24 * 1000)) || (await settings('isAllowAdditionalRegister') == 'TRUE'))
      result = { 'result' : true, 'semister' : await settings('currentSemister') };
    else result = { 'result' : null };
    res.send(result);
    logger.info('회원 가입 가능 여부를 확인합니다.', { ip: ip, url: 'requestRegister', query: '-', result: result.toString()});
  }
  catch(e) {
    logger.info('회원 가입 가능 여부를 확인하는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestRegister', query: '-', result: e.toString()});
  }
});

app.post('//modifySettings', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    if(req.body.editParam == 'notice') {
      let version = await settings('notice');
      version = Number(version.split('$')[0]) + 1;
      let notice = req.body.editData.replace(/(?:\r\n|\r|\n)/g, '<br>');
      query = "UPDATE settings SET value='" + version + '$' + notice + "' WHERE name='" + req.body.editParam + "';";
    }
    else query = "UPDATE settings SET value='" + req.body.editData + "' WHERE name='" + req.body.editParam + "';";
    result = await db.query(query);
    res.send({ 'result' : true });
    logger.info('설정값 변경을 시도합니다.', { ip: ip, url: 'modifySettings', query: query, result: result.toString()});
  }
  catch(e) { 
    res.send({ 'result' : null, 'error' : e.toString() });
    logger.error('설정값 변경 중에 오류가 발생했습니다.', { ip: ip, url: 'modifySettings', query: query, result: e.toString()});
  }
});

app.post('//records', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    query = "SELECT * FROM record WHERE date BETWEEN '" + req.body.startDate + "' AND '" + req.body.endDate + "' ORDER BY date, course, timestamp;";
    result = await db.query(query);
    res.send(result);
    logger.info('급식표 데이터를 요청합니다.', { ip: ip, url: 'records', query: query, result: result.toString()});
  }
  catch(e) {
    logger.error('급식표 데이터를 불러오는 중에 오류가 발생했습니다.', { ip: ip, url: 'records', query: query, result: e.toString()});
  }
});

app.post('//requestSettings', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    query = 'SELECT * FROM settings;';
    result = await db.query(query);
    let reply = {};
    for(let obj of result) reply[obj.name] = obj.value;
    res.send(reply);
    logger.info('설정값을 요청합니다.', { ip: ip, url: 'requestSettings', query: query, result: result.toString()});
  }
  catch(e) {
    logger.error('설정값을 불러오는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestSettings', query: query, result: e.toString()});
  }
});

app.post('//requestNameList', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let semister, query, result;
  try {
    if(req.body.semister == 'this') semister = await settings('currentSemister');
    else if(req.body.semister == 'past') {
      let tmp = await settings('currentSemister').split('-');
      if(tmp[1] == '2') semister = tmp[0] + '-1';
      else semister = (Number(tmp[0]) - 1) + '-2';
    }
    else semister = req.body.semister;
    query = 'SELECT * FROM `namelist_' + semister + '`;';
    result = await db.query(query);
    res.send(result);
    logger.info('회원 명단을 요청합니다.', { ip: ip, url: 'requestNameList', query: query, result: result.toString()});
  }
  catch(e) {
    logger.error('회원 명단을 불러오는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestNameList', query: query, result: e.toString()});
  }
});

app.post('//isAllowedAdminConsole', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    query = 'SELECT role FROM `namelist_' + await settings('currentSemister') + "` WHERE ID='" + req.session.ID + "';";
    result = await db.query(query);
    if(result[0].role != "회원") res.send({ 'result' : true });
    else res.send({ 'result' : null });
    logger.info('관리자 권한이 있는지 확인합니다.', { ip: ip, url: 'isAllowedAdminConsole', query: query, result: result.toString()});
  }
  catch(e) {
    res.send({ 'result' : null, 'error' : e.toString() });
    logger.error('관리자 권한이 있는지 확인하는 중에 오류가 발생했습니다.', { ip: ip, url: 'isAllowedAdminConsole', query: query, result: e.toString()});
  }
});

app.post('//modifyMember', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    let data = req.body;
    query = 'UPDATE `namelist_' + await settings('currentSemister') + "` SET college='" + data.college + "', department='" + data.department + "', name='" + data.name + "', phone='" + data.phone + "', birthday='" + data.birthday + "', 1365ID='" + data['1365ID'] + "', role='" + data.role + "', register='" + data.register + "' WHERE ID='" + data.ID + "';";
    result = await db.query(query);
    res.send({ 'result' : true });
    logger.info('회원 정보를 수정합니다.', { ip: ip, url: 'modifyMember', query: query, result: result.toString()});
  }
  catch(e) {
    res.send({ 'result' : null, 'error' : e.toString() });
    logger.error('회원 정보를 수정하는 중에 오류가 발생했습니다.', { ip: ip, url: 'modifyMember', query: query, result: e.toString()});
  }
});

app.post('//deleteMember', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    query = "DELETE FROM `namelist_" + await settings('currentSemister') + "` WHERE ID=" + req.body.delete + ";";
    result = await db.query(query);
    if(result.affectedRows) {
      res.send({ 'result' : true });
      logger.info('회원을 제명합니다.', { ip: ip, url: 'deleteMember', query: query, result: result.toString()});
    }
    else {
      res.send({ 'result' : null });
      logger.info('회원을 제명합니다.', { ip: ip, url: 'deleteMember', query: query, result: result.toString()});
    }
  }
  catch(e) {
    res.send({ 'result' : null });
    logger.error('회원을 제명하는 중에 오류가 발생했습니다.', { ip: ip, url: 'deleteMember', query: query, result: e.toString()});
  }
});

app.post('//insertIntoTable', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    let payload = req.body;
    query = "SELECT * FROM record WHERE ID=" + payload.ID + " AND name='" + payload.name + "' AND date='" + payload.date + "' AND course='" + payload.course + "';";
    let test = await db.query(query);
    if(test.length) {
      logger.info('급식을 신청했지만 중복 신청으로 거부되었습니다.', { ip: ip, url: 'insertIntoTable', query: query, result: test});
      return res.status(406).send({ 'result' : null, 'error' : { 'code' : 'DUP_RECORD' } }); 
    }
    query = "INSERT INTO record(ID, name, date, course) VALUES(" + payload.ID + ", '" + payload.name + "', '" + payload.date + "', '" + payload.course + "');";
    result = await db.query(query);
    res.send({ 'result' : true });
    logger.info('급식을 신청합니다.', { ip: ip, url: 'insertIntoTable', query: query, result: result.toString()});
  }
  catch(e) {
    res.status(406).send({ 'result' : null, 'error' : e });
    logger.info('급식을 신청하는 중에 오류가 발생했습니다.', { ip: ip, url: 'insertIntoTable', query: query, result: e.toString()});
  }
});

app.post('//deleteFromTable', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    let payload = req.body;
    query = "DELETE FROM record WHERE ID=" + payload.ID + " AND name='" + payload.name + "' AND date='" + payload.date + "' AND course='" + payload.course + "';";
    result = await db.query(query);
    res.send({ 'result' : true });
    logger.info('급식 신청을 삭제합니다.', { ip: ip, url: 'deleteFromTable', query: query, result: result.toString()});
  }
  catch(e) {
    res.send({ 'result' : null, 'error' : e.toString() });
    logger.error('급식 신청을 삭제하는 중에 오류가 발생했습니다.', { ip: ip, url: 'deleteFromTable', query: query, result: e.toString()});
  }
});

app.post('//requestVerifyList', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let record, verify, result;
  try {
    record = await db.query("SELECT * FROM record WHERE date='" + req.body.date + "' ORDER BY course;");
    verify = await db.query("SELECT * FROM verify WHERE date='" + req.body.date + "' ORDER BY course;");
    result = { 'record' : record, 'verify' : verify };
    res.send(result);
    logger.info('급식 인증 기록을 요청합니다.', { ip: ip, url: 'requestVerifyList', query: '-', result: result.toString()});
  }
  catch(e) {
    logger.error('급식 인증 기록을 요청하는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestVerifyList', query: '-', result: e.toString()});
  }
});

app.post('//verify', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result
  try {
    let payload = JSON.parse(req.body.data);
    for(let obj of payload) {
      query = "INSERT INTO verify(ID, date, name, course, score) VALUES(" + obj.ID + ", '" + obj.date + "', '" + obj.name + "', '" + obj.course + "', '" + obj.score + "');";
      result = await db.query(query);
      logger.info('급식을 인증합니다.', { ip: ip, url: 'verify', query: query, result: result.toString()});
    }
    res.send({ 'result' : true });
  }
  catch(e) {
    res.status(406).send({ 'error' : e.toString() });
    logger.error('급식을 인증하는 중에 오류가 발생했습니다.', { ip: ip, url: 'verify', query: query, result: e.toString()});
  }
});

app.post('//deleteVerify', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    let payload = JSON.parse(req.body.data);
    for(let obj of payload) {
      query = "DELETE FROM verify WHERE ID=" + obj.ID + " AND date='" + obj.date + "' AND name='" + obj.name + "' AND course='" + obj.course + "';";
      result = await db.query(query);
      logger.info('급식 인증을 삭제합니다.', { ip: ip, url: 'deleteVerify', query: query, result: result.toString()});
    }
    res.send({ 'result' : true });
  }
  catch(e) {
    res.status(406).send({ 'error' : e.toString() });
    logger.error('급식 인증을 삭제하는 중에 오류가 발생했습니다.', { ip: ip, url: 'deleteVerify', query: query, result: e.toString()});
  }
});

app.post('//requestLatestVerify', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    query = "SELECT * FROM verify ORDER BY date DESC LIMIT 1;";
    result = await db.query(query);
    res.send(result);
    logger.info('마지막으로 인증한 날짜를 요청합니다.', { ip: ip, url: 'requestLatestVerify', query: query, result: result.toString()});
  }
  catch(e) {
    logger.error('마지막으로 인증한 날짜를 요청하는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestLatestVerify', query: query, result: e.toString()});
  }
});

app.post('//requestNamelistTables', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    let data = [];
    query = 'SHOW TABLES;';
    result = await db.query(query);
    for(let obj of result) {
      if(obj['Tables_in_ajoumeow'].includes('namelist')) data.push(obj);
    }
    res.send(data);
    logger.info('회원 명단 테이블 이름 목록을 요청합니다.', { ip: ip, url: 'requestNamelistTables', query: query, result: result.toString()});
  }
  catch(e) {
    logger.info('회원 명단 테이블 이름 목록을 요청하는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestNamelistTables', query: query, result: e.toString()});
  }
});

app.post('//request1365', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  try {
  let verify = await db.query("SELECT * FROM verify WHERE REPLACE(SUBSTRING_INDEX(date, '-', 2), '-', '')='" + req.body.month.replace('-', '') + "';");
  let namelist = await db.query("SELECT * FROM `" + req.body.namelist + "`;");
  let data = [];

  for(let obj of verify) {
    let person = data.find(o => o.ID == obj.ID);
    if(person) {
      let day = person.date.find(o => +o.day == +obj.date);
      if(day) day.hour++;
      else {
        person.date.push({
          day: obj.date,
          hour: 1
        });
      }
    }
    else {
      let member = namelist.find(o => o.ID == obj.ID);
      if(member) {
        data.push({
          ID: member.ID,
          name: member.name,
          '1365ID' : member['1365ID'],
          birthday: member.birthday,
          date: [ { day: obj.date, hour: 1 } ]
        });
      }
    }
  }
  /*
  const getDaysInMonth = (month, year) => (new Array(31)).fill('').map((v, i) => new Date(year, month - 1, i + 1)).filter(v => v.getMonth() === month - 1);
  let [year, month] = req.body.month.split('-'), data = [];

  for(let date of getDaysInMonth(Number(month), Number(year))) {
    let people = [];
    for(let record of verify) {
      if(+record.date == +date) {
        let person = people.find(o => o.ID == record.ID);
        if(person) person.hour++;
        else {
          let human = namelist.find(o => o.ID == record.ID);
          if(human) {
            people.push({
              ID: human.ID,
              name : human.name,
              birthday: human.birthday,
              '1365ID' : human['1365ID'],
              hour : 1
            });
          }
        }
      }
    }
    data.push({
      date: date,
      people: people
    });
  }
  */
  request.post({
    url: 'https://script.google.com/macros/s/AKfycbw3VnMUXHLQJY5Te8aFX1uJLR0wQt2y5XMvvNaLQnPbLJ59UiQ/exec',
    body: JSON.stringify(data),
    followAllRedirect: true
  },
  function(error, response, body) {
    if (error) console.log(error);
    else {
      request(response.headers['location'], function(error, response, data) {
        let buf = Buffer.from(data, 'base64');
        fs.writeFile('인증서.pdf', buf, error => {
          if (error) throw error;
        });
        res.send({ result : true });
      });
    }
  });
  logger.info('1365 인증서를 요청합니다.', { ip: ip, url: 'request1365', query: '-', result: 'ok'});
  }
  catch(e) {
    logger.error('1365 인증서를 요청하는 중에 오류가 발생했습니다.', { ip: ip, url: 'request1365', query: '-', result: e.toString()});
  }
});

app.get('//download1365', function(req, res) {
  res.download('인증서.pdf');
});

app.post('//requestNotice', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let query, result;
  try {
    query = "SELECT value FROM settings WHERE name='notice';";
    result = await db.query(query);
    let notice = result[0].value.split('$');
    res.send({ 'result' : true, 'version' : notice[0], 'notice' : notice[1] });
    logger.info('공지사항을 불러옵니다.', { ip: ip, url: 'requestNotice', query: query, result: result.toString()});
  }
  catch(e) {
    logger.error('공지사항을 불러오는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestNotice', query: query, result: e.toString()});
  }
});

app.post('//requestLogs', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  try {
    fs.readFile('server.log', 'utf8', function(err, data) {
      let array = data.split('\n');
      array.pop();
      for(let i in array) array[i] = JSON.parse(array[i]);
      res.send(array);
    });
  }
  catch(e) {
    console.log(e)
  }
});

app.post('//requestStat', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  let result;
  try {
    let data = [];
    let verify = await db.query("SELECT * FROM verify WHERE REPLACE(SUBSTRING_INDEX(date, '-', 2), '-', '')='" + dateformat(new Date(), 'yyyymm') + "';");
    let namelist = await db.query("SELECT * FROM `namelist_" + await settings('currentSemister') + "`;");

    for(let obj of verify) {
      let person = data.find(o => o.ID == obj.ID);
      if(!person) {
        let member = namelist.find(o => o.ID == obj.ID);
        if(member) data.push({ ID: member.ID });
      }
    }
    result = {
      time: verify.length,
      people: data.length,
      total: namelist.length
    };
    res.send(result);
    logger.info('활동 통계를 불러옵니다.', { ip: ip, url: 'requestStat', query: '-', result: result.toString()});
  }
  catch(e) {
    logger.error('활동 통계를 불러옵니다.', { ip: ip, url: 'requestStat', query: '-', result: e.toString()});
  }
});

app.post('//requestStatistics', async function(req, res) {
  const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
  try {
    let namelist = await db.query("SELECT * FROM `namelist_" + await settings('currentSemister') + "`;");
    let data = [];
    
    if(req.body.type == 'thisMonthFeeding') {
      let verify = await db.query("SELECT * FROM verify WHERE REPLACE(SUBSTRING_INDEX(date, '-', 2), '-', '')='" + dateformat(new Date(), 'yyyymm') + "';");
      for(let obj of verify) {
        if(obj.course.includes('코스')) {
          let person = data.find(o => o.ID == obj.ID);
          if(person) person.score = person.score + Number(obj.score);
          else {
            let member = namelist.find(o => o.ID == obj.ID);
            if(member) {
              data.push({
                ID: member.ID,
                name: member.name,
                score: Number(obj.score)
              });
            }
          }
        }
      }
    }
    else if(req.body.type == 'lastMonthFeeding') {
      let date = new Date();
      date.setMonth(date.getMonth() - 1);
      let verify = await db.query("SELECT * FROM verify WHERE REPLACE(SUBSTRING_INDEX(date, '-', 2), '-', '')='" + dateformat(date, 'yyyymm') + "';");
      for(let obj of verify) {
        if(obj.course.includes('코스')) {
          let person = data.find(o => o.ID == obj.ID);
          if(person) person.score = person.score + Number(obj.score);
          else {
            let member = namelist.find(o => o.ID == obj.ID);
            if(member) {
              data.push({
                ID: member.ID,
                name: member.name,
                score: Number(obj.score)
              });
            }
          }
        }
      }
    }
    else if(req.body.type == 'thisMonthTotal') {
      let verify = await db.query("SELECT * FROM verify WHERE REPLACE(SUBSTRING_INDEX(date, '-', 2), '-', '')='" + dateformat(new Date(), 'yyyymm') + "';");
      for(let obj of verify) {
        let person = data.find(o => o.ID == obj.ID);
        if(person) person.score = person.score + Number(obj.score);
        else {
          let member = namelist.find(o => o.ID == obj.ID);
          if(member) {
            data.push({
              ID: member.ID,
              name: member.name,
              score: Number(obj.score)
            });
          }
        }
      }
    }
    else if(req.body.type == 'totalStatistics') {
      let verify = await db.query("SELECT * FROM verify;");
      for(let obj of verify) {
        let person = data.find(o => o.ID == obj.ID);
        if(person) person.score = person.score + Number(obj.score);
        else {
          let member = namelist.find(o => o.ID == obj.ID);
          if(member) {
            data.push({
              ID: member.ID,
              name: member.name,
              score: Number(obj.score)
            });
          }
        }
      }
    }
    res.send(data);
    logger.info('활동 통계를 불러옵니다.', { ip: ip, url: 'requestStatistics', query: '-', result: data.toString()});
  }
  catch(e) {
    logger.info('활동 통계를 불러오는 중에 오류가 발생했습니다.', { ip: ip, url: 'requestStatistics', query: '-', result: e.toString()});
  }
});

app.listen(5710, async function() {
  db = await pool.getConnection();
  console.log('Server startup at ' + new Date() + '\nServer is listening on port 5710');
  logger.info('Server Startup.', { ip: 'LOCALHOST', url: 'SERVER', query: '-', result: 'Server listening on port 5710'});
});

async function settings(name) {
  let res = await db.query(`SELECT name, value FROM settings WHERE name='` + name + `';`);
  return res[0].value;
}

function log(ip, identity, type, description, query, result) {
  try {
    query = query.replace(/"/g, "'").replace(/`/g, "'").replace(/'/g, '');
    result = JSON.stringify(result).replace(/"/g, "'").replace(/`/g, "'").replace(/'/g, "");
    db.query("DELETE FROM log WHERE timestamp < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY))");
    db.query("INSERT INTO log(ip, identity, type, query, description, result) VALUES('" + ip + "', '" + identity + "', '" + type + "', '" + query + "', '" + description + "', '" + result + "');");
  }
  catch(e) {
    let error = JSON.stringify(e).replace(/"/g, "'").replace(/`/g, "'").replace(/'/g, "");
    db.query("INSERT INTO log(ip, identity, type, query, description, result) VALUES('-', '-', '" + type + "', 'Logging Error', 'Logging Error', '" + error + "');"); }
}
  
  