import sys
import pathlib
import zipfile
import json
import urllib.request
import urllib.error
import html.parser
import re
import base64
import time

doc_url = 'https://minecraft.fandom.com/wiki/Module:InvSprite'
wiki_url_base = 'https://minecraft.fandom.com/wiki'
block_icon_size = 48


icon_force_asset = {
    'minecraft:acacia_door', 'minecraft:activator_rail', 'minecraft:bamboo', 'minecraft:birch_door',
    'minecraft:black_candle', 'minecraft:blue_candle', 'minecraft:blue_orchid', 'minecraft:brown_candle',
    'minecraft:brown_mushroom', 'minecraft:campfire', 'minecraft:candle', 'minecraft:clock', 'minecraft:cornflower',
    'minecraft:crimson_door', 'minecraft:cyan_candle', 'minecraft:dandelion', 'minecraft:dark_oak_door',
    'minecraft:detector_rail', 'minecraft:gray_candle', 'minecraft:green_candle', 'minecraft:iron_bars',
    'minecraft:iron_door', 'minecraft:ladder', 'minecraft:lever', 'minecraft:light_blue_candle',
    'minecraft:light_gray_candle', 'minecraft:lilac', 'minecraft:lily_of_the_valley', 'minecraft:lime_candle',
    'minecraft:magenta_candle', 'minecraft:oak_door', 'minecraft:orange_candle', 'minecraft:orange_tulip',
    'minecraft:oxeye_daisy', 'minecraft:peony', 'minecraft:pink_candle', 'minecraft:pink_tulip',
    'minecraft:pointed_dripstone', 'minecraft:poppy', 'minecraft:powered_rail', 'minecraft:purple_candle',
    'minecraft:rail', 'minecraft:red_mushroom', 'minecraft:red_tulip', 'minecraft:redstone_torch',
    'minecraft:rose_bush', 'minecraft:soul_campfire', 'minecraft:soul_torch', 'minecraft:spruce_door',
    'minecraft:sugar_cane', 'minecraft:sunflower', 'minecraft:torch', 'minecraft:tripwire_hook', 'minecraft:vine',
    'minecraft:warped_fungus', 'minecraft:white_candle', 'minecraft:white_tulip', 'minecraft:wither_rose',
    'minecraft:yellow_candle', 'minecraft:cake', 'minecraft:azure_bluet', 'minecraft:jungle_door',
    'minecraft:red_candle', 'minecraft:warped_door', 'minecraft:allium', 'minecraft:glass_pane',
    'minecraft:white_stained_glass_pane', 'minecraft:orange_stained_glass_pane', 'minecraft:magenta_stained_glass_pane',
    'minecraft:light_blue_stained_glass_pane', 'minecraft:yellow_stained_glass_pane',
    'minecraft:lime_stained_glass_pane', 'minecraft:pink_stained_glass_pane', 'minecraft:gray_stained_glass_pane',
    'minecraft:light_gray_stained_glass_pane', 'minecraft:cyan_stained_glass_pane',
    'minecraft:purple_stained_glass_pane', 'minecraft:blue_stained_glass_pane', 'minecraft:brown_stained_glass_pane',
    'minecraft:green_stained_glass_pane', 'minecraft:red_stained_glass_pane', 'minecraft:black_stained_glass_pane',
    'minecraft:chain'
}

icon_force_wiki = {
    'minecraft:enchanted_golden_apple', 'minecraft:written_book'
}

