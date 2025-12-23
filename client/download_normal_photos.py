#!/usr/bin/env python3
"""
下载 normal.json 中提到的所有图片到 normalPhotos 文件夹
"""
import json
import os
import urllib.request
import urllib.error
from pathlib import Path

# LPC 图片仓库的 base URL
LPC_BASE_URL = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets/'

# JSON 文件路径
JSON_FILE = 'assets/sprite_file/normal.json'

# 输出目录
OUTPUT_DIR = 'assets/normalPhotos'


def download_image(url, output_path):
    """下载图片到指定路径"""
    try:
        # 创建目录（如果不存在）
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # 下载图片
        print(f'正在下载: {url}')
        urllib.request.urlretrieve(url, output_path)
        print(f'  ✓ 已保存: {output_path}')
        return True
    except urllib.error.HTTPError as e:
        print(f'  ✗ HTTP 错误 {e.code}: {url}')
        return False
    except urllib.error.URLError as e:
        print(f'  ✗ URL 错误: {url} - {e.reason}')
        return False
    except Exception as e:
        print(f'  ✗ 下载失败: {url} - {str(e)}')
        return False


def main():
    # 读取 JSON 文件
    script_dir = Path(__file__).parent
    json_path = script_dir / JSON_FILE
    
    if not json_path.exists():
        print(f'错误: 找不到 JSON 文件: {json_path}')
        return
    
    print(f'读取 JSON 文件: {json_path}')
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 收集所有需要下载的图片路径
    image_files = set()
    
    # 1. 收集 layers 中的 fileName
    if 'layers' in data:
        for layer in data['layers']:
            if 'fileName' in layer:
                image_files.add(layer['fileName'])
                print(f'找到 layer 图片: {layer["fileName"]}')
    
    # 2. 收集 credits 中的 fileName
    if 'credits' in data:
        for credit in data['credits']:
            if 'fileName' in credit:
                image_files.add(credit['fileName'])
                print(f'找到 credit 图片: {credit["fileName"]}')
    
    print(f'\n总共需要下载 {len(image_files)} 张图片\n')
    
    # 下载所有图片
    success_count = 0
    fail_count = 0
    
    output_dir = script_dir / OUTPUT_DIR
    
    for file_name in sorted(image_files):
        # 构建完整 URL
        url = LPC_BASE_URL + file_name
        
        # 构建本地保存路径（保持原有目录结构）
        local_path = output_dir / file_name
        
        if download_image(url, str(local_path)):
            success_count += 1
        else:
            fail_count += 1
    
    print(f'\n下载完成!')
    print(f'成功: {success_count} 张')
    print(f'失败: {fail_count} 张')
    print(f'保存目录: {output_dir}')


if __name__ == '__main__':
    main()
