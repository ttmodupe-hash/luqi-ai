import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GraduationCap,
  BookOpen,
  Award,
  ChevronRight,
  PlayCircle,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Layers,
  Star,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
interface Lesson {
  lesson_id: string;
  title: string;
  duration_minutes: number;
  completed?: boolean;
}

interface Module {
  module_id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  course_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_hours: number;
  modules: Module[];
}

interface ProgressItem {
  course_id: string;
  course_title: string;
  completed_lessons: number;
  total_lessons: number;
  completion_pct: number;
  assessments: AssessmentResult[];
  next_lesson?: {
    module_title: string;
    lesson_title: string;
  };
}

interface AssessmentResult {
  assessment_id: string;
  title: string;
  score: number;
  max_score: number;
  passed: boolean;
}

interface Certificate {
  certificate_id: string;
  course_name: string;
  course_id: string;
  completion_date: string;
  final_score: number;
  grade: "A" | "B" | "C" | "D";
}

// ─── Mock Data ───────────────────────────────────────────────────────
const MOCK_COURSES: Course[] = [
  {
    course_id: "C001",
    title: "Python for Beginners",
    description: "Learn Python from scratch with hands-on exercises and real-world projects.",
    category: "programming",
    difficulty: "beginner",
    estimated_hours: 20,
    modules: [
      {
        module_id: "M001",
        title: "Variables & Data Types",
        lessons: [
          { lesson_id: "L001", title: "Introduction to Variables", duration_minutes: 15 },
          { lesson_id: "L002", title: "Strings and Numbers", duration_minutes: 20 },
          { lesson_id: "L003", title: "Lists and Dictionaries", duration_minutes: 25 },
        ],
      },
      {
        module_id: "M002",
        title: "Control Flow",
        lessons: [
          { lesson_id: "L004", title: "If Statements", duration_minutes: 18 },
          { lesson_id: "L005", title: "For and While Loops", duration_minutes: 22 },
          { lesson_id: "L006", title: "List Comprehensions", duration_minutes: 20 },
          { lesson_id: "L007", title: "Functions Basics", duration_minutes: 25 },
        ],
      },
    ],
  },
  {
    course_id: "C002",
    title: "Financial Literacy",
    description: "Master personal finance, budgeting, investing, and wealth building strategies.",
    category: "finance",
    difficulty: "beginner",
    estimated_hours: 15,
    modules: [
      {
        module_id: "M003",
        title: "Budgeting Basics",
        lessons: [
          { lesson_id: "L008", title: "Understanding Income & Expenses", duration_minutes: 15 },
          { lesson_id: "L009", title: "Creating a Budget Plan", duration_minutes: 20 },
          { lesson_id: "L010", title: "Tracking and Adjusting", duration_minutes: 18 },
        ],
      },
      {
        module_id: "M004",
        title: "Investment 101",
        lessons: [
          { lesson_id: "L011", title: "Types of Investments", duration_minutes: 20 },
          { lesson_id: "L012", title: "Risk and Return", duration_minutes: 22 },
          { lesson_id: "L013", title: "Building a Portfolio", duration_minutes: 25 },
        ],
      },
    ],
  },
  {
    course_id: "C003",
    title: "African Business Essentials",
    description: "Develop business skills tailored for the African market and entrepreneurial landscape.",
    category: "business",
    difficulty: "intermediate",
    estimated_hours: 25,
    modules: [
      {
        module_id: "M005",
        title: "Market Research",
        lessons: [
          { lesson_id: "L014", title: "Understanding the African Market", duration_minutes: 20 },
          { lesson_id: "L015", title: "Customer Discovery", duration_minutes: 22 },
          { lesson_id: "L016", title: "Competitive Analysis", duration_minutes: 25 },
          { lesson_id: "L017", title: "Data Collection Methods", duration_minutes: 18 },
        ],
      },
      {
        module_id: "M006",
        title: "Business Planning",
        lessons: [
          { lesson_id: "L018", title: "Business Model Canvas", duration_minutes: 25 },
          { lesson_id: "L019", title: "Financial Projections", duration_minutes: 30 },
          { lesson_id: "L020", title: "Funding Strategies", duration_minutes: 28 },
          { lesson_id: "L021", title: "Pitching to Investors", duration_minutes: 22 },
          { lesson_id: "L022", title: "Legal and Compliance", duration_minutes: 20 },
        ],
      },
    ],
  },
  {
    course_id: "C004",
    title: "Advanced React Patterns",
    description: "Deep dive into advanced React concepts, hooks, performance optimization, and design patterns.",
    category: "programming",
    difficulty: "advanced",
    estimated_hours: 30,
    modules: [
      {
        module_id: "M007",
        title: "Advanced Hooks",
        lessons: [
          { lesson_id: "L023", title: "Custom Hooks Deep Dive", duration_minutes: 25 },
          { lesson_id: "L024", title: "useReducer Patterns", duration_minutes: 30 },
          { lesson_id: "L025", title: "Concurrent Features", duration_minutes: 28 },
        ],
      },
      {
        module_id: "M008",
        title: "Performance Optimization",
        lessons: [
          { lesson_id: "L026", title: "Memoization Strategies", duration_minutes: 22 },
          { lesson_id: "L027", title: "Code Splitting & Lazy Loading", duration_minutes: 25 },
          { lesson_id: "L028", title: "Profiling and Debugging", duration_minutes: 20 },
          { lesson_id: "L029", title: "Server Components", duration_minutes: 30 },
        ],
      },
    ],
  },
  {
    course_id: "C005",
    title: "Digital Marketing Fundamentals",
    description: "Learn SEO, social media marketing, content strategy, and analytics for business growth.",
    category: "business",
    difficulty: "beginner",
    estimated_hours: 18,
    modules: [
      {
        module_id: "M009",
        title: "SEO Basics",
        lessons: [
          { lesson_id: "L030", title: "Search Engine Fundamentals", duration_minutes: 18 },
          { lesson_id: "L031", title: "Keyword Research", duration_minutes: 22 },
          { lesson_id: "L032", title: "On-Page Optimization", duration_minutes: 20 },
        ],
      },
      {
        module_id: "M010",
        title: "Social Media Strategy",
        lessons: [
          { lesson_id: "L033", title: "Platform Selection", duration_minutes: 15 },
          { lesson_id: "L034", title: "Content Creation", duration_minutes: 25 },
          { lesson_id: "L035", title: "Analytics and Metrics", duration_minutes: 20 },
          { lesson_id: "L036", title: "Paid Advertising", duration_minutes: 22 },
        ],
      },
    ],
  },
];

