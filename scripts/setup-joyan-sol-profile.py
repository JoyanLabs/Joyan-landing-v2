#!/usr/bin/env python3
"""Register the `joyan-sol` agent-model profile for Joyan-landing-v2.

Run this yourself in a terminal (model tools are not allowed to edit
~/.pi/gentle-ai routing). Idempotent: safe to run more than once.

    python3 scripts/setup-joyan-sol-profile.py

What it does:
  1. Backs up ~/.pi/gentle-ai/profiles.json (timestamped sibling).
  2. Builds the `joyan-sol` routing: full copy of the current effective
     routing (models.json) with these upgrades:
       - orchestrator      -> nan/deepseek-v4-flash        high   (per user: glm or deepseek, same; thinking high)
       - gentle-ai-worker  -> openai/gpt-6.1-sol           high   (page code + taste)
       - gentle-ai-verify  -> openai/gpt-6.1-sol           high   (per user 2026-10-29: more gpt-6.1-sol where necessary)
       - sdd-verify        -> openai/gpt-6.1-sol           high   (per user 2026-10-29: more gpt-6.1-sol where necessary)
       - jd-fix-agent      -> openai/gpt-6.1-sol           high   (per user 2026-10-29: more gpt-6.1-sol where necessary)
       - gentle-ai-explore -> nan/glm5.3-flash             high   (no savings mode)
       - jd-judge-b        -> openai/gpt-6-astra           high   (per user 2026-10-29: no qwen in the judges; astra high)
     Any `opencode-go/*` route inherited from models.json is remapped to nan
     (that provider is no longer available).
  3. Writes it into profiles.json (global active profile stays `nan-ahorro`)
     and also leaves the import envelope at profiles.export.json.

After running: the repo-local pin (.git/gentle-ai/profile-pin.json, already
in place) applies `joyan-sol` to new sessions in this clone. To adopt it in
the current pi session: /gentle:profiles -> Enter on `joyan-sol`.
"""

import json
import shutil
import sys
import time
from pathlib import Path

BASE = Path.home() / ".pi" / "gentle-ai"
PROFILES = BASE / "profiles.json"
MODELS = BASE / "models.json"
EXPORT = BASE / "profiles.export.json"

PROFILE_NAME = "joyan-sol"

UPGRADES = {
    "orchestrator": {"model": "nan/deepseek-v4-flash", "thinking": "high"},
    "gentle-ai-worker": {"model": "openai/gpt-6.1-sol", "thinking": "high"},
    "gentle-ai-verify": {"model": "openai/gpt-6.1-sol", "thinking": "high"},
    "sdd-verify": {"model": "openai/gpt-6.1-sol", "thinking": "high"},
    "jd-fix-agent": {"model": "openai/gpt-6.1-sol", "thinking": "high"},
    "gentle-ai-explore": {"model": "nan/glm5.3-flash", "thinking": "high"},
    "jd-judge-b": {"model": "openai/gpt-6-astra", "thinking": "high"},
}

# opencode-go is no longer available; remap any inherited route to nan.
OPENCODE_REMAP = {
    "opencode-go/deepseek-v4-pro": ("nan/deepseek-v4-flash", "high"),
    "opencode-go/deepseek-v4.1-flash": ("nan/deepseek-v4-flash", "high"),
}


def drop_opencode(config):
    replaced = []
    for agent, route in config.items():
        model = route.get("model", "")
        if model.startswith("opencode-go/"):
            new_model, new_thinking = OPENCODE_REMAP.get(
                model, ("nan/glm5.3-flash", "high")
            )
            replaced.append(f"{agent}: {model} -> {new_model}")
            route["model"] = new_model
            route["thinking"] = new_thinking
    return replaced


def main() -> int:
    if not PROFILES.exists() or not MODELS.exists():
        print(f"falta {PROFILES} o {MODELS}", file=sys.stderr)
        return 1

    store = json.loads(PROFILES.read_text())
    models = json.loads(MODELS.read_text())

    if store.get("kind") != "gentle-pi.agent_model_profiles":
        print(f"kind inesperado en profiles.json: {store.get('kind')!r}", file=sys.stderr)
        return 1

    if PROFILE_NAME in store.get("profiles", {}):
        # Idempotent update: refresh the existing profile in place.
        config = store["profiles"][PROFILE_NAME]
        updating = True
    else:
        config = {agent: dict(route) for agent, route in models.items()}
        updating = False

    # 1. Backup
    backup = PROFILES.with_name(f"profiles.json.bak-{PROFILE_NAME}-{time.strftime('%Y%m%d-%H%M%S')}")
    shutil.copy2(PROFILES, backup)
    print(f"backup: {backup}")

    config.update(UPGRADES)
    for line in drop_opencode(config):
        print(f"  remap opencode-go: {line}")

    # 3. Write store atomically; global active profile is untouched
    store["profiles"][PROFILE_NAME] = config
    tmp = PROFILES.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(store, indent=2, ensure_ascii=False) + "\n")
    tmp.replace(PROFILES)

    EXPORT.write_text(
        json.dumps(
            {
                "kind": "gentle-pi.agent_model_profile",
                "version": 1,
                "name": PROFILE_NAME,
                "config": config,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )

    verb = "actualizado" if updating else "registrado"
    print(f"perfil {PROFILE_NAME!r} {verb} ({len(config)} agentes); global activo sigue en {store.get('active')!r}")
    for agent in ("orchestrator", "gentle-ai-worker", "gentle-ai-verify", "sdd-verify", "jd-fix-agent", "gentle-ai-explore", "jd-judge-a", "jd-judge-b"):
        route = config.get(agent, {})
        print(f"  {agent}: {route.get('model')} / {route.get('thinking')}")
    print("listo. sesion nueva: pin local aplica solo; esta sesion: /gentle:profiles -> Enter en joyan-sol")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
