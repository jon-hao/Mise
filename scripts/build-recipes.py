#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 recipes.txt 生成 data/recipes.json。编辑 txt 后运行本脚本或由 GitHub Actions 自动运行。"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "recipes.txt"
OUT = ROOT / "data" / "recipes.json"

NAME_ALIASES = {
    "香菇青菜": ["香菇青菜", "炒青菜香菇"],
    "酸辣土豆丝": ["土豆丝", "醋溜土豆丝", "酸辣马铃薯丝"],
    "手撕包菜": ["包菜", "手撕圆白菜", "爆炒包菜"],
    "青椒鸡蛋": ["青椒炒蛋", "辣椒炒蛋"],
    "西红柿炒鸡蛋": ["番茄炒蛋", "番茄炒鸡蛋", "西红柿炒蛋"],
    "麻婆豆腐": ["麻婆", "麻辣豆腐"],
    "蚂蚁上树": ["肉末粉丝", "肉沫粉条"],
    "宫保鸡丁": ["宫爆鸡丁", "宫保鸡"],
    "可乐鸡翅": ["可乐鸡"],
    "水煮菜蘸料": ["水煮菜", "蘸料", "单山蘸水"],
    "凯撒大帝": ["凯撒沙拉", "凯撒"],
    "日式鸡蛋三明治": ["鸡蛋三明治", "玉子烧三明治", "蛋三明治"],
    "东北大饭包": ["饭包", "菜包饭"],
    "牧羊人派": ["shepherd pie", "土豆泥焗肉"],
    "疙瘩汤": ["面疙瘩", "疙瘩"],
    "过油肉拌面": ["过油肉", "拉条子"],
    "阿朵妹土豆粉": ["土豆粉", "酸辣土豆粉"],
    "韩式拌饭": ["石锅拌饭", "拌饭"],
    "韩式炒年糕": ["炒年糕", "辣炒年糕"],
    "铁锅炖": ["铁锅炖大鹅", "一锅炖"],
    "水蒸蛋": ["蒸蛋", "鸡蛋羹", "嫩蛋"],
    "上汤娃娃菜": ["娃娃菜汤"],
    "醋溜娃娃菜炒肉丝": ["醋溜娃娃菜"],
    "虾米小白菜/虾皮快菜": ["虾皮小白菜", "虾米白菜", "虾皮快菜"],
    "海鲜粥 （38有虾版）": ["海鲜粥", "虾粥"],
    "番茄豆皮刷刷汤": ["豆皮汤", "刷刷汤"],
    "酱香茄子": ["烧茄子", "酱茄子"],
    "家常豆腐": ["红烧豆腐"],
    "小炒牛肉": ["牛肉小炒"],
    "咸蛋黄鸡翅": ["蛋黄鸡翅"],
    "韭菜鸡蛋锅贴": ["锅贴", "韭菜锅贴"],
    "青椒土豆包": ["土豆包子", "青椒土豆包子"],
    "辣椒茄子包 （包子皮参考酱肉包）": ["茄子包", "辣椒茄子包子"],
    "菠菜鸡蛋包（包子皮做法见青椒土豆包）": ["菠菜包", "菠菜鸡蛋包子"],
    "徐福烩饭": ["烩饭"],
    "无油地三鲜": ["地三鲜"],
    "番茄肉酱意面": ["肉酱意面", "意面"],
    "杂菇小炒（也可以加五花肉片）": ["杂菇小炒", "炒蘑菇"],
    "咸蛋黄蒜香南瓜": ["咸蛋黄南瓜", "蒜香南瓜"],
    "牧羊人派（2个人吃到撑的量）": ["牧羊人派"],
}

