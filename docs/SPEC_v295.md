# SPEC_v295.md — omega.py v29.4.0 -> v29.5.0 "The Professor"

ALL prior specs in force. Extend `/mnt/agents/output/omega.py` IN PLACE. Single file, py3.11, stdlib-only, ASCII-only source, CLI-only, zero unhandled exceptions, ALL 71 existing selftest checks pass.

## 1. Version
`VERSION = "29.5.0"`; banner `LUQI AI v29.5.0 - Unified Master Engine`.

## 2. Teach mode — true conversational tutor (`teach <subject>`)
- Enters a tutor SESSION (sub-REPL). Prompt becomes `[CLASS:<subject>] > `. `end class` exits cleanly (also EOF/KeyboardInterrupt-safe).
- ONLINE (OPENAI_API_KEY or bridge available): every student turn calls the LLM with FULL rolling session context (list of role/content dicts, capped at last 40 messages; extend the existing urllib path + bridge path to accept a messages list). Professor system prompt (exact intent): "You are Professor LUQI, a patient world-class professor of <subject>. Teach lesson by lesson. Explain clearly, then ask ONE question to check understanding. Adapt depth to the student's answers. Encourage honestly, grade strictly. Keep answers under 200 words unless asked for more."
- In-session commands (intercepted, not sent to LLM): `end class`, `syllabus`, `quiz me`, `hint` (re-asks with a simpler explanation), `progress`.
- OFFLINE (no key): NEVER fake a conversation and NEVER crash. Print one honest line ("Live professor conversation needs OPENAI_API_KEY - running offline classroom") then run the offline classroom: present the subject's built-in syllabus (sec. 3), offer offline `quiz me` (self-check cards, sec. 4), `next` advances lessons with the built-in lesson content points. All session activity still recorded.
- On `end class`: session summary (turns, quiz score if any), progress saved to learner profile (sec. 5).
- `companion <topic>` keeps working (v1 contract); help text notes `teach` as the full classroom.

## 3. Syllabus (`syllabus <subject>`, also in-session)
- ONLINE: LLM generates a 10-lesson leveled outline (lesson title + 3 key points each), saved to profile.
- OFFLINE built-in outlines (10 lessons each, title + 3 key points) for 8 core subjects: mathematics, physics, chemistry, biology, english, computer-science (python), finance, history. Unknown subject offline -> generic 10-lesson mastery scaffold (foundations -> advanced -> capstone) templated with the subject name.
- Saved syllabi persist; re-running `syllabus X` shows the saved one (regenerate with `syllabus X new`).

## 4. Quiz & grading
- ONLINE `quiz me`: professor asks 3 questions in conversation, grades answers, reports score/3 + what to review; score recorded.
- OFFLINE `quiz me`: built-in self-check banks (>= 5 Q&A each for the 8 core subjects, accurate): show questions one by one, `reveal` shows answer, user self-marks `right`/`wrong`; engine computes and records the score. Unknown subject offline -> graceful "no offline quiz bank for X yet - add OPENAI_API_KEY for generated quizzes".

## 5. Learner profile (persistent, in omega_memory.json)
- New `learning` dict: {subject: {"syllabus": [...], "current_lesson": int, "quiz_scores": [{"ts","score","total"}], "weak_points": [...], "started": ts, "last_session": ts}}. Corrupt-safe like the rest of memory; capped at 20 subjects (oldest evicted with notice).
- New command `progress`: table — subject, lesson x/10, avg quiz %, weak points, last session date. Empty -> friendly guidance to `teach <subject>`.

## 6. Router/UX
- Tutor subsystem keywords add: teach, professor, tutor, classroom, mentor. `status` shows active subjects count. `help` gains teach/syllabus/quiz/progress lines.

## 7. Selftest >= 80 checks (all 71 prior intact)
New: teach session offline end-to-end (enter -> 2 exchanges -> end class -> progress recorded); session never crashes on EOF mid-class; online-path guarded without key (no fake LLM); syllabus core subject has 10 lessons; unknown-subject scaffold works; offline quiz bank right/wrong scoring math correct; learner profile persists across process restart; message history cap function correct; `progress` renders empty + populated.

## 8. Honesty requirements (verifier will check)
- Offline teach prints the "needs key" line BEFORE the offline classroom.
- No string anywhere claims offline live conversation.
