import { sql, pool, poolConnect } from "../Client.js";

/**
 * AUDIT
 */
async function insertAudit({
  auditType = "FAQ",
  tableName,
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

/**
 * GET FULL FAQ STRUCTURE
 */
export async function getFAQs() {
  await poolConnect;

  const categoriesResult = await pool.request().query(`
    SELECT Id, NAME, DESCRIPTION, SORT_ORDER
    FROM dbo.FAQ_Categories
    ORDER BY SORT_ORDER ASC, Id ASC
  `);

  const questionsResult = await pool.request().query(`
    SELECT Id, CATEGORY_ID, QUESTION, ANSWER, SORT_ORDER
    FROM dbo.FAQ_Questions
    ORDER BY SORT_ORDER ASC, Id ASC
  `);

  const stepsResult = await pool.request().query(`
    SELECT Id, FAQ_ID, STEP_NUMBER, STEP_TITLE, STEP_BODY
    FROM dbo.FAQ_Steps
    ORDER BY STEP_NUMBER ASC
  `);

  const imagesResult = await pool.request().query(`
    SELECT Id, STEP_ID, IMAGE_URL, IMAGE_FILE_NAME, IMAGE_MIME_TYPE, CAPTION, SORT_ORDER
    FROM dbo.FAQ_Step_Images
    ORDER BY SORT_ORDER ASC, Id ASC
  `);

  const categories = categoriesResult.recordset.map(c => ({
    categoryId: c.Id,
    categoryName: c.NAME,
    description: c.DESCRIPTION,
    sortOrder: c.SORT_ORDER,
    questions: []
  }));

  const categoryMap = {};
  categories.forEach(c => {
    categoryMap[c.categoryId] = c;
  });

  const stepsMap = {};
  stepsResult.recordset.forEach(step => {
    stepsMap[step.Id] = {
      id: step.Id,
      faqId: step.FAQ_ID,
      stepNumber: step.STEP_NUMBER,
      stepTitle: step.STEP_TITLE,
      stepBody: step.STEP_BODY,
      images: []
    };
  });

  imagesResult.recordset.forEach(img => {
    if (stepsMap[img.STEP_ID]) {
      stepsMap[img.STEP_ID].images.push({
        id: img.Id,
        stepId: img.STEP_ID,
        imageUrl: img.IMAGE_URL,
        imageFileName: img.IMAGE_FILE_NAME,
        imageMimeType: img.IMAGE_MIME_TYPE,
        caption: img.CAPTION,
        sortOrder: img.SORT_ORDER
      });
    }
  });

  const faqStepsMap = {};
  stepsResult.recordset.forEach(step => {
    if (!faqStepsMap[step.FAQ_ID]) {
      faqStepsMap[step.FAQ_ID] = [];
    }

    faqStepsMap[step.FAQ_ID].push(stepsMap[step.Id]);
  });

  questionsResult.recordset.forEach(q => {
    const questionObj = {
      id: q.Id,
      categoryId: q.CATEGORY_ID,
      question: q.QUESTION,
      answer: q.ANSWER,
      sortOrder: q.SORT_ORDER,
      steps: faqStepsMap[q.Id] || []
    };

    if (categoryMap[q.CATEGORY_ID]) {
      categoryMap[q.CATEGORY_ID].questions.push(questionObj);
    }
  });

  return categories;
}

/**
 * CATEGORY CRUD
 */
export async function createFAQCategory({
  name,
  description = null,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const result = await pool.request()
    .input("name", sql.NVarChar(100), name)
    .input("description", sql.NVarChar(500), description)
    .query(`
      INSERT INTO dbo.FAQ_Categories
      (
        NAME,
        DESCRIPTION
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @name,
        @description
      )
    `);

  const created = result.recordset[0];

  await insertAudit({
    tableName: "FAQ_Categories",
    recordId: created.Id,
    fieldName: "CATEGORY",
    oldValue: null,
    newValue: created.NAME,
    actionType: "INSERT",
    changedBy
  });

  return {
    categoryId: created.Id,
    categoryName: created.NAME,
    description: created.DESCRIPTION,
    sortOrder: created.SORT_ORDER
  };
}

export async function updateFAQCategory({
  id,
  name,
  description = null,
  sortOrder = 0,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.FAQ_Categories WHERE Id = @id`);

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
      UPDATE dbo.FAQ_Categories
      SET
        NAME = @name,
        DESCRIPTION = @description,
        SORT_ORDER = @sortOrder
      WHERE Id = @id
    `);

  await insertAudit({
    tableName: "FAQ_Categories",
    recordId: id,
    fieldName: "CATEGORY",
    oldValue: existing.NAME,
    newValue: name,
    actionType: "UPDATE",
    changedBy
  });

  return { updated: true };
}

export async function deleteFAQCategory(id, changedBy = "SYSTEM") {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.FAQ_Categories WHERE Id = @id`);

  const existing = existingResult.recordset[0];

  if (!existing) {
    return 0;
  }

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM dbo.FAQ_Categories WHERE Id = @id`);

  await insertAudit({
    tableName: "FAQ_Categories",
    recordId: id,
    fieldName: "CATEGORY",
    oldValue: existing.NAME,
    newValue: null,
    actionType: "DELETE",
    changedBy
  });

  return result.rowsAffected[0];
}

/**
 * FAQ QUESTION CRUD
 */
export async function createFAQ({
  categoryId,
  question,
  answer,
  createdBy = "SYSTEM"
}) {
  await poolConnect;

  const result = await pool.request()
    .input("categoryId", sql.Int, categoryId)
    .input("question", sql.NVarChar(500), question)
    .input("answer", sql.NVarChar(sql.MAX), answer || null)
    .input("createdBy", sql.NVarChar(100), createdBy)
    .query(`
      INSERT INTO dbo.FAQ_Questions
      (
        CATEGORY_ID,
        QUESTION,
        ANSWER,
        CREATED_BY
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @categoryId,
        @question,
        @answer,
        @createdBy
      )
    `);

  const created = result.recordset[0];

  await insertAudit({
    tableName: "FAQ_Questions",
    recordId: created.Id,
    fieldName: "FAQ",
    oldValue: null,
    newValue: created.QUESTION,
    actionType: "INSERT",
    changedBy: createdBy
  });

  return {
    id: created.Id,
    categoryId: created.CATEGORY_ID,
    question: created.QUESTION,
    answer: created.ANSWER
  };
}

export async function updateFAQ({
  id,
  question,
  answer,
  categoryId,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.FAQ_Questions WHERE Id = @id`);

  const existing = existingResult.recordset[0];

  if (!existing) {
    throw new Error("FAQ not found.");
  }

  await pool.request()
    .input("id", sql.Int, id)
    .input("question", sql.NVarChar(500), question)
    .input("answer", sql.NVarChar(sql.MAX), answer || null)
    .input("categoryId", sql.Int, categoryId)
    .input("changedBy", sql.NVarChar(100), changedBy)
    .query(`
      UPDATE dbo.FAQ_Questions
      SET
        QUESTION = @question,
        ANSWER = @answer,
        CATEGORY_ID = @categoryId,
        UPDATED_AT = SYSDATETIME(),
        UPDATED_BY = @changedBy
      WHERE Id = @id
    `);

  await insertAudit({
    tableName: "FAQ_Questions",
    recordId: id,
    fieldName: "FAQ",
    oldValue: existing.QUESTION,
    newValue: question,
    actionType: "UPDATE",
    changedBy
  });

  return { updated: true };
}

export async function deleteFAQ(id, changedBy = "SYSTEM") {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.FAQ_Questions WHERE Id = @id`);

  const existing = existingResult.recordset[0];

  if (!existing) {
    return 0;
  }

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM dbo.FAQ_Questions WHERE Id = @id`);

  await insertAudit({
    tableName: "FAQ_Questions",
    recordId: id,
    fieldName: "FAQ",
    oldValue: existing.QUESTION,
    newValue: null,
    actionType: "DELETE",
    changedBy
  });

  return result.rowsAffected[0];
}

/**
 * STEP CRUD
 */
export async function createFAQStep({
  faqId,
  stepNumber,
  stepTitle = null,
  stepBody,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const result = await pool.request()
    .input("faqId", sql.Int, faqId)
    .input("stepNumber", sql.Int, stepNumber)
    .input("stepTitle", sql.NVarChar(200), stepTitle)
    .input("stepBody", sql.NVarChar(sql.MAX), stepBody)
    .query(`
      INSERT INTO dbo.FAQ_Steps
      (
        FAQ_ID,
        STEP_NUMBER,
        STEP_TITLE,
        STEP_BODY
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @faqId,
        @stepNumber,
        @stepTitle,
        @stepBody
      )
    `);

  const created = result.recordset[0];

  await insertAudit({
    tableName: "FAQ_Steps",
    recordId: created.Id,
    fieldName: "STEP",
    oldValue: null,
    newValue: created.STEP_BODY,
    actionType: "INSERT",
    changedBy
  });

  return {
    id: created.Id,
    faqId: created.FAQ_ID,
    stepNumber: created.STEP_NUMBER,
    stepTitle: created.STEP_TITLE,
    stepBody: created.STEP_BODY,
    images: []
  };
}

export async function updateFAQStep({
  id,
  stepNumber,
  stepTitle = null,
  stepBody,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.FAQ_Steps WHERE Id = @id`);

  const existing = existingResult.recordset[0];

  if (!existing) {
    throw new Error("Step not found.");
  }

  await pool.request()
    .input("id", sql.Int, id)
    .input("stepNumber", sql.Int, stepNumber)
    .input("stepTitle", sql.NVarChar(200), stepTitle)
    .input("stepBody", sql.NVarChar(sql.MAX), stepBody)
    .query(`
      UPDATE dbo.FAQ_Steps
      SET
        STEP_NUMBER = @stepNumber,
        STEP_TITLE = @stepTitle,
        STEP_BODY = @stepBody
      WHERE Id = @id
    `);

  await insertAudit({
    tableName: "FAQ_Steps",
    recordId: id,
    fieldName: "STEP",
    oldValue: existing.STEP_BODY,
    newValue: stepBody,
    actionType: "UPDATE",
    changedBy
  });

  return { updated: true };
}

export async function deleteFAQStep(id, changedBy = "SYSTEM") {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.FAQ_Steps WHERE Id = @id`);

  const existing = existingResult.recordset[0];

  if (!existing) {
    return 0;
  }

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM dbo.FAQ_Steps WHERE Id = @id`);

  await insertAudit({
    tableName: "FAQ_Steps",
    recordId: id,
    fieldName: "STEP",
    oldValue: existing.STEP_BODY,
    newValue: null,
    actionType: "DELETE",
    changedBy
  });

  return result.rowsAffected[0];
}

