const puppeteer = require('puppeteer');
const { defineFeature, loadFeature } = require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions;
require('dotenv').config({ path: '../../.env' });

const feature = loadFeature('./features/universities.feature');

const cleanDatabases = require("../utils/dbCleanup");

let browser;
let page;

defineFeature(feature, (test) => {
  beforeAll(async () => {
    browser = process.env.GITHUB_ACTIONS
      ? await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=es-ES,es'] })
      : await puppeteer.launch({ headless: true, slowMo: 10, args: ['--lang=es-ES,es'] });

    page = await browser.newPage();

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

    try {
      await page.waitForSelector('img[src$="Flag_of_the_United_Kingdom.svg"]', { timeout: 3000 });
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
    } catch (e) {}

    await page.waitForSelector('header');
  });

  afterAll(async () => {
    await cleanDatabases();
    await browser.close();
  });

  test('Create, filter, edit and delete a university', ({ given, when, then }) => {
    given('I am logged in as the global admin', async () => {
      await page.waitForSelector('header');
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();

      const loginXpath = "//li//span[contains(., 'Iniciar sesión')]";
      try {
        await page.waitForXPath(loginXpath, { timeout: 3000 });
        const [loginItem] = await page.$x(loginXpath);
        if (loginItem) await loginItem.click();
      } catch (e) {
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
      }

      await page.waitForSelector('#email');
      await page.type('#email', process.env.ADMIN_EMAIL);
      await page.type('#password', process.env.ADMIN_PASS);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(800);
      const url = page.url();
      expect(url).toBe('http://localhost:3000/');
    });

    when('I open the universities list', async () => {
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const uniXpath = "//li//span[contains(., 'Universidades')]";
      await page.waitForXPath(uniXpath);
      const [item] = await page.$x(uniXpath);
      await item.click();
      await page.waitForSelector('[data-testid="universities-list-page"]');
    });

    then('the list should be empty', async () => {
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);
    });

    when('I attempt to create a university with invalid data', async () => {
      await page.waitForXPath("//button[contains(., 'Nueva Universidad')]");
      const [newBtn] = await page.$x("//button[contains(., 'Nueva Universidad')]");
      await newBtn.click();

      await page.waitForSelector('[data-testid="university-form-page"]');

      const nameLabel = "//label[contains(., 'Nombre')]/following::input[1]";
      const [nameInput] = await page.$x(nameLabel);
      await nameInput.type('A'); // too short

      const emailLabel = "//label[contains(., 'Email')]/following::input[1]";
      const [emailInput] = await page.$x(emailLabel);
      await emailInput.type('not-an-email');

      await page.click('button[type="submit"]');
    });

    then('I should see validation errors', async () => {
      const errName = await page.$x(
        "//p[contains(., 'El nombre debe tener al menos 3 caracteres')]"
      );
      const errMail = await page.$x(
        "//p[contains(., 'Formato de email inválido')]"
      );
      expect(errName.length).toBeGreaterThan(0);
      expect(errMail.length).toBeGreaterThan(0);
    });

    when('I create a valid new university', async () => {
      const nameLabel = "//label[contains(., 'Nombre')]/following::input[1]";
      const emailLabel = "//label[contains(., 'Email')]/following::input[1]";
      const phoneLabel = "//label[contains(., 'Teléfono')]/following::input[1]";
      const addressLabel = "//label[contains(., 'Dirección')]/following::textarea[1]";
      const [addressInput] = await page.$x(addressLabel);
      const [nameInput] = await page.$x(nameLabel);
      const [emailInput] = await page.$x(emailLabel);
      const [phoneInput] = await page.$x(phoneLabel);

      const clearInput = async (input) => {
        await input.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
      };

      await clearInput(nameInput);
      await nameInput.type('Test University');

      await clearInput(emailInput);
      await emailInput.type('test@uni.local');

      await clearInput(phoneInput);
      await phoneInput.type('+34123456789');

      await clearInput(addressInput);
      await addressInput.type('Fake Address');

      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Universidad creada correctamente');

      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const uniXpath = "//li//span[contains(., 'Universidades')]";
      await page.waitForXPath(uniXpath);
      const [item] = await page.$x(uniXpath);
      await item.click();
      await page.waitForSelector('[data-testid="universities-list-page"]');
    });

    then('I should see the new university in the list', async () => {
      const rowsName = await page.$x("//tr[.//text()[contains(., 'Test University')]]");
      expect(rowsName.length).toBeGreaterThan(0);

      const rowsMail = await page.$x("//tr[.//text()[contains(., 'test@uni.local')]]");
      expect(rowsMail.length).toBeGreaterThan(0);

      const rowsAddress = await page.$x("//tr[.//text()[contains(., 'Fake Address')]]");
      expect(rowsAddress.length).toBeGreaterThan(0);

      const rowsPhone = await page.$x("//tr[.//text()[contains(., '+34123456789')]]");
      expect(rowsPhone.length).toBeGreaterThan(0);
    });

    when('I apply correct filters for that university', async () => {
      const nameFilterLabel = "//label[contains(., 'Nombre')]/following::input[1]";
      const emailFilterLabel = "//label[contains(., 'Email')]/following::input[1]";
      const phoneFilterLabel = "//label[contains(., 'Teléfono')]/following::input[1]";
      const addressFilterLabel = "//label[contains(., 'Dirección')]/following::input[1]";
      const [addressFilter] = await page.$x(addressFilterLabel);
      const [nameFilter] = await page.$x(nameFilterLabel);
      const [emailFilter] = await page.$x(emailFilterLabel);
      const [phoneFilter] = await page.$x(phoneFilterLabel);
      await nameFilter.click({ clickCount: 3 });
      await nameFilter.type('Test University');
      await emailFilter.click({ clickCount: 3 });
      await emailFilter.type('test@uni.local');
      await phoneFilter.click({ clickCount: 3 });
      await phoneFilter.type('+34123456789');
      await addressFilter.click({ clickCount: 3 });
      await addressFilter.type('Fake Address');
      await page.waitForTimeout(500);
    });

    then('the filters work and I see that university', async () => {
      const rowsName = await page.$x("//tr[.//text()[contains(., 'Test University')]]");
      expect(rowsName.length).toBeGreaterThan(0);

      const rowsMail = await page.$x("//tr[.//text()[contains(., 'test@uni.local')]]");
      expect(rowsMail.length).toBeGreaterThan(0);

      const rowsAddress = await page.$x("//tr[.//text()[contains(., 'Fake Address')]]");
      expect(rowsAddress.length).toBeGreaterThan(0);

      const rowsPhone = await page.$x("//tr[.//text()[contains(., '+34123456789')]]");
      expect(rowsPhone.length).toBeGreaterThan(0);

      const resetBtn = await page.$x("//button[contains(., 'LIMPIAR FILTROS')]");
      if (resetBtn.length) await resetBtn[0].click();
      await page.waitForTimeout(300);
    });

    when('I apply non matching filters', async () => {
      const nameFilterLabel = "//label[contains(., 'Nombre')]/following::input[1]";
      const [nameFilter] = await page.$x(nameFilterLabel);
      await nameFilter.click({ clickCount: 3 });
      await nameFilter.type('Random');
      await page.waitForTimeout(500);
    });

    then('the filters work and the no-results state appears', async () => {
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);
      const resetBtn = await page.$x("//button[contains(., 'LIMPIAR FILTROS')]");
      if (resetBtn.length) await resetBtn[0].click();
      await page.waitForTimeout(300);
    });

    when('I edit the university', async () => {
      const [row] = await page.$x("//tr[.//text()[contains(., 'Test University')]]");
      const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
      if (editBtn) await editBtn.click();
      await page.waitForSelector('[data-testid="university-form-page"]');
      const nameLabel = "//label[contains(., 'Nombre')]/following::input[1]";
      const [nameInput] = await page.$x(nameLabel);
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Edited');
      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Universidad actualizada correctamente');

      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const uniXpath = "//li//span[contains(., 'Universidades')]";
      await page.waitForXPath(uniXpath);
      const [item] = await page.$x(uniXpath);
      await item.click();
      await page.waitForSelector('[data-testid="universities-list-page"]');
    });

    then('I should see the changes in the list', async () => {
      const rows = await page.$x("//tr[.//text()[contains(., 'Edited')]]");
      expect(rows.length).toBeGreaterThan(0);

      const rowsOld = await page.$x("//tr[.//text()[contains(., 'Test University')]]");
      expect(rowsOld.length).toBe(0);
    });

    when('I delete the university', async () => {
      const [row] = await page.$x("//tr[.//text()[contains(., 'Edited')]]");
      const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
      if (editBtn) await editBtn.click();
      await page.waitForSelector('[data-testid="university-form-page"]');

      page.once('dialog', async (dialog) => { await dialog.accept(); });

      await page.waitForXPath("//button[contains(., 'ELIMINAR')]");
      const [deleteBtn] = await page.$x("//button[contains(., 'ELIMINAR')]");
      await deleteBtn.click();
      
      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Universidad eliminada correctamente');

      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const uniXpath = "//li//span[contains(., 'Universidades')]";
      await page.waitForXPath(uniXpath);
      const [item] = await page.$x(uniXpath);
      await item.click();
      await page.waitForSelector('[data-testid="universities-list-page"]');
    });

    then('the list should be empty again', async () => {
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);
    });
  });
});
