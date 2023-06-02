const axios = require("axios");
const fs = require("fs");
const JSZip = require("jszip");
const puppeteer = require("puppeteer");

// provide link to extension in Chrome Web Store
const linkExtension =
  "https://chrome.google.com/webstore/detail/compose-ai-ai-powered-wri/ddlbpiadoechcolndfeaonajmngmhblj?hl=en-US";

// get id extension from link in Chrome Web Store
function getExtensionId(link) {
  const regex = /\/([a-z]{32})/i;
  const matches = regex.exec(link);
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return null;
}

// get name extension to name file
const getExtensionName = async (link) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(link);
    await page.waitForSelector("h1.e-f-w");
    const nameElement = await page.$("h1.e-f-w");
    const name = await page.evaluate(
      (element) => element.textContent.trim(),
      nameElement
    );
    await browser.close();
    return name;
  } catch (error) {
    console.error("Error retrieving extension name:", error.message);
    return "Unknown";
  }
};

const extensionID = getExtensionId(linkExtension);

// base link to get crx file
const fileLink = `https://clients2.google.com/service/update2/crx?response=redirect&os=linux&arch=x64&os_arch=x86_64&nacl_arch=x86-64&prod=chromium&prodchannel=unknown&prodversion=91.0.4442.4&lang=en-US&acceptformat=crx2,crx3&x=id%3D${extensionID}%26installsource%3Dondemand%26uc`;

// download crx file extension
async function downloadFileCrx(linkUrl, filePath) {
  try {
    const response = await axios.get(linkUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Error downloading file:", error);
  }
}

function convertCRXtoZIP(crxFilePath, zipFilePath) {
  fs.readFile(crxFilePath, (err, data) => {
    if (err) {
      console.error("Error reading CRX file:", err);
      return;
    }

    const zip = new JSZip();

    zip
      .loadAsync(data)
      .then(() => {
        return zip.generateAsync({ type: "nodebuffer" });
      })
      .then((zipData) => {
        fs.access(zipFilePath, (err) => {
          if (!err) {
            console.error("ZIP file already exists:", zipFilePath);
            return;
          }

          fs.writeFile(zipFilePath, zipData, (err) => {
            if (err) {
              console.error("Error writing ZIP file:", err);
            } else {
              console.log("CRX file converted to ZIP file successfully.");
            }
          });
        });
      })
      .catch((err) => {
        console.error("Error converting CRX file to ZIP:", err);
      });
  });
}

// conver crx to zip file
const downloadZipExtension = async () => {
  const extensionName = await getExtensionName(linkExtension);

  // name file crx and zip
  const crxFilePath = `${extensionName}.crx`;
  const zipFilePath = `${extensionName}.zip`;

  await downloadFileCrx(fileLink, crxFilePath);
  await convertCRXtoZIP(crxFilePath, zipFilePath);

  console.log("----- success -----");
};

downloadZipExtension();