ING_ALIAS = {
    "土豆": ["马铃薯", "洋芋", "土豆"],
    "番茄": ["西红柿", "蕃茄", "番茄"],
    "西红柿": ["番茄", "西红柿"],
    "青菜": ["小白菜", "油菜", "青菜", "小油菜"],
    "包菜": ["圆白菜", "卷心菜", "莲花白", "包菜"],
    "菜花": ["花菜", "花椰菜", "菜花"],
    "莴笋": ["青笋", "莴苣", "莴笋"],
    "蒜苔": ["蒜薹", "蒜毫", "蒜苔"],
    "木耳": ["黑木耳", "云耳", "木耳"],
    "香菇": ["冬菇", "花菇", "香菇"],
    "西葫芦": ["角瓜", "西葫芦"],
    "娃娃菜": ["娃娃菜"],
    "油麦菜": ["莜麦菜", "油麦菜"],
    "茄子": ["茄瓜", "茄子"],
    "豆腐": ["老豆腐", "嫩豆腐", "内脂豆腐", "北豆腐", "南豆腐", "豆腐"],
    "豆皮": ["豆腐皮", "千张", "油豆皮", "豆皮"],
    "粉条": ["粉丝", "红薯粉", "粉条"],
    "米线": ["米粉", "米线"],
    "猪肉": ["猪肉丝", "猪肉馅", "猪肉沫", "里脊", "肉丝", "肉沫", "肉馅", "猪肉"],
    "五花肉": ["五花", "五花肉"],
    "牛肉": ["牛里脊", "牛肉馅", "牛肉"],
    "牛腩": ["牛腩肉", "牛腩"],
    "鸡肉": ["鸡肉"],
    "鸡腿": ["鸡腿肉", "琵琶腿", "鸡腿"],
    "鸡翅": ["鸡翅膀", "翅中", "鸡翅"],
    "鸡胸肉": ["鸡胸", "鸡大胸", "鸡胸肉"],
    "虾仁": ["虾", "明虾仁", "虾仁"],
    "鸡蛋": ["蛋", "鸡蛋"],
    "咸蛋黄": ["咸鸭蛋黄", "咸蛋黄"],
    "咸鸭蛋": ["咸蛋", "咸鸭蛋"],
    "皮蛋": ["松花蛋", "皮蛋"],
    "火腿": ["火腿肠", "方腿", "火腿"],
    "腊肠": ["香肠", "广式腊肠", "腊肠"],
    "洋葱": ["葱头", "洋葱"],
    "青椒": ["柿子椒", "甜椒", "青辣椒", "青椒"],
    "辣椒": ["干辣椒", "小米辣", "红椒", "绿辣椒", "螺丝椒", "辣皮子", "辣椒"],
    "白菜": ["大白菜", "黄芽菜", "白菜"],
    "芹菜": ["西芹", "芹菜"],
    "菠菜": ["波菜", "菠菜"],
    "韭菜": ["韭", "韭菜"],
    "豆角": ["四季豆", "豇豆", "芸豆", "豆角"],
    "冬瓜": ["白瓜", "冬瓜"],
    "南瓜": ["倭瓜", "南瓜"],
    "排骨": ["猪排骨", "小排", "排骨"],
    "丸子": ["肉丸", "丸子"],
    "菌菇": ["蘑菇", "杂菇", "菌菇"],
    "蘑菇": ["口蘑", "双孢菇", "蘑菇"],
    "糯米笋": ["笋", "糯米笋"],
    "竹笋": ["笋", "春笋", "竹笋"],
    "西兰花": ["绿花菜", "青花菜", "西兰花"],
    "豆芽": ["绿豆芽", "黄豆芽", "豆芽"],
    "菜心": ["菜薹", "菜心"],
    "米饭": ["剩米饭", "白米饭", "米饭"],
    "面粉": ["中筋面粉", "低筋面粉", "面粉"],
    "拉条子": ["拉面", "拌面", "拉条子"],
    "刀削面": ["削面", "刀削面"],
    "意面": ["意大利面", "通心粉", "意面"],
    "可乐": ["无糖可乐", "肥宅快乐水", "可乐"],
    "咖喱": ["咖喱块", "咖喱"],
    "牛排": ["牛肉排", "牛排"],
    "荷兰豆": ["荷豆", "荷兰豆"],
    "吐司": ["面包", "吐司"],
    "面条": ["细面", "挂面", "面条"],
    "土豆粉": ["酸辣粉", "土豆粉"],
    "年糕": ["辣年糕", "年糕"],
    "鲫鱼": ["鲫鱼"],
    "核桃": ["核桃"],
    "生菜": ["生菜"],
    "花生": ["花生"],
    "香菜": ["香菜"],
    "蜂蜜": ["蜜汁", "蜂蜜"],
}

