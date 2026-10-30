import{defineConfig,devices}from'@playwright/test';
if(process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.DATABASE_URL!=='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci')throw Error('Business browser tests require disposable fixtures');
export default defineConfig({testDir:'./business-browser-tests',testMatch:'**/*.pw.ts',workers:1,retries:0,timeout:120000,forbidOnly:true,
 use:{baseURL:'https://127.0.0.1:8776',ignoreHTTPSErrors:true,serviceWorkers:'block',trace:'retain-on-failure',actionTimeout:15000},
 projects:[{name:'business-chromium',use:{...devices['Desktop Chrome']}},{name:'business-iphone',use:{...devices['iPhone 13'],browserName:'webkit'}}],
 webServer:{command:'node /tmp/luqi-business-server.js',url:'https://127.0.0.1:8776/v1/health',ignoreHTTPSErrors:true,reuseExistingServer:false,timeout:60000}});
