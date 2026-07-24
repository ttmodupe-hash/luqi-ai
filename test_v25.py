#!/usr/bin/env python3
"""
Luqi AI v25 Comprehensive Test Suite
=====================================
Tests all backend modules: government, jobs, workspace, netai, project management,
whatsapp, router, and agent functionality.
"""

import unittest
import sys
import os
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# ═══════════════════════════════════════════════════════════════════════════════
#  GOVERNMENT SERVICES TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestGovernmentServices(unittest.TestCase):
    """Test government services module."""

    def test_list_gauteng_services(self):
        from backend.government_services import list_gauteng_services
        result = list_gauteng_services()
        self.assertEqual(result["status"], "success")
        self.assertIn("categories", result)

    def test_get_gauteng_service_health(self):
        from backend.government_services import get_gauteng_service
        result = get_gauteng_service("health")
        self.assertEqual(result["status"], "success")
        self.assertIn("services", result)

    def test_get_gauteng_service_invalid(self):
        from backend.government_services import get_gauteng_service
        result = get_gauteng_service("invalid_category")
        self.assertEqual(result["status"], "not_found")

    def test_list_municipalities(self):
        from backend.government_services import list_municipalities
        result = list_municipalities()
        self.assertEqual(result["status"], "success")
        self.assertIn("municipalities", result)

    def test_get_municipal_services(self):
        from backend.government_services import get_municipal_services
        result = get_municipal_services("city_of_johannesburg")
        self.assertEqual(result["status"], "success")

    def test_list_national_services(self):
        from backend.government_services import list_national_services
        result = list_national_services()
        self.assertEqual(result["status"], "success")

    def test_get_national_service(self):
        from backend.government_services import get_national_service
        result = get_national_service("home_affairs")
        self.assertEqual(result["status"], "success")

    def test_search_services(self):
        from backend.government_services import search_services
        result = search_services("passport")
        self.assertEqual(result["status"], "success")

    def test_get_contact(self):
        from backend.government_services import get_contact
        result = get_contact()
        self.assertEqual(result["status"], "success")

    def test_get_document_checklist(self):
        from backend.government_services import get_document_checklist
        result = get_document_checklist("passport")
        self.assertEqual(result["status"], "success")

    def test_get_service_fees(self):
        from backend.government_services import get_service_fees
        result = get_service_fees("passport_adult")
        self.assertEqual(result["status"], "success")

    def test_get_step_guide(self):
        from backend.government_services import get_step_guide
        result = get_step_guide("get_drivers_license")
        self.assertEqual(result["status"], "success")
        self.assertIn("steps", result)


# ═══════════════════════════════════════════════════════════════════════════════
#  JOBS & SKILLS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobsSkills(unittest.TestCase):
    """Test jobs and skills module."""

    def test_get_in_demand_careers(self):
        from backend.jobs_skills import get_in_demand_careers
        result = get_in_demand_careers()
        self.assertEqual(result["status"], "success")
        self.assertIn("categories", result)

    def test_get_career_category(self):
        from backend.jobs_skills import get_career_category
        result = get_career_category("technology")
        self.assertEqual(result["status"], "success")
        self.assertIn("roles", result)

    def test_get_career_category_invalid(self):
        from backend.jobs_skills import get_career_category
        result = get_career_category("invalid")
        self.assertEqual(result["status"], "not_found")

    def test_get_job_platforms(self):
        from backend.jobs_skills import get_job_platforms
        result = get_job_platforms()
        self.assertEqual(result["status"], "success")

    def test_get_interview_tips(self):
        from backend.jobs_skills import get_interview_tips
        result = get_interview_tips("before")
        self.assertIn("before", result)

    def test_get_common_questions(self):
        from backend.jobs_skills import get_common_questions
        result = get_common_questions()
        self.assertEqual(result["status"], "success")

    def test_build_resume(self):
        from backend.jobs_skills import build_resume
        result = build_resume("Test User", skills=["Python", "SQL"])
        self.assertEqual(result["status"], "success")
        self.assertIn("resume", result)

    def test_analyze_skill_gap(self):
        from backend.jobs_skills import analyze_skill_gap
        result = analyze_skill_gap(["Python", "SQL"], "Software Developer")
        self.assertEqual(result["status"], "success")
        self.assertIn("match_percentage", result)

    def test_salary_benchmark(self):
        from backend.jobs_skills import salary_benchmark
        result = salary_benchmark("Software Developer", 5)
        self.assertEqual(result["status"], "success")

    def test_career_path(self):
        from backend.jobs_skills import career_path
        result = career_path("software developer")
        self.assertEqual(result["status"], "success")


