// Quick test to verify onboarding data persistence
// Run this in browser console to test

console.log('Testing onboarding data persistence...');

// Test 1: Check if mock API configuration is working
console.log('API Configuration:', {
  USE_MOCK_API: import.meta.env.DEV && !import.meta.env.VITE_API_URL,
  DEV: import.meta.env.DEV,
  VITE_API_URL: import.meta.env.VITE_API_URL
});

// Test 2: Check localStorage keys
console.log('localStorage keys:', Object.keys(localStorage));

// Test 3: Check if there's any onboarding data
const mockData = localStorage.getItem('mock_onboarding_demo_user');
const regularData = localStorage.getItem('onboarding_data');
console.log('Mock onboarding data:', mockData ? JSON.parse(mockData) : 'No data');
console.log('Regular onboarding data:', regularData ? JSON.parse(regularData) : 'No data');

// Test 4: Create test data
const testData = {
  fullName: 'John Doe Test',
  currentTitle: 'Test Engineer',
  currentCompany: 'Test Company',
  industry: 'Technology',
  yearsOfExperience: 3,
  location: 'Test City, TC',
  profileImageUrl: '',
  professionalSummary: 'This is a test professional summary for testing data persistence.',
  specializations: ['Testing', 'Quality Assurance'],
  careerHighlights: 'Successfully implemented test automation',
  professionalValues: 'Quality and reliability'
};

localStorage.setItem('mock_onboarding_demo_user', JSON.stringify(testData));
console.log('Test data created successfully');

// Test 5: Verify data was saved
const savedData = localStorage.getItem('mock_onboarding_demo_user');
console.log('Verified saved data:', savedData ? JSON.parse(savedData) : 'Failed to save');

console.log('Test completed! Now navigate to /onboarding to see if data loads.');