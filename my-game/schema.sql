CREATE DATABASE IF NOT EXISTS ThreeKingdom DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ThreeKingdom;

DROP TABLE IF EXISTS d_users;
CREATE TABLE IF NOT EXISTS d_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS d_cities;
CREATE TABLE IF NOT EXISTS d_cities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(64) DEFAULT 'City',
    level INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES d_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS d_items;
CREATE TABLE IF NOT EXISTS d_items (
    user_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
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

DROP TABLE IF EXISTS d_buildings;
CREATE TABLE d_buildings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
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
  `is_sub_building` int DEFAULT '0' comment '是否是子建筑',
  `limit_num` int DEFAULT '0' comment '子建筑数量限制',
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

-- 矩形面积内有很多子建筑
DROP TABLE IF EXISTS s_rect_building;
CREATE TABLE `s_rect_building` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `type` int NOT NULL comment ' 1:农田 2:道路 3:城墙 4:房屋',
  `name` varchar(32) NOT NULL,
  `width` int DEFAULT '0' comment '宽度 s_building的长宽是建筑的长宽，这边的长宽是子建筑需要的长宽',
  `height` int DEFAULT '0' comment '高度',
  `sub_buildings` int NOT NULL comment '房屋子类型 s_buildings:id',
  `sub_max_num` int NOT NULL comment '房屋子类型最大数量'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 矩形面积
DROP TABLE IF EXISTS d_rect_building;
CREATE TABLE d_rect_building (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    `x` INT NOT NULL comment "左下角坐标",
    `y` INT NOT NULL,
    `width` INT NOT NULL comment "宽度",
    `height` INT NOT NULL,
    `region` INT DEFAULT 2,
    `type` INT NOT NULL comment "类型"
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 矩形面积内的子建筑
DROP TABLE IF EXISTS d_rect_building_sub;
CREATE TABLE d_rect_building_sub (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    `rect_building_id` INT NOT NULL comment "矩形面积id",
    `building_type` INT NOT NULL comment "s_buildings:id",
    `x` INT NOT NULL comment "左下角坐标",
    `y` INT NOT NULL,
    `building_index` INT NOT NULL comment "第N个样式"
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS s_person_age;
CREATE TABLE s_person_age (
    id INT AUTO_INCREMENT PRIMARY KEY comment '年龄',
    duration int NOT NULL comment '这个年龄要持续时间 单位:秒 才能到下一年龄 离线不会改变时间',    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS s_person_character_attr;
CREATE TABLE IF NOT EXISTS s_person_character_attr (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type int NOT NULL comment '人物性格',
    type_name varchar(32) NOT NULL comment '给策划看的',
    level int NOT NULL DEFAULT 1 comment '人物年龄',
    attr_val1 int NOT NULL comment '武力',
    attr_val2 int NOT NULL comment '智力',
    attr_val3 int NOT NULL comment '统帅',
    attr_val4 int NOT NULL comment '政治',
    attr_val5 int NOT NULL comment '魅力',
    attr_val6 int NOT NULL comment '运气',
    attr_val7 int NOT NULL comment '忠诚',
    attr_val8 int NOT NULL comment '耐心',
    attr_val9 int NOT NULL comment '体力',
    attr_val10 int NOT NULL comment '速度',
    attr_val11 int NOT NULL comment '生命值',
    attr_val12 int NOT NULL comment '恢复速度',
    UNIQUE KEY `idx_type_level` (`type`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 人物
DROP TABLE IF EXISTS d_person;
CREATE TABLE d_person (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    age INT NOT NULL DEFAULT 0 comment '年龄',
    sex INT NOT NULL DEFAULT 0 comment '性别',
    `name` varchar(32) NOT NULL comment '允许玩家改名',
    is_adult int NOT NULL DEFAULT 0 comment '是否成年 成年后不再计算时间',
    age_up_time bigint NOT NULL DEFAULT 0 comment '年龄增加还需N秒 只有在线才能减少时间',
    current_hp int NOT NULL DEFAULT 0 comment '当前生命值',
    attr_val1 int NOT NULL  DEFAULT 0  comment '武力',
    attr_val2 int NOT NULL  DEFAULT 0  comment '智力',
    attr_val3 int NOT NULL  DEFAULT 0  comment '统帅',
    attr_val4 int NOT NULL  DEFAULT 0  comment '政治',
    attr_val5 int NOT NULL  DEFAULT 0  comment '魅力',
    attr_val6 int NOT NULL  DEFAULT 0  comment '运气',
    attr_val7 int NOT NULL  DEFAULT 0  comment '忠诚',
    attr_val8 int NOT NULL  DEFAULT 0  comment '耐力',
    attr_val9 int NOT NULL  DEFAULT 0  comment '耐心',
    attr_val10 int NOT NULL  DEFAULT 0  comment '速度',
    max_hp int NOT NULL DEFAULT 0 comment '最大生命值',
    attr_val12 int NOT NULL comment '生命恢复速度 离线也可以恢复',
    money int NOT NULL DEFAULT 0 comment '金钱',
    food int NOT NULL DEFAULT 0 comment '粮食',
    mate_id INT NOT NULL DEFAULT 0 comment '配偶id',
    cur_thing_type INT NOT NULL DEFAULT 0 comment '当前正在做事情类型',
    cur_thing_begin_time bigint NOT NULL DEFAULT 0 comment '当前正在做事情开始时间',
    x INT DEFAULT 0,
    y INT DEFAULT 0,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 人物性格
DROP TABLE IF EXISTS d_person_character;
CREATE TABLE d_person_character (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    person_id INT NOT NULL,
    character_id INT NOT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_person_character (person_id, character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 将领
DROP TABLE IF EXISTS d_generals;
CREATE TABLE IF NOT EXISTS d_generals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(64) NOT NULL,
    x INT DEFAULT 0,
    y INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES d_users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
