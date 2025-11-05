// @ts-check
const { checkExact } = require("express-validator");
const { EvaluationItem } = require("../models");
const validation = require("../validation");

/**
 * @param {import("express").Router} app
 */
module.exports = (app) => {

   // Synchronize Evaluation Items for a group
   app.put(
    "/evaluation-items/sync/:groupId",
    ...validation.setup(
        400,
        validation.fields.evaluationItem,
        validation.fields.evaluationItemId,
        validation.fields.evaluationItemName,
        validation.fields.evaluationItemType,
        validation.fields.evaluationItemWeight,
        validation.fields.evaluationItemMinGrade,
        validation.fields.evaluationItemSystem,
        validation.fields.id,
        validation.fields.v,
        validation.fields.createdAt,
        validation.fields.updatedAt,
        validation.fields.user,
        checkExact()
    ),
    // @ts-ignore
    async (req, res) => {
        try {
            const { groupId } = req.params;
            /**
             * @type {{ _id?: string, evaluationSystemId: string, evaluationTypeId: string, name: string, weight: number, minGrade?: number }[]}
             */
            const items = req.body.items;

            // Obtener items actuales del grupo
            const existingItems = await EvaluationItem.find({ groupId }).lean();

            const existingIds = existingItems.map(i => i._id.toString());
            const payloadIds = items.filter(i => i._id).map(i => i._id?.toString());

            // Identificar items que se eliminarán
            const toDelete = existingItems
                .filter(i => !payloadIds.includes(i._id.toString()))
                .map(i => i._id.toString());

            // Construir mapa de items existentes sin los que se borrarán
            const existingMap = new Map();
            existingItems.forEach(i => {
                if (!toDelete.includes(i._id.toString())) {
                    existingMap.set(`${i.name}-${i.evaluationTypeId}`, i._id.toString());
                }
            });

            // Validar unicidad del payload antes de aplicar cambios
            for (const i of items) {
                const key = `${i.name}-${i.evaluationTypeId}`;
                // Conflicto si existe en base de datos y no es el mismo ID
                if (existingMap.has(key) && (!i._id || existingMap.get(key) !== i._id)) {
                    return res.status(400).json({
                        success: false,
                        errorKey: "evaluationItemExists",
                    });
                }
                // Añadir al mapa para evitar duplicados entre items nuevos del payload
                existingMap.set(key, i._id ?? "new");
            }

            // Calcular qué crear y qué actualizar
            const toCreate = items.filter(i => !i._id);
            const toUpdate = items.filter(i => i._id && existingIds.includes(i._id));

            // Eliminar los que sobran
            await EvaluationItem.deleteMany({ _id: { $in: toDelete } });

            // Actualizar existentes
            const updated = [];
            for (const item of toUpdate) {
                const updatedItem = await EvaluationItem.findByIdAndUpdate(
                item._id,
                {
                    $set: {
                    name: item.name,
                    evaluationTypeId: item.evaluationTypeId,
                    weight: item.weight,
                    minGrade: item.minGrade ?? null,
                    },
                },
                { new: true }
                );
                if (updatedItem) updated.push(updatedItem);
            }

            // Crear nuevos
            const created = await EvaluationItem.insertMany(
                toCreate.map(i => ({ ...i, groupId })), 
                { ordered: false }
        ).catch(err => {
            if (err.writeErrors) return err.insertedDocs ?? [];
                throw err;
        });

        const finalItems = await EvaluationItem.find({ groupId }).lean();

        res.json({
            success: true,
            createdCount: created.length,
            updatedCount: updated.length,
            deletedCount: toDelete.length,
            items: finalItems,
        });

        } catch (err) {
            console.error("Error syncing evaluation items:", err);
            res.status(500).json({ success: false, errorKey: "serverError" });
        }
    }
  );

  app.get("/evaluation-items/by-group/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;

      const items = await EvaluationItem.find({ groupId }).lean();
      res.json({ success: true, items });
    } catch (err) {
      console.error("Error fetching evaluation items:", err);
      res.status(500).json({ success: false, errorKey: "serverError" });
    }
  });
};