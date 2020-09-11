const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');

const urls = ['https://www.telegraafhotel.com/et/restoran-tallinnas/', 'https://www.porgu.ee/?page_id=432', 'https://www.chakra.ee/'];

let resolve = () => console.log('init'); // resolving promise when reaches the last interation in array
let promiseCallback = (res) => () => res(); // saving promise in clousere to resolve it later
let promise = () => new Promise((res, rej) => {
  resolve = promiseCallback(res);
}); // promise for awaiting iteration process in nodesArray on each stage

async function getMenuHtml(url) {
  console.log(url)
  try {
    const response = await axios.get(url, { responseType: 'text' });
    const json = [];
    let result = response.data.split('<body')[1].replace(/\r\n|\r|\t|\n/g, '').replace(/(<([^>]+)>)/g, '^').split('^');
    result = result.filter((el) => el);
    result.forEach((el, index) => {
      if ((el.toLowerCase().includes('eur') || el.toLowerCase().includes('€') || Number(el)) && el.length < 15) {
        json.push({ receipe: result[index - 1], price: el });
      }
    });
    fs.writeFileSync(`${url.split('/')[2]}.js`, JSON.stringify(json) )
    console.log(json);
  } catch (error) {
    console.log(error);
  }
}

function getMenuWrapper(url, tag) {
  let entriesCounter = 0; // indicates deps of links stages
  let nodesArray = []; // array of links in each stage
  let targetHref = ''; // linl with menu
  let isParsing = false; // indicates that link was found and started parsing process to prevent recurseve parsing

  async function getMenu() {
    if (targetHref) return;
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      $(tag).each((i, element) => {
        if (targetHref) return;
        const { href } = element.attribs;
        if (!href) return;
        if (href.split('/')[2] !== url.split('/')[2]) return;
        const targetLink = element.children && element.children && element.children[0] && element.children[0].data;
        if (targetLink === 'Menüü' || targetLink === 'Söögid' || targetLink === 'See MENU & Order') {
          return targetHref = href;
        }
        nodesArray.push(href);
      });
      if (isParsing) return;
      // console.log(targetHref, entriesCounter);
      if (targetHref) {
        isParsing = true;
        console.log('I am ready to parse');
        return getMenuHtml(targetHref);
      }
      console.log(entriesCounter);
      if (entriesCounter >= 3) return; // (() => console.log('Nothing was found'))();
      entriesCounter++;
      if (entriesCounter > 1) await promise();
      if (isParsing) return;
      nodesArray.forEach((url, i) => {
        // console.log(i, nodesArray.length);
        getMenu(url, 'a');
        if (i === nodesArray.length - 1) {
          nodesArray = [];
          resolve();
        }
      });
      return;
    } catch (error) {
      console.log(error);
    }
  };
  getMenu();
}

urls.forEach((url) => {
  getMenuWrapper(url, 'a');
})