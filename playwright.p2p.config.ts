import{defineConfig,devices}from'@playwright/test';
if(process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.DATABASE_URL!=='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci')throw Error('P2P browser tests refuse non-disposable fixtures');
export default defineConfig({testDir:'./p2p-browser-tests',testMatch:'**/*.pw.ts',workers:1,retries:0,timeout:90000,forbidOnly:true,
 use:{baseURL:'https://127.0.0.1:8774',ignoreHTTPSErrors:true,serviceWorkers:'block',trace:'retain-on-failure',actionTimeout:15000},
 projects:[{name:'p2p-chromium',use:{...devices['Desktop Chrome']}},{name:'p2p-iphone',use:{...devices['iPhone 13'],browserName:'webkit'}}],
 webServer:{command:'node /tmp/luqi-p2p-server.js',url:'https://127.0.0.1:8774/v1/health',ignoreHTTPSErrors:true,reuseExistingServer:false,timeout:60000}});
