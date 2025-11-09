const puppeteer = require('puppeteer');
const { defineFeature, loadFeature } = require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions;
require("dotenv").config({ path: "../../.env" });

const feature = loadFeature('./features/login.feature');

const cleanDatabases = require("../utils/dbCleanup");

let browser;
let page;

defineFeature(feature, (test) => {
  beforeAll(async () => {
    browser = process.env.GITHUB_ACTIONS
      ? await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=es-ES,es'],
        })
      : await puppeteer.launch({ headless: true, slowMo: 10, args: ['--lang=es-ES,es'] });

    page = await browser.newPage();

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

    try {
      await page.waitForSelector('img[src$="Flag_of_the_United_Kingdom.svg"]', { timeout: 1000 });
      const img = await page.$('img[src$="Flag_of_the_United_Kingdom.svg"]');
      if (img) await img.click();
    } catch (e) {
      const anyLangImg = await page.$('header img');
      if (anyLangImg) await anyLangImg.click();
    }
    try {
      await page.waitForXPath("//li[contains(., 'ES')]");
      const [esItem] = await page.$x("//li[contains(., 'ES')]");
      if (esItem) await esItem.click();
    } catch (e) {
      // ignore if language selection failed; tests may still work depending on default
    }

    await page.waitForSelector('header');
    const headerButtons = await page.$$('header button');
    if (headerButtons.length > 0) await headerButtons[0].click();

    await page.waitForSelector('div[role="presentation"]');
    const loginXpath = "//li//span[contains(., 'Iniciar sesión')]";
    try {
      await page.waitForXPath(loginXpath, { timeout: 3000 });
      const [loginItem] = await page.$x(loginXpath);
      if (loginItem) await loginItem.click();
    } catch (e) {
      // fallback: navigate to login if menu flow fails
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    }

    await page.waitForSelector('[data-testid="login-page"]');
  });

  afterAll(async () => {
    await cleanDatabases();
    await browser.close();
  });

  afterEach(async () => {
    try {
      await page.waitForXPath("//button[contains(., 'Cerrar sesión')]", { timeout: 2000 });
      const [logoutBtn] = await page.$x("//button[contains(., 'Cerrar sesión')]");
      if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForSelector('[data-testid="login-page"]');
        return;
      }
    } catch (e) {}

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="login-page"]');
  });

  test('Successful login with valid credentials', ({ given, when, then }) => {
    let username;
    let password;

    given('A registered user with valid credentials', async () => {
      username = process.env.ADMIN_EMAIL;
      password = process.env.ADMIN_PASS;
    });

    when('I log in using the correct credentials', async () => {
      await page.waitForSelector('#email');
      await page.type('#email', username);
      await page.type('#password', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    });

    then('I should be redirected to home', async () => {
      await page.waitForTimeout(800);
      const currentUrl = page.url();
      expect(currentUrl).toBe('http://localhost:3000/');
    });
  });

  test('Login with empty username', ({ given, when, then }) => {
    let password;

    given('A user with no username', async () => {
      password = 'SomePass123!';
    });

    when('I try to log in', async () => {
      await page.waitForSelector('#password');
      await page.click('#password');
      await page.type('#password', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    });

    then("I shouldn't be able to login", async () => {
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });
  });

  test('Login with empty password', ({ given, when, then }) => {
    let username;

    given('A user with no password', async () => {
      username = 'testuser@example.com';
    });

    when('I try to log in', async () => {
      await page.waitForSelector('#email');
      await page.click('#email');
      await page.type('#email', username);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    });

    then("I shouldn't be able to login", async () => {
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });
  });

  test('Login with incorrect password', ({ given, when, then }) => {
    let username;
    let wrongPassword;

    given('A registered user with an incorrect password', async () => {
      username = 'testuser@example.com';
      wrongPassword = 'WrongPass1!';
    });

    when('I try to log in', async () => {
      await page.waitForSelector('#email');
      await page.type('#email', username);
      await page.waitForSelector('#password');
      await page.type('#password', wrongPassword);
      await page.click('button[type="submit"]');
    });

    then('I should see a login error message', async () => {
      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Correo electrónico o contraseña inválidos');
    });
  });

  test('Login with non-existing user', ({ given, when, then }) => {
    let username;
    let password;

    given('A non-existing username', async () => {
      username = 'no-such-user@example.com';
      password = 'DoesntMatter123!';
    });

    when('I try to log in', async () => {
      await page.waitForSelector('#email');
      await page.type('#email', username);
      await page.waitForSelector('#password');
      await page.type('#password', password);
      await page.click('button[type="submit"]');
    });

    then('I should see a login error message', async () => {
      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Correo electrónico o contraseña inválidos');
    });
  });
});
