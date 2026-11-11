#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a compact CET-4 word list from KyleBing/english-vocabulary (BSD-3-Clause)."""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

# Original short example sentences for entries that had none in the source.
# Used for listening practice; not taken from exam papers.
ORIGINAL_EXAMPLES = {
    "accessary": (
        "The driver was charged as an accessary to the crime.",
        "那名司机被指控为该案的从犯。",
    ),
    "according": (
        "We acted according to the plan.",
        "我们按计划行事。",
    ),
    "across": (
        "She walked across the quiet street.",
        "她走过那条安静的街道。",
    ),
    "advocator": (
        "He is a strong advocator of public education.",
        "他是公共教育的坚定倡导者。",
    ),
    "all": (
        "All the students arrived on time.",
        "所有学生都准时到了。",
    ),
    "approximately": (
        "The trip will take approximately two hours.",
        "这次行程大约需要两个小时。",
    ),
    "astronaut": (
        "The astronaut looked back at the Earth from space.",
        "宇航员在太空中回望地球。",
    ),
    "avail": (
        "All our efforts did not avail in the end.",
        "我们所有的努力最终还是没有奏效。",
    ),
    "awfully": (
        "I am awfully sorry for the delay.",
        "对这次延误，我非常抱歉。",
    ),
    "barn": (
        "The farmer stored hay in the old barn.",
        "农夫把干草存放在旧谷仓里。",
    ),
    "basketball": (
        "They play basketball after class every Friday.",
        "他们每周五课后打篮球。",
    ),
    "bathroom": (
        "Please wash your hands in the bathroom.",
        "请在洗手间洗手。",
    ),
    "behalf": (
        "She spoke on behalf of the whole team.",
        "她代表整个团队发言。",
    ),
    "behavior": (
        "His polite behavior impressed the guests.",
        "他礼貌的举止给客人留下了印象。",
    ),
    "blanket": (
        "She pulled the blanket over her shoulders.",
        "她把毯子拉到肩上。",
    ),
    "both": (
        "Both answers are correct in this case.",
        "在这种情况下两个答案都对。",
    ),
    "bound": (
        "The train is bound for Shanghai tonight.",
        "这趟列车今晚开往上海。",
    ),
    "brute": (
        "He acted like a brute and scared the children.",
        "他表现得像个蛮人，把孩子们吓坏了。",
    ),
    "can": (
        "She opened a can of tomatoes for dinner.",
        "她打开一罐番茄来做晚饭。",
    ),
    "cart": (
        "The vendor pushed a heavy cart down the road.",
        "小贩推着一辆沉重的手推车沿路走去。",
    ),
    "catalog": (
        "I found the book in the library catalog.",
        "我在图书馆目录里找到了这本书。",
    ),
    "China": (
        "Many students in China take the Band 4 exam.",
        "中国有许多学生参加大学英语四级考试。",
    ),
    "colonel": (
        "The colonel gave a short speech to the soldiers.",
        "上校向士兵作了简短讲话。",
    ),
    "color": (
        "Blue is her favorite color.",
        "蓝色是她最喜欢的颜色。",
    ),
    "connexion": (
        "There is a close connexion between diet and health.",
        "饮食与健康之间有密切联系。",
    ),
    "could": (
        "She could hear the rain on the roof.",
        "她能听到雨打在屋顶上的声音。",
    ),
    "course": (
        "This history course lasts one semester.",
        "这门历史课持续一个学期。",
    ),
    "delightful": (
        "We had a delightful afternoon in the park.",
        "我们在公园里度过了一个愉快的下午。",
    ),
    "desk": (
        "His books were piled high on the desk.",
        "他的书高高堆在书桌上。",
    ),
    "difficulty": (
        "She had difficulty falling asleep.",
        "她入睡有困难。",
    ),
    "direction": (
        "They walked in the direction of the river.",
        "他们朝河的方向走去。",
    ),
    "donkey": (
        "A donkey was eating grass by the fence.",
        "一只驴在篱笆旁吃草。",
    ),
    "downfall": (
        "Pride led to his downfall.",
        "骄傲导致了他的垮台。",
    ),
    "dragon": (
        "The story is about a dragon and a brave girl.",
        "这个故事讲的是一条龙和一个勇敢的女孩。",
    ),
    "dramatically": (
        "Prices have fallen dramatically this year.",
        "今年物价大幅下降。",
    ),
    "either": (
        "You may take either road to the station.",
        "两条路你走哪一条都可以到车站。",
    ),
    "England": (
        "He spent a summer studying in England.",
        "他在英格兰度过了一个学习的夏天。",
    ),
    "everybody": (
        "Everybody was silent when the teacher came in.",
        "老师进来时大家都安静了。",
    ),
    "farmer": (
        "The farmer got up early to milk the cows.",
        "农夫很早就起床挤牛奶。",
    ),
    "favor": (
        "Would you do me a favor and close the window?",
        "请帮我一个忙，把窗户关上好吗？",
    ),
    "favorable": (
        "The committee gave a favorable reply.",
        "委员会给出了赞同的答复。",
    ),
    "flour": (
        "She mixed flour and water to make dough.",
        "她把面粉和水混合起来做面团。",
    ),
    "France": (
        "They will travel through France by train.",
        "他们将乘火车穿越法国。",
    ),
    "from": (
        "The letter is from my old classmate.",
        "这封信来自我的老同学。",
    ),
    "fulfill": (
        "He worked hard to fulfill his promise.",
        "他努力兑现自己的诺言。",
    ),
    "generalization": (
        "Be careful of making a hasty generalization.",
        "小心不要匆忙作出泛泛的概括。",
    ),
    "Germany": (
        "She studied engineering in Germany for two years.",
        "她在德国学了两年工程。",
    ),
    "gown": (
        "The doctor put on a white gown before the operation.",
        "医生在手术前穿上了白大褂。",
    ),
    "gramme": (
        "The package weighs only fifty grammes.",
        "这个包裹只有五十克重。",
    ),
    "groundlessly": (
        "They groundlessly accused him of cheating.",
        "他们毫无根据地指责他作弊。",
    ),
    "guitar": (
        "He is learning to play the guitar this term.",
        "他这学期在学弹吉他。",
    ),
    "gunpowder": (
        "Gunpowder was used in early fireworks.",
        "火药曾用于早期的烟花。",
    ),
    "hardworking": (
        "She is a hardworking student in our class.",
        "她是我们班里勤奋的学生。",
    ),
    "hawk": (
        "A hawk circled high above the field.",
        "一只鹰在田野上空盘旋。",
    ),
    "headquarter": (
        "The company will headquarter its research team in Nanjing.",
        "公司将把研究团队的总部设在南京。",
    ),
    "honor": (
        "We honor the teachers who helped us grow.",
        "我们向帮助我们成长的老师致敬。",
    ),
    "impermanency": (
        "The impermanency of fame should not surprise us.",
        "名声的短暂不应让我们惊讶。",
    ),
    "installment": (
        "She paid for the laptop in monthly installments.",
        "她按月分期付款买了这台笔记本电脑。",
    ),
    "irrationally": (
        "He irrationally refused a perfectly good offer.",
        "他毫无道理地拒绝了一个很好的提议。",
    ),
    "Italian": (
        "She ordered Italian food for her birthday.",
        "她生日时点了意大利菜。",
    ),
    "Japan": (
        "Mount Fuji is a famous symbol of Japan.",
        "富士山是日本著名的象征。",
    ),
    "lead": (
        "These old pipes were made of lead.",
        "这些旧管道是铅做的。",
    ),
    "locomotive": (
        "The locomotive pulled a long line of carriages.",
        "火车头牵引着一长串车厢。",
    ),
    "logically": (
        "Logically, the second plan is safer.",
        "从逻辑上讲，第二个方案更安全。",
    ),
    "meadow": (
        "Cows were grazing in the green meadow.",
        "牛在绿色的草地上吃草。",
    ),
    "mold": (
        "Damp air can cause mold on the wall.",
        "潮湿的空气会使墙上发霉。",
    ),
    "motivation": (
        "Her strong motivation helped her pass the exam.",
        "强烈的动力帮助她通过了考试。",
    ),
    "oar": (
        "He dropped an oar into the river.",
        "他把一只桨掉进了河里。",
    ),
    "occasionally": (
        "We occasionally meet at the campus cafe.",
        "我们偶尔会在校园咖啡馆见面。",
    ),
    "okay": (
        "Everything will be okay after a short rest.",
        "稍作休息后一切都会好起来。",
    ),
    "ought": (
        "You ought to review the words every day.",
        "你应该每天复习这些单词。",
    ),
    "ox": (
        "An ox was pulling a wooden cart.",
        "一头牛在拉一辆木车。",
    ),
    "passively": (
        "He sat passively and did not join the discussion.",
        "他被动地坐着，没有参加讨论。",
    ),
    "pick": (
        "The worker carried a heavy pick on his shoulder.",
        "工人肩上扛着一把沉重的镐。",
    ),
    "prefer": (
        "I prefer tea to coffee in the morning.",
        "早上我更喜欢喝茶而不是咖啡。",
    ),
    "probably": (
        "It will probably rain later this afternoon.",
        "今天下午晚些时候很可能会下雨。",
    ),
    "prohibitively": (
        "The tickets were prohibitively expensive for students.",
        "对学生来说，这些票贵得让人望而却步。",
    ),
    "prosper": (
        "The small town began to prosper after the factory opened.",
        "工厂开张后，这座小镇开始繁荣起来。",
    ),
    "providing": (
        "You can go out, providing you finish your homework first.",
        "只要你先完成作业，就可以出去。",
    ),
    "radically": (
        "The new policy radically changed our schedule.",
        "新政策彻底改变了我们的日程。",
    ),
    "really": (
        "Do you really understand this sentence?",
        "你真的理解这句话吗？",
    ),
    "refrigerator": (
        "Please put the milk back in the refrigerator.",
        "请把牛奶放回冰箱。",
    ),
    "reservoir": (
        "The reservoir supplies water to the whole city.",
        "这座水库为整个城市供水。",
    ),
    "ring": (
        "The two boxers stepped into the ring.",
        "两名拳击手走进了拳击台。",
    ),
    "scary": (
        "The dark forest looked scary at night.",
        "夜晚的黑森林看起来很可怕。",
    ),
    "silver": (
        "The medal was made of silver, not gold.",
        "这枚奖牌是银的，不是金的。",
    ),
    "sulfur": (
        "Sulfur has a strong, sharp smell.",
        "硫磺有一股强烈的刺鼻气味。",
    ),
    "sweater": (
        "She wore a warm sweater in the cold wind.",
        "她在寒风中穿着一件暖和的毛衣。",
    ),
    "temple": (
        "Visitors took off their hats at the temple.",
        "游客在寺庙里脱下了帽子。",
    ),
    "tighten": (
        "Please tighten the screw so it will not fall out.",
        "请把螺丝拧紧，以免它掉出来。",
    ),
    "trait": (
        "Honesty is an important trait in a friend.",
        "诚实是朋友身上一项重要的特质。",
    ),
    "waggon": (
        "The waggon was loaded with fresh vegetables.",
        "马车上装满了新鲜蔬菜。",
    ),
    "whilst": (
        "He read the news whilst waiting for the bus.",
        "他等公交车的时候看新闻。",
    ),
}

