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
<div align="center">
<img src="https://raw.githubusercontent.com/smashah/saudia-banned-country-list-checker/master/assets/bg.png"/>

# Saudia Banned Countries Checker

> A simple way to check which countries are still on the list of banned countries for residents (non-citizens) to return back to KSA.
> Updated every hour.

</div>


# List of Banned Countries
> Last updated at ${d}

    - ${json.banned.join('\n\t- ')}

# Removed from the ban list

    - ${removed.length > 0 ? removed.map(r=>`${r.country} [${r.changedAt}]`).join('\n\t- ') : "No countries have been removed from the list yet"}

# Added to ban list

    - ${added.length > 0 ? added.map(r=>`${r.country} [${r.changedAt}]`).join('\n\t- ') : "No countries have been added from the list yet"}


## License

MIT © [Mohammed Shah](https://github.com/smashah)

This project is in no way affiliated with Saudia Airlines and the Saudia logo is property and Copyright © of Saudia Airlines 2020 
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

const timeout = ms =>  new Promise(resolve => setTimeout(resolve, ms, 'timeout'));


const run = async () => {
    try {
        //read current countries.json
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 2 });
        const pagePromise = page.goto('https://www.saudia.com/before-flying/travel-information/travel-requirements-by-international-stations')
        const pageRes = await Promise.race([
            pagePromise,
            timeout(1000)
        ])
        if(pageRes=='timeout') {
            process.exit();
            return
        }
        await page.evaluate(`document.fonts.ready`);
        const updatedCountriesPromise = page.evaluate(`[...document.querySelectorAll("li")].filter(x=>x.innerText.toLowerCase().startsWith("temporarily suspending entry into the kingdom"))[0].innerText.replace("Temporarily suspending entry into the Kingdom for all guests coming or passed from (","").match(/\(([^)]+)\)/)[1].split(',').map(x=>x.trim())`)
        const updatedCountries = await updatedCountriesPromise
        console.log(`Got list: ${JSON.stringify(updatedCountries)}`);
        const res = await Promise.race([
            updatedCountriesPromise,
            timeout(1000)
        ])
        if(res=='timeout') {
            process.exit();
            return
        }
        //compare both arrays
        const updatedJson = await compare(updatedCountries);
        console.log("🚀 ~ file: index.js ~ line 45 ~ run ~ updatedJson", updatedJson)
        await generateReadme(updatedJson)
        await browser.close();
        process.exit();
    } catch (error) {
        console.error("🚀 ~ file: index.js ~ line 99 ~ run ~ error", error)
        process.exit();
    }
};

run()