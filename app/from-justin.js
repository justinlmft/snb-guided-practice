/* ============================================================================
   From Justin — daily note + deep (learn-more) reflection.  No AI, state-keyed.
   Drop-in module for Stuck Not Broken. Exposes window.FromJustin.

   TWO LAYERS
   1) Daily note (Today tab): a short piece chosen from the LAST check-in's state
      (Store.lastCheckin().dom), felt-language, no state name, no call to action.
   2) Deep reflection ("learn more"): present + what to expect (body), one small
      next step (invite), plus change / stuck / watch-for overlays. May name the
      state using the new two-axis label (already glossed in the body copy).

   Both pick with no immediate repeat per slot. Call FromJustin.refresh() when a
   check-in is saved so the daily note reacts to the new state.

   promptPolicy gate (daily note): open = any type; sparing = a journal prompt
   only ~1 in 4; withhold = never auto-show a journal prompt.

   DAILY API
     FromJustin.today([lastCheckin]) -> { state, label, id, type, text }
        reads Store.lastCheckin() if no arg; 'neutral' before today's 1st check-in.
        cached until refresh() so re-renders are stable.
     FromJustin.refresh()            clear the daily cache (call on check-in save)
     FromJustin.pick(stateKey)       -> { id, type, text }  raw daily pick
     FromJustin.label(stateKey)      -> two-axis teaching label (learn-more header)

   DEEP / LEARN-MORE API (you decide WHEN to include each slot, from your signals)
     FromJustin.deepBody(dom)        -> string  (present + what to expect)
     FromJustin.deepInvite(dom)      -> string  (the one small next step; render last)
     FromJustin.changeOverlay(dir)   -> string  dir = 'rising' | 'falling' | 'steady'
     FromJustin.stuckOverlay(n)      -> string  ({N} filled with n; show on a streak)
     FromJustin.watchFor(kind)       -> string  kind = 'fightflight' | 'shutdown' | 'improving'
        capacity-gated: skip the heavier fightflight/shutdown lines while the user
        is currently in a dysregulated or freeze state.
     FromJustin.LIBRARY / FromJustin.DEEP   raw data, if you'd rather wire it yourself

   ASSEMBLE the learn-more screen as:
     body + changeOverlay(trend.dir) + [stuckOverlay(n) if streak] +
     [watchFor(...) if applicable] + invite (own line, last)

   Content source of truth: "Stuck Not Broken - From Justin (content + logic).md"
   and the two JSON files in this bundle. Keep the embedded data below in sync.
   ========================================================================== */
