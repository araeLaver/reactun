import axios from 'axios';

const API_BASE_URL = 'https://reactun-untab.koyeb.app/api/';

export const fetchTotalGeneratedCount = async () => {
  const response = await axios.get(`${API_BASE_URL}total-generated-count`);
  return response.data;
};

export const fetchDrawNumbers = async () => {
  const response = await axios.get(`${API_BASE_URL}weeks`);
  return response.data;
};

export const fetchLottoStats = async (drawNumber) => {
  const response = await axios.get(`${API_BASE_URL}lotto-stats/${drawNumber}`);
  return response.data;
};

export const fetchLatestStats = async () => {
  const response = await axios.get(`${API_BASE_URL}latest-stats`);
  return response.data;
};

export const postGeneratedNumbers = async (newNumbers, generationWeek) => {
  const response = await axios.post(`${API_BASE_URL}lotto-numbers`, { generatedNumbers: newNumbers, generationWeek });
  return response.data;
};
