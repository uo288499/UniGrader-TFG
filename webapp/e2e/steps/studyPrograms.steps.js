const puppeteer = require('puppeteer');
const { defineFeature, loadFeature } = require('jest-cucumber');
require('dotenv').config({ path: '../../.env' });

const feature = loadFeature('./features/studyPrograms.feature');

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
    } catch (e) {}

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
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    }

    await page.waitForSelector('[data-testid="login-page"]');
    await page.type('#email', process.env.ADMIN_EMAIL);
    await page.type('#password', process.env.ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const headerButtonsAfterLogin = await page.$$('header button');
    if (headerButtonsAfterLogin.length > 0) await headerButtonsAfterLogin[0].click();
    const uniNavXpath = "//li//span[contains(., 'Universidades')]";
    await page.waitForXPath(uniNavXpath);
    const [uniNav] = await page.$x(uniNavXpath);
    await uniNav.click();
    await page.waitForSelector('[data-testid="universities-list-page"]');
    const newUniBtn = await page.$x("//button[contains(., 'Nueva Universidad')]");
    await newUniBtn[0].click();
    await page.waitForSelector('[data-testid="university-form-page"]');
    const [nameInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
    await nameInput.type('Test University');
    await page.click('button[type="submit"]');
    await page.waitForSelector('div[role="alert"]');

    const headerButtonsAfterUni = await page.$$('header button');
    if (headerButtonsAfterUni.length > 0) await headerButtonsAfterUni[0].click();
    const usersNavXpath = "//li//span[contains(., 'Usuarios')]";
    await page.waitForXPath(usersNavXpath);
    const [usersNav] = await page.$x(usersNavXpath);
    await usersNav.click();
    await page.waitForSelector('[data-testid="users-list-page"]');
    const adminRow = await page.$x("//tr[contains(., 'admin@test.com')]");
    const [editBtn] = await adminRow[0].$x(".//*[contains(@data-testid, 'edit-button-')]");
    await editBtn.click();
    await page.waitForSelector('[data-testid="user-form-page"]');
    const [uniInput] = await page.$x("//label[contains(., 'Universidad')]/following::input[1]");
    await uniInput.click();
    const [uniOption] = await page.$x("//li[contains(., 'Test University')]");
    await uniOption.click();
    await page.click('button[type="submit"]');
    await page.waitForSelector('div[role="alert"]');
  });

  afterAll(async () => {
    await cleanDatabases();
    await browser.close();
  });

  test('Create, filter, edit and delete a study program', ({ given, when, then }) => {
    given('I am logged in as the admin of a university', async () => {
      await page.waitForXPath("//button[contains(., 'Cerrar sesión')]", { timeout: 2000 });
      const [logoutBtn] = await page.$x("//button[contains(., 'Cerrar sesión')]");
      if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForSelector('[data-testid="login-page"]');
      }

      await page.waitForSelector('#email');
      await page.type('#email', 'admin@test.com');
      await page.type('#password', 'Contra.1');
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      expect(page.url()).toBe('http://localhost:3000/');
    });

    when('I open the study programs list', async () => {
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const navXpath = "//li//span[contains(., 'Programas de Estudio')]";
      await page.waitForXPath(navXpath);
      const [navItem] = await page.$x(navXpath);
      await navItem.click();
      await page.waitForSelector('[data-testid="studyprograms-list-page"]');
    });

    then('the list should be empty', async () => {
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);
    });

    when('I attempt to create a study program with invalid data', async () => {
      const newBtn = await page.$x("//button[contains(., 'Nuevo Programa')]");
      await newBtn[0].click();
      await page.waitForSelector('[data-testid="studyprogram-form-page"]');
      const [nameInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
      await nameInput.type('A');

      const [tipoInput] = await page.$x("//label[contains(., 'Tipo')]/following::input[1]");
      await tipoInput.click();
      const [tipoOption] = await page.$x("//li[contains(., 'Grado')]");
      await tipoOption.click();

      await page.click('button[type="submit"]');
    });

    then('I should see validation errors', async () => {
      const errName = await page.$x("//p[contains(., 'El nombre debe tener al menos 3 caracteres')]");
      expect(errName.length).toBeGreaterThan(0);
    });

    when('I create a valid new study program', async () => {
      const [nameInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('Grado en Ingeniería');
      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
      const alertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(alertText).toContain('Programa de estudio creado correctamente');
    });

    then('I should see the new study program in the list', async () => {
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const navXpath = "//li//span[contains(., 'Programas de Estudio')]";
      await page.waitForXPath(navXpath);
      const [navItem] = await page.$x(navXpath);
      await navItem.click();
      await page.waitForSelector('[data-testid="studyprograms-list-page"]');

      const rows = await page.$x("//tr[.//text()[contains(., 'Grado en Ingeniería')]]");
      expect(rows.length).toBeGreaterThan(0);
    });

    when('I apply correct filters for that study program', async () => {
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const navXpath = "//li//span[contains(., 'Programas de Estudio')]";
      await page.waitForXPath(navXpath);
      const [navItem] = await page.$x(navXpath);
      await navItem.click();
      await page.waitForSelector('[data-testid="studyprograms-list-page"]');

      const [tipoFilter] = await page.$x("//label[contains(., 'Tipo')]/following::input[1]");
      await tipoFilter.type('Gra');
      const [tipoOption] = await page.$x("//li[contains(., 'Grado')]");
      await tipoOption.click();

      await page.waitForTimeout(500);
    });

    then('the filters work and I see that study program', async () => {
      const rows = await page.$x("//tr[.//text()[contains(., 'Grado en Ingeniería')]]");
      expect(rows.length).toBeGreaterThan(0);
    });

    when('I apply non matching filters', async () => {
      const [tipoFilter] = await page.$x("//label[contains(., 'Tipo')]/following::input[1]");
      await tipoFilter.click({ clickCount: 3 });
      await tipoFilter.type('Pos');
      const [tipoOption] = await page.$x("//li[contains(., 'Posgrado')]");
      await tipoOption.click();

      await page.waitForTimeout(500);
    });

    then('the filters work and the no-results state appears', async () => {
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);
      const resetBtn = await page.$x("//button[contains(., 'LIMPIAR FILTROS')]");
      if (resetBtn.length) await resetBtn[0].click();
    });

    when('I edit the study program', async () => {
      const [row] = await page.$x("//tr[.//text()[contains(., 'Grado en Ingeniería')]]");
      const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
      await editBtn.click();
      await page.waitForSelector('[data-testid="studyprogram-form-page"]');
      const [nameInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
      await nameInput.type(' Editado');
      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
      const alertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(alertText).toContain('Programa de estudio actualizado correctamente');
    });

    then('I should see the changes in the list', async () => {
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const navXpath = "//li//span[contains(., 'Programas de Estudio')]";
      await page.waitForXPath(navXpath);
      const [navItem] = await page.$x(navXpath);
      await navItem.click();
      await page.waitForSelector('[data-testid="studyprograms-list-page"]');

      const rows = await page.$x("//tr[.//text()[contains(., 'Grado en Ingeniería Editado')]]");
      expect(rows.length).toBeGreaterThan(0);
    });

    when('I delete the study program', async () => {
      const [row] = await page.$x("//tr[.//text()[contains(., 'Grado en Ingeniería Editado')]]");
      const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
      await editBtn.click();

      await page.waitForSelector('[data-testid="studyprogram-form-page"]');
      page.once('dialog', async (dialog) => await dialog.accept());
      const [deleteBtn] = await page.$x("//button[contains(., 'ELIMINAR')]");
      await deleteBtn.click();
      await page.waitForSelector('div[role="alert"]');
      const alertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(alertText).toContain('Programa de estudio eliminado correctamente');
    });

    then('the list should be empty again', async () => {
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const navXpath = "//li//span[contains(., 'Programas de Estudio')]";
      await page.waitForXPath(navXpath);
      const [navItem] = await page.$x(navXpath);
      await navItem.click();

      await page.waitForSelector('[data-testid="studyprograms-list-page"]');
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);
    });
  });
});
