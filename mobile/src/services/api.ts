import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your actual server URL
const API_BASE_URL = 'http://localhost:5000';

export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('authToken');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${url}`, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}