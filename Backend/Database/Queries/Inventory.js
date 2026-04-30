import { pool, sql, poolConnect } from "../Client.js";

async function insertInventoryAudit({
  tableName,
  recordId,
  fieldName,
  oldValue = null,
  newValue = null,
  actionType,
  changedBy = "SYSTEM"
}) {
  await pool.request()
    .input("auditType", sql.NVarChar(50), "INVENTORY")
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

/* =========================
   DASHBOARD / FULL STRUCTURE
========================= */

export async function getInventorySummary() {
  await poolConnect;

  const result = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.Inventory_Categories) AS TotalCategories,
      (SELECT COUNT(*) FROM dbo.Inventory_Subcategories) AS TotalSubcategories,
      (SELECT COUNT(*) FROM dbo.Inventory_Assets WHERE IS_ACTIVE = 1) AS ActiveAssets,
      (SELECT COUNT(*) FROM dbo.Inventory_Assets WHERE IS_ACTIVE = 0) AS DecommissionedAssets,
      (SELECT COUNT(*) FROM dbo.Inventory_Assignments WHERE RETURNED_AT IS NULL) AS AssignedAssets
  `);

  return result.recordset[0];
}

export async function getInventoryTree() {
  await poolConnect;

  const categoriesResult = await pool.request().query(`
  SELECT
    Id,
    NAME,
    DESCRIPTION,
    SORT_ORDER,
    IS_ACTIVE,
    CREATED_AT
  FROM dbo.Inventory_Categories
  ORDER BY SORT_ORDER ASC, NAME ASC
`);

  const subcategoriesResult = await pool.request().query(`
    SELECT
      Id,
      CATEGORY_ID,
      NAME,
      DESCRIPTION,
      SORT_ORDER,
      IS_ACTIVE,
      CREATED_AT
    FROM dbo.Inventory_Subcategories
    ORDER BY SORT_ORDER ASC, NAME ASC
  `);

  const assetsResult = await pool.request().query(`
    SELECT
      a.*,
      ia.USER_ID AS ASSIGNED_USER_ID,
      u.DISPLAY_NAME AS ASSIGNED_TO_DISPLAY_NAME,
      u.AD_USERNAME AS ASSIGNED_TO_USERNAME
    FROM dbo.Inventory_Assets a
    LEFT JOIN dbo.Inventory_Assignments ia
      ON ia.ASSET_ID = a.Id
      AND ia.RETURNED_AT IS NULL
    LEFT JOIN dbo.Users_From_LDAP u
      ON u.Id = ia.USER_ID
    ORDER BY a.ASSET_TAG ASC
  `);

  const categories = categoriesResult.recordset.map(c => ({
  id: c.Id,
  name: c.NAME,
  description: c.DESCRIPTION,
  sortOrder: c.SORT_ORDER,
  isActive: c.IS_ACTIVE,
  subcategories: []
}));

  const categoryMap = {};
  categories.forEach(category => {
    categoryMap[category.id] = category;
  });

  const subcategoryMap = {};
  subcategoriesResult.recordset.forEach(sc => {
    const subcategory = {
      id: sc.Id,
      categoryId: sc.CATEGORY_ID,
      name: sc.NAME,
      description: sc.DESCRIPTION,
      sortOrder: sc.SORT_ORDER,
      isActive: sc.IS_ACTIVE,
      assets: []
    };

    subcategoryMap[subcategory.id] = subcategory;

    if (categoryMap[sc.CATEGORY_ID]) {
      categoryMap[sc.CATEGORY_ID].subcategories.push(subcategory);
    }
  });

  assetsResult.recordset.forEach(a => {
    const asset = {
      id: a.Id,
      subcategoryId: a.SUBCATEGORY_ID,
      assetTag: a.ASSET_TAG,
      deviceName: a.DEVICE_NAME,
      serialNumber: a.SERIAL_NUMBER,
      manufacturer: a.MANUFACTURER,
      model: a.MODEL,
      licenseKey: a.LICENSE_KEY,
      licenseType: a.LICENSE_TYPE,
      licenseSeats: a.LICENSE_SEATS,
      licenseUsedSeats: a.LICENSE_USED_SEATS,
      vendor: a.VENDOR,
      renewalDate: a.RENEWAL_DATE,
      expirationDate: a.EXPIRATION_DATE,
      subscriptionId: a.SUBSCRIPTION_ID,
      softwareVersion: a.SOFTWARE_VERSION,
      downloadUrl: a.DOWNLOAD_URL,
      status: a.STATUS,
      condition: a.CONDITION,
      purchaseDate: a.PURCHASE_DATE,
      warrantyEndDate: a.WARRANTY_END_DATE,
      cost: a.COST,
      location: a.LOCATION,
      notes: a.NOTES,
      isActive: a.IS_ACTIVE,
      decommissionedAt: a.DECOMMISSIONED_AT,
      decommissionedBy: a.DECOMMISSIONED_BY,
      decommissionReason: a.DECOMMISSION_REASON,
      assignedUserId: a.ASSIGNED_USER_ID,
      assignedToDisplayName: a.ASSIGNED_TO_DISPLAY_NAME,
      assignedToUsername: a.ASSIGNED_TO_USERNAME
    };

    if (subcategoryMap[a.SUBCATEGORY_ID]) {
      subcategoryMap[a.SUBCATEGORY_ID].assets.push(asset);
    }
  });

  return categories;
}

/* =========================
   CATEGORIES
========================= */

export async function getInventoryCategories() {
  await poolConnect;

  const result = await pool.request().query(`
    SELECT
      Id,
      NAME,
      DESCRIPTION,
      SORT_ORDER,
      IS_ACTIVE,
      CREATED_AT
    FROM dbo.Inventory_Categories
    ORDER BY SORT_ORDER ASC, NAME ASC
  `);

  return result.recordset;
}

export async function createInventoryCategory({
  name,
  description = null,
  sortOrder = 0,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const result = await pool.request()
    .input("name", sql.NVarChar(100), name)
    .input("description", sql.NVarChar(500), description)
    .input("sortOrder", sql.Int, sortOrder)
    .query(`
      INSERT INTO dbo.Inventory_Categories
      (
        NAME,
        DESCRIPTION,
        SORT_ORDER
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @name,
        @description,
        @sortOrder
      )
    `);

  const created = result.recordset[0];

  await insertInventoryAudit({
    tableName: "Inventory_Categories",
    recordId: created.Id,
    fieldName: "CATEGORY",
    oldValue: null,
    newValue: created.NAME,
    actionType: "INSERT",
    changedBy
  });

  return created;
}

export async function updateInventoryCategory({
  id,
  name,
  description = null,
  sortOrder = 0,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.Inventory_Categories WHERE Id = @id`);

  const existing = existingResult.recordset[0];

  if (!existing) {
    throw new Error("Category not found.");
  }

  await pool.request()
    .input("id", sql.Int, id)
    .input("name", sql.NVarChar(100), name)
    .input("description", sql.NVarChar(500), description)
    .input("sortOrder", sql.Int, sortOrder)
    .query(`
      UPDATE dbo.Inventory_Categories
      SET
        NAME = @name,
        DESCRIPTION = @description,
        SORT_ORDER = @sortOrder
      WHERE Id = @id
    `);

  await insertInventoryAudit({
    tableName: "Inventory_Categories",
    recordId: id,
    fieldName: "CATEGORY",
    oldValue: existing.NAME,
    newValue: name,
    actionType: "UPDATE",
    changedBy
  });

  return { updated: true };
}