# ═══════════════════════════════════════════════════════════════════════════════
#  DIGITAL WORKSPACE TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestDigitalWorkspace(unittest.TestCase):
    """Test digital workspace module."""

    def test_list_tools(self):
        from backend.digital_workspace import list_tools
        result = list_tools()
        self.assertEqual(result["status"], "success")
        self.assertIn("categories", result)

    def test_get_tool_guide(self):
        from backend.digital_workspace import get_tool_guide
        result = get_tool_guide("slack")
        self.assertEqual(result["status"], "success")

    def test_get_tool_guide_invalid(self):
        from backend.digital_workspace import get_tool_guide
        result = get_tool_guide("invalid_tool")
        self.assertEqual(result["status"], "not_found")

    def test_compare_tools(self):
        from backend.digital_workspace import compare_tools
        result = compare_tools("communication")
        self.assertEqual(result["status"], "success")

    def test_get_document_guide(self):
        from backend.digital_workspace import get_document_guide
        result = get_document_guide("naming")
        self.assertEqual(result["status"], "success")

    def test_generate_folder_structure(self):
        from backend.digital_workspace import generate_folder_structure
        result = generate_folder_structure("software")
        self.assertEqual(result["status"], "success")

    def test_list_security_modules(self):
        from backend.digital_workspace import list_security_modules
        result = list_security_modules()
        self.assertEqual(result["status"], "success")

    def test_simulate_phishing_test(self):
        from backend.digital_workspace import simulate_phishing_test
        result = simulate_phishing_test("medium")
        self.assertEqual(result["status"], "success")
        self.assertIn("is_actually_phishing", result)

    def test_list_productivity_methods(self):
        from backend.digital_workspace import list_productivity_methods
        result = list_productivity_methods()
        self.assertEqual(result["status"], "success")

    def test_get_productivity_method(self):
        from backend.digital_workspace import get_productivity_method
        result = get_productivity_method("pomodoro")
        self.assertEqual(result["status"], "success")

    def test_create_daily_schedule(self):
        from backend.digital_workspace import create_daily_schedule
        result = create_daily_schedule()
        self.assertEqual(result["status"], "success")

    def test_list_remote_work_topics(self):
        from backend.digital_workspace import list_remote_work_topics
        result = list_remote_work_topics()
        self.assertEqual(result["status"], "success")

    def test_get_communication_guide(self):
        from backend.digital_workspace import get_communication_guide
        result = get_communication_guide("email")
        self.assertEqual(result["status"], "success")

    def test_generate_email_template(self):
        from backend.digital_workspace import generate_email_template
        result = generate_email_template("meeting_request")
        self.assertEqual(result["status"], "success")

    def test_recommend_workspace_setup(self):
        from backend.digital_workspace import recommend_workspace_setup
        result = recommend_workspace_setup("standard", "office")
        self.assertEqual(result["status"], "success")


# ═══════════════════════════════════════════════════════════════════════════════
#  NETAI TRAINING TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestNetAITraining(unittest.TestCase):
    """Test NetAI training module."""

    def test_get_certifications(self):
        from backend.netai_training import get_certifications
        result = get_certifications()
        self.assertEqual(result["status"], "success")

    def test_get_certifications_cisco(self):
        from backend.netai_training import get_certifications
        result = get_certifications("cisco")
        self.assertEqual(result["status"], "success")

    def test_get_training_paths(self):
        from backend.netai_training import get_training_paths
        result = get_training_paths()
        self.assertEqual(result["status"], "success")

    def test_get_training_path(self):
        from backend.netai_training import get_training_path
        result = get_training_path("network_engineer")
        self.assertEqual(result["status"], "success")

    def test_get_networking_fundamental(self):
        from backend.netai_training import get_networking_fundamental
        result = get_networking_fundamental("osi_model")
        self.assertEqual(result["status"], "success")

    def test_get_networking_fundamental_list(self):
        from backend.netai_training import get_networking_fundamental
        result = get_networking_fundamental()
        self.assertEqual(result["status"], "success")

    def test_compare_certifications(self):
        from backend.netai_training import compare_certifications
        result = compare_certifications("CCNA", "Network+")
        self.assertEqual(result["status"], "success")

    def test_get_study_plan(self):
        from backend.netai_training import get_study_plan
        result = get_study_plan("CCNA", 10)
        self.assertEqual(result["status"], "success")


