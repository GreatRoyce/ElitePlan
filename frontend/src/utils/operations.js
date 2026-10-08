export const operationTypes = { consultations: "Consultation requests", events: "Standalone events", "planner-events": "Planner board events" };
export const operationActions = { note: "Add private note", flag: "Flag for follow-up", clear_flag: "Clear follow-up flag", decline: "Decline pending request", complete: "Mark completed", start: "Mark ongoing", cancel: "Cancel event", reopen: "Reopen for review" };
export const operationStatuses = { consultations: ["pending", "approved", "declined", "completed"], events: ["upcoming", "ongoing", "completed", "cancelled"] };
export const isStatusAction = (action) => !["note", "flag", "clear_flag"].includes(action);
