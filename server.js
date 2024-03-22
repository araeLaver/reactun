const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const cron = require('node-cron');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const xlsx = require('xlsx');


const app = express();
const port = 3000; // Express 서버의 포트 번호를 MySQL 기본 포트와 다르게 설정
app.listen(port, () => console.log(`Server running on port ${port}`));

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: '221.149.48.232',
  user: 'downdan',
  password: 'Untab12#$12',
  database: 'downdan'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// db.on('error', err => {
//   console.error('db error', err);
//   if (err.code === 'PROTOCOL_CONNECTION_LOST') {
//     handleDisconnect();
//   } else {
//     throw err;
//   }
// });




// 회차별 데이터 조회 API
app.get('/api/weeks', (req, res) => {

// console.log(' ::weeks value:: ');
  // 여기서는 'LottoWinningNumbers' 테이블에서 회차 정보('DrawNumber')를 조회합니다.
  const query = 'SELECT DISTINCT DrawNumber FROM LottoWinningNumbers ORDER BY DrawNumber DESC';

  // console.log(' ::req.params1:: ' + req);
// console.log(' ::err:: ' + err);
// console.log(' ::results:: ' + results);

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching weeks data:', err);
      res.status(500).send('Error fetching weeks data');
      return;
    }
    // 회차 정보만 추출하여 응답으로 반환
    res.json(results.map(row => row.DrawNumber));
  });
});

// 회차별 결과
// app.get('/api/lotto-stats/:drawNumber', async (req, res) => {
// console.log(' ::req.params:: ' + req.params);
//   const drawNumber = req.params.drawNumber;
// console.log(' ::drawNumber:: ' + drawNumber);
//   const query = `
//     SELECT FirstPrizeWinners, SecondPrizeWinners, ThirdPrizeWinners, FourthPrizeWinners, FifthPrizeWinners
//     FROM LottoWinningNumbers
//     WHERE DrawNumber = ?
//   `;
// console.log(' ::query:: ' + query);
//   try {
//     const [rows] = await db.promise().query(query, [drawNumber]);
//     if (rows.length > 0) {
//       res.json(rows[0]);
//     } else {
//       res.status(404).send('Not found');
//     }
//   } catch (err) {
//     console.error('Database error:', err);
//     res.status(500).send('Server error');
//   }
// });

