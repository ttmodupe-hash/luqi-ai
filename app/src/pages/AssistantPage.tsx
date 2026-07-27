import { useState, useEffect, useCallback, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  CheckCircle2,
  Clock,
  Bell,
  StickyNote,
  Calendar,
  TrendingUp,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Search,
  X,
} from "lucide-react";

/* ───────── Types ───────── */

interface Task {
  task_id: string;
  title: string;
  description?: string;
  priority?: string;
  status: string;
  due_date?: string;
  tags?: string[];
  recurring?: string;
}

interface Reminder {
  reminder_id: string;
  title: string;
  description?: string;
  remind_at: string;
  status?: string;
}

interface Note {
  note_id: string;
  title: string;
  content?: string;
  category?: string;
  created_at?: string;
}

interface Event {
  event_id: string;
  title: string;
  start_time: string;
  end_time?: string;
  description?: string;
  location?: string;
}

interface Briefing {
  greeting: string;
  tasks_today: { title: string; priority: string }[];
  overdue_tasks: { title: string; priority: string }[];
  upcoming_reminders: { title: string; remind_at: string }[];
  todays_events: { title: string; start_time: string }[];
  top_priorities: { title: string; priority: string }[];
  suggestion: string;
}

interface WeeklySummary {
  tasks_completed: number;
  tasks_total: number;
  completion_rate: number;
  events_attended: number;
  notes_created: number;
  productivity_score: number;
  high_priority_completed: number;
}

/* ───────── Mock Data ───────── */

const MOCK_TASKS: Task[] = [
  {
    task_id: "TASK-001",
    title: "Complete tax report",
    priority: "high",
    status: "in_progress",
    due_date: new Date().toISOString().split("T")[0],
    tags: ["tax"],
  },
  {
    task_id: "TASK-002",
    title: "Review Python course",
    priority: "medium",
    status: "pending",
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    tags: ["learning"],
  },
  {
    task_id: "TASK-003",
    title: "Daily standup notes",
    priority: "low",
    status: "pending",
    due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    tags: ["work"],
    recurring: "daily",
  },
];

const MOCK_REMINDERS: Reminder[] = [
  {
    reminder_id: "REM-001",
    title: "Submit VAT201",
    remind_at: new Date(Date.now() + 86400000).toISOString(),
    status: "pending",
  },
  {
    reminder_id: "REM-002",
    title: "Call dentist",
    remind_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: "pending",
  },
];

const MOCK_NOTES: Note[] = [
  {
    note_id: "NOTE-001",
    title: "Project Ideas",
    content: "Build a personal finance dashboard with React and D3",
    category: "Ideas",
    created_at: new Date().toISOString(),
  },
  {
    note_id: "NOTE-002",
    title: "Meeting Notes",
    content: "Discuss Q3 roadmap and resource allocation",
    category: "Work",
    created_at: new Date().toISOString(),
  },
  {
    note_id: "NOTE-003",
    title: "Grocery List",
    content: "Milk, eggs, bread, coffee",
    category: "Personal",
    created_at: new Date().toISOString(),
  },
];

const MOCK_EVENTS: Event[] = [
  {
    event_id: "EVT-001",
    title: "SARS Deadline",
    start_time: new Date(Date.now() + 86400000).toISOString(),
    description: "Submit tax documents",
    location: "Online",
  },
  {
    event_id: "EVT-002",
    title: "Team Standup",
    start_time: new Date(Date.now() + 3 * 86400000).toISOString(),
    description: "Daily sync",
    location: "Zoom",
  },
];

const MOCK_BRIEFING: Briefing = {
  greeting: (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })(),
  tasks_today: [{ title: "Complete tax report", priority: "high" }],
  overdue_tasks: [],
  upcoming_reminders: [
    { title: "Submit VAT201", remind_at: new Date(Date.now() + 86400000).toISOString() },
  ],
  todays_events: [
    { title: "SARS Deadline", start_time: new Date(Date.now() + 86400000).toISOString() },
  ],
  top_priorities: [{ title: "Complete tax report", priority: "high" }],
  suggestion: "You have 1 task due today. Start with the highest priority.",
};

