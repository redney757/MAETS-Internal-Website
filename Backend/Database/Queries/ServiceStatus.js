import { pool, sql, poolConnect } from "../Client.js";

export async function createServiceStatusReport({
  serverName,
  category,
  overallStatus,
  message,
  checks
}) {
  await poolConnect;

  const reportResult = await pool.request()
    .input("serverName", sql.NVarChar(150), serverName)
    .input("category", sql.NVarChar(100), category)
    .input("overallStatus", sql.NVarChar(50), overallStatus)
    .input("message", sql.NVarChar(sql.MAX), message || null)
    .query(`
      INSERT INTO dbo.Service_Status_Reports
      (
        SERVER_NAME,
        CATEGORY,
        OVERALL_STATUS,
        MESSAGE
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @serverName,
        @category,
        @overallStatus,
        @message
      )
    `);

  const report = reportResult.recordset[0];

  for (const check of checks || []) {
    await pool.request()
      .input("reportId", sql.Int, report.Id)
      .input("serverName", sql.NVarChar(150), serverName)
      .input("category", sql.NVarChar(100), category)
      .input("checkName", sql.NVarChar(200), check.name)
      .input("checkType", sql.NVarChar(100), check.type)
      .input("status", sql.NVarChar(50), check.status)
      .input("message", sql.NVarChar(sql.MAX), check.message || null)
      .input("rawValue", sql.NVarChar(sql.MAX), check.rawValue || null)
      .query(`
        INSERT INTO dbo.Service_Status_Checks
        (
          REPORT_ID,
          SERVER_NAME,
          CATEGORY,
          CHECK_NAME,
          CHECK_TYPE,
          STATUS,
          MESSAGE,
          RAW_VALUE
        )
        VALUES
        (
          @reportId,
          @serverName,
          @category,
          @checkName,
          @checkType,
          @status,
          @message,
          @rawValue
        )
      `);
  }

  return report;
}

export async function getLatestServiceStatus() {
  await poolConnect;

  const result = await pool.request().query(`
    WITH LatestChecks AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY SERVER_NAME, CATEGORY, CHECK_NAME
          ORDER BY REPORTED_AT DESC
        ) AS rn
      FROM dbo.Service_Status_Checks
    )
    SELECT
      Id,
      SERVER_NAME,
      CATEGORY,
      CHECK_NAME,
      CHECK_TYPE,
      STATUS,
      MESSAGE,
      RAW_VALUE,
      REPORTED_AT,
      CASE
        WHEN REPORTED_AT < DATEADD(MINUTE, -10, SYSDATETIME())
          THEN 1
        ELSE 0
      END AS IS_STALE
    FROM LatestChecks
    WHERE rn = 1
    ORDER BY CATEGORY, SERVER_NAME, CHECK_NAME
  `);

  return result.recordset;
}