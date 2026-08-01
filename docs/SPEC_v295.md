# SPEC_v295.md — LUQI AI v29.5.0 "The Professor"

Status: shipped with engine v29.5.0. Base spec: `SPEC_v29.md` (v29.0.0). This document
specifies only the v29.5.0 additions and their verification criteria.

## 1. Goal

Turn the engine from a command shell into a **conversational mentor**:

- `teach <subject>` opens a classroom sub-REPL with prompt `[CLASS:<subject>] >`.
- Online (`OPENAI_API_KEY` present): a real multi-turn professor conversation with a
  rolling context capped at the last **40 messages** (system prompt preserved).
- Offline: exactly **one** honest "needs key" line, then a real offline classroom —
  built-in 10-lesson syllabi for 8 core subjects, generic mastery scaffold otherwise,
  self-check quiz cards. **Never** a fake conversation, never a crash.

## 2. Commands

| Command | Behavior |
|---|---|
| `teach <subject>` | Open classroom session for the subject. |
| `syllabus <subject> [new]` | Show the 10-lesson outline; `new` forces regeneration. |
| `quiz <subject>` | Standalone quiz (online graded, offline self-check). |
| `progress` | Learner-profile table: lesson position, average quiz score, weak points, last session. |

In-class commands: `end class`, `syllabus`, `quiz me`, `hint`, `progress`, `next`.

## 3. Professor conversation (online)

- System prompt: `PROFESSOR_PROMPT` — patient, lesson-by-lesson, one check question
  at a time, strict grading, answers under 200 words unless asked for more.
- `_llm_messages(messages)` accepts full message lists; the optional claude_engine
  bridge serializes the transcript, the stdlib urllib path posts the list verbatim.
- `_cap_messages()` caps at 40 messages, always preserving the system message.
- On LLM failure: an honest "professor unreachable" line; offline key points shown.

## 4. Syllabi

- `BUILTIN_SYLLABI`: 8 core subjects (mathematics, physics, chemistry, biology,
  english, computer-science, finance, history) x 10 lessons x 3 key points.
- `generic_scaffold(subject)`: 10-lesson mastery scaffold for any other subject.
- Online: `_llm_syllabus()` requests exactly 10 lines
  (`Lesson N: title | point | point | point`); tolerant parsing; fewer than 5 usable
  lessons falls back to the offline outline.
- Source label shown: `saved` / `LLM-generated outline` / `built-in outline` /
  `generic mastery scaffold`.

## 5. Quizzes

- Online: 3-question graded exchange; the professor's grading reply must start with
  RIGHT or WRONG; wrong answers are recorded as weak points.
- Offline: `OFFLINE_QUIZ_BANKS` self-check cards (8 subjects) — think, `reveal`,
  then honestly self-mark `right`/`wrong`; wrong marks become weak points.
- Scores persist via `record_quiz_score()` and appear in `progress`.

## 6. Learner profile (memory schema addition)

`omega_memory.json["learning"]`: `{subject: {syllabus, current_lesson, quiz_scores,
weak_points, started, last_session}}`.

- Cap: **20 subjects**; the oldest-started subject is evicted with a printed notice.
- Corrupt entries are dropped entry-by-entry on load (never a boot crash).
- `normalize_subject()` maps friendly aliases (`math` -> `mathematics`,
  `python` -> `computer-science`, ...).

## 7. Robustness requirements

- EOF and KeyboardInterrupt safe everywhere (classroom, quizzes, REPL).
- Session summary on exit (turns, lesson position, quiz scores) and progress saved
  even on EOF.
- Classroom failures are belt-and-braces caught at the command layer.
- No new dependencies; pure stdlib; ASCII-only source.

## 8. Verification (selftest additions)

The v29.5.0 selftest (83 checks total) adds: alias normalization, generic scaffold
shape, offline quiz bank integrity, learner-profile roundtrip + corruption tolerance,
20-subject eviction, message capping with system-prompt preservation, classroom
commands end-to-end offline (teach, next, hint, quiz me, progress, end class),
and EOF safety.
