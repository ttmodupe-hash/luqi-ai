// The app mirror uses the canonical diagnostics implementation in /src.
// Never fork analytics consent or event policies across the two builds.
export * from '../../../src/lib/uiTelemetry';
