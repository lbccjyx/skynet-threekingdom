CREATE DATABASE IF NOT EXISTS ThreeKingdom DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ThreeKingdom;

DROP TABLE IF EXISTS d_users;
CREATE TABLE IF NOT EXISTS d_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS d_cities;
CREATE TABLE IF NOT EXISTS d_cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(64) DEFAULT 'City',
    level INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES d_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS d_items;
CREATE TABLE IF NOT EXISTS d_items (
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    amount INT DEFAULT 0,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES d_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS s_items;
CREATE TABLE IF NOT EXISTS s_items (
    id INT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO s_items (id, name, description) VALUES 
(1, 'Gold', 'Currency'),
(2, 'Wood', 'Building material'),
(3, 'Stone', 'Building material'),
(4, 'Food', 'Sustenance'),
(5, 'Population', 'People');

DROP TABLE IF EXISTS d_generals;
CREATE TABLE IF NOT EXISTS d_generals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(64) NOT NULL,
    x INT DEFAULT 0,
    y INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES d_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS d_buildings;
CREATE TABLE d_buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    `type` INT NOT NULL,
    level INT DEFAULT 1,
    x INT DEFAULT 0,
    y INT DEFAULT 0,
    begin_build_time bigint DEFAULT 0,
    region INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES d_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS s_buildings;
CREATE TABLE `s_buildings` (
  `id` int NOT NULL ,
  `name` varchar(32) NOT NULL,
  `level` int DEFAULT '1',
  `width` int DEFAULT '0',
  `height` int DEFAULT '0',
  `build_sec` int DEFAULT '0',
  `destroy_sec` int DEFAULT '0',
  `cost_item` int DEFAULT '0',
  `cost_num` int DEFAULT '0',
  `cost_item2` int DEFAULT '0',
  `cost_num2` int DEFAULT '0',
  `cost_item3` int DEFAULT '0',
  `cost_num3` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_id_lev` (`id`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS s_house_population;
CREATE TABLE `s_house_population` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `type` int NOT NULL comment '房屋或者官府的type',
  `level` int DEFAULT '1',
  `population` int DEFAULT '0' comment '房屋人口上限',
  UNIQUE KEY `idx_type_lev` (`type`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS d_rect_building;
CREATE TABLE d_rect_building (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    `x` INT NOT NULL comment "左下角坐标",
    `y` INT NOT NULL,
    `width` INT NOT NULL comment "宽度",
    `height` INT NOT NULL,
    `region` INT DEFAULT 2,
    `type` INT NOT NULL comment "类型"
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;