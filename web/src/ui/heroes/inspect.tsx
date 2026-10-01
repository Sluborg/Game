// Inspect moved to the UI kit (web/src/ui/kit/Inspect.tsx) so the Hall's ⓘ
// explainers reuse the same painfully-debugged popover instead of a rewrite.
// This shim keeps every existing hero-sheet import working unchanged.
export { InspectChip, InspectPopover, type InspectData } from "../kit/Inspect";
