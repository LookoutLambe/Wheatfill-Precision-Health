-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "startTs" DATETIME,
    "endTs" DATETIME,
    "preferredDate" TEXT NOT NULL DEFAULT '',
    "preferredTime" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'patient_request',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("createdAt", "deletedAt", "endTs", "id", "notes", "patientId", "providerId", "source", "startTs", "status", "type", "updatedAt") SELECT "createdAt", "deletedAt", "endTs", "id", "notes", "patientId", "providerId", "source", "startTs", "status", "type", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE INDEX "Appointment_providerId_startTs_idx" ON "Appointment"("providerId", "startTs");
CREATE INDEX "Appointment_patientId_startTs_idx" ON "Appointment"("patientId", "startTs");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
