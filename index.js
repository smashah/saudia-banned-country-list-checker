const puppeteer = require("puppeteer");
const fs = require('fs-extra')

const countryjson = './countries.json'

const translateForTable = (ob) => {
    const res = [];
    Object.keys(ob).filter(k=>k!='example').map(k=>{
        res.push({
            country: k,
            changedAt: ob[k]
        })
    })
    console.log("🚀 ~ file: index.js ~ line 9 ~ translateForTable ~ res", res)
    return res;
}

const generateReadme = async (json) => {
    const d = new Date()
    const added = translateForTable(json.added)
    const removed = translateForTable(json.removed)
    console.log("🚀 ~ file: index.js ~ line 23 ~ generateReadme ~ removed", removed)
    const readme = `
# Saudia Banned Countries Checker

## Updated every hour

### This project aims to provide a simple way to check which countries are still on the list of banned countries for residents (non-citizens) to return back to KSA

# List of Banned Countries [last updated at ${d}]

    - ${json.banned.join('\n\t- ')}

# Removed from the ban list

    - ${removed.length > 0 ? removed.map(r=>`${r.country} [${r.changedAt}]`).join('\n\t- ') : "No countries have been removed from the list yet"}

# Added to ban list

    - ${added.length > 0 ? added.map(r=>`${r.country} [${r.changedAt}]`).join('\n\t- ') : "No countries have been added from the list yet"}

    `
    fs.writeFileSync('README.md',readme)
    return true
}

const compare = (update) => {
    const json = fs.readJsonSync(countryjson)
    console.log("🚀 ~ file: index.js ~ line 7 ~ compare ~ json", json)
    //check which countries have been removed
    const removedFromBanList = [];
    const addedToBanList = [];
    json.banned.map(country => {
        if(!update.includes(country)) removedFromBanList.push(country)
    })
    update.map(country => {
        if(!json.banned.includes(country)) addedToBanList.push(country)
    });
    const d = new Date()
    //update added and removed objects

    addedToBanList.map(country => {
        json.added[country] = d
    })

    removedFromBanList.map(country => {
        json.removed[country] = d
    })

    json.banned = update;
    fs.writeJsonSync(countryjson, json, {
        spaces:2
    })
    return json
}


const run = async () => {
    //read current countries.json
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 2 });
    await page.goto('https://www.saudia.com/travel-with-saudia/book-with-us/quarantine-packages')
    await page.evaluate(`document.fonts.ready`);
    const updatedCountries = await page.evaluate(`[...document.querySelectorAll("li")].filter(x=>x.innerText.toLowerCase().startsWith("temporarily suspending entry into the kingdom"))[0].innerText.replace("Temporarily suspending entry into the Kingdom for all guests coming or passed from (","").match(/\(([^)]+)\)/)[1].split(',').map(x=>x.trim())`)
    console.log(`Got list: ${JSON.stringify(updatedCountries)}`);
    //compare both arrays
    const updatedJson = await compare(updatedCountries);
    console.log("🚀 ~ file: index.js ~ line 45 ~ run ~ updatedJson", updatedJson)
    await generateReadme(updatedJson)
    await browser.close();
    process.exit();
};

run()