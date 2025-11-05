// @ts-check
const { checkExact } = require("express-validator");
const { University } = require("../models");
const validation = require("../validation");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");

const AUTH_URL = process.env.AUTH_URL || "http://localhost:8001";
const folder = "unigrader_universities";

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
    "/universities",
    ...validation.setup(
      400,
      validation.fields.name,
      validation.fields.smallLogoUrl,
      validation.fields.largeLogoUrl,
      validation.fields.address,
      validation.fields.contactEmail,
      validation.fields.contactPhone,
      validation.fields.user,
      validation.fields.smallLogoBase64, 
      validation.fields.largeLogoBase64,
      checkExact()
    ),
    async (req, res) => {
      try {
        const newUniversityData = req.body;
        const { smallLogoBase64, largeLogoBase64 } = newUniversityData;

        const universityExists = await University.findOne({name: newUniversityData.name});
        if (universityExists) return res.status(400).json({ success: false, errorKey: "universityExists" });

        // Subir y obtener URL del smallLogo
        if (smallLogoBase64) {
          const result = await cloudinary.uploader.upload(smallLogoBase64, { folder });
          newUniversityData.smallLogoUrl = result.secure_url;

          delete newUniversityData.smallLogoBase64; 
        }
        
        // Subir y obtener URL del largeLogo
        if (largeLogoBase64) {
          const result = await cloudinary.uploader.upload(largeLogoBase64, { folder });
          newUniversityData.largeLogoUrl = result.secure_url;
          delete newUniversityData.largeLogoBase64; 
        }

        const university = new University(newUniversityData);
        await university.save();
        res.status(201).json({ success: true, university });
      } catch (err) {
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.get("/universities", async (_req, res) => {
    try {
      const universities = await University.find().lean();
      res.json({ success: true, universities });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });

  app.get("/universities/:id", async (req, res) => {
    try {
        const university = await University.findById(req.params.id).lean();
        if (!university) {
        return res.status(404).json({ success: false, errorKey: "notFound" });
        }
        res.json({ success: true, university });
    } catch (err) {
        res.status(500).json({ success: false, errorKey: "serverError" });
    }
 });

  app.put(
    "/universities/:id",
    ...validation.setup(
      400,
      validation.fields.name,
      validation.fields.smallLogoUrl,
      validation.fields.largeLogoUrl,
      validation.fields.smallLogoBase64, 
      validation.fields.largeLogoBase64,
      validation.fields.address,
      validation.fields.contactEmail,
      validation.fields.contactPhone,
      validation.fields.user,
      validation.fields.createdAt,
      validation.fields.updatedAt,
      validation.fields.id,
      validation.fields.v,
      checkExact()
    ),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        const currentUniversity = await University.findById(id);
        if (!currentUniversity) return res.status(404).json({ success: false, errorKey: "notFound" });

        const universityExists = await University.findOne({ 
          name: updates.name, 
          _id: { $ne: id }
        });
        if (universityExists) return res.status(400).json({ success: false, errorKey: "universityExists" });

        /**
         * @param {string | undefined} base64Data La cadena Base64 del cuerpo de la solicitud.
         * @param {string} currentUrlKey La clave para la URL actual en la DB ('smallLogoUrl' o 'largeLogoUrl').
         * @param {string} base64Key La clave de la propiedad Base64 en el objeto updates.
         */
         const handleLogoUpdate = async (base64Data, currentUrlKey, base64Key) => {
          // @ts-ignore
          const currentUrl = currentUniversity[currentUrlKey];
          const newUrlValue = updates[currentUrlKey]; 

          const publicId = getPublicId(currentUrl, folder);

          // Se envía una cadena Base64 nueva
          if (base64Data) {
            // Eliminar el logo antiguo de Cloudinary si existe
            if (currentUrl && publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
            // Subir el nuevo Base64
            const result = await cloudinary.uploader.upload(base64Data, { folder });
            updates[currentUrlKey] = result.secure_url;
          } 
          // Se borra la imagen explícitamente desde el frontend 
          else if (newUrlValue === "" && currentUrl && publicId) {
            await cloudinary.uploader.destroy(publicId);
            updates[currentUrlKey] = null; 
          } 
          // No se envía Base64 ni se modifica la URL en el body
          else if (!newUrlValue) {
              // Eliminar la propiedad URL del body para que no se sobreescriba con undefined si no se tocó.
              delete updates[currentUrlKey];
          }

          // Siempre eliminar el campo Base64 del objeto updates antes de guardarlo en la DB
          delete updates[base64Key];
         };

        await handleLogoUpdate(updates.smallLogoBase64, 'smallLogoUrl', 'smallLogoBase64');
        await handleLogoUpdate(updates.largeLogoBase64, 'largeLogoUrl', 'largeLogoBase64');

        const updated = await University.findByIdAndUpdate(
          id,
          updates,
          { new: true }
        );
        res.json({ success: true, university: updated });
      } catch (err) {
        res.status(500).json({ success: false, errorKey: "serverError" });
      }
    }
  );

  app.delete("/universities/:id", async (req, res) => {
    try {
      const university = await University.findById(req.params.id);

      if (!university) return res.status(404).json({ success: false, errorKey: "notFound" });

      try {
        const accountsRes = await axios.get(`${AUTH_URL}/public/accounts`);
        const linkedAccounts = (accountsRes.data.accounts || []).filter(
          // @ts-ignore
          (acc) => String(acc.universityId) === String(req.params.id)
        );

        if (linkedAccounts.length > 0) {
          return res.status(400).json({
            success: false,
            errorKey: "accountsExist",
          });
        }
      } catch (err) {
        console.error("Failed to fetch accounts from auth service:", err);
        return res.status(500).json({ success: false, errorKey: "serverError" });
      }

      // Borrar el logo pequeño de Cloudinary
      if (university.smallLogoUrl) {
        const publicSmallId = getPublicId(university.smallLogoUrl, folder)
        if (publicSmallId) {
          await cloudinary.uploader.destroy(publicSmallId);
        }
      }

      // Borrar el logo grande de Cloudinary
      if (university.largeLogoUrl) {
        const publicLargeId = getPublicId(university.largeLogoUrl, folder)
        if (publicLargeId) {
          await cloudinary.uploader.destroy(publicLargeId);
        }
      }

      await University.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};