icon_asset_overrides = {
    'minecraft:compass': 'compass_16',
    'minecraft:sunflower': 'sunflower_front',
    'minecraft:lilac': 'lilac_top',
    'minecraft:peony': 'peony_top',
    'minecraft:rose_bush': 'rose_bush_top',
    'minecraft:crossbow': 'crossbow_pulling_0',
    'minecraft:glass_pane': 'glass',
    'minecraft:white_stained_glass_pane': 'white_stained_glass',
    'minecraft:orange_stained_glass_pane': 'orange_stained_glass',
    'minecraft:magenta_stained_glass_pane': 'magenta_stained_glass',
    'minecraft:light_blue_stained_glass_pane': 'light_blue_stained_glass',
    'minecraft:yellow_stained_glass_pane': 'yellow_stained_glass',
    'minecraft:lime_stained_glass_pane': 'lime_stained_glass',
    'minecraft:pink_stained_glass_pane': 'pink_stained_glass',
    'minecraft:gray_stained_glass_pane': 'gray_stained_glass',
    'minecraft:light_gray_stained_glass_pane': 'light_gray_stained_glass',
    'minecraft:cyan_stained_glass_pane': 'cyan_stained_glass',
    'minecraft:purple_stained_glass_pane': 'purple_stained_glass',
    'minecraft:blue_stained_glass_pane': 'blue_stained_glass',
    'minecraft:brown_stained_glass_pane': 'brown_stained_glass',
    'minecraft:green_stained_glass_pane': 'green_stained_glass',
    'minecraft:red_stained_glass_pane': 'red_stained_glass',
    'minecraft:black_stained_glass_pane': 'black_stained_glass',
}

icon_wiki_overrides = {
    'Block of Copper': 'Copper Block',
    'Exposed Copper': 'Exposed Copper Block',
    'Oxidized Copper': 'Oxidized Copper Block',
    'Waxed Block of Copper': 'Copper Block',
    'Waxed Cut Copper': 'Cut Copper',
    'Waxed Exposed Copper': 'Exposed Copper Block',
    'Waxed Exposed Cut Copper': 'Exposed Cut Copper',
    'Waxed Oxidized Copper': 'Oxidized Copper Block',
    'Waxed Oxidized Cut Copper': 'Oxidized Cut Copper',
    'Waxed Weathered Copper': 'Weathered Copper Block',
    'Waxed Weathered Cut Copper': 'Weathered Cut Copper',
    'Weathered Copper': 'Weathered Copper Block',
    'Waxed Cut Copper Slab': 'Cut Copper Slab',
    'Waxed Cut Copper Stairs': 'Cut Copper Stairs',
    'Waxed Exposed Cut Copper Slab': 'Exposed Cut Copper Slab',
    'Waxed Exposed Cut Copper Stairs': 'Exposed Cut Copper Stairs',
    'Waxed Oxidized Cut Copper Slab': 'Oxidized Cut Copper Slab',
    'Waxed Oxidized Cut Copper Stairs': 'Oxidized Cut Copper Stairs',
    'Waxed Weathered Cut Copper Slab': 'Weathered Cut Copper Slab',
    'Waxed Weathered Cut Copper Stairs': 'Weathered Cut Copper Stairs',
}

