const cron = require('node-cron');
const cheerio = require('cheerio');
const slack = require('slack-node');
const puppeteer = require('puppeteer');
const { prefix, host, path, interval, channel } = require('./configs/config.json');

const log = console.log;
const notices = new Set();
const sender = new slack();
sender.setWebhook(channel);

let count = 0;

cron.schedule(
  interval,
  crawling,
  { scheduled: false }
).start();

function makeLog(message) {
  log(message);
}

function getTime() {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
}

function slackHandler(err, res) {
  makeLog("[SLACK] web hook");
  if(err === null) {
    makeLog(`[SUCCESS] Response code: ${res.statusCode}`);
  } else {
    makeLog("[ERROR] slack web hook failed!!!");
  }
}

function setHandler(url, hasIcons) {

  let result = false;

  if(hasIcons) {

    if(!notices.has(url)) {
      result = true;
      notices.add(url);
      makeLog('[NEW] new notice added to set!!!');

      if(channel !== "") {
        sender.webhook({
          channel: "#injuk-test-channel",
          username: "injuk slack test",
          text: `new notice detected: ${prefix}${host}${url}`
        }, slackHandler);
      }
    }
  } else {

    if(notices.has(url)) {
      makeLog(`[OLD] ${url} will be deleted from set...`);
      notices.delete(url);
    }
  }

  return result;
}

async function crawling() {

  const full_path = prefix + host + path;
  let result = 0;

  makeLog(`\n${++count}. crawling ${getTime()}`);
  makeLog('[START] start crawling with target: ' + full_path);
  makeLog('[OPEN] launch new headless browser!');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  await page.goto(full_path);
  const content = await page.content();

  const $ = cheerio.load(content);
  const a_lists = $("div#slideArticleList a.link_cafe").toArray();

  for(const a of a_lists) {

    let hasIcons = false;
    const href_path = $(a).attr('href');
    const file_name = href_path.split('/').pop();

    $(a).find('span.ico_new').length === 0 ?
      hasIcons = false :
      hasIcons = true;

    const succeed = setHandler(href_path, hasIcons);

    if(succeed) {
      ++result;
      const crawling_target = prefix + host + href_path;
      makeLog('[NEW] try to make screenshots: ' + crawling_target);

      await page.goto(crawling_target)
      const height = await page.evaluate(() => document.body.scrollHeight);

      await page.setViewport({width:800, height});
      await page.screenshot({
        path: `./screenshots/gt_notice${file_name}.png`,
        fullPage: true
      });
    }
  }

  await browser.close();
  makeLog('[CLOSE] close headless browser...');
  makeLog(`[DONE] crawling results: ${result} notices added to set!`);
};
