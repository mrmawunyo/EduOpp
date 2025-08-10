import { apiRequest } from './queryClient';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  schoolId: number;
  role?: string; // Adding role field
}

export const auth = {
  login: async (credentials: LoginCredentials) => {
    try {
      console.log('Sending login data:', credentials);
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      
      const responseText = await response.text();
      console.log('Login response status:', response.status);
      console.log('Login response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} - ${responseText}`);
      }
      
      // Parse the response and extract the user object
      const data = responseText ? JSON.parse(responseText) : {};
      console.log('Parsed login response:', data);
      
      if (!data.user) {
        throw new Error('Invalid response format: missing user data');
      }
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    const response = await apiRequest('POST', '/api/auth/logout', {});
    return response.json();
  },
  
  register: async (userData: RegisterData) => {
    try {
      console.log('Sending registration data:', userData);
      const response = await fetch('/api/auth/register/teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      
      const responseText = await response.text();
      console.log('Registration response status:', response.status);
      console.log('Registration response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`Registration failed: ${response.status} - ${responseText}`);
      }
      
      // Try to parse JSON only if there's content
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    const response = await fetch('/api/auth/current-user', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error('Failed to fetch current user');
    }
    
    return response.json();
  },
};