/**
 * STEP IMAGE CRUD
 */
export async function createFAQStepImage({
  stepId,
  imageUrl = null,
  file = null,
  caption = null,
  uploadedBy = "SYSTEM"
}) {
  await poolConnect;

  const result = await pool.request()
    .input("stepId", sql.Int, stepId)
    .input("imageUrl", sql.NVarChar(sql.MAX), imageUrl)
    .input("imageData", sql.VarBinary(sql.MAX), file?.buffer || null)
    .input("imageFileName", sql.NVarChar(255), file?.originalname || null)
    .input("imageMimeType", sql.NVarChar(100), file?.mimetype || null)
    .input("caption", sql.NVarChar(300), caption)
    .input("uploadedBy", sql.NVarChar(100), uploadedBy)
    .query(`
      INSERT INTO dbo.FAQ_Step_Images
      (
        STEP_ID,
        IMAGE_URL,
        IMAGE_DATA,
        IMAGE_FILE_NAME,
        IMAGE_MIME_TYPE,
        CAPTION,
        UPLOADED_BY
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @stepId,
        @imageUrl,
        @imageData,
        @imageFileName,
        @imageMimeType,
        @caption,
        @uploadedBy
      )
    `);

  const created = result.recordset[0];

  await insertAudit({
    tableName: "FAQ_Step_Images",
    recordId: created.Id,
    fieldName: "IMAGE",
    oldValue: null,
    newValue: created.IMAGE_URL || created.IMAGE_FILE_NAME,
    actionType: "INSERT",
    changedBy: uploadedBy
  });

  return {
    id: created.Id,
    stepId: created.STEP_ID,
    imageUrl: created.IMAGE_URL,
    caption: created.CAPTION
  };
}

