// @ts-check
const { EmailAccount, User } = require("../models");
const argon2 = require("argon2");
const config = require("../config");
const validation = require("../validation");
const { checkExact } = require("express-validator");
const cloudinary = require("cloudinary").v2;

const folder = "unigrader_users";

/**
 * Función auxiliar para obtener el Public ID de Cloudinary
 * @param {string | null} url
 * @param {string} folder
 * @returns {string | null}
 */
const getPublicId = (url, folder) => {
  if (!url) return null;
  return folder + "/" + url.split('/').pop()?.split('.')[0];
};

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {
  // Ruta para cambiar contraseña y foto de perfil
  app.put(
    "/change-password",
    ...validation.setup(
      400,
      validation.fields.password,
      validation.fields.currentPassword,
      validation.fields.accountId,
      validation.fields.user,
      validation.fields.photoUrl,
      validation.fields.photoUrlBase64,
      checkExact()
    ),
    async (req, res) => {
      try {
        const { password: newPassword, accountId, photoUrlBase64, photoUrl } = req.body;

        const account = await EmailAccount.findById(accountId);
        if (!account) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        const user = await User.findById(account.userId);
        if (!user) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        if (newPassword && account.password) {
          const { currentPassword } = req.body;

          const valid = await argon2.verify(account.password, currentPassword, config.crypt);
          if (!valid) {
            return res.status(401).json({ success: false, errorKey: "passwordWrong" });
          }

          const hashedNewPassword = await argon2.hash(newPassword, config.crypt);
          account.password = hashedNewPassword;
          await account.save();
        }

        // Actualizar foto de perfil 
        const currentPhotoUrl = user?.photoUrl;
        const publicId = getPublicId(currentPhotoUrl || "", folder);
        /** @type {any} */
        let userUpdates = {};

        // Si llega una imagen Base64, subimos a Cloudinary
        if (photoUrlBase64) {
          if (currentPhotoUrl && publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
          const result = await cloudinary.uploader.upload(photoUrlBase64, { folder });
          userUpdates.photoUrl = result.secure_url;
        }
        // Si se envía photoUrl vacío, eliminamos la anterior
        else if (photoUrl === "" && currentPhotoUrl && publicId) {
          await cloudinary.uploader.destroy(publicId);
          userUpdates.photoUrl = null;
        }
        // Si se pasa una URL diferente (no Base64)
        else if (photoUrl !== undefined && photoUrl !== currentPhotoUrl) {
          if (currentPhotoUrl && publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
          userUpdates.photoUrl = photoUrl;
        }

        /** @type {any} */
        let updatedUser = user;
        if (Object.keys(userUpdates).length > 0) {
          updatedUser = await User.findByIdAndUpdate(user._id, userUpdates, { new: true });
        }

        res.status(200).json({ success: true, user: updatedUser });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );
};