(function (global) {
  'use strict';

  const LIBRARY = {
    "safety": {
      "label": "safe",
      "promptPolicy": "open",
      "pieces": [
        {
          "id": "safe-rem-1",
          "type": "reminder",
          "text": "Feeling present isn't the finish line. It's a place to rest, remind your system what safety actually feels like, and even challenge your system to grow capacity. Doing so makes it easier to find this experience again."
        },
        {
          "id": "safe-rem-2",
          "type": "reminder",
          "text": "Safety isn't the absence of hard things. It's having enough capacity inside to meet them."
        },
        {
          "id": "safe-ref-1",
          "type": "reflection",
          "text": "In a settled moment like this one, the same problems are still there; they just don't run the show. That steadiness is worth noticing instead of rushing past."
        },
        {
          "id": "safe-ref-2",
          "type": "reflection",
          "text": "A lot of people skip right over these good moments, already bracing for the next hard one. You're allowed to let this one be and marinate in it for a bit. No rush."
        },
        {
          "id": "safe-ref-3",
          "type": "reflection",
          "text": "You're present enough. Connected enough. Good job."
        },
        {
          "id": "safe-jp-1",
          "type": "journal prompt",
          "text": "What's one small thing that helped you feel a little more like yourself today?"
        },
        {
          "id": "safe-jp-2",
          "type": "journal prompt",
          "text": "When you feel present like this, what becomes possible that doesn't when you're not?"
        },
        {
          "id": "safe-jp-3",
          "type": "journal prompt",
          "text": "You've earned this level of safety. How do you feel about yourself?"
        },
        {
          "id": "safe-jp-4",
          "type": "journal prompt",
          "text": "Safety doesn't stay around forever. It'll come and go. Can you give your system permission to come in and out of safety?"
        }
      ]
    },
    "play": {
      "label": "regulated mobilization",
      "promptPolicy": "open",
      "pieces": [
        {
          "id": "regmob-rem-1",
          "type": "reminder",
          "text": "Energy with a sense of safety underneath it is a good place to be. This is the kind of drive that doesn't cost you later."
        },
        {
          "id": "regmob-rem-2",
          "type": "reminder",
          "text": "Not all activation is something to calm down. Some of it is just you, moving toward what matters."
        },
        {
          "id": "regmob-ref-1",
          "type": "reflection",
          "text": "On days like this it's easier to say the honest thing, set the limit, start the thing you've been putting off. The same energy that feels like too much when you're on edge feels like fuel when you're steady."
        },
        {
          "id": "regmob-ref-2",
          "type": "reflection",
          "text": "There's a kind of busy that drains you and a kind that fills you, isn't there? This is the second one. Worth knowing the difference in your own body. So, pause and take notice."
        },
        {
          "id": "regmob-jp-1",
          "type": "journal prompt",
          "text": "What do you most want to put this energy toward right now?"
        },
        {
          "id": "regmob-jp-2",
          "type": "journal prompt",
          "text": "Is there a boundary or a conversation that feels possible today that didn't last week?"
        },
        {
          "id": "regmob-jp-3",
          "type": "journal prompt",
          "text": "How are you feeling about yourself right now? Your potential?"
        },
        {
          "id": "regmob-jp-4",
          "type": "journal prompt",
          "text": "You've earned this, haven't you? Tell the truth."
        }
      ]
    },
    "stillness": {
      "label": "regulated immobilization",
      "promptPolicy": "open",
      "pieces": [
        {
          "id": "regimm-rem-1",
          "type": "reminder",
          "text": "Rest isn't just a reward you earn after everything's done. It's a necessity for restoring your system's balance."
        },
        {
          "id": "regimm-ref-1",
          "type": "reflection",
          "text": "Sink into the stillness within you and around you."
        },
        {
          "id": "regimm-ref-2",
          "type": "reflection",
          "text": "Being quiet and close to someone safe, or quiet and alone, can both feel like coming home. A lot of people don't get much of either. Notice it while it's here."
        },
        {
          "id": "regimm-jp-1",
          "type": "journal prompt",
          "text": "When it's this quiet inside, what's been waiting for your attention?"
        },
        {
          "id": "regimm-jp-2",
          "type": "journal prompt",
          "text": "What's something you understand now that you couldn't see when things were louder?"
        },
        {
          "id": "regimm-jp-3",
          "type": "journal prompt",
          "text": "If a younger version of you could feel this kind of calm, what would you want them to know?"
        }
      ]
    },
    "fightflight": {
      "label": "dysregulated mobilization",
      "promptPolicy": "sparing",
      "pieces": [
        {
          "id": "dysmob-rem-1",
          "type": "reminder",
          "text": "Yes, things are urgent and that's real. But not all of it is equal and you know this. You also know that you're at your best when you can breathe a bit more."
        },
        {
          "id": "dysmob-rem-2",
          "type": "reminder",
          "text": "Speeding up is the body trying to handle something. It isn't a flaw, even when it bumps into the people around you."
        },
        {
          "id": "dysmob-rem-3",
          "type": "reminder",
          "text": "Irritability and anxiousness are safety running low, not a reflection of your worth. It's something to understand, not to judge."
        },
        {
          "id": "dysmob-ref-1",
          "type": "reflection",
          "text": "Sometimes the mind races to stay ahead of a feeling it doesn't want to catch up with. And that makes it even harder to slow down."
        },
        {
          "id": "dysmob-ref-2",
          "type": "reflection",
          "text": "Being wired and worn out at the same time is something many people know well. You're not alone in that."
        },
        {
          "id": "dysmob-jp-1",
          "type": "journal prompt",
          "text": "What's one thing your body might need right now: to move, to rest, or to be heard?"
        },
        {
          "id": "dysmob-jp-2",
          "type": "journal prompt",
          "text": "What's your current emotion? And how does that emotion want to move?"
        }
      ]
    },
    "shutdown": {
      "label": "dysregulated immobilization",
      "promptPolicy": "withhold",
      "pieces": [
        {
          "id": "dysimm-rem-1",
          "type": "reminder",
          "text": "Collapsed isn't broken. It's a flavor of stuck. And stuck is temporary."
        },
        {
          "id": "dysimm-rem-2",
          "type": "reminder",
          "text": "Going quiet and heavy is one of the oldest ways the body protects you. It isn't weakness, even when it feels like nothing at all."
        },
        {
          "id": "dysimm-rem-3",
          "type": "reminder",
          "text": "On the heavy days, getting through is maybe enough. You don't owe anyone more than that today."
        },
        {
          "id": "dysimm-ref-1",
          "type": "reflection",
          "text": "Shutdown can feel like the lights dimming. Heavy, far away, hard to care. That's not you failing; that's an older part of you trying to get you through."
        },
        {
          "id": "dysimm-ref-2",
          "type": "reflection",
          "text": "When everything feels flat, it's easy to believe that's just who you are now. It isn't. It's a state, and states shift."
        },
        {
          "id": "dysimm-ref-3",
          "type": "reflection",
          "text": "Sometimes the day feels like it's happening behind glass. A lot of people know that feeling, and it does pass, even when it doesn't seem like it will."
        },
        {
          "id": "dysimm-jp-1",
          "type": "journal prompt",
          "text": "What's one sound you can effortlessly hear? Or is there silence?"
        },
        {
          "id": "dysimm-jp-2",
          "type": "journal prompt",
          "text": "What's one color catching your eye?"
        },
        {
          "id": "dysimm-jp-3",
          "type": "journal prompt",
          "text": "Where is one imaginary place you would go to be in stillness? A place you could breathe easy and be free from pressure?"
        }
      ]
    },
    "freeze": {
      "label": "freeze",
      "promptPolicy": "sparing",
      "pieces": [
        {
          "id": "freeze-rem-1",
          "type": "reminder",
          "text": "Feeling stuck in place isn't the same as nothing happening. Inside, a lot is, and it's working hard to keep you protected."
        },
        {
          "id": "freeze-rem-2",
          "type": "reminder",
          "text": "You don't have to force your way out of stuck. Sometimes the smallest movement is enough to remind the body it can move at all."
        },
        {
          "id": "freeze-rem-3",
          "type": "reminder",
          "text": "Being caught between wanting to move and not being able to is one of the most common places people get stuck. You're not the only one here."
        },
        {
          "id": "freeze-ref-1",
          "type": "reflection",
          "text": "Stuck can feel like holding your breath without meaning to. Like being ready and frozen at the same time."
        },
        {
          "id": "freeze-ref-2",
          "type": "reflection",
          "text": "Freeze might be the current state of your body. And maybe it's been that way for a long time. But not the permanent state of your body."
        },
        {
          "id": "freeze-jp-1",
          "type": "journal prompt",
          "text": "Can you wiggle your toes even while frozen?"
        },
        {
          "id": "freeze-jp-2",
          "type": "journal prompt",
          "text": "Can you roll your wrists even from freeze? If so, you opened a bit of mobility. Good job."
        },
        {
          "id": "freeze-jp-3",
          "type": "journal prompt",
          "text": "Can you roll your neck while in this freeze state?"
        },
        {
          "id": "freeze-jp-4",
          "type": "journal prompt",
          "text": "Can you acknowledge your emotion without rejecting it? If not, that's okay for now."
        }
      ]
    },
    "neutral": {
      "label": "settling",
      "promptPolicy": "open",
      "pieces": [
        {
          "id": "neutral-rem-1",
          "type": "reminder",
          "text": "Your current experience is an opportunity to reflect. Check in when (and if) you're ready."
        },
        {
          "id": "neutral-rem-2",
          "type": "reminder",
          "text": "You don't have to change how you feel to check in. Just notice it."
        },
        {
          "id": "neutral-ref-1",
          "type": "reflection",
          "text": "Some days you can connect with your body more than others. And that's okay. Progress, not perfection."
        },
        {
          "id": "neutral-jp-1",
          "type": "journal prompt",
          "text": "If you had to guess, what's one word for how today feels in your body?"
        }
      ]
    }
  };

  const DEEP = {
    "_readme": "From Justin — DEEP / learn-more content. Separate from the daily-note library (content.json). This is the personalized reflection behind 'learn more': present state + what to expect (body), one small next step (invite), plus change/stuck/watch-for overlays. Keyed by the app's dom values. 'label' is the new two-axis teaching name (okay to show on this screen, immediately glossed in plain language as the body copy already does). neutral/settling has no deep entry on purpose: the dynamic reflection only fires when there is a pattern worth reflecting on. ASSEMBLY: body + change overlay + (stuck overlay, only on a streak) + (watch-for overlay, only when applicable) + invite. Invite renders last on its own line/label. Cycle each array independently with no immediate repeat per slot. In dysregulated and freeze states keep the tone soft and skip the heavier watch-for lines. Source of truth: 'Stuck Not Broken - From Justin (content + logic).md' > 'Dynamic pattern reflections'.",
    "version": 1,
    "states": {
      "safety": {
        "label": "safe",
        "body": [
          "You've been reporting more safety lately. You may notice more patience, more steadiness, and more room to handle things that used to throw you. When safety is online like this, it's worth learning what it actually feels like, so it's easier to find again.",
          "More safety in your recent check-ins. This is the state where you have the most capacity, so it's a good time to face something a little harder on purpose, while you have the room for it.",
          "Your check-ins lean toward safety lately. Things still aren't perfect, but they're not running you. That steadiness is worth using, not rushing past."
        ],
        "invite": [
          "Take one slow breath and name one thing that feels okay right now. Naming it makes it easier to find next time.",
          "Pick something that's been a little hard and lean toward it for a minute while you have the capacity. That's how capacity grows.",
          "Before the next thing grabs you, stop for ten seconds and let it land that you're okay right now. That counts."
        ]
      },
      "play": {
        "label": "regulated mobilization",
        "body": [
          "You're reporting more regulated mobilization, energy with safety underneath it. Expect motivation, focus, easier boundaries, and the kind of drive that doesn't cost you later. Work can count as play here.",
          "Higher energy and steady footing in your recent check-ins. This is good fuel. The main risk is spending it on everything at once, so it helps to point it at something that actually matters to you.",
          "More regulated mobilization lately. This is the state where hard conversations get easier and the thing you've been putting off feels doable. Use it while it's here."
        ],
        "invite": [
          "Pick the one thing that matters most and give it ten minutes. You don't have to finish it, just start.",
          "Name one boundary or conversation that feels possible today, and take the first small step on it.",
          "Aim this energy at something you'll be glad you did, not just the easiest thing in front of you."
        ]
      },
      "stillness": {
        "label": "regulated immobilization",
        "body": [
          "You're reporting more regulated immobilization, calm and still with safety underneath. Expect a pull toward rest, reflection, and easy closeness. This is a good state for quieter inner work.",
          "Settled and low-energy in your recent check-ins, in a good way. Nothing's demanding your attention, which makes it easier to actually rest and to notice things you usually move too fast to see.",
          "More of this still, safe state lately. Rest isn't a reward you earn after everything's done. It's how your system resets. This is a fine time to let it."
        ],
        "invite": [
          "Take five minutes with no task and no phone. Just rest, or sit with one thing that's been on your mind.",
          "If there's someone safe to be quiet with, reach out. If not, that's fine. Your own company works too.",
          "Let yourself actually stop for a few minutes, no agenda, and see what shows up when it's quiet."
        ]
      },
      "fightflight": {
        "label": "dysregulated mobilization",
        "body": [
          "You're reporting more dysregulated mobilization, a lot of energy without much safety under it. Expect frustration, irritability, anxiousness, maybe snapping at people you care about. This is your system trying to handle something, not a character flaw.",
          "High energy, low safety in your recent check-ins. When the tank's like this, everything feels urgent even when it isn't. The body can't tell the difference until you slow down enough to sort it out.",
          "More of the wired, on-edge state lately. It's draining, and it makes sense. What helps most is small and repeatable, not a big fix."
        ],
        "invite": [
          "Move it on purpose for two minutes, a quick walk, shake out your hands, push your palms against a wall. Then name the feeling underneath out loud.",
          "Pick the one thing that's actually urgent and let the rest wait ten minutes. Most of it can.",
          "Breathe out slow, longer than the breath in, three times. Then ask what you actually need: to move, to rest, or to be heard."
        ]
      },
      "shutdown": {
        "label": "dysregulated immobilization",
        "body": [
          "You're reporting more dysregulated immobilization, low energy and not much safety yet. Expect numbness, heaviness, foggy thinking, wanting to pull away. This is an old protective response, not weakness, and not who you are.",
          "Low and flat in your recent check-ins. On days like this, getting through is enough. You don't owe anyone more than that right now.",
          "More of the shut-down state lately. It can feel like the lights dimming. That's a state, and states move, even when this one feels like it won't."
        ],
        "invite": [
          "Give yourself a few minutes of low stimulation: quiet, dim light, a pet, or someone who expects nothing from you.",
          "Do one small thing that takes almost no effort, a glass of water, opening a window. Small still counts.",
          "Notice one thing you can hear or see right now. That's enough. You don't have to do more."
        ]
      },
      "freeze": {
        "label": "freeze",
        "body": [
          "You're reporting more freeze, energy and shutdown at the same time. You may feel braced, stuck in place, ready to move but unable to. Panic, anger, or fear can sit underneath it. A lot is happening inside even when nothing looks like it's moving.",
          "Freeze showing up in your check-ins, the held-breath, trapped feeling. It's one of the most common places people get stuck, and it's easy to get overwhelmed here. Small wins count for a lot.",
          "More of the stuck-and-braced state lately. Freeze might be where your body is right now, maybe for a while. It's not where it stays."
        ],
        "invite": [
          "Try the smallest movement, wiggle your toes, roll your wrists, take one long breath out. That's enough to remind the body it can move.",
          "Find a spot that feels a little safer and give yourself room to move when you're ready. No rush.",
          "Pick one tiny win and count it, a stretch, a breath, a single step. That's real progress in this state."
        ]
      }
    },
    "overlays": {
      "change": {
        "rising": [
          "That's a step steadier than the past few days. Worth noticing what's different.",
          "You're trending up from where you've been. Something's working, even if it's small.",
          "A bit steadier lately. Good direction."
        ],
        "falling": [
          "That's a dip from where you've been. No alarm, just information, and a reason to go easy on yourself.",
          "Lower than your recent days. That happens. Be a little gentler with yourself today.",
          "Things slid a bit. It's not a setback, just data, and you're still showing up to track it."
        ],
        "steady": [
          "Fairly steady lately.",
          "Holding about even the last few days.",
          "Pretty consistent recently."
        ]
      },
      "stuck": [
        "You've checked in around here {N} days running. Long stretches in one place are common, that's basically what 'stuck' means. We're after small, sustainable changes, not a flip. Showing up and checking in honestly is the progress.",
        "{N} days in a similar spot. That's normal, and it doesn't mean you've stalled. Progress here is small and steady, not dramatic.",
        "Around the same place for {N} days now. Staying with it and being honest about it is the work. Keep going."
      ],
      "watchFor": {
        "fightflight": [
          "When the tense days stack up, the body usually crashes after. Worth building in real rest before the crash picks the time for you. Schedule five minutes to actually stop. Scrolling isn't it, that's coping, which is fine, but it won't reset you.",
          "Several wired days in a row. The body keeps that pace until it can't, then drops hard. Get ahead of it with a few minutes of real downtime today.",
          "This much go-go-go tends to end in a crash. Try a short, deliberate stop now, so the rest is on your terms instead of forced on you."
        ],
        "shutdown": [
          "On stretches like this it's easy to believe it's permanent. It isn't. It's stuck, not broken, not forever. States move, even when they haven't in a long time.",
          "A run of low, flat days can start to feel like 'this is just me now.' It's not. Keep an eye on that story, it's the state talking.",
          "When shutdown lingers, the mind says it's the end state. It's a state. States shift, even the slow ones."
        ],
        "improving": [
          "If you're feeling more connected, take a second to notice what helped. A plain 'good job' to yourself counts, as long as it's real.",
          "Things are looking up a little. Worth clocking what's different so you can do more of it.",
          "You're trending better. Give yourself some honest credit, nothing forced."
        ]
      }
    },
    "assembly": "body + change overlay (always, from trend dir) + stuck overlay (only on a streak, fill {N}) + watch-for overlay (only when applicable; capacity-gated, skip the heavier fightflight/shutdown lines while currently in a dysregulated or freeze state) + invite (its own line, last). Pick one variant per array and cycle independently with no immediate repeat per slot. 2-3 sentences plus the invite."
  };

  // ---- shared no-repeat cycler ------------------------------------------------
  const _last = {};                                   // slotKey -> last index shown
  function cycle(slotKey, arr){
    if(!arr || !arr.length) return '';
    if(arr.length === 1) return arr[0];
    let i; do { i = Math.floor(Math.random()*arr.length); } while(i === _last[slotKey]);
    _last[slotKey] = i;
    return arr[i];
  }

  // ---- daily note -------------------------------------------------------------
  const _lastId = {};
  let   _cache = null;
  let   _promptTick = 0;

  function sameDay(t){
    const d = new Date(t), n = new Date();
    return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
  }
  function stateKeyFor(lastCheckin){
    if(lastCheckin && sameDay(lastCheckin.t) && LIBRARY[lastCheckin.dom]) return lastCheckin.dom;
    return 'neutral';
  }
  function pick(stateKey){
    const st = LIBRARY[stateKey] || LIBRARY.neutral;
    let pieces = st.pieces.slice();
    if(st.promptPolicy === 'withhold'){
      pieces = pieces.filter(p => p.type !== 'journal prompt');
    } else if(st.promptPolicy === 'sparing'){
      const allowPrompt = (_promptTick++ % 4 === 0);
      if(!allowPrompt) pieces = pieces.filter(p => p.type !== 'journal prompt');
    }
    if(!pieces.length) pieces = st.pieces.slice();
    let pool = pieces.filter(p => p.id !== _lastId[stateKey]);
    if(!pool.length) pool = pieces;
    const piece = pool[Math.floor(Math.random()*pool.length)];
    _lastId[stateKey] = piece.id;
    return { id: piece.id, type: piece.type, text: piece.text };
  }
  function today(lastCheckin){
    const last = (lastCheckin !== undefined)
      ? lastCheckin
      : (global.Store && Store.lastCheckin ? Store.lastCheckin() : null);
    const key = stateKeyFor(last);
    if(_cache && _cache.state === key) return _cache.note;
    const p = pick(key);
    _cache = { state: key, note: Object.assign({ state: key, label: (LIBRARY[key]||{}).label || '' }, p) };
    return _cache.note;
  }
  function refresh(){ _cache = null; }
  function label(stateKey){
    return (DEEP.states[stateKey] && DEEP.states[stateKey].label)
        || (LIBRARY[stateKey] && LIBRARY[stateKey].label) || '';
  }

  // ---- deep / learn-more ------------------------------------------------------
  function deepBody(dom){   const s = DEEP.states[dom];  return s ? cycle('body:'+dom,   s.body)   : ''; }
  function deepInvite(dom){ const s = DEEP.states[dom];  return s ? cycle('invite:'+dom, s.invite) : ''; }
  function changeOverlay(dir){ return cycle('change:'+dir, DEEP.overlays.change[dir] || []); }
  function stuckOverlay(n){
    const t = cycle('stuck', DEEP.overlays.stuck);
    return t.replace(/\{N\}/g, String(n));
  }
  function watchFor(kind){ return cycle('watch:'+kind, DEEP.overlays.watchFor[kind] || []); }

  global.FromJustin = {
    today, refresh, pick, label,
    deepBody, deepInvite, changeOverlay, stuckOverlay, watchFor,
    LIBRARY, DEEP
  };
})(window);