export async function deleteInventoryCategory(id, changedBy = "SYSTEM") {
  await poolConnect;

  const subcategoryCheck = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT COUNT(*) AS Count
      FROM dbo.Inventory_Subcategories
      WHERE CATEGORY_ID = @id
    `);

  if (subcategoryCheck.recordset[0].Count > 0) {
    throw new Error("Cannot delete category because it still contains subcategories.");
  }

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.Inventory_Categories WHERE Id = @id`);

  const existing = existingResult.recordset[0];
  if (!existing) return 0;

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM dbo.Inventory_Categories WHERE Id = @id`);

  await insertInventoryAudit({
    tableName: "Inventory_Categories",
    recordId: id,
    fieldName: "CATEGORY",
    oldValue: existing.NAME,
    newValue: null,
    actionType: "DELETE",
    changedBy
  });

  return result.rowsAffected[0];
}

/* =========================
   SUBCATEGORIES
========================= */

export async function getInventorySubcategories(categoryId) {
  await poolConnect;

  const result = await pool.request()
    .input("categoryId", sql.Int, categoryId)
    .query(`
      SELECT
        Id,
        CATEGORY_ID,
        NAME,
        DESCRIPTION,
        SORT_ORDER,
        IS_ACTIVE,
        CREATED_AT
      FROM dbo.Inventory_Subcategories
      WHERE CATEGORY_ID = @categoryId
      ORDER BY SORT_ORDER ASC, NAME ASC
    `);

  return result.recordset;
}

export async function createInventorySubcategory({
  categoryId,
  name,
  description = null,
  sortOrder = 0,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const result = await pool.request()
    .input("categoryId", sql.Int, categoryId)
    .input("name", sql.NVarChar(100), name)
    .input("description", sql.NVarChar(500), description)
    .input("sortOrder", sql.Int, sortOrder)
    .query(`
      INSERT INTO dbo.Inventory_Subcategories
      (
        CATEGORY_ID,
        NAME,
        DESCRIPTION,
        SORT_ORDER
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @categoryId,
        @name,
        @description,
        @sortOrder
      )
    `);

  const created = result.recordset[0];

  await insertInventoryAudit({
    tableName: "Inventory_Subcategories",
    recordId: created.Id,
    fieldName: "SUBCATEGORY",
    oldValue: null,
    newValue: created.NAME,
    actionType: "INSERT",
    changedBy
  });

  return created;
}

export async function updateInventorySubcategory({
  id,
  categoryId,
  name,
  description = null,
  sortOrder = 0,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.Inventory_Subcategories WHERE Id = @id`);

  const existing = existingResult.recordset[0];
  if (!existing) throw new Error("Subcategory not found.");

  await pool.request()
    .input("id", sql.Int, id)
    .input("categoryId", sql.Int, categoryId)
    .input("name", sql.NVarChar(100), name)
    .input("description", sql.NVarChar(500), description)
    .input("sortOrder", sql.Int, sortOrder)
    .query(`
      UPDATE dbo.Inventory_Subcategories
      SET
        CATEGORY_ID = @categoryId,
        NAME = @name,
        DESCRIPTION = @description,
        SORT_ORDER = @sortOrder
      WHERE Id = @id
    `);

  await insertInventoryAudit({
    tableName: "Inventory_Subcategories",
    recordId: id,
    fieldName: "SUBCATEGORY",
    oldValue: existing.NAME,
    newValue: name,
    actionType: "UPDATE",
    changedBy
  });

  return { updated: true };
}

