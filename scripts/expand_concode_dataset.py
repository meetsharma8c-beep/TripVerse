#!/usr/bin/env python3
"""
═════════════════════════════════════════════════════════════════════════════════
TripVerse • ConCode AI Training Dataset Expander (expand_concode_dataset.py)
═════════════════════════════════════════════════════════════════════════════════
Automates high-throughput synthetic conversation generation using Groq's
high-capacity teacher model (openai/gpt-oss-20b).
Generates gold-standard training data embedding:
- Slang, Hinglish & conversational shorthand translation
- Multi-constraint decomposition with exact ₹ rupee splits
- 2-Option decision humility & trade-offs
- Mandatory [STATE:idle], [STATE:excited], [STATE:warning] tags

Run with: python3 scripts/expand_concode_dataset.py
"""

import os
import sys
import json
import time
from urllib.request import Request, urlopen

SYSTEM_PROMPT = """You are CONCODE (acting as ARGON in the UI), the official AI travel architect for TripVerse (trip-verse.com).
Core Operating Rules:
1. AVATAR STATE CONTRACT: You MUST begin EVERY response with exactly ONE tag: [STATE:idle], [STATE:excited], or [STATE:warning].
   - [STATE:idle] for general planning, calm breakdowns, and advice.
   - [STATE:excited] for locked itineraries, great deals, and confirmed decisions.
   - [STATE:warning] for weather risks, unsafe driving hours, tight connections, or budget alerts.
2. SLANG, SHORTHAND & HINGLISH DECODER: Effortlessly decode texting shorthand (rn, wknd, ngl, tbh, b/w, w/, ppl, pax, 15k = ₹15,000, bcz/cuz, idk) and casual Hinglish (bhai, yaar, scene banao, sasta, jugaad, nikalna hai, sorted, cooked). Never correct grammar—respond with warm, grounded intelligence.
3. LONG-QUERY DECOMPOSITION: Extract every hard constraint (headcount, exact ₹ budget, transport mode, dates, non-negotiables). Answer every sub-question using concrete numbers, highway names, timings, and realistic ₹ budget splits. No vague textbook summaries.
4. 2-OPTION DECISION FRAMEWORK & HUMILITY: Validate & Anchor -> Present Best Recommendation (Option A) + 1 Alternative (Option B) with explicit trade-offs -> Proactive Safeguards (monsoons, mountain road curves) -> Humble Hand-off ("Which feels right for you?"). If corrected, immediately own it with gracious accountability.
5. DESTINATION != STATION: Never hallucinate direct flights/trains where none exist. Calculate transfer distance and local taxi/bus links."""

EXPANSION_PROMPTS = [
    {
        "category": "Slang & Low-Budget Group Trip",
        "user_prompt": "bro 4 dost hai 15k total budget scene banao this wknd jaipur se rishikesh ya manali?? bike rent krni hai night drive allowed nhi hai parents ka scene hai"
    },
    {
        "category": "Elderly Parents & High-Altitude Caution",
        "user_prompt": "hi argon planning 6 days in leh ladakh next month w/ my parents (both 65+) on 80k budget ex flights pls tell if nubra valley and pangong tso both are safe for their age or what route to take"
    },
    {
        "category": "Remote Software Dev Workation",
        "user_prompt": "hey 2 devs here needing 10 days workation in south india under 35k per person w/ reliable wifi 50+ mbps and power backup compare munnar vs varkala vs ooty for work setup"
    },
    {
        "category": "Monsoon Road & Trek Warning",
        "user_prompt": "planning to trek triund from dharamshala this saturday w/ 3 college friends heavy rain forecast dikha raha hai is it safe to camp at top or should we cancel??"
    },
    {
        "category": "Direct User Correction (Humility)",
        "user_prompt": "bhai tune shimla toy train ka route galat bataya kalka se shimla chalti hai chandigarh se nahi fix your itinerary"
    },
    {
        "category": "Romantic Couple Minimalist Pacing",
        "user_prompt": "plan 4 days romantic trip for couple from bangalore in nov budget 25k total we want lush greenery and minimal crowd coorg vs wayanad vs chikkamagaluru which has best homestays"
    },
    {
        "category": "Backpacker Solo Budget Math",
        "user_prompt": "solo backpacker 7 days varanasi + prayagraj + ayodhya from kolkata train se budget max 12k hostel stays only pure veg street food trail breakdown do"
    },
    {
        "category": "Family Flight Delay Replanning",
        "user_prompt": "our flight to goa got delayed by 5 hours we missed our car rental pickup and day 1 dinner reservation at south goa resort what should we do rn to save day 1"
    },
    {
        "category": "Winter Snowstorm & Roadblock Advisory",
        "user_prompt": "we are stuck in solang valley heavy snow started and cab driver says atal tunnel is closed for next 24 hours we have hotel booked in sissu what is our backup plan"
    },
    {
        "category": "Student Local Train Budget Route",
        "user_prompt": "bro 4 college students hai total budget strictly 10k mumbai se matheran ya lonavala 2 days local train se jana hai sasta stay aur trek route bata"
    },
    {
        "category": "Sacred Heritage & Senior Accessibility",
        "user_prompt": "plan 3 days amritsar trip for family of 4 w/ grandmother who needs wheelchair golden temple and wagah border budget 20k total ex delhi train"
    },
    {
        "category": "Monsoon Houseboat vs Hill Station Trade-off",
        "user_prompt": "5 days kerala trip in july monsoon for couple budget 30k total should we do alleppey houseboat or munnar tea hills which is safer in rain"
    },
    {
        "category": "Solo Female Traveler Safety & Transit",
        "user_prompt": "solo female trip 5 days rajasthan udaipur + jodhpur budget 20k hostel stays only need safe transit hours verified female dorms and night walking safety reality check"
    },
    {
        "category": "EV Road Trip Range & Fast Charger Logistics",
        "user_prompt": "delhi to jaipur road trip in nexon ev 40.5 kwh battery 3 friends weekend trip how many charging stops needed charging apps and highway food spots breakdown"
    },
    {
        "category": "Tatkal Waitlist & Rail Transit Recovery",
        "user_prompt": "mumbai to goa train waitlist wl 42 confirmed nahi hua travel tomorrow morning tatkal trick fail budget max 2k per pax what are my bus or alternative train options rn"
    },
    {
        "category": "High-Altitude AMS Acclimatization in Spiti",
        "user_prompt": "first time spiti valley road trip 8 days from chandigarh w/ 3 friends do we take shimla route or manali route to avoid acute mountain sickness ams and oxygen issues"
    },
    {
        "category": "Flight Cancellation & DGCA Rights",
        "user_prompt": "indigo flight from bangalore to varanasi cancelled 3 hrs before departure next flight is tomorrow evening i have wedding to attend tomorrow noon what are my dgca compensation rights and emergency backup"
    },
    {
        "category": "International Budget Trip Math (Vietnam/Thailand)",
        "user_prompt": "first international trip 7 days vietnam or thailand budget strictly 50k inr per person including flights from delhi e-visa currency exchange and hostel stays breakdown"
    },
    {
        "category": "Senior Citizen Char Dham Helicopter vs Road",
        "user_prompt": "planning kedarnath and badrinath for my 68 yr old father who has mild knee arthritis is helicopter mandatory or can we manage via doli pony what is total cost and medical advisory"
    },
    {
        "category": "Scuba Diving & Andaman Marine Safety",
        "user_prompt": "4 days havelock island scuba diving trip in nov first time diver budget 30k ex port blair compare shore dive vs boat dive and padi discovery scuba safety protocols"
    }
]

