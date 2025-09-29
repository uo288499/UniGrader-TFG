// @ts-check
const { EmailAccount } = require("../models");
const argon2 = require("argon2");
const config = require("../config");
const validation = require("../validation");
const { checkExact } = require("express-validator");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  // Ruta para cambiar la contraseña
  app.post(
    "/change-password",
    ...validation.setup(400, validation.fields.password, validation.fields.accountId, checkExact()),
    async (req, res) => {
      try {
        // La validación de express-validator ya asegura que 'password' existe y es fuerte
        const { password: newPassword, accountId } = req.body;

        // Encuentra la cuenta por el ID del usuario
        const account = await EmailAccount.findById(accountId);

        if (!account) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        // Hashea la nueva contraseña y la guarda en la base de datos
        const hashedNewPassword = await argon2.hash(newPassword, config.crypt);
        account.password = hashedNewPassword;
        await account.save();

        res.status(200).json({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );
};