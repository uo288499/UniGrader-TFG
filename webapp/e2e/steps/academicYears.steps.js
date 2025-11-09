const puppeteer = require('puppeteer');
const { defineFeature, loadFeature } = require('jest-cucumber');
require('dotenv').config({ path: '../../.env' });

const feature = loadFeature('./features/academicYears.feature');

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

    await page.waitForSelector('#email');
    await page.type('#email', process.env.ADMIN_EMAIL);
    await page.type('#password', process.env.ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Create a university
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
    const nameLabel = "//label[contains(., 'Nombre')]/following::input[1]";
    const [nameInput] = await page.$x(nameLabel);
    await nameInput.type('Test University');
    await page.click('button[type="submit"]');
    await page.waitForSelector('div[role="alert"]');
    const uniAlertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
    expect(uniAlertText).toContain('Universidad creada correctamente');

    // Assign the university to the admin user
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
    const uniInputXpath = "//label[contains(., 'Universidad')]/following::input[1]";
    const [uniInput] = await page.$x(uniInputXpath);
    await uniInput.click();
    const [uniOption] = await page.$x("//li[contains(., 'Test University')]");
    await uniOption.click();
    await page.click('button[type="submit"]');
    await page.waitForSelector('div[role="alert"]');
    const userAlertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
    expect(userAlertText).toContain('Usuario actualizado correctamente');
  });

  afterAll(async () => {
    await cleanDatabases();
    await browser.close();
  });

  test('Create, filter, edit and delete an academic year', ({ given, when, then }) => {
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

      const url = page.url();
      expect(url).toBe('http://localhost:3000/');
    });

    when('I open the academic years list', async () => {
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const yearNavXpath = "//li//span[contains(., 'Años Académicos')]";
      await page.waitForXPath(yearNavXpath);
      const [yearNav] = await page.$x(yearNavXpath);
      await yearNav.click();
      await page.waitForSelector('[data-testid="academicyears-list-page"]');
    });

    then('the list should be empty', async () => {
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);
    });

    when('I attempt to create an academic year with invalid data', async () => {
      const newYearBtn = await page.$x("//button[contains(., 'Nuevo Año Académico')]");
      await newYearBtn[0].click();
      await page.waitForSelector('[data-testid="academicyear-form-page"]');

      const yearLabel = "//label[contains(., 'Etiqueta del Año')]/following::input[1]";
      const iniDateLabel = "//label[contains(., 'Fecha de Inicio')]/following::input[1]";
      const finDateLabel = "//label[contains(., 'Fecha de Fin')]/following::input[1]";
      const [yearInput] = await page.$x(yearLabel);
      const [iniDateInput] = await page.$x(iniDateLabel);
      const [finDateInput] = await page.$x(finDateLabel);
      await yearInput.type('A');
      await iniDateInput.type('31-12-2025');
      await finDateInput.type('01-01-2025');
      await page.click('button[type="submit"]');
    });

    then('I should see validation errors', async () => {
      const errLabel = await page.$x("//p[contains(., 'La etiqueta debe tener al menos 3 caracteres')]");
      const errDate = await page.$x("//p[contains(., 'La fecha de fin no puede ser anterior a la fecha de inicio')]");
      expect(errLabel.length).toBeGreaterThan(0);
      expect(errDate.length).toBeGreaterThan(0);
    });

    when('I create a valid new academic year', async () => {
      const yearLabel = "//label[contains(., 'Etiqueta del Año')]/following::input[1]";
      const iniDateLabel = "//label[contains(., 'Fecha de Inicio')]/following::input[1]";
      const finDateLabel = "//label[contains(., 'Fecha de Fin')]/following::input[1]";
      const [yearInput] = await page.$x(yearLabel);
      const [iniDateInput] = await page.$x(iniDateLabel);
      const [finDateInput] = await page.$x(finDateLabel);
      await yearInput.click({ clickCount: 3 });
      await yearInput.type('2025/2026');
      await finDateInput.click({ clickCount: 3 });
      await finDateInput.type('31-12-2025');
      await iniDateInput.click({ clickCount: 3 });
      await iniDateInput.type('01-01-2025');
      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
      const yearAlertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(yearAlertText).toContain('Año académico creado correctamente');

      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const yearXpath = "//li//span[contains(., 'Años Académicos')]";
      await page.waitForXPath(yearXpath);
      const [item] = await page.$x(yearXpath);
      await item.click();
      await page.waitForSelector('[data-testid="academicyears-list-page"]');
    });

    then('I should see the new academic year in the list', async () => {
      const rows = await page.$x("//tr[.//text()[contains(., '2025/2026')]]");
      expect(rows.length).toBeGreaterThan(0);
    });

    when('I apply correct filters for that academic year', async () => {
      const labelFilter = await page.$x("//label[contains(., 'Etiqueta del Año')]/following::input[1]");
      await labelFilter[0].type('2025/2026');
      await page.waitForTimeout(500);
    });

    then('the filters work and I see that academic year', async () => {
      const rows = await page.$x("//tr[.//text()[contains(., '2025/2026')]]");
      expect(rows.length).toBeGreaterThan(0);
    });

    when('I apply non matching filters', async () => {
      const labelFilter = await page.$x("//label[contains(., 'Etiqueta del Año')]/following::input[1]");
      await labelFilter[0].click({ clickCount: 3 });
      await labelFilter[0].type('Random');
      await page.waitForTimeout(500);
    });

    then('the filters work and the no-results state appears', async () => {
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);

      const resetBtn = await page.$x("//button[contains(., 'LIMPIAR FILTROS')]");
      if (resetBtn.length) await resetBtn[0].click();
      await page.waitForTimeout(300);
    });

    when('I edit the academic year', async () => {
      const [row] = await page.$x("//tr[.//text()[contains(., '2025/2026')]]");
      const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
      await editBtn.click();
      await page.waitForSelector('[data-testid="academicyear-form-page"]');
      const labelInput = await page.$x("//label[contains(., 'Etiqueta del Año')]/following::input[1]");
      await labelInput[0].type(' Edited');
      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
      const yearAlertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(yearAlertText).toContain('Año académico actualizado correctamente');

      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const yearXpath = "//li//span[contains(., 'Años Académicos')]";
      await page.waitForXPath(yearXpath);
      const [item] = await page.$x(yearXpath);
      await item.click();
      await page.waitForSelector('[data-testid="academicyears-list-page"]');
    });

    then('I should see the changes in the list', async () => {
      const rows = await page.$x("//tr[.//text()[contains(., '2025/2026 Edited')]]");
      expect(rows.length).toBeGreaterThan(0);
    });

    when('I delete the academic year', async () => {
      const [row] = await page.$x("//tr[.//text()[contains(., '2025/2026 Edited')]]");
      const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
      await editBtn.click();
      await page.waitForSelector('[data-testid="academicyear-form-page"]');
      page.once('dialog', async (dialog) => await dialog.accept());
      const deleteBtn = await page.$x("//button[contains(., 'ELIMINAR')]");
      await deleteBtn[0].click();
      await page.waitForSelector('div[role="alert"]');
      const yearAlertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(yearAlertText).toContain('Año académico eliminado correctamente');

      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();
      const yearXpath = "//li//span[contains(., 'Años Académicos')]";
      await page.waitForXPath(yearXpath);
      const [item] = await page.$x(yearXpath);
      await item.click();
      await page.waitForSelector('[data-testid="academicyears-list-page"]');
    });

    then('the list should be empty again', async () => {
      const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
      expect(noResults.length > 0).toBe(true);
    });
  });
});