max_stack_sizes = {
    'minecraft:minecart': 1,
    'minecraft:chest_minecart': 1,
    'minecraft:furnace_minecart': 1,
    'minecraft:tnt_minecart': 1,
    'minecraft:carrot_on_a_stick': 1,
    'minecraft:warped_fungus_on_a_stick': 1,
    'minecraft:oak_boat': 1,
    'minecraft:spruce_boat': 1,
    'minecraft:birch_boat': 1,
    'minecraft:jungle_boat': 1,
    'minecraft:acacia_boat': 1,
    'minecraft:dark_oak_boat': 1,
    'minecraft:bucket': 16,
    'minecraft:snowball': 16,
    'minecraft:milk_bucket': 1,
    'minecraft:egg': 16,
    'minecraft:ender_pearl': 16,
    'minecraft:writable_book': 1,
    'minecraft:creeper_banner_pattern': 1,
    'minecraft:skull_banner_pattern': 1,
    'minecraft:mojang_banner_pattern': 1,
    'minecraft:flower_banner_pattern': 1,
    'minecraft:cake': 1,
    'minecraft:beetroot_soup': 1,
    'minecraft:honey_bottle': 16,
    'minecraft:rabbit_stew': 1,
    'minecraft:mushroom_stew': 1,
    'minecraft:spyglass': 1,
    'minecraft:flint_and_steel': 1,
    'minecraft:wooden_shovel': 1,
    'minecraft:wooden_pickaxe': 1,
    'minecraft:wooden_axe': 1,
    'minecraft:wooden_hoe': 1,
    'minecraft:stone_shovel': 1,
    'minecraft:stone_pickaxe': 1,
    'minecraft:stone_axe': 1,
    'minecraft:stone_hoe': 1,
    'minecraft:golden_shovel': 1,
    'minecraft:golden_pickaxe': 1,
    'minecraft:golden_axe': 1,
    'minecraft:golden_hoe': 1,
    'minecraft:iron_shovel': 1,
    'minecraft:iron_pickaxe': 1,
    'minecraft:iron_axe': 1,
    'minecraft:iron_hoe': 1,
    'minecraft:diamond_shovel': 1,
    'minecraft:diamond_pickaxe': 1,
    'minecraft:diamond_axe': 1,
    'minecraft:diamond_hoe': 1,
    'minecraft:netherite_shovel': 1,
    'minecraft:netherite_pickaxe': 1,
    'minecraft:netherite_axe': 1,
    'minecraft:netherite_hoe': 1,
    'minecraft:shears': 1,
    'minecraft:fishing_rod': 1,
    'minecraft:bow': 1,
    'minecraft:turtle_helmet': 1,
    'minecraft:wooden_sword': 1,
    'minecraft:stone_sword': 1,
    'minecraft:golden_sword': 1,
    'minecraft:iron_sword': 1,
    'minecraft:diamond_sword': 1,
    'minecraft:netherite_sword': 1,
    'minecraft:leather_helmet': 1,
    'minecraft:leather_chestplate': 1,
    'minecraft:leather_leggings': 1,
    'minecraft:leather_boots': 1,
    'minecraft:chainmail_helmet': 1,
    'minecraft:chainmail_chestplate': 1,
    'minecraft:chainmail_leggings': 1,
    'minecraft:chainmail_boots': 1,
    'minecraft:iron_helmet': 1,
    'minecraft:iron_chestplate': 1,
    'minecraft:iron_leggings': 1,
    'minecraft:iron_boots': 1,
    'minecraft:diamond_helmet': 1,
    'minecraft:diamond_chestplate': 1,
    'minecraft:diamond_leggings': 1,
    'minecraft:diamond_boots': 1,
    'minecraft:golden_helmet': 1,
    'minecraft:golden_chestplate': 1,
    'minecraft:golden_leggings': 1,
    'minecraft:golden_boots': 1,
    'minecraft:netherite_helmet': 1,
    'minecraft:netherite_chestplate': 1,
    'minecraft:netherite_leggings': 1,
    'minecraft:netherite_boots': 1,
    'minecraft:shulker_box': 1,
    'minecraft:black_shulker_box': 1,
    'minecraft:blue_shulker_box': 1,
    'minecraft:brown_shulker_box': 1,
    'minecraft:cyan_shulker_box': 1,
    'minecraft:gray_shulker_box': 1,
    'minecraft:green_shulker_box': 1,
    'minecraft:light_blue_shulker_box': 1,
    'minecraft:light_gray_shulker_box': 1,
    'minecraft:lime_shulker_box': 1,
    'minecraft:magenta_shulker_box': 1,
    'minecraft:orange_shulker_box': 1,
    'minecraft:pink_shulker_box': 1,
    'minecraft:purple_shulker_box': 1,
    'minecraft:red_shulker_box': 1,
    'minecraft:white_shulker_box': 1,
    'minecraft:yellow_shulker_box': 1,
    'minecraft:shield': 1,
    'minecraft:gray_banner': 16,
    'minecraft:brown_banner': 16,
    'minecraft:magenta_banner': 16,
    'minecraft:lime_banner': 16,
    'minecraft:light_blue_banner': 16,
    'minecraft:purple_banner': 16,
    'minecraft:red_banner': 16,
    'minecraft:light_gray_banner': 16,
    'minecraft:white_banner': 16,
    'minecraft:orange_banner': 16,
    'minecraft:cyan_banner': 16,
    'minecraft:blue_banner': 16,
    'minecraft:green_banner': 16,
    'minecraft:pink_banner': 16,
    'minecraft:yellow_banner': 16,
    'minecraft:black_banner': 16,
    'minecraft:acacia_sign': 16,
    'minecraft:spruce_sign': 16,
    'minecraft:dark_oak_sign': 16,
    'minecraft:birch_sign': 16,
    'minecraft:crimson_sign': 16,
    'minecraft:oak_sign': 16,
    'minecraft:warped_sign': 16,
    'minecraft:jungle_sign': 16,
    'minecraft:written_book': 16,
    'minecraft:lingering_potion': 1,
    'minecraft:suspicious_stew': 1
}

