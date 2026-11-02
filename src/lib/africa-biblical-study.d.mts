export type BiblicalLayerId = 'text' | 'evidence' | 'interpretation' | 'reflection';
export interface BiblicalSource { id: string; title: string; publisher: string; kind: string; url: string; scope: string }
export interface BiblicalLayer { body: string; sourceIds: readonly string[] }
export interface BiblicalStudy { id: string; title: string; reference: string; text: BiblicalLayer; evidence: BiblicalLayer; interpretation: BiblicalLayer; reflection: BiblicalLayer }
export interface BiblicalQuestion { id: string; question: string; options: readonly string[]; correct: number; explanation: string; sourceIds: readonly string[] }
export const BIBLICAL_EDITION: string;
export const BIBLICAL_REVIEW_DUE: string;
export const BIBLICAL_TITLE: string;
export const BIBLICAL_LAYERS: readonly { id: BiblicalLayerId; label: string }[];
export const BIBLICAL_SOURCES: readonly BiblicalSource[];
export const BIBLICAL_STUDIES: readonly BiblicalStudy[];
export const BIBLICAL_QUIZ: readonly BiblicalQuestion[];
export function biblicalSource(id: string): BiblicalSource;
export function biblicalStudyIsCurrent(date?: Date): boolean;
export function checkBiblicalAnswer(questionId: string, answer: number): { correct: boolean; explanation: string; sourceIds: string[] } | null;