export async function deleteInventorySubcategory(id, changedBy = "SYSTEM") {
  await poolConnect;

  const assetCheck = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT COUNT(*) AS Count
      FROM dbo.Inventory_Assets
      WHERE SUBCATEGORY_ID = @id
    `);

  if (assetCheck.recordset[0].Count > 0) {
    throw new Error("Cannot delete subcategory because it still contains assets.");
  }

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.Inventory_Subcategories WHERE Id = @id`);

  const existing = existingResult.recordset[0];
  if (!existing) return 0;

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM dbo.Inventory_Subcategories WHERE Id = @id`);

  await insertInventoryAudit({
    tableName: "Inventory_Subcategories",
    recordId: id,
    fieldName: "SUBCATEGORY",
    oldValue: existing.NAME,
    newValue: null,
    actionType: "DELETE",
    changedBy
  });

  return result.rowsAffected[0];
}

/* =========================
   ASSETS
========================= */

export async function getInventoryAssets(subcategoryId) {
  await poolConnect;

  const result = await pool.request()
    .input("subcategoryId", sql.Int, subcategoryId)
    .query(`
      SELECT
        a.*,
        ia.USER_ID AS ASSIGNED_USER_ID,
        u.DISPLAY_NAME AS ASSIGNED_TO_DISPLAY_NAME,
        u.AD_USERNAME AS ASSIGNED_TO_USERNAME
      FROM dbo.Inventory_Assets a
      LEFT JOIN dbo.Inventory_Assignments ia
        ON ia.ASSET_ID = a.Id
        AND ia.RETURNED_AT IS NULL
      LEFT JOIN dbo.Users_From_LDAP u
        ON u.Id = ia.USER_ID
      WHERE a.SUBCATEGORY_ID = @subcategoryId
      ORDER BY a.ASSET_TAG ASC
    `);

  return result.recordset;
}

export async function createInventoryAsset({
  subcategoryId,
  assetTag,
  deviceName = null,
  serialNumber = null,
  manufacturer = null,
  model = null,
  licenseKey = null,
  licenseType = null,
  licenseSeats = null,
  licenseUsedSeats = null,
  vendor = null,
  renewalDate = null,
  expirationDate = null,
  subscriptionId = null,
  softwareVersion = null,
  downloadUrl = null,
  status = "Available",
  condition = null,
  purchaseDate = null,
  warrantyEndDate = null,
  cost = null,
  location = null,
  notes = null,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const result = await pool.request()
    .input("subcategoryId", sql.Int, subcategoryId)
    .input("assetTag", sql.NVarChar(100), assetTag)
    .input("deviceName", sql.NVarChar(150), deviceName)
    .input("serialNumber", sql.NVarChar(150), serialNumber)
    .input("manufacturer", sql.NVarChar(100), manufacturer)
    .input("model", sql.NVarChar(100), model)
    .input("licenseKey", sql.NVarChar(500), licenseKey)
    .input("licenseType", sql.NVarChar(100), licenseType)
    .input("licenseSeats", sql.Int, licenseSeats)
    .input("licenseUsedSeats", sql.Int, licenseUsedSeats)
    .input("vendor", sql.NVarChar(150), vendor)
    .input("renewalDate", sql.Date, renewalDate)
    .input("expirationDate", sql.Date, expirationDate)
    .input("subscriptionId", sql.NVarChar(150), subscriptionId)
    .input("softwareVersion", sql.NVarChar(100), softwareVersion)
    .input("downloadUrl", sql.NVarChar(500), downloadUrl)
    .input("status", sql.NVarChar(50), status)
    .input("condition", sql.NVarChar(50), condition)
    .input("purchaseDate", sql.Date, purchaseDate)
    .input("warrantyEndDate", sql.Date, warrantyEndDate)
    .input("cost", sql.Decimal(12, 2), cost)
    .input("location", sql.NVarChar(150), location)
    .input("notes", sql.NVarChar(sql.MAX), notes)
    .query(`
      INSERT INTO dbo.Inventory_Assets
      (
        SUBCATEGORY_ID,
        ASSET_TAG,
        DEVICE_NAME,
        SERIAL_NUMBER,
        MANUFACTURER,
        MODEL,
        LICENSE_KEY,
        LICENSE_TYPE,
        LICENSE_SEATS,
        LICENSE_USED_SEATS,
        VENDOR,
        RENEWAL_DATE,
        EXPIRATION_DATE,
        SUBSCRIPTION_ID,
        SOFTWARE_VERSION,
        DOWNLOAD_URL,
        STATUS,
        CONDITION,
        PURCHASE_DATE,
        WARRANTY_END_DATE,
        COST,
        LOCATION,
        NOTES
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @subcategoryId,
        @assetTag,
        @deviceName,
        @serialNumber,
        @manufacturer,
        @model,
        @licenseKey,
        @licenseType,
        @licenseSeats,
        @licenseUsedSeats,
        @vendor,
        @renewalDate,
        @expirationDate,
        @subscriptionId,
        @softwareVersion,
        @downloadUrl,
        @status,
        @condition,
        @purchaseDate,
        @warrantyEndDate,
        @cost,
        @location,
        @notes
      )
    `);

  const created = result.recordset[0];

  await insertInventoryAudit({
    tableName: "Inventory_Assets",
    recordId: created.Id,
    fieldName: "ASSET",
    oldValue: null,
    newValue: created.ASSET_TAG,
    actionType: "INSERT",
    changedBy
  });

  return created;
}

export async function updateInventoryAsset({
  id,
  subcategoryId,
  assetTag,
  deviceName = null,
  serialNumber = null,
  manufacturer = null,
  model = null,
  licenseKey = null,
  licenseType = null,
  licenseSeats = null,
  licenseUsedSeats = null,
  vendor = null,
  renewalDate = null,
  expirationDate = null,
  subscriptionId = null,
  softwareVersion = null,
  downloadUrl = null,
  status = "Available",
  condition = null,
  purchaseDate = null,
  warrantyEndDate = null,
  cost = null,
  location = null,
  notes = null,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.Inventory_Assets WHERE Id = @id`);

  const existing = existingResult.recordset[0];
  if (!existing) throw new Error("Asset not found.");

  await pool.request()
    .input("id", sql.Int, id)
    .input("subcategoryId", sql.Int, subcategoryId)
    .input("assetTag", sql.NVarChar(100), assetTag)
    .input("deviceName", sql.NVarChar(150), deviceName)
    .input("serialNumber", sql.NVarChar(150), serialNumber)
    .input("manufacturer", sql.NVarChar(100), manufacturer)
    .input("model", sql.NVarChar(100), model)
    .input("licenseKey", sql.NVarChar(500), licenseKey)
    .input("licenseType", sql.NVarChar(100), licenseType)
    .input("licenseSeats", sql.Int, licenseSeats)
    .input("licenseUsedSeats", sql.Int, licenseUsedSeats)
    .input("vendor", sql.NVarChar(150), vendor)
    .input("renewalDate", sql.Date, renewalDate)
    .input("expirationDate", sql.Date, expirationDate)
    .input("subscriptionId", sql.NVarChar(150), subscriptionId)
    .input("softwareVersion", sql.NVarChar(100), softwareVersion)
    .input("downloadUrl", sql.NVarChar(500), downloadUrl)
    .input("status", sql.NVarChar(50), status)
    .input("condition", sql.NVarChar(50), condition)
    .input("purchaseDate", sql.Date, purchaseDate)
    .input("warrantyEndDate", sql.Date, warrantyEndDate)
    .input("cost", sql.Decimal(12, 2), cost)
    .input("location", sql.NVarChar(150), location)
    .input("notes", sql.NVarChar(sql.MAX), notes)
    .query(`
      UPDATE dbo.Inventory_Assets
      SET
        SUBCATEGORY_ID = @subcategoryId,
        ASSET_TAG = @assetTag,
        DEVICE_NAME = @deviceName,
        SERIAL_NUMBER = @serialNumber,
        MANUFACTURER = @manufacturer,
        MODEL = @model,
        LICENSE_KEY = @licenseKey,
        LICENSE_TYPE = @licenseType,
        LICENSE_SEATS = @licenseSeats,
        LICENSE_USED_SEATS = @licenseUsedSeats,
        VENDOR = @vendor,
        RENEWAL_DATE = @renewalDate,
        EXPIRATION_DATE = @expirationDate,
        SUBSCRIPTION_ID = @subscriptionId,
        SOFTWARE_VERSION = @softwareVersion,
        DOWNLOAD_URL = @downloadUrl,
        STATUS = @status,
        CONDITION = @condition,
        PURCHASE_DATE = @purchaseDate,
        WARRANTY_END_DATE = @warrantyEndDate,
        COST = @cost,
        LOCATION = @location,
        NOTES = @notes,
        UPDATED_AT = SYSDATETIME()
      WHERE Id = @id
    `);

  await insertInventoryAudit({
    tableName: "Inventory_Assets",
    recordId: id,
    fieldName: "ASSET",
    oldValue: existing.ASSET_TAG,
    newValue: assetTag,
    actionType: "UPDATE",
    changedBy
  });

  return { updated: true };
}