ING_CANON_PATTERNS = [
    (r"香菇", "香菇"),
    (r"青菜|小白菜|油菜", "青菜"),
    (r"菜花|花菜", "菜花"),
    (r"蒜苔|蒜薹", "蒜苔"),
    (r"包菜|圆白菜|卷心菜", "包菜"),
    (r"虾仁|虾球", "虾仁"),
    (r"(?<!咸)(?<!对)虾(?!皮|米|头)", "虾仁"),
    (r"莴笋|青笋", "莴笋"),
    (r"土豆|马铃薯|洋芋", "土豆"),
    (r"猪肉馅|猪肉沫|猪肉丝|猪绞肉", "猪肉"),
    (r"五花肉", "五花肉"),
    (r"里脊肉|肉丝|肉沫|肉馅|猪肉", "猪肉"),
    (r"鸡腿肉|鸡腿", "鸡腿"),
    (r"鸡胸肉|鸡胸", "鸡胸肉"),
    (r"鸡翅", "鸡翅"),
    (r"鸡肉|半只鸡", "鸡肉"),
    (r"青椒|柿子椒", "青椒"),
    (r"鸡蛋|蛋清|蛋液", "鸡蛋"),
    (r"绿豆芽|豆芽", "豆芽"),
    (r"菜心", "菜心"),
    (r"可乐", "可乐"),
    (r"洋葱", "洋葱"),
    (r"番茄|西红柿", "番茄"),
    (r"米线|米粉", "米线"),
    (r"芹菜|西芹", "芹菜"),
    (r"茄子", "茄子"),
    (r"白菜|大白菜", "白菜"),
    (r"豆腐(?!皮)", "豆腐"),
    (r"牛腩", "牛腩"),
    (r"娃娃菜", "娃娃菜"),
    (r"竹笋|春笋", "竹笋"),
    (r"腊肠|香肠", "腊肠"),
    (r"核桃", "核桃"),
    (r"火腿", "火腿"),
    (r"刀削面", "刀削面"),
    (r"香菜", "香菜"),
    (r"牛肉|牛里脊", "牛肉"),
    (r"意面|意大利面", "意面"),
    (r"蘑菇|口蘑|双孢菇", "蘑菇"),
    (r"金针菇", "金针菇"),
    (r"吐司|面包", "吐司"),
    (r"咸鸭蛋|咸蛋(?!黄)", "咸鸭蛋"),
    (r"咸蛋黄", "咸蛋黄"),
    (r"大米|米饭|剩米饭", "米饭"),
    (r"花生", "花生"),
    (r"生菜", "生菜"),
    (r"丸子|肉丸", "丸子"),
    (r"粉丝|粉条", "粉条"),
    (r"细面|挂面", "面条"),
    (r"内脂豆腐|嫩豆腐|老豆腐|北豆腐", "豆腐"),
    (r"糯米笋", "糯米笋"),
    (r"木耳|黑木耳", "木耳"),
    (r"面粉|面剂", "面粉"),
    (r"拉条子|拉面", "拉条子"),
    (r"西葫芦|角瓜", "西葫芦"),
    (r"辣皮子|红辣椒|小米辣|干辣椒|螺丝椒", "辣椒"),
    (r"年糕", "年糕"),
    (r"土豆粉", "土豆粉"),
    (r"豆角|四季豆|豇豆", "豆角"),
    (r"韭菜", "韭菜"),
    (r"菠菜", "菠菜"),
    (r"南瓜", "南瓜"),
    (r"牛排", "牛排"),
    (r"油麦菜|莜麦菜", "油麦菜"),
    (r"西兰花|青花菜", "西兰花"),
    (r"荷兰豆", "荷兰豆"),
    (r"冬瓜", "冬瓜"),
    (r"排骨", "排骨"),
    (r"豆腐皮|豆皮|千张", "豆皮"),
    (r"鲫鱼", "鲫鱼"),
    (r"菌菇|杂菇", "菌菇"),
    (r"皮蛋|松花蛋", "皮蛋"),
    (r"咖喱", "咖喱"),
    (r"蜂蜜|蜜汁", "蜂蜜"),
]