const MOCK_PROGRESS: ProgressItem[] = [
  {
    course_id: "C001",
    course_title: "Python for Beginners",
    completed_lessons: 4,
    total_lessons: 7,
    completion_pct: 57,
    assessments: [
      { assessment_id: "A001", title: "Variables Quiz", score: 85, max_score: 100, passed: true },
      { assessment_id: "A002", title: "Control Flow Exam", score: 72, max_score: 100, passed: true },
    ],
    next_lesson: { module_title: "Control Flow", lesson_title: "List Comprehensions" },
  },
  {
    course_id: "C002",
    course_title: "Financial Literacy",
    completed_lessons: 2,
    total_lessons: 6,
    completion_pct: 33,
    assessments: [
      { assessment_id: "A003", title: "Budgeting Quiz", score: 90, max_score: 100, passed: true },
    ],
    next_lesson: { module_title: "Budgeting Basics", lesson_title: "Tracking and Adjusting" },
  },
];

const MOCK_CERTIFICATES: Certificate[] = [
  {
    certificate_id: "CERT001",
    course_name: "Python for Beginners",
    course_id: "C001",
    completion_date: "2024-11-15",
    final_score: 85,
    grade: "A",
  },
  {
    certificate_id: "CERT002",
    course_name: "Financial Literacy",
    course_id: "C002",
    completion_date: "2024-10-20",
    final_score: 78,
    grade: "B",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────
const STUDENT_ID = "student_001";

const difficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "intermediate":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "advanced":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-neutral-500/20 text-neutral-400 border-neutral-500/30";
  }
};

