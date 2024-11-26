/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer');
require('dotenv').config();

const USERNAME = process.env.NAUKRI_USERNAME;
const PASSWORD = process.env.NAUKRI_PASSWORD;
const JOB_TITLE = 'Software Engineer'; // Change this to your desired job title
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