# ═══════════════════════════════════════════════════════════════════════════════
#  PROJECT MANAGEMENT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectManagement(unittest.TestCase):
    """Test project management module."""

    def test_get_methodologies(self):
        from backend.project_management import get_methodologies
        result = get_methodologies()
        self.assertEqual(result["status"], "success")

    def test_get_methodology(self):
        from backend.project_management import get_methodology
        result = get_methodology("scrum")
        self.assertEqual(result["status"], "success")

    def test_get_project_templates(self):
        from backend.project_management import get_project_templates
        result = get_project_templates()
        self.assertEqual(result["status"], "success")

    def test_get_project_template(self):
        from backend.project_management import get_project_template
        result = get_project_template("software_development")
        self.assertEqual(result["status"], "success")

    def test_get_risk_categories(self):
        from backend.project_management import get_risk_categories
        result = get_risk_categories()
        self.assertEqual(result["status"], "success")

    def test_get_risks(self):
        from backend.project_management import get_risks
        result = get_risks("technical")
        self.assertEqual(result["status"], "success")

    def test_create_project_plan(self):
        from backend.project_management import create_project_plan
        result = create_project_plan("Test Project", "software_development")
        self.assertEqual(result["status"], "success")

    def test_get_stakeholder_strategy(self):
        from backend.project_management import get_stakeholder_strategy
        result = get_stakeholder_strategy("executive")
        self.assertEqual(result["status"], "success")


# ═══════════════════════════════════════════════════════════════════════════════
#  WHATSAPP BOT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestWhatsAppBot(unittest.TestCase):
    """Test WhatsApp bot module."""

    def test_get_templates(self):
        from backend.whatsapp_bot import get_templates
        result = get_templates()
        self.assertEqual(result["status"], "success")

    def test_get_template(self):
        from backend.whatsapp_bot import get_template
        result = get_template("welcome")
        self.assertEqual(result["status"], "success")

    def test_get_menu(self):
        from backend.whatsapp_bot import get_menu
        result = get_menu()
        self.assertEqual(result["status"], "success")

    def test_handle_message_help(self):
        from backend.whatsapp_bot import handle_message
        result = handle_message("help")
        self.assertEqual(result["status"], "success")

    def test_handle_message_greeting(self):
        from backend.whatsapp_bot import handle_message
        result = handle_message("hello")
        self.assertIn("response", result)

    def test_get_webhook_config(self):
        from backend.whatsapp_bot import get_webhook_config
        result = get_webhook_config()
        self.assertEqual(result["status"], "success")

    def test_format_message(self):
        from backend.whatsapp_bot import format_message
        result = format_message("**bold** text", "markdown")
        self.assertIn("*", result)


# ═══════════════════════════════════════════════════════════════════════════════
#  ROUTER TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestRouter(unittest.TestCase):
    """Test router module."""

    def test_classify_intent_government(self):
        from backend.router import classify_intent
        result = classify_intent("How do I apply for a passport?")
        self.assertEqual(result["intent"], "government")
        self.assertGreater(result["confidence"], 0)

    def test_classify_intent_jobs(self):
        from backend.router import classify_intent
        result = classify_intent("What jobs are in demand?")
        self.assertEqual(result["intent"], "jobs")

    def test_classify_intent_workspace(self):
        from backend.router import classify_intent
        result = classify_intent("What is the best project management tool?")
        self.assertEqual(result["intent"], "workspace")

    def test_classify_intent_general(self):
        from backend.router import classify_intent
        result = classify_intent("asdfghjkl")
        self.assertEqual(result["intent"], "general")

    def test_get_intents(self):
        from backend.router import get_intents
        result = get_intents()
        self.assertEqual(result["status"], "success")

    def test_get_handler_info(self):
        from backend.router import get_handler_info
        result = get_handler_info("government_services")
        self.assertEqual(result["status"], "success")

    def test_health_check(self):
        from backend.router import health_check
        result = health_check()
        self.assertIn(result["status"], ["healthy", "degraded"])


# ═══════════════════════════════════════════════════════════════════════════════
#  AGENT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestAgent(unittest.TestCase):
    """Test agent module."""

    def test_agent_stats(self):
        from backend.luqi_agent import agent_stats
        result = agent_stats()
        self.assertEqual(result["status"], "success")

    def test_agent_list_tools(self):
        from backend.luqi_agent import agent_list_tools
        result = agent_list_tools()
        self.assertEqual(result["status"], "success")

    def test_web_search(self):
        from backend.luqi_agent import web_search
        result = web_search("test query")
        self.assertEqual(result["status"], "success")

    def test_run_code(self):
        from backend.luqi_agent import run_code
        result = run_code("print(2+2)")
        self.assertEqual(result["status"], "success")


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Run all tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestGovernmentServices))
    suite.addTests(loader.loadTestsFromTestCase(TestJobsSkills))
    suite.addTests(loader.loadTestsFromTestCase(TestDigitalWorkspace))
    suite.addTests(loader.loadTestsFromTestCase(TestNetAITraining))
    suite.addTests(loader.loadTestsFromTestCase(TestProjectManagement))
    suite.addTests(loader.loadTestsFromTestCase(TestWhatsAppBot))
    suite.addTests(loader.loadTestsFromTestCase(TestRouter))
    suite.addTests(loader.loadTestsFromTestCase(TestAgent))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    sys.exit(0 if result.wasSuccessful() else 1)
