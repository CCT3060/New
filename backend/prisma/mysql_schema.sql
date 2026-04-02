-- ============================================================
-- Recipe Management System — MySQL Schema
-- Compatible with MySQL 8.0+ / MySQL Workbench
-- ============================================================

CREATE DATABASE IF NOT EXISTS recipe_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE recipe_management;

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  passwordHash  VARCHAR(255) NOT NULL,
  role          ENUM('ADMIN','OPS_MANAGER','KITCHEN_MANAGER','STORE_MANAGER','APPROVER') NOT NULL,
  isActive      TINYINT(1)   NOT NULL DEFAULT 1,
  createdAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- WAREHOUSES
-- ─────────────────────────────────────────────
CREATE TABLE warehouses (
  id        CHAR(36)     NOT NULL DEFAULT (UUID()),
  name      VARCHAR(255) NOT NULL,
  code      VARCHAR(100) NOT NULL,
  address   TEXT,
  isActive  TINYINT(1)   NOT NULL DEFAULT 1,
  createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouses_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- INVENTORY ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE inventory_items (
  id           CHAR(36)       NOT NULL DEFAULT (UUID()),
  itemCode     VARCHAR(100)   NOT NULL,
  itemName     VARCHAR(255)   NOT NULL,
  category     VARCHAR(100)   NOT NULL,
  unit         VARCHAR(50)    NOT NULL,
  currentStock DECIMAL(12,3)  NOT NULL DEFAULT 0,
  minimumStock DECIMAL(12,3)  NOT NULL DEFAULT 0,
  costPerUnit  DECIMAL(12,4)  NOT NULL DEFAULT 0,
  isActive     TINYINT(1)     NOT NULL DEFAULT 1,
  warehouseId  CHAR(36)       NOT NULL,
  createdAt    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_itemCode (itemCode),
  CONSTRAINT fk_inventory_warehouse
    FOREIGN KEY (warehouseId) REFERENCES warehouses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- RECIPES
-- ─────────────────────────────────────────────
CREATE TABLE recipes (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()),
  recipeCode       VARCHAR(100) NOT NULL,
  recipeName       VARCHAR(255) NOT NULL,
  category         VARCHAR(100) NOT NULL,
  mealType         ENUM('BREAKFAST','LUNCH','DINNER','SNACK','BEVERAGE','DESSERT') NOT NULL,
  foodType         ENUM('VEG','NON_VEG','EGG','VEGAN') NOT NULL,
  cuisineType      VARCHAR(100),
  description      TEXT,
  standardPax      INT          NOT NULL,
  yieldQty         DECIMAL(10,3) NOT NULL,
  yieldUnit        VARCHAR(50)  NOT NULL,
  portionPerPax    DECIMAL(10,3) NOT NULL,
  prepTimeMin      INT          NOT NULL DEFAULT 0,
  cookTimeMin      INT          NOT NULL DEFAULT 0,
  status           ENUM('DRAFT','UNDER_REVIEW','APPROVED','ACTIVE','INACTIVE','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  versionNumber    INT          NOT NULL DEFAULT 1,
  isCurrentVersion TINYINT(1)   NOT NULL DEFAULT 1,
  baseRecipeId     CHAR(36),
  warehouseId      CHAR(36)     NOT NULL,
  createdBy        CHAR(36)     NOT NULL,
  approvedBy       CHAR(36),
  approvedAt       DATETIME,
  approvalNote     TEXT,
  createdAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt        DATETIME,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipes_recipeCode (recipeCode),
  CONSTRAINT fk_recipe_base
    FOREIGN KEY (baseRecipeId) REFERENCES recipes (id),
  CONSTRAINT fk_recipe_warehouse
    FOREIGN KEY (warehouseId) REFERENCES warehouses (id),
  CONSTRAINT fk_recipe_creator
    FOREIGN KEY (createdBy) REFERENCES users (id),
  CONSTRAINT fk_recipe_approver
    FOREIGN KEY (approvedBy) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- RECIPE INGREDIENTS
-- ─────────────────────────────────────────────
CREATE TABLE recipe_ingredients (
  id               CHAR(36)      NOT NULL DEFAULT (UUID()),
  recipeId         CHAR(36)      NOT NULL,
  inventoryItemId  CHAR(36)      NOT NULL,
  sequenceNo       INT           NOT NULL DEFAULT 0,
  grossQty         DECIMAL(12,4) NOT NULL,
  grossUnit        VARCHAR(50)   NOT NULL,
  wastagePercent   DECIMAL(5,2)  NOT NULL DEFAULT 0,
  netQty           DECIMAL(12,4) NOT NULL,
  netUnit          VARCHAR(50)   NOT NULL,
  unitCostSnapshot DECIMAL(12,4) NOT NULL,
  lineCost         DECIMAL(12,4) NOT NULL,
  notes            TEXT,
  createdAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_ingredient (recipeId, inventoryItemId),
  CONSTRAINT fk_ingredient_recipe
    FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE,
  CONSTRAINT fk_ingredient_item
    FOREIGN KEY (inventoryItemId) REFERENCES inventory_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- RECIPE STEPS
-- ─────────────────────────────────────────────
CREATE TABLE recipe_steps (
  id               CHAR(36)    NOT NULL DEFAULT (UUID()),
  recipeId         CHAR(36)    NOT NULL,
  stepNo           INT         NOT NULL,
  stepType         ENUM('PREP','COOK','GARNISH','HOLD','PACK') NOT NULL DEFAULT 'PREP',
  instruction      TEXT        NOT NULL,
  estimatedTimeMin INT         NOT NULL DEFAULT 0,
  equipmentName    VARCHAR(255),
  temperatureNote  VARCHAR(255),
  qcCheckNote      TEXT,
  createdAt        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_step_recipe
    FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- RECIPE COSTS
-- ─────────────────────────────────────────────
CREATE TABLE recipe_costs (
  id             CHAR(36)      NOT NULL DEFAULT (UUID()),
  recipeId       CHAR(36)      NOT NULL,
  ingredientCost DECIMAL(12,4) NOT NULL,
  fuelCost       DECIMAL(12,4) NOT NULL DEFAULT 0,
  laborCost      DECIMAL(12,4) NOT NULL DEFAULT 0,
  packagingCost  DECIMAL(12,4) NOT NULL DEFAULT 0,
  otherCost      DECIMAL(12,4) NOT NULL DEFAULT 0,
  totalCost      DECIMAL(12,4) NOT NULL,
  costPerPax     DECIMAL(12,4) NOT NULL,
  calculatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cost_recipe
    FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- RECIPE VERSIONS
-- ─────────────────────────────────────────────
CREATE TABLE recipe_versions (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  recipeId      CHAR(36)     NOT NULL,
  baseRecipeId  CHAR(36),
  versionNumber INT          NOT NULL,
  changeSummary TEXT         NOT NULL,
  isCurrent     TINYINT(1)   NOT NULL DEFAULT 1,
  changedBy     CHAR(36)     NOT NULL,
  changedAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_version_recipe
    FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE,
  CONSTRAINT fk_version_user
    FOREIGN KEY (changedBy) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- RECIPE TAGS
-- ─────────────────────────────────────────────
CREATE TABLE recipe_tags (
  id       CHAR(36)     NOT NULL DEFAULT (UUID()),
  recipeId CHAR(36)     NOT NULL,
  tagName  VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_tag (recipeId, tagName),
  CONSTRAINT fk_tag_recipe
    FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
  id        CHAR(36)    NOT NULL DEFAULT (UUID()),
  module    VARCHAR(100) NOT NULL,
  entityId  CHAR(36)    NOT NULL,
  action    ENUM('CREATED','UPDATED','DELETED','STATUS_CHANGED','APPROVED','REJECTED',
                 'VERSION_CREATED','INGREDIENT_ADDED','INGREDIENT_REMOVED','SUBMITTED_FOR_REVIEW') NOT NULL,
  oldValue  JSON,
  newValue  JSON,
  userId    CHAR(36)    NOT NULL,
  timestamp DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_audit_user
    FOREIGN KEY (userId) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