dye_items = [
    {'item': 'minecraft:red_dye'},
    {'item': 'minecraft:green_dye'},
    {'item': 'minecraft:purple_dye'},
    {'item': 'minecraft:cyan_dye'},
    {'item': 'minecraft:light_gray_dye'},
    {'item': 'minecraft:gray_dye'},
    {'item': 'minecraft:pink_dye'},
    {'item': 'minecraft:lime_dye'},
    {'item': 'minecraft:yellow_dye'},
    {'item': 'minecraft:light_blue_dye'},
    {'item': 'minecraft:magenta_dye'},
    {'item': 'minecraft:orange_dye'},
    {'item': 'minecraft:blue_dye'},
    {'item': 'minecraft:black_dye'},
    {'item': 'minecraft:brown_dye'},
    {'item': 'minecraft:white_dye'}
]

crafting_recipe_types = {
    'minecraft:crafting_shaped': None,
    'minecraft:crafting_shapeless': None,
    'minecraft:crafting_special_firework_rocket': [
        {'item': 'minecraft:firework_rocket'},
        {'item': 'minecraft:gunpowder'},
        {'item': 'minecraft:paper'},
        {'item': 'minecraft:firework_star'}
    ],
    'minecraft:crafting_special_armordye': [
        {'item': 'minecraft:leather_helmet'},
        {'item': 'minecraft:leather_chestplate'},
        {'item': 'minecraft:leather_leggings'},
        {'item': 'minecraft:leather_boots'},
        {'item': 'minecraft:leather_horse_armor'},
        *dye_items
    ],
    'minecraft:crafting_special_bannerduplicate': [
        {'tag': 'minecraft:banners'}
    ],
    'minecraft:crafting_special_bookcloning': [
        {'item': 'minecraft:written_book'},
        {'item': 'minecraft:writable_book'}
    ],
    'minecraft:crafting_special_firework_star': [
        {'item': 'minecraft:gunpowder'},
        {'item': 'minecraft:skeleton_skull'},
        {'item': 'minecraft:wither_skeleton_skull'},
        {'item': 'minecraft:player_head'},
        {'item': 'minecraft:zombie_head'},
        {'item': 'minecraft:creeper_head'},
        {'item': 'minecraft:dragon_head'},
        {'item': 'minecraft:glowstone_dust'},
        {'item': 'minecraft:gold_nugget'},
        {'item': 'minecraft:feather'},
        {'item': 'minecraft:fire_charge'},
        {'item': 'minecraft:diamond'},
        *dye_items
    ],
    'minecraft:crafting_special_firework_star_fade': [
        {'item': 'minecraft:firework_star'},
        *dye_items
    ],
    'minecraft:crafting_special_mapcloning': [
        {'item': 'minecraft:map'},
        {'item': 'minecraft:filled_map'},
    ],
    'minecraft:crafting_special_shielddecoration': [
        {'item': 'minecraft:shield'},
        {'tag': 'minecraft:banners'}
    ],
    'minecraft:crafting_special_shulkerboxcoloring': [
        {'tag': 'minecraft:shulker_boxes'},
        *dye_items
    ],
    'minecraft:crafting_special_tippedarrow': [
        {'item': 'minecraft:arrow'},
        {'item': 'minecraft:lingering_potion'},
        {'item': 'minecraft:tipped_arrow'}
    ],
    'minecraft:crafting_special_suspiciousstew': [
        {'item': 'minecraft:bowl'},
        {'item': 'minecraft:brown_mushroom'},
        {'item': 'minecraft:red_mushroom'},
        {'tag': 'minecraft:small_flowers'},
        {'item': 'minecraft:suspicious_stew'}
    ]
}

disabled_crafting_recipe_types = [
    'minecraft:crafting_special_mapextending',
    'minecraft:crafting_special_repairitem'
]


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
    return (s.startswith('data/minecraft/tags/items/') or s.startswith('data/minecraft/tags/blocks/')) and s.endswith('.json')


def is_lang_json(s):
    return s == 'assets/minecraft/lang/en_us.json'