def extract_ingredients(text: str) -> list[str]:
    lines = []
    for line in text.split("\n"):
        if re.match(r"^(食材|材料|面团|肉馅)", line) or "食材：" in line or "食材:" in line:
            lines.append(line)
    blob = "\n".join(lines) if lines else text[:400]
    found = []
    seen = set()
    for pat_s, canon in ING_CANON_PATTERNS:
        if re.search(pat_s, blob) and canon not in seen:
            seen.add(canon)
            found.append(canon)
    return [x for x in found if x not in ("蒜", "姜", "葱", "蜂蜜")]


def classify(name: str, body: str, ings: list[str]):
    text = name + body
    cats, methods, tastes, scenes, protein = [], [], [], [], []

    if any(k in text for k in ["炖", "煲", "焖"]):
        methods.append("炖焖")
    if "蒸" in text or "水蒸" in name:
        methods.append("蒸")
    if "卤" in text:
        methods.append("卤")
    if any(k in text for k in ["炸", "空气炸"]):
        methods.append("炸烤")
    if any(k in text for k in ["凉拌", "拌菜", "蘸料"]):
        methods.append("凉拌")
    if "粥" in name:
        methods = ["煮粥"]
    elif "汤" in name:
        methods = ["煮汤"]
    elif any(k in name for k in ["包", "锅贴", "饭包"]):
        methods.append("面点")
    if not methods:
        methods.append("炒")
    methods = list(dict.fromkeys(methods))

    if any(k in name for k in ["面", "饭", "米线", "粥", "意面", "年糕", "土豆粉", "烩饼", "三明治", "拌饭"]):
        cats.append("主食")
    if any(k in name for k in ["包", "锅贴"]):
        cats.append("面点包子")
    if "汤" in name or "煲" in name:
        cats.append("汤煲")
    if "粥" in name:
        cats.append("粥品")
    if any(k in ings for k in ["虾仁", "鲫鱼"]) or "海鲜" in name:
        cats.append("海鲜")
    meat = ["猪肉", "五花肉", "牛肉", "牛腩", "鸡腿", "鸡胸肉", "鸡翅", "鸡肉", "排骨", "丸子", "牛排"]
    if any(k in ings for k in meat):
        cats.append("荤菜")
    veg_only = not any(k in ings for k in meat + ["虾仁", "鲫鱼", "火腿", "腊肠"])
    if veg_only and "鸡蛋" in ings:
        cats.append("蛋类")
    if veg_only and "鸡蛋" not in ings:
        cats.append("素菜")
    if any(k in name for k in ["韩式", "日式", "意面", "凯撒", "咖喱", "牧羊人"]):
        cats.append("异国风味")
    if not cats:
        cats.append("家常菜")
    if "家常" not in "".join(cats) and "主食" not in cats and "汤煲" not in cats:
        cats.append("家常菜")
    cats = list(dict.fromkeys(cats))

    if any(k in text for k in ["酸辣", "醋", "陈醋"]):
        tastes.append("酸辣")
    if any(k in text for k in ["麻婆", "麻辣", "花椒", "辣椒粉", "豆瓣"]):
        tastes.append("麻辣")
    if any(k in text for k in ["番茄", "西红柿", "茄汁"]):
        tastes.append("番茄味")
    if any(k in text for k in ["酱香", "黄豆酱", "甜面酱", "豆瓣酱"]):
        tastes.append("酱香")
    if any(k in text for k in ["蒜香", "蒜蓉"]):
        tastes.append("蒜香")
    if any(k in text for k in ["可乐", "蜜汁"]):
        tastes.append("微甜")
    if any(k in text for k in ["清淡", "白灼", "清炒"]) or name.startswith(("白灼", "清炒")):
        tastes.append("清淡")
    if not tastes:
        tastes.append("咸鲜")
    tastes = list(dict.fromkeys(tastes))

    if "炖" not in name and "焖" not in name and "面点包子" not in cats:
        scenes.append("快手菜")
    if any(k in cats for k in ["主食", "面点包子"]):
        scenes.append("主食一餐")
    if "汤" in name or "粥" in name:
        scenes.append("暖胃汤粥")
    if any(k in cats for k in ["荤菜", "家常菜"]) and "主食" not in cats:
        scenes.append("下饭菜")
    if not scenes:
        scenes.append("家常日常")
    scenes = list(dict.fromkeys(scenes))

    for p, keys in [
        ("猪肉", ["猪肉", "五花肉", "排骨", "丸子"]),
        ("牛肉", ["牛肉", "牛腩", "牛排"]),
        ("鸡肉", ["鸡腿", "鸡胸肉", "鸡翅", "鸡肉"]),
        ("虾海鲜", ["虾仁", "鲫鱼"]),
        ("蛋", ["鸡蛋", "咸蛋黄", "咸鸭蛋", "皮蛋"]),
        ("豆制品", ["豆腐", "豆皮"]),
    ]:
        if any(k in ings for k in keys):
            protein.append(p)
    if not any(x in protein for x in ["猪肉", "牛肉", "鸡肉", "虾海鲜"]):
        protein.append("素食友好")

    return cats, methods, tastes, scenes, protein


