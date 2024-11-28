const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const axios = require('axios');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');
const cron = require('node-cron');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const xlsx = require('xlsx');

const app = express();
const port = 8000; 

app.use(cors()); // 모든 도메인에 대해 요청을 허용

app.use(bodyParser.json());

const db = mysql.createConnection({
  host: '61.82.123.118',
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

app.listen(port, () => console.log(`Server running on port ${port}`));

// 총 누적 카운트 조회 API
app.get('/api/total-generated-count', (req, res) => {
  const query = 'SELECT COUNT(*) AS totalGeneratedCount FROM GeneratedNumbers';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching total generated count:', err);
      res.status(500).send('Error fetching total generated count');
      return;
    }
    res.json({ totalGeneratedCount: results[0].totalGeneratedCount });
  });
});

// 회차별 데이터 조회 API
app.get('/api/weeks', (req, res) => {
  const query = 'SELECT DISTINCT DrawNumber FROM LottoWinningNumbers ORDER BY DrawNumber DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching weeks data:', err);
      res.status(500).send('Error fetching weeks data');
      return;
    }
    res.json(results.map(row => row.DrawNumber));
  });
});

// 회차별 결과 조회 API
app.get('/api/lotto-stats/:drawNumber', async (req, res) => {
  try {
    const drawNumber = req.params.drawNumber;
    const winningNumbersQuery = `SELECT WinningNumbers, BonusNumber FROM LottoWinningNumbers WHERE DrawNumber = ?`;

    db.query(winningNumbersQuery, [drawNumber], (error, winningNumbersResult) => {
      if (error) {
        console.error('Error fetching winning numbers:', error);
        return res.status(500).json({ error: 'Error fetching winning numbers' });
      }

      if (winningNumbersResult.length === 0) {
        return res.status(404).json({ error: 'No winning numbers found for the specified draw number' });
      }

      const { WinningNumbers, BonusNumber } = winningNumbersResult[0];

      const generatedNumbersQuery = `SELECT GeneratedNumbers FROM GeneratedNumbers WHERE DrawNumber = ?`;

      db.query(generatedNumbersQuery, [drawNumber], (error, generatedNumbersResult) => {
        if (error) {
          console.error('Error fetching generated numbers:', error);
          return res.status(500).json({ error: 'Error fetching generated numbers' });
        }

        const winningCounts = {
          first: 0,
          second: 0,
          third: 0,
          fourth: 0,
          fifth: 0
        };

        generatedNumbersResult.forEach(({ GeneratedNumbers }) => {
          if (GeneratedNumbers) {
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
          }
        });

        const totalGeneratedNumbers = generatedNumbersResult.length;

        const winningRates = {
          first: winningCounts.first / totalGeneratedNumbers,
          second: winningCounts.second / totalGeneratedNumbers,
          third: winningCounts.third / totalGeneratedNumbers,
          fourth: winningCounts.fourth / totalGeneratedNumbers,
          fifth: winningCounts.fifth / totalGeneratedNumbers,
          firstMatchedNumbers: winningCounts.first,
          secondMatchedNumbers: winningCounts.second,
          thirdMatchedNumbers: winningCounts.third,
          fourthMatchedNumbers: winningCounts.fourth,
          fifthMatchedNumbers: winningCounts.fifth,
          WinningNumbers: WinningNumbers,
          totalGeneratedNumbers: totalGeneratedNumbers
        };
        res.json(winningRates);
      });
    });
  } catch (error) {
    console.error('Error calculating winning rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 로또 번호 저장 API
app.post('/api/lotto-numbers', (req, res) => {
  const now = new Date();
  const generationTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC 시간에 9시간 추가
  const { generatedNumbers, generationWeek } = req.body; 
  const drawNumber = getCurrentDrawNumber(); 

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
    const response = await axios.get('https://dhlottery.co.kr/gameResult.do?method=byWin', {
      responseType: 'arraybuffer'
    });

    const html = iconv.decode(Buffer.from(response.data), 'EUC-KR');
    const $ = cheerio.load(html);

    const drawNumberMatch = $('.win_result h4 strong').text().replace(/회/, '').trim();
    const drawDateMatch = formatDate($('.win_result p.desc').text().match(/\((.*?)\)/)[1].replace(/추첨/, '').trim());
    const winningNumbersMatch = $('.win_result .nums .num.win span').map((i, el) => $(el).text()).get().join(', ');
    const bonusNumberMatch = $('.win_result .nums .num.bonus span').text().trim();
    const totalSalesMatch = $('ul.list_text_common li strong').last().text().match(/[\d,]+원/)[0].replace(/\D+|원/g, '');
    const firstPrizeWinnersMatch = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(0).find('td').eq(2).text().replace(/,/g, ''), 10);
    const firstPrizeAmountMatch = $('.tbl_data.tbl_data_col tbody tr').eq(0).find('td').eq(3).text().replace(/\D+/g, '');
    const secondPrizeWinnersMatch = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(1).find('td').eq(2).text().replace(/,/g, ''), 10); 
    const secondPrizeAmountMatch = $('.tbl_data.tbl_data_col tbody tr').eq(1).find('td').eq(3).text().replace(/\D+/g, '');
    const thirdPrizeWinnersMatch = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(2).find('td').eq(2).text().replace(/,/g, ''), 10); 
    const thirdPrizeAmountMatch = $('.tbl_data.tbl_data_col tbody tr').eq(2).find('td').eq(3).text().replace(/\D+/g, '');
    const fourthPrizeWinnersMatch = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(3).find('td').eq(2).text().replace(/,/g, ''), 10); 
    const fourthPrizeAmountMatch = $('.tbl_data.tbl_data_col tbody tr').eq(3).find('td').eq(3).text().replace(/\D+/g, '');
    const fifthPrizeWinnersMatch = parseInt($('.tbl_data.tbl_data_col tbody tr').eq(4).find('td').eq(2).text().replace(/,/g, ''), 10); 
    const fifthPrizeAmountMatch = $('.tbl_data.tbl_data_col tbody tr').eq(4).find('td').eq(3).text().replace(/\D+/g, '');

    const drawNumber = drawNumberMatch || '정보 없음 : 회차 정보 없음';
    const drawDate = drawDateMatch || '정보 없음 : 추첨일자 정보 없음';
    const winningNumbers = winningNumbersMatch || '정보 없음 : 당첨 번호 정보 없음';
    const bonusNumber = bonusNumberMatch || '정보 없음 : 보너스 번호 정보 없음';
    const totalSales = totalSalesMatch || '정보 없음 : 총 판매 금액 정보 없음';
    const firstPrizeWinners = firstPrizeWinnersMatch || '정보 없음 : 1등 당첨자 수 정보 없음';
    const firstPrizeAmount = firstPrizeAmountMatch || '정보 없음 : 1등 당첨금 정보 없음';
    const secondPrizeWinners = secondPrizeWinnersMatch || '정보 없음 : 2등 당첨자 수 정보 없음';
    const secondPrizeAmount = secondPrizeAmountMatch || '정보 없음 : 2등 당첨금 정보 없음';
    const thirdPrizeWinners = thirdPrizeWinnersMatch || '정보 없음 : 3등 당첨자 수 정보 없음';
    const thirdPrizeAmount = thirdPrizeAmountMatch || '정보 없음 : 3등 당첨금 정보 없음';
    const fourthPrizeWinners = fourthPrizeWinnersMatch || '정보 없음 : 4등 당첨자 수 정보 없음';
    const fourthPrizeAmount = fourthPrizeAmountMatch || '정보 없음 : 4등 당첨금 정보 없음';
    const fifthPrizeWinners = fifthPrizeWinnersMatch || '정보 없음 : 5등 당첨자 수 정보 없음';
    const fifthPrizeAmount = fifthPrizeAmountMatch || '정보 없음 : 5등 당첨금 정보 없음';

    const generationTime = new Date();

    const sql = `INSERT INTO LottoWinningNumbers 
                  (DrawNumber, DrawDate, WinningNumbers, BonusNumber, TotalSales, 
                  FirstPrizeWinners, FirstPrizeAmount, SecondPrizeWinners, SecondPrizeAmount, 
                  ThirdPrizeWinners, ThirdPrizeAmount, FourthPrizeWinners, FourthPrizeAmount, 
                  FifthPrizeWinners, FifthPrizeAmount, generationTime) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
      drawNumber, drawDate, winningNumbers, bonusNumber, totalSales,
      firstPrizeWinners, firstPrizeAmount, secondPrizeWinners,
      secondPrizeAmount, thirdPrizeWinners, thirdPrizeAmount,
      fourthPrizeWinners, fourthPrizeAmount,
      fifthPrizeWinners, fifthPrizeAmount, generationTime
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

// 엑셀 파일 업로드 API
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    const workbook = xlsx.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    data.shift();

    const insertData = data.map(row => [
      row[0], 
      row[1], 
      row[2].replace(/\./g, '-'), 
      row[3], 
      parseInt(row[4].replace(/,/g, ''), 10), 
      row[5], 
      parseInt(row[6].replace(/,/g, ''), 10), 
      row[7], 
      parseInt(row[8].replace(/,/g, ''), 10), 
      row[9], 
      parseInt(row[10].replace(/,/g, ''), 10), 
      row[11], 
      parseInt(row[12].replace(/,/g, ''), 10),
      row.slice(-8, -2).join(','), 
      row[row.length - 1]
    ]);

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

// 매주 토요일 22시(10PM)에 데이터 스크래핑 및 저장
cron.schedule('00 13 * * 6', () => {
  console.log('Running a task every Saturday at 21:00');
  scrapeAndSaveData();
});

function formatDate(dateStr) {
  const parts = dateStr.match(/(\d{4})년 (\d{2})월 (\d{2})일/);
  if (!parts) {
    console.error('날짜 형식이 잘못되었습니다:', dateStr);
    return null; 
  }
  return `${parts[1]}-${parts[2]}-${parts[3]}`;
}

function getCurrentDrawNumber() {
  const baseDrawNumber = 1126;
  const baseDate = new Date('2024-06-29T13:00:00Z'); 
  const now = new Date();
  const oneWeekMilliseconds = 7 * 24 * 60 * 60 * 1000;
  const weeksPassed = Math.floor((now - baseDate) / oneWeekMilliseconds);
  const currentWeekSaturday = new Date(baseDate.getTime() + weeksPassed * oneWeekMilliseconds);
  const hasPassedThisWeeksDraw = now > currentWeekSaturday;
  //const currentDrawNumber = baseDrawNumber + (hasPassedThisWeeksDraw ? 1 : 0);
  const currentDrawNumber = 1148;  
  return currentDrawNumber; // 
}
