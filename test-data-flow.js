// Test script to run in browser console to debug data flow
// Copy and paste this into browser console on http://localhost:5173

console.log('🧪 TESTING ONBOARDING DATA FLOW');

// Test 1: Check localStorage directly
console.log('\n=== TEST 1: LocalStorage Check ===');
const keys = ['onboarding_data', 'mock_onboarding_demo_user', 'user_id'];
keys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`${key}:`, value ? `${value.length} chars` : 'null');
    if (value && key.includes('onboarding')) {
        try {
            const parsed = JSON.parse(value);
            console.log(`  - Parsed ${key}:`, {
                fullName: parsed.fullName,
                currentTitle: parsed.currentTitle,
                keys: Object.keys(parsed)
            });
        } catch (e) {
            console.log(`  - Parse error for ${key}:`, e.message);
        }
    }
});

// Test 2: Test onboarding service directly
console.log('\n=== TEST 2: Onboarding Service Test ===');
if (window.onboardingService) {
    console.log('✅ onboardingService available');
    
    // Test sync method
    const syncData = window.onboardingService.getOnboardingDataSync();
    console.log('Sync data:', syncData);
    
    // Test async method
    window.onboardingService.getOnboardingData().then(asyncData => {
        console.log('Async data:', asyncData);
    }).catch(err => {
        console.error('Async error:', err);
    });
} else {
    console.log('❌ onboardingService not available on window');
}

// Test 3: Inject and test data flow
console.log('\n=== TEST 3: Inject Test Data ===');
const testData = {
    fullName: 'Console Test User',
    currentTitle: 'Console Test Engineer',
    currentCompany: 'Console Test Corp',
    industry: 'Technology',
    yearsOfExperience: 5,
    location: 'Console Test City',
    profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    professionalSummary: 'This is a console test summary',
    specializations: ['Console Testing'],
    careerHighlights: 'Console test achievements',
    skills: [],
    topSkills: ['Console Testing'],
    workExperiences: [],
    education: [],
    certifications: [],
    careerGoals: ['Console test goal'],
    professionalInterests: ['Console test interest']
};

// Save to localStorage
localStorage.setItem('mock_onboarding_demo_user', JSON.stringify(testData));
console.log('✅ Test data saved to localStorage');

// Dispatch events
window.dispatchEvent(new CustomEvent('onboardingDataChanged', {
    detail: { source: 'console-test', data: testData }
}));
window.dispatchEvent(new CustomEvent('profileUpdated', {
    detail: { source: 'console-test' }
}));
console.log('✅ Events dispatched');

// Test 4: Profile view refresh
console.log('\n=== TEST 4: Check Profile View ===');
console.log('Navigate to profile page and check console for debug messages');
console.log('Or run: window.location.href = "/profile"');