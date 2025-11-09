const puppeteer = require("puppeteer");
const { defineFeature, loadFeature } = require("jest-cucumber");
require("dotenv").config({ path: "../../.env" });

const feature = loadFeature("./features/grades.feature");

const cleanDatabases = require("../utils/dbCleanup");

let browser;
let page;

defineFeature(feature, (test) => {
    beforeAll(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({
                headless: "new",
                args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=es-ES,es"],
            })
            : await puppeteer.launch({
                headless: true,
                slowMo: 10,
                args: ["--lang=es-ES,es"],
            });

        page = await browser.newPage();

        await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });

        try {
            await page.waitForSelector('img[src$="Flag_of_the_United_Kingdom.svg"]', {
                timeout: 1000,
            });
            const img = await page.$('img[src$="Flag_of_the_United_Kingdom.svg"]');
            if (img) await img.click();
        } catch (e) {
            const anyLangImg = await page.$("header img");
            if (anyLangImg) await anyLangImg.click();
        }
        try {
            await page.waitForXPath("//li[contains(., 'ES')]");
            const [esItem] = await page.$x("//li[contains(., 'ES')]");
            if (esItem) await esItem.click();
        } catch (e) { }

        await page.waitForSelector("header");
        const headerButtons = await page.$$("header button");
        if (headerButtons.length > 0) await headerButtons[0].click();

        await page.waitForSelector('div[role="presentation"]');
        const loginXpath = "//li//span[contains(., 'Iniciar sesión')]";
        try {
            await page.waitForXPath(loginXpath, { timeout: 3000 });
            const [loginItem] = await page.$x(loginXpath);
            if (loginItem) await loginItem.click();
        } catch (e) {
            await page.goto("http://localhost:3000/login", {
                waitUntil: "networkidle0",
            });
        }

        await page.waitForSelector('[data-testid="login-page"]');
        await page.type("#email", process.env.ADMIN_EMAIL);
        await page.type("#password", process.env.ADMIN_PASS);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();

        const headerButtonsAfterLogin = await page.$$("header button");
        if (headerButtonsAfterLogin.length > 0)
            await headerButtonsAfterLogin[0].click();
        const uniNavXpath = "//li//span[contains(., 'Universidades')]";
        await page.waitForXPath(uniNavXpath);
        const [uniNav] = await page.$x(uniNavXpath);
        await uniNav.click();
        await page.waitForSelector('[data-testid="universities-list-page"]');
        const newUniBtn = await page.$x(
            "//button[contains(., 'Nueva Universidad')]"
        );
        await newUniBtn[0].click();
        await page.waitForSelector('[data-testid="university-form-page"]');
        const [nameInput] = await page.$x(
            "//label[contains(., 'Nombre')]/following::input[1]"
        );
        await nameInput.type("Test University");
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');

        const headerButtonsAfterUni = await page.$$("header button");
        if (headerButtonsAfterUni.length > 0)
            await headerButtonsAfterUni[0].click();
        const usersNavXpath = "//li//span[contains(., 'Usuarios')]";
        await page.waitForXPath(usersNavXpath);
        const [usersNav] = await page.$x(usersNavXpath);
        await usersNav.click();
        await page.waitForSelector('[data-testid="users-list-page"]');
        const adminRow = await page.$x("//tr[contains(., 'admin@test.com')]");
        const [editBtn] = await adminRow[0].$x(
            ".//*[contains(@data-testid, 'edit-button-')]"
        );
        await editBtn.click();
        await page.waitForSelector('[data-testid="user-form-page"]');
        const [uniInput] = await page.$x(
            "//label[contains(., 'Universidad')]/following::input[1]"
        );
        await uniInput.click();
        const [uniOption] = await page.$x("//li[contains(., 'Test University')]");
        await uniOption.click();
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');

        const headerButtonsAfterUser = await page.$$("header button");
        if (headerButtonsAfterUser.length > 0)
            await headerButtonsAfterUser[0].click();
        await page.waitForXPath(usersNavXpath);
        const [usersStuNav] = await page.$x(usersNavXpath);
        await usersStuNav.click();
        await page.waitForSelector('[data-testid="users-list-page"]');
        const stuRow = await page.$x("//tr[contains(., 'student@test.com')]");
        const [editStuBtn] = await stuRow[0].$x(
            ".//*[contains(@data-testid, 'edit-button-')]"
        );
        await editStuBtn.click();
        await page.waitForSelector('[data-testid="user-form-page"]');
        const [uniStuInput] = await page.$x(
            "//label[contains(., 'Universidad')]/following::input[1]"
        );
        await uniStuInput.click();
        const [uniStuOption] = await page.$x(
            "//li[contains(., 'Test University')]"
        );
        await uniStuOption.click();
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');

        const headerButtonsAfterStud = await page.$$("header button");
        if (headerButtonsAfterStud.length > 0)
            await headerButtonsAfterStud[0].click();
        await page.waitForXPath(usersNavXpath);
        const [usersProNav] = await page.$x(usersNavXpath);
        await usersProNav.click();
        await page.waitForSelector('[data-testid="users-list-page"]');
        const proRow = await page.$x("//tr[contains(., 'professor@test.com')]");
        const [editProBtn] = await proRow[0].$x(
            ".//*[contains(@data-testid, 'edit-button-')]"
        );
        await editProBtn.click();
        await page.waitForSelector('[data-testid="user-form-page"]');
        const [uniProInput] = await page.$x(
            "//label[contains(., 'Universidad')]/following::input[1]"
        );
        await uniProInput.click();
        const [uniProOption] = await page.$x(
            "//li[contains(., 'Test University')]"
        );
        await uniProOption.click();
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');

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
        const typeNavXpath = "//li//span[contains(., 'Tipos de Evaluación')]";
        await page.waitForXPath(typeNavXpath);
        const [typeNav] = await page.$x(typeNavXpath);
        await typeNav.click();
        await page.waitForSelector('[data-testid="evaluationtypes-list-page"]');
        const newTypeBtn = await page.$x("//button[contains(., 'Nuevo Tipo')]");
        await newTypeBtn[0].click();
        await page.waitForSelector('[data-testid="evaluationtype-form-page"]');
        const [nameTypeInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
        await nameTypeInput.type('Teoría');
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');

        const headerButtonsAfterType = await page.$$('header button');
        if (headerButtonsAfterType.length > 0) await headerButtonsAfterType[0].click();
        const yearNavXpath = "//li//span[contains(., 'Años Académicos')]";
        await page.waitForXPath(yearNavXpath);
        const [yearNav] = await page.$x(yearNavXpath);
        await yearNav.click();
        await page.waitForSelector('[data-testid="academicyears-list-page"]');
        const newYearBtn = await page.$x("//button[contains(., 'Nuevo Año')]");
        await newYearBtn[0].click();
        await page.waitForSelector('[data-testid="academicyear-form-page"]');
        const [labelInput] = await page.$x("//label[contains(., 'Etiqueta')]/following::input[1]");
        await labelInput.type('2025/2026');
        const iniDateLabel = "//label[contains(., 'Fecha de Inicio')]/following::input[1]";
        const finDateLabel = "//label[contains(., 'Fecha de Fin')]/following::input[1]";
        const [iniDateInput] = await page.$x(iniDateLabel);
        const [finDateInput] = await page.$x(finDateLabel);
        await finDateInput.type('31-12-2025');
        await iniDateInput.type('01-01-2025');
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');

        const headerButtonsAfterYear = await page.$$('header button');
        if (headerButtonsAfterYear.length > 0) await headerButtonsAfterYear[0].click();
        const subNavXpath = "//li//span[contains(., 'Materias')]";
        await page.waitForXPath(subNavXpath);
        const [subNav] = await page.$x(subNavXpath);
        await subNav.click();
        await page.waitForSelector('[data-testid="subjects-list-page"]');
        const newBtn = await page.$x("//button[contains(., 'Nueva Materia')]");
        await newBtn[0].click();
        await page.waitForSelector('[data-testid="subject-form-page"]');
        const [nameSubInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
        await nameSubInput.type('Seguridad');
        const [codeInput] = await page.$x("//label[contains(., 'Código')]/following::input[1]");
        await codeInput.type('S-001');
        const availableProgram = await page.$x("//li[contains(., 'Grado en Ingeniería')]");
        if (availableProgram.length > 0) {
            const addButton = await availableProgram[0].$('button[aria-label="add program"]');
            await addButton.click();
        }
        const [evalTypeInput] = await page.$x("//label[contains(., 'Tipo de evaluación')]/following::input[1]");
        await page.evaluate((el) => el.scrollIntoView(), evalTypeInput);
        await evalTypeInput.click();
        const [evalOption] = await page.$x("//li[contains(., 'Teoría')]");
        await evalOption.click();
        const [minInput] = await page.$x("//label[contains(., 'mínimo')]/following::input[1]");
        await minInput.click({ clickCount: 3 });
        await minInput.type('100');
        const [maxInput] = await page.$x("//label[contains(., 'máximo')]/following::input[1]");
        await maxInput.click({ clickCount: 3 });
        await maxInput.type('100');
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');

        const headerButtonsAfterSub = await page.$$('header button');
        if (headerButtonsAfterSub.length > 0) await headerButtonsAfterSub[0].click();
        const enrNavXpath = "//li//span[contains(., 'Matrículas')]";
        await page.waitForXPath(enrNavXpath);
        const [enrNav] = await page.$x(enrNavXpath);
        await enrNav.click();
        await page.waitForSelector('[data-testid="enrollments-list-page"]');
        const newEnrBtn = await page.$x("//button[contains(., 'Nueva Matrícula')]");
        await newEnrBtn[0].click();
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

        const headerButtonsAfterEnr = await page.$$('header button');
        if (headerButtonsAfterEnr.length > 0) await headerButtonsAfterEnr[0].click();
        const couNavXpath = "//li//span[contains(., 'Asignaturas')]";
        await page.waitForXPath(couNavXpath);
        const [couNav] = await page.$x(couNavXpath);
        await couNav.click();
        await page.waitForSelector('[data-testid="courses-list-page"]');
        const newCourseBtn = await page.$x("//button[contains(., 'Nueva Asignatura')]");
        await newCourseBtn[0].click();
        await page.waitForSelector('[data-testid="course-form-page"]');
        const [courseNameInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
        await courseNameInput.type('Cyberseguridad');
        const [courseCodeInput] = await page.$x("//label[contains(., 'Código')]/following::input[1]");
        await courseCodeInput.type('C-001');
        const [subjectInput] = await page.$x("//label[contains(., 'Materia')]/following::input[1]");
        await subjectInput.click();
        const [subjectOption] = await page.$x("//li[contains(., 'Seguridad')]");
        await subjectOption.click();
        const [gradeInput] = await page.$x("//label[contains(., 'Nota')]/following::input[1]");
        await gradeInput.type('3');
        const [yearCourseInput] = await page.$x("//label[contains(., 'Año')]/following::input[1]");
        await yearCourseInput.click();
        const [yearCourseOption] = await page.$x("//li[contains(., '2025/2026')]");
        await yearCourseOption.click();
        const [programCourseInput] = await page.$x("//label[contains(., 'Programa')]/following::input[1]");
        await programCourseInput.click();
        const [programCourseOption] = await page.$x("//li[contains(., 'Grado en Ingeniería')]");
        await programCourseOption.click();
        const [weightInput] = await page.$x("//label[contains(., 'Peso')]/following::input[1]");
        await page.evaluate((el) => el.scrollIntoView(), weightInput);
        await weightInput.click({ clickCount: 3 });
        await weightInput.type('100');
        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');

        const headerButtonsAfterCou = await page.$$('header button');
        if (headerButtonsAfterCou.length > 0) await headerButtonsAfterCou[0].click();
        const groNavXpath = "//li//span[contains(., 'Grupos')]";
        await page.waitForXPath(groNavXpath);
        const [groNav] = await page.$x(groNavXpath);
        await groNav.click();
        await page.waitForSelector('[data-testid="groups-list-page"]');
        const newGroupBtn = await page.$x("//button[contains(., 'Nuevo Grupo')]");
        await newGroupBtn[0].click();
        await page.waitForSelector('[data-testid="group-form-page"]');
        const [nameGroInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
        await nameGroInput.type('A');

        const [courseInput] = await page.$x("//label[contains(., 'Asignatura')]/following::input[1]");
        await courseInput.click();
        const [courseOption] = await page.$x("//li[contains(., 'Cyberseguridad')]");
        await courseOption.click();

        const availableProf = await page.$x("//li[contains(., 'professor@test.com')]");
        await page.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }), availableProf[0]);
        if (availableProf.length > 0) {
            const addButton = await availableProf[0].$x(".//*[contains(@data-testid, 'add-professor-')]");
            await addButton[0].click();
        }

        const availableStud = await page.$x("//li[contains(., 'student@test.com')]");
        await page.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }), availableStud[0]);
        if (availableStud.length > 0) {
            const addButton = await availableStud[0].$x(".//*[contains(@data-testid, 'add-student-')]");
            await addButton[0].click();
        }

        await page.click('button[type="submit"]');
        await page.waitForSelector('div[role="alert"]');
    });

    afterAll(async () => {
        await cleanDatabases();
        await browser.close();
    });

    test("Create, evaluate, and filter grades", ({ given, when, then }) => {
        let professorEmail = "professor@test.com";
        let professorPassword = "Contra.1";
        let studentEmail = "student@test.com";
        let groupName = "A";

        given("I am logged in as a professor", async () => {
            await page.waitForXPath("//button[contains(., 'Cerrar sesión')]", { timeout: 2000 });
            const [logoutBtn] = await page.$x("//button[contains(., 'Cerrar sesión')]");
            if (logoutBtn) {
                await logoutBtn.click();
                await page.waitForSelector('[data-testid="login-page"]');
            }

            await page.waitForSelector("#email");
            await page.type("#email", professorEmail);
            await page.type("#password", professorPassword);
            await page.click('button[type="submit"]');
            await page.waitForNavigation();
            expect(page.url()).toBe("http://localhost:3000/");
        });

        when("I navigate to the group and create an evaluation item with invalid data", async () => {
            const headerButtons = await page.$$("header button");
            if (headerButtons.length > 0) await headerButtons[0].click();
            const groupsNavXpath = "//li//span[contains(., 'Grupos')]";
            await page.waitForXPath(groupsNavXpath);
            const [groupsNav] = await page.$x(groupsNavXpath);
            await groupsNav.click();
            await page.waitForSelector('[data-testid="groups-list-page"]');

            const [row] = await page.$x("//tr[.//text()[contains(., 'Cyberseguridad')]]");
            const [editBtn] = await row.$x(".//*[contains(@data-testid, 'edit-button-')]");
            await editBtn.click();
            await page.waitForSelector('[data-testid="group-form-page"]');

            const [manageItemsButton] = await page.$x("//button[contains(.,'Gestionar items evaluables')]");
            await manageItemsButton.click();
            await page.waitForSelector('[data-testid="evaluationitems-form-page"]');

            const [nameInput] = await page.$x("//label[contains(., 'Nombre')]/following::input[1]");
            const [weightInput] = await page.$x("//label[contains(., 'Peso')]/following::input[1]");
            await nameInput.type("Parcial 1");
            await weightInput.click({ clickCount: 3 });
            await weightInput.type("50");
            await page.click('button[type="submit"]');
        });

        then("I should see validation errors", async () => {
                const errorMessage = await page.$x(
                    "//p[contains(., 'El peso total para este tipo de evaluación debe ser igual a 100%.')]"
                );
                expect(errorMessage.length).toBeGreaterThan(0);
        });

        when("I create a valid evaluation item", async () => {
            const [weightInput] = await page.$x("//label[contains(., 'Peso')]/following::input[1]");
            await weightInput.click({ clickCount: 3 });
            await weightInput.type("100");
            await page.click('button[type="submit"]');
            await page.waitForSelector('div[role="alert"]');

        });

        then("I should see a success message", async () => {
            const alertText = await page.$eval(
                'div[role="alert"]',
                (n) => n.textContent || ""
            );
            expect(alertText).toContain("Los items de evaluación se han sincronizado correctamente");
        });

        when("I evaluate a student", async () => {
            const headerButtons = await page.$$("header button");
            if (headerButtons.length > 0) await headerButtons[0].click();
            const gradesNavXpath = "//li//span[contains(., 'Notas')]";
            await page.waitForXPath(gradesNavXpath);
            const [gradesNav] = await page.$x(gradesNavXpath);
            await gradesNav.click();
            await page.waitForSelector('[data-testid="gradesmanagement-page"]');

            const [courseInput] = await page.$x("//label[contains(., 'Asignatura')]/following::input[1]");
            await courseInput.click();
            const courseOption = await page.$x("//li[contains(., 'Cyberseguridad')]");
            await courseOption[0].click();

            const [groupInput] = await page.$x("//label[contains(., 'Grupo')]/following::input[1]");
            await groupInput.click();
            const groupOption = await page.$x(`//li[contains(., '${groupName}')]`);
            await groupOption[0].click();

            const [studentInput] = await page.$x("//label[contains(., 'Estudiante')]/following::input[1]");
            await studentInput.click();
            const studentOption = await page.$x(
                `//li[contains(., '${studentEmail}')]`
            );
            await studentOption[0].click();

            await page.waitForTimeout(1000);

            const [gradeInput] = await page.$x("//label[contains(., 'Nota')]/following::input[1]");
            await gradeInput.type("8");

            const [gradesButton] = await page.$x("//button[contains(.,'Guardar Calificaciones')]");
            await page.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }), gradesButton);
            await gradesButton.click();

            await page.waitForSelector('div[role="alert"]');
        });

        then("I should see a success message", async () => {
            const alertText = await page.$eval('div[role="alert"]', (n) => n.textContent || '');
            expect(alertText).toContain("Notas guardadas correctamente");
        }); 

        when("I log in as the student", async () => {
            await page.waitForXPath("//button[contains(., 'Cerrar sesión')]", { timeout: 2000 });
            const [logoutBtn] = await page.$x("//button[contains(., 'Cerrar sesión')]");
            if (logoutBtn) {
                await logoutBtn.click();
                await page.waitForSelector('[data-testid="login-page"]');
            }

            await page.type("#email", studentEmail);
            await page.type("#password", "Contra.1");
            await page.click('button[type="submit"]');
            await page.waitForNavigation();
        });

        when("I navigate to the grades view", async () => {
            const headerButtons = await page.$$("header button");
            if (headerButtons.length > 0) await headerButtons[0].click();
            const gradesNavXpath = "//li//span[contains(., 'Notas')]";
            await page.waitForXPath(gradesNavXpath);
            const [gradesNav] = await page.$x(gradesNavXpath);
            await gradesNav.click();
            await page.waitForSelector('[data-testid="grades-page"]');
        });

        then("I should see the grades", async () => {
            const ordinaryGrade = await page.$x("//td[contains(., '8')]");
            expect(ordinaryGrade.length).toBeGreaterThan(0);
        });

        when("I apply filters for the grades", async () => {
            const [courseFilter] = await page.$x("//label[contains(., 'Asignatura')]/following::input[1]");
            await courseFilter.type("Cyberseguridad");
            await page.waitForTimeout(500);
        });

        then("the filters should work correctly", async () => {
            const filteredRows = await page.$x("//tr[contains(., 'Cyberseguridad')]");
            expect(filteredRows.length).toBeGreaterThan(0);
        });

        when("I apply non matching filters for the grades", async () => {
            const [courseFilter] = await page.$x("//label[contains(., 'Asignatura')]/following::input[1]");
            await courseFilter.click({ clickCount: 3 });
            await courseFilter.type("Fake");
            await page.waitForTimeout(500);
        });

        then("the list should be empty", async () => {
            const filteredRows = await page.$x("//tr[contains(., 'Cyberseguridad')]");
            expect(filteredRows.length).toBe(0);
            const resetBtn = await page.$x("//button[contains(., 'LIMPIAR FILTROS')]");
            if (resetBtn.length) await resetBtn[0].click();
        });
    });
});
