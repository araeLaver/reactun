// import React, { useState } from 'react';
import React, { useState, useEffect } from 'react';
import axios from 'axios'; 
import * as XLSX from 'xlsx';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import './App.css';

Chart.register(ArcElement, Tooltip, Legend);

function App() {

  const [lottoNumbersList, setLottoNumbersList] = useState([]);
  const [allGeneratedNumbers, setAllGeneratedNumbers] = useState([]);

  const [clickCount, setClickCount] = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);

  const [drawNumbers, setDrawNumbers] = useState([]);
  const [selectedDrawNumber, setSelectedDrawNumber] = useState('');
  

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

  // useEffect(() => {
  //   // 서버로부터 회차 데이터를 불러오는 함수를 호출
  //   fetchDrawNumbers().then(() => {
  //       if (drawNumbers.length > 0) {
  //      // 첫 번째 회차를 선택합니다. (이 부분은 비동기적으로 drawNumbers가 설정된 후에 실행되어야 합니다.)
  //       setSelectedDrawNumber(drawNumbers[0]);
  //     }
      
  //   });
  // }, [drawNumbers]);
  // // }, []);

  useEffect(() => {
    const fetchDrawNumbers = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/weeks');
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
      axios.get(`http://localhost:3000/api/lotto-stats/${selectedDrawNumber}`)
        .then(response => {
          const { data } = response;

      

  console.log('@@data@@', data);  
          if (data) { // 데이터가 있는지 확인
            setChartData({
              labels: ['1등', '2등', '3등', '4등', '5등'],
              datasets: [{
                label: '당첨 비율',
                data: [data.first, data.second, data.third, data.fourth, data.fifth].map(
                  item => item || 0 // 데이터가 undefined일 경우 0으로 설정
                ),
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

  // const fetchDrawNumbers = async () => {
  //   try {
  //     const response = await axios.get('http://localhost:3000/api/weeks');
  //     setDrawNumbers(response.data); // 가정: response.data는 회차 번호의 배열
  //     // setSelectedDrawNumber(response.data[0]); // 첫 번째 회차를 기본값으로 설정
  //   } catch (error) {
  //     console.error('Error fetching draw numbers:', error);
  //   }
  // };

  const handleDrawNumberChange = (event) => {
    // 선택된 회차에 따른 추가적인 데이터 처리 로직
    setSelectedDrawNumber(event.target.value);
  };

  const generateLottoNumbers = () => {

  console.log(' ㅇ__ㅇ '); 
    if (clickCount >= 1000) {
      alert("최대 클릭 수에 도달했습니다."); 
      return;
    }

    let numbers = new Set();
    while (numbers.size < 6) {
      const number = Math.floor(Math.random() * 45) + 1;
      numbers.add(number);
    }
    const newNumbers = Array.from(numbers).sort((a, b) => a - b).join(', ');
    const generationWeek = new Date().toISOString().slice(0, 10); // YYYY-MM-DD 형식의 주차 정보

    axios.post('http://localhost:3000/api/lotto-numbers', { generatedNumbers: newNumbers,generationWeek })
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

  // const handleScrapeData = () => {
  //   axios.get('http://localhost:3000/scrape')
  //     .then(response => {
  //       console.log(response.data);
  //       alert('Data scraping and saving process is completed.');
  //     })
  //     .catch(error => {
  //       console.error('Error during scraping:', error);
  //       alert('Failed to scrape data.');
  //     });
  // };

  // 파일 업로드 컴포넌트
  // const handleFileUpload = (event) => {
  //   const file = event.target.files[0];
  //   const formData = new FormData();
  //   formData.append('file', file);

  //   axios.post('http://localhost:3001/api/upload', formData)
  //     .then(response => console.log(response.data))
  //     .catch(error => console.error(error));
  // };

  const closePopup = () => setAlertVisible(false);

  return (

    <div className="App">
    
      <header className="App-header">
        <h2>로또 명당</h2>
    
        {/* <div>클릭 수: {clickCount}</div> */}

        <div className="button-container" style={{ marginBottom: '20px' }}>
          <button onClick={generateLottoNumbers} className="button generate-button">
            번호 생성
          </button>

          <button onClick={exportToExcel} className="button export-button">
            엑셀로 내보내기
          </button>
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
            </tbody>
          </table>
    
          {/* <button onClick={handleScrapeData} className="button scrape-button">
            Scrape and Save Data
          </button> */}

        <div className="graph-and-selector-container">
          {/* <div style={{ width: '400px', height: '400px' }}> */}
          <div className="chart-container">
            <Doughnut data={chartData} />
          </div>
          {/* </div> */}

          
          {/* 셀렉트 박스와 테이블을 포함하는 컨테이너 */}
          <div className="selection-and-table-container">

            <div>
              <select value={selectedDrawNumber} onChange={handleDrawNumberChange} className="draw-number-select">
                {drawNumbers.map((number, index) => (
                  <option key={index} value={number}>{number}회차</option>
                ))}
              </select>
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
