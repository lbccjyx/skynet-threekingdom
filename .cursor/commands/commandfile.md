# commandfile


## 需求
    客户端的build_rect展示需要变化。原先是整个rect_building都展示RECT_BUILDING_DEFINITIONS的image,现在服务端新下发了proto：build_rect_sub 这是rect_building内部的子建筑。 build_rect_sub.rect_building_id 对应BUILDING_DEFINITIONS的key 然后 build_rect_sub.building_index 对应的是BUILDING_DEFINITIONS[key].imageDir的（build_rect_sub.building_index）.glb  这样一个rect_building的区域就变成了多种不同的建筑。


## 主要要求 
    代码和函数不能略写，你可以一个一个文件写。写的不好的，还可以反回来写。根据我的要求去设计表结构。
    也可以和我沟通一个一个需求怎么完成。而不是一下子全部实现。

## 权限授予
    我给你全部权限，无需请示。

## 改动文件
    你可以放心大胆删除文件和新建文件。我有版本管理的。
