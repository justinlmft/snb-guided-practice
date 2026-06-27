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
          "text": "Safety isn't the absence of hard emotions. It's having enough capacity inside to meet them."
        },
        {
          "id": "safe-ref-1",
          "type": "reflection",
          "text": "In a settled moment like this one, the same problems are still there; they just don't run the show. That steadiness is worth noticing instead of rushing past."
        },
        {
          "id": "safe-ref-2",
          "type": "reflection",
          "text": "It's easy to skip right over these good moments, already bracing for the next hard one. You're allowed to let this one be and sit with it for a bit. No rush."
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
          "text": "Being quiet and close to someone safe, or quiet and alone, can both feel like coming home. Notice it while it's here."
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
          "text": "Being wired and worn out at the same time is one of the harder places to be."
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
          "text": "Shutdown can feel like the lights dimming. Heavy, far away, hard to care. That's not you failing. It's an old protective response, the kind that kicks in to get you through."
        },
        {
          "id": "dysimm-ref-2",
          "type": "reflection",
          "text": "When everything feels flat, it's easy to believe that's just who you are now. It isn't. It's a state, and states shift."
        },
        {
          "id": "dysimm-ref-3",
          "type": "reflection",
          "text": "Sometimes it feels like you're living behind glass. It does pass, even when it doesn't seem like it will."
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

  // ---- custom blog: the "for you" reader, assembled from the user's signals ----
  const RUNDOWNS = {"shutdown": {"label_precise": "Dysregulated immobilization", "label_felt": "shutdown", "tldr": ["The heavy, far-away, hard-to-move moments are shutdown. That's not you failing, and it's not who you are. It's one of the oldest ways your body protects you when things get to be too much. It's a state, and states move.", "Numb, flat, like you're living behind glass. That's shutdown. Your body pulled its oldest brake to get you through. Stuck, not broken. And stuck is temporary.", "If everything feels heavy and far away, your body has powered down to protect you. That's shutdown. It kept you safe when things were too much, and like every state, it has the potential to come and it go... even if it's been around a very long time.", "Shutdown is the lights dimming, not the power going out. Heavy, slow, hard to care. A protective response, not a flaw. It doesn't have to be permanent, even though it feels like it. And yeah, it's maybe been that way for a very long time."], "what_this_is": ["Shutdown is dorsal vagal, the oldest brake your body has. A limp, powered-down kind of stuck, gas dropped out, lights dimmed. Through this lens, a lot of what gets called depression is the body in shutdown. This isn't weakness, and it isn't who you are. It's protection. It's what a body does when stress runs past what it can hold.", "This isn't the cartoon, one-dimensional version of 'shut down.' Think of it more like a gradient. You might be 70% getting-through-the-day and 30% in a heavy, far-off place. Both are true at once. Shutdown is that heavy, powered-down part, the dorsal brake, the oldest protection your body has. Naming the percentage helps, because it's already not all of you."], "why_your_body": ["When danger feels like too much, your body conserves by powering down. That's not a malfunction and it's not a character flaw. It's a deep, ancient protective response, the kind that takes over to protect you when nothing else can. Story follows state, so the heaviness and the hopelessness that come with it aren't the truth about your life. They're the weather of the state you're in."], "how_it_shows_up": "In the body it's cold, heavy, drained, hollow, numb. The pull, the impulse, is to immobilize, to isolate, to disappear, to be alone in the quiet or the dark. The feeling runs numb and unmotivated, helpless, alone, and often shame and sadness underneath. And the thinking goes with it: hopeless, slow, clouded, 'what's the point.' Pay special attention to that shame and that hopelessness, because they feel like the truth about who you are. They're not. They're coming from the state, not from the facts. This is exactly the place you might call yourself broken or lazy, and it's exactly where that word is wrong.", "one_thing_that_helps": ["Very small, very low demand. One sip of water. A dimmer light. One thing you can see or hear right now. You don't climb out of shutdown by forcing it. You add a little safety, and the body starts to allow a little more energy back in.", "Don't fight the state, use it. Shutdown isn't good for starting a big project, but it's actually good for being alone, for quiet, for small movements, for rest. Let yourself have the quiet you're being pulled toward, in doses. Sometimes the way up starts with letting the bottom be the bottom for a minute.", "Get to know it a little, the way you'd get to know a new acquaintance, not by demanding everything at once. How heavy are your arms right now? Where's the numbness, exactly? You don't have to fix anything. Just notice, little by little.", "Later, when the energy starts coming back, it can show up as irritability. That's not a setback. That's the system coming back online. Getting a little 'fed up' is often the first step up and out.", "On the heavy days, getting through is enough. You don't owe anyone more than that today, and that includes you. Showing up here and checking in honestly already counts as a step."], "door_inward": "When you've got a little more capacity, the practice tab has a gentle one built for exactly these days, low demand, just a bit of safety to settle into. No rush. It'll be there when you are."}, "safety": {"label_precise": "Safety", "label_felt": "safety", "tldr": ["Safety is your body open and online, calm enough to connect, with enough capacity to meet what's hard. Not the absence of problems. The presence of enough room to handle them.", "The settled, present, room-to-breathe feelings are safety. It's biology, not a mood you have to earn. Notice it while it's here, because that noticing is what makes it easier to find next time.", "Safety is when your system stops spending everything on defense and gets to rest, connect, and grow instead. It comes and it goes. That's how it's supposed to work.", "Calm, connected, a little more space inside. That's safety. It can feel unfamiliar at first, even a little uncomfortable. That's normal. Let it be here anyway."], "what_this_is": ["Safety is ventral vagal, the newest part of your nervous system, the one that wires your heart and face and voice together. When it's online, your body isn't braced for anything. It spends its resources on health, connection, and repair instead of defense. This is the state everything else gets measured against, the home base, not a reward for doing life right.", "Safety is not the absence of hard emotions. It's having enough capacity inside to meet them. You can be in safety and still have a hard day. The difference is there's enough capacity to handle it without getting spiraled into defense."], "why_your_body": ["Your neuroception, the below-conscious read of your surroundings and your insides, has picked up enough cues of safety that your system can stand down. Nothing to perform, nothing to earn. Your body decided it's safe enough, and let the brake off the right way."], "how_it_shows_up": "In the body it's warm, open, spacious, light. The impulse points outward, toward people, to connect, to share company, to co-regulate. Notice that direction, because it's the tell: in safety the body moves toward connection, not away from a threat. The feeling is calm, connected, sometimes playful, sometimes just quietly content. And the thinking opens up, present, curious, able to hold more than one idea at once, a little kinder toward yourself and other people. Story follows state, and this is the state where the story finally gets generous.", "one_thing_that_helps": ["Notice it on purpose. A cue of safety only becomes an anchor when you pay attention to how it lands in your body. That's a rep, and it's what makes safety easier to find next time. Where do you feel the settledness, exactly?", "Don't grab it too tight. Safety comes and goes, it's supposed to. Can you let it be here without needing it to stay? Giving your system permission to move in and out of safety is part of how the brake gets stronger.", "Use it for the thing that needs a little safety mixed in. If there's a harder feeling you've been keeping at arm's length, this is the state with room to glance at it, in a dose, then come back.", "If it feels weird, that's okay. Safety can feel unfamiliar, even unsafe. Just notice that too, no judgment. You don't have to trust it yet to let it be here."], "door_inward": "If you want to use this safety for a rep that builds the brake directly, the practice tab has one for exactly that, touch a little of the harder stuff while you're anchored, then come back. Small and repeatable."}, "play": {"label_precise": "Regulated mobilization", "label_felt": "play & motivation", "tldr": ["Energized, driven, a little fired up, with safety mixed in. That's regulated mobilization, the good kind of busy. It shows up as play with people you trust, and as motivation when you're on your own.", "That fire in your belly, but it's not chasing or running from anything. It's pointed at something. Same fuel as fight or flight, just with safety mixed in. This is the kind of drive that doesn't cost you later.", "The 'let's go, I've got this' moments are regulated mobilization. Activation you don't need to calm down, because this is just you moving toward what matters.", "Playful with others, motivated on your own, energized either way and still grounded. That's safety plus your get-up-and-go, online at the same time. Good company to keep."], "what_this_is": ["This is safety plus sympathetic energy, the exact same fuel that powers fight or flight. The energy was never the problem. Whether safety is mixed in is the whole difference. With safety, that fuel runs as play and motivation. Without it, the same fuel runs as fight or flight. It comes in two settings: play is the mobilized, social kind, shared with people you trust, and motivation is the solo version, that same drive aimed at something you want to get done.", "Not all activation is something to fix. You might have been taught to 'calm down,' like every bit of energy is a problem. It isn't. Some of it is just you, moving toward what matters, with enough safety mixed in to enjoy the ride. There's a kind of busy that drains you and a kind that fills you. This is the second one."], "why_your_body": ["Your system has enough safety to point its mobilizing energy at something, instead of away from a threat. That's the whole shift. The energy found a direction because there was finally enough safety to give it one."], "how_it_shows_up": "The body is energized, bouncy, flowing, open. Look at the impulse, it's the tell: to make, to imagine, to start, to take turns, to share. With safe others that lands as play. On your own it lands as motivation, the pull to start the thing, build the thing, go after the thing. The feeling is excited, fun, a little sassy when it's social, focused and driven when it's solo. The thinking turns curious, inventive, collaborative, big-picture. Same signature either way: high energy whose impulse is creative, not defensive.", "one_thing_that_helps": ["Aim it before it scatters. Pick the one thing that matters most and point the energy there. Ten minutes, you don't have to finish it, just start while the fuel's here.", "Keep a little safety in the mix while you go. The move isn't to slow down, it's to stay anchored while you move. That's what keeps this from tipping into the wired, snappy version.", "If it's the social kind, spend it on people. Reach out to someone you trust, do the thing together. Play with a safe other is one of the most regulating things there is.", "Slow down enough to actually feel it. When the fire's in your belly, the urge is to scramble and do something, anything. Notice it and embrace it for a second first. The sympathetic energy settles or gets used when you stop rejecting it."], "door_inward": "If you'd rather bank some of this, the practice tab has a session that uses a steady state like this to build capacity, so the drive stays drive and doesn't cost you on the back end."}, "stillness": {"label_precise": "Regulated immobilization", "label_felt": "stillness & intimacy", "tldr": ["Quiet, settled, slowed down, and not afraid. That's regulated immobilization, stillness on your own, intimacy when it's shared with someone safe. The same slowing as shutdown, but with safety mixed in, so it restores instead of collapses.", "The 'I can just be here' kind of quiet. Rest that actually rests you. Notice it while it's here.", "Settled and still, alone without being lonely, or close and easy with a safe other. That's a deeply regulated state, the ground where the body recovers and the deeper work gets done.", "Slowed all the way down, soft, calm, no fear in it. That's stillness. It's not you shutting down. It's your body safe enough to rest."], "what_this_is": ["This is safety plus the body powering down. You slow and quiet, but without fear. It's the same slowing you'd feel in shutdown, only with safety mixed in and repurposing it, which changes everything. Immobility without fear is stillness. Immobility with fear is freeze. And like play and motivation, it comes in two settings: stillness is the quiet you settle into on your own, intimacy is that same settled quiet shared with a safe other.", "Rest isn't a reward you earn after everything's done. It's a necessity, it's how your system restores its balance. This is the state behind real sleep, sitting still without crawling out of your skin, and easy closeness with someone safe."], "why_your_body": ["There's enough safety for your system to rest and restore instead of brace and collapse. Your body decided it's safe enough to stop. And stopping is doing something here, not nothing."], "how_it_shows_up": "The body settles, soft, still, releasing, light. The impulse is quiet and inward, to breathe, to reflect, to take in, to let biology do its thing. On your own that's stillness. With a safe other close, the same settledness becomes intimacy, quiet shared without needing to perform or fix anything. The feeling is calm, peace, restful, sometimes a little awe. The thinking goes contemplative, reflective, wondering. Here's the contrast to hold: shutdown's pull is to isolate and disconnect, this state's pull is to rest and take in. Same quiet body, opposite direction, because one has safety mixed in and one doesn't.", "one_thing_that_helps": ["Let it be restorative, not earned. You don't have to deserve this. Sink into the stillness and let your system do what it's actually built to do here.", "If a safe person is near, let it be shared. You don't have to talk or do anything. Quiet, close, easy. That's intimacy, and it's about as regulating as it gets.", "Use it for quiet inner work, if you have the room. This settled state is fertile ground for gently turning toward something, in a dose. Only if there's room. No pressure.", "Notice the difference between this and collapse. If the quiet starts feeling flat or heavy or scared instead of restful, that's the cue to add a small bit of safety, not to force yourself up and out."], "door_inward": "The practice tab has a quiet, low-demand session that fits a state like this, a place to settle deeper, or to do a little gentle inner work while you've got the calm to hold it."}, "fightflight": {"label_precise": "Dysregulated mobilization", "label_felt": "fight or flight", "tldr": ["Wired, urgent, can't-settle, anxious or irritable or both. That's fight or flight, sympathetic energy without enough safety mixed in yet. Same fuel as motivation and play, just no safety online yet, so the body's using it for defense.", "Everything feels urgent even when it isn't. That's a mobilized state talking, not the facts. Your body picked up danger and got you ready to handle it. That's protection, not a flaw, even when it bumps into the people around you.", "The racing, jittery, on-edge feelings are fight or flight. Anxiety is the urge to run that hasn't run. Anger is the urge to fight that hasn't fought. It's energy looking for somewhere to go.", "Hot, fast, tense, ready. That's mobilizing energy without enough safety yet. And here's the good news hiding in it: this is the exact same fuel that, with a little safety, turns into drive."], "what_this_is": ["This is sympathetic energy without enough safety mixed in yet. Flight tends to come first, the legs, escape, distance, anxiety, then fight, the upper body, push, boundaries, anger. It's the same energy as play and motivation. The only thing missing is safety, so the body spends it on defense instead of drive.", "Anger and anxiety aren't the enemy. Anxiety is your body warning you about something. Anger gives you power and motivation. They're uncomfortable, and they can get out of hand when they're stuck, but they're not bad, and they're not random. They're a mobilized body doing its oldest job."], "why_your_body": ["Your neuroception picked up danger, real or remembered, and your body mobilized to handle it. That's protection, not a malfunction, even when it spills onto people you care about. Story follows state, so the thoughts that feel like hard facts right now, the blame, the worst-case, are the surface of a revved-up state, not a verdict on your life."], "how_it_shows_up": "The body runs hot, tight, clenched, jittery, burning, under pressure. The impulse is to run, to escape, to push back, to fight. The feeling is anxious, nervous, irritable, angry, resentful. An emotion is the conscious read of an impulse you haven't acted on. Anxiety is the run that hasn't run. Anger is the fight that hasn't fought. The thinking gets judgmental, blaming, polarized, magnifying, stuck in past or future. When you're revved up like this, everything feels urgent even when it isn't, and the body can't tell the difference until you slow down enough to sort it out.", "one_thing_that_helps": ["Move a little, on purpose. Two minutes, a quick walk, shake out your hands, push your palms against a wall. Give the energy somewhere to go, then name the feeling underneath it. Naming it is the first step to letting it move through instead of run you.", "Lengthen the exhale. Breathe in like normal, then let the air out slow, slowly. The long exhale is one of the few direct lines you've got to the brake.", "Point it, don't just dump it. This energy is power looking for a direction. Is there something that actually matters you could aim it at, even a small thing? Sympathetic energy with a target is motivation.", "You asked the question, now don't fully trust the answer. The urgent, worst-case thoughts are the state, not the facts. You don't have to argue with them. Just don't sign for them yet.", "Add safety before you try to slow down. White-knuckling rarely works. A cue of safety, a hand on your chest, a familiar voice, one safe thing in the room, gives the energy a reason to settle."], "door_inward": "The practice tab has a session built for a charged state like this, settle some of the energy first, find a little safety, then it's easier to work with what's underneath."}, "freeze": {"label_precise": "Freeze", "label_felt": "freeze", "tldr": ["Ready and frozen at the same time. Braced, holding your breath without meaning to, a lot moving inside while nothing moves outside. That's freeze, fight-or-flight energy held down by shutdown. Gas and brake at once.", "The trapped, can't-move-can't-rest feeling is freeze. It's one of the most uncomfortable places to be. There's nothing wrong with you for being here.", "Freeze is not a worse shutdown. It's a different state, both pedals down at once, charge and brake together. A lot is happening in there even when it looks like nothing.", "Panicked and stuck, or enraged and stuck. That's freeze, the urge to move and the brake slammed on at the same time. The way out isn't force. It's safety plus the smallest movement."], "what_this_is": ["Freeze is a mixed state, fight-or-flight energy held down by shutdown. Gas and brake pressed at the same time. This one's easy to get wrong. Freeze is not a deeper shutdown. Shutdown is brake only. Freeze is both pedals down at once. That's why it can feel panicked and paralyzed in the same breath.", "The mobilized energy, the flight or fight, got frozen in place by the shutdown brake. To get unstuck you thaw the frozen part first, with safety, and then the once-stuck energy can finally discharge. Thaw, then move. Not force."], "why_your_body": ["Your body mobilized to act and then couldn't, so the energy got frozen in place. That's a braced, protective state, not nothing, and not weakness. A lot is happening inside even when nothing looks like it's moving."], "how_it_shows_up": "Because it's the mixed state, the body carries the charge and the brake at once, paralyzed and jittery, clenched, knotted, constricted, holding its breath. The impulse splits too, to be invisible, to endure, and underneath all of it, to release. The feeling runs high, panic, fear, rage, overwhelm. Remember the mechanics: panic is the urge to flee that can't move, rage is the urge to fight that can't move. The thinking gets scattered, all-or-nothing, sometimes flooded. That 'release' pull underneath is the stuck energy that hasn't had anywhere to go.", "one_thing_that_helps": ["The smallest movement, plus a cue of safety. Let your eyes go wherever they want, then wiggle your toes or roll your wrists, slow. A tiny movement reminds the body it can move at all, and safety is what lets a little of the stuck energy go.", "Don't force it. Pushing hard adds gas to a system that already has the brake slammed on, and that can lock freeze in tighter or tip it toward shutdown. If it feels stuck, that's the cue to get smaller and safer, not to push harder.", "In doses, not all at once. You're not going to fully thaw freeze in one sitting, and you're not supposed to. Stretch a little, come back to safety, stretch again. Little by little is the whole method here.", "Borrow some safety. A safe person, a familiar voice, a remembered safe place. Freeze thaws on safety, so whatever brings you a cue of it, use it."], "door_inward": "The practice tab has a session made for exactly this, pendulation, gently moving your attention between a little discomfort and a little safety, so the freeze can thaw at a pace your body can handle."}};
  const BLOG = {"tldr_bullets": {"where": ["You spent most of this week in {STATE}. → [where you've been](#1)", "This week leaned mostly into {STATE}. → [where you've been](#1)", "{SHARE} of your check-ins this week were {STATE}. → [where you've been](#1)"], "direction": {"rising": ["Your safety has been climbing across the week. → [your movement](#3)"], "falling": ["Your safety dipped a little, and that's okay. → [your movement](#3)"], "steady": ["Your safety held pretty steady this week. → [your movement](#3)"]}, "variance": {"shifts": ["Your state moved around a lot. → [your movement](#3)"], "consistent": ["Your week stayed in a similar place. → [your movement](#3)"]}, "fork": ["Where a week like this tends to go from here, both ways. → [the fork ahead](#4)", "The honest picture of both directions, neither a threat. → [the fork ahead](#4)"], "helps": ["One small thing worth trying this week. → [what helps](#5)", "A capacity-paced rep, if you want one. → [what helps](#5)"]}, "section1_where": ["Most of your check-ins this week landed in {STATE}. That's the state your system kept coming back to.", "This week leaned mostly into {STATE}, {SHARE} of your check-ins. Not every moment, but the state your system returned to most.", "Where you've been this week, mostly: {STATE}. Think of it as the home base your system kept circling back to, at least these past seven days.", "{SHARE} of this week read as {STATE}. So that's the state we'll look at, because it's where you actually spent your time."], "section3_movement": {"direction": {"rising": ["Your safety reads higher at the end of this week than the start. Something to take note of and keep an eye on, and maybe look for ways to maximize this potential.", "The trend this week points up. One week isn't the whole story, but it's a real sign of movement toward steadier ground. Worth leaning into where you can."], "falling": ["Your safety reads a little lower at the end of this week than the start. Safety comes and goes, and a dip is the 'goes' part. The 'comes' part tends to follow. Be a little gentler with yourself over the next few days.", "Safety dipped some this week. Usually that means the week asked more of you than it gave back. A good cue to slow down and add small bits of safety where you can."], "steady": ["Your safety held pretty level this week. A steady stretch is solid ground. If you'd like more, look for small ways to add safety and notice what shifts.", "Not much swing in your safety this week, it stayed in a similar range. A flat stretch is still a stretch you showed up for."]}, "variance": {"shifts": ["Your check-ins moved around a lot this week rather than sitting in one place. A system that moves is doing what it's supposed to. Movement, even the uncomfortable kind, beats stuck.", "You touched several different states this week. That's range, your system shifting gears instead of locking into one."], "consistent": ["Your check-ins clustered in a similar place this week. That kind of consistency can feel restful or stuck, depending on the state.", "This week sat mostly in one register. Steady ground if it's a regulated one, a long stretch worth gently loosening if it's a harder one."]}, "transitions": {"framing": ["This is the part of your week that's just yours, the order your states tend to move in.", "Your system has a pattern to how it moves, and it's starting to show."], "template": "One shape in your week: you tend to move toward {STATE_B} after {STATE_A}. Not a rule, just a pattern worth knowing.", "_note": "renders only when the transition signal is computed"}, "timeofday": {"framing": ["There's a time-of-day shape to it, too.", "And your check-ins have a rhythm to when they tend to land."], "template": "Your {SEG} tend to read more like {STATE}, more often than not."}}, "section4_fork": {"safety": {"toward_regulated": "If you keep noticing safety and using it the way you have been, it stops being a visitor and starts becoming a baseline. That's what the reps do. Over time your vagal brake gets stronger, and a stronger brake means you can meet harder things and come back faster. You won't stop leaving safety, that was never the goal, and the goal was never to feel safe all the time. It's enough safety to move freely, in and out, without getting stuck.", "if_reps_drop": "If safety stops getting your attention, it tends to stay a visitor. Nothing breaks. You just lean back toward whatever your older home was, and safety gets harder to find again, not because you lost it, but because it didn't get practiced. That isn't failure. It's how a skill works.", "landing": "Either way, you've shown your system can find this place. That's the part worth trusting."}, "play": {"toward_regulated": "Keep a little safety mixed into this energy and it stays fuel instead of turning into a fire. Over time the brake gets stronger, which is what lets you mobilize hard and still come back down on your own. That's capacity. You get to use your drive without it costing you on the back end.", "if_reps_drop": "If the safety thins out and the pace keeps climbing, the same energy can tip the other way, toward the dysregulated version: wired, irritable, worn out, snapping at people you didn't mean to. It's the exact same fuel. The only thing that changed is whether safety was mixed in. So the move isn't to slow down. It's to keep a little safety in the mix while you go.", "landing": "None of this is a warning. It's just the physics of the state. Stuck or speeding, change is always near."}, "stillness": {"toward_regulated": "If you let this rest actually restore you, it does more than feel good. Calm with safety mixed in is where the body recovers and where the deeper work gets done. Keep practicing it and stillness stays stillness: quiet you can sink into without disappearing.", "if_reps_drop": "If the safety thins out, this same quiet can drift toward its harder twin. Stillness without safety mixed in is shutdown, the same slowed-down body, only heavy instead of restful. You'll know the difference by the flatness, or the fear. If rest starts to feel like collapse, that's the cue to add a small bit of safety, not to force yourself up and out.", "landing": "Stuck, still, or somewhere in between, the body can move again."}, "fightflight": {"toward_regulated": "Every small dose of safety you add gives this energy somewhere to go. Over time, mobilization with safety mixed in becomes drive and play instead of fight and flight. Same fuel, better home. The crashes soften, the brake gets stronger. This is the exact energy that, with a little safety, turns into getting things done.", "if_reps_drop": "If the pace just keeps going with no safety added, the body runs until it can't, and then it tends to drop, into shutdown or freeze. That's not a punishment, just what happens when there's nothing left. Which is why the move isn't to white-knuckle through. It's to slip in small reps of safety now, before the crash picks the time for you.", "landing": "You're not broken, and you're not too much. You're mobilized without enough safety mixed in yet, and 'yet' is the whole point. Stuck means change is near."}, "shutdown": {"toward_regulated": "On the heavy days this is hard to believe, so just hold it lightly. Every small, low-demand cue of safety you can manage helps the system come back online. Over time, shutdown loosens toward stillness, the same quiet, but with you home in it. Even the energy that returns as irritability is good news. It means things are moving again. Small is enough here. Small is the whole method.", "if_reps_drop": "If nothing gets added, shutdown can stick around long enough to feel like just who you are. The heaviness is real, and it makes sense as a response to too much stress. But feeling permanent isn't the same as being permanent. From the inside, shutdown makes everything look fixed and hopeless. That's the state, not the facts. It can shift, even if it hasn't in a long time.", "landing": "You're not broken. You're stuck, and stuck is something that moves with practice. Getting through today counts as a step."}, "freeze": {"toward_regulated": "The way out of freeze isn't force. It's safety plus the smallest movement. A cue of safety, a wiggle of the toes, a long breath out. Each one is a small signal of safety, and that's what lets a little of the stuck energy move. Keep adding those and the freeze thaws, slowly, and the energy that's been held can finally go somewhere. That's the whole path, and it's made of tiny steps.", "if_reps_drop": "The one thing that backfires is forcing your way through. Pushing hard adds gas to a system that already has the brake slammed on, and that can tip freeze toward shutdown or lock it in tighter. So if it feels stuck, that isn't a sign to push harder. It's a sign to get smaller and safer.", "landing": "Freeze is where your body is right now, maybe for a long time. It is not where it stays. Stuck means change is near, even here."}}, "section5_helps": {"frame": ["You've got the rundown above for what tends to help in {STATE}. For this week, pick one small thing from it and actually try it. One. Small is the method.", "What helps here is in the {STATE} rundown, capacity-paced and low-demand. This week, the move is to choose one and let it be enough.", "No big plan this week. Take one line from the {STATE} rundown's 'what helps' and give it a real try. That's a complete week."], "practice_door": ["And the practice tab has a session shaped for {STATE} if you want a guided rep.", "If you'd rather be walked through it, your practice for this is waiting in the practice tab."]}, "section6_note": ["{N} check-ins in, and you're already watching your own system move. You're not grading yourself, you're getting to know yourself. Keep showing up the way you have been.", "You checked in honestly this week. Not a performance, not a test. Just you, getting a clearer read on you. That counts more than it feels like it does.", "However this week went, you showed up to look at it. Stuck, not broken, and already in motion.", "Past all the numbers, here's what's true: you're a work in progress. Not done, not failing, just moving. Your next one will be ready in a week."]};
  const STATE_NAMES = { safety:'safety', play:'regulated mobilization (play and motivation)', stillness:'regulated immobilization (stillness and intimacy)', fightflight:'fight or flight', shutdown:'shutdown', freeze:'freeze' };
  function _fill(t, ctx){ return String(t==null?'':t).replace(/\{STATE\}/g, ctx.stateName||'').replace(/\{SHARE\}/g, ctx.share!=null?ctx.share+'%':'').replace(/\{N\}/g, ctx.count!=null?String(ctx.count):''); }
  function _bullet(raw, ctx){ const m=String(raw).match(/^(.*?)\s*\u2192\s*\[([^\]]+)\]\(#([^)]+)\)\s*$/); if(m) return { text:_fill(m[1].trim(),ctx), jumpLabel:m[2], jumpId:'blog-'+m[3] }; return { text:_fill(raw,ctx) }; }
  // short felt name for in-sentence use (transitions / time-of-day), e.g. "fight or flight", "play & motivation"
  function _feltName(k){ return (RUNDOWNS[k] && RUNDOWNS[k].label_felt) || STATE_NAMES[k] || k; }
  function _fillTrans(t, tr){ return String(t==null?'':t).replace(/\{STATE_A\}/g, _feltName(tr.a)).replace(/\{STATE_B\}/g, _feltName(tr.b)); }
  const SEG_PHRASE = { morning:'mornings', afternoon:'afternoons', evening:'evenings', late:'late nights' };
  function _fillTod(t, tod){ return String(t==null?'':t).replace(/\{SEG\}/g, SEG_PHRASE[tod.seg]||tod.seg).replace(/\{STATE\}/g, _feltName(tod.dom)); }
  function rundown(dom){ const r=RUNDOWNS[dom]; if(!r) return null; return { label_precise:r.label_precise, label_felt:r.label_felt, short:cycle('rd-tldr:'+dom,r.tldr), what:cycle('rd-what:'+dom,r.what_this_is), why:(r.why_your_body&&r.why_your_body[0])||'', how:r.how_it_shows_up||'', helps:cycle('rd-helps:'+dom,r.one_thing_that_helps), practice:r.door_inward||'' }; }
  function blog(ctx0){
    ctx0 = ctx0 || {};
    const dom = ctx0.dom || ((global.Store&&Store.lastCheckin)?(Store.lastCheckin()||{}).dom:null);
    if(!dom || dom==='neutral' || !RUNDOWNS[dom]) return null;
    const ctx = Object.assign({}, ctx0, { dom:dom, stateName: STATE_NAMES[dom]||dom });
    const P = (slot,arr)=> cycle('blog-'+slot, arr||[]);
    const bullets=[];
    bullets.push(_bullet(P('where', BLOG.tldr_bullets.where), ctx));
    if(ctx.dir && BLOG.tldr_bullets.direction[ctx.dir]) bullets.push(_bullet(P('dirb', BLOG.tldr_bullets.direction[ctx.dir]), ctx));
    if(ctx.variance && BLOG.tldr_bullets.variance[ctx.variance]) bullets.push(_bullet(P('varb', BLOG.tldr_bullets.variance[ctx.variance]), ctx));
    bullets.push(_bullet(P('forkb', BLOG.tldr_bullets.fork), ctx));
    bullets.push(_bullet(P('helpsb', BLOG.tldr_bullets.helps), ctx));
    const rd = RUNDOWNS[dom], sec=[];
    sec.push({ id:'blog-1', heading:"where you've been", paras:[ _fill(P('s1', BLOG.section1_where), ctx) ]});
    sec.push({ id:'blog-2', heading:"what that state is", paras:[ cycle('s2what:'+dom, rd.what_this_is), rd.how_it_shows_up ]});
    const mv=[];
    if(ctx.dir && BLOG.section3_movement.direction[ctx.dir]) mv.push(P('s3dir', BLOG.section3_movement.direction[ctx.dir]));
    if(ctx.variance && BLOG.section3_movement.variance[ctx.variance]) mv.push(P('s3var', BLOG.section3_movement.variance[ctx.variance]));
    // transitions + time-of-day: the part of the read that only the user's own sequence can write.
    // Pulled from ctx if provided, else computed live from Store; each guarded so a noisy history shows nothing.
    const tr = ctx0.trans || ((global.Store&&Store.transitions)?Store.transitions():null);
    if(tr && tr.a && tr.b && RUNDOWNS[tr.a] && RUNDOWNS[tr.b]){
      mv.push(P('s3trframe', BLOG.section3_movement.transitions.framing));
      mv.push(_fillTrans(BLOG.section3_movement.transitions.template, tr));
    }
    const tod = ctx0.tod || ((global.Store&&Store.timeOfDay)?Store.timeOfDay():null);
    if(tod && tod.seg && tod.dom && RUNDOWNS[tod.dom]){
      mv.push(P('s3todframe', BLOG.section3_movement.timeofday.framing));
      mv.push(_fillTod(BLOG.section3_movement.timeofday.template, tod));
    }
    if(mv.length) sec.push({ id:'blog-3', heading:"your movement", paras:mv });
    const fk = BLOG.section4_fork[dom];
    if(fk) sec.push({ id:'blog-4', heading:"the fork ahead", paras:[fk.toward_regulated, fk.if_reps_drop, fk.landing].filter(Boolean) });
    sec.push({ id:'blog-5', heading:"what tends to help", paras:[ _fill(P('s5', BLOG.section5_helps.frame), ctx), _fill(P('s5d', BLOG.section5_helps.practice_door), ctx) ]});
    sec.push({ id:'blog-6', heading:"one last thing", paras:[ _fill(P('s6', BLOG.section6_note), ctx) ]});
    return { stateName: ctx.stateName, bullets:bullets, sections:sec };
  }

  global.FromJustin = {
    today, refresh, pick, label,
    deepBody, deepInvite, changeOverlay, stuckOverlay, watchFor,
    rundown, blog,
    LIBRARY, DEEP
  };
})(window);
