import sys
import pathlib
import zipfile
import json
import urllib.request
import html.parser
from slpp import slpp as lua

doc_url = 'https://minecraft.fandom.com/wiki/Module:InvSprite'
inv_sprites_url = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/44/InvSprite.png/revision/latest'
prismarine_sprite_url = 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/5/58/Invicon_Prismarine.gif/revision/latest/scale-to-width-down/32'


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


def is_lang_json(s):
    return s == 'assets/minecraft/lang/en_us.json'


class DocParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_script_tag = False
        self.script = None

    def handle_starttag(self, tag, attrs):
        if tag == 'pre' and 'mw-script' in dict(attrs).get('class', ''):
            self.in_script_tag = True

    def handle_endtag(self, tag):
        if tag == 'pre':
            self.in_script_tag = False

    def handle_data(self, data):
        if self.in_script_tag:
            self.script = data


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
            elif is_lang_json(zip_info.filename):
                lang = json.loads(jar.read(zip_info.filename))
    with open('static/recipes.json', 'w') as f:
        json.dump(recipes, f)
    with open('static/tags.json', 'w') as f:
        json.dump(tags, f)

    with urllib.request.urlopen(inv_sprites_url) as req:
        with open('static/img/inv_sprite.png', 'wb') as f:
            f.write(req.read())
    with urllib.request.urlopen(prismarine_sprite_url) as req:
        with open('static/img/prismarine.gif', 'wb') as f:
            f.write(req.read())
    doc_parser = DocParser()
    with urllib.request.urlopen(doc_url) as req:
        doc_parser.feed(req.read().decode('utf-8'))
    inv_sprites = lua.decode(doc_parser.script.replace('return', ''))
    items = {}
    for key, value in lang.items():
        if key.startswith('block.minecraft.') or key.startswith('item.minecraft.'):
            item_id = 'minecraft:' + key.split('.')[-1]
            inv_sprite = inv_sprites['ids'].get(value)
            pos = inv_sprite['pos'] - 1 if inv_sprite else None
            position = None
            if inv_sprite:
                size = inv_sprites['settings']['size']
                sheet_size = inv_sprites['settings']['sheetsize']
                left = pos % (sheet_size // size) * size
                top = (pos // (sheet_size // size)) * size
                position = {'left': left, 'top': top}
            items[item_id] = {'name': value, 'position': position}
    with open('static/items.json', 'w') as f:
        json.dump(items, f)