def get_groq_api_key():
    key = os.environ.get("GROQ_API_KEY", "")
    if key:
        return key
    for fname in [".env.development.local", ".env.local", ".env"]:
        fpath = os.path.join(os.path.dirname(__file__), "..", fname)
        if os.path.exists(fpath):
            with open(fpath) as f:
                for line in f:
                    if line.startswith("GROQ_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

def generate_conversation(api_key: str, user_prompt: str, retries: int = 3) -> str:
    # Use openai/gpt-oss-20b which has high rate limits and fast generation on Groq
    payload = {
        "model": "openai/gpt-oss-20b",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.65,
        "max_completion_tokens": 1500
    }

    req = Request(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "TripVerse/1.0"
        },
        data=json.dumps(payload).encode("utf-8")
    )

    for attempt in range(retries):
        try:
            with urlopen(req, timeout=30) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                content = res["choices"][0]["message"].get("content", "").strip()
                if not content:
                    # Fallback to reasoning if content is empty
                    content = res["choices"][0]["message"].get("reasoning", "").strip()
                return content
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                wait_time = 10 * (attempt + 1)
                print(f"      ⏳ Rate limit hit, backing off for {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise e

def expand_dataset():
    api_key = get_groq_api_key()
    if not api_key:
        print("❌ GROQ_API_KEY not found in environment or .env files.")
        sys.exit(1)

    dataset_path = os.path.join(os.path.dirname(__file__), "..", "datasets", "concode_sft_dataset.jsonl")
    os.makedirs(os.path.dirname(dataset_path), exist_ok=True)

    print("═════════════════════════════════════════════════════════════════════════")
    print("🚀 Expanding ConCode SFT Dataset via Groq Teacher Model (gpt-oss-20b)")
    print("═════════════════════════════════════════════════════════════════════════")

    existing_prompts = set()
    if os.path.exists(dataset_path):
        with open(dataset_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        record = json.loads(line)
                        for msg in record.get("messages", []):
                            if msg.get("role") == "user":
                                existing_prompts.add(msg.get("content", "").strip())
                    except Exception:
                        pass

    new_records = []
    for item in EXPANSION_PROMPTS:
        user_prompt = item["user_prompt"]
        if user_prompt in existing_prompts:
            print(f"⏩ Already present: [{item['category']}]")
            continue

        print(f"✨ Generating scenario: [{item['category']}]...")
        try:
            response = generate_conversation(api_key, user_prompt)
            # Ensure response starts with valid [STATE:...] tag
            if not response.startswith("[STATE:"):
                # Infer state from text
                lower = response.lower()
                if any(w in lower for w in ["warning", "caution", "closed", "delay", "rain", "cancel"]):
                    state = "warning"
                elif any(w in lower for w in ["excited", "sorted", "locked", "booked", "great"]):
                    state = "excited"
                else:
                    state = "idle"
                response = f"[STATE:{state}] {response}"

            record = {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": response}
                ]
            }
            new_records.append(record)
            existing_prompts.add(user_prompt)
            print(f"   ✅ Successfully added ({len(response)} chars, Tag: {response[:15]}...)")
            time.sleep(2.0) # gentle pacing
        except Exception as e:
            print(f"   ⚠️ Error generating scenario: {e}")

    if new_records:
        with open(dataset_path, "a", encoding="utf-8") as f:
            for record in new_records:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        print(f"\n🎉 Successfully added {len(new_records)} new gold-standard training dialogues to {dataset_path}!")
    else:
        print("\n✅ Dataset is already up to date with all target scenarios.")

if __name__ == "__main__":
    expand_dataset()
