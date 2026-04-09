-- ============================================================
-- Recipe Management System — Full Database Schema
-- Run this on your EC2 MySQL instance
-- ============================================================

CREATE DATABASE IF NOT EXISTS recipe_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE recipe_management;

-- ── clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id           CHAR(36)      NOT NULL DEFAULT (UUID()),
  name         VARCHAR(255)  NOT NULL,
  adminEmail   VARCHAR(255)  NOT NULL UNIQUE,
  passwordHash VARCHAR(255)  NOT NULL,
  isActive     TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── companies ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id        CHAR(36)      NOT NULL DEFAULT (UUID()),
  name      VARCHAR(255)  NOT NULL,
  code      VARCHAR(50)   NOT NULL UNIQUE,
  clientId  CHAR(36)      NOT NULL,
  isActive  TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_companies_clientId (clientId),
  CONSTRAINT fk_companies_client FOREIGN KEY (clientId) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── warehouses ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
  id        CHAR(36)      NOT NULL DEFAULT (UUID()),
  name      VARCHAR(255)  NOT NULL,
  code      VARCHAR(50)   NOT NULL UNIQUE,
  address   TEXT          NULL,
  isActive  TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           CHAR(36)      NOT NULL DEFAULT (UUID()),
  name         VARCHAR(255)  NOT NULL,
  email        VARCHAR(255)  NOT NULL UNIQUE,
  passwordHash VARCHAR(255)  NOT NULL,
  role         VARCHAR(50)   NOT NULL DEFAULT 'KITCHEN_MANAGER',
  isActive     TINYINT(1)    NOT NULL DEFAULT 1,
  companyId    CHAR(36)      NULL,
  clientId     CHAR(36)      NULL,
  kitchenId    CHAR(36)      NULL,
  createdAt    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_users_companyId (companyId),
  KEY idx_users_clientId (clientId),
  CONSTRAINT fk_users_company FOREIGN KEY (companyId) REFERENCES companies (id) ON DELETE SET NULL,
  CONSTRAINT fk_users_client  FOREIGN KEY (clientId)  REFERENCES clients   (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── kitchens ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kitchens (
  id        CHAR(36)      NOT NULL DEFAULT (UUID()),
  name      VARCHAR(255)  NOT NULL,
  address   TEXT          NULL,
  companyId CHAR(36)      NOT NULL,
  clientId  CHAR(36)      NOT NULL,
  isActive  TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_kitchens_companyId (companyId),
  CONSTRAINT fk_kitchens_company FOREIGN KEY (companyId) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── stores ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id        CHAR(36)      NOT NULL DEFAULT (UUID()),
  name      VARCHAR(255)  NOT NULL,
  code      VARCHAR(50)   NOT NULL,
  kitchenId CHAR(36)      NOT NULL,
  companyId CHAR(36)      NOT NULL,
  clientId  CHAR(36)      NOT NULL,
  isActive  TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stores_kitchenId (kitchenId),
  KEY idx_stores_companyId (companyId),
  CONSTRAINT fk_stores_kitchen FOREIGN KEY (kitchenId) REFERENCES kitchens  (id) ON DELETE CASCADE,
  CONSTRAINT fk_stores_company FOREIGN KEY (companyId) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── units ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id        CHAR(36)      NOT NULL DEFAULT (UUID()),
  name      VARCHAR(255)  NOT NULL,
  code      VARCHAR(50)   NULL,
  address   TEXT          NULL,
  companyId CHAR(36)      NOT NULL,
  clientId  CHAR(36)      NOT NULL,
  isActive  TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_units_companyId (companyId),
  CONSTRAINT fk_units_company FOREIGN KEY (companyId) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── inventory_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id           CHAR(36)       NOT NULL DEFAULT (UUID()),
  itemCode     VARCHAR(100)   NOT NULL UNIQUE,
  itemName     VARCHAR(255)   NOT NULL,
  unit         VARCHAR(50)    NOT NULL,
  costPerUnit  DECIMAL(10,4)  NOT NULL DEFAULT 0,
  category     VARCHAR(100)   NULL,
  isActive     TINYINT(1)     NOT NULL DEFAULT 1,
  warehouseId  CHAR(36)       NULL,
  storeId      CHAR(36)       NULL,
  currentStock DECIMAL(10,3)  NOT NULL DEFAULT 0,
  minimumStock DECIMAL(10,3)  NOT NULL DEFAULT 0,
  createdAt    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_inventory_warehouseId (warehouseId),
  CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── recipes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id               CHAR(36)       NOT NULL DEFAULT (UUID()),
  recipeCode       VARCHAR(100)   NOT NULL,
  recipeName       VARCHAR(255)   NOT NULL,
  category         VARCHAR(100)   NOT NULL DEFAULT 'General',
  mealType         VARCHAR(50)    NOT NULL DEFAULT 'LUNCH',
  foodType         VARCHAR(50)    NOT NULL DEFAULT 'VEG',
  cuisineType      VARCHAR(100)   NULL,
  description      TEXT           NULL,
  standardPax      INT            NOT NULL DEFAULT 1,
  yieldQty         DECIMAL(10,3)  NOT NULL DEFAULT 1,
  yieldUnit        VARCHAR(50)    NOT NULL DEFAULT 'portion',
  portionPerPax    DECIMAL(10,3)  NOT NULL DEFAULT 1,
  prepTimeMin      INT            NOT NULL DEFAULT 0,
  cookTimeMin      INT            NOT NULL DEFAULT 0,
  status           VARCHAR(50)    NOT NULL DEFAULT 'DRAFT',
  versionNumber    INT            NOT NULL DEFAULT 1,
  isCurrentVersion TINYINT(1)     NOT NULL DEFAULT 1,
  baseRecipeId     CHAR(36)       NULL,
  warehouseId      CHAR(36)       NULL,
  createdBy        CHAR(36)       NULL,
  approvedBy       CHAR(36)       NULL,
  approvedAt       DATETIME       NULL,
  approvalNote     TEXT           NULL,
  deletedAt        DATETIME       NULL,
  createdAt        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recipes_warehouseId  (warehouseId),
  KEY idx_recipes_createdBy    (createdBy),
  KEY idx_recipes_status       (status),
  KEY idx_recipes_baseRecipeId (baseRecipeId),
  CONSTRAINT fk_recipes_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses (id) ON DELETE SET NULL,
  CONSTRAINT fk_recipes_createdBy FOREIGN KEY (createdBy)   REFERENCES users      (id) ON DELETE SET NULL,
  CONSTRAINT fk_recipes_approvedBy FOREIGN KEY (approvedBy) REFERENCES users      (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── recipe_ingredients ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id                CHAR(36)       NOT NULL DEFAULT (UUID()),
  recipeId          CHAR(36)       NOT NULL,
  inventoryItemId   CHAR(36)       NULL,
  sequenceNo        INT            NOT NULL DEFAULT 1,
  grossQty          DECIMAL(10,4)  NOT NULL DEFAULT 0,
  grossUnit         VARCHAR(50)    NOT NULL DEFAULT 'kg',
  wastagePercent    DECIMAL(5,2)   NOT NULL DEFAULT 0,
  netQty            DECIMAL(10,4)  NOT NULL DEFAULT 0,
  netUnit           VARCHAR(50)    NOT NULL DEFAULT 'kg',
  unitCostSnapshot  DECIMAL(10,4)  NOT NULL DEFAULT 0,
  lineCost          DECIMAL(10,4)  NOT NULL DEFAULT 0,
  notes             TEXT           NULL,
  createdAt         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ri_recipeId        (recipeId),
  KEY idx_ri_inventoryItemId (inventoryItemId),
  CONSTRAINT fk_ri_recipe    FOREIGN KEY (recipeId)        REFERENCES recipes         (id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_inventory FOREIGN KEY (inventoryItemId) REFERENCES inventory_items (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── recipe_steps ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_steps (
  id               CHAR(36)      NOT NULL DEFAULT (UUID()),
  recipeId         CHAR(36)      NOT NULL,
  stepNo           INT           NOT NULL DEFAULT 1,
  stepType         VARCHAR(50)   NULL,
  instruction      TEXT          NOT NULL,
  estimatedTimeMin INT           NOT NULL DEFAULT 0,
  equipmentName    VARCHAR(255)  NULL,
  temperatureNote  VARCHAR(255)  NULL,
  qcCheckNote      TEXT          NULL,
  createdAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_steps_recipeId (recipeId),
  CONSTRAINT fk_steps_recipe FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── recipe_costs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_costs (
  id              CHAR(36)       NOT NULL DEFAULT (UUID()),
  recipeId        CHAR(36)       NOT NULL,
  totalCost       DECIMAL(12,4)  NOT NULL DEFAULT 0,
  costPerPax      DECIMAL(12,4)  NOT NULL DEFAULT 0,
  costPerPortion  DECIMAL(12,4)  NOT NULL DEFAULT 0,
  calculatedAt    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_costs_recipeId (recipeId),
  CONSTRAINT fk_costs_recipe FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── recipe_tags ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_tags (
  id       CHAR(36)      NOT NULL DEFAULT (UUID()),
  recipeId CHAR(36)      NOT NULL,
  tagName  VARCHAR(100)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_tags_recipeId (recipeId),
  CONSTRAINT fk_tags_recipe FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── menu_plans ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_plans (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()),
  planName    VARCHAR(255)  NOT NULL,
  planDate    DATE          NOT NULL,
  mealType    VARCHAR(50)   NOT NULL DEFAULT 'LUNCH',
  description TEXT          NULL,
  warehouseId CHAR(36)      NULL,
  unitId      CHAR(36)      NULL,
  createdBy   CHAR(36)      NULL,
  isActive    TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_menu_plans_warehouseId (warehouseId),
  KEY idx_menu_plans_planDate    (planDate),
  CONSTRAINT fk_menu_plans_warehouse FOREIGN KEY (warehouseId) REFERENCES warehouses (id) ON DELETE SET NULL,
  CONSTRAINT fk_menu_plans_createdBy FOREIGN KEY (createdBy)   REFERENCES users      (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── menu_plan_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_plan_items (
  id         CHAR(36)       NOT NULL DEFAULT (UUID()),
  menuPlanId CHAR(36)       NOT NULL,
  recipeId   CHAR(36)       NOT NULL,
  servings   DECIMAL(10,2)  NOT NULL DEFAULT 1,
  notes      TEXT           NULL,
  sortOrder  INT            NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_mpi_menuPlanId (menuPlanId),
  CONSTRAINT fk_mpi_menuPlan FOREIGN KEY (menuPlanId) REFERENCES menu_plans (id) ON DELETE CASCADE,
  CONSTRAINT fk_mpi_recipe   FOREIGN KEY (recipeId)   REFERENCES recipes    (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── pax_entries ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pax_entries (
  id        CHAR(36)       NOT NULL DEFAULT (UUID()),
  companyId CHAR(36)       NOT NULL,
  date      DATE           NOT NULL,
  recipeId  CHAR(36)       NOT NULL,
  mealType  VARCHAR(50)    NOT NULL DEFAULT 'LUNCH',
  unitId    CHAR(36)       NOT NULL,
  paxCount  DECIMAL(10,2)  NOT NULL DEFAULT 0,
  uom       VARCHAR(20)    NOT NULL DEFAULT 'pax',
  createdAt DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pax_entry (companyId, date, recipeId, mealType, unitId),
  KEY idx_pax_companyId (companyId),
  CONSTRAINT fk_pax_company FOREIGN KEY (companyId) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── audit_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id        CHAR(36)      NOT NULL DEFAULT (UUID()),
  module    VARCHAR(100)  NOT NULL,
  entityId  CHAR(36)      NULL,
  action    VARCHAR(100)  NOT NULL,
  oldValue  JSON          NULL,
  newValue  JSON          NULL,
  userId    CHAR(36)      NULL,
  timestamp DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_entityId (entityId),
  KEY idx_audit_userId   (userId),
  KEY idx_audit_module   (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