class WikiParser(html.parser.HTMLParser):
    def __init__(self, block_name):
        super().__init__()
        self.block_name = block_name
        self.in_imagearea = False
        self.div_level = -1
        self.image_ext = None
        self.image_url = None
        self.image_url_candidates = []

    def feed(self, data):
        super().feed(data)
        self.image_url = None
        for direction in ['U', 'E', 'S']:
            if self.image_url is not None:
                break
            for image_url_candidate in self.image_url_candidates:
                if f'%28{direction}%29' in image_url_candidate:
                    self.image_url = image_url_candidate
                    break
        if self.image_url is None and self.image_url_candidates:
            self.image_url = self.image_url_candidates[0]

    def handle_starttag(self, tag, attrs):
        if tag == 'div' and 'infobox-imagearea' in dict(attrs).get('class', ''):
            self.in_imagearea = True
            self.div_level = 0
        elif self.in_imagearea and tag == 'img':
            attr_dict = dict(attrs)
            file_name_pattern = rf'{re.escape(self.block_name)}( \(floor\))?( \((UD|N|S|E|\d+)\))?( [JB]E\d+(-[a-z]\d)?)*.(?P<ext>png|gif)'
            m = re.match(file_name_pattern, attr_dict.get('alt'))
            if m:
                self.image_ext = m.group('ext')
                self.image_url_candidates.append(attr_dict.get('data-src') or attr_dict.get('src'))
        elif self.in_imagearea and tag == 'div':
            self.div_level += 1

    def handle_endtag(self, tag):
        if tag == 'div':
            self.div_level -= 1
            if self.div_level < 0:
                self.in_imagearea = False


def expand_ingredient_choices(ingredient_choices, ingredient_tags):
    item_choices = set()
    tag_choices = set()
    if type(ingredient_choices) != list:
        ingredient_choices = [ingredient_choices]
    for ingredient_choice in ingredient_choices:
        if 'item' in ingredient_choice:
            item_choices.add(ingredient_choice['item'])
        else:
            tag_choices.add(ingredient_choice['tag'])
    while tag_choices:
        new_tag_choices = set()
        for tag_choice in tag_choices:
            for tag_element in ingredient_tags.get(tag_choice.replace('minecraft:', ''))['values']:
                if tag_element.startswith('#'):
                    new_tag_choices.add(tag_element[1:])
                else:
                    item_choices.add(tag_element)
        tag_choices = new_tag_choices
    return item_choices


def extract_item_ids(crafting_recipes, ingredient_tags):
    item_ids = set()
    for recipe in crafting_recipes:
        if recipe['type'] == 'minecraft:crafting_shapeless':
            item_ids.add(recipe['result']['item'])
            for ingredient_choices in recipe['ingredients']:
                for ingredient_choice in expand_ingredient_choices(ingredient_choices, ingredient_tags):
                    item_ids.add(ingredient_choice)
        elif recipe['type'] == 'minecraft:crafting_shaped':
            item_ids.add(recipe['result']['item'])
            for _, ingredient_choices in recipe['key'].items():
                for ingredient_choice in expand_ingredient_choices(ingredient_choices, ingredient_tags):
                    item_ids.add(ingredient_choice)
        else:
            for ingredient_choice in expand_ingredient_choices(crafting_recipe_types[recipe['type']], ingredient_tags):
                item_ids.add(ingredient_choice)
    return item_ids


