// @ts-check
const { checkExact } = require("express-validator");
const { User, EmailAccount } = require("../../models");
const validation = require("../../validation");
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
  app.post(
    "/users",
    ...validation.setup(
      400,
      validation.fields.identityNumber,
      validation.fields.name,
      validation.fields.firstSurname,
      validation.fields.secondSurname,
      validation.fields.photoUrl,
      validation.fields.email,
      validation.fields.role,
      validation.fields.password,
      validation.fields.universityId,
      validation.fields.photoUrlBase64,
      checkExact()
    ),
    async (req, res) => {
      try {
        const {
          identityNumber,
          name,
          firstSurname,
          secondSurname,
          photoUrl,
          email,
          password,
          role,
          universityId,
          photoUrlBase64,
        } = req.body;

        const existingAccount = await EmailAccount.findOne({ email });
        if (existingAccount) {
          return res.status(400).json({ success: false, errorKey: "emailExists" });
        }

        const existingUser = await User.findOne({ identityNumber });
        if (existingUser) {
          return res.status(400).json({ success: false, errorKey: "IDExists" });
        }
        
        let finalPhotoUrl = photoUrl;
          if (photoUrlBase64) {
            const result = await cloudinary.uploader.upload(photoUrlBase64, { folder });
            finalPhotoUrl = result.secure_url;
          }

        // Create User
        const user = new User({
          identityNumber,
          name,
          firstSurname,
          secondSurname,
          photoUrl: finalPhotoUrl,
        });
        await user.save();

        // Create EmailAccount
        const account = new EmailAccount({
          email,
          password: password || undefined,
          role,
          universityId: universityId || undefined,
          userId: user._id,
        });
        await account.save();

        res.status(201).json({ success: true, user, account });
      } catch (err) {
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.get("/users", async (_req, res) => {
    try {
      // Find all users and return the data as a plain JavaScript object
      const users = await User.find().lean();
      res.json({ success: true, users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/users/:id", async (req, res) => {
    try {
      // Find a single user by their ID
      const user = await User.findById(req.params.id).lean();

      // If the user is not found, return a 404 error
      if (!user) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }

      // If the user is found, return their data
      res.json({ success: true, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.put(
    "/users/:id",
    ...validation.setup(
      400,
      validation.fields.identityNumber,
      validation.fields.name,
      validation.fields.firstSurname,
      validation.fields.secondSurname,
      validation.fields.photoUrl,
      validation.fields.email,
      validation.fields.password,
      validation.fields.role,
      validation.fields.universityId,
      validation.fields.photoUrlBase64,
      checkExact()
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        const { photoUrlBase64, photoUrl, ...accountUpdates } = updates;

        const currentAccount = await EmailAccount.findById(id);
        if (!currentAccount) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        const currentUser = await User.findById(currentAccount.userId); 
        if (!currentUser) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }
        /** @type {Object<string, any>} */
        let userUpdates = {};

        // --- Lógica de actualización de imagen (PUT) ---
        const currentPhotoUrl = currentUser?.photoUrl;
        const publicId = getPublicId(currentPhotoUrl || "", folder);

        // Se envía una cadena Base64 nueva 
        if (photoUrlBase64) {
          // Eliminar la foto antigua de Cloudinary si existe
          if (currentPhotoUrl && publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
          // Subir el nuevo Base64
          const result = await cloudinary.uploader.upload(photoUrlBase64, { folder });
          userUpdates.photoUrl = result.secure_url;
        } 
        // Se borra la imagen explícitamente 
        else if (photoUrl === "" && currentPhotoUrl && publicId) {
          await cloudinary.uploader.destroy(publicId);
          userUpdates.photoUrl = null; // Guardar null en la DB
        } 
        // Se envía una URL
        else if (photoUrl !== undefined) { 
          // Si se envía una URL, primero debemos manejar si la anterior era de Cloudinary y si ha cambiado.
          if (currentPhotoUrl && publicId && photoUrl !== currentPhotoUrl) {
              // Si la URL anterior es de Cloudinary y la nueva es diferente, la borramos.
              await cloudinary.uploader.destroy(publicId);
          }
          userUpdates.photoUrl = photoUrl;
        }

        // Update User fields if provided
        const userFieldsToUpdate = ['identityNumber', 'name', 'firstSurname', 'secondSurname'];
        userFieldsToUpdate.forEach(field => {
            if (updates[field] !== undefined) {
                userUpdates[field] = updates[field];
            }
        });
        
        let updatedUser = null;
        if (Object.keys(userUpdates).length > 0) {
           updatedUser = await User.findByIdAndUpdate(
              currentUser._id,
              userUpdates,
              { new: true }
           );
        }

        // Update EmailAccount fields
        const updatedAccount = await EmailAccount.findByIdAndUpdate(
          id,
          {
            email: accountUpdates.email || currentAccount.email,
            password: accountUpdates.password || currentAccount.password,
            role: accountUpdates.role || currentAccount.role,
            universityId: accountUpdates.universityId || currentAccount.universityId,
          },
          { new: true }
        ).populate("userId");

        if (!updatedAccount) {
          return res.status(404).json({ success: false, errorKey: "notFound" });
        }

        // Aseguramos que el usuario devuelto sea el más reciente
        const finalUser = updatedUser ? updatedUser.toObject() : (updatedAccount.userId || currentUser.toObject());

        res.json({ success: true, user: finalUser, account: updatedAccount.toObject() });
      } catch (err) {
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.delete("/users/:id", async (req, res) => {
    try {
      const account = await EmailAccount.findById(req.params.id);
      if (!account) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }

      const userToDelete = await User.findById(account.userId);
      if (!userToDelete) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
      }

      const promises = [
        EmailAccount.deleteMany({ userId: userToDelete._id }).exec(),
        User.findByIdAndDelete(userToDelete._id).exec(),
      ];

      if (userToDelete.photoUrl) {
        const publicId = getPublicId(userToDelete.photoUrl, folder);
        if (publicId) {
          promises.push(cloudinary.uploader.destroy(publicId));
        }
      }

       // Delete the user, its accounts, and the image from Cloudinary
      await Promise.all(promises);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