def parse_sections(body: str):
    ingredients_text = ""
    sauce_text = ""
    steps = []
    mode = None
    buf = []

    def flush():
        nonlocal ingredients_text, sauce_text, steps, buf, mode
        text = "\n".join(buf).strip()
        buf = []
        if not text:
            return
        if mode == "ing":
            ingredients_text = (ingredients_text + "\n" + text).strip() if ingredients_text else text
        elif mode == "sauce":
            sauce_text = (sauce_text + "\n" + text).strip() if sauce_text else text
        elif mode == "steps":
            steps.extend([ln.strip() for ln in text.split("\n") if ln.strip()])
        else:
            steps.extend([ln.strip() for ln in text.split("\n") if ln.strip()])

    for line in body.split("\n"):
        line = line.rstrip()
        if re.match(r"^(食材|材料|面团部分|肉馅部分|面发好后)[:：]?", line):
            flush()
            mode = "ing"
            buf = [re.sub(r"^(食材|材料)[:：]\s*", "", line)]
            continue
        if re.match(
            r"^(料汁|调料|腌肉料汁|腌虾仁料汁|炒肉料汁|炒菜料汁|额外调味料)[:：]?",
            line,
        ):
            flush()
            mode = "sauce"
            buf = [line]
            continue
        if re.match(r"^(做法|步骤)[:：]?\s*$", line) or re.match(r"^(做法|步骤)[:：]", line):
            flush()
            mode = "steps"
            rest = re.sub(r"^(做法|步骤)[:：]\s*", "", line)
            buf = [rest] if rest else []
            continue
        buf.append(line)
    flush()
    return ingredients_text, sauce_text, steps