app.get('/api/lotto-stats/:drawNumber', async (req, res) => {
  try {
    const drawNumber = req.params.drawNumber;

    //console.log(' ::drawNumber:: ' + drawNumber);
    // 1. 당첨 번호 및 보너스 번호 가져오기
    const winningNumbersQuery = `SELECT WinningNumbers, BonusNumber FROM LottoWinningNumbers WHERE DrawNumber = ?`;
    // console.log(' ::winningNumbersQuery:: ' + winningNumbersQuery);  


      // 콜백을 사용하여 쿼리 실행
      db.query(winningNumbersQuery, [drawNumber], (error, winningNumbersResult) => {
        if (error) {
          console.error('Error fetching winning numbers:', error);
          return res.status(500).json({ error: 'Error fetching winning numbers' });
        }

        // console.log(' ::winningNumbersResult:: ' + JSON.stringify(winningNumbersResult));
        // console.log(' ::winningNumbersResult.length:: ' + winningNumbersResult.length);

        // 결과가 없을 경우 오류 처리
        if (winningNumbersResult.length === 0) {
          return res.status(404).json({ error: 'No winning numbers found for the specified draw number' });
        }


        const { WinningNumbers, BonusNumber } = winningNumbersResult[0];
        // 이하 로직은 이전과 동일하게 유지
// console.log('@::winningCounts::@' + WinningNumbers + "@::BonusNumber::@" + BonusNumber);

        // 2. 생성된 번호 가져오기
    const generatedNumbersQuery = `SELECT GeneratedNumbers FROM GeneratedNumbers WHERE DrawNumber = ?`;
    
    db.query(generatedNumbersQuery, [drawNumber], (error, generatedNumbersResult) => {
      if (error) {
        console.error('Error fetching generated numbers:', error);
        return res.status(500).json({ error: 'Error fetching generated numbers' });
      }
      
        // 여기서부터는 생성된 번호를 처리하는 로직을 진행합니다.
        // 3. 등수별로 생성된 번호의 개수를 저장할 객체 초기화
        const winningCounts = {
          first: 0,
          second: 0,
          third: 0,
          fourth: 0,
          fifth: 0
      };
// console.log(' ::generatedNumbersQuery:: ' + generatedNumbersQuery);
// console.log(' ::generatedNumbersResult:: ' + JSON.stringify(generatedNumbersResult));
// console.log(' ::winningCounts:: ' + JSON.stringify(winningCounts));

       // 4. 생성된 번호마다 당첨 번호와 비교하여 등수 결정 및 카운트
        generatedNumbersResult.forEach(({ GeneratedNumbers }) => {
          const generatedNumberList = GeneratedNumbers.split(',').map(Number);
          const matchedNumbers = generatedNumberList.filter(num => WinningNumbers.includes(num));
          const matchedCount = matchedNumbers.length;
          const isBonusMatch = generatedNumberList.includes(BonusNumber);

          if (matchedCount === 6) {
              winningCounts.first++;
          } else if (matchedCount === 5 && isBonusMatch) {
              winningCounts.second++;
          } else if (matchedCount === 5) {
              winningCounts.third++;
          } else if (matchedCount === 4) {
              winningCounts.fourth++;
          } else if (matchedCount === 3) {
              winningCounts.fifth++;
          }
      });

         // 5. 전체 생성된 번호 수 계산
        const totalGeneratedNumbers = generatedNumbersResult.length;

        // 6. 등수별 비율 계산
        const winningRates = {
          // 비율 = (등수별 생성된 번호 수) / (전체 생성된 번호 수)
            first: winningCounts.first / totalGeneratedNumbers,
            second: winningCounts.second / totalGeneratedNumbers,
            third: winningCounts.third / totalGeneratedNumbers,
            fourth: winningCounts.fourth / totalGeneratedNumbers,
            fifth: winningCounts.fifth / totalGeneratedNumbers,
          // 매칭건수
          firstMatchedNumbers: winningCounts.first,
          secondMatchedNumbers: winningCounts.second,
          thirdMatchedNumbers: winningCounts.third,
          fourthMatchedNumbers: winningCounts.fourth,
          fifthMatchedNumbers: winningCounts.fifth,
          // 1등 번호
          WinningNumbers: WinningNumbers,

          // 전체 생성된 번호 수
           totalGeneratedNumbers: totalGeneratedNumbers

        };
        // 7. 결과 반환
        res.json(winningRates);

    });  

    });
     
     
    

  } catch (error) {
    console.error('Error calculating winning rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// 클릭 생성기에서 생성된 로또 번호를 저장하는 API
app.post('/api/lotto-numbers', (req, res) => {
  // const { generatedNumbers, generationWeek } = req.body;
  const generationTime = new Date();
  const { generatedNumbers, generationWeek } = req.body; // 생성된 번호 및 생성 주차
  const drawNumber = getCurrentDrawNumber(); // 현재 회차 계산
  
  // const sql = 'INSERT INTO GeneratedNumbers (GeneratedNumbers, GenerationWeek, GenerationTime) VALUES (?, ?, ?)';
  // db.query(sql, [generatedNumbers, generationWeek, generationTime], (err, result) => {
// 데이터베이스에 저장하는 쿼리
  const sql = 'INSERT INTO GeneratedNumbers (GeneratedNumbers, GenerationWeek, GenerationTime, DrawNumber) VALUES (?, ?, ?, ?)';
  db.query(sql, [generatedNumbers, generationWeek, generationTime, drawNumber], (err, result) => {
    if (err) {
      console.error('Failed to insert lotto numbers:', err);
      res.status(500).send('Failed to insert data');
      return;
    }
    res.send('Lotto numbers inserted successfully');
  });
});

// 데이터 스크래핑 및 저장 함수
const scrapeAndSaveData = async () => {

  try {
      //const response = await axios.get('https://dhlottery.co.kr/gameResult.do?method=byWin');
      const response = await axios.get('https://dhlottery.co.kr/gameResult.do?method=byWin', {
        responseType: 'arraybuffer'
      });

      // const html = iconv.decode(response.data, 'EUC-KR'); // response.data;
      const html = iconv.decode(Buffer.from(response.data), 'EUC-KR');
      const $ = cheerio.load(html);

      const drawNumberMatch          = $('.win_result h4 strong').text().replace(/회/, '').trim();
      const drawDateMatch            = formatDate($('.win_result p.desc').text().match(/\((.*?)\)/)[1].replace(/추첨/, '').trim());
      const winningNumbersMatch      = $('.win_result .nums .num.win span').map((i, el) => $(el).text()).get().join(', ');
      const bonusNumberMatch         = $('.win_result .nums .num.bonus span').text().trim();
      const totalSalesMatch          = $('ul.list_text_common li strong').last().text().match(/[\d,]+원/)[0].replace(/\D+|원/g, '');
      const firstPrizeWinnersMatch    = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(0).find('td').eq(2).text().replace(/,/g, ''), 10);
      const firstPrizeAmountMatch     = $('.tbl_data.tbl_data_col tbody tr').eq(0).find('td').eq(3).text().replace(/\D+/g, '');
      const secondPrizeWinnersMatch  = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(1).find('td').eq(2).text().replace(/,/g, ''), 10); 
      const secondPrizeAmountMatch   = $('.tbl_data.tbl_data_col tbody tr').eq(1).find('td').eq(3).text().replace(/\D+/g, '');
      const thirdPrizeWinnersMatch   = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(2).find('td').eq(2).text().replace(/,/g, ''), 10); 
      const thirdPrizeAmountMatch    = $('.tbl_data.tbl_data_col tbody tr').eq(2).find('td').eq(3).text().replace(/\D+/g, '');
      const fourthPrizeWinnersMatch  = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(3).find('td').eq(2).text().replace(/,/g, ''), 10); 
      const fourthPrizeAmountMatch   = $('.tbl_data.tbl_data_col tbody tr').eq(3).find('td').eq(3).text().replace(/\D+/g, '');
      const fifthPrizeWinnersMatch    = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(4).find('td').eq(2).text().replace(/,/g, ''), 10); 
      const fifthPrizeAmountMatch     = $('.tbl_data.tbl_data_col tbody tr').eq(4).find('td').eq(3).text().replace(/\D+/g, '');

      const drawNumber          = drawNumberMatch ? drawNumberMatch : '정보 없음 : 회차 정보 없음';
      const drawDate            = drawDateMatch ? drawDateMatch : '정보 없음 : 추첨일자 정보 없음';
      const winningNumbers      = winningNumbersMatch ? winningNumbersMatch : '정보 없음 : 당첨 번호 정보 없음';
      const bonusNumber         = bonusNumberMatch ? bonusNumberMatch : '정보 없음 : 보너스 번호 정보 없음';
      const totalSales          = totalSalesMatch ? totalSalesMatch : '정보 없음 : 총 판매 금액 정보 없음';
      const firstPrizeWinners    = firstPrizeWinnersMatch ? firstPrizeWinnersMatch : '정보 없음 : 1등 당첨자 수 정보 없음';
      const firstPrizeAmount     = firstPrizeAmountMatch ? firstPrizeAmountMatch : '정보 없음 : 1등 당첨금 정보 없음';
      const secondPrizeWinners  = secondPrizeWinnersMatch ? secondPrizeWinnersMatch : '정보 없음 : 2등 당첨자 수 정보 없음';
      const secondPrizeAmount   = secondPrizeAmountMatch ? secondPrizeAmountMatch : '정보 없음 : 2등 당첨금 정보 없음';
      const thirdPrizeWinners   = thirdPrizeWinnersMatch ? thirdPrizeWinnersMatch : '정보 없음 : 3등 당첨자 수 정보 없음';
      const thirdPrizeAmount    = thirdPrizeAmountMatch ? thirdPrizeAmountMatch : '정보 없음 : 3등 당첨금 정보 없음';
      const fourthPrizeWinners  = fourthPrizeWinnersMatch ? fourthPrizeWinnersMatch : '정보 없음 : 4등 당첨자 수 정보 없음';
      const fourthPrizeAmount   = fourthPrizeAmountMatch ? fourthPrizeAmountMatch : '정보 없음 : 4등 당첨금 정보 없음';
      const fifthPrizeWinners    = fifthPrizeWinnersMatch ? fifthPrizeWinnersMatch : '정보 없음 : 5등 당첨자 수 정보 없음';
      const fifthPrizeAmount     = fifthPrizeAmountMatch ? fifthPrizeAmountMatch : '정보 없음 : 5등 당첨금 정보 없음';

      

      // console.log(`회차: ${drawNumber}`);
      // console.log(`추첨일자: ${drawDate}`);
      // console.log(`당첨 번호: ${winningNumbers}`);
      // console.log(`보너스 번호: ${bonusNumber}`);
      // console.log(`총 판매 금액: ${totalSales}`);
      // console.log(`1등 당첨자 수: ${firstPrizeWinners}`);
      // console.log(`1등 당첨금: ${firstPrizeAmount}`);
      // console.log(`2등 당첨자 수: ${secondPrizeWinners}`);
      // console.log(`2등 당첨금: ${secondPrizeAmount}`);
      // console.log(`3등 당첨자 수: ${thirdPrizeWinners}`);
      // console.log(`3등 당첨금: ${thirdPrizeAmount}`);
      // console.log(`4등 당첨자 수: ${fourthPrizeWinners}`);
      // console.log(`4등 당첨금: ${fourthPrizeAmount}`);
      // console.log(`5등 당첨자 수: ${fifthPrizeWinners}`);
      // console.log(`5등 당첨금: ${fifthPrizeAmount}`);


      const generationTime = new Date();
      // 데이터베이스에 저장
      //const sql = 'INSERT INTO LottoWinningNumbers (DrawNumber, DrawDate, WinningNumbers, BonusNumber) VALUES (?, ?, ?, ?)';

      const sql = `INSERT INTO LottoWinningNumbers 
                    (DrawNumber, DrawDate, WinningNumbers, BonusNumber, TotalSales, 
                    FirstPrizeWinners, FirstPrizeAmount, SecondPrizeWinners, SecondPrizeAmount, 
                    ThirdPrizeWinners, ThirdPrizeAmount, FourthPrizeWinners, FourthPrizeAmount, 
                    FifthPrizeWinners, FifthPrizeAmount, generationTime) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query
      (
           sql
           , [
                drawNumber, drawDate, winningNumbers, bonusNumber, totalSales
                , firstPrizeWinners, firstPrizeAmount, secondPrizeWinners
                , secondPrizeAmount, thirdPrizeWinners, thirdPrizeAmount
                , fourthPrizeWinners, fourthPrizeAmount
                , fifthPrizeWinners, fifthPrizeAmount, generationTime
              ], (err, result) => {
          if (err) throw err;
          console.log('Data inserted successfully');
      });
  } catch (error) {
      console.error('Error scraping data:', error);
  }
};

// 테스트용 스크래핑 및 저장 API
app.get('/scrape', (req, res) => {
  scrapeAndSaveData().then(() => {
      res.send('Scraping and Saving Data Completed');
  }).catch(error => {
      console.error('Error during scraping:', error);
      res.status(500).send('Error during scraping');
  });
});



// 엑셀 파일 업로드 처리를 위한 라우트 설정
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    const file = req.file; // 요청으로부터 업로드된 파일 가져오기
    //const workbook = xlsx.read(file.buffer, { type: 'buffer' }); // 업로드된 파일을 읽어서 워크북 생성
    const workbook = xlsx.read(file.buffer, { type: 'buffer', cellDates: true }); // 업로드된 파일을 읽어서 워크북 생성
    const sheetName = workbook.SheetNames[0]; // 첫번째 시트 이름 가져오기
    const sheet = workbook.Sheets[sheetName]; // 첫번째 시트 내용 가져오기
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // 시트 내용을 JSON 객체로 변환

    data.shift(); // 헤더 제거


    // console.log(" :: data :: " + data);


    // 데이터베이스에 삽입하기 전에 데이터 처리
    const insertData = data.map(row => [

      row[0], // 년도
      row[1], // 회차
      row[2].replace(/\./g, '-'), // 추첨일
      row[3], // 1등 당첨 게임 수
      parseInt(row[4].replace(/,/g, ''), 10), // 1등 당첨금
      row[5], // 2등 당첨 게임 수
      parseInt(row[6].replace(/,/g, ''), 10), // 2등 당첨금
      row[7], // 3등 당첨 게임 수
      parseInt(row[8].replace(/,/g, ''), 10), // 3등 당첨금
      row[9], // 4등 당첨 게임 수
      parseInt(row[10].replace(/,/g, ''), 10), // 4등 당첨금
      row[11], // 5등 당첨 게임 수
      parseInt(row[12].replace(/,/g, ''), 10), // 5등 당첨금

      // 이하 모든 열에 대해서 처리...
      row.slice(-8, -2).join(','), // 당첨 번호
      row[row.length - 1] // 보너스 번호
    ]);

    // 처리된 데이터를 데이터베이스에 삽입
    insertData.forEach(row => {
      const insertQuery = `
        INSERT INTO LottoResults
        (Year, DrawNumber, DrawDate, FirstPrizeWinners, FirstPrizeAmount, SecondPrizeWinners, SecondPrizeAmount, ThirdPrizeWinners, ThirdPrizeAmount, FourthPrizeWinners, FourthPrizeAmount, FifthPrizeWinners, FifthPrizeAmount, WinningNumbers, BonusNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(insertQuery, row, (err, results) => {
        if (err) {
          console.error('데이터 삽입 실패:', err);
        }
      });
    });

    res.send('데이터 업로드 및 삽입 완료');
  } catch (err) {
    console.error('파일 처리 중 에러 발생:', err);
    res.status(500).send('파일 처리 중 에러 발생');
  }
});