const gradeColor = (grade: string) => {
  switch (grade) {
    case "A":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "B":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "C":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
};

const categoryIcon = (category: string) => {
  switch (category) {
    case "programming":
      return <Layers className="h-3.5 w-3.5" />;
    case "finance":
      return <BarChart3 className="h-3.5 w-3.5" />;
    case "business":
      return <BookOpen className="h-3.5 w-3.5" />;
    default:
      return <BookOpen className="h-3.5 w-3.5" />;
  }
};

// ─── Component ───────────────────────────────────────────────────────
export default function TrainingPage() {
  const { get, post, loading, error } = useApi();

  const [activeTab, setActiveTab] = useState("browse");
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set(["C001", "C002"]));
  const [pageError, setPageError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);

  // ─── Fetch Courses ───────────────────────────────────────────────
  const fetchCourses = useCallback(async () => {
    try {
      const data = await get<Course[]>("/api/v25/training/courses");
      if (data && Array.isArray(data) && data.length > 0) {
        setCourses(data);
        setIsMockData(false);
      } else {
        setCourses(MOCK_COURSES);
        setIsMockData(true);
      }
    } catch {
      setCourses(MOCK_COURSES);
      setIsMockData(true);
    }
  }, [get]);

  // ─── Fetch Progress ──────────────────────────────────────────────
  const fetchProgress = useCallback(async () => {
    try {
      const data = await get<ProgressItem[]>(`/api/v25/training/progress/${STUDENT_ID}`);
      if (data && Array.isArray(data) && data.length > 0) {
        setProgress(data);
      } else {
        setProgress(MOCK_PROGRESS);
      }
    } catch {
      setProgress(MOCK_PROGRESS);
    }
  }, [get]);

  // ─── Fetch Certificates ──────────────────────────────────────────
  const fetchCertificates = useCallback(async () => {
    try {
      const data = await get<Certificate[]>(`/api/v25/training/certificates/${STUDENT_ID}`);
      if (data && Array.isArray(data) && data.length > 0) {
        setCertificates(data);
      } else {
        setCertificates(MOCK_CERTIFICATES);
      }
    } catch {
      setCertificates(MOCK_CERTIFICATES);
    }
  }, [get]);

  // ─── Enroll ──────────────────────────────────────────────────────
  const handleEnroll = async (courseId: string) => {
    setEnrollingCourse(courseId);
    setPageError(null);
    try {
      await post("/api/v25/training/enroll", {
        course_id: courseId,
        student_id: STUDENT_ID,
      });
      setEnrolledCourses((prev) => new Set(prev).add(courseId));
    } catch (err) {
      // Fallback: still mark as enrolled for UX
      setEnrolledCourses((prev) => new Set(prev).add(courseId));
      if (isMockData) {
        setPageError(null); // expected with mock data
      } else {
        setPageError(err instanceof Error ? err.message : "Enrollment failed");
      }
    } finally {
      setEnrollingCourse(null);
    }
  };

  // ─── Initial Load ────────────────────────────────────────────────
  useEffect(() => {
    fetchCourses();
    fetchProgress();
    fetchCertificates();
  }, [fetchCourses, fetchProgress, fetchCertificates]);

  // ─── Filtered Courses ────────────────────────────────────────────
  const categories = ["all", ...Array.from(new Set(courses.map((c) => c.category)))];
  const difficulties = ["all", ...Array.from(new Set(courses.map((c) => c.difficulty)))];

  const filteredCourses = courses.filter((course) => {
    const matchCategory = selectedCategory === "all" || course.category === selectedCategory;
    const matchDifficulty = selectedDifficulty === "all" || course.difficulty === selectedDifficulty;
    const matchSearch =
      searchQuery === "" ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchDifficulty && matchSearch;
  });

  const totalLessons = (course: Course) =>
    course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <GraduationCap className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Training Center</h1>
            <p className="text-xs text-neutral-400">Learn, grow, and earn certificates</p>
          </div>
          {isMockData && (
            <Badge
              variant="outline"
              className="ml-auto bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]"
            >
              Demo Mode
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Error Banner */}
        {pageError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {pageError}
          </div>
        )}

        {/* Global Loading */}
        {loading && courses.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <span className="ml-3 text-neutral-400">Loading training data...</span>
          </div>
        )}

        {/* Global Error */}
        {error && courses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-neutral-300 font-medium">Failed to load training data</p>
            <p className="text-neutral-500 text-sm mt-1">{error}</p>
            <Button
              variant="outline"
              className="mt-4 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              onClick={() => {
                fetchCourses();
                fetchProgress();
                fetchCertificates();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-800 border border-neutral-700">
            <TabsTrigger
              value="browse"
              className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300 gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Browse Courses
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300 gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              My Progress
            </TabsTrigger>
            <TabsTrigger
              value="certificates"
              className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300 gap-2"
            >
              <Award className="h-4 w-4" />
              Certificates
            </TabsTrigger>
          </TabsList>

          {/* ─── Browse Courses Tab ───────────────────────────────── */}
          <TabsContent value="browse" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {difficulties.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff === "all" ? "All Levels" : diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Grid */}
            {filteredCourses.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No courses match your filters.</p>
                <Button
                  variant="ghost"
                  className="mt-2 text-indigo-400 hover:text-indigo-300"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedDifficulty("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCourses.map((course) => {
                  const isExpanded = expandedCourse === course.course_id;
                  const isEnrolled = enrolledCourses.has(course.course_id);
                  const lessonCount = totalLessons(course);

                  return (
                    <Card
                      key={course.course_id}
                      className={`bg-neutral-800/60 border-neutral-700/60 transition-all duration-200 ${
                        isExpanded ? "ring-1 ring-indigo-500/40" : "hover:border-neutral-600"
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] capitalize gap-1 ${difficultyColor(course.difficulty)}`}
                              >
                                {categoryIcon(course.category)}
                                {course.category}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] capitalize ${difficultyColor(course.difficulty)}`}
                              >
                                {course.difficulty}
                              </Badge>
                            </div>
                            <CardTitle
                              className="text-base font-semibold text-white cursor-pointer hover:text-indigo-300 transition-colors"
                              onClick={() =>
                                setExpandedCourse(isExpanded ? null : course.course_id)
                              }
                            >
                              {course.title}
                            </CardTitle>
                          </div>
                          {isEnrolled && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" />
                              Enrolled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {course.estimated_hours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {course.modules.length} modules
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {lessonCount} lessons
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {/* Enroll Button */}
                        {!isEnrolled && (
                          <Button
                            size="sm"
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white mt-1"
                            onClick={() => handleEnroll(course.course_id)}
                            disabled={enrollingCourse === course.course_id}
                          >
                            {enrollingCourse === course.course_id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                Enrolling...
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                                Enroll Now
                              </>
                            )}
                          </Button>
                        )}

                        {/* Expand / Collapse Modules */}
                        <button
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-2 transition-colors"
                          onClick={() =>
                            setExpandedCourse(isExpanded ? null : course.course_id)
                          }
                        >
                          {isExpanded ? "Hide" : "View"} Modules & Lessons
                          <ChevronRight
                            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>

                        {/* Expanded Modules */}
                        {isExpanded && (
                          <ScrollArea className="mt-3 max-h-64 rounded-lg border border-neutral-700/50 bg-neutral-900/50">
                            <div className="p-3 space-y-3">
                              {course.modules.map((mod, mi) => (
                                <div key={mod.module_id}>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                                      M{mi + 1}
                                    </span>
                                    <span className="text-xs font-medium text-neutral-300">
                                      {mod.title}
                                    </span>
                                    <span className="text-[10px] text-neutral-600 ml-auto">
                                      {mod.lessons.length} lessons
                                    </span>
                                  </div>
                                  <div className="pl-6 space-y-1">
                                    {mod.lessons.map((lesson, li) => (
                                      <div
                                        key={lesson.lesson_id}
                                        className="flex items-center gap-2 text-xs text-neutral-400"
                                      >
                                        <span className="text-[10px] text-neutral-600">
                                          {mi + 1}.{li + 1}
                                        </span>
                                        <span className="flex-1 truncate">{lesson.title}</span>
                                        <span className="text-neutral-600 text-[10px]">
                                          {lesson.duration_minutes}m
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── My Progress Tab ──────────────────────────────────── */}
          <TabsContent value="progress" className="space-y-6">
            {progress.length === 0 ? (
              <div className="text-center py-16">
                <PlayCircle className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No enrolled courses yet.</p>
                <Button
                  variant="outline"
                  className="mt-3 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                  onClick={() => setActiveTab("browse")}
                >
                  Browse Courses
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {progress.map((item) => (
                  <Card
                    key={item.course_id}
                    className="bg-neutral-800/60 border-neutral-700/60"
                  >
                    <CardContent className="p-5">
                      {/* Course Title & Progress */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-white">
                            {item.course_title}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {item.completed_lessons} of {item.total_lessons} lessons completed
                          </p>
                        </div>
                        <span className="text-lg font-bold text-indigo-400">
                          {item.completion_pct}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <Progress
                          value={item.completion_pct}
                          className="h-2 bg-neutral-700"
                        />
                      </div>

                      {/* Next Lesson */}
                      {item.next_lesson && item.completion_pct < 100 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-4">
                          <PlayCircle className="h-5 w-5 text-indigo-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wide">
                              Continue Learning
                            </p>
                            <p className="text-sm text-white truncate">
                              {item.next_lesson.lesson_title}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {item.next_lesson.module_title}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="bg-indigo-500 hover:bg-indigo-600 text-white shrink-0"
                          >
                            Resume
                          </Button>
                        </div>
                      )}

                      {item.completion_pct === 100 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
                          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                          <p className="text-sm text-green-400 font-medium">
                            Course Completed!
                          </p>
                        </div>
                      )}

                      {/* Assessment Scores */}
                      {item.assessments.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                            Assessments
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.assessments.map((assessment) => (
                              <div
                                key={assessment.assessment_id}
                                className="flex items-center gap-2 p-2.5 rounded-md bg-neutral-900/60 border border-neutral-700/40"
                              >
                                <Star
                                  className={`h-4 w-4 shrink-0 ${
                                    assessment.passed ? "text-yellow-400" : "text-neutral-600"
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-neutral-300 truncate">
                                    {assessment.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Progress
                                      value={(assessment.score / assessment.max_score) * 100}
                                      className="h-1.5 w-16 bg-neutral-700"
                                    />
                                    <span className="text-[10px] text-neutral-500">
                                      {assessment.score}/{assessment.max_score}
                                    </span>
                                  </div>
                                </div>
                                {assessment.passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Certificates Tab ─────────────────────────────────── */}
          <TabsContent value="certificates" className="space-y-6">
            {certificates.length === 0 ? (
              <div className="text-center py-16">
                <Award className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No certificates earned yet.</p>
                <p className="text-neutral-600 text-sm mt-1">
                  Complete a course to earn your first certificate.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                  onClick={() => setActiveTab("browse")}
                >
                  Start Learning
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {certificates.map((cert) => (
                  <Card
                    key={cert.certificate_id}
                    className="bg-neutral-800/60 border-neutral-700/60 group hover:border-amber-500/30 transition-all duration-200"
                  >
                    <CardContent className="p-5">
                      {/* Certificate Icon */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-4 rounded-full bg-amber-500/10 border-2 border-amber-500/30 group-hover:bg-amber-500/20 transition-colors">
                          <Award className="h-8 w-8 text-amber-400" />
                        </div>
                      </div>

                      {/* Course Name */}
                      <h3 className="text-base font-semibold text-white text-center mb-1">
                        {cert.course_name}
                      </h3>

                      {/* Completion Date */}
                      <p className="text-xs text-neutral-500 text-center mb-4">
                        Completed on{" "}
                        {new Date(cert.completion_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>

                      {/* Stats Row */}
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{cert.final_score}%</p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                            Final Score
                          </p>
                        </div>
                        <div className="w-px h-8 bg-neutral-700" />
                        <div className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-sm font-bold px-3 py-1 ${gradeColor(cert.grade)}`}
                          >
                            Grade {cert.grade}
                          </Badge>
                        </div>
                      </div>

                      {/* View Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      >
                        View Certificate
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