const MOCK_WEEKLY: WeeklySummary = {
  tasks_completed: 12,
  tasks_total: 15,
  completion_rate: 80,
  events_attended: 4,
  notes_created: 7,
  productivity_score: 78,
  high_priority_completed: 5,
};

/* ───────── Helpers ───────── */

const priorityColor = (p?: string) => {
  switch (p?.toLowerCase()) {
    case "urgent":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const priorityDot = (p?: string) => {
  switch (p?.toLowerCase()) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-green-500";
    default:
      return "bg-neutral-500";
  }
};

const formatDate = (d?: string) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (d?: string) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

const sortEvents = (a: Event, b: Event) =>
  new Date(a.start_time).getTime() - new Date(b.start_time).getTime();

const wordCount = (text?: string) =>
  text?.split(/\s+/).filter(Boolean).length ?? 0;

/* ───────── Component ───────── */

export default function AssistantPage() {
  const { get, post, loading, error } = useApi();

  const [activeTab, setActiveTab] = useState("tasks");
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);

  /* Forms */
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });
  const [reminderForm, setReminderForm] = useState({
    title: "",
    remind_at: "",
    description: "",
  });
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    category: "General",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    start_time: "",
    end_time: "",
    description: "",
    location: "",
  });

  /* Filters */
  const [taskFilter, setTaskFilter] = useState("all");
  const [noteSearch, setNoteSearch] = useState("");
  const [noteCategoryFilter, setNoteCategoryFilter] = useState("all");

  /* ─── Load data ─── */
  const loadBriefing = useCallback(async () => {
    try {
      const data = await get("/api/v25/assistant/briefing");
      setBriefing(data as Briefing);
    } catch {
      setBriefing(MOCK_BRIEFING);
    }
  }, [get]);

  const loadTasks = useCallback(async () => {
    try {
      const data = await get("/api/v25/assistant/tasks");
      setTasks((data as Task[]) ?? []);
    } catch {
      setTasks(MOCK_TASKS);
    }
  }, [get]);

  const loadReminders = useCallback(async () => {
    try {
      const data = await get("/api/v25/assistant/reminders");
      setReminders((data as Reminder[]) ?? []);
    } catch {
      setReminders(MOCK_REMINDERS);
    }
  }, [get]);

  const loadNotes = useCallback(async () => {
    try {
      const data = await get("/api/v25/assistant/notes");
      setNotes((data as Note[]) ?? []);
    } catch {
      setNotes(MOCK_NOTES);
    }
  }, [get]);

  const loadEvents = useCallback(async () => {
    try {
      const data = await get("/api/v25/assistant/events");
      setEvents((data as Event[]) ?? []);
    } catch {
      setEvents(MOCK_EVENTS);
    }
  }, [get]);

  const loadWeekly = useCallback(async () => {
    try {
      const data = await get("/api/v25/assistant/weekly-summary");
      setWeekly(data as WeeklySummary);
    } catch {
      setWeekly(MOCK_WEEKLY);
    }
  }, [get]);

  useEffect(() => {
    loadBriefing();
    loadTasks();
    loadReminders();
    loadNotes();
    loadEvents();
    loadWeekly();
  }, [
    loadBriefing,
    loadTasks,
    loadReminders,
    loadNotes,
    loadEvents,
    loadWeekly,
  ]);

  /* ─── Actions ─── */

  const createTask = async () => {
    if (!taskForm.title.trim()) return;
    try {
      await post("/api/v25/assistant/tasks", {
        title: taskForm.title,
        description: taskForm.description || undefined,
        priority: taskForm.priority,
        due_date: taskForm.due_date || undefined,
      });
      setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
      loadTasks();
      loadBriefing();
    } catch {
      const newTask: Task = {
        task_id: `TASK-${Date.now()}`,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        status: "pending",
        due_date: taskForm.due_date,
      };
      setTasks((prev) => [newTask, ...prev]);
      setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await post(`/api/v25/assistant/tasks/${taskId}/complete`, {});
      loadTasks();
      loadBriefing();
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === taskId ? { ...t, status: "completed" } : t
        )
      );
    }
  };

  const createReminder = async () => {
    if (!reminderForm.title.trim() || !reminderForm.remind_at) return;
    try {
      await post("/api/v25/assistant/reminders", {
        title: reminderForm.title,
        remind_at: reminderForm.remind_at,
        description: reminderForm.description || undefined,
      });
      setReminderForm({ title: "", remind_at: "", description: "" });
      loadReminders();
    } catch {
      const newRem: Reminder = {
        reminder_id: `REM-${Date.now()}`,
        title: reminderForm.title,
        description: reminderForm.description,
        remind_at: reminderForm.remind_at,
        status: "pending",
      };
      setReminders((prev) => [newRem, ...prev]);
      setReminderForm({ title: "", remind_at: "", description: "" });
    }
  };

  const dismissReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.reminder_id !== id));
  };

  const snoozeReminder = (id: string, minutes: number) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.reminder_id !== id) return r;
        const newTime = new Date(
          new Date(r.remind_at).getTime() + minutes * 60000
        ).toISOString();
        return { ...r, remind_at: newTime };
      })
    );
  };

  const createNote = async () => {
    if (!noteForm.title.trim()) return;
    try {
      await post("/api/v25/assistant/notes", {
        title: noteForm.title,
        content: noteForm.content || undefined,
        category: noteForm.category || undefined,
      });
      setNoteForm({ title: "", content: "", category: "General" });
      loadNotes();
    } catch {
      const newNote: Note = {
        note_id: `NOTE-${Date.now()}`,
        title: noteForm.title,
        content: noteForm.content,
        category: noteForm.category,
        created_at: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
      setNoteForm({ title: "", content: "", category: "General" });
    }
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.note_id !== id));
  };

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.start_time) return;
    try {
      await post("/api/v25/assistant/events", {
        title: eventForm.title,
        start_time: eventForm.start_time,
        end_time: eventForm.end_time || undefined,
        description: eventForm.description || undefined,
        location: eventForm.location || undefined,
      });
      setEventForm({
        title: "",
        start_time: "",
        end_time: "",
        description: "",
        location: "",
      });
      loadEvents();
    } catch {
      const newEvt: Event = {
        event_id: `EVT-${Date.now()}`,
        title: eventForm.title,
        start_time: eventForm.start_time,
        end_time: eventForm.end_time,
        description: eventForm.description,
        location: eventForm.location,
      };
      setEvents((prev) => [...prev, newEvt].sort(sortEvents));
      setEventForm({
        title: "",
        start_time: "",
        end_time: "",
        description: "",
        location: "",
      });
    }
  };

  /* ─── Derived data ─── */

  const filteredTasks = useMemo(() => {
    switch (taskFilter) {
      case "pending":
        return tasks.filter((t) => t.status !== "completed");
      case "completed":
        return tasks.filter((t) => t.status === "completed");
      case "overdue":
        return tasks.filter((t) => isOverdue(t.due_date) && t.status !== "completed");
      default:
        return tasks;
    }
  }, [tasks, taskFilter]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        !noteSearch ||
        n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
        (n.content?.toLowerCase() ?? "").includes(noteSearch.toLowerCase());
      const matchesCategory =
        noteCategoryFilter === "all" || n.category === noteCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [notes, noteSearch, noteCategoryFilter]);

  const noteCategories = useMemo(
    () => Array.from(new Set(notes.map((n) => n.category).filter(Boolean))),
    [notes]
  );

  const sortedEvents = useMemo(
    () => [...events].sort(sortEvents),
    [events]
  );

  const productivityColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ─── Header ─── */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Bot className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Personal Assistant</h1>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-400 ml-auto" />}
        </div>

        {/* ─── Error Banner ─── */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/20"
              onClick={() => window.location.reload()}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* ─── Daily Briefing Card ─── */}
        {briefing && (
          <Card className="bg-neutral-800/50 border-neutral-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                {briefing.greeting}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-neutral-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {briefing.tasks_today.length}
                  </div>
                  <div className="text-xs text-neutral-400">Tasks Today</div>
                </div>
                <div className="p-3 bg-neutral-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">
                    {briefing.overdue_tasks.length}
                  </div>
                  <div className="text-xs text-neutral-400">Overdue</div>
                </div>
                <div className="p-3 bg-neutral-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {briefing.upcoming_reminders.length}
                  </div>
                  <div className="text-xs text-neutral-400">Reminders</div>
                </div>
                <div className="p-3 bg-neutral-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {briefing.todays_events.length}
                  </div>
                  <div className="text-xs text-neutral-400">Events Today</div>
                </div>
              </div>

              {/* Upcoming reminders preview */}
              {briefing.upcoming_reminders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-yellow-400" />
                    Upcoming Reminders
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {briefing.upcoming_reminders.slice(0, 3).map((r, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      >
                        {r.title} &middot; {formatDateTime(r.remind_at)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's events */}
              {briefing.todays_events.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-400" />
                    Today&apos;s Events
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {briefing.todays_events.map((e, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-green-500/10 text-green-400 border-green-500/30"
                      >
                        {e.title} &middot;{" "}
                        {new Date(e.start_time).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestion */}
              {briefing.suggestion && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
                  <span className="font-medium">Suggestion:</span>{" "}
                  {briefing.suggestion}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-neutral-800 border border-neutral-700">
            <TabsTrigger
              value="tasks"
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Tasks
            </TabsTrigger>
            <TabsTrigger
              value="reminders"
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
            >
              <Bell className="w-4 h-4 mr-1" />
              Reminders
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
            >
              <StickyNote className="w-4 h-4 mr-1" />
              Notes
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Calendar
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Weekly
            </TabsTrigger>
          </TabsList>

          {/* ─── Tasks Tab ─── */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            {/* Add Task Form */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  Add Task
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Task title..."
                    value={taskForm.title}
                    onChange={(e) =>
                      setTaskForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500"
                  />
                  <Select
                    value={taskForm.priority}
                    onValueChange={(v) =>
                      setTaskForm((p) => ({ ...p, priority: v }))
                    }
                  >
                    <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-700 border-neutral-600">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) =>
                      setTaskForm((p) => ({ ...p, due_date: e.target.value }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white"
                  />
                </div>
                <Textarea
                  placeholder="Description (optional)..."
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500 min-h-[60px]"
                />
                <Button
                  onClick={createTask}
                  disabled={!taskForm.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex gap-2">
              {["all", "pending", "completed", "overdue"].map((f) => (
                <Button
                  key={f}
                  variant={taskFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTaskFilter(f)}
                  className={
                    taskFilter === f
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                  }
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>

            {/* Task List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredTasks.length === 0 && (
                  <div className="text-center text-neutral-500 py-8">
                    No tasks found.
                  </div>
                )}
                {filteredTasks.map((task) => (
                  <Card
                    key={task.task_id}
                    className={`bg-neutral-800/50 border-neutral-700 transition-opacity ${
                      task.status === "completed" ? "opacity-50" : ""
                    }`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={() => completeTask(task.task_id)}
                        className="border-neutral-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              task.status === "completed"
                                ? "line-through text-neutral-500"
                                : "text-white"
                            }`}
                          >
                            {task.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${priorityColor(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </Badge>
                          {task.recurring && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30"
                            >
                              {task.recurring}
                            </Badge>
                          )}
                        </div>
                        {task.due_date && (
                          <div
                            className={`text-xs mt-1 ${
                              isOverdue(task.due_date) &&
                              task.status !== "completed"
                                ? "text-red-400"
                                : "text-neutral-400"
                            }`}
                          >
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatDate(task.due_date)}
                            {isOverdue(task.due_date) &&
                              task.status !== "completed" && (
                                <span className="text-red-400 ml-1">
                                  (overdue)
                                </span>
                              )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Reminders Tab ─── */}
          <TabsContent value="reminders" className="space-y-4 mt-4">
            {/* Add Reminder Form */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  Add Reminder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Reminder title..."
                    value={reminderForm.title}
                    onChange={(e) =>
                      setReminderForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500"
                  />
                  <Input
                    type="datetime-local"
                    value={reminderForm.remind_at}
                    onChange={(e) =>
                      setReminderForm((p) => ({
                        ...p,
                        remind_at: e.target.value,
                      }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white"
                  />
                </div>
                <Textarea
                  placeholder="Description (optional)..."
                  value={reminderForm.description}
                  onChange={(e) =>
                    setReminderForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500 min-h-[60px]"
                />
                <Button
                  onClick={createReminder}
                  disabled={
                    !reminderForm.title.trim() || !reminderForm.remind_at
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Reminder
                </Button>
              </CardContent>
            </Card>

            {/* Reminder List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {reminders.length === 0 && (
                  <div className="text-center text-neutral-500 py-8">
                    No reminders yet.
                  </div>
                )}
                {reminders.map((rem) => (
                  <Card
                    key={rem.reminder_id}
                    className="bg-neutral-800/50 border-neutral-700"
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <Bell className="w-4 h-4 text-yellow-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">
                          {rem.title}
                        </div>
                        <div className="text-xs text-neutral-400">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDateTime(rem.remind_at)}
                        </div>
                        {rem.description && (
                          <div className="text-xs text-neutral-500 mt-1">
                            {rem.description}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {[15, 30, 60].map((min) => (
                          <Button
                            key={min}
                            variant="outline"
                            size="sm"
                            onClick={() => snoozeReminder(rem.reminder_id, min)}
                            className="bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600 hover:text-white text-xs px-2"
                          >
                            +{min}m
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissReminder(rem.reminder_id)}
                          className="bg-neutral-700 border-neutral-600 text-red-400 hover:bg-red-500/20 hover:text-red-300 px-2"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Notes Tab ─── */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            {/* Add Note Form */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  Add Note
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Note title..."
                    value={noteForm.title}
                    onChange={(e) =>
                      setNoteForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500"
                  />
                  <Input
                    placeholder="Category..."
                    value={noteForm.category}
                    onChange={(e) =>
                      setNoteForm((p) => ({ ...p, category: e.target.value }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500"
                  />
                </div>
                <Textarea
                  placeholder="Note content..."
                  value={noteForm.content}
                  onChange={(e) =>
                    setNoteForm((p) => ({ ...p, content: e.target.value }))
                  }
                  className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500 min-h-[80px]"
                />
                <Button
                  onClick={createNote}
                  disabled={!noteForm.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Note
                </Button>
              </CardContent>
            </Card>

            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <Input
                  placeholder="Search notes..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                />
              </div>
              <select
                value={noteCategoryFilter}
                onChange={(e) => setNoteCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-sm text-neutral-300"
              >
                <option value="all">All Categories</option>
                {noteCategories.map((cat) => (
                  <option key={cat} value={cat!}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Note List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredNotes.length === 0 && (
                <div className="col-span-full text-center text-neutral-500 py-8">
                  No notes found.
                </div>
              )}
              {filteredNotes.map((note) => (
                <Card
                  key={note.note_id}
                  className="bg-neutral-800/50 border-neutral-700"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StickyNote className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-white truncate">
                            {note.title}
                          </span>
                          {note.category && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-neutral-700 text-neutral-300 border-neutral-600"
                            >
                              {note.category}
                            </Badge>
                          )}
                        </div>
                        {note.content && (
                          <p className="text-xs text-neutral-400 line-clamp-3">
                            {note.content}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-500">
                          {note.created_at && <span>{formatDate(note.created_at)}</span>}
                          <span>{wordCount(note.content)} words</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.note_id)}
                        className="text-neutral-500 hover:text-red-400 hover:bg-red-500/20 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ─── Calendar Tab ─── */}
          <TabsContent value="calendar" className="space-y-4 mt-4">
            {/* Add Event Form */}
            <Card className="bg-neutral-800/50 border-neutral-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  Add Event
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Event title..."
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500"
                  />
                  <Input
                    placeholder="Location..."
                    value={eventForm.location}
                    onChange={(e) =>
                      setEventForm((p) => ({ ...p, location: e.target.value }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    type="datetime-local"
                    value={eventForm.start_time}
                    onChange={(e) =>
                      setEventForm((p) => ({
                        ...p,
                        start_time: e.target.value,
                      }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white"
                  />
                  <Input
                    type="datetime-local"
                    value={eventForm.end_time}
                    onChange={(e) =>
                      setEventForm((p) => ({ ...p, end_time: e.target.value }))
                    }
                    className="bg-neutral-700 border-neutral-600 text-white"
                  />
                </div>
                <Textarea
                  placeholder="Description (optional)..."
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500 min-h-[60px]"
                />
                <Button
                  onClick={createEvent}
                  disabled={!eventForm.title.trim() || !eventForm.start_time}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Event
                </Button>
              </CardContent>
            </Card>

            {/* Event List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {sortedEvents.length === 0 && (
                  <div className="text-center text-neutral-500 py-8">
                    No events yet.
                  </div>
                )}
                {sortedEvents.map((evt) => (
                  <Card
                    key={evt.event_id}
                    className="bg-neutral-800/50 border-neutral-700"
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">
                          {evt.title}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {formatDateTime(evt.start_time)}
                          {evt.end_time && ` - ${formatDateTime(evt.end_time)}`}
                        </div>
                        {evt.description && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {evt.description}
                          </div>
                        )}
                        {evt.location && (
                          <div className="text-xs text-neutral-500">
                            📍 {evt.location}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ─── Weekly Summary Tab ─── */}
          <TabsContent value="weekly" className="space-y-4 mt-4">
            {weekly && (
              <>
                {/* Productivity Score */}
                <Card className="bg-neutral-800/50 border-neutral-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-neutral-400">Productivity Score</p>
                        <p className="text-4xl font-bold text-white mt-1">
                          {weekly.productivity_score}
                          <span className="text-lg text-neutral-500">/100</span>
                        </p>
                      </div>
                      <div className="w-20 h-20 rounded-full border-4 border-neutral-700 flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-blue-400" />
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-neutral-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${productivityColor(
                          weekly.productivity_score
                        )} transition-all`}
                        style={{ width: `${weekly.productivity_score}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Card className="bg-neutral-800/50 border-neutral-700">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-blue-400">
                        {weekly.tasks_completed}/{weekly.tasks_total}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">Tasks Completed</p>
                      <div className="h-1.5 rounded-full bg-neutral-700 mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${(weekly.tasks_completed / weekly.tasks_total) * 100}%`,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-neutral-800/50 border-neutral-700">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-emerald-400">
                        {weekly.completion_rate}%
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">Completion Rate</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-neutral-800/50 border-neutral-700">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-purple-400">
                        {weekly.events_attended}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">Events Attended</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-neutral-800/50 border-neutral-700">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-yellow-400">
                        {weekly.notes_created}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">Notes Created</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-neutral-800/50 border-neutral-700">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-red-400">
                        {weekly.high_priority_completed}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">High Priority Done</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-neutral-800/50 border-neutral-700">
                    <CardContent className="p-4 flex items-center justify-center">
                      <div className="text-center">
                        <Bot className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <p className="text-xs text-neutral-400">
                          Keep up the great work!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
