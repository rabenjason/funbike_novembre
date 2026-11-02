-- Funbike catalogue database schema.
-- Select the `funbike` database in phpMyAdmin before importing this file,
-- or run `npm run db:setup` from backend/.
-- This creates empty tables only: there are intentionally no demo INSERTs.

CREATE TABLE IF NOT EXISTS brands (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(160) NOT NULL,
  logo_url TEXT NULL,
  logo_alt VARCHAR(255) NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brands_slug (slug),
  KEY ix_brands_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS brand_sections (
  brand_id BIGINT UNSIGNED NOT NULL,
  section VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  label VARCHAR(160) NULL,
  route_id VARCHAR(160) NULL,
  filterable BOOLEAN NULL,
  display_mode VARCHAR(80) NULL,
  home_featured BOOLEAN NULL,
  footer_order INT NULL,
  footer_featured_order INT NULL,
  PRIMARY KEY (brand_id, section),
  CONSTRAINT fk_brand_sections_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Editorial home-page links; kept separate from product categories.
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_role CHECK (role IN ('ADMIN'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  route VARCHAR(200) NOT NULL,
  brand VARCHAR(120) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  KEY ix_categories_active_order (is_active, sort_order)
) ENGINE=InnoDB;

-- Administrable home-page cards and visual content; no records are seeded.
CREATE TABLE IF NOT EXISTS featured_banners (
  id VARCHAR(160) NOT NULL,
  short VARCHAR(160) NOT NULL,
  brand VARCHAR(160) NOT NULL,
  tag VARCHAR(160) NOT NULL,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  target_page VARCHAR(120) NOT NULL,
  target_id VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_featured_banners_active_order (is_active, sort_order)
) ENGINE=InnoDB;

-- Optional copy overrides for the primary home-page hero. The row is created
-- only when an administrator saves it; the frontend has a local text fallback.
CREATE TABLE IF NOT EXISTS homepage_hero_copy (
  hero_key VARCHAR(40) NOT NULL,
  localisation VARCHAR(255) NOT NULL,
  title_line1 VARCHAR(255) NOT NULL,
  title_line2 VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  slogan_prefix VARCHAR(255) NOT NULL,
  catalog_button VARCHAR(160) NOT NULL,
  featured_label VARCHAR(160) NOT NULL,
  year_label VARCHAR(40) NOT NULL,
  choose_model_label VARCHAR(255) NOT NULL,
  display_model_label VARCHAR(160) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (hero_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS homepage_hero_usages (
  hero_key VARCHAR(40) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  usage_text VARCHAR(160) NOT NULL,
  PRIMARY KEY (hero_key, sort_order),
  CONSTRAINT fk_homepage_hero_usages_copy FOREIGN KEY (hero_key) REFERENCES homepage_hero_copy(hero_key) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Additional editorial heroes; imported images are stored with the other site uploads.
CREATE TABLE IF NOT EXISTS homepage_editorial_banners (
  id VARCHAR(160) NOT NULL,
  eyebrow VARCHAR(255) NOT NULL,
  title_line1 VARCHAR(255) NOT NULL,
  title_line2 VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  button_text VARCHAR(160) NOT NULL,
  target_page VARCHAR(120) NOT NULL,
  target_id VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_homepage_editorial_banners_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS homepage_promotions (
  id VARCHAR(160) NOT NULL,
  badge VARCHAR(160) NOT NULL,
  eyebrow VARCHAR(200) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  price VARCHAR(255) NOT NULL,
  target_page VARCHAR(120) NULL,
  target_id VARCHAR(160) NULL,
  published_at DATETIME NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_homepage_promotions_active_order (is_active, sort_order),
  KEY ix_homepage_promotions_schedule (starts_at, ends_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS homepage_promotion_highlights (
  promotion_id VARCHAR(160) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  highlight VARCHAR(255) NOT NULL,
  PRIMARY KEY (promotion_id, sort_order),
  CONSTRAINT fk_promotion_highlights_promotion FOREIGN KEY (promotion_id) REFERENCES homepage_promotions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Key is a stable frontend location slug, not a database-generated ID.
CREATE TABLE IF NOT EXISTS dealers (
  dealer_key VARCHAR(120) NOT NULL,
  city VARCHAR(160) NOT NULL,
  name VARCHAR(200) NOT NULL,
  kind VARCHAR(160) NOT NULL,
  address VARCHAR(255) NOT NULL,
  hours VARCHAR(255) NOT NULL,
  phone VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL,
  description TEXT NOT NULL,
  assistant_label VARCHAR(255) NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (dealer_key),
  KEY ix_dealers_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dealer_services (
  dealer_key VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  service VARCHAR(160) NOT NULL,
  PRIMARY KEY (dealer_key, sort_order),
  CONSTRAINT fk_dealer_services_dealer FOREIGN KEY (dealer_key) REFERENCES dealers(dealer_key) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS families (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_families_name (name),
  KEY ix_families_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subfamilies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  family_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subfamilies_family_name (family_id, name),
  KEY ix_subfamilies_active_order (is_active, sort_order),
  CONSTRAINT fk_subfamilies_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS part_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_part_types_name (name),
  KEY ix_part_types_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_equipment_types_name (name),
  KEY ix_equipment_types_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS accessory_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accessory_types_name (name),
  KEY ix_accessory_types_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS accessory_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accessory_categories_name (name),
  KEY ix_accessory_categories_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_usages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_usages_name (name),
  KEY ix_product_usages_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS characteristic_definitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  unit VARCHAR(80) NULL,
  applicable_to VARCHAR(40) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_characteristic_name_scope (name, applicable_to),
  KEY ix_characteristics_active_order (is_active, sort_order)
) ENGINE=InnoDB;

-- Shared identity/content for every product kind. `id` is technical;
-- `reference` is a separate optional commercial reference.
CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_kind VARCHAR(24) NOT NULL,
  name VARCHAR(255) NOT NULL,
  reference VARCHAR(160) NULL,
  brand_id BIGINT UNSIGNED NULL,
  subfamily_id BIGINT UNSIGNED NULL,
  price VARCHAR(255) NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_products_publication (status, product_kind, id),
  KEY ix_products_brand (brand_id),
  KEY ix_products_subfamily (subfamily_id),
  CONSTRAINT chk_products_kind CHECK (product_kind IN ('MOTORCYCLE', 'SPARE_PART', 'EQUIPMENT', 'ACCESSORY')),
  CONSTRAINT chk_products_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_subfamily FOREIGN KEY (subfamily_id) REFERENCES subfamilies(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS motorcycles (
  product_id BIGINT UNSIGNED NOT NULL,
  family_id BIGINT UNSIGNED NULL,
  tag VARCHAR(160) NULL,
  alt VARCHAR(255) NULL,
  recommendation TEXT NULL,
  PRIMARY KEY (product_id),
  KEY ix_motorcycles_family (family_id),
  CONSTRAINT fk_motorcycles_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_motorcycles_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS spare_parts (
  product_id BIGINT UNSIGNED NOT NULL,
  part_type_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  universal_compatibility BOOLEAN NULL,
  source_url TEXT NULL,
  PRIMARY KEY (product_id),
  KEY ix_spare_parts_type (part_type_id),
  KEY ix_spare_parts_category (category_id),
  CONSTRAINT fk_spare_parts_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_spare_parts_type FOREIGN KEY (part_type_id) REFERENCES part_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_spare_parts_category FOREIGN KEY (category_id) REFERENCES accessory_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment (
  product_id BIGINT UNSIGNED NOT NULL,
  equipment_type_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  source_url TEXT NULL,
  PRIMARY KEY (product_id),
  KEY ix_equipment_type (equipment_type_id),
  KEY ix_equipment_category (category_id),
  CONSTRAINT fk_equipment_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_equipment_type FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_equipment_category FOREIGN KEY (category_id) REFERENCES accessory_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS accessories (
  product_id BIGINT UNSIGNED NOT NULL,
  accessory_type_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  source_url TEXT NULL,
  PRIMARY KEY (product_id),
  KEY ix_accessories_type (accessory_type_id),
  KEY ix_accessories_category (category_id),
  CONSTRAINT fk_accessories_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_accessories_type FOREIGN KEY (accessory_type_id) REFERENCES accessory_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_accessories_category FOREIGN KEY (category_id) REFERENCES accessory_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255) NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_product_images_gallery (product_id, is_primary, sort_order),
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_characteristics (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  characteristic_id BIGINT UNSIGNED NOT NULL,
  value_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_product_characteristics_order (product_id, sort_order),
  KEY ix_product_characteristics_definition (characteristic_id),
  CONSTRAINT fk_product_characteristics_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_characteristics_definition FOREIGN KEY (characteristic_id) REFERENCES characteristic_definitions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_usage_assignments (
  product_id BIGINT UNSIGNED NOT NULL,
  usage_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, usage_id),
  CONSTRAINT fk_product_usage_assignments_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_usage_assignments_usage FOREIGN KEY (usage_id) REFERENCES product_usages(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS spare_part_compatible_brands (
  product_id BIGINT UNSIGNED NOT NULL,
  brand_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, brand_id),
  CONSTRAINT fk_spare_compatible_part FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_spare_compatible_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Normalize legacy negative display orders to the neutral first position.
UPDATE brands SET sort_order = 0 WHERE sort_order < 0;
UPDATE brand_sections SET sort_order = 0 WHERE sort_order < 0;
UPDATE categories SET sort_order = 0 WHERE sort_order < 0;
UPDATE families SET sort_order = 0 WHERE sort_order < 0;
UPDATE subfamilies SET sort_order = 0 WHERE sort_order < 0;
UPDATE part_types SET sort_order = 0 WHERE sort_order < 0;
UPDATE equipment_types SET sort_order = 0 WHERE sort_order < 0;
UPDATE accessory_types SET sort_order = 0 WHERE sort_order < 0;
UPDATE accessory_categories SET sort_order = 0 WHERE sort_order < 0;
UPDATE product_usages SET sort_order = 0 WHERE sort_order < 0;
UPDATE characteristic_definitions SET sort_order = 0 WHERE sort_order < 0;
UPDATE featured_banners SET sort_order = 0 WHERE sort_order < 0;
UPDATE homepage_editorial_banners SET sort_order = 0 WHERE sort_order < 0;
UPDATE homepage_promotions SET sort_order = 0 WHERE sort_order < 0;
UPDATE homepage_promotion_highlights SET sort_order = 0 WHERE sort_order < 0;
UPDATE dealers SET sort_order = 0 WHERE sort_order < 0;
UPDATE dealer_services SET sort_order = 0 WHERE sort_order < 0;
UPDATE product_images SET sort_order = 0 WHERE sort_order < 0;
UPDATE product_characteristics SET sort_order = 0 WHERE sort_order < 0;