SKIP_TYPOS = {"reservior"}  # obvious misspelling of reservoir


def clean_space(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def pick_phonetic(items: list[dict]) -> str:
    for key in ("us", "uk"):
        for it in items:
            raw = clean_space(it.get(key) or "")
            if not raw:
                continue
            first = raw.split(";")[0].strip()
            first = first.strip("/[]")
            if first:
                return first
    return ""


def split_glosses(text: str) -> list[str]:
    parts = re.split(r"[；;]", text or "")
    out = []
    for p in parts:
        p = clean_space(p).strip(" ，,")
        if p:
            out.append(p)
    return out


def compact_glosses(parts: list[str], limit: int = 3) -> list[str]:
    seen = []
    for p in parts:
        p = clean_space(p).strip(" ，,")
        p = re.sub(r"\s*，\s*", "，", p)
        p = re.sub(r"\s*,\s*", "，", p)
        if p and p not in seen:
            seen.append(p)
    rich = []
    for p in sorted(seen, key=len, reverse=True):
        if any(p != k and p in k for k in rich):
            continue
        rich.append(p)
    return [p for p in seen if p in rich][:limit]


def merge_meanings(items: list[dict]) -> str:
    by_pos: dict[str, list[str]] = {}
    order: list[str] = []
    for it in items:
        for t in it.get("translations") or []:
            pos = clean_space(t.get("type") or "").lower()
            chunks = split_glosses(t.get("translation") or "")
            if not chunks:
                continue
            if pos not in by_pos:
                by_pos[pos] = []
                order.append(pos)
            by_pos[pos].extend(chunks)
    parts = []
    for pos in order:
        glosses = compact_glosses(by_pos[pos], 3)
        if not glosses:
            continue
        gloss = "；".join(glosses)
        parts.append(f"{pos}. {gloss}" if pos else gloss)
    meaning = " ".join(parts)
    if len(meaning) > 56:
        # trim on a separator so we don't cut a character in half
        cut = meaning[:56]
        for sep in ("；", "，", " ", "."):
            i = cut.rfind(sep)
            if i >= 24:
                cut = cut[:i]
                break
        meaning = cut.rstrip("；;，, ")
    return meaning


def sentence_score(word: str, sent: str) -> tuple:
    s = sent or ""
    n = len(s)
    # prefer sentences that contain the word (or a close inflection)
    has = 1 if re.search(rf"\b{re.escape(word)}\w*\b", s, re.I) else 0
    # prefer mid length
    length_pen = abs(n - 60)
    if n < 12 or n > 160:
        length_pen += 80
    return (has, -length_pen, -n)


def pick_sentence(word: str, items: list[dict]) -> tuple[str, str, bool]:
    cands = []
    for it in items:
        for s in it.get("sentences") or []:
            en = clean_space(s.get("sentence") or "")
            zh = clean_space(s.get("translation") or "")
            # drop very noisy notes in parentheses if the whole sentence is messy? keep as-is but strip double spaces
            if en:
                cands.append((en, zh))
    if cands:
        en, zh = max(cands, key=lambda x: sentence_score(word, x[0]))
        return en, zh, False
    key = word
    if key not in ORIGINAL_EXAMPLES:
        # try case variants
        for k in ORIGINAL_EXAMPLES:
            if k.lower() == word.lower():
                key = k
                break
    if key in ORIGINAL_EXAMPLES:
        en, zh = ORIGINAL_EXAMPLES[key]
        return en, zh, True
    # last resort simple original sentence
    return (f"Please remember the word \"{word}\".", f"请记住单词“{word}”。", True)


def pick_phrase(word: str, items: list[dict]) -> str:
    cands = []
    for it in items:
        for p in it.get("phrases") or []:
            ph = clean_space(p.get("phrase") or "")
            if not ph:
                continue
            # skip too long or odd phrases
            if 3 <= len(ph) <= 28 and " " in ph:
                cands.append(ph)
    if not cands:
        return ""
    # prefer phrases that start with or contain the word clearly
    def pscore(ph: str):
        has = 1 if re.search(rf"\b{re.escape(word)}\b", ph, re.I) else 0
        return (has, -len(ph))
    return max(cands, key=pscore)


def main() -> int:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/vocab-src/cet4.jsonl")
    dest = Path(sys.argv[2] if len(sys.argv) > 2 else "/workspace/cet4-app/data/words.json")
    by: dict[str, list] = defaultdict(list)
    order = []
    for line in src.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        w = (obj.get("word") or "").strip()
        if not w or w.lower() in SKIP_TYPOS:
            continue
        key = w.lower()
        if key not in by:
            order.append(key)
        by[key].append(obj)

    words = []
    original_count = 0
    missing_phon = 0
    for key in order:
        items = by[key]
        # preserve original capitalization of the first occurrence
        word = items[0]["word"].strip()
        phon = pick_phonetic(items)
        if not phon:
            missing_phon += 1
        meaning = merge_meanings(items)
        if not meaning:
            continue
        en, zh, is_orig = pick_sentence(word, items)
        if is_orig:
            original_count += 1
        phrase = pick_phrase(word, items)
        entry = {"w": word, "p": phon, "m": meaning, "e": en, "c": zh}
        if phrase:
            entry["ph"] = phrase
        words.append(entry)

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(words, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size = dest.stat().st_size
    print(f"wrote {len(words)} words, {size} bytes, original examples {original_count}, no phonetic {missing_phon}")
    # sanity
    assert 2000 <= len(words) <= 8000
    for w in words:
        assert w["w"] and w["m"] and w["e"]
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
