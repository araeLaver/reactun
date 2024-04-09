// import React, { useState } from 'react';
import React, { useState, useEffect } from 'react';
import axios from 'axios'; 
import * as XLSX from 'xlsx';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import './App.css';

Chart.register(ArcElement, Tooltip, Legend);

// const dev = require('dotenv').config();
// const apiUrl = process.env.API_URL;
// const apiPort = process.env.API_PORT;

function App() {

  const [lottoNumbersList, setLottoNumbersList] = useState([]);
  const [allGeneratedNumbers, setAllGeneratedNumbers] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const [drawNumbers, setDrawNumbers] = useState([]);
  const [selectedDrawNumber, setSelectedDrawNumber] = useState('');
  const [latestStats, setLatestStats] = useState({ TotalCount: 0, DrawNumber: '' });
  // 자동 생성 활성화 상태
  const [autoGenerateActive, setAutoGenerateActive] = useState(false); 
  // setInterval ID 저장
  const [generationIntervalId, setGenerationIntervalId] = useState(null); 
 // 특정 번호 입력을 위한 상태
 const [specificNumbers, setSpecificNumbers] = useState(["", "", "", "", ""]);

 const [isLoading, setIsLoading] = useState(false);
//  const [isExpanded, setIsExpanded] = useState(false);

//  총카운트
const [totalGeneratedCount, setTotalGeneratedCount] = useState(0);

// 추첨일 추가
const [announcementDate, setAnnouncementDate] = useState('');
// 발표일 계산 함수
function calculateAnnouncementDate(selectedDrawNumber) {
  const baseDrawNumber = 1113; // 기준 회차
  const baseAnnouncementDate = new Date('2024-04-06'); // 해당 회차의 발표일
  const selectedDraw = parseInt(selectedDrawNumber, 10);

// console.log('@@baseAnnouncementDate@@', baseAnnouncementDate);
// console.log('@@selectedDraw@@', selectedDraw);
// 선택된 회차와 기준 회차 사이의 차이를 주 단위로 계산
  const weeksDifference = selectedDraw - baseDrawNumber;

  // 기준 발표일로부터 차이만큼 주를 더해 새로운 발표일 계산
  const announcementDate = new Date(baseAnnouncementDate);
  announcementDate.setDate(announcementDate.getDate() + weeksDifference * 7);

  return announcementDate.toISOString().slice(0, 10); // YYYY-MM-DD 형식으로 반환
}

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  const [stats, setStats] = useState({
    winningNumbers: '',
    counts: {
      totalGeneratedNumbers: 0,
      firstMatchedNumbers: 0,
      secondMatchedNumbers: 0,
      thirdMatchedNumbers: 0,
      fourthMatchedNumbers: 0,
      fifthMatchedNumbers: 0
    }
  });

  // 특정 번호를 저장할 상태 추가
  // const [includedNumbers, setIncludedNumbers] = useState('');


  useEffect(() => {
    const fetchTotalGeneratedCount = async () => {
      try {
        const response = await axios.get('https://reactun-untab.koyeb.app/api/total-generated-count');
        setTotalGeneratedCount(response.data.totalGeneratedCount);
      } catch (error) {
        console.error('Error fetching total generated count:', error);
      }
    };
  
    fetchTotalGeneratedCount();
  }, []);

  // 추첨일 계산 함수
  useEffect(() => {
    if (selectedDrawNumber) {
      const newAnnouncementDate = calculateAnnouncementDate(selectedDrawNumber);
      // 계산된 발표일을 상태에 저장하거나 직접 사용
      // console.log(newAnnouncementDate); // 예: '2024-04-06' (선택된 회차에 따라 달라짐)
      // 여기서는 상태에 저장하거나, 직접 DOM에 반영하는 로직을 추가합니다.
      setAnnouncementDate(newAnnouncementDate); // 계산된 발표일을 상태에 저장
    }
  }, [selectedDrawNumber]); // 선택된 회차가 변경될 때마다 발표일 다시 계산


 // 컴포넌트가 마운트될 때 fetchLatestStats 함수를 호출//
  useEffect(() => {
    fetchLatestStats();
  }, []);

  useEffect(() => {
    const fetchDrawNumbers = async () => {
      try {
        const response = await axios.get('https://reactun-untab.koyeb.app/api/weeks');
        setDrawNumbers(response.data);
        if (response.data.length > 0) {
          const latestDrawNumber = response.data[0]; // 가장 최근 회차
          setSelectedDrawNumber(latestDrawNumber); // 최신 회차를 설정
        }
      } catch (error) {
        console.error('Error fetching draw numbers:', error);
      }
    };
  
    fetchDrawNumbers();
  }, []); // 컴포넌트 마운트 시에만 실행
  
  

  useEffect(() => {
    // 페이지 로드 시 적중 데이터 갱신
    // updateChartData();

    // 서버로부터 회차 데이터를 불러오는 함수를 호출
    // fetchDrawNumbers();
    // console.log('selectedDrawNumber', selectedDrawNumber);
    if (selectedDrawNumber) {
      axios.get(`https://reactun-untab.koyeb.app/api/lotto-stats/${selectedDrawNumber}`)
        .then(response => {
          const { data } = response;
          // const data = response.data;
  // console.log('@@data@@', data);  

         // 각 등수별 생성된 번호의 개수
         const counts = {
          first: data.firstMatchedNumbers,
          second: data.secondMatchedNumbers,
          third: data.thirdMatchedNumbers,
          fourth: data.fourthMatchedNumbers,
          fifth: data.fifthMatchedNumbers
        };

        // 총 생성된 번호의 개수 계산
        const totalCount = Object.values(counts).reduce((acc, count) => acc + count, 0);

      // 비율 계산 (100% 기준) 및 소수점 두 자리로 반올림
      const rates = Object.keys(counts).map(key => parseFloat(((counts[key] / totalCount) * 100).toFixed(2)));


          if (data) { // 데이터가 있는지 확인
            setChartData({
              labels: ['1등', '2등', '3등', '4등', '5등'],
              datasets: [{
                label: '당첨 비율',
                // data: [data.first, data.second, data.third, data.fourth, data.fifth].map(
                //   item => item || 0 // 데이터가 undefined일 경우 0으로 설정
                // ),
                data: rates,
                backgroundColor: [
                  'rgba(255, 99, 132, 0.2)',
                  'rgba(54, 162, 235, 0.2)',
                  'rgba(255, 206, 86, 0.2)',
                  'rgba(75, 192, 192, 0.2)',
                  'rgba(153, 102, 255, 0.2)',
                ],
                borderColor: [
                  'rgba(255, 99, 132, 1)',
                  'rgba(54, 162, 235, 1)',
                  'rgba(255, 206, 86, 1)',
                  'rgba(75, 192, 192, 1)',
                  'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
              }],
            });

            setStats({
                winningNumbers: data.WinningNumbers,
                counts: {
                  totalGeneratedNumbers: data.totalGeneratedNumbers,
                  firstMatchedNumbers: data.firstMatchedNumbers,
                  secondMatchedNumbers: data.secondMatchedNumbers,
                  thirdMatchedNumbers: data.thirdMatchedNumbers,
                  fourthMatchedNumbers: data.fourthMatchedNumbers,
                  fifthMatchedNumbers: data.fifthMatchedNumbers
                }
              });
          }
        })
        .catch(error => console.error('Fetching stats failed:', error));
      }


  }, [selectedDrawNumber]);


  // 특정 번호 포함하여 생성하기 함수
  const generateNumbersWithSpecific = () => {
      
      // 입력된 특정 번호를 검증
      const includedNumbers = specificNumbers
      .map(num => parseInt(num, 10))
      .filter(num => !isNaN(num) && num >= 1 && num <= 45);

      if (includedNumbers.length !== specificNumbers.filter(num => num !== "").length) {
        alert("입력된 번호가 올바르지 않습니다. 1~45 사이의 숫자를 입력해주세요.");
        return;
      }

      let numbers = new Set(includedNumbers);
      while (numbers.size < 6) {
        const number = Math.floor(Math.random() * 45) + 1;
        numbers.add(number);
      }

      const newNumbers = Array.from(numbers).sort((a, b) => a - b).join(', ')

    // 여기에서 생성된 번호를 처리하는 로직(예: 상태 업데이트)을 추가...
    setLottoNumbersList(prevList => [...prevList, newNumbers]);
    setAllGeneratedNumbers(prevList => [...prevList, newNumbers]);

    const generationWeek = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식의 주차 정보

      // API를 호출하여 서버에 생성된 번호를 저장
      axios.post('https://reactun-untab.koyeb.app/api/lotto-numbers', {
        generatedNumbers: newNumbers,
        generationWeek
      }).then(response => {
        console.log('Data inserted successfully', response.data);
      }).catch(error => {
        console.error('Error sending data:', error);
      });

  };

  // 최신 통계를 가져오는 함수
  const fetchLatestStats = async () => {
    try {
      const response = await axios.get('https://reactun-untab.koyeb.app/api/latest-stats');
      setLatestStats(response.data);
    } catch (error) {
      console.error('Error fetching latest stats:', error);
    }
  };

  const handleDrawNumberChange = (event) => {
    // 선택된 회차에 따른 추가적인 데이터 처리 로직
    setSelectedDrawNumber(event.target.value);
  };

  const generateLottoNumbers = () => {

  // console.log(' ㅇ__ㅇ '); 
    if (clickCount >= 1000) {
      alert("최대 생성 수(1000회)에 도달했습니다."); 
      return;
    }

    let numbers = new Set();
    while (numbers.size < 6) {
      const number = Math.floor(Math.random() * 45) + 1;
      numbers.add(number);
    }
    const newNumbers = Array.from(numbers).sort((a, b) => a - b).join(', ');
    const generationWeek = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식의 주차 정보

    axios.post('https://reactun-untab.koyeb.app/api/lotto-numbers', { generatedNumbers: newNumbers,generationWeek })
    .then(response => {
      console.log('Data inserted successfully', response.data);
    })
    .catch(error => {
      console.error('Error sending data:', error);
    });

    setClickCount(prevCount => prevCount + 1);
    setAlertVisible((clickCount + 1) % 20 === 0);
    setLottoNumbersList(prevList => [...prevList, newNumbers]);
    setAllGeneratedNumbers(prevList => [...prevList, newNumbers]);

       // 20개마다 화면 테이블에서만 초기화
       if ((clickCount + 1) % 20 === 0) {
        setLottoNumbersList([]);
      }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      allGeneratedNumbers.map((item, index) => ({
        ID: index + 1,
        Numbers: item
      })),
      { header: ["ID", "Numbers"] }
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lotto Numbers');
    XLSX.writeFile(workbook, `lotto_numbers_${new Date().toISOString()}.xlsx`);
  };

  // 자동 생성 시작 함수
  const startAutoGenerate = (count) => {
    if (autoGenerateActive) return; // 이미 자동 생성 중이면 실행하지 않음
    setAutoGenerateActive(true);

    setIsLoading(true); // 로딩 시작

    let generatedCount = 0;

    const intervalId = setInterval(() => {
      generateLottoNumbers();
      generatedCount += 1;

      if (generatedCount >= count) {
        clearInterval(intervalId); // 지정된 횟수에 도달하면 중지

        setIsLoading(false); // 로딩 종료
        
        setAutoGenerateActive(false);
        setGenerationIntervalId(null);
      }
    }, 300); // 1초(1000) 간격으로 생성

    setGenerationIntervalId(intervalId);
  };


  // 자동 생성 중지 함수
  const stopAutoGenerate = () => {
    if (generationIntervalId) {
      clearInterval(generationIntervalId);
      setAutoGenerateActive(false);
      setGenerationIntervalId(null);
    }
  };

  const handleScrapeAndSaveData = async () => {
    try {
      await axios.get('https://reactun-untab.koyeb.app/scrape');
      alert('데이터 스크래핑 및 저장이 완료되었습니다.');
    } catch (error) {
      console.error('데이터 스크래핑 및 저장 중 오류가 발생했습니다:', error);
      alert('데이터 스크래핑 및 저장 중 오류가 발생했습니다.');
    }
  };

  const closePopup = () => setAlertVisible(false);
 
  return (

    <div className="App">
    
      <header className="App-header">
        
        {/* <h2>로또 명당</h2>
        <div>다음 회차: {latestStats.drawNumber}</div>
        <div>생성된 번호 수: {latestStats.totalGeneratedNumbers}</div> */}
        {/* <div>생성 횟수: {clickCount}</div> */}

        {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>로또 명당</h2>
          <p style={{ fontSize: '14px', margin: '0 20px', color: '#666', fontStyle: 'italic' }}>
            최신 회차: {latestStats.drawNumber} | 생성된 번호 수: {latestStats.totalGeneratedNumbers}
          </p>
        </div> */}

        <h2>로또 명당</h2>
        <p style={{ fontSize: '14px', marginTop: '10px', color: '#666', fontStyle: 'italic' }}>
          {/* 다음 회차: {latestStats.DrawNumber} | 생성된 번호 수(누적): {latestStats.TotalCount} */}
          다음 회차: {latestStats.DrawNumber} | 추첨일: {announcementDate} | 생성된 번호 수: {latestStats.TotalCount}
        </p>
        <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
          생성 총 카운트(누적): {totalGeneratedCount}
        </p>

        <div className="button-container" style={{ marginBottom: '20px' }}>
          <button onClick={generateLottoNumbers} className="button generate-button">
            번호 생성
          </button>

          <button onClick={exportToExcel} className="button export-button">
            엑셀로 내보내기
          </button>

        {/* <button onClick={handleScrapeAndSaveData} className="button scrape-button">
          데이터 스크래핑 및 저장
        </button> */}

        <div className="auto-generate-options">
          <button className="auto-generate-option" onClick={() => startAutoGenerate(10)}>10회 자동 생성</button>
          <button className="auto-generate-option" onClick={() => startAutoGenerate(20)}>20회 자동 생성</button>
          <button className="auto-generate-option" onClick={() => startAutoGenerate(30)}>30회 자동 생성</button>
          {/* 필요한 만큼 옵션 추가 */}
          {/* <button className="auto-generate-stop" onClick={stopAutoGenerate} disabled={!autoGenerateActive}>생성 중지</button> */}
          <button
            className={`auto-generate-stop ${autoGenerateActive ? "active" : ""}`}
            onClick={stopAutoGenerate}
            disabled={!autoGenerateActive}
          >
            생성 중지
          </button>
        </div>
     
        
        </div>
          {/* {alertVisible && <div>엑셀로 내용 확인 가능합니다</div>} */}

          {alertVisible && (
            <div className={`overlay ${alertVisible ? 'active' : ''}`}>
              <div className="popup">
                <div className="popup-header">알림</div>
                <p>엑셀로 내용 확인 가능합니다.</p>
                <button onClick={closePopup} className="popup-close-button">닫기</button>
              </div>
            </div>
          )}

      {/* 특정 번호 포함 생성 UI */}
      {/* <div>
        <input
          type="text"
          value={includedNumbers}
          onChange={(e) => setIncludedNumbers(e.target.value)}
          placeholder="포함할 번호를 입력하세요 (예: 1,2,3)"
        />
        <button onClick={generateNumbersWithSpecific}>특정 번호 포함 생성</button>
      </div> */}

        {/* 특정 번호 포함 생성 UI */}
    <div className="specific-numbers-container">
      {specificNumbers.map((num, index) => (
        <input
          key={index}
          type="number"
          className="specific-number-input"
          value={num}
          onChange={e => {
            const newSpecificNumbers = [...specificNumbers];
            newSpecificNumbers[index] = e.target.value;
            setSpecificNumbers(newSpecificNumbers);
          }}
          placeholder={`번호 ${index + 1}`}
          min="1"
          max="45"
        />
      ))}
      <button className="generate-specific-button" onClick={generateNumbersWithSpecific}>특정 번호 포함 생성</button>
    </div>

    {/* <button onClick={() => setIsExpanded(!isExpanded)}>
      {isExpanded ? '접기' : '펼치기'}
    </button> */}



    <div className="table-container">

    {/* {isLoading && (
        <div className="loading-bar-container">
            <div className="loading-bar"></div>
        </div>
        )} */}

<div className="loading-bar-container">
    {isLoading && <div className="loading-bar"></div>}
</div>


      <table className="table">

        <thead>
          <tr>
            <th>횟수</th>
            <th>생성번호</th>
          </tr>
        </thead>

        <tbody>

          {lottoNumbersList.map((numbers, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{numbers}</td>
            </tr>
          ))}

          {/* {isLoading && <div>로딩 중...</div>}

          {isExpanded ? (
              lottoNumbersList.map((numbers, index) => (
                  <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{numbers}</td>
                  </tr>
              ))
          ) : (
              lottoNumbersList.slice(0, 5).map((numbers, index) => (
                  <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{numbers}</td>
                  </tr>
              ))
          )} */}

        </tbody>

      </table>
 
    </div>

        <div className="graph-and-selector-container">
          {/* 셀렉트 박스와 테이블을 포함하는 컨테이너 */}
          <div className="selection-and-table-container">

            <div>
              <select value={selectedDrawNumber} onChange={handleDrawNumberChange} className="draw-number-select">
                  {drawNumbers.filter(number => number !== '1110').map((number, index) => (
                    <option key={index} value={number}>{number}회차</option>
                  ))}
              </select>

              <div className="chart-container">
            <Doughnut data={chartData} />

              {/* <Doughnut
                data={chartData}
                options={{
                  maintainAspectRatio: false, // 차트의 원래 종횡비를 유지하지 않음
                  responsive: true, // 차트를 반응형으로 설정
                }}
                style={{ height: '300px', width: '100%' }} // 컨테이너 크기 조정
              /> */}
          </div>
            </div>
        
            <div className="table-container">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>데이터</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>1등 번호</td>
                    <td>{stats.winningNumbers}</td>
                  </tr>
                  <tr>
                    <td>생성된 번호(총 건수)</td>
                    <td>{stats.counts.totalGeneratedNumbers}</td>
                  </tr>
                  <tr>
                    <td>1등 매칭</td>
                    <td>{stats.counts.firstMatchedNumbers}</td>
                  </tr>
                  <tr>
                    <td>2등 매칭</td>
                    <td>{stats.counts.secondMatchedNumbers}</td>
                  </tr>
                  <tr>
                    <td>3등 매칭</td>
                    <td>{stats.counts.thirdMatchedNumbers}</td>
                  </tr>
                  <tr>
                    <td>4등 매칭</td>
                    <td>{stats.counts.fourthMatchedNumbers}</td>
                  </tr>
                  <tr>
                    <td>5등 매칭</td>
                    <td>{stats.counts.fifthMatchedNumbers}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>      
      </header>
     
    </div>
  );
}

export default App;
