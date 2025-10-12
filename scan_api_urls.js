// Test script to verify all admin-web API calls are using the correct backend URL
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_WEB_SRC = 'C:\\Sagipero\\admin-web\\src';
const EXPECTED_BASE = 'https://sagipero-backend-production.up.railway.app';

function scanDirectory(dir) {
  const results = [];
  
  function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for hardcoded URLs
      const hardcodedMatches = line.match(/(http:\/\/localhost|http:\/\/127\.0\.0\.1|http:\/\/192\.168\.|https:\/\/(?!api\.open-meteo|tile\.openstreetmap|www\.google|embed\.windy|tile\.openweathermap)[^\/]*\/api)/g);
      if (hardcodedMatches) {
        results.push({
          file: filePath,
          line: index + 1,
          type: 'HARDCODED_URL',
          content: line.trim(),
          matches: hardcodedMatches
        });
      }
      
      // Check for direct fetch calls that might bypass api client
      if (line.includes('fetch(') && !line.includes('api.open-meteo') && !line.includes('openstreetmap') && !line.includes('google.com') && !line.includes('windy.com') && !line.includes('openweathermap')) {
        const fetchMatch = line.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (fetchMatch && fetchMatch[1].startsWith('http')) {
          results.push({
            file: filePath,
            line: index + 1,
            type: 'DIRECT_FETCH',
            content: line.trim(),
            url: fetchMatch[1]
          });
        }
      }
    });
  }
  
  function walkDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    files.forEach(file => {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
        scanFile(fullPath);
      }
    });
  }
  
  walkDir(dir);
  return results;
}

console.log('🔍 Scanning admin-web for hardcoded API URLs...');
console.log('📁 Source directory:', ADMIN_WEB_SRC);
console.log('✅ Expected backend:', EXPECTED_BASE);
console.log('');

const issues = scanDirectory(ADMIN_WEB_SRC);

if (issues.length === 0) {
  console.log('✅ NO ISSUES FOUND - ALL API calls use proper configuration!');
} else {
  console.log(`❌ FOUND ${issues.length} POTENTIAL ISSUES:`);
  console.log('');
  
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.type} in ${path.relative(ADMIN_WEB_SRC, issue.file)}:${issue.line}`);
    console.log(`   ${issue.content}`);
    if (issue.matches) {
      console.log(`   ⚠️  Found: ${issue.matches.join(', ')}`);
    }
    if (issue.url) {
      console.log(`   🔗 URL: ${issue.url}`);
    }
    console.log('');
  });
}

console.log('🏁 Scan complete.');