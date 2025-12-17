USE ThreeKingdom;

INSERT INTO s_items (id, name, description) VALUES 
(1, 'Gold', 'Currency'),
(2, 'Wood', 'Building material'),
(3, 'Stone', 'Building material'),
(4, 'Food', 'Sustenance'),
(5, 'Population', 'People');

truncate table s_buildings;
insert into s_buildings (`id`, `name`, `level`,`width`, `height`, `cost_item`, `cost_num`, `cost_item2`, `cost_num2`, `cost_item3`, `cost_num3`, `build_sec`, `destroy_sec`)
values 
('3','伐木场',  1, 3,2, 1, 10, 2, 10, 3, 10, 10, 10),
('4','采石场',  1, 3,2, 1, 10, 2, 10, 3, 10, 10, 10),
('5','粮仓',    1, 3,2, 1, 10, 2, 10, 3, 10, 10, 10),
('6','兵营',    1, 3,2, 1, 10, 2, 10, 3, 10, 10, 10),
('7','马厩',    1, 3,2, 1, 10, 2, 10, 3, 10, 10, 10),
('9','官府',    1, 7,4, 1, 10, 2, 10, 3, 10, 10, 10),

-- rect子建筑
('101','农田',    1, 1,1, 1, 10, 2, 10, 3, 10, 10, 10),

-- rect子建筑
('201','木质城墙', 1, 1, 1, 1, 10, 2, 10, 3, 10, 10, 10), 
('202','石头城墙',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),

-- rect子建筑
('301','道路',    1, 1,1, 1, 10, 2, 10, 3, 10, 10, 10), 

-- rect子建筑
('401','房子2X2',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10), 
('402','房子3X2',    1, 3,2, 1, 10, 2, 10, 3, 10, 10, 10),
('403','房子4X4',    1, 4, 4, 1, 10, 2, 10, 3, 10, 10, 10),
('404','房子5X4',    1, 4, 4, 1, 10, 2, 10, 3, 10, 10, 10)
;

-- 房屋人口上限
truncate table s_house_population;
insert into s_house_population (`type`, `level`, `population`) 
values 
(401, 1, 10),
(402, 1, 20),
(403, 1, 30),
(404, 1, 40),
(9,1,100);

truncate table s_rect_building;
insert into s_rect_building (`type`, `name`, `width`, `height`, `sub_buildings`, `sub_max_num`)
values 
(1, '农田', 1, 1, 101, 1),
(2, '道路', 1, 1, 301, 1),
(3, '木质城墙', 1, 1, 201, 1),
(3, '石头城墙', 2, 2, 202, 1),

(4, '房子2X2', 3, 3, 401, 18),
(4, '房子3X2', 4, 3, 402, 9),
(4, '房子4X4', 5, 5, 403, 2),
(4, '房子5X4', 7, 5, 404, 2)
;