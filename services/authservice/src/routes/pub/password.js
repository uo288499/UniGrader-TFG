// @ts-check
const { EmailAccount } = require("../../models");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const config = require("../../config");
const validation = require("../../validation");
const { checkExact } = require("express-validator");
const mailTranslations = require("./locals/mail.json");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  // Nodemailer transport configuration
  const transporter = nodemailer.createTransport({
    service: config.email.service,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  app.post("/forgot-password",
    ...validation.setup(400, validation.fields.email, validation.fields.language, checkExact()),
    async (req, res) => {
        try {
            const { email, language } = req.body;
            const account = await EmailAccount.findOne({ email });

            if (!account) {
                // Devuelve un 200 OK para evitar ataques de enumeración de usuarios
                return res.status(200).json({ success: true });
            }

            // @ts-ignore
            const translations = mailTranslations[language] || mailTranslations['en'];

            // Crea un token JWT que caduca
            const token = jwt.sign({ id: account._id }, config.jwt.secret, { expiresIn: '1h' });

            // Guarda el token y la fecha de expiración en la base de datos
            account.resetPasswordToken = token;
            account.resetPasswordExpires = new Date(Date.now() + 3600000);;
            await account.save();

            const resetLink = `${config.appBaseUrl}/reset-password/${token}`;
            const mailOptions = {
                from: config.email.user,
                to: email,
                subject: translations.subject,
                html: translations.html.replace(/{resetLink}/g, resetLink),
            };

            await transporter.sendMail(mailOptions);
            res.status(200).json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, errorKey: "serverError" });
        }
  });

  app.post("/reset-password/:token", async (req, res) => {
    try {
      const { password } = req.body;
      const { token } = req.params;

      // Busca la cuenta por el token y verifica que no haya expirado
      const account = await EmailAccount.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!account) {
        return res.status(400).json({ success: false, errorKey: "invalidToken" });
      }

      // Hashea la nueva contraseña y la guarda en la base de datos
      const hashedPassword = await argon2.hash(password, config.crypt);
      account.password = hashedPassword;

      // Limpia el token y la fecha de expiración para evitar su reutilización
      account.resetPasswordToken = undefined;
      account.resetPasswordExpires = undefined;

      await account.save();

      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};