export async function updateFAQStepImage({
  id,
  imageUrl = null,
  file = null,
  caption = null,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.FAQ_Step_Images WHERE Id = @id`);

  const existing = existingResult.recordset[0];

  if (!existing) {
    throw new Error("Image not found.");
  }

  await pool.request()
    .input("id", sql.Int, id)
    .input("imageUrl", sql.NVarChar(sql.MAX), imageUrl)
    .input("imageData", sql.VarBinary(sql.MAX), file?.buffer || existing.IMAGE_DATA)
    .input("imageFileName", sql.NVarChar(255), file?.originalname || existing.IMAGE_FILE_NAME)
    .input("imageMimeType", sql.NVarChar(100), file?.mimetype || existing.IMAGE_MIME_TYPE)
    .input("caption", sql.NVarChar(300), caption)
    .query(`
      UPDATE dbo.FAQ_Step_Images
      SET
        IMAGE_URL = @imageUrl,
        IMAGE_DATA = @imageData,
        IMAGE_FILE_NAME = @imageFileName,
        IMAGE_MIME_TYPE = @imageMimeType,
        CAPTION = @caption
      WHERE Id = @id
    `);

  await insertAudit({
    tableName: "FAQ_Step_Images",
    recordId: id,
    fieldName: "IMAGE",
    oldValue: existing.IMAGE_URL || existing.IMAGE_FILE_NAME,
    newValue: imageUrl || file?.originalname || existing.IMAGE_FILE_NAME,
    actionType: "UPDATE",
    changedBy
  });

  return { updated: true };
}

export async function deleteFAQStepImage(id, changedBy = "SYSTEM") {
  await poolConnect;

  const existingResult = await pool.request()
    .input("id", sql.Int, id)
    .query(`SELECT TOP 1 * FROM dbo.FAQ_Step_Images WHERE Id = @id`);

  const existing = existingResult.recordset[0];

  if (!existing) {
    return 0;
  }

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM dbo.FAQ_Step_Images WHERE Id = @id`);

  await insertAudit({
    tableName: "FAQ_Step_Images",
    recordId: id,
    fieldName: "IMAGE",
    oldValue: existing.IMAGE_URL || existing.IMAGE_FILE_NAME,
    newValue: null,
    actionType: "DELETE",
    changedBy
  });

  return result.rowsAffected[0];
}

export async function getFAQStepImage(id) {
  await poolConnect;

  const result = await pool.request()
    .input("id", sql.Int, id)
    .query(`
      SELECT TOP 1 IMAGE_DATA, IMAGE_MIME_TYPE
      FROM dbo.FAQ_Step_Images
      WHERE Id = @id
    `);

  return result.recordset[0];
}