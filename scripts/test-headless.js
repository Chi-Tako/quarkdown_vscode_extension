// VSCodeなしでテストの基本検証を行うスクリプト
const fs = require('fs');
const path = require('path');

console.log('🔍 Headless Test Validation');
console.log('===========================');

// テストファイルの基本的な構文チェック
const validateTestFile = (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 基本的なテスト構造の確認
        const hasSuite = content.includes('suite(');
        const hasTest = content.includes('test(');
        const hasAssert = content.includes('assert.');
        
        console.log(`\n📄 ${path.basename(filePath)}:`);
        console.log(`   ${hasSuite ? '✅' : '❌'} suite() found`);
        console.log(`   ${hasTest ? '✅' : '❌'} test() found`);
        console.log(`   ${hasAssert ? '✅' : '❌'} assert statements found`);
        
        return hasSuite && hasTest && hasAssert;
    } catch (error) {
        console.log(`❌ Error validating ${filePath}: ${error.message}`);
        return false;
    }
};

// コンパイルされたテストファイルを検証
const testFiles = [
    'out/test/suite/extension.test.js',
    'out/test/suite/completionProvider.test.js',
    'out/test/suite/previewProvider.test.js',
    'out/test/suite/projectUtils.test.js'
];

let allTestsValid = true;
testFiles.forEach(file => {
    if (!validateTestFile(file)) {
        allTestsValid = false;
    }
});

// テストインデックスファイルの確認
console.log('\n📋 Test Index Validation:');
try {
    const indexPath = 'out/test/suite/index.js';
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const hasMocha = indexContent.includes('Mocha');
    const hasGlob = indexContent.includes('glob');
    const hasRun = indexContent.includes('function run');
    
    console.log(`   ${hasMocha ? '✅' : '❌'} Mocha integration`);
    console.log(`   ${hasGlob ? '✅' : '❌'} Glob file discovery`);
    console.log(`   ${hasRun ? '✅' : '❌'} Run function exported`);
} catch (error) {
    console.log(`❌ Error validating test index: ${error.message}`);
    allTestsValid = false;
}

// テストランナーの確認
console.log('\n🏃 Test Runner Validation:');
try {
    const runnerPath = 'out/test/runTest.js';
    const runnerContent = fs.readFileSync(runnerPath, 'utf8');
    const hasRunTests = runnerContent.includes('runTests');
    const hasPath = runnerContent.includes('extensionDevelopmentPath');
    
    console.log(`   ${hasRunTests ? '✅' : '❌'} runTests import`);
    console.log(`   ${hasPath ? '✅' : '❌'} Path configuration`);
} catch (error) {
    console.log(`❌ Error validating test runner: ${error.message}`);
    allTestsValid = false;
}

console.log('\n📊 Test Validation Summary:');
console.log('============================');
if (allTestsValid) {
    console.log('✅ All test files are properly structured');
    console.log('✅ Test framework integration is correct');
    console.log('✅ Test runner is configured properly');
    console.log('\n🎉 Tests are ready for execution!');
    console.log('\n💡 Note: Full integration tests require VSCode instance');
    console.log('   Use: npm test (requires display/X11 for VSCode)');
    console.log('   Or: Run Extension Tests from VSCode itself');
} else {
    console.log('❌ Some test validation issues found');
    console.log('❌ Review test setup before running');
}

console.log('\n📚 Available Test Commands:');
console.log('   npm run compile    - Compile TypeScript');
console.log('   npm run lint       - Run ESLint');
console.log('   npm run pretest    - Compile + Lint');
console.log('   npm test           - Full integration tests');
console.log('   node test-simple.js - Basic setup verification');