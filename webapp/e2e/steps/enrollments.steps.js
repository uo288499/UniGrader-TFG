const puppeteer = require('puppeteer');
const { defineFeature, loadFeature } = require('jest-cucumber');
require('dotenv').config({ path: '../../.env' });

const feature = loadFeature('./features/enrollments.feature');

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
        } catch (e) { }

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

        const headerButtonsAfterAdmin = await page.$$('header button');
        if (headerButtonsAfterAdmin.length > 0) await headerButtonsAfterAdmin[0].click();
        await page.waitForXPath(usersNavXpath);
        const [usersNavStu] = await page.$x(usersNavXpath);
        await usersNavStu.click();
        await page.waitForSelector('[data-testid="users-list-page"]');
        const stuRow = await page.$x("//tr[contains(., 'student@test.com')]");
        const [editBtnStu] = await stuRow[0].$x(".//*[contains(@data-testid, 'edit-button-')]");
        await editBtnStu.click();
        await page.waitForSelector('[data-testid="user-form-page"]');
        const [uniInputStu] = await page.$x("//label[contains(., 'Universidad')]/following::input[1]");
        await uniInputStu.click();
        const [uniOptionStu] = await page.$x("//li[contains(., 'Test University')]");
        await uniOptionStu.click();
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');
    });

    afterAll(async () => {
        await cleanDatabases();
        await browser.close();
    });

    test('Create, filter and delete an enrollment', ({ given, when, then }) => {
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

            const headerButtonsAfterStu = await page.$$('header button');
            if (headerButtonsAfterStu.length > 0) await headerButtonsAfterStu[0].click();
            const stuNavXpath = "//li//span[contains(., 'Programas de Estudio')]";
            await page.waitForXPath(stuNavXpath);
            const [stuNav] = await page.$x(stuNavXpath);
            await stuNav.click();
            await page.waitForSelector('[data-testid="studyprograms-list-page"]');
            const newStuBtn = await page.$x("//button[contains(., 'Nuevo Programa')]");
            await newStuBtn[0].click();
            await page.waitForSelector('[data-testid="studyprogram-form-page"]');
            const [nameStuInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
            await nameStuInput.type('Grado en Ingeniería');
            const [tipoInput] = await page.$x("//label[contains(., 'Tipo')]/following::input[1]");
            await tipoInput.click();
            const [tipoOption] = await page.$x("//li[contains(., 'Grado')]");
            await tipoOption.click();
            await page.click('button[type="submit"]');
            await page.waitForSelector('div[role="alert"]');

            const headerButtonsAfterProgram = await page.$$('header button');
            if (headerButtonsAfterProgram.length > 0) await headerButtonsAfterProgram[0].click();
            const yearNavXpath = "//li//span[contains(., 'Años Académicos')]";
            await page.waitForXPath(yearNavXpath);
            const [yearNav] = await page.$x(yearNavXpath);
            await yearNav.click();
            await page.waitForSelector('[data-testid="academicyears-list-page"]');
            const newYearBtn = await page.$x("//button[contains(., 'Nuevo Año')]");
            await newYearBtn[0].click();
            await page.waitForSelector('[data-testid="academicyear-form-page"]');
            const [yearInput] = await page.$x("//label[contains(., 'Etiqueta')]/following::input[1]");
            await yearInput.type('2025/2026');
            const iniDateLabel = "//label[contains(., 'Fecha de Inicio')]/following::input[1]";
            const finDateLabel = "//label[contains(., 'Fecha de Fin')]/following::input[1]";
            const [iniDateInput] = await page.$x(iniDateLabel);
            const [finDateInput] = await page.$x(finDateLabel);
            await finDateInput.type('31-12-2025');
            await iniDateInput.type('01-01-2025');
            await page.click('button[type="submit"]');
            await page.waitForSelector('div[role="alert"]');
        });

        when('I open the enrollments list', async () => {
            const headerButtons = await page.$$('header button');
            if (headerButtons.length > 0) await headerButtons[0].click();
            const navXpath = "//li//span[contains(., 'Matrículas')]";
            await page.waitForXPath(navXpath);
            const [navItem] = await page.$x(navXpath);
            await navItem.click();
            await page.waitForSelector('[data-testid="enrollments-list-page"]');
        });

        then('the list should be empty', async () => {
            const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
            expect(noResults.length > 0).toBe(true);
        });

        when('I create a new enrollment', async () => {
            const newBtn = await page.$x("//button[contains(., 'Nueva Matrícula')]");
            await newBtn[0].click();
            await page.waitForSelector('[data-testid="enrollment-form-page"]');
            const [accInput] = await page.$x("//label[contains(., 'Cuenta')]/following::input[1]");
            await accInput.click();
            const [accOption] = await page.$x("//li[contains(., 'student')]");
            await accOption.click();

            const [programInput] = await page.$x("//label[contains(., 'Programa')]/following::input[1]");
            await programInput.click();
            const [programOption] = await page.$x("//li[contains(., 'Grado')]");
            await programOption.click();

            const [yearInput] = await page.$x("//label[contains(., 'Año')]/following::input[1]");
            await yearInput.click();
            const [yearOption] = await page.$x("//li[contains(., '2025')]");
            await yearOption.click();

            await page.click('button[type="submit"]');
            await page.waitForSelector('div[role="alert"]');
            const alertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
            expect(alertText).toContain('Matrícula creada correctamente');
        });

        then('I should see the enrollment in the list', async () => {
            const headerButtons = await page.$$('header button');
            if (headerButtons.length > 0) await headerButtons[0].click();
            const navXpath = "//li//span[contains(., 'Matrículas')]";
            await page.waitForXPath(navXpath);
            const [navItem] = await page.$x(navXpath);
            await navItem.click();
            await page.waitForSelector('[data-testid="enrollments-list-page"]');

            const rows = await page.$x("//tr[.//text()[contains(., 'Grado en Ingeniería')]]");
            expect(rows.length).toBeGreaterThan(0);
        });

        when('I apply correct filters for that enrollment', async () => {
            const headerButtons = await page.$$('header button');
            if (headerButtons.length > 0) await headerButtons[0].click();
            const navXpath = "//li//span[contains(., 'Matrículas')]";
            await page.waitForXPath(navXpath);
            const [navItem] = await page.$x(navXpath);
            await navItem.click();
            await page.waitForSelector('[data-testid="enrollments-list-page"]');

            const [mailFilter] = await page.$x("//label[contains(., 'Correo')]/following::input[1]");
            await mailFilter.type('student@');

            await page.waitForTimeout(500);
        });

        then('the filters work and I see that enrollment', async () => {
            const rows = await page.$x("//tr[.//text()[contains(., 'Grado en Ingeniería')]]");
            expect(rows.length).toBeGreaterThan(0);
        });

        when('I apply non matching filters', async () => {
            const [mailFilter] = await page.$x("//label[contains(., 'Correo')]/following::input[1]");
            await mailFilter.click({ clickCount: 3 });
            await mailFilter.type('nothing');

            await page.waitForTimeout(500);
        });

        then('the filters work and the no-results state appears', async () => {
            const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
            expect(noResults.length > 0).toBe(true);
            const resetBtn = await page.$x("//button[contains(., 'LIMPIAR FILTROS')]");
            if (resetBtn.length) await resetBtn[0].click();
        });


        when('I delete the enrollment', async () => {
            const [row] = await page.$x("//tr[.//text()[contains(., 'Grado en Ingeniería')]]");
            const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
            await editBtn.click();

            await page.waitForSelector('[data-testid="enrollment-form-page"]');
            page.once('dialog', async (dialog) => await dialog.accept());
            const [deleteBtn] = await page.$x("//button[contains(., 'ELIMINAR')]");
            await deleteBtn.click();
            await page.waitForSelector('div[role="alert"]');
            const alertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
            expect(alertText).toContain('Matrícula eliminada correctamente');
        });

        then('the list should be empty again', async () => {
            const headerButtons = await page.$$('header button');
            if (headerButtons.length > 0) await headerButtons[0].click();
            const navXpath = "//li//span[contains(., 'Matrículas')]";
            await page.waitForXPath(navXpath);
            const [navItem] = await page.$x(navXpath);
            await navItem.click();

            await page.waitForSelector('[data-testid="enrollments-list-page"]');
            const noResults = await page.$x("//td//p[contains(., 'No se encontraron resultados')]");
            expect(noResults.length > 0).toBe(true);
        });
    });
});
