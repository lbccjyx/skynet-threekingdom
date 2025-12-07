# 保留自己的文件夹 而不提交skynet的文件

## 检查当前远程仓库  
    git remote -v
## 删除现有 origin        
    git remote remove origin

## .gitignore

### 第一行：忽略仓库根目录下的所有文件和文件夹
/*
### 第二行：排除（不忽略） my-game 文件夹等本身
!/my-game/

## 移除所有已跟踪文件的索引，但不删除物理文件
git rm -r --cached .

## 重新添加，此时.gitignore规则将生效
git add .

## commit + push
git commit -m "Apply .gitignore to keep only self1"