// 최신 회차 정보와 총 생성 번호 수 조회 API
app.get('/api/latest-stats', async (req, res) => {
  try {
    const latestDrawQuery = `
      SELECT DrawNumber, COUNT(*) AS TotalCount 
      FROM GeneratedNumbers 
      GROUP BY DrawNumber 
      ORDER BY DrawNumber DESC 
      LIMIT 1;
    `;

    db.query(latestDrawQuery, (error, results) => {
      if (error) {
        console.error('Error fetching latest draw stats:', error);
        return res.status(500).json({ error: 'Error fetching latest draw stats' });
      }

      // 최신 회차 정보와 총 생성 번호 수 반환
      if (results.length > 0) {
        res.json(results[0]);
      } else {
        res.status(404).json({ error: 'No data found' });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// 매주 토요일 22시(10PM)에 실행
cron.schedule('0 22 * * 6', () => {
  console.log('Running a task every Saturday at 22:00');
  scrapeAndSaveData();
});






function formatDate(dateStr) {
  const parts = dateStr.match(/(\d{4})년 (\d{2})월 (\d{2})일/);
  if (!parts) {
    console.error('날짜 형식이 잘못되었습니다:', dateStr);
    return null; // 또는 기본 날짜 처리
  }
  // parts[0]은 전체 문자열, parts[1]부터 순서대로 연, 월, 일
  return `${parts[1]}-${parts[2]}-${parts[3]}`;
}

// 현재 날짜를 기준으로 회차를 계산하는 함수
function getCurrentDrawNumber() {
  const startDrawNumber = 1111; // 시작 회차
  const startDateTime = new Date('2024-03-09T20:00:00Z'); // 시작 날짜 및 시간 (UTC 기준)

  // 현재 날짜 및 시간 (UTC 기준으로 조정 필요 시 조정)
  const now = new Date();

  // 한 주의 밀리초 (1000 * 60 * 60 * 24 * 7)
  const oneWeekMilliseconds = 604800000;

  // 시작 날짜와 현재 날짜의 차이 (밀리초 단위)
  const diff = now - startDateTime;

  // 차이를 주 단위로 환산 후, 시작 회차에 더해 현재 회차 계산
  const currentDrawNumber = startDrawNumber + Math.floor(diff / oneWeekMilliseconds);

  return currentDrawNumber;
}


