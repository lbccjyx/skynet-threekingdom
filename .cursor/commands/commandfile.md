# commandfile


## 需求
    服务端修改。当客户端发起proto(build_rect)请求的时候，相当于指定了建筑的允许区间A。应该从s_rect_building表中获得允许生成的所有子建筑，并且根据子建筑的实际占用去规划区间A的分块(分块尽量占更多的格子)，然后随机一个s_rect_building.sub_max_num 作为d_rect_building_sub.building_index 然后通过proto(build_rect_sub)下发给客户端所有这次新增的d_rect_building_sub

## 主要要求 
    代码和函数不能略写，你可以一个一个文件写。写的不好的，还可以反回来写。根据我的要求去设计表结构。
    也可以和我沟通一个一个需求怎么完成。而不是一下子全部实现。

## 权限授予
    我给你全部权限，无需请示。

## 改动文件
    你可以放心大胆删除文件和新建文件。我有版本管理的。
