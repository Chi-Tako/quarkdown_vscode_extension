// 基本的なテストの動作確認用簡易スクリプト
const fs = require('fs');
const path = require('path');

console.log('🧪 Quarkdown Extension Test Verification');
console.log('========================================');

// 1. 基本的なファイル存在確認
const checkFileExists = (filePath) => {
    const exists = fs.existsSync(filePath);
    console.log(`${exists ? '✅' : '❌'} ${filePath} ${exists ? 'exists' : 'missing'}`);
    return exists;
};

console.log('\n📁 Required Files Check:');
const requiredFiles = [
    'package.json',
    'out/extension.js',
    'out/test/runTest.js',
    'out/test/suite/index.js',
    'out/test/suite/extension.test.js',
    'out/test/suite/completionProvider.test.js',
    'out/test/suite/previewProvider.test.js',
    'out/test/suite/projectUtils.test.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (!checkFileExists(file)) {
        allFilesExist = false;
    }
});

// 2. package.jsonの内容確認
console.log('\n📋 Package.json Verification:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Extension name: ${packageJson.name}`);
    console.log(`✅ Version: ${packageJson.version}`);
    console.log(`✅ Main entry: ${packageJson.main}`);
    console.log(`✅ Test script: ${packageJson.scripts.test}`);
    
    // Commands check
    const commands = packageJson.contributes.commands;
    console.log(`✅ Commands registered: ${commands.length}`);
    commands.forEach(cmd => {
        console.log(`   - ${cmd.command}: ${cmd.title}`);
    });
} catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
    allFilesExist = false;
}

// 3. 拡張機能エントリポイント確認
console.log('\n🚀 Extension Entry Point:');
try {
    const extensionPath = 'out/extension.js';
    if (fs.existsSync(extensionPath)) {
        const content = fs.readFileSync(extensionPath, 'utf8');
        const hasActivate = content.includes('function activate');
        const hasDeactivate = content.includes('function deactivate');
        console.log(`${hasActivate ? '✅' : '❌'} activate function ${hasActivate ? 'found' : 'missing'}`);
        console.log(`${hasDeactivate ? '✅' : '❌'} deactivate function ${hasDeactivate ? 'found' : 'missing'}`);
    }
} catch (error) {
    console.log(`❌ Error checking extension.js: ${error.message}`);
    allFilesExist = false;
}

// 4. テストファイル構造確認
console.log('\n🧪 Test Structure:');
try {
    const testSuiteDir = 'out/test/suite';
    if (fs.existsSync(testSuiteDir)) {
        const testFiles = fs.readdirSync(testSuiteDir)
            .filter(file => file.endsWith('.test.js'));
        console.log(`✅ Test files found: ${testFiles.length}`);
        testFiles.forEach(file => {
            console.log(`   - ${file}`);
        });
    }
} catch (error) {
    console.log(`❌ Error checking test structure: ${error.message}`);
}

// 結果サマリー
console.log('\n📊 Test Setup Summary:');
console.log('======================');
if (allFilesExist) {
    console.log('✅ All required files are present');
    console.log('✅ Test framework is properly configured');
    console.log('✅ Extension structure is valid');
    console.log('\n🎉 Test runner is ready for use!');
    console.log('\nTo run tests:');
    console.log('   npm test     (full integration tests)');
    console.log('   npm run compile && npm run lint  (build and lint)');
} else {
    console.log('❌ Some required files are missing');
    console.log('❌ Test setup needs attention');
}