export async function deleteInventoryAsset(id, changedBy = "SYSTEM") {
  await poolConnect;

  const assignmentCheck = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT COUNT(*) AS Count
      FROM dbo.Inventory_Assignments
      WHERE ASSET_ID = @id
    `);

  if (assignmentCheck.recordset[0].Count > 0) {
    throw new Error("Cannot delete asset because it has assignment history. Decommission it instead.");
  }

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.Inventory_Assets WHERE Id = @id`);

  const existing = existingResult.recordset[0];
  if (!existing) return 0;

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM dbo.Inventory_Assets WHERE Id = @id`);

  await insertInventoryAudit({
    tableName: "Inventory_Assets",
    recordId: id,
    fieldName: "ASSET",
    oldValue: existing.ASSET_TAG,
    newValue: null,
    actionType: "DELETE",
    changedBy
  });

  return result.rowsAffected[0];
}

export async function decommissionInventoryAsset({
  id,
  decommissionedBy = "SYSTEM",
  decommissionReason = null
}) {
  await poolConnect;

  await pool.request()
    .input("id", sql.Int, id)
    .input("decommissionedBy", sql.NVarChar(100), decommissionedBy)
    .input("decommissionReason", sql.NVarChar(sql.MAX), decommissionReason)
    .query(`
      UPDATE dbo.Inventory_Assets
      SET
        IS_ACTIVE = 0,
        STATUS = 'Decommissioned',
        DECOMMISSIONED_AT = SYSDATETIME(),
        DECOMMISSIONED_BY = @decommissionedBy,
        DECOMMISSION_REASON = @decommissionReason,
        UPDATED_AT = SYSDATETIME()
      WHERE Id = @id
    `);

  await insertInventoryAudit({
    tableName: "Inventory_Assets",
    recordId: id,
    fieldName: "DECOMMISSIONED",
    oldValue: null,
    newValue: decommissionReason,
    actionType: "UPDATE",
    changedBy: decommissionedBy
  });

  return { updated: true };
}

/* =========================
   USERS / ASSIGNMENTS
========================= */

export async function searchInventoryUsers(search = "") {
  await poolConnect;

  const result = await pool.request()
    .input("search", sql.NVarChar(200), `%${search}%`)
    .query(`
      SELECT TOP 25
        Id,
        AD_USERNAME,
        DISPLAY_NAME,
        EMAIL
      FROM dbo.Users_From_LDAP
      WHERE
        AD_USERNAME LIKE @search
        OR DISPLAY_NAME LIKE @search
        OR EMAIL LIKE @search
      ORDER BY DISPLAY_NAME ASC
    `);

  return result.recordset;
}

export async function assignInventoryAsset({
  assetId,
  userId,
  assignedBy = "SYSTEM",
  notes = null
}) {
  await poolConnect;

  const activeAssignment = await pool.request()
    .input("assetId", sql.Int, assetId)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Inventory_Assignments
      WHERE ASSET_ID = @assetId
        AND RETURNED_AT IS NULL
    `);

  if (activeAssignment.recordset[0]) {
    throw new Error("This asset is already assigned.");
  }

  const result = await pool.request()
    .input("assetId", sql.Int, assetId)
    .input("userId", sql.Int, userId)
    .input("assignedBy", sql.NVarChar(100), assignedBy)
    .input("notes", sql.NVarChar(sql.MAX), notes)
    .query(`
      INSERT INTO dbo.Inventory_Assignments
      (
        ASSET_ID,
        USER_ID,
        ASSIGNED_BY,
        NOTES
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @assetId,
        @userId,
        @assignedBy,
        @notes
      );

      UPDATE dbo.Inventory_Assets
      SET
        STATUS = 'Assigned',
        UPDATED_AT = SYSDATETIME()
      WHERE Id = @assetId;
    `);

  await insertInventoryAudit({
    tableName: "Inventory_Assignments",
    recordId: result.recordset[0].Id,
    fieldName: "ASSIGNMENT",
    oldValue: null,
    newValue: String(userId),
    actionType: "INSERT",
    changedBy: assignedBy
  });

  return result.recordset[0];
}

export async function returnInventoryAsset({
  assetId,
  returnedBy = "SYSTEM",
  notes = null
}) {
  await poolConnect;

  const result = await pool.request()
    .input("assetId", sql.Int, assetId)
    .input("returnedBy", sql.NVarChar(100), returnedBy)
    .input("notes", sql.NVarChar(sql.MAX), notes)
    .query(`
      UPDATE dbo.Inventory_Assignments
      SET
        RETURNED_AT = SYSDATETIME(),
        RETURNED_BY = @returnedBy,
        NOTES = ISNULL(@notes, NOTES)
      OUTPUT INSERTED.*
      WHERE ASSET_ID = @assetId
        AND RETURNED_AT IS NULL;

      UPDATE dbo.Inventory_Assets
      SET
        STATUS = 'Available',
        UPDATED_AT = SYSDATETIME()
      WHERE Id = @assetId;
    `);

  return result.recordset[0];
}