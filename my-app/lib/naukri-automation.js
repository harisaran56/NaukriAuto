/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer');
require('dotenv').config();

const USERNAME = process.env.NAUKRI_USERNAME;
const PASSWORD = process.env.NAUKRI_PASSWORD;
const JOB_TITLE = 'Frontend Developer'; // Change this to your desired job title
const NUM_APPLICATIONS = 5; // Change this to the number of jobs you want to apply to
const MAX_RETRIES = 3; // Maximum number of retries for each operation

// Helper function to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function retry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} failed. Retrying...`);
      await wait(2000); // Wait 2 seconds before retrying
    }
  }
}

async function login(page) {
  await retry(async () => {
    await page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'networkidle0' });
    await page.type('#usernameField', USERNAME);
    await page.type('#passwordField', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('Logged in successfully');
  });
}

async function searchJobs(page, jobTitle) {
  await retry(async () => {
    await page.goto(`https://www.naukri.com/${jobTitle.replace(' ', '-')}-jobs`, { waitUntil: 'networkidle0' });
    console.log(`Searched for ${jobTitle} jobs`);
  });
}

async function getJobListings(page) {
  console.log('Attempting to find job listings...');
  
  // Wait for the page to load completely
  await wait(5000);

  // Log the current URL
  console.log('Current URL:', await page.url());

  // Try to find job listings using various methods
  const jobListings = await page.evaluate(() => {
    // Function to get text or innerText of an element
    const getText = (el) => el.textContent || el.innerText;

    // Try to find elements that look like job listings
    const possibleJobElements = [
      ...document.querySelectorAll('div[class*="job"], div[class*="Job"], div[class*="listing"], div[class*="Listing"]'),
    ];

    // Filter elements that are likely to be job listings
    const likelyJobListings = possibleJobElements.filter(el => {
      const text = getText(el);
      return text.includes('Experience') || text.includes('Salary') || text.includes('Location');
    });

    console.log(`Found ${likelyJobListings.length} potential job listings`);

    // Return information about these elements
    return likelyJobListings.map(el => ({
      text: getText(el).slice(0, 100), // First 100 characters of text
      classes: el.className,
      id: el.id,
    }));
  });

  console.log('Potential job listings:', jobListings);

  if (jobListings.length === 0) {
    console.log('No job listings found. Dumping page content...');
    const content = await page.content();
    console.log(content.slice(0, 1000)); // Log first 1000 characters of page content
  }

  return jobListings;
}

async function applyToJob(page, jobInfo, index) {
  await retry(async () => {
    console.log(`Attempting to apply for job ${index + 1}`);

    // Click on the job listing
    await page.evaluate((jobInfo) => {
      const elements = document.querySelectorAll(`div[class="${jobInfo.classes}"]`);
      if (elements.length > 0) {
        elements[0].click();
      } else {
        throw new Error('Could not find the job element to click');
      }
    }, jobInfo);

    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Try to find and click the apply button
    const applyButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const applyButton = buttons.find(button => 
        button.textContent.toLowerCase().includes('apply') ||
        button.className.toLowerCase().includes('apply')
      );
      if (applyButton) {
        applyButton.click();
        return true;
      }
      return false;
    });

    if (applyButton) {
      console.log(`Applied to job ${index + 1}`);
    } else {
      console.log(`Could not find apply button for job ${index + 1}`);
    }

    await page.goBack({ waitUntil: 'networkidle0' });
  });
}

async function applyToJobs(page, numApplications) {
  const jobListings = await getJobListings(page);

  for (let i = 0; i < Math.min(numApplications, jobListings.length); i++) {
    try {
      await applyToJob(page, jobListings[i], i);
      // Add a delay between applications to mimic human behavior
      await wait(3000 + Math.random() * 2000);
    } catch (error) {
      console.error(`Error applying to job ${i + 1}:`, error.message);
    }
  }
}

async function main() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await login(page);
    await searchJobs(page, JOB_TITLE);
    await applyToJobs(page, NUM_APPLICATIONS);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
}

