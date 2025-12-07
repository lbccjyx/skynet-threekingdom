USE ThreeKingdom;

INSERT INTO s_items (id, name, description) VALUES 
(1, 'Gold', 'Currency'),
(2, 'Wood', 'Building material'),
(3, 'Stone', 'Building material'),
(4, 'Food', 'Sustenance'),
(5, 'Population', 'People');

insert into s_buildings (`id`, `name`, `level`,`width`, `height`, `cost_item`, `cost_num`, `cost_item2`, `cost_num2`, `cost_item3`, `cost_num3`, `build_sec`, `destroy_sec`)
values 
('1','民房',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),
('2','农田',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),
('3','伐木场',  1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),
('4','采石场',  1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),
('5','粮仓',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),
('6','兵营',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),
('7','马厩',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),
('8','城墙',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10),
('9','官府',    1, 2,2, 1, 10, 2, 10, 3, 10, 10, 10);

-- 房屋人口上限
insert into s_house_population (`type`, `level`, `population`) 
values 
(1, 1, 10),
(1,2,20),
(9,1,100);