def get_block_icon(block_id, name):
    if block_id in icon_force_asset:
        return get_item_icon(block_id, name)
    filename = block_id.replace('minecraft:', '')
    if pathlib.Path(f'res/icons/{filename}.png').is_file():
        with open(f'res/icons/{filename}.png', 'rb') as f:
            return'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')
    if pathlib.Path(f'res/cache/wiki/{filename}.png').is_file():
        with open(f'res/cache/wiki/{filename}.png', 'rb') as f:
            return'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')
    if pathlib.Path(f'res/cache/wiki/{filename}.gif').is_file():
        with open(f'res/cache/wiki/{filename}.gif', 'rb') as f:
            return'data:image/webp;base64,' + base64.b64encode(f.read()).decode('utf-8')
    name = icon_wiki_overrides.get(name, name)
    wiki_parser = WikiParser(name)
    wiki_url = f'{wiki_url_base}/{name.replace(" ", "_")}'
    print(f'loading {wiki_url}')
    try:
        with urllib.request.urlopen(wiki_url) as req:
            wiki_parser.feed(req.read().decode('utf-8'))
    except urllib.error.HTTPError:
        raise RuntimeError(f'failed to fetch wiki page {wiki_url}')
    if not wiki_parser.image_url:
        print(f'failed to extract image icon for {name}')
        return ''
    image_url = wiki_parser.image_url.rsplit('/', 1)[0] + f'/{block_icon_size}'
    res = None
    while res is None:
        try:
            with urllib.request.urlopen(image_url) as req:
                res = req.read()
        except urllib.error.HTTPError:
            print(f'failed to fetch image {image_url}, retrying...')
            time.sleep(1)
    image_types_by_ext = {'png': 'png', 'gif': 'webp'}
    image_type = image_types_by_ext.get(wiki_parser.image_ext, 'png')
    with open(f'res/cache/wiki/{filename}.{wiki_parser.image_ext}', 'wb') as f:
        f.write(res)
    return f'data:image/{image_type};base64,' + base64.b64encode(res).decode('utf-8')


def get_item_icon(item_id, name):
    if item_id in icon_force_wiki:
        return get_block_icon(item_id, name)
    filename = item_id.replace('minecraft:', '')
    if pathlib.Path(f'res/icons/{filename}.png').is_file():
        with open(f'res/icons/{filename}.png', 'rb') as f:
            return'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')
    filename = icon_asset_overrides.get(item_id, item_id.replace('minecraft:', ''))
    if pathlib.Path(f'res/cache/jar/{filename}.png').is_file():
        with open(f'res/cache/jar/{filename}.png', 'rb') as f:
            return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')
    else:
        print(f'failed to find asset for {item_id} (expected {filename}.png)')
    return ''


if __name__ == '__main__':
    if len(sys.argv) > 1:
        jar_path = sys.argv[1]
    else:
        jar_path = pathlib.Path.home() / '.local/share/multimc/libraries/com/mojang/minecraft/1.18.1/minecraft-1.18.1-client.jar'
    recipes = []
    tags = {}
    pathlib.Path('res/cache/jar').mkdir(parents=True, exist_ok=True)
    pathlib.Path('res/cache/wiki').mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(jar_path, 'r') as jar:
        for zip_info in jar.infolist():
            if zip_info.is_dir():
                continue
            if is_texture_asset(zip_info.filename):
                zip_info.filename = pathlib.Path(zip_info.filename).name
                jar.extract(zip_info, 'res/cache/jar')
            elif is_recipe_json(zip_info.filename):
                recipe_dict = json.loads(jar.read(zip_info.filename))
                if recipe_dict['type'] in crafting_recipe_types:
                    recipes.append(recipe_dict)
                elif recipe_dict['type'].startswith('minecraft:crafting') and recipe_dict['type'] not in disabled_crafting_recipe_types:
                    print(f'Warning: {recipe_dict["type"]} not implemented')
            elif is_tag_json(zip_info.filename):
                tags[pathlib.Path(zip_info.filename).stem] = json.loads(jar.read(zip_info.filename))
            elif is_lang_json(zip_info.filename):
                lang = json.loads(jar.read(zip_info.filename))
    with open('static/recipes.json', 'w') as f:
        json.dump(recipes, f)
    with open('static/tags.json', 'w') as f:
        json.dump(tags, f)

    items = {}
    relevant_item_ids = extract_item_ids(recipes, tags)
    for relevant_item_id in relevant_item_ids:
        max_stack_size = max_stack_sizes.get(relevant_item_id, 64)
        if item_name := lang.get(f'item.minecraft.{relevant_item_id.split(":")[1]}'):
            item_icon = get_item_icon(relevant_item_id, item_name)
            items[relevant_item_id] = {'name': item_name, 'icon': item_icon, 'stack': max_stack_size}
        elif block_name := lang.get(f'block.minecraft.{relevant_item_id.split(":")[1]}'):
            block_icon = get_block_icon(relevant_item_id, block_name)
            items[relevant_item_id] = {'name': block_name, 'icon': block_icon, 'stack': max_stack_size}
        else:
            raise RuntimeError(f'cannot find name for {relevant_item_id}')
    with open('static/items.json', 'w') as f:
        json.dump(items, f, indent=2)
