import sys
import pathlib
import zipfile
import json

def is_texture_asset(s):
    if s.startswith('assets/minecraft/textures/item/'):
        return True
    if s.startswith('assets/minecraft/textures/block/'):
        return True
    if s == 'assets/minecraft/textures/gui/container/crafting_table.png':
        return True
    return False


def is_recipe_json(s):
    return s.startswith('data/minecraft/recipes/') and s.endswith('.json')


def is_tag_json(s):
    return s.startswith('data/minecraft/tags/items/') and s.endswith('.json')


if __name__ == '__main__':
    if len(sys.argv) > 1:
        jar_path = sys.argv[1]
    else:
        jar_path = pathlib.Path.home() / '.local/share/multimc/libraries/com/mojang/minecraft/1.18.1/minecraft-1.18.1-client.jar'
    recipes = []
    tags = {}
    pathlib.Path('static/img/minecraft').mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(jar_path, 'r') as jar:
        for zip_info in jar.infolist():
            if zip_info.is_dir():
                continue
            if is_texture_asset(zip_info.filename):
                zip_info.filename = pathlib.Path(zip_info.filename).name
                jar.extract(zip_info, 'static/img/minecraft')
            elif is_recipe_json(zip_info.filename):
                recipes.append(json.loads(jar.read(zip_info.filename)))
            elif is_tag_json(zip_info.filename):
                tags[pathlib.Path(zip_info.filename).stem] = json.loads(jar.read(zip_info.filename))
    with open('static/recipes.json', 'w') as f:
        json.dump(recipes, f)
    with open('static/tags.json', 'w') as f:
        json.dump(tags, f)