main();

console.log('Script execution completed. Please check the console for results and any error messages.');


// This is Also correct code----------------------------------------------------------------------------------------------------------//
// ------//
/* eslint-disable @typescript-eslint/no-require-imports */
// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
// require('dotenv').config();

// // Add stealth plugin and adblocker
// puppeteer.use(StealthPlugin());
// puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// const USERNAME = process.env.NAUKRI_USERNAME;
// const PASSWORD = process.env.NAUKRI_PASSWORD;
// const JOB_TITLE = 'frontend developer'; // Change this to your desired job title
// const NUM_APPLICATIONS = 5;
// const NAVIGATION_TIMEOUT = 60000;

// const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// async function setupBrowser() {
//   const browser = await puppeteer.launch({
//     headless: false,
//     args: [
//       '--disable-features=IsolateOrigins',
//       '--disable-site-isolation-trials',
//       '--disable-web-security',
//       '--disable-features=BlockInsecurePrivateNetworkRequests',
//       '--disable-features=ThirdPartyCookieBlocking',
//       '--disable-features=CookiesWithoutSameSiteMustBeSecure',
//       '--disable-blink-features=AutomationControlled',
//       '--allow-running-insecure-content',
//       '--disable-notifications',
//       '--enable-features=NetworkService',
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--ignore-certificate-errors'
//     ]
//   });

//   const page = await browser.newPage();
  
//   // Set up request interception
//   await page.setRequestInterception(true);
//   page.on('request', request => {
//     // Block ad-related requests and tracking
//     if (
//       request.url().includes('securepubads') ||
//       request.url().includes('google-analytics') ||
//       request.url().includes('doubleclick') ||
//       request.url().includes('google-adservices') ||
//       request.url().includes('analytics') ||
//       request.url().includes('tracking') ||
//       request.url().includes('pubads_impl')
//     ) {
//       request.abort();
//     } else {
//       request.continue();
//     }
//   });

//   // Set user agent
//   await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

//   // Set cookies to accept all
//   await page.setCookie({
//     name: 'cookieConsent',
//     value: 'accepted',
//     domain: '.naukri.com',
//     path: '/'
//   });

//   // Override permissions
//   const context = browser.defaultBrowserContext();
//   await context.overridePermissions('https://www.naukri.com', [
//     'geolocation',
//     'notifications',
//     'camera',
//     'microphone',
//     'clipboard-read',
//     'clipboard-write'
//   ]);

//   // Disable webdriver
//   await page.evaluateOnNewDocument(() => {
//     Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
//     window.navigator.chrome = { runtime: {} };
//     Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
//     Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//   });

//   // Handle dialogs automatically
//   page.on('dialog', async dialog => {
//     await dialog.dismiss();
//   });

//   page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
//   return { browser, page };
// }

// async function login(page) {
//   try {
//     // Clear existing cookies
//     await page.deleteCookie();
    
//     await page.goto('https://www.naukri.com/nlogin/login', {
//       waitUntil: 'networkidle0',
//       timeout: NAVIGATION_TIMEOUT
//     });

//     await page.type('#usernameField', USERNAME);
//     await page.type('#passwordField', PASSWORD);
    
//     await Promise.all([
//       page.click('button[type="submit"]'),
//       page.waitForNavigation({
//         waitUntil: 'networkidle0',
//         timeout: NAVIGATION_TIMEOUT
//       })
//     ]);

//     console.log('Logged in successfully');
//   } catch (error) {
//     console.error('Login failed:', error.message);
//     throw error;
//   }
// }

// async function searchJobs(page, jobTitle) {
//   try {
//     const searchUrl = `https://www.naukri.com/${jobTitle.replace(/\s+/g, '-')}-jobs`;
//     await page.goto(searchUrl, {
//       waitUntil: 'networkidle0',
//       timeout: NAVIGATION_TIMEOUT
//     });
    
