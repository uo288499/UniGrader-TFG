const puppeteer = require('puppeteer');
const { defineFeature, loadFeature } = require('jest-cucumber');
require('dotenv').config({ path: '../../.env' });

const feature = loadFeature('./features/profile.feature');

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
        : await puppeteer.launch({
            headless: true,
            slowMo: 10,
            args: ['--lang=es-ES,es'],
        });

    page = await browser.newPage();

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

    try {
      await page.waitForSelector('header img', { timeout: 1000 });
      const langButton = await page.$('header img');
      if (langButton) await langButton.click();
      const [esOption] = await page.$x("//li[contains(., 'ES')]");
      if (esOption) await esOption.click();
    } catch (e) {}
  });

  afterAll(async () => {
    const profileButton = await page.$('button[aria-label="Perfil"]');
    await profileButton.click();
    await page.waitForSelector('[data-testid="profile-page"]');

    const [currentPasswordInput] = await page.$x("//label[contains(., 'Contraseña Actual')]/following::input[1]");
    const [newPasswordInput] = await page.$x("//label[contains(., 'Nueva Contraseña')]/following::input[1]");
    const [confirmPasswordInput] = await page.$x("//label[contains(., 'Confirmar Contraseña')]/following::input[1]");

    await currentPasswordInput.type("NewPass123!");
    await newPasswordInput.type(process.env.ADMIN_PASS);
    await confirmPasswordInput.type(process.env.ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForSelector('div[role="alert"]');

    await cleanDatabases();
    await browser.close();
  });

  test('Change password and log in with the new password', ({ given, when, then }) => {
    let oldPassword = process.env.ADMIN_PASS;
    let newPassword = 'NewPass123!';

    given('I am logged in as the global admin', async () => {
      await page.waitForSelector('#email');
      await page.type('#email', process.env.ADMIN_EMAIL);
      await page.type('#password', oldPassword);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      expect(page.url()).toBe('http://localhost:3000/');
    });

    when('I navigate to my profile', async () => {
      const profileButton = await page.$('button[aria-label="Perfil"]');
      await profileButton.click();
      await page.waitForSelector('[data-testid="profile-page"]');
    });

    when('I change my password', async () => {
      const [currentPasswordInput] = await page.$x("//label[contains(., 'Contraseña Actual')]/following::input[1]");
      const [newPasswordInput] = await page.$x("//label[contains(., 'Nueva Contraseña')]/following::input[1]");
      const [confirmPasswordInput] = await page.$x("//label[contains(., 'Confirmar Contraseña')]/following::input[1]");

      await currentPasswordInput.type(oldPassword);
      await newPasswordInput.type(newPassword);
      await confirmPasswordInput.type(newPassword);
      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
    });

    then('I should see a success message', async () => {
      const alertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(alertText).toContain('Perfil actualizado correctamente');
    });

    when('I log out', async () => {
      await page.waitForXPath("//button[contains(., 'Cerrar sesión')]", { timeout: 2000 });
      const [logoutBtn] = await page.$x("//button[contains(., 'Cerrar sesión')]");
      if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForSelector('[data-testid="login-page"]');
      }
      await page.waitForSelector('[data-testid="login-page"]');
    });

    when('I log in with the new password', async () => {
      await page.waitForSelector('#email');
      await page.type('#email', process.env.ADMIN_EMAIL);
      await page.type('#password', newPassword);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
    });

    then('I should be redirected to home', async () => {
      expect(page.url()).toBe('http://localhost:3000/');
    });
  });
});