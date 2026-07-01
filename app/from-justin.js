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
          "text": "Energy with a little safety mixed in is a good place to be. This is the kind of drive that doesn't cost you later."
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
          "text": "Being caught between wanting to move and not being able to is one of the hardest places to be. There's nothing wrong with you for being here."
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

  const DEEP = {"_readme":"From Justin — DEEP / learn-more content. Separate from the daily-note library (content.json). This is the personalized reflection behind 'learn more': present state + what to expect (body), one small next step (invite), plus change/stuck/watch-for overlays. Keyed by the app's dom values. 'label' is the new two-axis teaching name (okay to show on this screen, immediately glossed in plain language as the body copy already does). neutral/settling has no deep entry on purpose: the dynamic reflection only fires when there is a pattern worth reflecting on. ASSEMBLY: body + change overlay + (stuck overlay, only on a streak) + (watch-for overlay, only when applicable) + invite. Invite renders last on its own line/label. Cycle each array independently with no immediate repeat per slot. In dysregulated and freeze states keep the tone soft and skip the heavier watch-for lines. Source of truth: 'Stuck Not Broken - From Justin (content + logic).md' > 'Dynamic pattern reflections'.","version":1,"states":{"safety":{"label":"safe","body":["You've been reporting more safety lately. You may notice more patience, more presence, and more room to handle things that used to throw you off. When safety is online like this, pay attention to what it actually feels like, so it's easier to find again.","More safety in your recent check-ins. This is the state where you have the most capacity, so it's a good time to face something a little harder on purpose, while you have the room for it. (It's also okay to bask in the safety instead.)","Your check-ins lean toward safety lately. Things still aren't perfect (and probably won't ever be), but they're not running you. That increased connection deserves acknowledgment."],"invite":["Take one big breath and name one thing that feels okay right now as you exhale. Naming it makes it easier to find next time.","Pick something that's been a little hard and acknowledge it for a brief moment while you have the capacity. (That's how capacity grows further.)","Before the next thing grabs you, stop for ten seconds and validate that you're okay right now. You earned this validation."]},"play":{"label":"regulated mobilization","body":["You've been reporting more play and motivation lately. That's energy with safety mixed in, so you may notice more drive, easier focus, and boundaries that cost you less to hold. It shows up as play with people you trust, and as motivation when you're on your own.","More of that mobilized, safe state in your recent check-ins. This is good fuel, and the main risk is spending it on everything at once. Point it at one thing that actually matters to you while you have it. (Resting in it is allowed too.)","Your check-ins lean toward play and motivation lately. The thing you've been putting off probably feels more doable right now. That's the safety in the mix, and it's worth using before it moves on."],"invite":["Pick the one thing that matters most and give it ten minutes. You don't have to finish it, just begin.","Name one boundary or conversation that feels possible today, and take the first small step while it does.","If this energy wants company, spend it with someone who's earned your trust. Play with a safe other is about as regulating as it gets."]},"stillness":{"label":"regulated immobilization","body":["You've been reporting more stillness lately. That's your body slowed all the way down with safety mixed in, so the quiet restores instead of flattens. Expect a pull toward rest, reflection, and easy closeness. On your own it's stillness; shared with someone safe, it's intimacy.","More of a quiet, safe state in your recent check-ins, which makes it a good time to actually rest, and to notice things you usually don't.","Your check-ins lean toward stillness lately. Rest isn't a reward you earn once everything's done. It's how your body recovers. This is a fine moment to let it."],"invite":["Take five minutes (or less or more) with no task and no phone. Just rest, or sit with one thing that's been on your mind, and simply exist in this moment.","If there's someone safe to be quiet near, reach out. Or a pet. Or just hang out with yourself distraction-free for a bit.","Let yourself fully stop for a few minutes, no agenda, and notice what surfaces when it's quiet."]},"fightflight":{"label":"dysregulated mobilization","body":["You've been reporting more flight/fight lately. There's charge with less safety mixed in, so you may notice anxiety, irritability, or the urge to either get away or push back. It's your body trying to handle something, not a flaw in you.","More of that wired, on-edge feeling in your recent check-ins. With this much charge and little safety, everything reads as urgent even if it isn't. It sorts out as you add small bits of safety, not by forcing calm.","Your check-ins lean toward flight/fight lately. The same energy runs as motivation and play once there's enough safety."],"invite":["Move it on purpose for thirty seconds through rolling your ankles or shaking your hands. Or, take your time with a walk. Then name the feeling underneath, out loud if you can.","Pick the one thing that's actually urgent and let the rest wait ten minutes. (Most of it probably can.)","Take in one intentional, bigger breath. Then let it out slowly if it's comfy to do so. Then ask what your body actually needs."]},"shutdown":{"label":"dysregulated immobilization","body":["You've been reporting more shutdown lately. That's low energy and not much safety yet, so you may notice numbness, heaviness, fog, or the pull to withdraw. It's an old, deep protective response, not weakness, and not inherently who you are.","More of that flat, far-off state in your recent check-ins. You're still showing up honestly. Well done. What helps is small and low-demand, never a big effort.","Your check-ins have leaned toward shutdown lately. It can feel permanent from the inside, even though it isn't. This is a biological state, and states shift, even when this one feels like it won't."],"invite":["Give yourself a few minutes of low stimulation: quiet, dim light, a pet, or someone who expects nothing from you.","Do one thing that takes almost no effort: a glass of water, a listen to the present, a window opened. Small is something, especially with shutdown.","Notice one thing you can hear or see right now. That's enough. You don't have to do more.","What's one thing from your environment that catches your curiosity?"]},"freeze":{"label":"freeze","body":["You've been reporting more freeze lately. That's flight/fight and shutdown at the same time, gas and brake together, so you may feel braced, ready to move, but unable to. Panic, rage, overwhelm, or fear come from freeze. A lot is happening inside, even if others can't tell.","More of that held-breath, stuck tension in your recent check-ins. It's one of the harder places to be, and easy to get overwhelmed in. Small wins count for a lot here.","Your check-ins lean toward freeze lately. It might be where your body is right now, maybe for a while. It is not where it stays. The way through is safety plus the smallest movement, not force."],"invite":["Take one intentional breath. On the exhale, try the smallest movement possible: wiggle your toes or roll your wrists. That's enough to remind your body it can move.","Take in one intentional breath. When you exhale, notice what about the environment is calling to you. Then move to it if you can. Interact with it.","Whatever you're trying to get done... make it smaller. A small step is better than no step, right? No, it's not good enough. But it's better.","Pick one tiny win and count it: a stretch, a breath, a single step. In this state, that's real progress."]}},"overlays":{"change":{"rising":["That's a step up from the past few days. Pay attention to what's different.","You're trending up from where you've been. Something's working, even if it's small.","A little higher lately. Good direction."],"falling":["That's a dip from where you've been. No alarm, just information, and a reason to go easy on yourself.","Lower than your recent check-ins. That happens. Be a little gentler with yourself today.","Things slid a bit. Not a setback, just data, and you're still showing up to track it.","A dip compared to recent check-ins. It's normal. No, seriously. It is."],"steady":["Holding about even in the last few days.","Not much change lately, and that's its own kind of okay.","Pretty level recently.","Holding steady again in this check-in."]},"stuck":["You've checked in around here {N} days running. Long stretches in one place are common, that's basically what 'stuck' means. We're after small, sustainable changes, not a flip. Showing up and checking in honestly is the progress.","{N} days in a similar spot. That's normal, and it doesn't mean you've stalled. Progress here is small and steady, not dramatic.","Around the same place for {N} days now. Staying with it and being honest about it is the work. Keep going."],"watchFor":{"fightflight":["When the tense days stack up, the body usually crashes after. Worth building in real rest before the crash picks the time for you. Schedule five minutes to actually stop. Scrolling isn't it, that's coping, which is fine, but it won't reset you.","Several wired days in a row. The body keeps that pace until it can't, then drops hard. Get ahead of it with a few minutes of real downtime today.","This much go-go-go tends to end in a crash. Try a short, deliberate stop now, so the rest is on your terms instead of forced on you."],"shutdown":["On stretches like this it's easy to believe it's permanent. It isn't. It's stuck, not broken, not forever. States move, even when they haven't in a long time.","A run of low, flat days can start to feel like 'this is just me now.' It's not. Keep an eye on that story, it's the state talking.","When shutdown lingers, the mind says it's the end state. It's a state. States shift, even the slow ones."],"improving":["If you're feeling more connected, take a second to notice what helped. A plain 'good job' to yourself counts, as long as it's real.","Things are looking up a little. Worth clocking what's different so you can do more of it.","You're trending better. Give yourself some honest credit, nothing forced."]}},"assembly":"body + change overlay (always, from trend dir) + stuck overlay (only on a streak, fill {N}) + watch-for overlay (only when applicable; capacity-gated, skip the heavier fightflight/shutdown lines while currently in a dysregulated or freeze state) + invite (its own line, last). Pick one variant per array and cycle independently with no immediate repeat per slot. 2-3 sentences plus the invite."};

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
    // onboarding: on the very first check-in (or before any exist), the card welcomes instead of
    // reading a state, so a brand-new user isn't handed a pattern note before there's a pattern.
    const _tn = (global.Store && Store.tenure) ? Store.tenure() : null;
    if(_tn && _tn.stage === 'start'){
      if(_cache && _cache.state === '__onboard') return _cache.note;
      _cache = { state: '__onboard', note: { state:'start', label:'', id:'onboard', type:'reminder', text: cycle('onboard-start', ONBOARD_START) } };
      return _cache.note;
    }
    const key = stateKeyFor(last);
    if(_cache && _cache.state === key) return _cache.note;
    const p = pick(key);
    _cache = { state: key, note: Object.assign({ state: key, label: (LIBRARY[key]||{}).label || '' }, p) };
    return _cache.note;
  }
  function refresh(){ _cache = null; }

  // ---- daily reflection ("for you" daily card, reflections DAILY tier) --------
  // Justin's VERBATIM §17 copy (all-app-copy.md). Assembly per his spec: one Meet
  // line (names the felt experience, never the precise state) + one Point or Ask
  // (Ask gated by policy: open/sparing/withhold). A 2nd+ same-day check-in adds a
  // shared Arc line; a post-practice check-in swaps in a shared Delta line. Arrays
  // cycle no-repeat. State keys map dom -> his sections (play=safe & mobile,
  // stillness=safe & immobile, neutral=present/neutral).
  const DAILY = {
    safety: { policy:'open',
      meet:["You're grounded in the here and now.","You're connected with the present moment.","Present and connected. (enough, at least.)"],
      point:["Worth staying with for a moment, before the next thing pulls at you. (Which it probably will.)","A good opportunity to get familiar with this state, so it's easier to find again.","Rest in it for a moment. Take it in."],
      ask:["What helped you arrive here, even a little?","What feels possible right now that doesn't always?","How is your body naturally breathing right now?"] },
    play: { policy:'open',
      meet:["Charged up but connected.","Energy moving, and it feels more like fuel than pressure.","Wound up but in a good way, with some ease in the mix."],
      point:["Point it at one thing that matters.","If it wants company, spend it with someone who has earned your trust.","Keep a little safety in the mix, and it stays energized without the crash."],
      ask:["What do you most want to put this toward right now?","What's one thing worth starting today?","What's something you've been putting off that you have the energy for now?","How is your body naturally breathing right now?"] },
    stillness: { policy:'open',
      meet:["Quiet, and okay being quiet.","Slowed all the way down, and okay with the slowness.","Settled and soft right now.","Stillness internally. And ability to connect with stillness externally."],
      point:["This is an opportunity for real rest.","Nowhere to be for a minute. Let yourself marinate in it."],
      ask:["When it's this quiet, what's been waiting for your attention?","What's easier to hear now than when things are loud?","An opportunity to connect with your inner world.","How is your body naturally breathing right now?"] },
    fightflight: { policy:'sparing',
      meet:["Wound up and hard to settle.","A lot of charge moving, looking for somewhere to go.","Maybe irritable. Maybe anxious. Maybe both?"],
      point:["The internal activation is real, and the discomfort that it brings.","This kind of charge needs somewhere to go. A little movement on purpose helps more than holding still."],
      ask:["What type of movement would your system love right now? Would you rather go for a run or lift weights? Use your legs or your arms?","What's the feeling underneath the internal activation?","How is your body naturally breathing right now?"] },
    shutdown: { policy:'withhold',
      meet:["Heavy, far-off, low on energy.","Flat and slowed down right now.","Little energy to care. Yet, you're showing up here."],
      point:["You don't force your way out of this. One small, low-demand thing is plenty: a sip of tea, a look out the window, a toe wiggle.","It can feel permanent from the inside, even though it isn't. And yeah, maybe it's been this way for a long while."],
      ask:["What's one sound you can hear without trying?","What's one color in front of you right now?","How is your body naturally breathing right now?"] },
    freeze: { policy:'sparing',
      meet:["Braced. Wanting to move yet stuck at the same time.","Immobile on the outside, but a lot is going on inside.","Holding your breath without meaning to, huh?"],
      point:["The way through isn't forced. A wiggle of the toes, a neck rotation, one big breath into the chest.","Pushing hard tends to lock it tighter. Smaller and slower is better for the system when you can."],
      ask:["Can you roll your wrists or wiggle your toes? If so, a little movement just opened up.","Can you let the feeling be here without pushing it away? If not, that's okay for now.","Can you take one intentional breath and let it out slower? And then, can you stretch one part of your body?","How is your body naturally breathing right now?"] },
    neutral: { policy:'open',
      meet:["Hard to pin down right now, and that's fine.","Somewhere in between, nothing too obvious."],
      point:["Nothing to change. Noticing is enough.","Check in whenever you're ready, or let it be for now."],
      ask:["If you had to guess, what's one word for how this moment sits in your body?","How is your body naturally breathing right now?"] }
  };
  // Shared Arc line — 2nd+ same-day check-in, keyed to within-day movement.
  const DAILY_ARC = {
    eased:   ["A couple of check-ins in today, and things have eased since this morning. Worth noticing the shift."],
    charged: ["You started more grounded, and there's more energy now. Pay attention to that feeling and what it might want."],
    mixed:   ["You've moved through a few different places today. That's range (and you're still showing up), not instability."],
    steady:  ["Today has held pretty steady so far."]
  };
  // Shared Delta line — post-practice check-in, keyed to the shift (the safety moment).
  const DAILY_DELTA = {
    eased:    ["You did a practice, and you're more grounded now than before. These little practices add up over time."],
    held:     ["The practice didn't shift much this time, which is okay. Showing up for the practice is the rep that builds, whether or not it moves obviously. An imperfect rep is still a rep."],
    struggled:["That was a tough one to stay with, and you stayed anyway. That's the rep, even when it doesn't feel like one. It's something to learn from and adapt to next time."]
  };
  function _dailySecond(key, st){
    // pick Point or Ask: open -> alternate Ask/Point; sparing -> Ask ~1 in 4; withhold -> Point only
    let useAsk = false;
    if(st.policy === 'open')        useAsk = (Math.random() < 0.5);
    else if(st.policy === 'sparing') useAsk = (_promptTick++ % 4 === 0);
    if(useAsk && st.ask && st.ask.length) return cycle('daily-ask:'+key, st.ask);
    return cycle('daily-point:'+key, st.point);
  }
  function daily(ctx0){
    const t = (ctx0 && ctx0.n!=null) ? ctx0
            : ((global.Store && Store.today) ? Store.today() : { moments:[], sessions:[], n:0, dir:null, deltas:[] });
    const last = (global.Store && Store.lastCheckin) ? Store.lastCheckin() : null;
    const n = t.n || 0;
    // No check-in today: graceful present/neutral prompt (his copy). Tappable to the
    // reader when there's prior history, static otherwise.
    if(n===0){
      const st0 = DAILY.neutral;
      const text0 = st0.meet[1] + ' ' + st0.point[1];   // "Somewhere in between..." + "Check in whenever you're ready..."
      return { state: last ? last.dom : 'neutral', n:0, text: text0 };
    }
    const dom = t.last.dom;
    const st = DAILY[dom] || DAILY.neutral;
    const parts = [ cycle('daily-meet:'+dom, st.meet), _dailySecond(dom, st) ];
    // same-day extra line: a post-practice latest moment -> Delta; else 2+ moments -> Arc
    const M = t.moments || [];
    const lastM = M[M.length-1], prevM = M.length>=2 ? M[M.length-2] : null;
    const sBetween = (t.sessions||[]).find(s => s.t < lastM.t && (!prevM || s.t > prevM.t));
    if(sBetween){
      const beforeV = prevM ? prevM.v : null;
      const rose = (beforeV!=null) && (lastM.v > beforeV + 0.04);
      const dkey = (sBetween.feedback === 'struggle') ? 'struggled' : (rose || sBetween.feedback === 'more') ? 'eased' : 'held';
      parts.push(cycle('daily-delta', DAILY_DELTA[dkey]));
    } else if(n >= 2){
      const distinct = M.map(m=>m.dom).filter((d,i,a)=>a.indexOf(d)===i).length;
      const akey = distinct >= 3 ? 'mixed' : t.dir==='up' ? 'eased' : t.dir==='down' ? 'charged' : 'steady';
      parts.push(cycle('daily-arc', DAILY_ARC[akey]));
    }
    return { state: dom, n, text: parts.join(' ') };
  }

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
  const RUNDOWNS = {"shutdown":{"label_precise":"Dysregulated immobilization","label_felt":"shutdown","tldr":["The heavy, far-away, hard-to-move moments are shutdown. That's not you failing, and it's not who you are. It's one of the oldest ways your body protects you when things get to be too much. It's a state, and states move.","Numb, flat, like you're living behind glass. That's shutdown. Your body pulled its oldest brake to get you through. Stuck, not broken. And stuck is temporary.","If everything feels heavy and far away, your body has powered down to protect you. That's shutdown. It kept you safe when things were too much, and, like every state, it has the potential to come and go... even if it's been around a very long time.","Shutdown is the lights dimming, not the power going out. Heavy, slow, hard to care. A protective response, not a flaw. It doesn't have to be permanent, even though it feels like it. And yeah, it's maybe been that way for a very long time."],"what_this_is":["Shutdown is dorsal vagal, the oldest brake your body has. A limp collapse when things are way too much. Through this lens, a lot of what gets called depression is the body in shutdown. This isn't a weakness, and it isn't who you are. It's protection.","This isn't the cartoon, one-dimensional version of 'shut down.' Think of it more like a gradient. You might be 70% getting-through-the-day and 30% in a heavy, far-off place. Both are true at once. Shutdown is that heavy, powered-down part. The collapse. The oldest protection your body has. But it's not all-or-nothing, even if it feels that way."],"why_your_body":"When danger is too much, and you can't escape or fight it, your body survives by conserving its resources through powering down. That's not a malfunction, and it's not a character flaw. It's a deep, ancient biological protective response, the kind that takes over when nothing else can. Your thoughts change along with your state, resulting in more pessimism and hopelessness.","how_it_shows_up":"In the body, it's cold, heavy, drained, hollow, numb. The body's impulse is to immobilize, to isolate, to disappear, to be alone in the quiet or the dark. The feeling runs numb and unmotivated, helpless, alone, and often carries shame, guilt, and sadness. And the thinking goes with it: hopeless, slow, clouded, \"what's the point.\" Deeper emotions like shame and hopelessness feel like stone-carved truths. But they're not. They're coming from the state, not from the facts. This is exactly the place you might call yourself broken or lazy, and it's exactly where that word is wrong.","one_thing_that_helps":["Very small, very low demand. One sip of tea. A dimmer light. One thing you can see or hear right now. You don't climb out of shutdown by forcing it. You offer your body a small cue of safety, and it may start to allow a little more energy back in.","Don't fight the state, use it. Shutdown isn't good for starting a big project, but it's really good for being alone, for quiet, for small movements, for rest. Let yourself have the quiet you're being pulled toward, in doses. The way out is through.","Get to know it a little, the way you'd get to know a new acquaintance, not by demanding everything at once. How heavy are your arms right now? Where's the numbness, exactly? You don't have to fix anything. Just notice, little by little.","Later, when the energy starts to return, it can manifest as irritability. That's not a setback. That's the mobilized system coming back online, which is a potential great sign. Getting a little 'fed up' is often the first step out of shutdown immobility.","In the heavy moments, getting through is enough. You don't owe anyone more than that today, including yourself. Showing up here and checking in honestly already counts as a step. If that's the best you can do, then well done."],"door_inward":"When you've got a little more capacity, the practice tab has a gentle one built for exactly these moments, low demand, just a bit of safety to settle into. No rush. It'll be there when you are."},"safety":{"label_precise":"Safety","label_felt":"safety","tldr":["Safety is your body open to the world, maybe calm enough to connect, maybe playful enough to dance, and with enough capacity to meet what's usually a challenge. Safety is not the absence of problems. It's the presence of enough emotional capacity to handle them.","The settled, present, room-to-breathe feelings are safety. It's biology, not a mood you have to earn. Notice it while it's here, because that noticing is what makes it easier to find next time.","Safety is when your system stops spending everything on defense and gets to rest, connect, and grow instead. It comes, and it goes. That's normal, and that's how it's supposed to work. Soak it up while it's there, but be prepared for it to depart. It'll return again.","Calm, connected, curious, and a little more emotional space inside. That's safety. It can feel unfamiliar at first, even a little uncomfortable. That's normal. Let it be here anyway."],"what_this_is":["Safety is ventral vagal, the newest part of the nervous system, the one that wires your heart, face, and voice together. When it's online, your body isn't braced for anything. It spends its resources on health, connection, and repair rather than on defense. Safety has the wonderful ability to allow difficult emotions and can even repurpose them for positivity.","Safety is not the absence of hard emotions. It's having enough capacity inside to meet them. You can be in safety and still have a hard moment. The difference is that there's enough capacity to handle it without spiraling into defense."],"why_your_body":"Your body has detected enough cues of safety that the ventral vagal pathways come online. If they stay online, it can calm defense and even allow the body to release pains it's held onto for a very long time.","how_it_shows_up":"In the body, it's warm, open, spacious, light. It can be energized or calm. Safety loves connection: with others, the self, or the environment. Notice that impulse when it's there and act on it while you can. Your thinking opens up, allowing curiosity, empathy, and reasoning. Safety ebbs and flows, increases and decreases.","one_thing_that_helps":["Notice it on purpose. A cue of safety only becomes an anchor when you pay attention to how it affects your body. That's a safety rep, and it's what makes safety easier to find next time. Where do you feel the settledness, exactly?","Don't grab it too tight. Safety comes and goes, it's supposed to. Can you let it be here without needing it to stay? Giving your system permission to move in and out of safety is part of how the brake gets stronger.","Use it for the thing that needs a little safety mixed in. If there's a harder feeling you've been keeping at arm's length, this is the state with room to glance at it, in a dose, then come back.","If it feels weird, that's okay. Safety can feel unfamiliar, even unsafe, oddly. (But it usually makes sense based on one's life context.) Just notice that too, no judgment. You don't have to trust it yet to let it be here."],"door_inward":"Use this safety for a rep that builds the brake directly. The practice tab has one for exactly that: touch a little of the harder stuff while you're anchored, then come back. Small and repeatable."},"play":{"label_precise":"Regulated mobilization","label_felt":"play & motivation","tldr":["Energized, driven, with safety mixed in. That's regulated mobilization, the good kind of busy. It shows up as play with people you trust, and as motivation when you're on your own.","That fire in your belly, but it's not chasing or running from anything. It's pointed at something. Same fuel as flight/fight, just with safety mixed in. This is the kind of drive that doesn't cost you later.","The 'let's go, I've got this' moments are regulated mobilization. Activation that you don't need to calm down, because this is just you moving toward what matters.","Playful with others, motivated on your own, energized either way, and still grounded in your body and the present moment. That's safety plus your get-up-and-go, online at the same time. Good company to keep."],"what_this_is":["This is ventral safety plus sympathetic mobilization, the exact same fuel that powers flight/fight. The energy was never the problem. Whether safety is mixed in is the whole difference. With safety, that fuel runs as play and motivation. Without it, the same fuel runs the flight/fight response. It comes in two settings: play is the mobilized, social kind, shared with people you trust, and motivation is the solo version, that same drive aimed at something you want to get done.","Not all activation is something to fix. You might have been taught to 'calm down,' like every bit of energy is a problem. It isn't. Some of it is just you, moving toward what matters, with enough safety mixed in to enjoy the ride. There's a kind of busy that drains you and a kind that fills you. This is the second one."],"why_your_body":"Your system has enough safety to point its mobilizing energy at something, instead of away from a threat. That's a major shift. The energy found a direction because there was finally enough safety to give it one.","how_it_shows_up":"The body is energized, bouncy, flowing, open. Look at the impulse, it's the tell: to make, to imagine, to start, to take turns, to share. With safe others, that shows up as play. On your own, it shows up as motivation, like the pull to start the thing, build the thing, go after the thing. The feeling is excited, fun, a little sassy when it's social, focused and driven when it's solo. The thinking turns curious, inventive, collaborative, big-picture. Same signature either way: high energy whose impulse is creative, not defensive.","one_thing_that_helps":["Aim it before it scatters. Pick the one thing that matters most and point the energy there. You don't need to finish whatever it is. Just spend ten minutes on it. (Or more, or less.) The point is to use the safe energy while it's there, but do so mindfully.","You don't necessarily need to slow down. Just keep mindfulness attached to the movement, the energy, the creativity, the laughter, and the smiles.","If it's the social kind, spend it on people. Reach out to someone you trust, do something together, even if it's simple. Playing (or working) with a safe other allows your energy to move, while also reinforcing the safety piece.","Let yourself move, but do so intentionally and consciously. Slow down enough to actually feel the movement, like a stretch or the resistance of a light dumbbell weight. Notice it and embrace it for a second. The sympathetic energy settles or gets used when you stop rejecting it."],"door_inward":"To bank some of this, the practice tab has a session that uses a state like this to build capacity, so the drive stays drive and doesn't cost you on the back end."},"stillness":{"label_precise":"Regulated immobilization","label_felt":"stillness & intimacy","tldr":["Quiet, settled, slowed down, and not afraid. That's regulated immobilization, stillness on your own, intimacy when it's shared with someone safe. The same slowing as shutdown, but with safety mixed in, so it restores instead of collapsing.","The 'I can just be here' kind of quiet. Rest that actually rests you. Notice it while it's here.","Settled and still, alone without being lonely, or close and easy with a safe other. That's a deeply regulated state, the state where the body recovers, and the deeper work gets done.","Slowed all the way down, soft, calm, no fear in it. That's stillness. It's not you shutting down. It's your body safe enough to rest."],"what_this_is":["This is safety plus immobility. You are slow and quiet, but without fear. It's the same slowing you'd feel in shutdown, only with safety mixed in and repurposing it, which changes everything. Immobility without fear is stillness. Immobility with flight/fight trapped under it is freeze. Stillness is the quiet you settle into on your own; intimacy is that same settled quiet shared with a safe other.","Rest isn't a reward you earn after everything's done. It's a necessity; it's how your system restores its balance. This is the state behind real sleep, sitting still without crawling out of your skin, and easy closeness with someone safe."],"why_your_body":"There's enough safety for your system to rest and restore instead of brace and collapse. Your body recognized it's safe enough to stop. And stopping is doing something here in stillness, not nothing.","how_it_shows_up":"The body settles, soft, still, releasing, light. The impulse is quiet and inward, to breathe, to reflect, to take in, to let biology do its thing. On your own, that's stillness. With a safe other close, the same settledness becomes intimacy, quiet shared without needing to perform or fix anything. The feeling is calm, peaceful, restful, and sometimes a little awe. The thinking goes contemplative, reflective, and wondering. Here's the contrast to hold: shutdown's pull is to isolate and disconnect. But stillness/intimacy's pull is to rest and connect. Same quiet body, opposite direction, because one has safety mixed in and one doesn't.","one_thing_that_helps":["You don't have to deserve this through overworking. In stillness, sink into it and follow your system where it wants to take you.","If a safe person (or pet) is near, connect with them. You don't have to talk or do anything. Quiet, close, easy. That's stillness and connection, and it's about as regulating as it gets.","Use it for quiet inner work when you have the room. This settled state is good ground for gently turning toward something, in a dose.","Notice the difference between this and collapse. If the quiet starts feeling flat or heavy, or even scared, instead of restful, that's the cue to reach for a little safety, not to force yourself up and out."],"door_inward":"The practice tab has a quiet, low-demand session that fits a state like this, a place to settle deeper, or to do a little gentle inner work while you've got the calm to hold it."},"fightflight":{"label_precise":"Dysregulated mobilization","label_felt":"flight/fight","tldr":["Wired, urgent, can't-settle, anxious, or irritable, or both. That's flight/fight, sympathetic energy without enough safety mixed in yet. Same biology as motivation and play, just no safety online yet, so the body's using it for defense.","Everything feels urgent even when it maybe isn't. That's a mobilized state talking, not the facts. Your body picked up danger and got you ready to handle it. That's protection, not a flaw, even when it bumps into the people around you. And maybe this danger state has been around for a long time.","The racing, jittery, on-edge feelings are flight/fight. Anxiety is the urge to run that hasn't run. Anger is the urge to fight that hasn't fought. It's energy looking for somewhere to go.","Hot, fast, tense, ready. That's mobilizing energy without enough safety yet. The good news is this is the exact same fuel that, with a little safety, turns into motivation and play."],"what_this_is":["This is sympathetic energy without enough safety mixed in yet. Flight tends to come first: the legs, escape, distance, anxiety; then fight: the upper body, push, boundaries, anger. It's the same energy as play and motivation. The only thing missing is safety, so the body spends it on defense instead of drive.","Anger and anxiety aren't the enemy. Anxiety is your body warning you about something. Anger gives you power and motivation. They're uncomfortable and can get out of hand when they're stuck, but they're not bad or random. They're a mobilized body doing its job."],"why_your_body":"Your neuroception picked up danger, real or remembered, and your body mobilized to handle it. That's protection, not a malfunction, even when it spills onto people you care about. Your thoughts follow the state of your body. So, the thoughts that feel like hard facts right now, the blame, the worst-case thinking, are the brain's story of a revved-up state, not the truth about your life.","how_it_shows_up":"The body runs hot, tight, clenched, jittery, burning, under pressure. The impulse is to run, to escape, to push back, to fight. The feeling is anxious, nervous, irritable, angry, and resentful. An emotion is the conscious experience of an impulse you haven't acted on. Anxiety is the run that hasn't run. Anger is the fight that hasn't been fought. The thinking gets judgmental, blaming, polarized, magnifying, and stuck in the past or future. When you're revved up like this, everything feels urgent even when it isn't, and the body can't tell the difference until you slow down enough to sort it out. (To slow down, you need a bit more safety.)","one_thing_that_helps":["Move a little, on purpose. Two minutes, a quick walk, shake out your hands, push your palms against a wall. Give the energy somewhere to go, then name the feeling underneath it. Naming it is a solid first step to letting it move through instead of running you.","Lengthen the exhale. Breathe in like normal, then let the air out slowly. The long exhale is one of the few direct lines you've got to the brake. Breathing won't cure your flight/fight activation, but it can offer a brief pause. Use that small moment to make a small movement, like pushing into your palms or one squat.","Point it, don't just cope with it through actions you'll regret later on. This energy is power looking for a direction. Is there something that actually matters you could aim it at, even a small thing? Sympathetic energy with a target is motivation.","The urgent, worst-case scenario thoughts are maybe just the state talking, not the facts. You don't have to argue with them. It's okay to acknowledge them during a long exhale.","Find a little safety before you try to slow down. White-knuckling rarely works. A cue of safety, a hand on your chest, a familiar voice, one safe thing in the room, gives the energy a reason to settle."],"door_inward":"The practice tab has a session built for a charged state like this, settle some of the energy first, find a little safety, then it's easier to work with what's underneath."},"freeze":{"label_precise":"Freeze","label_felt":"freeze","tldr":["Ready for action yet can't move... at the same time! Braced, holding your breath without meaning to, a lot is moving inside while nothing moves outside. That's freeze, flight/fight energy held down by shutdown. Gas and brake at once.","The trapped, can't-move-can't-rest feeling is freeze. It's one of the most uncomfortable states to be in. There's nothing wrong with you for being here.","Freeze is not the same as shutdown. It's a mixed state combining shutdown immobility with flight/fight mobility. It's both pedals down at once, accelerator and brake together. A lot is happening in there, even when it looks like nothing on the outside.","Panicked and stuck, or enraged and stuck. That's freeze, the urge to move, and the inability to do so at the same time. The way out isn't force or fake rest through phone binges. It's a little mindfulness per day. Small safety practices. And small movements on purpose."],"what_this_is":["Freeze is a mixed state, flight/fight energy frozen in place by shutdown. Gas and brake pressed at the same time. This one's easy to get wrong. Freeze is not a deeper shutdown. Shutdown is brake only. Freeze is both pedals down at once. That's why it can feel ready to move but unable to in the same breath.","The mobilized energy, the flight/fight, got frozen in place by the shutdown brake. To get unstuck, you thaw the frozen part first, with safety, and then the once-frozen energy can finally discharge. Thaw, then move. Not force."],"why_your_body":"Your body mobilized to act and then couldn't, so the energy got frozen in place. That's a braced, protective state, not nothing, and not weakness. A lot is happening inside, even if that's not obvious to someone on the outside.","how_it_shows_up":"Because it's a mixed state, the body carries the charge and the brake at once, paralyzed and jittery, clenched, knotted, constricted, holding its breath. The impulse splits too, to be invisible, to endure, and underneath all of it, to release. The feeling runs high: panic, fear, rage, overwhelm. Remember the mechanics: panic is the urge to flee that can't move, rage is the urge to fight that can't move. The thinking gets scattered, all-or-nothing, sometimes flooded. That 'release' pull underneath is the stuck energy that hasn't had anywhere to go.","one_thing_that_helps":["The smallest movement, plus a cue of safety. Let your eyes go wherever they want, then wiggle your toes or roll your wrists, slow. A tiny movement reminds the body it can move at all, and safety is what lets a little of the stuck energy begin to shift.","Don't force it. Pushing hard adds gas to a system that already has the brake slammed on, and that can lock freeze in tighter or tip it toward shutdown. Focus on small, simple, predictable, and repeatable.","In doses, not all at once. You're not going to fully thaw freeze in one sitting. Use simple mindfulness. Stretch a little. Take an intentional breath. Stretch again. Little by little.","Prioritize safety, whether a safe person, a pet, a sensory input, or getting outdoors. Freeze thaws through increased safety, so whatever brings you a cue of it, use it. Safety thaws the freeze slowly, in doses, over time."],"door_inward":"The practice tab has a session made for exactly this, pendulation, gently moving your attention between a little discomfort and a little safety, so the freeze can thaw at a pace your body can handle."}};
  const BLOG = {"tldr_bullets":{"where":["You spent most of this week in {STATE}. → [state breakdown](#1)","This week leaned mostly into {STATE}. → [state breakdown](#1)","{SHARE} of your check-ins this week were {STATE}. → [state breakdown](#1)"],"direction":{"rising":["Your safety has been rising across the week. → [what the data shows](#3)"],"falling":["Your safety dipped a little (and that's okay). → [what the data shows](#3)"],"steady":["Your safety held pretty level this week. → [what the data shows](#3)"]},"variance":{"shifts":["Your state moved around a lot. → [what the data shows](#3)"],"consistent":["Your states remained constant this week. → [what the data shows](#3)"]},"fork":["Things can generally go in one of two ways. → [what to expect](#4)","Two potential directions to keep an eye out for. → [what to expect](#4)"],"helps":["One small thing worth trying. → [what helps](#5)","A small practice to try. → [what helps](#5)"]},"section1_where":["Most of your check-ins this week landed in {STATE}. That's the state your system kept coming back to.","This week leaned mostly into {STATE}, {SHARE} of your check-ins. Not every moment, but the state your system returned to most.","Where you've been this week, mostly: {STATE}. Think of it as the home base your system kept circling back to, at least these past seven days.","{SHARE} of this week landed in {STATE}. So that's the state we'll look at, because it's where you actually spent your time."],"section3_movement":{"direction":{"rising":["Your safety sits higher at the end of this week than at the start. That's something to take note of and keep an eye on, and maybe look for ways to maximize this potential.","The trend this week points up. One week isn't the whole story, but it's a real sign of movement toward more safety. Worth leaning into where you can."],"falling":["Your safety sits a little lower at the end of this week than at the start. Safety comes and goes, and that's completely normal for anyone. Be a little gentler with yourself over the next few days.","Safety dipped a bit this week. It's not good or bad. It just is. Noticing it honestly is a solid step."],"steady":["Your safety held pretty level this week. A calm stretch is a solid sign of maintaining safety. To give it a boost, look for small ways to invite safety mindfully.","Not much swing in your safety this week; it stayed in a similar range. A flat stretch is still a stretch you showed up for."]},"variance":{"shifts":["Your check-ins moved around a lot this week, rather than sitting in one place. Not good or bad. Nor right nor wrong. It just is. We just pay attention.","You moved through a few different states this week. That's not good or bad, it's just something to notice for now and keep collecting check-ins about. Let's keep an eye on what practices move your system more toward safety and tolerable defense."],"consistent":["Your check-ins clustered in a similar place this week.","Your check-ins stayed in about the same place all week. If that place feels okay, keep doing whatever you're doing. If not, try out a different practice. There's a lot to customize."]},"transitions":{"framing":["This is the part of your week that's just yours, the order your states tend to move in.","Your system has a pattern to how it moves, and it's starting to show."],"template":"One shape in your week: you tend to move toward {STATE_B} after {STATE_A}. Not a forever rule, but a pattern from this past week's collection of moments.","_note":"renders only when the transition signal is computed"},"timeofday":{"framing":["There's a time-of-day shape to it, too.","And your check-ins have a rhythm to when they tend to land."],"template":"Your {SEG} tends to lean more toward {STATE}, more often than not."}},"section4_fork":{"safety":{"toward_regulated":"If you keep noticing safety and using it the way you have been, it stops being a visitor and starts becoming a baseline. That's what the reps do. Over time, your vagal brake gets stronger, and a stronger brake means you can meet harder things and recover faster. You won't stop leaving safety (that was never the goal), and you're never going to feel complete safety all the time (also not the goal). If anything, the goal is to build enough safety to move freely amongst all of your body's states without getting stuck or dysregulated.","if_reps_drop":"If safety stops getting your attention, it tends to stay a visitor. Nothing breaks. You just lean back toward whatever your older home was, and safety gets harder to find again, not because you lost it, but because it didn't get practiced. That isn't failure. It's how a skill works.","landing":"Either way, you've shown your system can find this place. That's the part worth trusting."},"play":{"toward_regulated":"Keep a little safety mixed into this energy, and it stays fuel instead of turning into a fire. Over time, the safety state gets stronger, which lets you mobilize in productivity yet be able to settle into stillness in the same day. You get to use your drive without it costing you on the back end.","if_reps_drop":"If the safety thins out and the pace keeps climbing, the same energy can tip the other way, toward the dysregulated version: anxious and irritable, snapping at people you didn't mean to. It's the exact same energy. The only thing that changed is whether safety was mixed in. Slowing down with some mindfulness is an option, but it's not the only one. Maybe just adding mindfulness to your energy and where it wants to go.","landing":"None of this is a warning. It's just how the body works. Whether you're mobile or immobile, change is always close."},"stillness":{"toward_regulated":"If you let this rest actually restore you, it does more than feel good. Immobile with safety mixed in is where the body recovers and where the deeper work gets done. Keep practicing it, and stillness stays stillness: quiet you can sink into without disappearing.","if_reps_drop":"If the safety thins out, this same quiet can drift toward its harder twin. Stillness without safety mixed in is shutdown, the same slowed-down body, only heavy instead of restful. You'll know the difference by the flatness or the numbness. If rest starts to feel like a fatigued collapse, that's the cue to reach for a little safety through mindfulness of the present moment, not to force yourself up and out.","landing":"Collapsed, still, or somewhere in between, the body can move again."},"fightflight":{"toward_regulated":"Every small cue of safety you offer gives this energy somewhere to go. Over time, mobilization with safety mixed in becomes motivation and play instead of flight/fight. Same internal energy, but with or without the regulation of safety. As this mobility mixes more with safety, it turns into getting stuff done, but more effectively.","if_reps_drop":"If this pace just keeps going with no safety added, the body runs until it can't, and then it tends to drop, into shutdown or freeze. That's a normal, expected outcome when there's nothing left, not a character defect. So, the next move is probably not to white-knuckle through. It's to slip in small reps of safety now, before the crash picks the time for you.","landing":"You're not broken, and you're not too much. You're mobilized, but not enough safety has been mixed in yet. Yet!"},"shutdown":{"toward_regulated":"In the heavy moments, this is hard to believe, so just hold it lightly. Every small, low-demand safety cue you can manage helps the system come back online. Over time, shutdown shifts toward stillness. It's a similar internal quiet, but more peaceful than numb. As energy returns from stillness, it might show up as motivation. But it might also show up as irritability. Either of those is good news. It means things are moving again. Small is enough in this moment. Shutdown likes small and simple.","if_reps_drop":"Shutdown can stick around long enough to feel like just who you are. (Maybe you can relate.) The heaviness is real, and it makes sense as a response to too many life obstacles. But feeling permanent isn't the same as being permanent. From the inside, shutdown makes everything look fixed and hopeless. That's the state, not the facts. It can shift, even if it hasn't in a long time.","landing":"You're not broken. You're stuck, and stuck is something that moves with simple mindfulness and small safety practices."},"freeze":{"toward_regulated":"The way out of freeze isn't force. It's a small safety cue plus the smallest movement. The small safety cue removes the brake of shutdown immobility. And the small movement allows once-frozen flight/fight to move. Small means practical and sustainable. And then repeat. Freeze thaws and stays thawed from repeatable, small practices.","if_reps_drop":"Two things backfire when trying to deal with freeze: 1) forcing your way through it, only to collapse at the end of the day, and then repeat the next day. And 2) faking rest. Faux-rest is when you cope by doing something that numbs your internal experience, like doom-scrolling. It looks like rest, but it's not real rest. Instead, give yourself actual rest, even for short bursts, like one intentional breath at work while looking out a window. Or, plop face-first onto the bed when the demands are done and give yourself five minutes of no-distraction silence. Add in small movements as well, like an ankle roll or pushing into your hands here and there to help your system move.","landing":"Freeze is where your body is right now. In this moment. And yeah, maybe for a long time. But we focus on the present moment as much as we can. Our states have the potential to change all the time. So, we pay attention here and now."}},"section5_helps":{"frame":["You've got the rundown above for what tends to help in {STATE}. Pick one small thing from it and actually try it. Just one. And make it practical. Progress, not perfection. Would you rather end the day knowing you did one small thing or that you did nothing because you assumed it wasn't enough?","What helps here is in the {STATE} rundown, small and low-demand. Choose one and let it be enough for now. People tend to assume they need to do more. Go deeper. But small is usually enough to get something going. And then you do it again later.","No big plan needed. Take one line from the {STATE} rundown's 'what helps' and give it a real try."],"practice_door":["And the practice tab has a session shaped for {STATE}, your guided rep made just for you and your wonderful nervous system.","Your practice for this is waiting in the practice tab; it'll walk you through it."]},"section6_note":["{N} check-ins in, and you're seeing your system taking shape and shifting. These aren't grades. Not good and bad marks. You're getting to know yourself through honest and simple check-ins. Keep showing up the way you have been.","You checked in honestly this week. Not a performance, not a test. Just you, getting a clearer picture of you. That counts more than it feels like it does.","However, this week went by, and you honestly showed up to take stock of every present-moment check-in. Stuck, not broken, but already in motion.","You gave honest reflections in your check-in this week. It seems small, sure. It's a small step to check-in, but it's a step. And a sign that you're taking yourself and your wellness seriously.","Nice job on the check-ins this week. Let's put this small act into perspective. Who else in your life is paying attention like this? Probably not many people. (Probably zero people.) And yet... who needs to? Here you are, paying attention. Well done.","Past all the numbers, here's what's true: you're a work in progress, just like anyone else. Not done, not failing, just trying. Your next one will be ready in a week."]};
  // ---- onboarding daily-card notes (felt, proper case, no first person, no state name) ----
  const ONBOARD_START = ["You can check in as often or as little as you like. The app tracks morning, afternoon, evening, and late night. So, to get the best results, check in throughout the day and learn how your system shifts over the span of a day, a week, and beyond."];
  // ---- tenure-aware framing for the for-you blog (additive; layered on top of BLOG) ----
  // Honesty scales with data depth. blog() reads Store.tenure().stage and picks these;
  // 'week' and anything undefined fall back to the approved BLOG copy.
  const BLOG_STAGE = {"orientation":["You're just getting started. Here's what you came in with. → [start here](#2)","First check-in down. Here's where things stand right now. → [start here](#2)"],"fork_intro":["Let's keep an eye on how your system shapes over time. Here's where a state like this tends to go.","Worth watching how your system takes shape over time. Here's the direction a state like this tends to shift toward."],"where_bullet":{"early":["So far, mostly {STATE}. → [state breakdown](#1)","Your first few check-ins point to {STATE}. → [state breakdown](#1)"],"building":["Lately, mostly {STATE}. → [state breakdown](#1)","{SHARE} of your check-ins lately were {STATE}. → [state breakdown](#1)"]},"section1_where":{"early":["So far, your check-ins lean toward {STATE}. That's an early look, not the final picture; you've only checked in a few times. It might be the state that needs more of your attention.","Across your first few check-ins, {STATE} appears most often. It's early yet, but this is the place to start paying attention.","Your first check-ins point toward {STATE}. A few more days will make this clearer. For now, that's the state worth getting to know."],"building":["Over the past few days, your check-ins have leaned mostly toward {STATE}. Not every moment, but the state your system keeps coming back to lately.","Lately, most of your check-ins land in {STATE}, {SHARE} of them. It's becoming the state to watch.","The past few days have landed mostly in {STATE}. Still early in the process, but that's where you've been spending your time."]},"movement_building":{"direction":{"rising":["Your safety sits a bit higher lately than when you started checking in. Early, but a good direction. Worth leaning into where you can."],"falling":["Your safety sits a little lower lately. Safety comes and goes. That's normal and expected. Make sure you're doing the basic self-care stuff and not pushing the practices here beyond your capacity."],"steady":["Your safety has held pretty level the past few days. A regulated stretch is solid ground to build on, perhaps to explore more within."]},"variance":{"shifts":["Your check-ins have moved around over the past few days rather than staying still. Not good or bad. It just is. More honest check-ins will help the picture take clearer form over time."],"consistent":["Your check-ins have stayed in a similar place over the past few days. If that feels okay, keep doing whatever you're doing. Otherwise, raise or lower the challenge level of your in-app practices."]}},"section6_note":{"start":["That's one check-in. Not much to go on yet, but no worries, because this page grows and adapts based on your check-ins. Come back after the next one and check for yourself!"],"early":["A few check-ins in, and you're already starting to watch your own system. You're not grading yourself, you're getting to know yourself. Keep showing up.","You've checked in a handful of times now. That's how the larger picture builds, one honest check-in at a time. Each one makes the next clearer."],"building":["A few days in, and your system's shape is starting to show. No grades. Not good or bad. Just getting to know yourself, one honest check-in at a time. Keep it up!","You've been checking in for a few days now. The pieces are coming together, moment by moment, check-in by check-in. Keep showing up the way you have been."],"returning":["Good to see you back. It's been a few days, so this leans on your last check-in or two. Keep going, and the fuller picture comes back quickly.","Welcome back. After a break, this is lighter for now, working from your most recent check-ins. A few more days, and your system's shape fills back in."],"milestone":["A full week in. This is your first stretch with a real week behind it, more signal, less guesswork. Nice work showing up for it.","You've checked in across a whole week now. That's the point where this starts telling you something real. Worth noticing how far you've come to get here."],"established":["You've been at this a while now, and it shows; you notice your own states more easily than when you started. Keep going.","Weeks of check-ins behind you now. The picture's yours, and it keeps getting clearer the longer you stay with it. Keep showing up the way you have been."]}};
  // ---- richer per-user signals layered onto the for-you blog (additive; each self-gates on data) ----
  // secondary state + regulated:dysregulated balance (section 1), recovery speed (section 3,
  // established only), and the practice payoff (section 5). All read from Store with ctx overrides.
  const BLOG_SIGNALS = {"secondary":["Close behind it, {SECOND}.","{SECOND} showed up close behind."],"balance":{"regulated":["And most of your check-ins this week included safety."],"dysregulated":["And most of your check-ins this week were in {DEFENSE_STATES}. Safety is still there to come back to."],"even":["Your check-ins this week are split about evenly between safety and {DEFENSE_STATES}, with plenty of safety in the mix."]},"recovery":{"framing":["And there's a pattern in how you come back.","There's also a pattern in how you get out of defense."],"template":"When your body drops into defense, it tends to get back to safety within {N}. You've done it before, more than once."},"practice_effect":["The check-ins right after a practice session tend to have a little more safety in them, about {PCT}% of the time.","About {PCT}% of the time, the check-in right after a practice session has a little more safety in it."]};
  const STATE_NAMES = { safety:'safety', play:'regulated mobilization (play and motivation)', stillness:'regulated immobilization (stillness and intimacy)', fightflight:'flight/fight', shutdown:'shutdown', freeze:'freeze' };
  function _fill(t, ctx){ return String(t==null?'':t).replace(/\{STATE\}/g, ctx.stateName||'').replace(/\{SHARE\}/g, ctx.share!=null?ctx.share+'%':'').replace(/\{N\}/g, ctx.count!=null?String(ctx.count):''); }
  function _bullet(raw, ctx){ const m=String(raw).match(/^(.*?)\s*\u2192\s*\[([^\]]+)\]\(#([^)]+)\)\s*$/); if(m) return { text:_fill(m[1].trim(),ctx), jumpLabel:m[2], jumpId:'blog-'+m[3] }; return { text:_fill(raw,ctx) }; }
  // short felt name for in-sentence use (transitions / time-of-day), e.g. "flight/fight", "play & motivation"
  function _feltName(k){ return (RUNDOWNS[k] && RUNDOWNS[k].label_felt) || STATE_NAMES[k] || k; }
  function _fillTrans(t, tr){ return String(t==null?'':t).replace(/\{STATE_A\}/g, _feltName(tr.a)).replace(/\{STATE_B\}/g, _feltName(tr.b)); }
  const SEG_PHRASE = { morning:'mornings', afternoon:'afternoons', evening:'evenings', late:'late nights' };
  function _fillTod(t, tod){ return String(t==null?'':t).replace(/\{SEG\}/g, SEG_PHRASE[tod.seg]||tod.seg).replace(/\{STATE\}/g, _feltName(tod.dom)); }
  function _fillSecond(t, mix){ return String(t==null?'':t).replace(/\{SECOND\}/g, _feltName(mix.second)); }
  function _recoveryPhrase(rec){ return rec.avg<=1.5 ? 'a check-in or two' : 'about '+Math.round(rec.avg)+' check-ins'; }
  function _fillRecovery(t, rec){ return String(t==null?'':t).replace(/\{N\}/g, _recoveryPhrase(rec)); }
  function _joinFelt(arr){ const a=(arr||[]).map(_feltName); if(a.length<=1) return a[0]||''; if(a.length===2) return a[0]+' and '+a[1]; return a.slice(0,-1).join(', ')+', and '+a[a.length-1]; }
  function _fillDefense(t, mix){ return String(t==null?'':t).replace(/\{DEFENSE_STATES\}/g, _joinFelt(mix.defenseStates)); }
  function _fillPct(t, pe){ return String(t==null?'':t).replace(/\{PCT\}/g, String(Math.round(pe.rate*20)*5)); } // nearest 5%
  function rundown(dom){ const r=RUNDOWNS[dom]; if(!r) return null; return { label_precise:r.label_precise, label_felt:r.label_felt, short:cycle('rd-tldr:'+dom,r.tldr), what:cycle('rd-what:'+dom,r.what_this_is), why:(r.why_your_body&&r.why_your_body[0])||'', how:r.how_it_shows_up||'', helps:cycle('rd-helps:'+dom,r.one_thing_that_helps), practice:r.door_inward||'' }; }
  function blog(ctx0){
    ctx0 = ctx0 || {};
    const dom = ctx0.dom || ((global.Store&&Store.lastCheckin)?(Store.lastCheckin()||{}).dom:null);
    if(!dom || dom==='neutral' || !RUNDOWNS[dom]) return null;
    // tenure gate: how much real data exists decides the time-framing and how much we claim.
    const tn = ctx0.tenure || ((global.Store&&Store.tenure)?Store.tenure():null) || { stage:'week', count:null, days:7, returning:false };
    const stage = ctx0.stage || tn.stage || 'week';
    const returning = !!tn.returning;
    const thin = (stage==='start' || stage==='early' || returning); // too little to claim a trend
    const wk = (stage==='week' || stage==='established');           // enough to honestly say "this week"+
    const ctx = Object.assign({}, ctx0, { dom:dom, stateName: STATE_NAMES[dom]||dom, stage:stage });
    const P  = (slot,arr)=> cycle('blog-'+slot, arr||[]);
    const PS = (slot,arr)=> cycle('blog-'+slot+':'+stage, arr||[]);
    const stageOr = (slot, stageArr, baseArr)=> (stageArr&&stageArr.length) ? PS(slot, stageArr) : P(slot, baseArr);

    // ---- start: an orientation read, not a data summary (no pattern/trend claims) ----
    if(stage==='start'){
      const r0=RUNDOWNS[dom], s0=[];
      s0.push({ id:'blog-2', heading:"About your state", paras:[ cycle('s2what:'+dom, r0.what_this_is), r0.how_it_shows_up ]});
      const fk0=BLOG.section4_fork[dom];
      if(fk0) s0.push({ id:'blog-4', heading:"What to expect", paras:[ cycle('forkintro:start', BLOG_STAGE.fork_intro), fk0.toward_regulated, fk0.if_reps_drop, fk0.landing ].filter(Boolean) });
      s0.push({ id:'blog-5', heading:"What tends to help", paras:[ _fill(P('s5', BLOG.section5_helps.frame), ctx), _fill(P('s5d', BLOG.section5_helps.practice_door), ctx) ]});
      s0.push({ id:'blog-6', heading:"One last thing", paras:[ _fill(PS('s6', BLOG_STAGE.section6_note.start), ctx) ]});
      return { stateName: ctx.stateName, stage:stage, bullets:[ _bullet(PS('orient', BLOG_STAGE.orientation), ctx) ], sections:s0 };
    }

    const bullets=[];
    bullets.push(_bullet(stageOr('where', BLOG_STAGE.where_bullet[stage], BLOG.tldr_bullets.where), ctx));
    if(wk && ctx.dir && BLOG.tldr_bullets.direction[ctx.dir]) bullets.push(_bullet(P('dirb', BLOG.tldr_bullets.direction[ctx.dir]), ctx));
    if(wk && ctx.variance && BLOG.tldr_bullets.variance[ctx.variance]) bullets.push(_bullet(P('varb', BLOG.tldr_bullets.variance[ctx.variance]), ctx));
    if(wk) bullets.push(_bullet(P('forkb', BLOG.tldr_bullets.fork), ctx));
    bullets.push(_bullet(P('helpsb', BLOG.tldr_bullets.helps), ctx));

    const rd = RUNDOWNS[dom], sec=[];
    const s1paras = [ _fill(stageOr('s1', BLOG_STAGE.section1_where[stage], BLOG.section1_where), ctx) ];
    // secondary state + safety:defense balance — week+ only, so "this week" is honest, and weekMix self-gates >=6 in-window.
    if(stage==='week' || stage==='established'){
      const mix = ctx0.mix || ((global.Store&&Store.weekMix)?Store.weekMix():null);
      if(mix){
        if(mix.second && mix.second!==dom && mix.secondShare>=25 && RUNDOWNS[mix.second])
          s1paras.push(_fillSecond(P('s1second', BLOG_SIGNALS.secondary), mix));
        if(mix.lean==='regulated' && dom!=='safety')
          s1paras.push(P('s1balreg', BLOG_SIGNALS.balance.regulated));                       // safety side; skip when dom is already safety (no new info)
        else if(mix.lean==='dysregulated' && mix.defenseStates && mix.defenseStates.length>=2)
          s1paras.push(_fillDefense(P('s1baldys', BLOG_SIGNALS.balance.dysregulated), mix));  // name the actual states; skip if only one (dom already said it)
        else if(mix.lean==='even' && mix.defenseStates && mix.defenseStates.length)
          s1paras.push(_fillDefense(P('s1baleven', BLOG_SIGNALS.balance.even), mix));
      }
    }
    sec.push({ id:'blog-1', heading:"State breakdown", paras:s1paras });
    sec.push({ id:'blog-2', heading:"About your state", paras:[ cycle('s2what:'+dom, rd.what_this_is), rd.how_it_shows_up ]});

    // movement: suppressed on thin data; 'building' uses lighter "lately" copy; week+ uses the approved copy.
    const mv=[];
    if(!thin){
      const dirSrc = (stage==='building') ? BLOG_STAGE.movement_building.direction : BLOG.section3_movement.direction;
      const varSrc = (stage==='building') ? BLOG_STAGE.movement_building.variance : BLOG.section3_movement.variance;
      if(ctx.dir && dirSrc[ctx.dir]) mv.push(cycle('s3dir:'+stage, dirSrc[ctx.dir]));
      if(ctx.variance && varSrc[ctx.variance]) mv.push(cycle('s3var:'+stage, varSrc[ctx.variance]));
      // transitions + time-of-day: the part only the user's own sequence can write (already gated >=6 check-ins).
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
      // recovery speed: the hope signal. Only at 'established', where there's real round-trip history.
      if(stage==='established'){
        const rec = ctx0.recovery || ((global.Store&&Store.recovery)?Store.recovery():null);
        if(rec && rec.avg!=null){
          mv.push(P('s3recframe', BLOG_SIGNALS.recovery.framing));
          mv.push(_fillRecovery(BLOG_SIGNALS.recovery.template, rec));
        }
      }
    }
    if(mv.length) sec.push({ id:'blog-3', heading:"What the data shows", paras:mv });

    // fork always shows; on thin data it opens with a soft, forward-looking lead-in.
    const fk = BLOG.section4_fork[dom];
    if(fk){
      const fkParas = thin
        ? [ cycle('forkintro:'+stage, BLOG_STAGE.fork_intro), fk.toward_regulated, fk.if_reps_drop, fk.landing ]
        : [ fk.toward_regulated, fk.if_reps_drop, fk.landing ];
      sec.push({ id:'blog-4', heading:"What to expect", paras:fkParas.filter(Boolean) });
    }

    const s5paras = [ _fill(P('s5', BLOG.section5_helps.frame), ctx), _fill(P('s5d', BLOG.section5_helps.practice_door), ctx) ];
    // practice payoff: lead with the user's own evidence when the practice has been moving the needle.
    if(stage!=='start' && stage!=='early'){
      const pe = ctx0.practiceEffect || ((global.Store&&Store.practiceEffect)?Store.practiceEffect():null);
      if(pe && pe.rate>=0.5) s5paras.unshift(_fillPct(P('s5pe', BLOG_SIGNALS.practice_effect), pe));
    }
    sec.push({ id:'blog-5', heading:"What tends to help", paras:s5paras });

    // one last thing: returning > day-7 milestone > stage note > approved week copy.
    let s6arr;
    if(returning) s6arr = BLOG_STAGE.section6_note.returning;
    else if(stage==='week' && tn.days!=null && tn.days>=7 && tn.days<=8) s6arr = BLOG_STAGE.section6_note.milestone;
    else if(BLOG_STAGE.section6_note[stage]) s6arr = BLOG_STAGE.section6_note[stage];
    else s6arr = BLOG.section6_note;
    sec.push({ id:'blog-6', heading:"One last thing", paras:[ _fill(cycle('blog-s6:'+stage+(returning?'-r':''), s6arr), ctx) ]});

    return { stateName: ctx.stateName, stage:stage, bullets:bullets, sections:sec };
  }

  // ---- monthly + quarterly reflections (the long-range altitudes) ------------
  // DRAFT copy in Justin's voice — pending his word-review. Single flowing narrative
  // (a few named patterns), assembled from periodStats + baselineDelta + recovery.
  const _DOW = ['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];
  function _fillMQ(t, o){
    return String(t==null?'':t)
      .replace(/\{DOM\}/g,o.DOM||'').replace(/\{FIRST\}/g,o.FIRST||'').replace(/\{LAST\}/g,o.LAST||'')
      .replace(/\{PCT\}/g,o.PCT!=null?String(o.PCT):'').replace(/\{DAY\}/g,o.DAY||'').replace(/\{SPAN\}/g,o.SPAN||'this stretch')
      .replace(/\{N\}/g,o.N||'').replace(/\{DAYS\}/g,o.DAYS!=null?String(o.DAYS):'');
  }
  const _QSPAN = { q:'these past three months', half:'these past six months', year:'this past year' };
  const MONTHLY = {
    opener: ["A month of moments now.","A whole month of check-ins behind you.","You've shown up for around thirtyish days, and we have enough data to see the patterns of your nervous system."],
    where: ["Most of your check-ins reflect {DOM} about {PCT}%.","About {PCT}% of this month's check-ins leaned mostly toward {DOM}."],
    baseline: {
      up: ["Your safety state level is higher now than at the start of the month, up about {PCT}%. This is a meaningful shift worth celebrating and leaning a bit more into.","Across the month, safety showed up more than it had been. That climb is yours."],
      down: ["You're reporting safety a little less often than earlier in the month. (It tends to come and go.) Go easy, keep doing the basics, and sneak in a safety practice or two.","A quieter month for safety than the one before. Not a setback, just a season. Small steady reps are how it returns."],
      flat: ["Your safety state stayed pretty steady across the month. This is solid grounding to work from."]
    },
    rhythm_dow: ["Looks like your {DAY} tend to carry a bit more safety state than other days. Worth noticing what's different about them, so you can do more of it.","Your {DAY} come in a little steadier than the rest, more often than not. A small clue about what's working for you."],
    recovery: ["There's also a pattern in how your system rebounds after a dip into defense. It tends to return to safety within {N}. It knows the way back. Now you pay attention and follow its lead.","After an energized stretch, you usually find your way to more safety within {N}. That shows capacity building."],
    close: ["No grades here. Just a month of getting to know your nervous system, one honest check-in at a time. Keep going.","A month in, and this picture is yours now. It gets clearer the longer you stay with it.","Whatever this month held, you showed up for it. That's the part that compounds."]
  };
  function monthly(ctx0){
    ctx0 = ctx0 || {}; const st = ctx0.stats; if(!st || st.n<8) return null;
    const o = { DOM:_feltName(st.dom), PCT:st.domShare, DAY: st.bestDow!=null?_DOW[st.bestDow]:'' };
    const parts = [ cycle('mo-open', MONTHLY.opener), _fillMQ(cycle('mo-where', MONTHLY.where), o) ];
    const bd = ctx0.baseline;
    if(bd && bd.dir && bd.dir!=='new' && MONTHLY.baseline[bd.dir]) parts.push(_fillMQ(cycle('mo-base:'+bd.dir, MONTHLY.baseline[bd.dir]), { PCT:Math.abs(bd.deltaPct) }));
    if(st.bestDow!=null) parts.push(_fillMQ(cycle('mo-dow', MONTHLY.rhythm_dow), o));
    const rec = ctx0.recovery;
    if(rec && rec.avg!=null) parts.push(_fillMQ(cycle('mo-rec', MONTHLY.recovery), { N:_recoveryPhrase(rec) }));
    parts.push(cycle('mo-close', MONTHLY.close));
    return { text: parts.join(' '), stats: st };
  }
  const QUARTERLY = {
    opener: {
      q:    ["Three months of check-ins now.","A full quarter behind you, long enough to see a real arc and not just a week."],
      half: ["Half a year of check-ins. Well done. Now, you can see a clear picture of your nervous system over the long term.","You're six months in! Let's take a look at what your nervous system has been up to."],
      year: ["A year of check-ins, wow! Let's slow down and see what the data says.","A full year of check-ins behind you. We'll look at your nervous system history in detail before you get going on the next year's worth."]
    },
    thennow: {
      improved: ["When {SPAN} began, your check-ins reflected mostly {FIRST}. Lately they reflect more {LAST}. That's not just a mood, it's a sustainable autonomic shift that you earned. (And are still earning.)","By the end of {SPAN} you're sitting closer to {LAST}, after starting mostly in {FIRST}. The data is just showing what you've been building."],
      steady_reg: ["Across {SPAN}, your system stayed mostly steady, {FIRST} early and {LAST} lately. A long regulated run like this shows sustainable progress."],
      holding: ["Across {SPAN}, there's been a lot of {FIRST}, and it's close to {LAST}. Stuck defense can last a while, can't it? It won't last forever, though."]
    },
    baseline: {
      up: ["Your safety state baseline is higher than where {SPAN} began, up about {PCT}%. That's the kind of change only months can show.","Your safety state runs higher now than at the start of {SPAN}. A slow climb, and a real one."],
      down: ["You've been reporting safety a little less than at the start of {SPAN}. It happens. The basics and small safety reps are how it comes back.","Your safety state was less obvious this period than the last. Go gently. It'll return."],
      flat: ["Your safety state baseline held fairly level across {SPAN}. Stable is good. You can build on stable."]
    },
    recovery: ["And in how you come back: after dropping into a defense state, you tend to return to safety within {N}. That's capacity you've earned.","You come back faster than you might think, usually within {N} once you've dipped. That's real."],
    totals: ["Across {SPAN}: {N} check-ins over {DAYS} days. Every one of them was you, paying attention."],
    close: {
      q:    ["You're a little more familiar with your own nervous system than you were three months ago. Keep going."],
      half: ["Six months of check-ins and practices. You know your patterns now in a way you didn't before. Knowing is a win. And what comes next will be a win, too."],
      year: ["You're not who you were a year ago. The data says what you've been living and already know. And if you didn't know, now you do!"]
    }
  };
  function quarterly(ctx0){
    ctx0 = ctx0 || {}; const st = ctx0.stats; if(!st || st.n<12) return null;
    const mark = (ctx0.mark==='year'||ctx0.mark==='half') ? ctx0.mark : 'q';
    const o = { FIRST:_feltName(st.firstDom||st.dom), LAST:_feltName(st.lastDom||st.dom), N:st.n, DAYS:st.days, SPAN:_QSPAN[mark] };
    const parts = [ cycle('q-open:'+mark, QUARTERLY.opener[mark]) ];
    // then-vs-now identity arc
    const reg = { safety:1, play:1, stillness:1 };
    let tnKey = 'holding';
    if(reg[st.lastDom] && !reg[st.firstDom]) tnKey='improved';
    else if(reg[st.firstDom] && reg[st.lastDom]) tnKey='steady_reg';
    parts.push(_fillMQ(cycle('q-tn:'+tnKey, QUARTERLY.thennow[tnKey]), o));
    const bd = ctx0.baseline;
    if(bd && bd.dir && bd.dir!=='new' && QUARTERLY.baseline[bd.dir]) parts.push(_fillMQ(cycle('q-base:'+bd.dir, QUARTERLY.baseline[bd.dir]), Object.assign({}, o, { PCT:Math.abs(bd.deltaPct) })));
    const rec = ctx0.recovery;
    if(rec && rec.avg!=null) parts.push(_fillMQ(cycle('q-rec', QUARTERLY.recovery), { N:_recoveryPhrase(rec) }));
    parts.push(_fillMQ(cycle('q-tot', QUARTERLY.totals), o));
    parts.push(cycle('q-close:'+mark, QUARTERLY.close[mark]));
    return { text: parts.join(' '), stats: st, mark: mark };
  }

  global.FromJustin = {
    today, daily, monthly, quarterly, refresh, pick, label,
    deepBody, deepInvite, changeOverlay, stuckOverlay, watchFor,
    rundown, blog,
    LIBRARY, DEEP
  };
})(window);