//     // Wait for job listings to load
//     await wait(5000);
//     console.log(`Searched for ${jobTitle} jobs`);
//   } catch (error) {
//     console.error('Job search failed:', error.message);
//     throw error;
//   }
// }

// async function findJobElements(page) {
//   const selectors = [
//     'article.jobTuple',
//     '.job-listing',
//     '.jobTupleHeader',
//     '[data-job-id]',
//     '.job-card'
//   ];

//   for (const selector of selectors) {
//     const elements = await page.$$(selector);
//     if (elements.length > 0) {
//       console.log(`Found ${elements.length} job listings using selector: ${selector}`);
//       return { selector, elements };
//     }
//   }

//   // Fallback to finding elements by content
//   const jobElements = await page.evaluate(() => {
//     const elements = Array.from(document.querySelectorAll('*'));
//     return elements
//       .filter(el => {
//         const text = el.textContent || '';
//         return (
//           text.includes('Experience') &&
//           text.includes('Posted') &&
//           (text.includes('Apply') || text.includes('View'))
//         );
//       })
//       .map(el => ({
//         text: el.textContent,
//         xpath: getXPath(el)
//       }));

//     function getXPath(element) {
//       if (element.id !== '') return `//*[@id="${element.id}"]`;
//       if (element === document.body) return '/html/body';

//       let ix = 0;
//       const siblings = element.parentNode.childNodes;

//       for (let i = 0; i < siblings.length; i++) {
//         const sibling = siblings[i];
//         if (sibling === element) {
//           return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
//         }
//         if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
//           ix++;
//         }
//       }
//     }
//   });

//   console.log(`Found ${jobElements.length} job listings using content matching`);
//   return { selector: 'custom', elements: jobElements };
// }

// async function applyToJob(page, jobInfo, index) {
//   try {
//     console.log(`Attempting to apply for job ${index + 1}`);

//     if (jobInfo.selector === 'custom') {
//       await page.evaluate((xpath) => {
//         const element = document.evaluate(
//           xpath,
//           document,
//           null,
//           XPathResult.FIRST_ORDERED_NODE_TYPE,
//           null
//         ).singleNodeValue;
//         if (element) element.click();
//       }, jobInfo.elements[index].xpath);
//     } else {
//       await page.click(`${jobInfo.selector}:nth-child(${index + 1})`);
//     }

//     await wait(3000);

//     // Look for and click the apply button
//     const applyButton = await page.evaluate(() => {
//       const buttons = Array.from(document.querySelectorAll('button, a'));
//       const applyBtn = buttons.find(btn => {
//         const text = (btn.textContent || '').toLowerCase();
//         return text.includes('apply') || text.includes('submit application');
//       });
//       if (applyBtn) {
//         applyBtn.click();
//         return true;
//       }
//       return false;
//     });

//     if (applyButton) {
//       console.log(`Successfully applied to job ${index + 1}`);
//       await wait(2000);
//     } else {
//       console.log(`Could not find apply button for job ${index + 1}`);
//     }

//     await page.goBack({ waitUntil: 'networkidle0', timeout: NAVIGATION_TIMEOUT });
//     await wait(2000);
//   } catch (error) {
//     console.error(`Error applying to job ${index + 1}:`, error.message);
//   }
// }

// async function main() {
//   const { browser, page } = await setupBrowser();

//   try {
//     await login(page);
//     await searchJobs(page, JOB_TITLE);

//     const jobInfo = await findJobElements(page);
//     const numJobs = jobInfo.selector === 'custom' ? jobInfo.elements.length : jobInfo.elements.length;
    
//     for (let i = 0; i < Math.min(NUM_APPLICATIONS, numJobs); i++) {
//       await applyToJob(page, jobInfo, i);
//       await wait(3000 + Math.random() * 2000);
//     }
//   } catch (error) {
//     console.error('An error occurred:', error);
//   } finally {
//     await browser.close();
//   }
// }

// main();

// console.log('Script execution completed. Please check the console for results and any error messages.');