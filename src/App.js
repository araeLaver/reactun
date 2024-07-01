import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';
import { fetchTotalGeneratedCount, fetchDrawNumbers, fetchLottoStats, fetchLatestStats, postGeneratedNumbers } from './api';
import './App.css';

Chart.register(ArcElement, Tooltip, Legend);

function App() {
  const [lottoNumbersList, setLottoNumbersList] = useState([]);
  const [allGeneratedNumbers, setAllGeneratedNumbers] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const [drawNumbers, setDrawNumbers] = useState([]);
  const [selectedDrawNumber, setSelectedDrawNumber] = useState('');
  const [latestStats, setLatestStats] = useState({ TotalCount: 0, DrawNumber: '' });
  const [autoGenerateActive, setAutoGenerateActive] = useState(false);
  const [generationIntervalId, setGenerationIntervalId] = useState(null);
  const [specificNumbers, setSpecificNumbers] = useState(["", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalGeneratedCount, setTotalGeneratedCount] = useState(0);
  const [announcementDate, setAnnouncementDate] = useState('');

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

  useEffect(() => {
    fetchTotalGeneratedCount()
      .then(data => setTotalGeneratedCount(data.totalGeneratedCount))
      .catch(error => console.error('Error fetching total generated count:', error));
  }, []);

  useEffect(() => {
    if (selectedDrawNumber) {
      const newAnnouncementDate = calculateAnnouncementDate(selectedDrawNumber);
      setAnnouncementDate(newAnnouncementDate);
    }
  }, [selectedDrawNumber]);

  useEffect(() => {
    fetchLatestStats()
      .then(data => setLatestStats(data))
      .catch(error => console.error('Error fetching latest stats:', error));
  }, []);

  useEffect(() => {
    fetchDrawNumbers()
      .then(data => {
        setDrawNumbers(data);
        if (data.length > 0) {
          const latestDrawNumber = data[0];
          setSelectedDrawNumber(latestDrawNumber);
        }
      })
      .catch(error => console.error('Error fetching draw numbers:', error));
  }, []);

  useEffect(() => {
    if (selectedDrawNumber) {
      fetchLottoStats(selectedDrawNumber)
        .then(data => {
          const counts = {
            first: data.firstMatchedNumbers,
            second: data.secondMatchedNumbers,
            third: data.thirdMatchedNumbers,
            fourth: data.fourthMatchedNumbers,
            fifth: data.fifthMatchedNumbers
          };
          const totalCount = Object.values(counts).reduce((acc, count) => acc + count, 0);
          const rates = Object.keys(counts).map(key => parseFloat(((counts[key] / totalCount) * 100).toFixed(2)));

          setChartData({
            labels: ['1등', '2등', '3등', '4등', '5등'],
            datasets: [{
              label: '당첨 비율',
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
        })
        .catch(error => console.error('Fetching stats failed:', error));
    }
  }, [selectedDrawNumber]);

  const calculateAnnouncementDate = (selectedDrawNumber) => {
    const baseDrawNumber = 1113;
    const baseAnnouncementDate = new Date('2024-04-06');
    const selectedDraw = parseInt(selectedDrawNumber, 10);
    const weeksDifference = selectedDraw - baseDrawNumber;
    const announcementDate = new Date(baseAnnouncementDate);
    announcementDate.setDate(announcementDate.getDate() + weeksDifference * 7);
    return announcementDate.toISOString().slice(0, 10);
  };

  const generateNumbersWithSpecific = () => {
    const includedNumbers = specificNumbers.map(num => parseInt(num, 10)).filter(num => !isNaN(num) && num >= 1 && num <= 45);
    if (includedNumbers.length !== specificNumbers.filter(num => num !== "").length) {
      alert("입력된 번호가 올바르지 않습니다. 1~45 사이의 숫자를 입력해주세요.");
      return;
    }
    let numbers = new Set(includedNumbers);
    while (numbers.size < 6) {
      const number = Math.floor(Math.random() * 45) + 1;
      numbers.add(number);
    }
    const newNumbers = Array.from(numbers).sort((a, b) => a - b).join(', ');
    setLottoNumbersList(prevList => [...prevList, newNumbers]);
    setAllGeneratedNumbers(prevList => [...prevList, newNumbers]);
    const generationWeek = new Date().toISOString().slice(0, 10);

    postGeneratedNumbers(newNumbers, generationWeek)
      .then(response => console.log('Data inserted successfully', response))
      .catch(error => console.error('Error sending data:', error));
  };

  const generateLottoNumbers = () => {
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
    const generationWeek = new Date().toISOString().slice(0, 10);
    postGeneratedNumbers(newNumbers, generationWeek)
      .then(response => console.log('Data inserted successfully', response))
      .catch(error => console.error('Error sending data:', error));

    setClickCount(prevCount => prevCount + 1);
    setAlertVisible((clickCount + 1) % 20 === 0);
    setLottoNumbersList(prevList => [...prevList, newNumbers]);
    setAllGeneratedNumbers(prevList => [...prevList, newNumbers]);
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

  const startAutoGenerate = (count) => {
    if (autoGenerateActive) return;
    setAutoGenerateActive(true);
    setIsLoading(true);
    let generatedCount = 0;
    const intervalId = setInterval(() => {
      generateLottoNumbers();
      generatedCount += 1;
      if (generatedCount >= count) {
        clearInterval(intervalId);
        setIsLoading(false);
        setAutoGenerateActive(false);
        setGenerationIntervalId(null);
      }
    }, 300);
    setGenerationIntervalId(intervalId);
  };

  const stopAutoGenerate = () => {
    if (generationIntervalId) {
      clearInterval(generationIntervalId);
      setAutoGenerateActive(false);
      setGenerationIntervalId(null);
    }
  };

  const closePopup = () => setAlertVisible(false);

  const handleDrawNumberChange = (event) => {
    setSelectedDrawNumber(event.target.value);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>로또 명당</h2>
        <p style={{ fontSize: '14px', marginTop: '10px', color: '#666', fontStyle: 'italic' }}>
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
          <div className="auto-generate-options">
            <button className="auto-generate-option" onClick={() => startAutoGenerate(10)}>10회 자동 생성</button>
            <button className="auto-generate-option" onClick={() => startAutoGenerate(20)}>20회 자동 생성</button>
            <button className="auto-generate-option" onClick={() => startAutoGenerate(30)}>30회 자동 생성</button>
            <button
              className={`auto-generate-stop ${autoGenerateActive ? "active" : ""}`}
              onClick={stopAutoGenerate}
              disabled={!autoGenerateActive}
            >
              생성 중지
            </button>
          </div>
        </div>

        {alertVisible && (
          <div className={`overlay ${alertVisible ? 'active' : ''}`}>
            <div className="popup">
              <div className="popup-header">알림</div>
              <p>엑셀로 내용 확인 가능합니다.</p>
              <button onClick={closePopup} className="popup-close-button">닫기</button>
            </div>
          </div>
        )}

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

        <div className="table-container">
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
            </tbody>
          </table>
        </div>

        <div className="graph-and-selector-container">
          <div className="selection-and-table-container">
            <div>
              <select value={selectedDrawNumber} onChange={handleDrawNumberChange} className="draw-number-select">
                {drawNumbers.filter(number => number !== '1110').map((number, index) => (
                  <option key={index} value={number}>{number}회차</option>
                ))}
              </select>

              <div className="chart-container">
                <Doughnut data={chartData} />
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
