// Quick test to verify admin-web can connect to Railway backend
import axios from 'axios';

const API_BASE = 'https://sagipero-backend-production.up.railway.app/api';

async function testBackendConnection() {
  console.log('🔍 Testing admin-web connection to Railway backend...');
  console.log('🌐 Backend URL:', API_BASE);
  
  try {
    // Test health endpoint
    console.log('\n🏥 Testing health check...');
    const healthResponse = await axios.get(API_BASE.replace('/api', '/health'));
    console.log('✅ Health check:', healthResponse.data);
    
    // Test login endpoint with test credentials
    console.log('\n🔐 Testing login endpoint...');
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      email: 'test@example.com',
      password: 'test123'
    });
    
    if (loginResponse.status === 200) {
      console.log('✅ Login endpoint works - got token');
    } else {
      console.log('ℹ️ Login endpoint works - got expected error:', loginResponse.data);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('✅ Backend connection works - got HTTP response:', error.response.status);
      console.log('Response:', error.response.data);
    } else if (error.request) {
      console.log('❌ Network error - cannot reach backend:', error.message);
    } else {
      console.log('❌ Axios error:', error.message);
    }
  }
}

testBackendConnection();