def estimate_time(name: str, body: str, methods: list[str], scenes: list[str]):
    if any(k in body for k in ["1小时", "60分钟", "炖1"]):
        return "约1小时", 60
    if any(k in body for k in ["30分钟", "醒发", "腌制半小时", "20分钟"]):
        return "约30分钟", 30
    if any(k in name + body for k in ["包子", "二次醒发", "牧羊人"]):
        return "约45分钟", 45
    if any(k in methods for k in ["炖焖", "煮汤", "煮粥"]):
        return "约30分钟", 30
    if "快手菜" in scenes:
        return "约10分钟", 10
    return "约15分钟", 15


def estimate_difficulty(name: str, body: str, methods: list[str]):
    if any(k in name + body for k in ["包子", "锅贴", "牧羊人", "过油肉", "二次醒发"]):
        return "进阶"
    if "炖焖" in methods:
        return "中等"
    return "简单"


def parse_recipes(raw: str) -> list[dict]:
    raw = raw.replace("\r\n", "\n").replace("\r", "\n")
    # 去掉纯注释行，保留正文
    kept = []
    for line in raw.split("\n"):
        if line.strip().startswith("#"):
            continue
        kept.append(line)
    raw = "\n".join(kept)

    pat = re.compile(r"(?m)^(\d+)\.\s*(.+?)\s*$")
    matches = list(pat.finditer(raw))
    recipes = []
    all_ings = set()

    for i, m in enumerate(matches):
        num = int(m.group(1))
        name = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
        body = raw[start:end].strip()
        ing_text, sauce_text, steps = parse_sections(body)
        ings = extract_ingredients(ing_text + "\n" + body[:300])
        cats, methods, tastes, scenes, protein = classify(name, body, ings)
        aliases = list(NAME_ALIASES.get(name, []))
        base = re.sub(r"[（(].*?[）)]", "", name).strip()
        if base and base not in aliases:
            aliases = [base] + aliases
        aliases = list(dict.fromkeys([a for a in aliases if a]))
        time_label, time_mins = estimate_time(name, body, methods, scenes)
        difficulty = estimate_difficulty(name, body, methods)
        for g in ings:
            all_ings.add(g)
        recipes.append(
            {
                "id": num,
                "name": name,
                "aliases": aliases,
                "ingredients": ings,
                "ingredientsText": ing_text or "见步骤",
                "sauceText": sauce_text,
                "steps": steps if steps else [ln for ln in body.split("\n") if ln.strip()],
                "categories": cats,
                "methods": methods,
                "tastes": tastes,
                "scenes": scenes,
                "protein": protein,
                "time": time_label,
                "timeMinutes": time_mins,
                "difficulty": difficulty,
            }
        )

    return recipes, all_ings


def build():
    if not SRC.exists():
        raise SystemExit(f"找不到菜谱源文件: {SRC}")
    raw = SRC.read_text(encoding="utf-8")
    recipes, all_ings = parse_recipes(raw)
    if not recipes:
        raise SystemExit("recipes.txt 里没有解析到任何菜谱（需要「数字.菜名」标题）")

    ing_catalog = []
    for canon in sorted(all_ings):
        aliases = ING_ALIAS.get(canon, [canon])
        if canon not in aliases:
            aliases = [canon] + list(aliases)
        ing_catalog.append({"name": canon, "aliases": list(dict.fromkeys(aliases))})

    out = {
        "app": "Mise",
        "version": "1.0.0",
        "source": "recipes.txt",
        "recipeCount": len(recipes),
        "ingredients": ing_catalog,
        "recipes": recipes,
        "facets": {
            "categories": sorted({c for r in recipes for c in r["categories"]}),
            "methods": sorted({c for r in recipes for c in r["methods"]}),
            "tastes": sorted({c for r in recipes for c in r["tastes"]}),
            "scenes": sorted({c for r in recipes for c in r["scenes"]}),
            "protein": sorted({c for r in recipes for c in r["protein"]}),
            "difficulty": ["简单", "中等", "进阶"],
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"OK: {len(recipes)} recipes -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
