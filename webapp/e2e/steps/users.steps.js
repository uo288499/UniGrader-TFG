const puppeteer = require('puppeteer');
const { defineFeature, loadFeature } = require('jest-cucumber');
require('dotenv').config({ path: '../../.env' });

const feature = loadFeature('./features/users.feature');

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

  const loginAsGlobalAdmin = async () => {
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
    await page.waitForNavigation();
  };

  test('Create a user and account together', ({ given, when, then }) => {
    given('I am logged in as the global admin', async () => {
      await loginAsGlobalAdmin();
    });

    when('I open the users list', async () => {
      await page.waitForSelector('header');
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();

      const userXPath = "//li//span[contains(., 'Usuarios')]";
      await page.waitForXPath(userXPath, { timeout: 3000 });
        const [userItem] = await page.$x(userXPath);
        if (userItem) await userItem.click();
      await page.waitForSelector('[data-testid="users-list-page"]');
    });

    then('I should see the global admin in the list', async () => {
      const adminRow = await page.$x("//tr[contains(., '11111111A')]");
      expect(adminRow.length).toBe(1);
    });

    when('I create a new user with an account', async () => {
      await page.waitForXPath("//button[contains(., 'Nueva Cuenta')]");
      const [newBtn] = await page.$x("//button[contains(., 'Nueva Cuenta')]");
      await newBtn.click();

      await page.waitForSelector('[data-testid="user-form-page"]');

      const nameLabel = "//label[contains(., 'Nombre')]/following::input[1]";
      const [nameInput] = await page.$x(nameLabel);
      await nameInput.type('Daniel');

      const surNameLabel = "//label[contains(., 'Primer Apellido')]/following::input[1]";
      const [surNameInput] = await page.$x(surNameLabel);
      await surNameInput.type('Fernandez');

      const emailLabel = "//label[contains(., 'Correo electrónico')]/following::input[1]";
      const [emailInput] = await page.$x(emailLabel);
      await emailInput.type('test@email.com');

      const dniLabel = "//label[contains(., 'DNI/NIE')]/following::input[1]";
      const [dniInput] = await page.$x(dniLabel);
      await dniInput.type('22222222B');

      const [roleField] = await page.$x("//label[contains(., 'Rol')]/following::input[1]");
      await roleField.click();
      await page.waitForSelector('ul[role="listbox"]');
      const [option] = await page.$x("//li[contains(., 'Administrador Global')]");
      await option.click();

      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Usuario creado correctamente');
    });

    then('I should see the new user and account in the list', async () => {
      await page.waitForSelector('header');
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();

      const userXPath = "//li//span[contains(., 'Usuarios')]";
      await page.waitForXPath(userXPath, { timeout: 3000 });
      const [userItem] = await page.$x(userXPath);
      if (userItem) await userItem.click();
      await page.waitForSelector('[data-testid="users-list-page"]');

      const userRow = await page.$x("//tr[contains(., 'Daniel')]");
      expect(userRow.length).toBe(1);
      
      const [row] = await page.$x("//tr[.//text()[contains(., 'Daniel')]]");
      const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
      if (editBtn) await editBtn.click();
      await page.waitForSelector('[data-testid="user-form-page"]');
      
      page.once('dialog', async (dialog) => { await dialog.accept(); });

      await page.waitForXPath("//button[contains(., 'Eliminar Usuario')]");
      const [deleteBtn] = await page.$x("//button[contains(., 'Eliminar Usuario')]");
      await deleteBtn.click();

      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Usuario eliminado correctamente');
    });
  });

   test('Create an account for an existing user', ({ given, when, then }) => {
    given('I am logged in as the global admin', async () => {
      await loginAsGlobalAdmin();
    });

    when('I create an account for an existing user', async () => {
      await page.waitForSelector('header');
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();

      const userXPath = "//li//span[contains(., 'Usuarios')]";
      await page.waitForXPath(userXPath, { timeout: 3000 });
      const [userItem] = await page.$x(userXPath);
      if (userItem) await userItem.click();

      await page.waitForSelector('[data-testid="users-list-page"]');
      await page.waitForXPath("//button[contains(., 'Nueva Cuenta')]");
      const [newBtn] = await page.$x("//button[contains(., 'Nueva Cuenta')]");
      await newBtn.click();

      await page.waitForSelector('[data-testid="user-form-page"]');

      const autoInputXPath = "//label[contains(., 'Buscar usuario existente')]/following::input[1]";
      const [autoInput] = await page.$x(autoInputXPath);
      await autoInput.click({ clickCount: 3 });
      await autoInput.type('33333333Z');
      await page.waitForTimeout(1000);

      const optionXPath = "//li[contains(., '33333333Z')]";
      await page.waitForXPath(optionXPath);
      const [option] = await page.$x(optionXPath);
      await option.click();

      const emailLabel = "//label[contains(., 'Correo electrónico')]/following::input[1]";
      const [emailInput] = await page.$x(emailLabel);
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('existing@email.com');

      const roleLabel = "//label[contains(., 'Rol')]/following::input[1]";
      const [roleInput] = await page.$x(roleLabel);
      await roleInput.click();
      await page.waitForSelector('ul[role="listbox"]');
      const [roleOption] = await page.$x("//li[contains(., 'Administrador Global')]");
      await roleOption.click();

      await page.click('button[type="submit"]');
      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Cuenta creada correctamente');
    });

    then('I should see the account linked to the user in the list', async () => {
      await page.waitForSelector('header');
      const headerButtons = await page.$$('header button');
      if (headerButtons.length > 0) await headerButtons[0].click();

      const userXPath = "//li//span[contains(., 'Usuarios')]";
      await page.waitForXPath(userXPath, { timeout: 3000 });
      const [userItem] = await page.$x(userXPath);
      if (userItem) await userItem.click();

      await page.waitForSelector('[data-testid="users-list-page"]');
      const userRow = await page.$x("//tr[contains(., '33333333Z')]");
      expect(userRow.length).toBe(4);

      const [row] = await page.$x("//tr[.//text()[contains(., 'existing@email.com')]]");
      const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
      if (editBtn) await editBtn.click();
      await page.waitForSelector('[data-testid="user-form-page"]');
      
      page.once('dialog', async (dialog) => { await dialog.accept(); });

      await page.waitForXPath("//button[contains(., 'Eliminar Cuenta')]");
      const [deleteBtn] = await page.$x("//button[contains(., 'Eliminar Cuenta')]");
      await deleteBtn.click();

      await page.waitForSelector('div[role="alert"]');
      const content = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
      expect(content).toContain('Cuenta eliminada correctamente');

      await headerButtons[0].click();

      const [userItemNew] = await page.$x(userXPath);
      if (userItemNew) await userItemNew.click();

      await page.waitForSelector('[data-testid="users-list-page"]');
      const userRowNew = await page.$x("//tr[contains(., '33333333Z')]");
      expect(userRowNew.length).toBe(3);
    });
  });
});