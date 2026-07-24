#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Core Brain Module for Omega AI
The central orchestration engine that coordinates all Omega AI subsystems,
processes user requests, manages context, and routes tasks to appropriate modules.
"""

import json
import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple, Callable
from datetime import datetime
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class TaskType(Enum):
    """Types of tasks the core brain can handle"""
    CONVERSATION = "conversation"
    FINANCIAL_ADVICE = "financial_advice"
    EDUCATIONAL_SUPPORT = "educational_support"
    CODE_GENERATION = "code_generation"
    RESEARCH = "research"
    TRANSLATION = "translation"
    CONTENT_CREATION = "content_creation"
    DATA_ANALYSIS = "data_analysis"
    SCHEDULING = "scheduling"
    REMINDER = "reminder"
    WEB_SEARCH = "web_search"
    FILE_PROCESSING = "file_processing"
    SYSTEM_COMMAND = "system_command"
    MULTI_STEP = "multi_step"


class ProcessingStage(Enum):
    """Stages of request processing"""
    RECEIVED = "received"
    PARSING = "parsing"
    ROUTING = "routing"
    EXECUTING = "executing"
    SYNTHESIZING = "synthesizing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class TaskContext:
    """Context for a task being processed"""
    task_id: str
    user_id: str
    task_type: TaskType
    original_request: str
    params: Dict[str, Any] = field(default_factory=dict)
    conversation_history: List[Dict] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "user_id": self.user_id,
            "task_type": self.task_type.value,
            "original_request": self.original_request,
            "params": self.params,
            "conversation_history": self.conversation_history,
            "metadata": self.metadata,
            "created_at": self.created_at
        }


@dataclass
class ProcessingResult:
    """Result of processing a task"""
    task_id: str
    success: bool
    response: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    stage: ProcessingStage = ProcessingStage.COMPLETED
    processing_time_ms: float = 0.0
    modules_used: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "success": self.success,
            "response": self.response,
            "data": self.data,
            "stage": self.stage.value,
            "processing_time_ms": self.processing_time_ms,
            "modules_used": self.modules_used,
            "errors": self.errors
        }


@dataclass
class UserSession:
    """User session state"""
    session_id: str
    user_id: str
    context: Dict[str, Any] = field(default_factory=dict)
    preferences: Dict[str, Any] = field(default_factory=dict)
    active_tasks: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_activity: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "context": self.context,
            "preferences": self.preferences,
            "active_tasks": self.active_tasks,
            "created_at": self.created_at,
            "last_activity": self.last_activity
        }


class CoreBrain:
    """
    Core Brain - Central orchestration engine for Omega AI.
    Coordinates all subsystems, routes tasks, manages context,
    and synthesizes responses from multiple modules.
    """
    
    def __init__(self):
        self.sessions: Dict[str, UserSession] = {}
        self.active_tasks: Dict[str, TaskContext] = {}
        self.task_history: List[str] = []
        self.modules: Dict[str, Any] = {}
        self.middleware_chain: List[Callable] = []
        self.routing_table: Dict[TaskType, List[str]] = {
            TaskType.CONVERSATION: ["conversation_state", "local_llm"],
            TaskType.FINANCIAL_ADVICE: ["financial_literacy", "tax_engine", "calc_engine"],
            TaskType.EDUCATIONAL_SUPPORT: ["educational_companion", "pedagogical_engine", "knowledge_base"],
            TaskType.CODE_GENERATION: ["local_llm", "file_agent"],
            TaskType.RESEARCH: ["deep_research", "web_search", "knowledge_base"],
            TaskType.TRANSLATION: ["bilingual", "african_languages"],
            TaskType.CONTENT_CREATION: ["local_llm", "pdf_generator"],
            TaskType.DATA_ANALYSIS: ["calc_engine", "viz_engine", "deep_research"],
            TaskType.SCHEDULING: ["scheduler", "reminders"],
            TaskType.REMINDER: ["reminders", "scheduler"],
            TaskType.WEB_SEARCH: ["web_search", "deep_research"],
            TaskType.FILE_PROCESSING: ["file_agent", "pdf_generator"],
            TaskType.SYSTEM_COMMAND: ["auth_middleware", "pipeline"],
            TaskType.MULTI_STEP: ["workflow_engine", "pipeline"]
        }
        logger.info("CoreBrain initialized")
    
    def register_module(self, name: str, module_instance: Any) -> None:
        """Register a module with the core brain"""
        self.modules[name] = module_instance
        logger.info(f"Registered module: {name}")
    
    def register_middleware(self, middleware: Callable) -> None:
        """Register middleware in the processing chain"""
        self.middleware_chain.append(middleware)
        logger.info(f"Registered middleware: {middleware.__name__}")
    
    async def process_request(self, user_id: str, request: str, 
                            context: Optional[Dict] = None) -> ProcessingResult:
        """Process a user request through the full pipeline"""
        start_time = datetime.now()
        task_id = str(uuid.uuid4())
        
        try:
            # Create task context
            task_ctx = TaskContext(
                task_id=task_id,
                user_id=user_id,
                task_type=self._classify_request(request),
                original_request=request,
                params=context or {}
            )
            self.active_tasks[task_id] = task_ctx
            
            # Run middleware chain
            for middleware in self.middleware_chain:
                request = await middleware(request, task_ctx)
            
            # Route and execute
            result = await self._route_and_execute(task_ctx)
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            result.processing_time_ms = processing_time
            result.task_id = task_id
            
            # Store in history
            self.task_history.append(task_id)
            
            # Clean up
            if task_id in self.active_tasks:
                del self.active_tasks[task_id]
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return ProcessingResult(
                task_id=task_id,
                success=False,
                response=f"An error occurred while processing your request: {str(e)}",
                stage=ProcessingStage.ERROR,
                processing_time_ms=processing_time,
                errors=[str(e)]
            )
    
    def _classify_request(self, request: str) -> TaskType:
        """Classify a request into a task type"""
        request_lower = request.lower()
        
        # Financial keywords
        financial_keywords = [
            "budget", "save", "invest", "stock", "money", "debt", "credit", 
            "loan", "mortgage", "retirement", "401k", "ira", "tax", "income",
            "expense", "financial", "wealth", "interest rate", "portfolio"
        ]
        if any(kw in request_lower for kw in financial_keywords):
            return TaskType.FINANCIAL_ADVICE
        
        # Educational keywords
        educational_keywords = [
            "learn", "study", "teach", "lesson", "course", "quiz", "homework",
            "math", "science", "history", "explain", "how does", "what is",
            "tutorial", "education", "school", "university", "exam"
        ]
        if any(kw in request_lower for kw in educational_keywords):
            return TaskType.EDUCATIONAL_SUPPORT
        
        # Code keywords
        code_keywords = [
            "code", "program", "function", "class", "debug", "error", "python",
            "javascript", "api", "database", "algorithm", "script", "developer"
        ]
        if any(kw in request_lower for kw in code_keywords):
            return TaskType.CODE_GENERATION
        
        # Research keywords
        research_keywords = [
            "research", "find", "search", "information about", "what are",
            "compare", "analyze", "study about", "report on", "investigate"
        ]
        if any(kw in request_lower for kw in research_keywords):
            return TaskType.RESEARCH
        
        # Translation keywords
        translation_keywords = [
            "translate", "in swahili", "in french", "in spanish", "meaning of",
            "how do you say", "pronunciation", "language"
        ]
        if any(kw in request_lower for kw in translation_keywords):
            return TaskType.TRANSLATION
        
        # Scheduling keywords
        scheduling_keywords = [
            "schedule", "remind me", "set a reminder", "calendar", "appointment",
            "meeting", "deadline", "due date", "when should"
        ]
        if any(kw in request_lower for kw in scheduling_keywords):
            return TaskType.SCHEDULING
        
        # Web search keywords
        web_search_keywords = [
            "look up", "google", "find online", "latest news", "current",
            "what's happening", "weather", "stock price", "news about"
        ]
        if any(kw in request_lower for kw in web_search_keywords):
            return TaskType.WEB_SEARCH
        
        # File processing keywords
        file_keywords = [
            "file", "document", "pdf", "spreadsheet", "csv", "upload",
            "download", "read this file", "analyze this data"
        ]
        if any(kw in request_lower for kw in file_keywords):
            return TaskType.FILE_PROCESSING
        
        # Default to conversation
        return TaskType.CONVERSATION
    
    async def _route_and_execute(self, task_ctx: TaskContext) -> ProcessingResult:
        """Route a task to appropriate modules and execute"""
        task_type = task_ctx.task_type
        module_names = self.routing_table.get(task_type, ["local_llm"])
        
        result = ProcessingResult(
            task_id=task_ctx.task_id,
            success=True,
            modules_used=module_names
        )
        
        # Execute each module in the chain
        accumulated_data = {}
        for module_name in module_names:
            if module_name in self.modules:
                module = self.modules[module_name]
                try:
                    # Call the module's process method
                    if hasattr(module, 'process'):
                        module_result = await module.process(task_ctx)
                        accumulated_data[module_name] = module_result
                    elif hasattr(module, 'handle'):
                        module_result = module.handle(task_ctx.original_request, task_ctx.params)
                        accumulated_data[module_name] = module_result
                    else:
                        accumulated_data[module_name] = {"status": "module has no process/handle method"}
                except Exception as e:
                    logger.error(f"Error in module {module_name}: {e}")
                    result.errors.append(f"{module_name}: {str(e)}")
            else:
                logger.warning(f"Module {module_name} not registered")
        
        # Synthesize response
        result.data = accumulated_data
        result.response = self._synthesize_response(task_ctx, accumulated_data)
        
        return result
    
    def _synthesize_response(self, task_ctx: TaskContext, 
                           module_results: Dict[str, Any]) -> str:
        """Synthesize a final response from module results"""
        # This is a simplified synthesis - in production, this would use
        # the local LLM or a more sophisticated approach
        
        responses = []
        for module_name, result in module_results.items():
            if isinstance(result, dict):
                if "response" in result:
                    responses.append(result["response"])
                elif "error" in result:
                    responses.append(f"[{module_name} error: {result['error']}]")
            elif isinstance(result, str):
                responses.append(result)
        
        if responses:
            return "\n\n".join(responses)
        
        return f"I've processed your request about '{task_ctx.original_request}'. " \
               f"The following modules were consulted: {', '.join(module_results.keys())}."
    
    def create_session(self, user_id: str, 
                      preferences: Optional[Dict] = None) -> UserSession:
        """Create a new user session"""
        session_id = str(uuid.uuid4())
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            preferences=preferences or {}
        )
        self.sessions[session_id] = session
        logger.info(f"Created session {session_id} for user {user_id}")
        return session
    
    def get_session(self, session_id: str) -> Optional[UserSession]:
        """Get a user session"""
        return self.sessions.get(session_id)
    
    def update_session_context(self, session_id: str, 
                              context_update: Dict[str, Any]) -> Optional[UserSession]:
        """Update session context"""
        session = self.sessions.get(session_id)
        if session:
            session.context.update(context_update)
            session.last_activity = datetime.now().isoformat()
        return session
    
    def end_session(self, session_id: str) -> bool:
        """End a user session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Ended session {session_id}")
            return True
        return False
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get the status of the core brain and all modules"""
        return {
            "status": "operational",
            "active_sessions": len(self.sessions),
            "active_tasks": len(self.active_tasks),
            "total_tasks_processed": len(self.task_history),
            "registered_modules": list(self.modules.keys()),
            "routing_table": {k.value: v for k, v in self.routing_table.items()},
            "middleware_count": len(self.middleware_chain),
            "timestamp": datetime.now().isoformat()
        }
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a task"""
        task = self.active_tasks.get(task_id)
        if task:
            return {
                "task_id": task_id,
                "status": "active",
                "task_type": task.task_type.value,
                "created_at": task.created_at
            }
        
        # Check history
        if task_id in self.task_history:
            return {
                "task_id": task_id,
                "status": "completed",
                "note": "Task has been processed and removed from active tasks"
            }
        
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the CoreBrain state"""
        return {
            "active_sessions": len(self.sessions),
            "active_tasks": len(self.active_tasks),
            "total_tasks_processed": len(self.task_history),
            "registered_modules": list(self.modules.keys()),
            "middleware_count": len(self.middleware_chain),
            "supported_task_types": [t.value for t in TaskType]
        }
