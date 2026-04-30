import { sql, pool, poolConnect } from "../Client.js";

async function insertAudit({
  auditType = "LANDING",
  tableName = "Landing_Quick_Access_Links",
  recordId,
  fieldName,
  oldValue = null,
  newValue = null,
  actionType,
  changedBy = "SYSTEM"
}) {
  await pool.request()
    .input("auditType", sql.NVarChar(50), auditType)
    .input("tableName", sql.NVarChar(128), tableName)
    .input("recordId", sql.NVarChar(50), String(recordId))
    .input("fieldName", sql.NVarChar(128), fieldName)
    .input("oldValue", sql.NVarChar(sql.MAX), oldValue)
    .input("newValue", sql.NVarChar(sql.MAX), newValue)
    .input("actionType", sql.NVarChar(100), actionType)
    .input("changedBy", sql.NVarChar(100), changedBy)
    .query(`
      INSERT INTO dbo.Application_Audit
      (
        AUDIT_TYPE,
        TABLE_NAME,
        RECORD_ID,
        FIELD_NAME,
        OLD_VALUE,
        NEW_VALUE,
        ACTION_TYPE,
        CHANGED_BY
      )
      VALUES
      (
        @auditType,
        @tableName,
        @recordId,
        @fieldName,
        @oldValue,
        @newValue,
        @actionType,
        @changedBy
      )
    `);
}

export async function getQuickAccessLinks() {
  await poolConnect;

  const result = await pool.request().query(`
    SELECT
      Id,
      TITLE,
      SUBTITLE,
      URL,
      IMAGE_URL,
      SORT_ORDER,
      CREATED_BY,
      UPLOADED_AT
    FROM dbo.Landing_Quick_Access_Links
    ORDER BY SORT_ORDER ASC, Id ASC
  `);

  return result.recordset.map(row => ({
    id: row.Id,
    title: row.TITLE,
    subtitle: row.SUBTITLE,
    url: row.URL,
    imageUrl: row.IMAGE_URL || `/api/landing/quick-access/${row.Id}/image`,
    sortOrder: row.SORT_ORDER,
    createdBy: row.CREATED_BY,
    uploadedAt: row.UPLOADED_AT
  }));
}

export async function createQuickAccessLink({
  title,
  subtitle,
  url,
  imageUrl,
  file,
  createdBy = "SYSTEM"
}) {
  await poolConnect;

  const result = await pool.request()
    .input("title", sql.NVarChar(100), title)
    .input("subtitle", sql.NVarChar(150), subtitle)
    .input("url", sql.NVarChar(1000), url)
    .input("imageUrl", sql.NVarChar(sql.MAX), imageUrl || null)
    .input("imageData", sql.VarBinary(sql.MAX), file?.buffer || null)
    .input("imageMimeType", sql.NVarChar(100), file?.mimetype || null)
    .input("imageFileName", sql.NVarChar(255), file?.originalname || null)
    .input("createdBy", sql.NVarChar(50), createdBy)
    .query(`
      INSERT INTO dbo.Landing_Quick_Access_Links
      (
        TITLE,
        SUBTITLE,
        URL,
        IMAGE_URL,
        IMAGE_DATA,
        IMAGE_MIME_TYPE,
        IMAGE_FILE_NAME,
        CREATED_BY
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @title,
        @subtitle,
        @url,
        @imageUrl,
        @imageData,
        @imageMimeType,
        @imageFileName,
        @createdBy
      )
    `);

  const created = result.recordset[0];

  await insertAudit({
    recordId: created.Id,
    fieldName: "QUICK_ACCESS_LINK",
    oldValue: null,
    newValue: `${created.TITLE} | ${created.URL}`,
    actionType: "INSERT",
    changedBy: createdBy
  });

  return created;
}

export async function getQuickAccessImage(id) {
  await poolConnect;

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT
        IMAGE_DATA,
        IMAGE_MIME_TYPE
      FROM dbo.Landing_Quick_Access_Links
      WHERE Id = @id
    `);

  return result.recordset[0] || null;
}

export async function deleteQuickAccessLink(id, changedBy = "SYSTEM") {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Landing_Quick_Access_Links
      WHERE Id = @id
    `);

  const existing = existingResult.recordset[0];

  if (!existing) {
    return 0;
  }

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      DELETE FROM dbo.Landing_Quick_Access_Links
      WHERE Id = @id
    `);

  if (result.rowsAffected[0] > 0) {
    await insertAudit({
      recordId: id,
      fieldName: "QUICK_ACCESS_LINK",
      oldValue: `${existing.TITLE} | ${existing.URL}`,
      newValue: null,
      actionType: "DELETE",
      changedBy
    });
  }

  return result.rowsAffected[0];
}

export async function updateQuickAccessLink({
  id,
  title,
  subtitle,
  url,
  imageUrl,
  file,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Landing_Quick_Access_Links
      WHERE Id = @id
    `);

  const existing = existingResult.recordset[0];

  if (!existing) {
    throw new Error("Quick access link not found.");
  }

  const changes = [];

  function addChange(fieldName, oldValue, newValue) {
    const oldText = oldValue ?? "";
    const newText = newValue ?? "";

    if (oldText !== newText) {
      changes.push({
        fieldName,
        oldValue: oldText,
        newValue: newText
      });
    }
  }

  addChange("TITLE", existing.TITLE, title);
  addChange("SUBTITLE", existing.SUBTITLE, subtitle);
  addChange("URL", existing.URL, url);
  addChange("IMAGE_URL", existing.IMAGE_URL, imageUrl || null);

  if (file?.buffer) {
    changes.push({
      fieldName: "IMAGE_FILE",
      oldValue: existing.IMAGE_FILE_NAME || "[EXISTING IMAGE]",
      newValue: file.originalname || "[NEW IMAGE]"
    });
  }

  if (changes.length === 0) {
    return {
      updated: false,
      changedFields: []
    };
  }

  await pool.request()
    .input("id", sql.Int, id)
    .input("title", sql.NVarChar(100), title)
    .input("subtitle", sql.NVarChar(150), subtitle)
    .input("url", sql.NVarChar(1000), url)
    .input("imageUrl", sql.NVarChar(sql.MAX), imageUrl || null)
    .input("imageData", sql.VarBinary(sql.MAX), file?.buffer || null)
    .input("imageMimeType", sql.NVarChar(100), file?.mimetype || null)
    .input("imageFileName", sql.NVarChar(255), file?.originalname || null)
    .query(`
      UPDATE dbo.Landing_Quick_Access_Links
      SET
        TITLE = @title,
        SUBTITLE = @subtitle,
        URL = @url,
        IMAGE_URL = @imageUrl,
        IMAGE_DATA = COALESCE(@imageData, IMAGE_DATA),
        IMAGE_MIME_TYPE = COALESCE(@imageMimeType, IMAGE_MIME_TYPE),
        IMAGE_FILE_NAME = COALESCE(@imageFileName, IMAGE_FILE_NAME)
      WHERE Id = @id
    `);

  for (const change of changes) {
    await insertAudit({
      recordId: id,
      fieldName: change.fieldName,
      oldValue: change.oldValue,
      newValue: change.newValue,
      actionType: "UPDATE",
      changedBy
    });
  }

  return {
    updated: true,
    changedFields: changes.map(change => change.fieldName)
  };
}