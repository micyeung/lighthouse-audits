const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

var fs = require('fs');
var reader = require('readline').createInterface({
    input:require('fs').createReadStream('urls.txt')
});

let audits = "";

function launchChromeAndRunLighthouse(url, opts, config = null) {
    return chromeLauncher.launch({chromeFlags: opts.chromeFlags}).then(chrome => {
      opts.port = chrome.port;
      return lighthouse(url, opts, config).then(results => {
        // use results.lhr for the JS-consumeable output
        // https://github.com/GoogleChrome/lighthouse/blob/master/typings/lhr.d.ts
        // use results.report for the HTML/JSON/CSV output as a string
        // use results.artifacts for the trace/screenshots/other specific case you need (rarer)
        return chrome.kill().then(() => 
            results.lhr
        )
      });
    });
  }

const opts = {
    chromeFlags: ['--headless']
};

function traverse(jsonObj, type) {
    if( typeof jsonObj == "object" ) {
        Object.entries(jsonObj).forEach(([key, value]) => {
            // First level
            if (key === "audits") {
                traverse(value);
            } else if (key === "requestedUrl" || key === "finalUrl") {
                audits += value + ",";
            }
                
            // Second level... inside "audits"
            if (key === "first-contentful-paint" || key === "first-meaningful-paint" || key === "service-worker"
            || key === "works-offline" || key === "viewport" || key === "is-on-https" || key === "redirects-http"
            || key === "speed-index" || key === "estimated-input-latency" || key === "first-cpu-idle" 
            || key === "redirects") {            
                var auditRawValue = value["rawValue"];
                audits += auditRawValue + ",";
            } else if (key === "webapp-install-banner" || key === "splash-screen" || key === "themed-omnibox") {
                var auditRawValue = value["rawValue"];
                var auditDetails = value["details"]["items"][0]["failures"];
                auditDetails = JSON.stringify(auditDetails).replace(/,/g,"|"); // Don't use , as a delimiter   
                audits += auditRawValue + ",";
                audits += auditDetails + ",";

            }
        });
    }
    else {
        // jsonObj is a number or string
    }
}

reader.on('line',function(line) {
   console.log(line) 
   audits = "Requested URL, Final URL, HTTPS, Redirects HTTP, Service Worker, Offline, Mobile Friendly, FCP, FMP, Speed Index, Input Latency, First CPU Idle, Redirection Latency, Install Banner, Install Banner Reasons, Splash Screen, Splash Screen Reasons, Theming, Theming Reasons,\n"
   launchChromeAndRunLighthouse(line, opts).then(result => {
       traverse(result);
       audits += "\n";
       console.log(audits);
       fs.writeFile("output.csv", audits, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("File written!");
        });     
    });
});


