/** 把 recipes.txt 解析成应用可用的数据结构（浏览器端） */
(function (global) {
  const NAME_ALIASES = {
    香菇青菜: ["炒青菜香菇"],
    酸辣土豆丝: ["土豆丝", "醋溜土豆丝", "酸辣马铃薯丝"],
    手撕包菜: ["手撕圆白菜", "爆炒包菜"],
    青椒鸡蛋: ["青椒炒蛋", "辣椒炒蛋"],
    西红柿炒鸡蛋: ["番茄炒蛋", "番茄炒鸡蛋", "西红柿炒蛋"],
    麻婆豆腐: ["麻婆", "麻辣豆腐"],
    蚂蚁上树: ["肉末粉丝", "肉沫粉条"],
    宫保鸡丁: ["宫爆鸡丁", "宫保鸡"],
    可乐鸡翅: ["可乐鸡"],
    水煮菜蘸料: ["水煮菜", "蘸料"],
    凯撒大帝: ["凯撒沙拉", "凯撒"],
    日式鸡蛋三明治: ["鸡蛋三明治", "蛋三明治"],
    东北大饭包: ["饭包", "菜包饭"],
    疙瘩汤: ["面疙瘩", "疙瘩"],
    过油肉拌面: ["过油肉", "拉条子"],
    阿朵妹土豆粉: ["土豆粉", "酸辣土豆粉"],
    韩式拌饭: ["石锅拌饭", "拌饭"],
    韩式炒年糕: ["炒年糕", "辣炒年糕"],
    铁锅炖: ["一锅炖"],
    水蒸蛋: ["蒸蛋", "鸡蛋羹", "嫩蛋"],
    上汤娃娃菜: ["娃娃菜汤"],
    醋溜娃娃菜炒肉丝: ["醋溜娃娃菜"],
    "虾米小白菜/虾皮快菜": ["虾皮小白菜", "虾米白菜", "虾皮快菜"],
    "海鲜粥 （38有虾版）": ["海鲜粥", "虾粥"],
    番茄豆皮刷刷汤: ["豆皮汤", "刷刷汤"],
    酱香茄子: ["烧茄子", "酱茄子"],
    家常豆腐: ["红烧豆腐"],
    小炒牛肉: ["牛肉小炒"],
    咸蛋黄鸡翅: ["蛋黄鸡翅"],
    韭菜鸡蛋锅贴: ["锅贴", "韭菜锅贴"],
    青椒土豆包: ["土豆包子", "青椒土豆包子"],
    徐福烩饭: ["烩饭"],
    无油地三鲜: ["地三鲜"],
    番茄肉酱意面: ["肉酱意面", "意面"],
    "杂菇小炒（也可以加五花肉片）": ["杂菇小炒", "炒蘑菇"],
    咸蛋黄蒜香南瓜: ["咸蛋黄南瓜", "蒜香南瓜"],
    "牧羊人派（2个人吃到撑的量）": ["牧羊人派"],
  };

  const ING_ALIAS = {
    土豆: ["马铃薯", "洋芋", "土豆"],
    番茄: ["西红柿", "蕃茄", "番茄"],
    青菜: ["小白菜", "油菜", "青菜"],
    包菜: ["圆白菜", "卷心菜", "莲花白", "包菜"],
    菜花: ["花菜", "花椰菜", "菜花"],
    莴笋: ["青笋", "莴苣", "莴笋"],
    蒜苔: ["蒜薹", "蒜毫", "蒜苔"],
    木耳: ["黑木耳", "木耳"],
    香菇: ["冬菇", "花菇", "香菇"],
    豆腐: ["老豆腐", "嫩豆腐", "内脂豆腐", "豆腐"],
    豆皮: ["豆腐皮", "千张", "豆皮"],
    粉条: ["粉丝", "粉条"],
    猪肉: ["猪肉丝", "猪肉馅", "猪肉沫", "里脊", "肉丝", "肉沫", "肉馅", "猪肉"],
    五花肉: ["五花", "五花肉"],
    牛肉: ["牛里脊", "牛肉"],
    牛腩: ["牛腩"],
    鸡腿: ["鸡腿肉", "鸡腿"],
    鸡翅: ["鸡翅膀", "鸡翅"],
    鸡胸肉: ["鸡胸", "鸡胸肉"],
    虾仁: ["虾", "虾仁"],
    鸡蛋: ["蛋", "鸡蛋"],
    咸蛋黄: ["咸鸭蛋黄", "咸蛋黄"],
    咸鸭蛋: ["咸蛋", "咸鸭蛋"],
    皮蛋: ["松花蛋", "皮蛋"],
    火腿: ["火腿肠", "火腿"],
    腊肠: ["香肠", "腊肠"],
    洋葱: ["葱头", "洋葱"],
    青椒: ["柿子椒", "青椒"],
    辣椒: ["干辣椒", "小米辣", "红椒", "螺丝椒", "辣椒"],
    白菜: ["大白菜", "白菜"],
    芹菜: ["西芹", "芹菜"],
    豆角: ["四季豆", "豇豆", "豆角"],
    菌菇: ["蘑菇", "杂菇", "菌菇"],
    蘑菇: ["口蘑", "蘑菇"],
    西兰花: ["绿花菜", "西兰花"],
    豆芽: ["绿豆芽", "豆芽"],
    米饭: ["剩米饭", "米饭"],
    可乐: ["无糖可乐", "可乐"],
    意面: ["意大利面", "意面"],
    拉条子: ["拉面", "拉条子"],
  };

  const ING_PATTERNS = [
    ["香菇", "香菇"],
    ["青菜|小白菜|油菜", "青菜"],
    ["菜花|花菜", "菜花"],
    ["蒜苔|蒜薹", "蒜苔"],
    ["包菜|圆白菜|卷心菜", "包菜"],
    ["虾仁|虾球", "虾仁"],
    ["莴笋|青笋", "莴笋"],
    ["土豆|马铃薯|洋芋", "土豆"],
    ["五花肉", "五花肉"],
    ["猪肉馅|猪肉沫|猪肉丝|里脊肉|肉丝|肉沫|肉馅|猪肉", "猪肉"],
    ["鸡腿肉|鸡腿", "鸡腿"],
    ["鸡胸肉|鸡胸", "鸡胸肉"],
    ["鸡翅", "鸡翅"],
    ["鸡肉|半只鸡", "鸡肉"],
    ["青椒|柿子椒", "青椒"],
    ["鸡蛋|蛋清|蛋液", "鸡蛋"],
    ["绿豆芽|豆芽", "豆芽"],
    ["菜心", "菜心"],
    ["可乐", "可乐"],
    ["洋葱", "洋葱"],
    ["番茄|西红柿", "番茄"],
    ["米线|米粉", "米线"],
    ["芹菜|西芹", "芹菜"],
    ["茄子", "茄子"],
    ["白菜|大白菜", "白菜"],
    ["豆腐(?!皮)", "豆腐"],
    ["牛腩", "牛腩"],
    ["娃娃菜", "娃娃菜"],
    ["竹笋|春笋", "竹笋"],
    ["腊肠|香肠", "腊肠"],
    ["核桃", "核桃"],
    ["火腿", "火腿"],
    ["刀削面", "刀削面"],
    ["香菜", "香菜"],
    ["牛肉|牛里脊", "牛肉"],
    ["意面|意大利面", "意面"],
    ["蘑菇|口蘑", "蘑菇"],
    ["吐司|面包", "吐司"],
    ["咸鸭蛋|咸蛋(?!黄)", "咸鸭蛋"],
    ["咸蛋黄", "咸蛋黄"],
    ["大米|米饭|剩米饭", "米饭"],
    ["花生", "花生"],
    ["生菜", "生菜"],
    ["丸子|肉丸", "丸子"],
    ["粉丝|粉条", "粉条"],
    ["细面|挂面", "面条"],
    ["糯米笋", "糯米笋"],
    ["木耳|黑木耳", "木耳"],
    ["面粉", "面粉"],
    ["拉条子|拉面", "拉条子"],
    ["西葫芦|角瓜", "西葫芦"],
    ["辣皮子|红辣椒|小米辣|干辣椒|螺丝椒", "辣椒"],
    ["年糕", "年糕"],
    ["土豆粉", "土豆粉"],
    ["豆角|四季豆|豇豆", "豆角"],
    ["韭菜", "韭菜"],
    ["菠菜", "菠菜"],
    ["南瓜", "南瓜"],
    ["牛排", "牛排"],
    ["油麦菜|莜麦菜", "油麦菜"],
    ["西兰花|青花菜", "西兰花"],
    ["荷兰豆", "荷兰豆"],
    ["冬瓜", "冬瓜"],
    ["排骨", "排骨"],
    ["豆腐皮|豆皮|千张", "豆皮"],
    ["鲫鱼", "鲫鱼"],
    ["菌菇|杂菇", "菌菇"],
    ["皮蛋|松花蛋", "皮蛋"],
    ["咖喱", "咖喱"],
  ];

  function extractIngredients(text) {
    const lines = text
      .split("\n")
      .filter(
        (line) =>
          /^(食材|材料|面团|肉馅)/.test(line) ||
          line.includes("食材：") ||
          line.includes("食材:")
      );
    const blob = lines.length ? lines.join("\n") : text.slice(0, 400);
    const found = [];
    const seen = new Set();
    ING_PATTERNS.forEach(([pat, canon]) => {
      if (new RegExp(pat).test(blob) && !seen.has(canon)) {
        seen.add(canon);
        found.push(canon);
      }
    });
    return found;
  }

  function classify(name, body, ings) {
    const text = name + body;
    let methods = [];
    if (/炖|煲|焖/.test(text)) methods.push("炖焖");
    if (text.includes("蒸") || name.includes("水蒸")) methods.push("蒸");
    if (text.includes("卤")) methods.push("卤");
    if (/炸|空气炸/.test(text)) methods.push("炸烤");
    if (/凉拌|拌菜|蘸料/.test(text)) methods.push("凉拌");
    if (name.includes("粥")) methods = ["煮粥"];
    else if (name.includes("汤")) methods = ["煮汤"];
    else if (/包|锅贴|饭包/.test(name)) methods.push("面点");
    if (!methods.length) methods.push("炒");
    methods = [...new Set(methods)];

    const cats = [];
    if (/面|饭|米线|粥|意面|年糕|土豆粉|烩饼|三明治|拌饭/.test(name))
      cats.push("主食");
    if (/包|锅贴/.test(name)) cats.push("面点包子");
    if (name.includes("汤") || name.includes("煲")) cats.push("汤煲");
    if (name.includes("粥")) cats.push("粥品");
    if (ings.includes("虾仁") || ings.includes("鲫鱼") || name.includes("海鲜"))
      cats.push("海鲜");
    const meat = [
      "猪肉",
      "五花肉",
      "牛肉",
      "牛腩",
      "鸡腿",
      "鸡胸肉",
      "鸡翅",
      "鸡肉",
      "排骨",
      "丸子",
      "牛排",
    ];
    if (meat.some((k) => ings.includes(k))) cats.push("荤菜");
    const vegOnly = !meat
      .concat(["虾仁", "鲫鱼", "火腿", "腊肠"])
      .some((k) => ings.includes(k));
    if (vegOnly && ings.includes("鸡蛋")) cats.push("蛋类");
    if (vegOnly && !ings.includes("鸡蛋")) cats.push("素菜");
    if (/韩式|日式|意面|凯撒|咖喱|牧羊人/.test(name)) cats.push("异国风味");
    if (!cats.length) cats.push("家常菜");
    if (
      !cats.join("").includes("家常") &&
      !cats.includes("主食") &&
      !cats.includes("汤煲")
    ) {
      cats.push("家常菜");
    }

    const tastes = [];
    if (/酸辣|醋|陈醋/.test(text)) tastes.push("酸辣");
    if (/麻婆|麻辣|花椒|辣椒粉|豆瓣/.test(text)) tastes.push("麻辣");
    if (/番茄|西红柿|茄汁/.test(text)) tastes.push("番茄味");
    if (/酱香|黄豆酱|甜面酱|豆瓣酱/.test(text)) tastes.push("酱香");
    if (/蒜香|蒜蓉/.test(text)) tastes.push("蒜香");
    if (/可乐|蜜汁/.test(text)) tastes.push("微甜");
    if (/清淡|白灼|清炒/.test(text) || /^(白灼|清炒)/.test(name))
      tastes.push("清淡");
    if (!tastes.length) tastes.push("咸鲜");

    return {
      categories: [...new Set(cats)],
      methods,
      tastes: [...new Set(tastes)],
    };
  }

  function parseSections(body) {
    let ingredientsText = "";
    let sauceText = "";
    const steps = [];
    let mode = null;
    let buf = [];

    function flush() {
      const text = buf.join("\n").trim();
      buf = [];
      if (!text) return;
      if (mode === "ing") {
        ingredientsText = ingredientsText
          ? ingredientsText + "\n" + text
          : text;
      } else if (mode === "sauce") {
        sauceText = sauceText ? sauceText + "\n" + text : text;
      } else {
        text.split("\n").forEach((ln) => {
          if (ln.trim()) steps.push(ln.trim());
        });
      }
    }

    body.split("\n").forEach((line) => {
      line = line.replace(/\s+$/, "");
      if (/^(食材|材料|面团部分|肉馅部分|面发好后)[:：]?/.test(line)) {
        flush();
        mode = "ing";
        buf = [line.replace(/^(食材|材料)[:：]\s*/, "")];
        return;
      }
      if (
        /^(料汁|调料|腌肉料汁|腌虾仁料汁|炒肉料汁|炒菜料汁|额外调味料)[:：]?/.test(
          line
        )
      ) {
        flush();
        mode = "sauce";
        buf = [line];
        return;
      }
      if (/^(做法|步骤)[:：]?\s*$/.test(line) || /^(做法|步骤)[:：]/.test(line)) {
        flush();
        mode = "steps";
        const rest = line.replace(/^(做法|步骤)[:：]\s*/, "");
        buf = rest ? [rest] : [];
        return;
      }
      buf.push(line);
    });
    flush();
    return { ingredientsText, sauceText, steps };
  }

  function estimateTime(name, body, methods) {
    if (/1小时|60分钟|炖1/.test(body)) return { time: "约1小时", timeMinutes: 60 };
    if (/30分钟|醒发|腌制半小时|20分钟/.test(body))
      return { time: "约30分钟", timeMinutes: 30 };
    if (/包子|二次醒发|牧羊人/.test(name + body))
      return { time: "约45分钟", timeMinutes: 45 };
    if (methods.some((m) => ["炖焖", "煮汤", "煮粥"].includes(m)))
      return { time: "约30分钟", timeMinutes: 30 };
    if (!/炖|焖|包子/.test(name)) return { time: "约10分钟", timeMinutes: 10 };
    return { time: "约15分钟", timeMinutes: 15 };
  }

  function parseRecipesTxt(raw) {
    raw = String(raw || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    const kept = raw
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");

    const re = /^(\d+)\.\s*(.+?)\s*$/gm;
    const matches = [];
    let m;
    while ((m = re.exec(kept))) {
      matches.push({
        index: m.index,
        end: m.index + m[0].length,
        id: Number(m[1]),
        name: m[2].trim(),
      });
    }

    const recipes = [];
    const allIngs = new Set();

    matches.forEach((item, i) => {
      const start = item.end;
      const end = i + 1 < matches.length ? matches[i + 1].index : kept.length;
      const body = kept.slice(start, end).trim();
      const sections = parseSections(body);
      const ingredients = extractIngredients(
        (sections.ingredientsText || "") + "\n" + body.slice(0, 300)
      );
      ingredients.forEach((g) => allIngs.add(g));
      const facets = classify(item.name, body, ingredients);
      const base = item.name.replace(/[（(].*?[）)]/g, "").trim();
      const aliases = [base]
        .concat(NAME_ALIASES[item.name] || [])
        .filter(Boolean);
      const uniqAliases = [...new Set(aliases)];
      const t = estimateTime(item.name, body, facets.methods);
      recipes.push({
        id: item.id,
        name: item.name,
        aliases: uniqAliases,
        ingredients,
        ingredientsText: sections.ingredientsText || "见步骤",
        sauceText: sections.sauceText || "",
        steps:
          sections.steps.length > 0
            ? sections.steps
            : body.split("\n").map((s) => s.trim()).filter(Boolean),
        categories: facets.categories,
        methods: facets.methods,
        tastes: facets.tastes,
        time: t.time,
        timeMinutes: t.timeMinutes,
      });
    });

    const ingredients = [...allIngs].sort().map((name) => ({
      name,
      aliases: ING_ALIAS[name] || [name],
    }));

    return {
      app: "Mise",
      source: "recipes.txt",
      recipeCount: recipes.length,
      ingredients,
      recipes,
      facets: {
        categories: [
          ...new Set(recipes.flatMap((r) => r.categories || [])),
        ].sort(),
        methods: [
          ...new Set(recipes.flatMap((r) => r.methods || [])),
        ].sort(),
        tastes: [...new Set(recipes.flatMap((r) => r.tastes || []))].sort(),
      },
    };
  }

  global.MiseParseRecipesTxt = parseRecipesTxt;
})(typeof window !== "undefined" ? window : globalThis);
